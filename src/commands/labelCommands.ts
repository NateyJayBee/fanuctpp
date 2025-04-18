import * as vscode from 'vscode';

import {
    setLastActiveEditor,
    getLastActiveEditor,
    getLabelPanel,
    setLabelPanel
} from '../state'

import { extractLabels, extractJumps, extractSkips, extractSkipJumps } from '../utils/extractors';
import { gotoLabel, gotoJumpLabel } from '../utils/navigation';
import { getLabelWebContent } from '../webviews/labelWebview'; 

// Register the command to open the Label View webview
export const registerLabelView = (context: vscode.ExtensionContext) => {
    return vscode.commands.registerCommand('extension.openLabelView', () => {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        setLastActiveEditor(editor);
        const document = editor.document;
        const labels = extractLabels(document);
        const jumpLabels = extractJumps(document, labels);
        const skipLabels = extractSkips(document, labels);
        const skipJumpLabels = extractSkipJumps(document, labels);

        const newLabelPanel = vscode.window.createWebviewPanel(
            'labelView',
            'Label View',
            vscode.ViewColumn.Beside, 
            { enableScripts: true }
        );

        setLabelPanel(newLabelPanel);
        const labelPanel = getLabelPanel();
        if (!labelPanel) {
            vscode.window.showErrorMessage('Label Panel is not available.');
            return;
        }

        // Set the HTML content
        labelPanel.webview.html = getLabelWebContent(document, labels, jumpLabels, skipLabels, skipJumpLabels);

        // Handle messages from the webview
        labelPanel.webview.onDidReceiveMessage(
            message => {
                const lastActiveEditor = getLastActiveEditor();
                switch (message.command) {
                    case 'gotoLabel':
                        const label = message.label;
                        editor = vscode.window.activeTextEditor;
                        if (lastActiveEditor) {
                            gotoLabel(lastActiveEditor, label);
                        }
                        return;
                    case 'gotoJumpLabel':
                        const jump = message.jump;
                        const skip = message.skip;
                        const skipJump = message.skipJump;
                        editor = vscode.window.activeTextEditor;
                        if (lastActiveEditor) {
                            gotoJumpLabel(lastActiveEditor, jump, skip, skipJump);
                        }
                        return;
                }
            },
            undefined,
            context.subscriptions
        );

        // Listen for when the panel is disposed
        labelPanel.onDidDispose(() => {
            setLabelPanel(undefined); // Clear the global state
        }, null, context.subscriptions);
    });
}