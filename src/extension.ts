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

    // ------------------INITIAL SETUP-------------------
    // Set line numbers for all currently open documents
    vscode.workspace.textDocuments.forEach(document => {
        if (document.languageId === 'fanuctp_ls') {
            setLineNumbers(document);
        }
    });

    // --------------User Configuration----------------
    const config = vscode.workspace.getConfiguration('fanuctpp');
    // Enable auto line edits
    const autoLineRenum = config.get<boolean>('autoLineRenumber', true);
    const autoSemi = config.get<boolean>('autoLineRenumber', true);

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
            const lineCreated = event.contentChanges.some(change => change.text.includes('\n'));
            //const lineDeleted = event.contentChanges.some(change => change.rangeLength > 0 && change.text === '');
            const lineDeleted = event.contentChanges.some(change => {
                const startLine = change.range.start.line;
                const endLine = change.range.end.line;
                const isWholeLineDeleted = change.range.start.character === 0 && change.range.end.character === 0 && startLine !== endLine;
                return change.rangeLength > 0 && change.text === '' && (isWholeLineDeleted || startLine !== endLine);
            });

            if (lineCreated || lineDeleted) {
                await updateLineNumbers(event.document, lineNumber, lineCreated, lineDeleted, autoLineRenum, autoSemi);
            }
            // Move cursor to column 8 on new line creation
            if (lineCreated) {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    const newPosition = new vscode.Position(lineNumber - 1, 7);
                    editor.selection = new vscode.Selection(newPosition, newPosition);
                }
            }
            if (lineDeleted) {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    const newPosition = new vscode.Position(lineNumber - 1, 7);
                    editor.selection = new vscode.Selection(newPosition, newPosition);
                }
            }
        }
    }, 15); // Adjust the debounce delay as needed

    const disposeDebounceChange = vscode.workspace.onDidChangeTextDocument(debouncedOnDidChangeTextDocument);

    // Register the standalone command
    const disposableCommand = vscode.commands.registerCommand('extension.updateLineNumbers', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'fanuctp_ls') {
            const lineCreated = false;
            const lineDeleted = false;
            await updateLineNumbers(editor.document, lineNumber, lineCreated, lineDeleted, true, false);
        }
    });

    // Pushing all event listeners and commands to the context
    context.subscriptions.push(disposeDebounceChange, disposeOpen, disposeSelection, disposableCommand);

    }

