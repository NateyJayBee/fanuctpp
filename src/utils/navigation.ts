import * as vscode from 'vscode';
import * as path from 'path';

import {
    getFileDict,
    getLastActiveEditor
} from '../state';

import { highlightDecorationType } from './decorate'; 

// Track the current highlight timeout
let currNameHighlightTimeout: NodeJS.Timeout | null = null;

// Track the current highlight timeout for labels
let currLabelHighlightTimeout: NodeJS.Timeout | null = null;

// Works on LBL
export function gotoLabel(editor: vscode.TextEditor, label: string) {
    label = ":  " + label;

    let document = editor.document;
    if (!getLastActiveEditor()) {
        document = editor.document;
    } else {
        const lastEditor = getLastActiveEditor();
        document = lastEditor ? lastEditor.document : editor.document;
    }

    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    const fileDict = getFileDict();
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
            editor.setDecorations(highlightDecorationType, [range]);

            // Clear the previous timeout if it exists
            if (currLabelHighlightTimeout) {
                clearTimeout(currLabelHighlightTimeout);
            }

            // Set a new timeout to remove the highlight
            currLabelHighlightTimeout = setTimeout(() => {
                editor.setDecorations(highlightDecorationType, []);
                currLabelHighlightTimeout = null; // Reset the timeout tracker
            }, 500);

            break;
        }
    }
}

// Works on JMP, Skip, and SkipJump
export function gotoJumpLabel(editor: vscode.TextEditor, jump?: string, skip?: string, skipJump?: string) {
    // Extract the jump number from the jump string
    const jumpNum = jump ? parseInt(jump.slice(19), 10) : 0;
    const skipNum = skip ? parseInt(skip.slice(20), 10) : 0;
    const skipJumpNum = skipJump ? parseInt(skipJump.slice(24), 10): 0;

    // Determine the target line based on the provided input
    const targetNum = jumpNum || skipNum || skipJumpNum;

    let document = editor.document;
    if (!getLastActiveEditor()) {
        document = editor.document;
    } else {
        const lastEditor = getLastActiveEditor();
        document = lastEditor ? lastEditor.document : editor.document;
    }

    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    const fileDict = getFileDict();
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
    editor.setDecorations(highlightDecorationType, [range]);

    // Clear the previous timeout if it exists
    if (currLabelHighlightTimeout) {
        clearTimeout(currLabelHighlightTimeout);
    }

    // Set a new timeout to remove the highlight
    currLabelHighlightTimeout = setTimeout(() => {
        editor.setDecorations(highlightDecorationType, []);
        currLabelHighlightTimeout = null; // Reset the timeout tracker
    }, 500);
}

// Function to handle item line navigation
export function gotoItemLine(document: vscode.TextDocument, lineNum: number) {
    const position = new vscode.Position(lineNum - 1, 0);
    const editor = getLastActiveEditor();
    if (editor) {
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.AtTop);
    
        // Apply the highlight decoration
        const range = new vscode.Range(position, new vscode.Position(lineNum - 1, document.lineAt(lineNum - 1).text.length));
        editor.setDecorations(highlightDecorationType, [range]);
    
        // Clear the previous timeout if it exists
        if (currNameHighlightTimeout) {
            clearTimeout(currNameHighlightTimeout);
        }

        // Set a new timeout to remove the highlight
        currNameHighlightTimeout = setTimeout(() => {
            editor.setDecorations(highlightDecorationType, []);
            currNameHighlightTimeout = null; // Reset the timeout tracker
        }, 500);
    }
}