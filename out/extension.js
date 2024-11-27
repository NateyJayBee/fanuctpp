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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
// GLOBAL VARIABLES
// fileDict 1 entry per document
// start line, end line, line edits enabled, total lines
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
    const autoLineRenum = config.get('autoLineRenumber', true);
    const autoSemi = config.get('autoLineRenumber', true);
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
            const newLineCreated = event.contentChanges.some(change => change.text.includes('\n'));
            //const lineDeleted = event.contentChanges.some(change => change.rangeLength > 0 && change.text === '');
            const lineDeleted = event.contentChanges.some(change => {
                const startLine = change.range.start.line;
                const endLine = change.range.end.line;
                const isWholeLineDeleted = change.range.start.character === 0 && change.range.end.character === 0 && startLine !== endLine;
                return change.rangeLength > 0 && change.text === '' && (isWholeLineDeleted || startLine !== endLine);
            });
            if (newLineCreated || lineDeleted) {
                yield updateLineNumbers(event.document, lineNumber, newLineCreated, lineDeleted, autoLineRenum, autoSemi);
            }
            // Move cursor to column 8 on new line creation
            if (newLineCreated) {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    const newPosition = new vscode.Position(lineNumber - 1, 7);
                    editor.selection = new vscode.Selection(newPosition, newPosition);
                }
            }
        }
    }), 25); // Adjust the debounce delay as needed
    const disposeDebounceChange = vscode.workspace.onDidChangeTextDocument(debouncedOnDidChangeTextDocument);
    // Register the standalone command
    const disposableCommand = vscode.commands.registerCommand('extension.updateLineNumbers', () => __awaiter(this, void 0, void 0, function* () {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'fanuctp_ls') {
            const lineCreated = false;
            const lineDeleted = false;
            yield updateLineNumbers(editor.document, lineNumber, lineCreated, lineDeleted, true, false);
        }
    }));
    // Pushing all event listeners and commands to the context
    context.subscriptions.push(disposeDebounceChange, disposeOpen, disposeSelection, disposableCommand);
}
// ------------------EVENT HANDLER LOGIC-------------------
// Gets the line number the cursor is currently on
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
// Called on document change in total line numbers
// Called on command execution
function updateLineNumbers(document, currLine, lineCreated, lineDeleted, autoLineRenum, autoSemi) {
    return __awaiter(this, void 0, void 0, function* () {
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
            yield setLineNumbers(document);
        }
        // Destructure with default values
        let [startLine, endLine, lineEditsEnabled] = fileDict[fileName] || [0, 0, false];
        if (!lineEditsEnabled || endLine === undefined) {
            return;
        }
        // console.log(`updt: Current line number: ${currLine}`);
        const edits = [];
        if (lineCreated || lineDeleted) {
            const inRange = startLine < currLine && currLine < endLine;
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
                    edits.push(vscode.TextEdit.replace(new vscode.Range(currLine - 2, 0, currLine - 2, lines[currLine - 2].length), updatedPrevLine));
                }
                const newLineNumber = currLine - startLine; // New Line just created
                let formattedNewLineNumber = newLineNumber.toString().padStart(4, ' ') + ':';
                if (autoSemi) {
                    formattedNewLineNumber = newLineNumber.toString().padStart(4, ' ') + ':   ;';
                }
                lines[currLine - 1] = formattedNewLineNumber;
                edits.push(vscode.TextEdit.replace(new vscode.Range(currLine - 1, 0, currLine - 1, lines[currLine - 1].length), formattedNewLineNumber));
            }
            // LINE DELETED
            if (lineDeleted) {
                console.log('updt: Line deleted');
                const twoSemiMatch = lines[currLine - 1].match(twoSemiRegex);
                if (twoSemiMatch) {
                    const updatedPrevLine = lines[currLine - 1].replace(twoSemiRegex, '   ;');
                    lines[currLine - 1] = updatedPrevLine;
                    const lineLength = document.lineAt(currLine - 1).text.length;
                    edits.push(vscode.TextEdit.replace(new vscode.Range(currLine - 1, 0, currLine - 1, lineLength), updatedPrevLine));
                }
            }
            // Iterate over each line in the document starting at next position
            for (let i = (currLine); i < lines.length && i <= (endLine + 1); i++) {
                const match = lines[i].match(lineNumRegex);
                if (match) {
                    lineNumber = parseInt(match[1], 10);
                    if (lineCreated) {
                        lineNumber = lineNumber + 1;
                    }
                    else {
                        lineNumber = lineNumber - 1;
                    }
                    const formattedLineNumber = lineNumber.toString().padStart(4, ' '); // Ensure 4 characters
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
        yield vscode.workspace.applyEdit(edit);
        isAutoUpd = false;
        console.log('updt: DONE Applying edits: isAutoUpd = ' + isAutoUpd);
    });
}
// Constructs the fileDict entry for the document
// Calles on document open
function setLineNumbers(document) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileName = path.basename(document.fileName);
        const posEndRegex = /\/POS/;
        const endRegex = /\/END/;
        const headerEndRegex = /\/MN/;
        let headExists = false;
        let endExists = false;
        let posExists = false;
        let tpLineStart = -1;
        let tpLineEnd = -1;
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
    });
}
function deactivate() { }
//# sourceMappingURL=extension.js.map