import * as vscode from 'vscode';
import * as path from 'path';

import {
    setLastActiveEditor,
    getLastActiveEditor,
    setNamePanel,
    setGlobalGroupState,
    getGlobalGroupState,
    getNamePanel
} from '../state'

import { extractItemNames } from '../utils/extractors';
import { gotoItemLine } from '../utils/navigation';
import { getNameWebContent } from '../webviews/nameWebview';
import { editName, editNameInDirectory} from '../utils/edit';

// Register the command to open the Name View webview
export const registerNameView = (context: vscode.ExtensionContext) => {
    return vscode.commands.registerCommand('extension.openNameView', () => {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        setLastActiveEditor(editor);
        const document = editor.document;
        const names = extractItemNames(document);

        const newNamePanel = vscode.window.createWebviewPanel(
            'nameView',
            'Name View',
            vscode.ViewColumn.Beside, 
            { enableScripts: true }
        );

        setNamePanel(newNamePanel);
        const namePanel = getNamePanel();
        if (!namePanel) {
            vscode.window.showErrorMessage('Name Panel is not available.');
            return;
        }

        const groupState = getGlobalGroupState();

        namePanel.webview.html = getNameWebContent(document, names, groupState);

        // Handle messages from the webview
        namePanel.webview.onDidReceiveMessage(
            async message => {
                const applyToDirectory = message.applyToDirectory;
                switch (message.command) {
                    case 'updateName':
                        const replaceIndex = parseInt(message.index, 10);
                        const replaceName = message.newName;
                        const replaceEditor = getLastActiveEditor();
                        if (replaceEditor) {
                            const groupedNames = extractItemNames(replaceEditor.document);
                            const names = Object.values(groupedNames).flat();
                            if (replaceIndex >= 0 && replaceIndex < names.length) {
                                const { item, name } = names[replaceIndex];
                                if (applyToDirectory) {
                                    const directory = vscode.Uri.file(path.dirname(replaceEditor.document.uri.fsPath));
                                    await editNameInDirectory(directory, item, name, replaceName);
                                } else {
                                    editName(replaceEditor.document, item, name, replaceName);
                                }
                            }
                        }
                        return;
                    case 'refresh':
                        const refreshEditor = vscode.window.activeTextEditor;
                        if (refreshEditor) {
                            const names = extractItemNames(refreshEditor.document);
                            if (namePanel) {
                                namePanel.webview.html = getNameWebContent(refreshEditor.document, names, getGlobalGroupState());
                            }
                        }
                        return;
                    case 'gotoLine':
                        const gotoIndex = parseInt(message.index, 10);
                        const lineIndex = parseInt(message.lineIndex, 10);
                        const gotoEditor = getLastActiveEditor();
                        if (gotoEditor) {
                            const groupedNames = extractItemNames(gotoEditor.document);
                            const names = Object.values(groupedNames).flat();
                            if (gotoIndex >= 0 && gotoIndex < names.length) {
                                const targetLine = names[gotoIndex].lines[lineIndex];
                                gotoItemLine(gotoEditor.document, targetLine);
                            }
                        }
                        return;
                    case 'updateGroupState':
                        setGlobalGroupState(message.groupState);
                        return;
                }
            },
            undefined,
            context.subscriptions
        );

        // Listen for when the panel is disposed
        namePanel.onDidDispose(() => {
            setNamePanel(undefined); // Clear the global state
        }, null, context.subscriptions);
    });
}