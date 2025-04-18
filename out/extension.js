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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const state_1 = require("./state");
const openProgramCommands_1 = require("./commands/openProgramCommands");
const debounce_1 = require("./utils/debounce");
const edit_1 = require("./utils/edit");
const extractors_1 = require("./utils/extractors");
const labelWebview_1 = require("./webviews/labelWebview");
const labelCommands_1 = require("./commands/labelCommands");
const nameWebview_1 = require("./webviews/nameWebview");
const nameCommands_1 = require("./commands/nameCommands");
function activate(context) {
    //console.log('Extension "fanuctpp" is now active!');
    // ------------------INITIAL SETUP-------------------
    // Set line numbers for all currently open documents
    vscode.workspace.textDocuments.forEach(document => {
        if (document.languageId === 'fanuctp_ls') {
            (0, edit_1.setLineNumbers)(document);
        }
    });
    // --------------------USER CONFIG-------------------
    const config = vscode.workspace.getConfiguration('fanuctpp');
    // Enable auto line edits
    const autoLineRenum = config.get('autoLineRenumber', true);
    // Set line numbers for documents that are opened
    const disposeOpen = vscode.workspace.onDidOpenTextDocument(document => {
        if (document.languageId === 'fanuctp_ls') {
            (0, edit_1.setLineNumbers)(document);
        }
    });
    // Debounced handler for text document changes
    const debouncedOnDidChangeTextDocument = (0, debounce_1.debounce)((event) => __awaiter(this, void 0, void 0, function* () {
        // Check if user or ext is updating the line numbers
        if ((0, state_1.getIsAutoUpd)() === true) {
            return;
        }
        (0, edit_1.setLineNumbers)(event.document);
        if (event.document.languageId === 'fanuctp_ls' && autoLineRenum) {
            yield (0, edit_1.updateLineNumbers)(event.document);
        }
    }), 50);
    const disposeDebounceChange = vscode.workspace.onDidChangeTextDocument(debouncedOnDidChangeTextDocument);
    // ------------------COMMANDS-------------------
    // STANDALONE UPDATE LINE NUMBERS
    const disposableCommand = vscode.commands.registerCommand('extension.updateLineNumbers', (event) => __awaiter(this, void 0, void 0, function* () {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'fanuctp_ls') {
            yield (0, edit_1.updateLineNumbers)(event.document);
        }
    }));
    // Listen for changes in the active editor
    const disposeActiveEditorChange = vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            const currentFilePath = editor.document.uri.fsPath;
            if (currentFilePath !== (0, state_1.getPreviousActiveEditorFilePath)()) {
                (0, state_1.setLastActiveEditor)(editor);
                (0, state_1.setPreviousActiveEditorFilePath)(currentFilePath);
                // Handle the active editor change
                handleActiveEditorChange(editor);
            }
        }
    });
    function handleActiveEditorChange(editor) {
        const namePanel = (0, state_1.getNamePanel)();
        const labelPanel = (0, state_1.getLabelPanel)();
        if (namePanel) {
            const groupedNames = (0, extractors_1.extractItemNames)(editor.document);
            //const state = namePanel.webview.getState();
            //const groupState = state ? state.groupState : globalGroupState;
            namePanel.webview.postMessage({ command: 'updateGroupState', groupState: (0, state_1.getGlobalGroupState)() });
            namePanel.webview.html = (0, nameWebview_1.getNameWebContent)(editor.document, groupedNames, (0, state_1.getGlobalGroupState)());
        }
        // Update the Webview content
        if (labelPanel) {
            const labels = (0, extractors_1.extractLabels)(editor.document);
            const jumps = (0, extractors_1.extractJumps)(editor.document, labels);
            const skips = (0, extractors_1.extractSkips)(editor.document, labels);
            const skipJumps = (0, extractors_1.extractSkipJumps)(editor.document, labels);
            labelPanel.webview.html = (0, labelWebview_1.getLabelWebContent)(editor.document, labels, jumps, skips, skipJumps);
        }
    }
    // Register webview View commands
    const disposeNameView = (0, nameCommands_1.registerNameView)(context);
    const disposeLabelView = (0, labelCommands_1.registerLabelView)(context);
    // Register the definition provider to open files
    context.subscriptions.push(vscode.languages.registerDefinitionProvider('fanuctp_ls', new openProgramCommands_1.CallDefinitionProvider()));
    // Pushing all event listeners and commands to the context
    context.subscriptions.push(disposeOpen, disposeDebounceChange, disposeLabelView, disposeNameView, disposeActiveEditorChange);
}
function deactivate() { }
function length(arg0) {
    throw new Error('Function not implemented.');
}
//# sourceMappingURL=extension.js.map