"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGlobalGroupState = getGlobalGroupState;
exports.getFileDict = getFileDict;
exports.getLabelPanel = getLabelPanel;
exports.getNamePanel = getNamePanel;
exports.getBackupPanel = getBackupPanel;
exports.getBackupManagerPanel = getBackupManagerPanel;
exports.getLastActiveEditor = getLastActiveEditor;
exports.getPreviousActiveEditorFilePath = getPreviousActiveEditorFilePath;
exports.getIsAutoUpd = getIsAutoUpd;
exports.setGlobalGroupState = setGlobalGroupState;
exports.setFileDict = setFileDict;
exports.setLabelPanel = setLabelPanel;
exports.setNamePanel = setNamePanel;
exports.setBackupPanel = setBackupPanel;
exports.setBackupManagerPanel = setBackupManagerPanel;
exports.setLastActiveEditor = setLastActiveEditor;
exports.setPreviousActiveEditorFilePath = setPreviousActiveEditorFilePath;
exports.setIsAutoUpd = setIsAutoUpd;
// GLOBAL VARIABLES
/*
export let globalGroupState: { [key: string]: boolean } = {};

// fileDict 1 entry per document
// start line,  end line,  line edits enabled,  total lines,  edit lines
export let fileDict: { [fileName: string]: [number, number, boolean, number, number] } = {};

// Panels for webviews
export let labelPanel: vscode.WebviewPanel | undefined;
export let namePanel: vscode.WebviewPanel | undefined;

// Last editor to track switching editors and keeping code in sync
export let lastActiveEditor: vscode.TextEditor | undefined;
export let previousActiveEditorFilePath: string | undefined;

// Update Line Num tracking var
export let isAutoUpd = false;

*/
// Internal state variables
let _globalGroupState = {};
let _fileDict = {};
let _labelPanel;
let _namePanel;
let _backupPanel;
let _backupManagerPanel;
let _lastActiveEditor;
let _previousActiveEditorFilePath;
let _isAutoUpd = false;
// Getters
function getGlobalGroupState() {
    return _globalGroupState;
}
function getFileDict() {
    return _fileDict;
}
function getLabelPanel() {
    return _labelPanel;
}
function getNamePanel() {
    return _namePanel;
}
function getBackupPanel() {
    return _backupPanel;
}
function getBackupManagerPanel() {
    return _backupManagerPanel;
}
function getLastActiveEditor() {
    return _lastActiveEditor;
}
function getPreviousActiveEditorFilePath() {
    return _previousActiveEditorFilePath;
}
function getIsAutoUpd() {
    return _isAutoUpd;
}
// Setters
function setGlobalGroupState(state) {
    _globalGroupState = state;
}
function setFileDict(dict) {
    _fileDict = dict;
}
function setLabelPanel(panel) {
    _labelPanel = panel;
}
function setNamePanel(panel) {
    _namePanel = panel;
}
function setBackupPanel(panel) {
    _backupPanel = panel;
}
function setBackupManagerPanel(panel) {
    _backupManagerPanel = panel;
}
function setLastActiveEditor(editor) {
    _lastActiveEditor = editor;
}
function setPreviousActiveEditorFilePath(filePath) {
    _previousActiveEditorFilePath = filePath;
}
function setIsAutoUpd(value) {
    _isAutoUpd = value;
}
//# sourceMappingURL=state.js.map