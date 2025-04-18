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
export async function updateLineNumbers(document: vscode.TextDocument) {

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
        console.log('updt: No active editor');
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
    if (diff >= 1) {

        const text = document.getText();
        const lines = text.split(/\r?\n/);
    
        let tpLines = lines.slice(startLine, endLine-1);
    
        // Line with only whitespace
        const blankLineRegex = /^\s*[\r\n]?$/;
        // Line with a line number
        const lineNumRegex = /^\s*(\d{1,4}):/;
        // Line that has only a number and a semicolon at the end
        const noSemiNumRegex = /^\s*(\d{1,4}):\s*$/;
        // Line that doesn't have a semicolon at the end
        const noSemiWordRegex = /^\s*(\d{1,4}):\s*[^;]*$/;
        // Line with 2 semicolons at the end
        const twoSemiEndRegex = /\s*;\s*;\s*$/;
        // Line that only has a semicolon
        const onlySemiRegex = /^\s*(\d{1,4}:)?\s*;$/;
        // Line with semicolon at start and end
        const betweenSemiRegex = /^\s*(\d{1,4}:|\s*)\s*;([^;]*);$/;
        // Lines with movements
        const moveRegex = /(^\s*(\d{1,4}):|\s+)\s*[JL]\s/;
        // Line without number, usually after continuation line
        const contLineRegex = /^\s\s\s\s:/;
        // Line before continued line
        const preContLineRegex = /^\s*(\d{1,4}):.*,$/;

        setIsAutoUpd(true);
        //console.log('updt: START Applying edits: isAutoUpd = ' + isAutoUpd);

        // Boolean to check if current line is a continuation of previous
        let doubleLineCnt = 0;

        // new line made on position
        let movedPosition = false;

        // Iterate over each line in the document
        // TODO could be optimized but hasnt shown signs of lag
        // Attempted tracking line created or deleted was slower
        for (let i = 0; i < tpLines.length && i <= endLine-1; i++) {

            let lineText = tpLines[i];
            let tpLineNum = i + 1 - doubleLineCnt;
            let tpLineText = tpLineNum.toString().padStart(4, ' ');

            if (blankLineRegex.test(lineText)) {
                lineText = tpLineText + ":   ;";
            }
            else if (preContLineRegex.test(lineText)) {
                lineText = tpLineText + ":" + lineText.slice(5).trimEnd() ;
            }
            else if (twoSemiEndRegex.test(lineText)) {
                lineText = tpLineText + ":" + lineText.slice(5).replace(twoSemiEndRegex, ' ;');
                if (onlySemiRegex.test(lineText)) {
                    lineText = tpLineText + ":   ;";
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
            }
            else if (noSemiNumRegex.test(lineText)) {
                lineText = tpLineText + ":" + lineText.slice(5).trimEnd() + '   ;';   
            }
            else if (noSemiWordRegex.test(lineText)) {
                lineText = tpLineText + ":" + lineText.slice(5).trimEnd() + ' ;';
            }
            else if (onlySemiRegex.test(lineText)) {
                lineText = tpLineText + ":   ;";
            }
            else if (lineNumRegex.test(lineText)) {
                lineText = tpLineText + ":" + lineText.slice(5);
            }
            else if (moveRegex.test(lineText)) {
                lineText = tpLineText + ":" + lineText.trimStart();
                movedPosition = true;
            }
            else if (contLineRegex.test(lineText)) {
                doubleLineCnt++;
                lineText = "    :" + lineText.slice(5).trimEnd() + ' ;';
                if (twoSemiEndRegex.test(lineText)) {
                    lineText = lineText.replace(twoSemiEndRegex, ' ;');   
                }
            }
            else {
                lineText = tpLineText + ":  " + lineText.trimStart();
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
        setIsAutoUpd(false);
        //console.log('updt: DONE Applying edits: isAutoUpd = ' + isAutoUpd);

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
    
    //console.log(`set: Setting line numbers for ${fileName}`);
    //console.log('set: ' + JSON.stringify(fileDict[fileName]));
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