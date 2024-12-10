import * as vscode from 'vscode';
import * as path from 'path';

// GLOBAL VARIABLES

// fileDict 1 entry per document
// start line,  end line,  line edits enabled,  total lines,  edit lines, labels, jumps
let fileDict: { [fileName: string]: [number, number, boolean, number, number] } = {};

// Panel for label webview
let panel: vscode.WebviewPanel | undefined;

// Last editor to track switching editors and keeping code in sync
let lastActiveEditor: vscode.TextEditor | undefined;

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

// Create a decoration type for highlighting
const highlightDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(211, 211, 211, 0.5)'
});

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
        if (isAutoUpd) {
            return;
        }

        setLineNumbers(event.document);

        if (event.document.languageId === 'fanuctp_ls') {
            const lineCreated = event.contentChanges.some(change => change.text.includes('\n'));
            //const lineDeleted = event.contentChanges.some(change => change.rangeLength > 0 && change.text === '');
            const lineDeleted = event.contentChanges.some(change => {
                const startLine = change.range.start.line;
                const endLine = change.range.end.line;
                const isWholeLineDeleted = change.range.start.character === 0 && change.range.end.character === 0 && startLine !== endLine;
                return change.rangeLength > 0 && change.text === '' && (isWholeLineDeleted || startLine !== endLine);
            });
            await updateLineNumbers(event.document, autoLineRenum, autoSemi);
        }
    }, 50); 

    const disposeDebounceChange = vscode.workspace.onDidChangeTextDocument(debouncedOnDidChangeTextDocument)

    // ------------------COMMANDS-------------------
    // STANDALONE UPDATE LINE NUMBERS
    const disposableCommand = vscode.commands.registerCommand('extension.updateLineNumbers', async (event: vscode.TextDocumentChangeEvent) => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'fanuctp_ls') {
            await updateLineNumbers(event.document, true, true);
        }
    });

    // WEBVIEW LABEL VIEW
    const disposeLabelWindow = vscode.commands.registerCommand('extension.openLabelView', () => {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        lastActiveEditor = editor;
        const document = editor.document;
        const labels = extractLabels(document);
        const jumps = extractJumps(document, labels);

        panel = vscode.window.createWebviewPanel(
            'labelView',
            'Label View',
            vscode.ViewColumn.Beside, 
            {
                enableScripts: true 
            }
        );

        // Set the HTML content
        panel.webview.html = getWebviewContent(document, labels, jumps);

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            message => {
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
                        editor = vscode.window.activeTextEditor;
                        if (lastActiveEditor) {
                            gotoJumpLabel(lastActiveEditor, jump);
                        }
                        return;
                    }
                },
            undefined,
            context.subscriptions
        );

        // Listen for when the panel is disposed
        panel.onDidDispose(() => {
            panel = undefined;
        }, null, context.subscriptions);
    });

    // Listen for active editor changes
    const disposeActiveEditorChange = vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor && editor.document.languageId === 'fanuctp_ls') {
            lastActiveEditor = editor;
            console.log('active: active editor changed');
            const document = editor.document;
            const labels = extractLabels(document);
            const jumps = extractJumps(document, labels);

            // Update the Webview content
            if (panel) {
                panel.webview.html = getWebviewContent(document, labels, jumps);

                // Re-register the message handler for the new editor
                panel.webview.onDidReceiveMessage(
                    message => {
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
                                editor = vscode.window.activeTextEditor;
                                if (lastActiveEditor) {
                                    gotoJumpLabel(lastActiveEditor, jump);
                                }
                                return;
                        }
                    },
                    undefined,
                    context.subscriptions
                );
            }
        }
    });

    // Pushing all event listeners and commands to the context
    context.subscriptions.push(disposeOpen, disposeDebounceChange, disposeLabelWindow, disposeActiveEditorChange);

    }

// ------------------EVENT HANDLER LOGIC-------------------


