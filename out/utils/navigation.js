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
exports.gotoLabel = gotoLabel;
exports.gotoJumpLabel = gotoJumpLabel;
exports.gotoItemLine = gotoItemLine;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const state_1 = require("../state");
const decorate_1 = require("./decorate");
// Track the current highlight timeout
let currNameHighlightTimeout = null;
// Track the current highlight timeout for labels
let currLabelHighlightTimeout = null;
// Works on LBL
function gotoLabel(editor, label) {
    label = ":  " + label;
    let document = editor.document;
    if (!(0, state_1.getLastActiveEditor)()) {
        document = editor.document;
    }
    else {
        const lastEditor = (0, state_1.getLastActiveEditor)();
        document = lastEditor ? lastEditor.document : editor.document;
    }
    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    const fileDict = (0, state_1.getFileDict)();
    if (!(fileName in fileDict)) {
        return {};
    }
    // Destructure with default values
    let [startLine, endLine] = fileDict[fileName] || [0, document.lineCount];
    for (let i = startLine; i < endLine + 1; i++) {
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
            editor.setDecorations(decorate_1.highlightDecorationType, [range]);
            // Clear the previous timeout if it exists
            if (currLabelHighlightTimeout) {
                clearTimeout(currLabelHighlightTimeout);
            }
            // Set a new timeout to remove the highlight
            currLabelHighlightTimeout = setTimeout(() => {
                editor.setDecorations(decorate_1.highlightDecorationType, []);
                currLabelHighlightTimeout = null; // Reset the timeout tracker
            }, 500);
            break;
        }
    }
}
// Works on JMP, Skip, and SkipJump
function gotoJumpLabel(editor, jump, skip, skipJump) {
    // Extract the jump number from the jump string
    const jumpNum = jump ? parseInt(jump.slice(19), 10) : 0;
    const skipNum = skip ? parseInt(skip.slice(20), 10) : 0;
    const skipJumpNum = skipJump ? parseInt(skipJump.slice(24), 10) : 0;
    // Determine the target line based on the provided input
    const targetNum = jumpNum || skipNum || skipJumpNum;
    let document = editor.document;
    if (!(0, state_1.getLastActiveEditor)()) {
        document = editor.document;
    }
    else {
        const lastEditor = (0, state_1.getLastActiveEditor)();
        document = lastEditor ? lastEditor.document : editor.document;
    }
    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    const fileDict = (0, state_1.getFileDict)();
    if (!(fileName in fileDict)) {
        return {};
    }
    // Destructure with default values
    let [startLine, endLine] = fileDict[fileName] || [0, document.lineCount];
    // Calculate the target line number
    const targetLine = targetNum + startLine - 1;
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
    editor.setDecorations(decorate_1.highlightDecorationType, [range]);
    // Clear the previous timeout if it exists
    if (currLabelHighlightTimeout) {
        clearTimeout(currLabelHighlightTimeout);
    }
    // Set a new timeout to remove the highlight
    currLabelHighlightTimeout = setTimeout(() => {
        editor.setDecorations(decorate_1.highlightDecorationType, []);
        currLabelHighlightTimeout = null; // Reset the timeout tracker
    }, 500);
}
// Function to handle item line navigation
function gotoItemLine(document, lineNum) {
    const position = new vscode.Position(lineNum - 1, 0);
    const editor = (0, state_1.getLastActiveEditor)();
    if (editor) {
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.AtTop);
        // Apply the highlight decoration
        const range = new vscode.Range(position, new vscode.Position(lineNum - 1, document.lineAt(lineNum - 1).text.length));
        editor.setDecorations(decorate_1.highlightDecorationType, [range]);
        // Clear the previous timeout if it exists
        if (currNameHighlightTimeout) {
            clearTimeout(currNameHighlightTimeout);
        }
        // Set a new timeout to remove the highlight
        currNameHighlightTimeout = setTimeout(() => {
            editor.setDecorations(decorate_1.highlightDecorationType, []);
            currNameHighlightTimeout = null; // Reset the timeout tracker
        }, 500);
    }
}
//# sourceMappingURL=navigation.js.map