import * as vscode from 'vscode';

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
let _globalGroupState: { [key: string]: boolean } = {};
let _fileDict: { [fileName: string]: [number, number, boolean, number, number] } = {};
let _labelPanel: vscode.WebviewPanel | undefined;
let _namePanel: vscode.WebviewPanel | undefined;
let _backupPanel: vscode.WebviewPanel | undefined;
let _backupManagerPanel: vscode.WebviewPanel | undefined;
let _lastActiveEditor: vscode.TextEditor | undefined;
let _previousActiveEditorFilePath: string | undefined;
let _isAutoUpd: boolean = false;

// Getters
export function getGlobalGroupState() {
    return _globalGroupState;
}

export function getFileDict() {
    return _fileDict;
}

export function getLabelPanel() {
    return _labelPanel;
}

export function getNamePanel() {
    return _namePanel;
}

export function getBackupPanel() {
    return _backupPanel;
}

export function getBackupManagerPanel() {
    return _backupManagerPanel;
}

export function getLastActiveEditor() {
    return _lastActiveEditor;
}

export function getPreviousActiveEditorFilePath() {
    return _previousActiveEditorFilePath;
}

export function getIsAutoUpd() {
    return _isAutoUpd;
}

// Setters
export function setGlobalGroupState(state: { [key: string]: boolean }) {
    _globalGroupState = state;
}

export function setFileDict(dict: { [fileName: string]: [number, number, boolean, number, number] }) {
    _fileDict = dict;
}

export function setLabelPanel(panel: vscode.WebviewPanel | undefined) {
    _labelPanel = panel;
}

export function setNamePanel(panel: vscode.WebviewPanel | undefined) {
    _namePanel = panel;
}

export function setBackupPanel(panel: vscode.WebviewPanel | undefined) {
    _backupPanel = panel;
}

export function setBackupManagerPanel(panel: vscode.WebviewPanel | undefined) {
    _backupManagerPanel = panel;
}

export function setLastActiveEditor(editor: vscode.TextEditor | undefined) {
    _lastActiveEditor = editor;
}

export function setPreviousActiveEditorFilePath(filePath: string | undefined) {
    _previousActiveEditorFilePath = filePath;
}

export function setIsAutoUpd(value: boolean) {
    _isAutoUpd = value;
}