// ------------------EVENT HANDLER LOGIC-------------------

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
// Called on command execution
async function updateLineNumbers(document: vscode.TextDocument, currLine: number, lineCreated: boolean, 
                                lineDeleted: boolean, autoLineRenum: boolean, autoSemi: boolean) {
    if (!autoLineRenum) {
        return;
    }
    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    if (!(fileName in fileDict)) {
        return;
    }

    // Check if line numbers need to be set again
    if (lineCreated || lineDeleted) {
        await setLineNumbers(document);
    }

    // Destructure with default values
    let [startLine, endLine, lineEditsEnabled] = fileDict[fileName] || [0, 0, false];

    if (!lineEditsEnabled || endLine === undefined) {
        return;
    }

    // console.log(`updt: Current line number: ${currLine}`);

    const edits: vscode.TextEdit[] = [];

    if(lineCreated || lineDeleted) {
        const inRange = startLine < currLine && currLine < endLine
        if (!inRange) {
            return;
        }

        const text = document.getText();
        const lines = text.split('\r\n');
        const lineNumRegex = /^\s*(\d{1,4}):/;
        const noSemiNumRegex = /^\s*(\d{1,4}):\s*$/;
        const twoSemiRegex = /\s*;\s*;\s*$/;

        // LINE CREATED
        if (lineCreated) {
            const prevLineMatch = lines[currLine - 2].match(noSemiNumRegex);
            if (prevLineMatch) {
                const updatedPrevLine = lines[currLine - 2] + ' ;';
                lines[currLine - 2] = updatedPrevLine;
                edits.push(vscode.TextEdit.replace(
                    new vscode.Range(currLine - 2, 0, currLine - 2, lines[currLine - 2].length),
                    updatedPrevLine
                ));
            }
            const newLineNumber = currLine - startLine; // New Line just created
            let formattedNewLineNumber = newLineNumber.toString().padStart(4, ' ') + ':';
            let newLineText = formattedNewLineNumber
            if (autoSemi && !/^\s*$/.test(lines[currLine - 1])) {
                newLineText = formattedNewLineNumber + lines[currLine - 1]
            }
            else {   
                formattedNewLineNumber = newLineNumber.toString().padStart(4, ' ') + ':   ;';
                newLineText = formattedNewLineNumber
            }
            lines[currLine - 1] = newLineText;
            edits.push(vscode.TextEdit.replace(new vscode.Range(currLine - 1, 0, currLine - 1, lines[currLine - 1].length), newLineText));
        }

        // LINE DELETED
        if(lineDeleted) {
            console.log('updt: Line deleted');     
            const twoSemiMatch = lines[currLine - 1].match(twoSemiRegex);
            if (twoSemiMatch) {
                const updatedPrevLine = lines[currLine - 1].replace(twoSemiRegex, '   ;');
                lines[currLine - 1] = updatedPrevLine;
                const lineLength = document.lineAt(currLine - 1).text.length;
                edits.push(vscode.TextEdit.replace(
                    new vscode.Range(currLine - 1, 0, currLine - 1, lineLength),
                    updatedPrevLine
                ));
            }
        }

        // Iterate over each line in the document starting at next position
        //for (let i = (currLine); i < lines.length && i <= (endLine + 1); i++) {
        //    const match = lines[i].match(lineNumRegex);
        //    if (match) {
        //        let newLineNumber = parseInt(match[1], 10);
        //        newLineNumber = i - startLine + 1;
        //        const formattedLineNumber = newLineNumber.toString().padStart(4, ' '); // Ensure 4 characters
        //        const nextLineText = lines[i].replace(lineNumRegex, `${formattedLineNumber}:`);
        //        edits.push(vscode.TextEdit.replace(new vscode.Range(i, 0, i, lines[i].length), nextLineText));
        //    }
        //}
        for (let i = currLine; i < lines.length && i <= endLine + 1; i++) {
            const match = lines[i].match(lineNumRegex);
            if (match) {
                const newLineNumber = (i - startLine + 1).toString().padStart(4, ' '); // Calculate and format the new line number
                const nextLineText = lines[i].replace(lineNumRegex, `${newLineNumber}:`); // Replace the line number in the text
                const lineLength = document.lineAt(i).text.length; // Get the length of the current line
                edits.push(vscode.TextEdit.replace(new vscode.Range(i, 0, i, lineLength), nextLineText)); // Create and push the TextEdit
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
// Calles on document open
async function setLineNumbers(document: vscode.TextDocument) {
    const fileName = path.basename(document.fileName);

    const posEndRegex = /\/POS/;
    const endRegex = /\/END/;
    const headerEndRegex = /\/MN/;
    let headExists: boolean = false;
    let endExists: boolean = false;
    let posExists: boolean = false;

    let tpLineStart: number = -1; 
    let tpLineEnd: number = -1;

    // Iterate through each line to find matches
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);

        if (headerEndRegex.test(line.text)) {
            tpLineStart = i + 1; // Line numbers are 1-based
            headExists = true;
        }

        if (posEndRegex.test(line.text)) {
            tpLineEnd = i + 1;
            posExists = true;
            break; // Stop searching if posEndRegex is found
        }

        if (!posExists && endRegex.test(line.text)) {
            tpLineEnd = i + 1;
            endExists = true;
        }
    }

    fileDict[fileName] = [tpLineStart, tpLineEnd, (headExists && (endExists || posExists)), document.lineCount];
    
    console.log(`set: Setting line numbers for ${fileName}`);
    console.log('set: ' + JSON.stringify(fileDict));
}

export function deactivate() {}
