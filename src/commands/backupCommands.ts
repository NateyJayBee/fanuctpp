import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import {
    setBackupPanel,
    getBackupPanel,
    setBackupManagerPanel,
    getBackupManagerPanel
} from '../state'
import { getBackupWebContent } from '../webviews/backupWebview';
import { getBackupManagerWebContent } from '../webviews/backupWebview';
import { validateIP, startBackup } from '../utils/network'

let profiles: { name: string; directory: string; robots: { name: string; ip: string, ftpUser: string, ftpPass: string }[] }[] = [];

export const registerBackupView = (context: vscode.ExtensionContext) => {
    return vscode.commands.registerCommand('extension.openBackupView', () => {
        const profilesPath = path.join(context.globalStorageUri.fsPath, 'codeFanucBackupProfiles.json');

        // Load profiles from JSON
        if (fs.existsSync(profilesPath)) {
            profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));
        }
        else {
            // Open backup manager to set defaults
            registerBackupManagerView(context);
        }

        const NewBackupPanel = vscode.window.createWebviewPanel(
            'backupView',
            'Backup Assist',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        setBackupPanel(NewBackupPanel);
        const backupPanel = getBackupPanel();
        if (!backupPanel) {
            vscode.window.showErrorMessage('Backup Panel is not available.');
            return;
        }

        backupPanel.webview.html = getBackupWebContent(profiles);

        backupPanel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'validateIP':
                    const { profileIndex, robotIndex, ip } = message;
                    const isValid = await validateIP(ip);
                    backupPanel.webview.postMessage({ command: 'updateIPStatus', profileIndex, robotIndex, isValid });
                    break;
                case 'openBackupManager':
                    getBackupManagerWebContent(context);
                    break;
                case 'backupAll':
                    const profile = profiles[message.profileIndex];
                    break;
                case 'backupRobot':
                    const robot = profiles[message.profileIndex].robots[message.robotIndex];
                    break;
            }
        });
    });
}

export const registerBackupManagerView = (context: vscode.ExtensionContext) => {
    return vscode.commands.registerCommand('extension.openBackupManagerView', () => {
        const storageDir = context.globalStorageUri.fsPath;
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }

        const profilesPath = path.join(storageDir, 'codeFanucBackupProfiles.json');
        const configPath = path.join(storageDir, 'codeFanucBackupConfig.json');
        let dfltBackupsDir = path.join(os.homedir(), 'Documents', 'CodeFanuc Backups');
        let profiles: { name: string; directory: string; robots: { name: string; ip: string, ftpUser: string, ftpPass: string }[] }[] = [];

        // Load config from JSON, or create if missing
        if (fs.existsSync(configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                dfltBackupsDir = config.defaultBackupsDir || dfltBackupsDir;
            } catch (err) {
                // If file is corrupted, recreate it
                fs.writeFileSync(configPath, JSON.stringify({ defaultBackupsDir: dfltBackupsDir }, null, 4));
            }
        } else {
            fs.writeFileSync(configPath, JSON.stringify({ defaultBackupsDir: dfltBackupsDir }, null, 4));
        }

        // Load profiles from JSON, or create if missing/corrupted
        if (fs.existsSync(profilesPath)) {
            try {
                profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));
            } catch (err) {
                // If file is corrupted, recreate it with a default profile
                const dfltProfileName = 'Example';
                const dfltProfileBackupDir = path.join(dfltBackupsDir, dfltProfileName);
                profiles = [
                    { name: dfltProfileName, directory: dfltProfileBackupDir, robots: [{ name: 'R1', ip: '192.168.0.1', ftpUser: '', ftpPass: '' }] }
                ];
                fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 4));
            }
        } else {
            const dfltProfileName = 'Example';
            const dfltProfileBackupDir = path.join(dfltBackupsDir, dfltProfileName);
            profiles = [
                { name: dfltProfileName, directory: dfltProfileBackupDir, robots: [{ name: 'R1', ip: '192.168.0.1', ftpUser: '', ftpPass: '' }] }
            ];
            fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 4));
        }

        const newBackManagePanel = vscode.window.createWebviewPanel(
            'backupManager',
            'Backup Manager',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );
        setBackupManagerPanel(newBackManagePanel);
        const backupManagerPanel = getBackupManagerPanel();
        if (!backupManagerPanel) {
            vscode.window.showErrorMessage('Backup Manager Panel is not available.');
            return;
        }

        // Set HTML ONCE
        backupManagerPanel.webview.html = getBackupManagerWebContent(context);

        // Helper to update webview after changes
        function updateWebview() {
            if (backupManagerPanel) {
                let latestProfiles = [];
                try {
                    latestProfiles = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));
                } catch (err) {
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
                    type RobotField = 'name' | 'ip' | 'ftpUser' | 'ftpPass';
                    if (['name', 'ip', 'ftpUser', 'ftpPass'].includes(field)) {
                        profiles[profileIndex].robots[robotIndex][field as RobotField] = value;
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
            setBackupManagerPanel(undefined);
        }, null, context.subscriptions);
    });
}