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
exports.registerBackupManagerView = exports.registerBackupView = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const state_1 = require("../state");
const backupWebview_1 = require("../webviews/backupWebview");
const backupWebview_2 = require("../webviews/backupWebview");
const network_1 = require("../utils/network");
let profiles = [];
const registerBackupView = (context) => {
    return vscode.commands.registerCommand('extension.openBackupView', () => {
        const profilesPath = path.join(context.globalStorageUri.fsPath, 'codeFanucBackupProfiles.json');
        // Load profiles from JSON
        if (fs.existsSync(profilesPath)) {
            profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));
        }
        else {
            // Open backup manager to set defaults
            (0, exports.registerBackupManagerView)(context);
        }
        const NewBackupPanel = vscode.window.createWebviewPanel('backupView', 'Backup Assist', vscode.ViewColumn.One, { enableScripts: true });
        (0, state_1.setBackupPanel)(NewBackupPanel);
        const backupPanel = (0, state_1.getBackupPanel)();
        if (!backupPanel) {
            vscode.window.showErrorMessage('Backup Panel is not available.');
            return;
        }
        backupPanel.webview.html = (0, backupWebview_1.getBackupWebContent)(profiles);
        backupPanel.webview.onDidReceiveMessage((message) => __awaiter(void 0, void 0, void 0, function* () {
            switch (message.command) {
                case 'validateIP':
                    const { profileIndex, robotIndex, ip } = message;
                    const isValid = yield (0, network_1.validateIP)(ip);
                    backupPanel.webview.postMessage({ command: 'updateIPStatus', profileIndex, robotIndex, isValid });
                    break;
                case 'openBackupManager':
                    (0, backupWebview_2.getBackupManagerWebContent)(context);
                    break;
                case 'backupAll':
                    const profile = profiles[message.profileIndex];
                    break;
                case 'backupRobot':
                    const robot = profiles[message.profileIndex].robots[message.robotIndex];
                    break;
            }
        }));
    });
};
exports.registerBackupView = registerBackupView;
const registerBackupManagerView = (context) => {
    return vscode.commands.registerCommand('extension.openBackupManagerView', () => {
        const storageDir = context.globalStorageUri.fsPath;
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }
        const profilesPath = path.join(storageDir, 'codeFanucBackupProfiles.json');
        const configPath = path.join(storageDir, 'codeFanucBackupConfig.json');
        let dfltBackupsDir = path.join(os.homedir(), 'Documents', 'CodeFanuc Backups');
        let profiles = [];
        // Load config from JSON, or create if missing
        if (fs.existsSync(configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                dfltBackupsDir = config.defaultBackupsDir || dfltBackupsDir;
            }
            catch (err) {
                // If file is corrupted, recreate it
                fs.writeFileSync(configPath, JSON.stringify({ defaultBackupsDir: dfltBackupsDir }, null, 4));
            }
        }
        else {
            fs.writeFileSync(configPath, JSON.stringify({ defaultBackupsDir: dfltBackupsDir }, null, 4));
        }
        // Load profiles from JSON, or create if missing/corrupted
        if (fs.existsSync(profilesPath)) {
            try {
                profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));
            }
            catch (err) {
                // If file is corrupted, recreate it with a default profile
                const dfltProfileName = 'Example';
                const dfltProfileBackupDir = path.join(dfltBackupsDir, dfltProfileName);
                profiles = [
                    { name: dfltProfileName, directory: dfltProfileBackupDir, robots: [{ name: 'R1', ip: '192.168.0.1', ftpUser: '', ftpPass: '' }] }
                ];
                fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 4));
            }
        }
        else {
            const dfltProfileName = 'Example';
            const dfltProfileBackupDir = path.join(dfltBackupsDir, dfltProfileName);
            profiles = [
                { name: dfltProfileName, directory: dfltProfileBackupDir, robots: [{ name: 'R1', ip: '192.168.0.1', ftpUser: '', ftpPass: '' }] }
            ];
            fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 4));
        }
        const newBackManagePanel = vscode.window.createWebviewPanel('backupManager', 'Backup Manager', vscode.ViewColumn.Beside, { enableScripts: true });
        (0, state_1.setBackupManagerPanel)(newBackManagePanel);
        const backupManagerPanel = (0, state_1.getBackupManagerPanel)();
        if (!backupManagerPanel) {
            vscode.window.showErrorMessage('Backup Manager Panel is not available.');
            return;
        }
        // Set HTML ONCE
        backupManagerPanel.webview.html = (0, backupWebview_2.getBackupManagerWebContent)(context);
        // Helper to update webview after changes
        function updateWebview() {
            if (backupManagerPanel) {
                let latestProfiles = [];
                try {
                    latestProfiles = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));
                }
                catch (err) {
                    latestProfiles = profiles;
                }
                backupManagerPanel.webview.postMessage({
                    command: 'updateProfiles',
                    profiles: latestProfiles,
                    dfltBackupsDir
                });
            }
        }
        backupManagerPanel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'addProfile': {
                    const name = message.name || `Profile ${profiles.length + 1}`;
                    const dir = path.join(dfltBackupsDir, name);
                    profiles.push({ name, directory: dir, robots: [] });
                    fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 4));
                    updateWebview();
                    break;
                }
                case 'deleteProfile': {
                    profiles.splice(message.profileIndex, 1);
                    fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 4));
                    updateWebview();
                    break;
                }
                case 'renameProfile': {
                    const { profileIndex, newName } = message;
                    const profile = profiles[profileIndex];
                    if (profile) {
                        profile.name = newName;
                        profile.directory = path.join(dfltBackupsDir, newName);
                        fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 4));
                        updateWebview();
                    }
                    break;
                }
                case 'addRobot': {
                    const { profileIndex, robot } = message;
                    profiles[profileIndex].robots.push(robot);
                    fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 4));
                    updateWebview();
                    break;
                }
                case 'deleteRobot': {
                    const { profileIndex, robotIndex } = message;
                    profiles[profileIndex].robots.splice(robotIndex, 1);
                    fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 4));
                    updateWebview();
                    break;
                }
                case 'updateRobotName': {
                    const { profileIndex, robotIndex, field, value } = message;
                    if (['name', 'ip', 'ftpUser', 'ftpPass'].includes(field)) {
                        profiles[profileIndex].robots[robotIndex][field] = value;
                        fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 4));
                        updateWebview();
                    }
                    break;
                }
                case 'updateBackupDirectory': {
                    const { profileIndex, directory } = message;
                    profiles[profileIndex].directory = directory;
                    fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 4));
                    updateWebview();
                    break;
                }
                case 'updateDefaultBackupDir': {
                    dfltBackupsDir = message.value;
                    fs.writeFileSync(configPath, JSON.stringify({ defaultBackupsDir: dfltBackupsDir }, null, 4));
                    updateWebview();
                    break;
                }
            }
        });
        backupManagerPanel.onDidDispose(() => {
            (0, state_1.setBackupManagerPanel)(undefined);
        }, null, context.subscriptions);
    });
};
exports.registerBackupManagerView = registerBackupManagerView;
//# sourceMappingURL=backupCommands.js.map