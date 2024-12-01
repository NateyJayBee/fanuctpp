import * as vscode from 'vscode';
import * as path from 'path';

// GLOBAL VARIABLES

// fileDict 1 entry per document
// start line,  end line,  line edits enabled,  total lines,  edit lines
let fileDict: { [key: string]: [number, number, boolean, number, number] } = {};

let isAutoUpd = false;
let skipSelectionChange = false;
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

    // --------------------USER CONFIG-------------------
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

    // Debounced handler for text document changes
    const debouncedOnDidChangeTextDocument = debounce(async (event: vscode.TextDocumentChangeEvent) => { 
        setLineNumbers(event.document);
        if (isAutoUpd) {
            console.log('doc: automatic change, skipping handler');
            return;
        }
        console.log('doc: debouncedOnDidChangeTextDocument');

        //console.log('manual change, using handler');

        if (event.document.languageId === 'fanuctp_ls') {
            const lineCreated = event.contentChanges.some(change => change.text.includes('\n'));
            //const lineDeleted = event.contentChanges.some(change => change.rangeLength > 0 && change.text === '');
            const lineDeleted = event.contentChanges.some(change => {
                const startLine = change.range.start.line;
                const endLine = change.range.end.line;
                const isWholeLineDeleted = change.range.start.character === 0 && change.range.end.character === 0 && startLine !== endLine;
                return change.rangeLength > 0 && change.text === '' && (isWholeLineDeleted || startLine !== endLine);
            });
            await updateLineNumbers(event.document, lineNumber, lineCreated, lineDeleted, autoLineRenum, autoSemi);
        }
    }, 0); // Adjust the debounce delay as needed

    const disposeDebounceChange = vscode.workspace.onDidChangeTextDocument(debouncedOnDidChangeTextDocument)

    // ------------------COMMANDS-------------------
    // Register the standalone command
    //const disposableCommand = vscode.commands.registerCommand('extension.updateLineNumbers', async () => {
    //    const editor = vscode.window.activeTextEditor;
    //    if (editor && editor.document.languageId === 'fanuctp_ls') {
    //        const lineCreated = false;
    //        const lineDeleted = false;
    //        await updateLineNumbers(editor.document, lineNumber, lineCreated, lineDeleted, true, false);
    //    }
    //});

    // Pushing all event listeners and commands to the context
    context.subscriptions.push(disposeOpen, disposeDebounceChange);

    }

// ------------------EVENT HANDLER LOGIC-------------------


// Updates the line numbers in the document
// Called on document change in total line numbers
// Called on command execution
async function updateLineNumbers(document: vscode.TextDocument, lineNumber: number, lineCreated: boolean, 
                                lineDeleted: boolean, autoLineRenum: boolean, autoSemi: boolean) {
    if (!autoLineRenum || !autoSemi) {
        return;
    }
    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    if (!(fileName in fileDict)) {
        return;
    }

    // Destructure with default values
    let [startLine, endLine, lineEditsEnabled, totalLines, processedLines] = fileDict[fileName] || [0, 0, false, 0, 0];

    if (!lineEditsEnabled || endLine === undefined) {
        return;
    }

    const edits: vscode.TextEdit[] = [];
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        console.log('updt: No active editor');
        return;
    }

    // Get the current position of the cursor
    const position = editor.selection.active;
    lineNumber = position.line + 1;

    const inRange = startLine < lineNumber && lineNumber < endLine
    if (!inRange) {
        return;
    }

    const text = document.getText();
    const lines = text.split('\r\n');

    let tpLines = lines.slice(startLine, endLine-1);

    const blankLineRegex = /^\s*[\r\n]?$/;
    const lineNumRegex = /^\s*(\d{1,4}):/;
    const noSemiNumRegex = /^\s*(\d{1,4}):\s*[^;]*$/;
    const twoSemiRegex = /\s*;\s*;\s*$/;
    const onlySemiRegex = /^\s*(\d{1,4}:)?\s*;$/;

    // SKIPPED LINES
    let diff = Math.abs(totalLines - processedLines);
    if (diff >= 1) {
        isAutoUpd = true;
        console.log('updt: START Applying edits: isAutoUpd = ' + isAutoUpd);
        // Iterate over each line in the document
        for (let i = 0; i < tpLines.length && i <= endLine-1; i++) {

            let lineText = tpLines[i];

            // Check if the line is blank
            if (blankLineRegex.test(lineText)) {
                lineText = (i + 1).toString().padStart(4, ' ') + ":   ;";
            } 
            else if (noSemiNumRegex.test(lineText)) {
                lineText = (i + 1).toString().padStart(4, ' ') + ":  " + lineText.slice(5).trimEnd().trimStart() + ' ;';   
            }
            else if (onlySemiRegex.test(lineText)) {
                lineText = (i + 1).toString().padStart(4, ' ') + ":   ;";
            }
            else if (lineNumRegex.test(lineText)) {
                lineText = (i + 1).toString().padStart(4, ' ') + ":  " + lineText.slice(5).trimStart();
            }
            else if (twoSemiRegex.test(lineText)) {
                lineText = (i + 1).toString().padStart(4, ' ') + ":   ;";
            }
            else {
                lineText = (i + 1).toString().padStart(4, ' ') + ":  " + lineText.trimStart();
            }

            
            // Push the edit
            const lineLength = document.lineAt(startLine + i).text.length;
            edits.push(vscode.TextEdit.replace(new vscode.Range(startLine + i, 0, startLine + i, lineLength), lineText));
        }


        // Apply the edits to the document
        const edit = new vscode.WorkspaceEdit();
        const uri = document.uri;
        edit.set(uri, edits);
        
        await vscode.workspace.applyEdit(edit);
        isAutoUpd = false;
        console.log('updt: DONE Applying edits: isAutoUpd = ' + isAutoUpd);

    }
    // If no line diff return
    else {
        return
    }

    // Update the processed lines count
    fileDict[fileName][4] = lines.length;
}

// Constructs the fileDict entry for the document
// Calles on document open
// Called in docuemnt change
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
        const line = document.lineAt(i).text;

        if (headerEndRegex.test(line)) {
            tpLineStart = i + 1; // Line numbers are 1-based
            headExists = true;
        }

        if (posEndRegex.test(line)) {
            tpLineEnd = i + 1;
            posExists = true;
            break; // Stop searching if posEndRegex is found
        }

        if (!posExists && endRegex.test(line)) {
            tpLineEnd = i + 1;
            endExists = true;
        }
    }

    if (!(fileName in fileDict)) {
        fileDict[fileName] = [tpLineStart, tpLineEnd, (headExists && (endExists || posExists)), document.lineCount, document.lineCount];
    } else {
        fileDict[fileName][0] = tpLineStart;
        fileDict[fileName][1] = tpLineEnd;
        fileDict[fileName][2] = (headExists && (endExists || posExists));
        fileDict[fileName][3] = document.lineCount;
    }
    
    //console.log(`set: Setting line numbers for ${fileName}`);
    console.log('set: ' + JSON.stringify(fileDict));
}

export function deactivate() {}
