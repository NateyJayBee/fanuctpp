import * as vscode from 'vscode';

// Create a decoration type for highlighting
export const highlightDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(211, 211, 211, 0.5)'
});