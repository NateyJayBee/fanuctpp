import * as vscode from 'vscode';
import * as path from 'path';

import {
    getFileDict,
    setFileDict,
    getIsAutoUpd,
    setIsAutoUpd,
} from '../state';


// Updates the line numbers in the document
// Called on document change in total line numbers
// Called on command execution
export async function editLineNumbers(document: vscode.TextDocument, asCommand: boolean = false) {

    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    const fileDict = getFileDict();
    if (!(fileName in fileDict)) {
        return {};
    }

    // Destructure with default values
    let [startLine, endLine, lineEditsEnabled, totalLines, processedLines] = fileDict[fileName] || [0, 0, false, 0, 0];

    if (!lineEditsEnabled || endLine === undefined) {
        return;
    }

    const edits: vscode.TextEdit[] = [];
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        return;
    }

    // Get the current position of the cursor
    const position = editor.selection.active;
    let lineNumber = position.line + 1;

    const inRange = startLine-1 < lineNumber && lineNumber < endLine
    if (!inRange) {
        return;
    }

    // SKIPPED LINES
    let diff = Math.abs(totalLines - processedLines);
    if ((diff >= 1) || asCommand === true) {

        const text = document.getText();
        const lines = text.split(/\r?\n/);
    
        let tpLines = lines.slice(startLine, endLine-1);
    
        // Line with only whitespace
        const blankLineRegex = /^\s*$/;
        // Line with a line number
        const lineNumRegex = /^\s*\d+:/;
        // Line without number, usually after continuation line
        const contLineRegex = /^\s*:/;
        // Line that has only a number and no semicolon at the end
        const noSemiNumRegex = /^\s*(\d{1,4}):\s*$/;
        // Line that has words and no semicolon at the end
        const noSemiWordRegex = /^\s*(\d{1,4}):\s*[^;]*$/;
        // Line with 2 semicolons at the end
        const twoSemiEndRegex = /\s*;\s*;\s*$/;
        // Line that only has a semicolon
        const onlySemiRegex = /^\s*(\d{1,4}:)?\s*;$/;
        // Line with semicolon at start and end
        const betweenSemiRegex = /^\s*(\d{1,4}:|\s*)\s*;([^;]*);$/;
        // Lines with movements
        const moveRegex = /(^\s*(\d{1,4}):|\s+)\s*[JL]\s/;

        setIsAutoUpd(true);

        // Boolean to check if current line is a continuation of previous
        let lineContCnt = 0;
        let inCont = false;
        let startContIdx = -1;
        let prevLineText = "";

        // new line made on position
        let movedPosition = false;

        // Iterate over each line in the document
        // TODO could be optimized but hasnt shown signs of lag
        // Attempted tracking line created or deleted was slower
        for (let i = 0; i < tpLines.length && i <= endLine-1; i++) {
            let lineText = tpLines[i];
            let tpLineNum = i + 1 - lineContCnt;
            let tpLineText = tpLineNum.toString().padStart(4, ' ');
            
            if (blankLineRegex.test(lineText)) {
                if (inCont) {
                    edits.pop();
                    inCont = false;
                    prevLineText = prevLineText.replace(/(\s*; ;\s*\s*$|\s*;*\s*$)/, ' ;');
                    let prevLineLength = document.lineAt(startLine + i - 1).text.length;
                    edits.push(vscode.TextEdit.replace(new vscode.Range(startLine + i - 1, 0, startLine + i - 1, prevLineLength), prevLineText));
                }
                lineText = tpLineText + ":   ;";
            }
            else if (contLineRegex.test(lineText)) {
                if (!inCont) {
                    edits.pop();
                    inCont = true;
                    prevLineText = prevLineText.replace(/\s*;+\s*$/, ' ');
                    let prevLineLength = document.lineAt(startLine + i - 1).text.length;
                    edits.push(vscode.TextEdit.replace(new vscode.Range(startLine + i - 1, 0, startLine + i - 1, prevLineLength), prevLineText));
                }
                lineContCnt++; 
            }
            else if (twoSemiEndRegex.test(lineText)) {
                lineText = tpLineText + ":" + lineText.slice(5).replace(twoSemiEndRegex, ' ;');
                if (onlySemiRegex.test(lineText)) {
                    lineText = tpLineText + ":   ;";
                }
                if (inCont) {
                    edits.pop();
                    inCont = false;
                    prevLineText = prevLineText.replace(/(\s*; ;\s*\s*$|\s*;*\s*$)/, ' ;');
                    let prevLineLength = document.lineAt(startLine + i - 1).text.length;
                    edits.push(vscode.TextEdit.replace(new vscode.Range(startLine + i - 1, 0, startLine + i - 1, prevLineLength), prevLineText));
                }
            }
            else if (betweenSemiRegex.test(lineText)) {
                const match = lineText.match(betweenSemiRegex);
                if (match) {
                    let content = match[2].trim();
                    // Handle lines starting with "J " or "L "
                    if (content.startsWith("J ") || content.startsWith("L ")) {
                        lineText = tpLineText + ":" + content + ' ;';
                    } else {
                        lineText = tpLineText + ":  " + content + ' ;';
                    }
                }
                if (inCont) {
                    edits.pop();
                    inCont = false;
                    prevLineText = prevLineText.replace(/(\s*; ;\s*\s*$|\s*;*\s*$)/, ' ;');
                    let prevLineLength = document.lineAt(startLine + i - 1).text.length;
                    edits.push(vscode.TextEdit.replace(new vscode.Range(startLine + i - 1, 0, startLine + i - 1, prevLineLength), prevLineText));
                }
            }
            else if (noSemiNumRegex.test(lineText)) {
                lineText = tpLineText + ":" + lineText.slice(5).trimEnd() + '   ;';   
                if (inCont) {
                    edits.pop();
                    inCont = false;
                    prevLineText = prevLineText.replace(/(\s*; ;\s*\s*$|\s*;*\s*$)/, ' ;');
                    let prevLineLength = document.lineAt(startLine + i - 1).text.length;
                    edits.push(vscode.TextEdit.replace(new vscode.Range(startLine + i - 1, 0, startLine + i - 1, prevLineLength), prevLineText));
                }
            }
            else if (noSemiWordRegex.test(lineText)) {
                lineText = tpLineText + ":" + lineText.slice(5).trimEnd() + ' ;';
                if (inCont) {
                    edits.pop();
                    inCont = false;
                    prevLineText = prevLineText.replace(/(\s*; ;\s*\s*$|\s*;*\s*$)/, ' ;');
                    let prevLineLength = document.lineAt(startLine + i - 1).text.length;
                    edits.push(vscode.TextEdit.replace(new vscode.Range(startLine + i - 1, 0, startLine + i - 1, prevLineLength), prevLineText));
                }
            }
            else if (onlySemiRegex.test(lineText)) {
                lineText = tpLineText + ":   ;";
                if (inCont) {
                    edits.pop();
                    inCont = false;
                    prevLineText = prevLineText.replace(/(\s*; ;\s*\s*$|\s*;*\s*$)/, ' ;');
                    let prevLineLength = document.lineAt(startLine + i - 1).text.length;
                    edits.push(vscode.TextEdit.replace(new vscode.Range(startLine + i - 1, 0, startLine + i - 1, prevLineLength), prevLineText));
                }
            }
            else if (lineNumRegex.test(lineText)) {
                lineText = tpLineText + ":" + lineText.slice(5);
                if (inCont) {
                    edits.pop();
                    inCont = false;
                    prevLineText = prevLineText.replace(/(\s*; ;\s*\s*$|\s*;*\s*$)/, ' ;');
                    let prevLineLength = document.lineAt(startLine + i - 1).text.length;
                    edits.push(vscode.TextEdit.replace(new vscode.Range(startLine + i - 1, 0, startLine + i - 1, prevLineLength), prevLineText));
                }
            }
            else if (moveRegex.test(lineText)) {
                lineText = tpLineText + ":" + lineText.trimStart();
                movedPosition = true;
                if (inCont) {
                    edits.pop();
                    inCont = false;
                    prevLineText = prevLineText.replace(/(\s*; ;\s*\s*$|\s*;*\s*$)/, ' ;');
                    let prevLineLength = document.lineAt(startLine + i - 1).text.length;
                    edits.push(vscode.TextEdit.replace(new vscode.Range(startLine + i - 1, 0, startLine + i - 1, prevLineLength), prevLineText));
                }
            }
            else {
                lineText = tpLineText + ":  " + lineText.trimStart();
            }
            prevLineText = lineText;

            // Push the edit
            const lineLength = document.lineAt(startLine + i).text.length;
            edits.push(vscode.TextEdit.replace(new vscode.Range(startLine + i, 0, startLine + i, lineLength), lineText));
        }

        // Apply the edits to the document
        const edit = new vscode.WorkspaceEdit();
        const uri = document.uri;
        edit.set(uri, edits);
        
        await vscode.workspace.applyEdit(edit);
        setIsAutoUpd(false);

        // move the cursor to the normal TP start column
        if (totalLines > processedLines) {
            let column = 7; 
            if (movedPosition) {
                column = 5;
            }
            const position = new vscode.Position(lineNumber-1, column);
            editor.selection = new vscode.Selection(position, position);
        }

        // Update the processed lines count
        fileDict[fileName][4] = lines.length;
        setFileDict(fileDict);
    }
    // If no line diff return
    else {
        return
    }
}

