"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
//variables
let prevLineCount = -1;
let lineCount = 0;
function activate(context) {
    console.log('Extension "fanuctpp" is now active!');
    vscode.workspace.onDidChangeTextDocument(event => {
        updateLineNumbers(event.document);
    });
    vscode.workspace.onDidOpenTextDocument(document => {
        if (document.languageId === 'fanuctpp') {
            prevLineCount = -1;
            updateLineNumbers(document);
        }
    });
    vscode.workspace.textDocuments.forEach(document => {
        if (document.languageId === 'fanuctpp') {
            prevLineCount = -1;
            updateLineNumbers(document);
        }
    });
    vscode.workspace.textDocuments.forEach(updateLineNumbers);
}
function updateLineNumbers(document) {
    const text = document.getText();
    const lines = text.split('\n');
    lineCount = lines.length;
    const regex = /^\s*(\d{1,4}):/;
    const edits = [];
    console.log("EDITS: ", edits);
    if (lineCount == prevLineCount) {
        return;
    }
    prevLineCount = lineCount;
    let tpLineNumber = 1;
    lines.forEach((line, index) => {
        const actualLineNumber = index + 1;
        const match = line.match(regex);
        if (match) {
            tpLineNumber++; // Increment tp-linenum if line already has a number
        }
        else if (line.trim()) {
            // Add new tp-linenum if the line is not empty and doesn't match the existing number
            console.log(new vscode.Position(index, 0), `${tpLineNumber}: `);
            edits.push(vscode.TextEdit.insert(new vscode.Position(index, 0), `${tpLineNumber}: `));
            tpLineNumber++;
        }
    });
}
function deactivate() { }
