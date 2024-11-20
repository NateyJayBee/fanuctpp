import * as vscode from 'vscode';
import * as path from 'path';

//fileDict 1 entry per document
//start line, end line, line edits enabled, total lines
let fileDict: { [key: string]: [number, number, boolean, number] } = {};

let isAutoUpd = false;
let lineNumber: number = 0;

// Debounce function to delay execution
function debounce(func: (...args: any[]) => void, wait: number) {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "fanuctpp" is now active!');

    // Set line numbers for all currently open documents
    vscode.workspace.textDocuments.forEach(document => {
        if (document.languageId === 'fanuctp_ls') {
            setLineNumbers(document);
        }
    });

    // Set line numbers for documents that are opened
    const disposeOpen = vscode.workspace.onDidOpenTextDocument(document => {
        if (document.languageId === 'fanuctp_ls') {
            setLineNumbers(document);
        }
    });

    // Get current line number on selection change
    const disposeSelection = vscode.window.onDidChangeTextEditorSelection((event: vscode.TextEditorSelectionChangeEvent) => {
        lineNumber = getCurrentLineNumber(event.textEditor);
    });

    // Debounced handler for text document changes
    const debouncedOnDidChangeTextDocument = debounce(async (event: vscode.TextDocumentChangeEvent) => {
        if (isAutoUpd) {
            console.log('automatic change, skipping handler');
            return;
        }

        console.log('manual change, using handler');

        if (event.document.languageId === 'fanuctp_ls') {
            const editor = vscode.window.activeTextEditor;
            const newLineCreated = event.contentChanges.some(change => change.text.includes('\n'));
            if (newLineCreated) {
                await updateLineNumbers(event.document, lineNumber);
            }
        }
    }, 50); // Adjust the debounce delay as needed

    const disposeDebounceChange = vscode.workspace.onDidChangeTextDocument(debouncedOnDidChangeTextDocument);

    // Pushing all event listeners to the context
    context.subscriptions.push(disposeDebounceChange, disposeOpen, disposeSelection);
}

//gets the line number of a regex match
function getLineNumberFromPosition(position: number, text: string) {
    return text.substring(0, position).split('\n').length;
}

//gets the line number the cursor is currently on
function getCurrentLineNumber(editor: vscode.TextEditor) {
    if (editor) {
        const position = editor.selection.active;
        const lineNumber = position.line + 1;
        console.log(`get: Current line number: ${lineNumber}`);
        return lineNumber;
    } else {
        console.log('No active editor');
        return -1;
    }
}

// Updates the line numbers in the document
async function updateLineNumbers(document: vscode.TextDocument, currLine: number) {
    const fileName = path.basename(document.fileName);

    if (!(fileName in fileDict)) {
        return;
    }

    // Destructure with default values
    let [startLine, endLine, lineEditsEnabled] = fileDict[fileName] || [0, 0, false];

    if (!lineEditsEnabled || endLine === undefined) {
        return;
    }

    console.log(`updt: Current line number: ${currLine}`);

    const text = document.getText();
    const lines = text.split('\n');
    const lineNumRegex = /^\s*(\d{1,4}):/;
    const edits: vscode.TextEdit[] = [];

    // Iterate over each line in the document starting at current position
    if (startLine < currLine && currLine < endLine) {
        for (let i = currLine; i < lines.length && i <= endLine; i++) {
            const match = lines[i].match(lineNumRegex);
            if (match) {
                const lineNumber = parseInt(match[1], 10);
                const newLineNumber = lineNumber + 1; // Example increment
                const newLineText = lines[i].replace(lineNumRegex, `${newLineNumber}:`);
                //console.log(`updt: Line ${i + 1} changed from ${lines[i]} to ${newLineText}`);
                edits.push(vscode.TextEdit.replace(new vscode.Range(i, 0, i, lines[i].length), newLineText));
            }
        }
    }

    // Apply the edits to the document
    const edit = new vscode.WorkspaceEdit();
    const uri = document.uri;
    edit.set(uri, edits);
    
    isAutoUpd = true;
    console.log('updt: START Applying edits: isAutoUpd = ' + isAutoUpd);
    await vscode.workspace.applyEdit(edit);
    isAutoUpd = false;
    console.log('updt: DONE Applying edits: isAutoUpd = ' + isAutoUpd);
}

// Constructs the fileDict entry for the document
function setLineNumbers(document: vscode.TextDocument) {
    const fileName = path.basename(document.fileName);

    if (fileName in fileDict) {
        return;
    }

    console.log(`set: Setting line numbers for ${fileName}`);

    const posEndRegex = /\/POS/;
    const endRegex = /\/END/;
    const endHeaderRegex = /\/MN/;
    const text = document.getText();
    const lines = text.split('\n');
    let headExists: boolean = false;
    let endExists: boolean = false;
    let posExists: boolean = false;

    let tpLineStart: number = -1; 
    let tpLineEnd: number = -1;

    const headMatch = endHeaderRegex.exec(text);
    if (headMatch) {
        tpLineStart = getLineNumberFromPosition(headMatch.index, text) + 1;
        headExists = true;
    }

    // Find matches for posRegex
    const posMatch = posEndRegex.exec(text);
    if (posMatch) {
        tpLineEnd = getLineNumberFromPosition(posMatch.index, text) - 1;
        posExists = true;
    }

    // Find matches for endRegex if posRegex didn't match
    if (!posExists) {
        const endMatch = endRegex.exec(text);
        if (endMatch) {
            tpLineEnd = getLineNumberFromPosition(endMatch.index, text) - 1;
            endExists = true;
        }
    }

    if (!(fileName in fileDict)) {
        fileDict[fileName] = [tpLineStart, tpLineEnd, (headExists && (endExists || posExists)), lines.length];
    }
    
}

export function deactivate() {}