// Constructs the fileDict entry for the document
// Calles on document open
// Called in docuemnt change
export async function setLineNumbers(document: vscode.TextDocument) {
    const fileName = path.basename(document.fileName);

    // Have not seen LS file w/o these
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

    // Get the file name of the document
    const fileDict = getFileDict();
    if (!(fileName in fileDict)) {
        fileDict[fileName] = [tpLineStart, tpLineEnd, (headExists && (endExists || posExists)), document.lineCount, document.lineCount];
    } else {
        fileDict[fileName][0] = tpLineStart;
        fileDict[fileName][1] = tpLineEnd;
        fileDict[fileName][2] = (headExists && (endExists || posExists));
        fileDict[fileName][3] = document.lineCount;
    }
    setFileDict(fileDict);
}

// Function to handle name updates in a single document
export function editName(document: vscode.TextDocument, oldItem: string, oldName: string, newName: string, hidden: boolean = false) {
    const text = document.getText();
    const oldItemRegex = new RegExp(`${oldItem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
    const newItemText = oldItem.replace(oldName, newName);
    const newText = text.replace(oldItemRegex, newItemText);
    
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(text.length)
    );
    edit.replace(document.uri, fullRange, newText);
    vscode.workspace.applyEdit(edit);

    if (hidden) {
        // save and don't show the document
        document.save()
    }

}

// Function to handle name updates in multiple documents in a directory
export async function editNameInDirectory(directory: vscode.Uri, oldItem: string, oldName: string, newName: string) {
    const files = await vscode.workspace.findFiles(new vscode.RelativePattern(directory, '*'));
    for (const file of files) {
        // Ensure the file has a .ls or .LS extension
        if (!file.fsPath.endsWith('.ls') && !file.fsPath.endsWith('.LS')) {
            continue;
        }

        const document = await vscode.workspace.openTextDocument(file);
        const text = document.getText();
        const oldItemRegex = new RegExp(`${oldItem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
        if (oldItemRegex.test(text)) {
            editName(document, oldItem, oldName, newName, true);
        }
    }
}