// Updates the line numbers in the document
// Called on document change in total line numbers
// Called on command execution
async function updateLineNumbers(document: vscode.TextDocument, autoLineRenum: boolean, autoSemi: boolean) {
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

    // Line with only whitespace
    const blankLineRegex = /^\s*[\r\n]?$/;
    // Line with a line number
    const lineNumRegex = /^\s*(\d{1,4}):/;
    // Line that doesn't have a semicolon at the end
    const noSemiNumRegex = /^\s*(\d{1,4}):\s*[^;]*$/;
    // Line with 2 semicolons at the end
    const twoSemiEndRegex = /\s*;\s*;\s*$/;
    // Line that only has a semicolon
    const onlySemiRegex = /^\s*(\d{1,4}:)?\s*;$/;
    // Line with semicolon at start and end
    const betweenSemiRegex = /^\s*(\d{1,4}):\s*;([^;]*);$/;
    // Lines with movements
    const moveRegex = /(^\s*(\d{1,4}):|\s+)\s*[JL]\s/;

    // SKIPPED LINES
    let diff = Math.abs(totalLines - processedLines);
    if (diff >= 1) {
        isAutoUpd = true;
        //console.log('updt: START Applying edits: isAutoUpd = ' + isAutoUpd);
        // Iterate over each line in the document
        for (let i = 0; i < tpLines.length && i <= endLine-1; i++) {

            let lineText = tpLines[i];

            // Check if the line is blank
            if (blankLineRegex.test(lineText)) {
                lineText = (i + 1).toString().padStart(4, ' ') + ":   ;";
            }
            else if (betweenSemiRegex.test(lineText)) {
                const match = lineText.match(betweenSemiRegex);
                if (match) {
                    let content = match[2].trim();
                    if (content.startsWith("J ") || content.startsWith("L ")) {
                        // Handle lines starting with "J " or "L "
                        lineText = (i + 1).toString().padStart(4, ' ') + ":" + content + ' ;';
                    } else {
                        lineText = (i + 1).toString().padStart(4, ' ') + ":  " + content + ' ;';
                    }
                }
            }
            else if (noSemiNumRegex.test(lineText)) {
                lineText = (i + 1).toString().padStart(4, ' ') + ":" + lineText.slice(5).trimEnd() + '   ;';   
            }
            else if (onlySemiRegex.test(lineText)) {
                lineText = (i + 1).toString().padStart(4, ' ') + ":   ;";
            }
            else if (twoSemiEndRegex.test(lineText)) {
                //lineText = (i + 1).toString().padStart(4, ' ') + ":" + "   ;";
                lineText = (i + 1).toString().padStart(4, ' ') + ":" + lineText.slice(5).replace(twoSemiEndRegex, ' ;');
            }
            else if (lineNumRegex.test(lineText)) {
                lineText = (i + 1).toString().padStart(4, ' ') + ":" + lineText.slice(5);
            }
            else if (moveRegex.test(lineText)) {
                lineText = (i + 1).toString().padStart(4, ' ') + ":" + lineText.trimStart();
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
        //console.log('updt: DONE Applying edits: isAutoUpd = ' + isAutoUpd);

        // move the cursor to the normal TP start column
        const column = 7; 
        const position = new vscode.Position(lineNumber-1, column);
        editor.selection = new vscode.Selection(position, position);

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
            tpLineStart = i + 1;
            headExists = true;
        }

        if (posEndRegex.test(line)) {
            tpLineEnd = i + 1;
            posExists = true;
            // Stop searching if posEndRegex is found
            break;
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
    //console.log('set: ' + JSON.stringify(fileDict[fileName]));
}


function extractNumberFromLabel(label: string): string {
    const match = label.match(/\[(\d+)(?::[^\]]+)?\]/);
    return match ? match[1] : '';
}

// Label extraction
function extractLabels(document: vscode.TextDocument): string[] {
    const labelRegex = /^\s*(\d{1,4}:)\s*LBL\[\d+(?::[^\]]+)?\]/g;
    const labels: string[] = [];

    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    if (!(fileName in fileDict)) {
        return ["No labels found"];
    }

    // Destructure with default values
    let [startLine, endLine] = fileDict[fileName] || [0, document.lineCount];


    for (let i = startLine; i < endLine+1; i++) {
        const line = document.lineAt(i).text;
        const matches = line.match(labelRegex);
        if (matches) {
            matches.forEach(match => {
                labels.push(match.slice(7).trim());
            });
        }
    }

    return labels;
}

// Jump extraction
function extractJumps(document: vscode.TextDocument, labels: string[]): { [label: string]: string[] }  {
    const jumpRegex = /JMP\s*LBL\[(\d*)\]/g;
    const jumps: { [label: string]: string[] } = {};

    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    if (!(fileName in fileDict)) {
        return {};
    }

    // Destructure with default values
    let [startLine, endLine] = fileDict[fileName] || [0, document.lineCount];

    for (let i = startLine; i < endLine + 1; i++) {
        const line = document.lineAt(i).text;
        const matches = line.match(jumpRegex);
        if (matches) {
            matches.forEach(match => {
                let label = match.slice(7).trim();
                label = extractNumberFromLabel(label);
                if (!(label in jumps)) {
                    jumps[label] = [];
                }
                jumps[label].push("JMP LBL on Line:   " + (i - startLine + 1).toString());
            });
        }
    }

    return jumps;
}


function gotoLabel(editor: vscode.TextEditor, label: string) {
    label = ":  " + label;

    let document = editor.document;
    if (!lastActiveEditor) {
        document = editor.document;
    }
    else {
        document = lastActiveEditor.document;
    }

    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    if (!(fileName in fileDict)) {
        return;
    }

    // Destructure with default values
    let [startLine, endLine] = fileDict[fileName] || [0, document.lineCount];

    for (let i = startLine; i < endLine+1; i++) {
        const line = document.lineAt(i).text;
        if (line.includes(label)) {
            const position = new vscode.Position(i, line.length);

            // Check if the target line is within the visible range
            const visibleRanges = editor.visibleRanges;
            let isVisible = false;
            for (const range of visibleRanges) {
                if (range.contains(position)) {
                    isVisible = true;
                    break;
                }
            }

            // Set the selection and reveal the range if not visible
            editor.selection = new vscode.Selection(position, position);
            if (!isVisible) {
                editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.AtTop);
            }

            // Apply the highlight decoration
            const range = new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, line.length));
            editor.setDecorations(highlightDecorationType, [range]);

            // Remove the highlight decoration after a short delay
            setTimeout(() => {
                editor.setDecorations(highlightDecorationType, []);
            }, 500);

            break;
        }
    }
}

