import * as vscode from 'vscode';
import * as path from 'path';

// GLOBAL VARIABLES

// fileDict 1 entry per document
// start line, end line, line edits enabled, total lines
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
        const newLineCreated = event.contentChanges.some(change => change.text.includes('\n'));
        const lineDeleted = event.contentChanges.some(change => change.rangeLength > 0 && change.text === '');

        if (newLineCreated || lineDeleted) {
            await updateLineNumbers(event.document, lineNumber, newLineCreated, lineDeleted);
        }
    }
}, 250); // Adjust the debounce delay as needed

const disposeDebounceChange = vscode.workspace.onDidChangeTextDocument(debouncedOnDidChangeTextDocument);

// Register the standalone command
const disposableCommand = vscode.commands.registerCommand('extension.updateLineNumbers', async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === 'fanuctp_ls') {
        await updateLineNumbers(editor.document, lineNumber, false, false);
    }
});

// Pushing all event listeners and commands to the context
context.subscriptions.push(disposeDebounceChange, disposeOpen, disposeSelection, disposableCommand);
}

// Gets the line number the cursor is currently on
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
// Called on document change in total line numbers
async function updateLineNumbers(document: vscode.TextDocument, currLine: number, newLineCreated: boolean, lineDeleted: boolean) {
    const fileName = path.basename(document.fileName);

    if (!(fileName in fileDict)) {
        return;
    }

    // Destructure with default values
    let [startLine, endLine, lineEditsEnabled] = fileDict[fileName] || [0, 0, false];

    if (!lineEditsEnabled || endLine === undefined) {
        return;
    }

    // console.log(`updt: Current line number: ${currLine}`);

    const text = document.getText();
    const lines = text.split('\r\n');
    const lineNumRegex = /^\s*(\d{1,4}):/;
    const edits: vscode.TextEdit[] = [];

    // Ensure new line is not in the headers
    if (startLine < currLine && currLine < endLine) {
        if(newLineCreated) {
            const newLineNumber = currLine - startLine; // New Line just created
            const formattedNewLineNumber = newLineNumber.toString().padStart(4, ' ') + ':  ';
            lines[currLine-1] = formattedNewLineNumber;
            edits.push(vscode.TextEdit.replace(new vscode.Range(currLine - 1, 0, currLine - 1, lines[currLine - 1].length), formattedNewLineNumber));
        }
        // Iterate over each line in the document starting at next position
        for (let i = (currLine); i < lines.length && i <= (endLine + 1); i++) {
            const match = lines[i].match(lineNumRegex);
            if (match) {
                const lineNumber = parseInt(match[1], 10);
                const nextLineNumber = lineNumber + 1; // Example increment
                const formattedLineNumber = nextLineNumber.toString().padStart(4, ' '); // Ensure 4 characters
                const nextLineText = lines[i].replace(lineNumRegex, `${formattedLineNumber}:`);
                //console.log(`updt: Line ${i + 1} changed from ${lines[i]} to ${newLineText}`);
                edits.push(vscode.TextEdit.replace(new vscode.Range(i, 0, i, lines[i].length), nextLineText));
            }
        }
    }

    // Apply the edits to the document
    const edit = new vscode.WorkspaceEdit();
    const uri = document.uri;
    edit.set(uri, edits);
    
    isAutoUpd = true;
    console.log('updt: START Applying edits: isAutoUpd = ' + isAutoUpd);
    vscode.workspace.applyEdit(edit);
    isAutoUpd = false;
    console.log('updt: DONE Applying edits: isAutoUpd = ' + isAutoUpd);

    setLineNumbers(document);
}

// Gets the line number of a regex match
function getLineNumberFromPosition(position: number, text: string) {
    return text.substring(0, position).split('\n').length;
}

// Constructs the fileDict entry for the document
// Calles on document open
async function setLineNumbers(document: vscode.TextDocument) {
    const fileName = path.basename(document.fileName);

    const posEndRegex = /\/POS/;
    const endRegex = /\/END/;
    const headerEndRegex = /\/MN/;
    const text = document.getText();
    const lines = text.split('\n');
    let headExists: boolean = false;
    let endExists: boolean = false;
    let posExists: boolean = false;

    let tpLineStart: number = -1; 
    let tpLineEnd: number = -1;

    const headMatch = headerEndRegex.exec(text);
    if (headMatch) {
        tpLineStart = getLineNumberFromPosition(headMatch.index, text);
        headExists = true;
    }

    // Find matches for posRegex
    const posMatch = posEndRegex.exec(text);
    if (posMatch) {
        tpLineEnd = getLineNumberFromPosition(posMatch.index, text);
        posExists = true;
    }

    // Find matches for endRegex if posRegex didn't match
    if (!posExists) {
        const endMatch = endRegex.exec(text);
        if (endMatch) {
            tpLineEnd = getLineNumberFromPosition(endMatch.index, text);
            endExists = true;
        }
    }

    fileDict[fileName] = [tpLineStart, tpLineEnd, (headExists && (endExists || posExists)), lines.length];
    
    
    console.log(`set: Setting line numbers for ${fileName}`);
    console.log('set: ' + JSON.stringify(fileDict));
}

export function deactivate() {}
