import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { getBackupWebContent } from '../webviews/backupWebview';
import { getProfileManagerWebContent } from '../webviews/backupWebview';
import { validateIP, startBackup } from '../utils/network'

let profiles: { name: string; directory: string; robots: { name: string; ip: string }[] }[] = [];

export function registerBackupView(context: vscode.ExtensionContext) {
    const profilesPath = path.join(context.globalStorageUri.fsPath, 'profiles.json');

    // Load profiles from JSON
    if (fs.existsSync(profilesPath)) {
        profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));
    }

    return vscode.commands.registerCommand('extension.openBackupView', () => {
        const panel = vscode.window.createWebviewPanel(
            'backupView',
            'Backup Assist',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = getBackupWebContent(profiles);

        panel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'openProfileManager':
                    openProfileManager(context);
                    break;
                case 'backupAll':
                    const profile = profiles[message.profileIndex];
                    console.log(`Backing up all robots in profile: ${profile.name}`);
                    break;
                case 'backupRobot':
                    const robot = profiles[message.profileIndex].robots[message.robotIndex];
                    console.log(`Backing up robot: ${robot.name} at ${robot.ip}`);
                    break;
            }
        });
    });
}

function openProfileManager(context: vscode.ExtensionContext, profilesPath: string) {
    const panel = vscode.window.createWebviewPanel(
        'profileManager',
        'Profile Manager',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    panel.webview.html = getProfileManagerWebContent(profiles);

    panel.webview.onDidReceiveMessage((message) => {
        switch (message.command) {
            case 'addProfile':
                profiles.push({ name: `Profile ${profiles.length + 1}`, directory: '', robots: [] });
                break;
            case 'addRobot':
                profiles[message.profileIndex].robots.push({ name: '', ip: '' });
                break;
            case 'deleteProfile':
                profiles.splice(message.profileIndex, 1);
                break;
            case 'deleteRobot':
                profiles[message.profileIndex].robots.splice(message.robotIndex, 1);
                break;
            case 'updateField':
                const { profileIndex, robotIndex, field, value } = message;
                if (field === 'directory') {
                    profiles[profileIndex].directory = value;
                } else if (field === 'name' || field === 'ip') {
                    profiles[profileIndex].robots[robotIndex][field] = value;
                }
                break;
        }

        // Save profiles to JSON
        fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));

        // Refresh the webview
        panel.webview.html = getProfileManagerWebContent(profiles);
    });
}