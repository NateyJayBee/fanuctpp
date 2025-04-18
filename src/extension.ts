import * as vscode from 'vscode';

import { 
    setLastActiveEditor,
    setPreviousActiveEditorFilePath,
    getPreviousActiveEditorFilePath,
    getIsAutoUpd,
    getNamePanel,
    getLabelPanel,
    getGlobalGroupState
 } from './state';

import { CallDefinitionProvider } from './commands/openProgramCommands';
import { debounce } from './utils/debounce';
import { setLineNumbers, editLineNumbers } from './utils/edit';
import { extractItemNames, extractLabels, extractJumps, extractSkips, extractSkipJumps } from './utils/extractors';

import { getLabelWebContent } from './webviews/labelWebview';
import { registerLabelView } from './commands/labelCommands';

import { getNameWebContent } from './webviews/nameWebview';
import { registerNameView } from './commands/nameCommands';

export function activate(context: vscode.ExtensionContext) {

    //console.log('Extension "fanuctpp" is now active!');

    // ------------------INITIAL SETUP-------------------
    // Set line numbers for all currently open documents
    vscode.workspace.textDocuments.forEach(document => {
        if (document.languageId === 'fanuctp_ls') {
            setLineNumbers(document);
        }
    });

    // --------------------USER CONFIG-------------------
    const config = vscode.workspace.getConfiguration('fanuctpp');
    // Enable auto line edits
    const autoLineRenum = config.get<boolean>('autoLineRenumber', true);

    // Set line numbers for documents that are opened
    const disposeOpen = vscode.workspace.onDidOpenTextDocument(document => {
        if (document.languageId === 'fanuctp_ls') {
            setLineNumbers(document);
        }
    });

    // Debounced handler for text document changes
    const debouncedOnDidChangeTextDocument = debounce(async (event: vscode.TextDocumentChangeEvent) => { 
        // Check if user or ext is updating the line numbers
        if (getIsAutoUpd() === true) {
            return;
        }

        setLineNumbers(event.document);

        if (event.document.languageId === 'fanuctp_ls' && autoLineRenum) {
            await editLineNumbers(event.document);
        }
    }, 50); 

    const disposeDebounceChange = vscode.workspace.onDidChangeTextDocument(debouncedOnDidChangeTextDocument)

    // ------------------COMMANDS-------------------
    // STANDALONE UPDATE LINE NUMBERS
    const disposableCommand = vscode.commands.registerCommand('extension.updateLineNumbers', async (event: vscode.TextDocumentChangeEvent) => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'fanuctp_ls') {
            await editLineNumbers(editor.document, true);
        }
    });

    // Listen for changes in the active editor
    const disposeActiveEditorChange = vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            const currentFilePath = editor.document.uri.fsPath;
            if (currentFilePath !== getPreviousActiveEditorFilePath()) {
                setLastActiveEditor(editor);
                setPreviousActiveEditorFilePath(currentFilePath);
                // Handle the active editor change
                handleActiveEditorChange(editor);
            }
        }
    });

    function handleActiveEditorChange(editor: vscode.TextEditor) {
        const namePanel = getNamePanel();
        const labelPanel = getLabelPanel();
        if (namePanel) {
            const groupedNames = extractItemNames(editor.document);
            namePanel.webview.postMessage({ command: 'updateGroupState', groupState: getGlobalGroupState() });
            namePanel.webview.html = getNameWebContent(editor.document, groupedNames, getGlobalGroupState());
        }
        // Update the Webview content
        if (labelPanel) {
            const labels = extractLabels(editor.document);
            const jumps = extractJumps(editor.document, labels);
            const skips = extractSkips(editor.document, labels);
            const skipJumps = extractSkipJumps(editor.document, labels);
            labelPanel.webview.html = getLabelWebContent(editor.document, labels, jumps, skips, skipJumps);
        }
    }

    // Register webview View commands
    const disposeNameView = registerNameView(context);
    const disposeLabelView = registerLabelView(context);

    // Register the definition provider to open files
    context.subscriptions.push(vscode.languages.registerDefinitionProvider('fanuctp_ls', new CallDefinitionProvider()));

    // Pushing all event listeners and commands to the context
    context.subscriptions.push(disposeOpen, disposeDebounceChange, 
        disposeLabelView, disposeNameView, disposeActiveEditorChange,
        disposableCommand);
}

export function deactivate() {}
function length(arg0: string[]) {
    throw new Error('Function not implemented.');
}