function gotoJumpLabel(editor: vscode.TextEditor, jump: string) {
    // Extract the jump number from the jump string
    const jumpNum = parseInt(jump.slice(19), 10);

    let document = editor.document;
    if (!lastActiveEditor) {
        document = editor.document;
    } else {
        document = lastActiveEditor.document;
    }

    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    if (!(fileName in fileDict)) {
        return;
    }

    // Destructure with default values
    let [startLine, endLine] = fileDict[fileName] || [0, document.lineCount];

    // Calculate the target line number
    const targetLine = jumpNum + startLine - 1;

    // Ensure the target line is within the document's line count
    if (targetLine >= document.lineCount) {
        return;
    }

    // Create a position at the start of the target line
    const position = new vscode.Position(targetLine, 0);

    // Check if the target line is within the visible range
    const visibleRanges = editor.visibleRanges;
    let isVisible = false;
    for (const range of visibleRanges) {
        if (range.contains(position)) {
            isVisible = true;
            break;
        }
    }

    // Set the selection and reveal the range if not visible
    editor.selection = new vscode.Selection(position, position);
    if (!isVisible) {
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.AtTop);
    }

    // Apply the highlight decoration
    const range = new vscode.Range(position, new vscode.Position(targetLine, document.lineAt(targetLine).text.length));
    editor.setDecorations(highlightDecorationType, [range]);

    // Remove the highlight decoration after a short delay
    setTimeout(() => {
        editor.setDecorations(highlightDecorationType, []);
    }, 500);
}



function getWebviewContent(document: vscode.TextDocument, labels: string[], jumps: { [label: string]: string[] }): string {

    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    if (!(fileName in fileDict)) {
         return `<!DOCTYPE html>
    <html lang="en">
    </html>`;
    }

    const labelList = labels.map(label => {
        const labelNumber = extractNumberFromLabel(label);
        const jumpLines = (jumps[labelNumber] || []).map(jump => `<p class="jump-text" data-jump="${jump}">${jump}</p>`).join('');
        return `
        <li data-label="${label}">
            <div class="label-container">
                <span class="icon">🏷️</span>
                <div class="label-text">
                    <p>${label}</p>
                    ${jumpLines}
                </div>
            </div>
        </li>
    `;
    }).join('');
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Label View</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                padding: 10px;
            }
            h1 {
                font-size: 1.5em;
                border-bottom: 2px solid #ddd;
                padding-bottom: 10px;
            }
            ul {
                list-style-type: none;
                padding: 0;
            }
            li {
                cursor: pointer;
                padding: 10px;
                border: 1px solid #ddd;
                display: flex;
                align-items: center;
            }
            li:hover {
                background-color: #000000;
            }
            .icon {
                font-size: 1.5em;
                margin-right: 10px;
            }
            .label-container {
                display: flex;
                flex-direction: row;
                align-items: flex-start;
            }
            .label-text {
                margin: 0;
            }
            .jump-text {
                margin: 0;
                padding-left: 20px;
                color: #808080; /* Grey color for jumps */
            }
        </style>
    </head>
    <body>
        <h1>Labels</h1>
        <ul>
            ${labelList}
        </ul>
        <script>
            const vscode = acquireVsCodeApi();
            document.querySelectorAll('li').forEach(item => {
                item.addEventListener('click', () => {
                    const label = item.getAttribute('data-label');
                    vscode.postMessage({ command: 'gotoLabel', label });
                });
            });
            document.querySelectorAll('.jump-text').forEach(item => {
                item.addEventListener('click', (event) => {
                    event.stopPropagation();
                    const jump = item.getAttribute('data-jump');
                    vscode.postMessage({ command: 'gotoJumpLabel', jump });
                });
            });
        </script>
    </body>
    </html>`;
}


export function deactivate() {}
