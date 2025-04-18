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
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLabelView = void 0;
const vscode = __importStar(require("vscode"));
const state_1 = require("../state");
const extractors_1 = require("../utils/extractors");
const navigation_1 = require("../utils/navigation");
const labelWebview_1 = require("../webviews/labelWebview");
// Register the command to open the Label View webview
const registerLabelView = (context) => {
    return vscode.commands.registerCommand('extension.openLabelView', () => {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        (0, state_1.setLastActiveEditor)(editor);
        const document = editor.document;
        const labels = (0, extractors_1.extractLabels)(document);
        const jumpLabels = (0, extractors_1.extractJumps)(document, labels);
        const skipLabels = (0, extractors_1.extractSkips)(document, labels);
        const skipJumpLabels = (0, extractors_1.extractSkipJumps)(document, labels);
        const newLabelPanel = vscode.window.createWebviewPanel('labelView', 'Label View', vscode.ViewColumn.Beside, { enableScripts: true });
        (0, state_1.setLabelPanel)(newLabelPanel);
        const labelPanel = (0, state_1.getLabelPanel)();
        if (!labelPanel) {
            vscode.window.showErrorMessage('Label Panel is not available.');
            return;
        }
        // Set the HTML content
        labelPanel.webview.html = (0, labelWebview_1.getLabelWebContent)(document, labels, jumpLabels, skipLabels, skipJumpLabels);
        // Handle messages from the webview
        labelPanel.webview.onDidReceiveMessage(message => {
            const lastActiveEditor = (0, state_1.getLastActiveEditor)();
            switch (message.command) {
                case 'gotoLabel':
                    const label = message.label;
                    editor = vscode.window.activeTextEditor;
                    if (lastActiveEditor) {
                        (0, navigation_1.gotoLabel)(lastActiveEditor, label);
                    }
                    return;
                case 'gotoJumpLabel':
                    const jump = message.jump;
                    const skip = message.skip;
                    const skipJump = message.skipJump;
                    editor = vscode.window.activeTextEditor;
                    if (lastActiveEditor) {
                        (0, navigation_1.gotoJumpLabel)(lastActiveEditor, jump, skip, skipJump);
                    }
                    return;
            }
        }, undefined, context.subscriptions);
        // Listen for when the panel is disposed
        labelPanel.onDidDispose(() => {
            (0, state_1.setLabelPanel)(undefined); // Clear the global state
        }, null, context.subscriptions);
    });
};
exports.registerLabelView = registerLabelView;
//# sourceMappingURL=labelCommands.js.map