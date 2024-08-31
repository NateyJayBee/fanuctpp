import * as vscode from 'vscode';

//variables
let prevLineCount: Number = -1;
let lineCount: Number = 0 ;


export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "fanuctpp" is now active!');

    vscode.workspace.onDidChangeTextDocument(event => {
        updateLineNumbers(event.document);
    });

    vscode.workspace.onDidOpenTextDocument(document => {
        if(document.languageId === 'fanuctpp'){
            prevLineCount = -1
            updateLineNumbers(document);
        }
    });

    vscode.workspace.textDocuments.forEach(document => {
        if(document.languageId === 'fanuctpp'){
            prevLineCount = -1
            updateLineNumbers(document);
        }
    });

    vscode.workspace.textDocuments.forEach(updateLineNumbers);
}

function updateLineNumbers(document: vscode.TextDocument) {
    const text = document.getText();
    const lines = text.split('\n');
    lineCount = lines.length ; 
    const regex = /^\s*(\d{1,4}):/;
    const edits: vscode.TextEdit[] = [];
    console.log("EDITS: ",edits)

    if (lineCount == prevLineCount) {
        return
    }
    prevLineCount = lineCount ;
    
    let tpLineNumber = 1;

    lines.forEach((line, index) => {
        const actualLineNumber = index + 1;
        const match = line.match(regex);

        if (match) {
            tpLineNumber++; // Increment tp-linenum if line already has a number
        } else if (line.trim()) {
            // Add new tp-linenum if the line is not empty and doesn't match the existing number
            console.log(new vscode.Position(index, 0), `${tpLineNumber}: `) ;
            edits.push(vscode.TextEdit.insert(new vscode.Position(index, 0), `${tpLineNumber}: `));
            tpLineNumber++;
        }
    });
}

export function deactivate() {}
