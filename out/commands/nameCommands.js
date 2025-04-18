"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerNameView = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const state_1 = require("../state");
const extractors_1 = require("../utils/extractors");
const navigation_1 = require("../utils/navigation");
const nameWebview_1 = require("../webviews/nameWebview");
const edit_1 = require("../utils/edit");
// Register the command to open the Name View webview
const registerNameView = (context) => {
    return vscode.commands.registerCommand('extension.openNameView', () => {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        (0, state_1.setLastActiveEditor)(editor);
        const document = editor.document;
        const names = (0, extractors_1.extractItemNames)(document);
        const newNamePanel = vscode.window.createWebviewPanel('nameView', 'Name View', vscode.ViewColumn.Beside, { enableScripts: true });
        (0, state_1.setNamePanel)(newNamePanel);
        const namePanel = (0, state_1.getNamePanel)();
        if (!namePanel) {
            vscode.window.showErrorMessage('Name Panel is not available.');
            return;
        }
        const groupState = (0, state_1.getGlobalGroupState)();
        namePanel.webview.html = (0, nameWebview_1.getNameWebContent)(document, names, groupState);
        // Handle messages from the webview
        namePanel.webview.onDidReceiveMessage((message) => __awaiter(void 0, void 0, void 0, function* () {
            const applyToDirectory = message.applyToDirectory;
            switch (message.command) {
                case 'updateName':
                    const replaceIndex = parseInt(message.index, 10);
                    const replaceName = message.newName;
                    const replaceEditor = (0, state_1.getLastActiveEditor)();
                    if (replaceEditor) {
                        const groupedNames = (0, extractors_1.extractItemNames)(replaceEditor.document);
                        const names = Object.values(groupedNames).flat();
                        if (replaceIndex >= 0 && replaceIndex < names.length) {
                            const { item, name } = names[replaceIndex];
                            if (applyToDirectory) {
                                const directory = vscode.Uri.file(path.dirname(replaceEditor.document.uri.fsPath));
                                yield (0, edit_1.editNameInDirectory)(directory, item, name, replaceName);
                            }
                            else {
                                (0, edit_1.editName)(replaceEditor.document, item, name, replaceName);
                            }
                        }
                    }
                    return;
                case 'refresh':
                    const refreshEditor = vscode.window.activeTextEditor;
                    if (refreshEditor) {
                        const names = (0, extractors_1.extractItemNames)(refreshEditor.document);
                        if (namePanel) {
                            namePanel.webview.html = (0, nameWebview_1.getNameWebContent)(refreshEditor.document, names, (0, state_1.getGlobalGroupState)());
                        }
                    }
                    return;
                case 'gotoLine':
                    const gotoIndex = parseInt(message.index, 10);
                    const lineIndex = parseInt(message.lineIndex, 10);
                    const gotoEditor = (0, state_1.getLastActiveEditor)();
                    if (gotoEditor) {
                        const groupedNames = (0, extractors_1.extractItemNames)(gotoEditor.document);
                        const names = Object.values(groupedNames).flat();
                        if (gotoIndex >= 0 && gotoIndex < names.length) {
                            const targetLine = names[gotoIndex].lines[lineIndex];
                            (0, navigation_1.gotoItemLine)(gotoEditor.document, targetLine);
                        }
                    }
                    return;
                case 'updateGroupState':
                    (0, state_1.setGlobalGroupState)(message.groupState);
                    return;
            }
        }), undefined, context.subscriptions);
        // Listen for when the panel is disposed
        namePanel.onDidDispose(() => {
            (0, state_1.setNamePanel)(undefined); // Clear the global state
        }, null, context.subscriptions);
    });
};
exports.registerNameView = registerNameView;
//# sourceMappingURL=nameCommands.js.map