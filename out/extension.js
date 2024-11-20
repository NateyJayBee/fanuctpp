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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
//fileDict 1 entry per document
//start line, end line, line edits enabled, total lines
let fileDict = {};
let isAutoUpd = false;
let lineNumber = 0;
// Debounce function to delay execution
function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
function activate(context) {
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
    const disposeSelection = vscode.window.onDidChangeTextEditorSelection((event) => {
        lineNumber = getCurrentLineNumber(event.textEditor);
    });
    // Debounced handler for text document changes
    const debouncedOnDidChangeTextDocument = debounce((event) => __awaiter(this, void 0, void 0, function* () {
        if (isAutoUpd) {
            console.log('automatic change, skipping handler');
            return;
        }
        console.log('manual change, using handler');
        if (event.document.languageId === 'fanuctp_ls') {
            const editor = vscode.window.activeTextEditor;
            const newLineCreated = event.contentChanges.some(change => change.text.includes('\n'));
            if (newLineCreated) {
                yield updateLineNumbers(event.document, lineNumber);
            }
        }
    }), 50); // Adjust the debounce delay as needed
    const disposeDebounceChange = vscode.workspace.onDidChangeTextDocument(debouncedOnDidChangeTextDocument);
    // Pushing all event listeners to the context
    context.subscriptions.push(disposeDebounceChange, disposeOpen, disposeSelection);
}
//gets the line number of a regex match
function getLineNumberFromPosition(position, text) {
    return text.substring(0, position).split('\n').length;
}
//gets the line number the cursor is currently on
function getCurrentLineNumber(editor) {
    if (editor) {
        const position = editor.selection.active;
        const lineNumber = position.line + 1;
        console.log(`get: Current line number: ${lineNumber}`);
        return lineNumber;
    }
    else {
        console.log('No active editor');
        return -1;
    }
}
// Updates the line numbers in the document
function updateLineNumbers(document, currLine) {
    return __awaiter(this, void 0, void 0, function* () {
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
        const edits = [];
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
        yield vscode.workspace.applyEdit(edit);
        isAutoUpd = false;
        console.log('updt: DONE Applying edits: isAutoUpd = ' + isAutoUpd);
    });
}
// Constructs the fileDict entry for the document
function setLineNumbers(document) {
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
    let headExists = false;
    let endExists = false;
    let posExists = false;
    let tpLineStart = -1;
    let tpLineEnd = -1;
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
function deactivate() { }
//# sourceMappingURL=extension.js.map