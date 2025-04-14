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
// GLOBAL VARIABLES
let globalGroupState = {};
// fileDict 1 entry per document
// start line,  end line,  line edits enabled,  total lines,  edit lines
let fileDict = {};
// Panels for webviews
let labelPanel;
let namePanel;
// Last editor to track switching editors and keeping code in sync
let lastActiveEditor;
let previousActiveEditorFilePath;
let isAutoUpd = false;
let lineNumber = 0;
// Track the current highlight timeout
let currentHighlightTimeout = null;
// Track the current highlight timeout for labels
let currentLabelHighlightTimeout = null;
// Debounce function to delay execution
function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
// Create a decoration type for highlighting
const highlightDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(211, 211, 211, 0.5)'
});
// Definition provider for CALL and RUN statements
// TODO srch direcotory for MACRO.DG and interpret fanuc macros
class CallDefinitionProvider {
    provideDefinition(document, position, token) {
        return __awaiter(this, void 0, void 0, function* () {
            const range = document.getWordRangeAtPosition(position, /\bCALL\s+(\w+)|\bRUN\s+(\w+)/);
            if (range) {
                const word = document.getText(range);
                const programNameMatch = word.match(/\bCALL\s+(\w+)|\bRUN\s+(\w+)/);
                if (programNameMatch) {
                    const programName = programNameMatch[1] || programNameMatch[2];
                    const currentDir = path.dirname(document.uri.fsPath);
                    const programFilePath = path.join(currentDir, `${programName}.ls`);
                    const programFileUri = vscode.Uri.file(programFilePath);
                    try {
                        const doc = yield vscode.workspace.openTextDocument(programFileUri);
                        return new vscode.Location(programFileUri, new vscode.Position(0, 0));
                    }
                    catch (error) {
                        vscode.window.showErrorMessage(`Cannot open file: ${programFilePath}`);
                    }
                }
            }
            return null;
        });
    }
}
function activate(context) {
    //console.log('Extension "fanuctpp" is now active!');
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
    const autoLineRenum = config.get('autoLineRenumber', true);
    // Set line numbers for documents that are opened
    const disposeOpen = vscode.workspace.onDidOpenTextDocument(document => {
        if (document.languageId === 'fanuctp_ls') {
            setLineNumbers(document);
        }
    });
    // Debounced handler for text document changes
    const debouncedOnDidChangeTextDocument = debounce((event) => __awaiter(this, void 0, void 0, function* () {
        if (isAutoUpd) {
            return;
        }
        setLineNumbers(event.document);
        if (event.document.languageId === 'fanuctp_ls' && autoLineRenum) {
            yield updateLineNumbers(event.document);
        }
    }), 50);
    const disposeDebounceChange = vscode.workspace.onDidChangeTextDocument(debouncedOnDidChangeTextDocument);
    // ------------------COMMANDS-------------------
    // STANDALONE UPDATE LINE NUMBERS
    const disposableCommand = vscode.commands.registerCommand('extension.updateLineNumbers', (event) => __awaiter(this, void 0, void 0, function* () {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'fanuctp_ls') {
            yield updateLineNumbers(event.document);
        }
    }));
    // Register the command to open the Name View webview
    const disposeNameView = vscode.commands.registerCommand('extension.openNameView', () => {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        lastActiveEditor = editor;
        const document = editor.document;
        const names = extractItemNames(document);
        namePanel = vscode.window.createWebviewPanel('nameView', 'Name View', vscode.ViewColumn.Beside, {
            enableScripts: true
        });
        const groupState = globalGroupState;
        namePanel.webview.html = getNameWebContent(document, names, groupState);
        // Handle messages from the webview
        namePanel.webview.onDidReceiveMessage((message) => __awaiter(this, void 0, void 0, function* () {
            const applyToDirectory = message.applyToDirectory;
            switch (message.command) {
                case 'updateName':
                    const replaceIndex = parseInt(message.index, 10);
                    const replaceName = message.newName;
                    const replaceEditor = lastActiveEditor;
                    if (replaceEditor) {
                        const groupedNames = extractItemNames(replaceEditor.document);
                        const names = Object.values(groupedNames).flat();
                        if (replaceIndex >= 0 && replaceIndex < names.length) {
                            const { item, name } = names[replaceIndex];
                            if (applyToDirectory) {
                                const directory = vscode.Uri.file(path.dirname(replaceEditor.document.uri.fsPath));
                                yield updateNameInDirectory(directory, item, name, replaceName);
                            }
                            else {
                                updateName(replaceEditor.document, item, name, replaceName);
                            }
                        }
                    }
                    return;
                case 'refresh':
                    const refreshEditor = vscode.window.activeTextEditor;
                    if (refreshEditor) {
                        const names = extractItemNames(refreshEditor.document);
                        if (namePanel) {
                            namePanel.webview.html = getNameWebContent(refreshEditor.document, names, globalGroupState);
                        }
                    }
                    return;
                case 'gotoLine':
                    const gotoIndex = parseInt(message.index, 10);
                    const lineIndex = parseInt(message.lineIndex, 10);
                    const gotoEditor = lastActiveEditor;
                    if (gotoEditor) {
                        const groupedNames = extractItemNames(gotoEditor.document);
                        const names = Object.values(groupedNames).flat();
                        if (gotoIndex >= 0 && gotoIndex < names.length) {
                            const targetLine = names[gotoIndex].lines[lineIndex];
                            gotoItemLine(gotoEditor.document, targetLine);
                        }
                    }
                    return;
                case 'updateGroupState':
                    globalGroupState = message.groupState;
                    return;
            }
        }), undefined, context.subscriptions);
        // Listen for when the panel is disposed
        namePanel.onDidDispose(() => {
            namePanel = undefined;
        }, null, context.subscriptions);
    });
    // Register the command to open the Label View webview
    const disposeLabelView = vscode.commands.registerCommand('extension.openLabelView', () => {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        lastActiveEditor = editor;
        const document = editor.document;
        const labels = extractLabels(document);
        const jumpLabels = extractJumps(document, labels);
        const skipLabels = extractSkips(document, labels);
        const skipJumpLabels = extractSkipJumps(document, labels);
        labelPanel = vscode.window.createWebviewPanel('labelView', 'Label View', vscode.ViewColumn.Beside, {
            enableScripts: true
        });
        // Set the HTML content
        labelPanel.webview.html = getLabelWebContent(document, labels, jumpLabels, skipLabels, skipJumpLabels);
        // Handle messages from the webview
        labelPanel.webview.onDidReceiveMessage(message => {
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
                    const skip = message.skip;
                    const skipJump = message.skipJump;
                    editor = vscode.window.activeTextEditor;
                    if (lastActiveEditor) {
                        gotoJumpLabel(lastActiveEditor, jump, skip, skipJump);
                    }
                    return;
            }
        }, undefined, context.subscriptions);
        // Listen for when the panel is disposed
        labelPanel.onDidDispose(() => {
            labelPanel = undefined;
        }, null, context.subscriptions);
    });
    // Listen for changes in the active editor
    const disposeActiveEditorChange = vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            const currentFilePath = editor.document.uri.fsPath;
            if (currentFilePath !== previousActiveEditorFilePath) {
                lastActiveEditor = editor;
                previousActiveEditorFilePath = currentFilePath;
                // Handle the active editor change
                handleActiveEditorChange(editor);
            }
        }
    });
    function handleActiveEditorChange(editor) {
        if (namePanel) {
            const groupedNames = extractItemNames(editor.document);
            //const state = namePanel.webview.getState();
            //const groupState = state ? state.groupState : globalGroupState;
            namePanel.webview.postMessage({ command: 'updateGroupState', groupState: globalGroupState });
            namePanel.webview.html = getNameWebContent(editor.document, groupedNames, globalGroupState);
        }
        // Update the Webview content
        if (labelPanel) {
            const labels = extractLabels(editor.document);
            const jumps = extractJumps(editor.document, labels);
            const skips = extractSkips(editor.document, labels);
            const skipJumps = extractSkipJumps(editor.document, labels);
            labelPanel.webview.html = getLabelWebContent(editor.document, labels, jumps, skips, skipJumps);
        }
    }
    // Register the definition provider to open files
    context.subscriptions.push(vscode.languages.registerDefinitionProvider('fanuctp_ls', new CallDefinitionProvider()));
    // Pushing all event listeners and commands to the context
    context.subscriptions.push(disposeOpen, disposeDebounceChange, disposeLabelView, disposeNameView, disposeActiveEditorChange);
}
// ------------------EVENT HANDLER LOGIC-------------------
// Updates the line numbers in the document
// Called on document change in total line numbers
// Called on command execution
function updateLineNumbers(document) {
    return __awaiter(this, void 0, void 0, function* () {
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
        const edits = [];
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            console.log('updt: No active editor');
            return;
        }
        // Get the current position of the cursor
        const position = editor.selection.active;
        lineNumber = position.line + 1;
        const inRange = startLine < lineNumber && lineNumber < endLine;
        if (!inRange) {
            return;
        }
        const text = document.getText();
        const lines = text.split(/\r?\n/);
        let tpLines = lines.slice(startLine, endLine - 1);
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
        // Line with comma at end, code taking up 2 lines
        const contLineRegex = /^\s\s\s\s:/;
        // Line before continue line
        const preContLineRegex = /^\s*(\d{1,4}):.*,$/;
        // SKIPPED LINES
        let diff = Math.abs(totalLines - processedLines);
        if (diff >= 1) {
            isAutoUpd = true;
            //console.log('updt: START Applying edits: isAutoUpd = ' + isAutoUpd);
            // Boolean to check if current line is a continuation of previous
            let doubleLineCnt = 0;
            // new line made on position
            let movedPosition = false;
            // Iterate over each line in the document
            // TODO could be optimized but hasnt shown signs of lag
            // Attempted tracking line created or deleted was slower
            for (let i = 0; i < tpLines.length && i <= endLine - 1; i++) {
                let lineText = tpLines[i];
                let tpLineNum = i + 1 - doubleLineCnt;
                let tpLineText = tpLineNum.toString().padStart(4, ' ');
                if (contLineRegex.test(lineText)) {
                    doubleLineCnt++;
                    lineText = "    :" + lineText.slice(5).trimEnd() + '   ;';
                }
                else if (blankLineRegex.test(lineText)) {
                    lineText = tpLineText + ":   ;";
                }
                else if (preContLineRegex.test(lineText)) {
                    lineText = tpLineText + ":" + lineText.slice(5).trimEnd();
                }
                else if (betweenSemiRegex.test(lineText)) {
                    const match = lineText.match(betweenSemiRegex);
                    if (match) {
                        let content = match[2].trim();
                        // Handle lines starting with "J " or "L "
                        if (content.startsWith("J ") || content.startsWith("L ")) {
                            lineText = tpLineText + ":" + content + '   ;';
                        }
                        else {
                            lineText = tpLineText + ":  " + content + '   ;';
                        }
                    }
                }
                else if (noSemiNumRegex.test(lineText)) {
                    lineText = tpLineText + ":" + lineText.slice(5).trimEnd() + '   ;';
                }
                else if (onlySemiRegex.test(lineText)) {
                    lineText = tpLineText + ":   ;";
                }
                else if (twoSemiEndRegex.test(lineText)) {
                    lineText = tpLineText + ":" + lineText.slice(5).replace(twoSemiEndRegex, '   ;');
                }
                else if (lineNumRegex.test(lineText)) {
                    lineText = tpLineText + ":" + lineText.slice(5);
                }
                else if (moveRegex.test(lineText)) {
                    lineText = tpLineText + ":" + lineText.trimStart();
                    movedPosition = true;
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
            yield vscode.workspace.applyEdit(edit);
            isAutoUpd = false;
            //console.log('updt: DONE Applying edits: isAutoUpd = ' + isAutoUpd);
            // move the cursor to the normal TP start column
            if (totalLines > processedLines) {
                let column = 7;
                if (movedPosition) {
                    column = 5;
                }
                const position = new vscode.Position(lineNumber - 1, column);
                editor.selection = new vscode.Selection(position, position);
            }
        }
        // If no line diff return
        else {
            return;
        }
        // Update the processed lines count
        fileDict[fileName][4] = lines.length;
    });
}
// Constructs the fileDict entry for the document
// Calles on document open
// Called in docuemnt change
function setLineNumbers(document) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileName = path.basename(document.fileName);
        // Have not seen LS file w/o these
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
        }
        else {
            fileDict[fileName][0] = tpLineStart;
            fileDict[fileName][1] = tpLineEnd;
            fileDict[fileName][2] = (headExists && (endExists || posExists));
            fileDict[fileName][3] = document.lineCount;
        }
        //console.log(`set: Setting line numbers for ${fileName}`);
        //console.log('set: ' + JSON.stringify(fileDict[fileName]));
    });
}
// Extract number from label
function extractNumberFromLabel(label) {
    const match = label.match(/\[(\d+)(?::[^\]]+)?\]/);
    return match ? match[1] : '';
}
// Label extraction
function extractLabels(document) {
    const labelRegex = /^\s*(\d{1,4}:)\s*LBL\[\d+(?::[^\]]+)?\]/g;
    const labels = [];
    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    if (!(fileName in fileDict)) {
        return ["No labels found"];
    }
    // Destructure with default values
    let [startLine, endLine] = fileDict[fileName] || [0, document.lineCount];
    for (let i = startLine; i < endLine + 1; i++) {
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
function extractJumps(document, labels) {
    const jumpRegex = /JMP\s*LBL\[(\d*)\]/g;
    const jumps = {};
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
// Extract skip label conditions
function extractSkips(document, labels) {
    const skips = {};
    const skipRegex = /Skip,LBL\[(\d*)\]/g;
    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    if (!(fileName in fileDict)) {
        return {};
    }
    // Destructure with default values
    let [startLine, endLine] = fileDict[fileName] || [0, document.lineCount];
    for (let i = startLine; i < endLine + 1; i++) {
        const line = document.lineAt(i).text;
        const matches = line.match(skipRegex);
        if (matches) {
            matches.forEach(match => {
                let label = match.slice(7).trim();
                label = extractNumberFromLabel(label);
                if (!(label in skips)) {
                    skips[label] = [];
                }
                skips[label].push("Skip,LBL on Line:   " + (i - startLine + 1).toString());
            });
        }
    }
    return skips;
}
// Extract skipjump label conditions
function extractSkipJumps(document, labels) {
    const skipJumps = {};
    const skipJumpRegex = /SkipJump,LBL\[(\d*)\]/g;
    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    if (!(fileName in fileDict)) {
        return {};
    }
    // Destructure with default values
    let [startLine, endLine] = fileDict[fileName] || [0, document.lineCount];
    for (let i = startLine; i < endLine + 1; i++) {
        const line = document.lineAt(i).text;
        const matches = line.match(skipJumpRegex);
        if (matches) {
            matches.forEach(match => {
                let label = match.slice(7).trim();
                label = extractNumberFromLabel(label);
                if (!(label in skipJumps)) {
                    skipJumps[label] = [];
                }
                skipJumps[label].push("SkipJump,LBL on Line:   " + (i - startLine + 1).toString());
            });
        }
    }
    return skipJumps;
}
// Works on LBL
function gotoLabel(editor, label) {
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
            if (currentLabelHighlightTimeout) {
                clearTimeout(currentLabelHighlightTimeout);
            }
            // Set a new timeout to remove the highlight
            currentLabelHighlightTimeout = setTimeout(() => {
                editor.setDecorations(highlightDecorationType, []);
                currentLabelHighlightTimeout = null; // Reset the timeout tracker
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
    if (currentLabelHighlightTimeout) {
        clearTimeout(currentLabelHighlightTimeout);
    }
    // Set a new timeout to remove the highlight
    currentLabelHighlightTimeout = setTimeout(() => {
        editor.setDecorations(highlightDecorationType, []);
        currentLabelHighlightTimeout = null; // Reset the timeout tracker
    }, 500);
}
// Webview content
function getLabelWebContent(document, labels, jumps, skips, skipJumps) {
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
        const skipLines = (skips[labelNumber] || []).map(skip => `<p class="jump-text" data-skip="${skip}">${skip}</p>`).join('');
        const skipJumpLines = (skipJumps[labelNumber] || []).map(skipJump => `<p class="jump-text" data-skipJump="${skipJump}">${skipJump}</p>`).join('');
        return `
        <li data-label="${label}">
            <div class="label-container">
                <span class="icon">🏷️</span>
                <div class="label-text">
                    <p>${label}</p>
                    ${jumpLines}
                    ${skipLines}
                    ${skipJumpLines}
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
                padding: 20px;
                background-color: rgb(36, 36, 36);
                tesx: rgb(36, 36, 36);
            }
            h1 {
                font-size: 2em;
                margin: 0;
            }
            ul {
                list-style-type: none;
                padding: 0;
            }
            li {
                font-size: 1.25em;
                padding: 7.5px;
                margin-bottom: 5px;
                border: 1px solid #ddd;
                border-radius: 5px;
                background-color: rgb(36, 36, 36);
                display: flex;
                align-items: center;
                justify-content: space-between;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                flex-wrap: wrap; 
            }
            li:hover {
                background-color: #000000;
            }
            .header-container {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            .header-buttons {
                display: flex;
                gap: 10px;
            }
            .label-container {
                display: flex;
                align-items: flex-start;
                gap: 2px;
                flex: 1; 
                min-width: 200px; 
                cursor: pointer;
            }
            .label-text {
                display: flex;
                flex-direction: column;
                gap: 2px;
                flex: 1; 
                min-width: 200px; 
                cursor: pointer;
            }
            .jump-text {
                margin: 0;
                padding-left: 10px;
                color:rgb(182, 182, 182); 
                display: inline;
                cursor: pointer;
            }
            .icon {
                padding-top: 7.5px;
                font-size: 1.5em;
                margin-right: 10px;
                margin-right: 10px;
            }
            hr {
                border: 0;
                height: 1px;
                background: #fff;
                margin: 10px 0;
            }
        </style>
    </head>
    <body>
        <div class="header-container">
            <h1>Labels</h1>
        </div>
        <hr>
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
                    const skip = item.getAttribute('data-skip');
                    const skipJump = item.getAttribute('data-skipJump');
                    vscode.postMessage({ command: 'gotoJumpLabel', jump, skip, skipJump });
                });
            });
        </script>
    </body>
    </html>`;
}
// Extract Reg and I/O names from the document
function extractItemNames(document) {
    var _a, _b;
    const combinedRegex = /(DI|DO|GI|GO|RI|RO|UI|UO|SI|SO|SPI|SPO|SSI|SSO|CSI|CSO|SIR|CPC|CSC|JPC|JSC|NSI|AR|SR|GO|F|M|VR|(?<!P)R)\[\d*:.*?(?=\])\]/g;
    const nameRegex = /(?<=:)[^:\]]+(?=\])/;
    const groupedMatches = {};
    const seenItems = new Set();
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i).text;
        const match = line.match(combinedRegex);
        if (match) {
            const item = match[0];
            const name = ((_b = (_a = item.match(nameRegex)) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.trim()) || '';
            const matchItem = item.match(/^[A-Z]+/);
            const type = matchItem ? matchItem[0] : '';
            if (!seenItems.has(item)) {
                if (!groupedMatches[type]) {
                    groupedMatches[type] = [];
                }
                groupedMatches[type].push({ item, name, lines: [i + 1] });
                seenItems.add(item);
            }
            else {
                const existingItem = groupedMatches[type].find(entry => entry.item === item);
                if (existingItem) {
                    existingItem.lines.push(i + 1);
                }
            }
        }
    }
    // Sort the items within each group by the number inside the item
    for (const type in groupedMatches) {
        groupedMatches[type].sort((a, b) => {
            const matchA = a.item.match(/\[(\d+):/);
            const numA = matchA ? parseInt(matchA[1], 10) : 0;
            const matchB = b.item.match(/\[(\d+):/);
            const numB = matchB ? parseInt(matchB[1], 10) : 0;
            return numA - numB;
        });
    }
    // Sort the groups by their keys
    const sortedGroupedMatches = {};
    Object.keys(groupedMatches).sort().forEach(key => {
        sortedGroupedMatches[key] = groupedMatches[key];
    });
    return sortedGroupedMatches;
}
// Function to handle name updates in a single document
function updateName(document, oldItem, oldName, newName, hidden = false) {
    const text = document.getText();
    const oldItemRegex = new RegExp(`${oldItem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
    const newItemText = oldItem.replace(oldName, newName);
    const newText = text.replace(oldItemRegex, newItemText);
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
    edit.replace(document.uri, fullRange, newText);
    vscode.workspace.applyEdit(edit);
    if (hidden) {
        // save and don't show the document
        document.save();
    }
}
// Function to handle item line navigation
function gotoItemLine(document, lineNum) {
    const position = new vscode.Position(lineNum - 1, 0);
    const editor = lastActiveEditor;
    if (editor) {
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.AtTop);
        // Apply the highlight decoration
        const range = new vscode.Range(position, new vscode.Position(lineNum - 1, document.lineAt(lineNum - 1).text.length));
        editor.setDecorations(highlightDecorationType, [range]);
        // Clear the previous timeout if it exists
        if (currentHighlightTimeout) {
            clearTimeout(currentHighlightTimeout);
        }
        // Set a new timeout to remove the highlight
        currentHighlightTimeout = setTimeout(() => {
            editor.setDecorations(highlightDecorationType, []);
            currentHighlightTimeout = null; // Reset the timeout tracker
        }, 500);
    }
}
// Function to handle name updates in multiple documents in a directory
function updateNameInDirectory(directory, oldItem, oldName, newName) {
    return __awaiter(this, void 0, void 0, function* () {
        const files = yield vscode.workspace.findFiles(new vscode.RelativePattern(directory, '*'));
        for (const file of files) {
            // Ensure the file has a .ls or .LS extension
            if (!file.fsPath.endsWith('.ls') && !file.fsPath.endsWith('.LS')) {
                continue;
            }
            const document = yield vscode.workspace.openTextDocument(file);
            const text = document.getText();
            const oldItemRegex = new RegExp(`${oldItem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
            if (oldItemRegex.test(text)) {
                updateName(document, oldItem, oldName, newName, true);
            }
        }
    });
}
// Mapping of keys to descriptive names
const keyToString = {
    "F": "Flags",
    "M": "Markers",
    "R": "Registers",
    "SR": "String Registers",
    "VR": "Visual Registers",
    "AR": "Function Arguments",
    "DI": "Digital Inputs",
    "DO": "Digital Outputs",
    "GI": "Group Inputs",
    "GO": "Group Outputs",
    "RI": "Robot Inputs",
    "RO": "Robot Outputs",
    "UI": "User Op Panel Inputs",
    "UO": "User Op Panel Outputs",
    "SI": "Serial Inputs",
    "SO": "Serial Output",
    "SPI": "Safe Peripheral Inputs",
    "SPO": "Safe Peripheral Outputs",
    "SSI": "Safe System Inputs",
    "SSO": "Safe System Outputs",
    "CSI": "CIP Safety Inputs",
    "CSO": "CIP Safety Outputs",
    "SIR": "Safe Internal Relays",
    "CPC": "Cart. Pos. Checks",
    "CSC": "Cart. Speed Checks",
    "JPC": "Joint Pos. Checks",
    "JSC": "Joint Speed Checks",
    "NSI": "Non-Safety Inputs"
};
// Function to generate the HTML content for the Name Webview
function getNameWebContent(document, groupedNames, groupState) {
    const fileName = path.basename(document.fileName);
    if (!(fileName in fileDict)) {
        return `<!DOCTYPE html>
    <html lang="en">
    </html>`;
    }
    // Generate HTML for each group
    let globalIndex = 0;
    const groupHtml = Object.keys(groupedNames).map(group => {
        const groupDescription = keyToString[group] || group;
        return `
            <details ${groupState[group] ? 'open' : ''} data-group="${group}">
                <summary>${groupDescription}</summary>
                <ul>
                    ${groupedNames[group].map(({ item, name, lines }) => {
            const itemDetails = item.split(':')[0];
            const itemType = itemDetails.split('[')[0];
            const itemNumber = itemDetails.split('[')[1];
            const index = globalIndex++;
            return `
                            <li data-index="${index}" data-line-index="0" data-lines="${lines.join(',')}">
                                <div class="name-container">
                                    <span class="item-type">${itemType}</span>
                                    <span class="name-text">[</span>
                                    <span class="item-number">${itemNumber}</span>
                                    <span class="name-text">:</span>
                                    <input class="name-input" type="text" value="${name}" data-index="${index}">
                                </div>
                                <div class="fields-container">
                                    <button class="button up-button" data-index="${index}">↑</button>
                                    <button class="button down-button" data-index="${index}">↓</button>
                                    <button class="button replace-button" data-index="${index}">Replace</button>
                                </div>
                            </li>
                        `;
        }).join('')}
                </ul>
            </details>
        `;
    }).join('');
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Register and I/O Names</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    background-color: rgb(36, 36, 36);
                    color: #fff;
                }
                h1 {
                    font-size: 2em;
                    margin: 0;
                }
                ul {
                    list-style-type: none;
                    padding: 0;
                }
                li {
                    font-size: 1.25em;
                    padding: 15px;
                    margin-bottom: 10px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    background-color: rgb(36, 36, 36);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    flex-wrap: wrap; 
                }
                li:hover {
                    background-color: #000000;
                }
                .header-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }
                .header-buttons {
                    display: flex;
                    gap: 10px;
                }
                .name-container {
                    display: flex;
                    align-items: center;
                    gap: 2px;
                    flex: 1; 
                    min-width: 200px; 
                }
                .fields-container {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-shrink: 0; 
                }
                .name-text {
                    color: rgb(255, 255, 255);
                }
                .item-type {
                    font-weight: bold;
                    color: #FFFF2C;
                    font-size: 1em; 
                }
                .item-number {
                    font-weight: bold;
                    color: #57F8FF;
                    font-size: 1em; 
                }
                .name-input {
                    border: 1px solid #ddd;
                    border-radius: 3px;
                    width: 150px;
                    background-color: #333;
                    color: #fff;
                    padding: 5px;
                    font-size: 1em;
                    min-width: 100px;
                }
                .button {
                    padding: 5px 10px;
                    cursor: pointer;
                    border: none;
                    background-color: #007acc;
                    border-radius: 3px;
                    transition: background-color 0.3s;
                    flex-shrink: 0; 
                }
                .button:hover {
                    background-color: rgb(1, 77, 124);
                }
                summary {
                    font-size: 1.5em; 
                    cursor: pointer;
                }
                .checkbox-container {
                    margin-top: 10px;
                    font-size: 1.25em;
                }
                .checkbox-container input {
                    transform: scale(1.5);
                    margin-right: 10px;
                }
                .line-number {
                    background-color: rgb(36, 36, 36);
                }
            </style>
    </head>
    <body>
        <div class="header-container">
            <h1>Register and I/O Names</h1>
            <div class="header-buttons">
                <button class="button refresh-button">Refresh</button>
            </div>
        </div>
        <hr>
        <label class="checkbox-container">
            <input type="checkbox" id="directory-checkbox"> Apply to entire directory
        </label>
        <hr>
        ${groupHtml}
        <script>
            const vscode = acquireVsCodeApi();
            const state = vscode.getState();
            const groupState = state ? state.groupState : {};

            document.querySelectorAll('details').forEach(details => {
                details.addEventListener('toggle', () => {
                    const group = details.getAttribute('data-group');
                    groupState[group] = details.open;
                    vscode.setState({ groupState });
                    vscode.postMessage({ command: 'updateGroupState', groupState });
                });
            });

            document.querySelectorAll('.replace-button').forEach(button => {
                button.addEventListener('click', (event) => {
                    const index = event.target.getAttribute('data-index');
                    const input = document.querySelector(\`input[data-index="\${index}"]\`);
                    const newName = input.value;
                    const applyToDirectory = document.getElementById('directory-checkbox').checked;
                    if (newName) {
                        vscode.postMessage({ command: 'updateName', index, newName, applyToDirectory });
                    }
                });
            });

            document.querySelectorAll('.refresh-button').forEach(button => {
                button.addEventListener('click', (event) => {
                    const applyToDirectory = document.getElementById('directory-checkbox').checked;
                    vscode.postMessage({ command: 'refresh', applyToDirectory });
                });
            });

            document.querySelectorAll('.up-button').forEach(button => {
                button.addEventListener('click', (event) => {
                    const index = event.target.getAttribute('data-index');
                    const listItem = document.querySelector(\`li[data-index="\${index}"]\`);
                    let lineIndex = parseInt(listItem.getAttribute('data-line-index'), 10);
                    const lines = listItem.getAttribute('data-lines').split(',').map(Number);

                    // Wrap around to the last index if at the first index
                    if (lineIndex === 0) {
                        lineIndex = lines.length - 1;
                    } else {
                        lineIndex--;
                    }

                    listItem.setAttribute('data-line-index', lineIndex);
                    vscode.postMessage({ command: 'gotoLine', index, lineIndex });
                });
            });

            document.querySelectorAll('.down-button').forEach(button => {
                button.addEventListener('click', (event) => {
                    const index = event.target.getAttribute('data-index');
                    const listItem = document.querySelector(\`li[data-index="\${index}"]\`);
                    let lineIndex = parseInt(listItem.getAttribute('data-line-index'), 10);
                    const lines = listItem.getAttribute('data-lines').split(',').map(Number);

                    // Wrap around to the first index if at the last index
                    if (lineIndex === lines.length - 1) {
                        lineIndex = 0;
                    } else {
                        lineIndex++;
                    }

                    listItem.setAttribute('data-line-index', lineIndex);
                    vscode.postMessage({ command: 'gotoLine', index, lineIndex });
                });
            }); 

            if (state && state.groupState) {
                Object.keys(state.groupState).forEach(group => {
                    const details = document.querySelector(\`details summary:contains("\${group}")\`).parentElement;
                    if (details) {
                        details.open = state.groupState[group];
                    }
                });
            }
        </script>
    </body>
    </html>`;
}
function deactivate() { }
function length(arg0) {
    throw new Error('Function not implemented.');
}
//# sourceMappingURL=extension.js.map