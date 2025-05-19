import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function getBackupWebContent(profiles: { name: string; directory: string; robots: { name: string; ip: string }[] }[]): string {
    const profileHtml = profiles.map((profile, profileIndex) => {
        const robotsHtml = profile.robots.map((robot, robotIndex) => {
            return `
                <li class="robot-item" data-profile-index="${profileIndex}" data-robot-index="${robotIndex}">
                    <div class="robot-container">
                        <span class="robot-name">Robot Name: ${robot.name}</span>
                        <span class="robot-ip">IP: ${robot.ip}</span>
                    </div>
                    <button class="button backup-button red" data-profile-index="${profileIndex}" data-robot-index="${robotIndex}">
                        Backup
                    </button>
                </li>
            `;
        }).join('');

        return `
            <div class="profile" data-profile-index="${profileIndex}">
                <h2>${profile.name}</h2>
                <button class="button backup-all-button" data-profile-index="${profileIndex}">Backup All</button>
                <ul class="robot-list">
                    ${robotsHtml}
                </ul>
            </div>
        `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Backup Assist</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    background-color: rgb(36, 36, 36);
                    color: #fff;
                }
                h1 {
                    font-size: 2em;
                    margin-bottom: 20px;
                }
                h2 {
                    font-size: 1.5em;
                    margin: 10px 0;
                }
                ul {
                    list-style-type: none;
                    padding: 0;
                }
                li {
                    font-size: 1.25em;
                    padding: 10px;
                    margin-bottom: 10px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    background-color: rgb(36, 36, 36);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                li:hover {
                    background-color: #000000;
                }
                .robot-container {
                    display: flex;
                    flex-direction: column;
                }
                .robot-name, .robot-ip {
                    margin: 2px 0;
                }
                .button {
                    padding: 5px 10px;
                    cursor: pointer;
                    border: none;
                    border-radius: 3px;
                    transition: background-color 0.3s;
                }
                .button:hover {
                    background-color: rgb(1, 77, 124);
                }
                .backup-button.green {
                    background-color: green;
                    color: white;
                }
                .backup-button.red {
                    background-color: red;
                    color: white;
                }
                .backup-all-button {
                    margin-bottom: 10px;
                    background-color: #007acc;
                    color: white;
                }
                .manage-profiles-button {
                    margin-bottom: 20px;
                    background-color: #007acc;
                    color: white;
                }
            </style>
        </head>
        <body>
            <h1>Backup Assist</h1>
            <button class="button manage-profiles-button">Manage Profiles</button>
            <div id="profiles">
                ${profileHtml}
            </div>
            <script>
                const vscode = acquireVsCodeApi();

                // Open Profile Manager
                document.querySelector('.manage-profiles-button').addEventListener('click', () => {
                    vscode.postMessage({ command: 'openProfileManager' });
                });

                // Backup All Robots in a Profile
                document.querySelectorAll('.backup-all-button').forEach((button) => {
                    const profileIndex = button.dataset.profileIndex;
                    button.addEventListener('click', () => {
                        vscode.postMessage({ command: 'backupAll', profileIndex });
                    });
                });

                // Backup Individual Robot
                document.querySelectorAll('.backup-button').forEach((button) => {
                    const profileIndex = button.dataset.profileIndex;
                    const robotIndex = button.dataset.robotIndex;
                    button.addEventListener('click', () => {
                        vscode.postMessage({ command: 'backupRobot', profileIndex, robotIndex });
                    });
                });
                
                // Validate IPs every 5 seconds
                setInterval(() => {
                    document.querySelectorAll('.robot-item').forEach((robotItem) => {
                        const profileIndex = robotItem.dataset.profileIndex;
                        const robotIndex = robotItem.dataset.robotIndex;
                        const ip = robotItem.querySelector('.robot-ip').textContent.split(': ')[1];

                        vscode.postMessage({ command: 'validateIP', profileIndex, robotIndex, ip });
                    });
                }, 5000);

                // Listen for IP validation results
                window.addEventListener('message', (event) => {
                    const { command, profileIndex, robotIndex, isValid } = event.data;
                    if (command === 'updateIPStatus') {
                        const button = document.querySelector(\`.robot-item[data-profile-index="\${profileIndex}"][data-robot-index="\${robotIndex}"] .backup-button\`);
                        if (button) {
                            button.classList.toggle('green', isValid);
                            button.classList.toggle('red', !isValid);
                        }
                    }
                });
            </script>
        </body>
        </html>
    `;
}

export function getBackupManagerWebContent(context: vscode.ExtensionContext): string {
    const profilesPath = path.join(context.globalStorageUri.fsPath, 'codeFanucBackupProfiles.json');

    // Load profiles from JSON
    let profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));

    interface Robot {
        name: string;
        ip: string;
        ftpUser: string;
        ftpPass: string;
    }

    interface Profile {
        name: string;
        directory: string;
        robots: Robot[];
    }

    const profileHtml: string = (profiles as Profile[]).map((profile: Profile, profileIndex: number) => {
        const robotsHtml: string = profile.robots.map((robot: Robot, robotIndex: number) => {
            return `
                <li class="robot-item" data-profile-index="${profileIndex}" data-robot-index="${robotIndex}">
                    <div class="robot-container">
                        <label>Robot Name:</label>
                        <input class="robot-name-input" type="text" value="${robot.name}" />
                        <label>IP Address:</label>
                        <input class="robot-ip-input" type="text" value="${robot.ip}" />
                        <button class="button delete-robot-button">Delete Robot</button>
                    </div>
                </li>
            `;
        }).join('');

        return `
            <div class="profile" data-profile-index="${profileIndex}">
                <h2>Profile: ${profile.name}</h2>
                <label>Backup Directory:</label>
                <input class="directory-input" type="text" value="${profile.directory}" />
                <ul class="robot-list">
                    ${robotsHtml}
                </ul>
                <button class="button add-robot-button">Add Robot</button>
                <button class="button delete-profile-button">Delete Profile</button>
            </div>
        `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Profile Manager</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    background-color: rgb(36, 36, 36);
                    color: #fff;
                }
                h1 {
                    font-size: 2em;
                    margin-bottom: 20px;
                }
                .button {
                    padding: 5px 10px;
                    cursor: pointer;
                    border: none;
                    border-radius: 3px;
                    background-color: #007acc;
                    color: white;
                    transition: background-color 0.3s;
                }
                .button:hover {
                    background-color: rgb(1, 77, 124);
                }
                .robot-container, .profile {
                    margin-bottom: 20px;
                    border: 1px solid #ddd;
                    padding: 10px;
                    border-radius: 5px;
                    background-color: rgb(36, 36, 36);
                }
            </style>
        </head>
        <body>
            <h1>Profile Manager</h1>
            <button class="button add-profile-button">Add Profile</button>
            <div id="profiles">
                ${profileHtml}
            </div>
            <script>
                const vscode = acquireVsCodeApi();

                document.querySelector('.add-profile-button').addEventListener('click', () => {
                    vscode.postMessage({ command: 'addProfile' });
                });

                document.querySelectorAll('.add-robot-button').forEach((button) => {
                    const profileIndex = button.closest('.profile').dataset.profileIndex;
                    button.addEventListener('click', () => {
                        vscode.postMessage({ command: 'addRobot', profileIndex });
                    });
                });

                document.querySelectorAll('.delete-profile-button').forEach((button) => {
                    const profileIndex = button.closest('.profile').dataset.profileIndex;
                    button.addEventListener('click', () => {
                        vscode.postMessage({ command: 'deleteProfile', profileIndex });
                    });
                });

                document.querySelectorAll('.delete-robot-button').forEach((button) => {
                    const profileIndex = button.closest('.profile').dataset.profileIndex;
                    const robotIndex = button.closest('.robot-item').dataset.robotIndex;
                    button.addEventListener('click', () => {
                        vscode.postMessage({ command: 'deleteRobot', profileIndex, robotIndex });
                    });
                });

                document.querySelectorAll('.robot-name-input, .robot-ip-input, .directory-input').forEach((input) => {
                    input.addEventListener('input', (event) => {
                        const profileIndex = input.closest('.profile').dataset.profileIndex;
                        const robotIndex = input.closest('.robot-item')?.dataset.robotIndex;
                        const value = input.value;
                        vscode.postMessage({
                            command: 'updateField',
                            profileIndex,
                            robotIndex,
                            field: input.classList.contains('directory-input') ? 'directory' : input.classList.contains('robot-name-input') ? 'name' : 'ip',
                            value
                        });
                    });
                });
            </script>
        </body>
        </html>
    `;
}