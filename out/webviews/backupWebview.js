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
exports.getBackupWebContent = getBackupWebContent;
exports.getBackupManagerWebContent = getBackupManagerWebContent;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function getBackupWebContent(profiles) {
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
function getBackupManagerWebContent(context) {
    // C:\Users\MyUser\AppData\Roaming\Code\User\globalStorage\nathanbadanjek.fanuctpp
    const profilesPath = path.join(context.globalStorageUri.fsPath, 'codeFanucBackupProfiles.json');
    const dfltBackupDirPath = path.join(context.globalStorageUri.fsPath, 'codeFanucBackupConfig.json');
    // Load default backup directory
    let dfltBackupsDir = JSON.parse(fs.readFileSync(dfltBackupDirPath, 'utf-8')).defaultBackupsDir || '';
    // Load profiles from JSON
    let profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));
    const profileHtml = profiles.map((profile, profileIndex) => {
        const robotsHtml = profile.robots.map((robot, robotIndex) => {
            return `
                <li class="robot-item" data-profile-index="${profileIndex}" data-robot-index="${robotIndex}">
                    <div class="robot-fields-row">
                        <div class="robot-labels">
                            <label>Robot Name:</label>
                            <label>IP Address:</label>
                            <label>FTP Username:</label>
                            <label>FTP Password:</label>
                        </div>
                        <div class="robot-inputs">
                            <input class="robot-name-input" type="text" value="${robot.name}" />
                            <input class="robot-ip-input" type="text" value="${robot.ip}" />
                            <input class="robot-ftpuser-input" type="text" value="${robot.ftpUser}" />
                            <input class="robot-ftppass-input" type="text" value="${robot.ftpPass}" />
                        </div>
                        <button class="button delete-robot-button">Delete Robot</button>
                    </div>
                </li>
            `;
        }).join('');
        return `
            <div class="profile" data-profile-index="${profileIndex}">
                <div class="profile-header">
                    <input class="profile-name-input" type="text" value="${profile.name}" readonly />
                    <button class="button rename-profile-button">Rename</button>
                    <div class="spacer"></div>
                    <button class="button delete-profile-button">Delete Profile</button>
                </div>
                <label>Backup Directory:</label>
                <input class="directory-input" type="text" value="${profile.directory}"/>
                <ul class="robot-list">
                    ${robotsHtml}
                </ul>
                <button class="button add-robot-button">Add Robot</button>
            </div>
        `;
    }).join('');
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Backup Profile Manager</title>
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
                .top-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }
                .default-dir-row {
                    display: flex;
                    align-items: center;
                    margin-bottom: 25px;
                }
                .default-backup-dir-input {
                    width: 350px;
                    margin-right: 10px;
                    padding: 5px;
                    border-radius: 3px;
                    border: 1px solid #888;
                }
                .button {
                    padding: 5px 10px;
                    cursor: pointer;
                    border: none;
                    border-radius: 3px;
                    background-color: #007acc;
                    color: white;
                    transition: background-color 0.3s;
                    margin-bottom: 10px;
                }
                .button:hover {
                    background-color: rgb(1, 77, 124);
                }
                .button.delete-profile-button {
                    align-self: right;
                    background-color: red;
                }   
                .button.save-default-dir-button {
                    margin-top: 10px
                }   
                .robot-container, .profile {
                    margin-bottom: 20px;
                    border: 1px solid #ddd;
                    padding: 10px;
                    border-radius: 5px;
                    background-color: rgb(36, 36, 36);
                }
                .profile-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .spacer {
                    flex: 1;
                }
                .profile-name-input {
                    font-size: 1.5em;
                    margin-bottom: 8px;
                }
                .directory-input {
                    width: 450px;
                    margin-bottom: 8px;
                    padding: 3px 6px;
                    border-radius: 3px;
                    border: 1px solid #888;
                }
                .robot-fields-row {
                    display: flex;
                    align-items: flex-start;
                    gap: 16px;
                    margin-bottom: 8px;
                    padding: 3px 6px;
                    border-radius: 3px;
                    border: 1px solid #888;
                }
                .robot-labels {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }
                .robot-inputs {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .robot-labels {
                    min-width: 100px;
                }
                .robot-inputs input {
                    width: 150px;
                }
            </style>
        </head>
        <body>
            <h1>Backup Profile Manager</h1>
            <div class="top-bar">
                <button class="button add-profile-button">Add Profile</button>
                <button class="button save-changes-button">Save Changes</button>
            </div>
            <div class="default-dir-row">
                <label for="default-backup-dir-input" style="margin-right:8px;">Default Backup Directory:</label>
                <input id="default-backup-dir-input" class="default-backup-dir-input" type="text" value="${dfltBackupsDir}" />
                <button class="button save-default-dir-button">Save</button>
            </div>
            <div id="profiles">
                ${profileHtml}
            </div>
            <script>
                const vscode = acquireVsCodeApi();

                // Add Profile
                document.querySelector('.add-profile-button').addEventListener('click', () => {
                    // Gather all current data from the DOM
                    const profiles = [];
                    document.querySelectorAll('.profile').forEach((profileElem) => {
                        const name = profileElem.querySelector('.profile-name-input').value;
                        const directory = profileElem.querySelector('.directory-input').value;
                        const robots = [];
                        profileElem.querySelectorAll('.robot-item').forEach((robotElem) => {
                            robots.push({
                                name: robotElem.querySelector('.robot-name-input').value,
                                ip: robotElem.querySelector('.robot-ip-input').value,
                                ftpUser: robotElem.querySelector('.robot-ftpuser-input').value,
                                ftpPass: robotElem.querySelector('.robot-ftppass-input').value
                            });
                        });
                        profiles.push({ name, directory, robots });
                    });

                    vscode.postMessage({
                        command: 'saveAll',
                        profiles
                    });

                    // Add a new empty profile
                    vscode.postMessage({
                        command: 'addProfile',
                        profiles
                    });
                });

                // Add Robot
                document.getElementById('profiles').addEventListener('click', (event) => {
                    const button = event.target.closest('.add-robot-button');
                    if (button) {
                        // Gather all current data from the DOM
                        const profiles = [];
                        document.querySelectorAll('.profile').forEach((profileElem) => {
                            const name = profileElem.querySelector('.profile-name-input').value;
                            const directory = profileElem.querySelector('.directory-input').value;
                            const robots = [];
                            profileElem.querySelectorAll('.robot-item').forEach((robotElem) => {
                                robots.push({
                                    name: robotElem.querySelector('.robot-name-input').value,
                                    ip: robotElem.querySelector('.robot-ip-input').value,
                                    ftpUser: robotElem.querySelector('.robot-ftpuser-input').value,
                                    ftpPass: robotElem.querySelector('.robot-ftppass-input').value
                                });
                            });
                            profiles.push({ name, directory, robots });
                        });

                        // Find which profile to add the robot to
                        const profileIndex = Number(button.closest('.profile').dataset.profileIndex);

                        // Add a new empty robot to the correct profile
                        profiles[profileIndex].robots.push({
                            name: '', ip: '', ftpUser: '', ftpPass: ''
                        });

                        // Send all updated profiles to the extension
                        vscode.postMessage({
                            command: 'saveAll',
                            profiles
                        });
                    }
                });

                // Delete Profile
                document.getElementById('profiles').addEventListener('click', (event) => {
                    const button = event.target.closest('.delete-profile-button');
                    if (button) {
                        const profileElem = button.closest('.profile');
                        const profileIndex = Number(profileElem.dataset.profileIndex);
                        vscode.postMessage({ command: 'deleteProfile', profileIndex });
                    }
                });

                // Delete Robot
                document.querySelectorAll('.delete-robot-button').forEach((button) => {
                    const profileIndex = button.closest('.profile').dataset.profileIndex;
                    const robotIndex = button.closest('.robot-item').dataset.robotIndex;
                    button.addEventListener('click', () => {
                        vscode.postMessage({ command: 'deleteRobot', profileIndex: Number(profileIndex), robotIndex: Number(robotIndex) });
                    });
                });

                // Save Profile Changes
                document.querySelector('.save-changes-button').addEventListener('click', () => {
                    // Gather all profile and robot data from the DOM
                    const profiles = [];
                    document.querySelectorAll('.profile').forEach((profileElem, profileIndex) => {
                        const name = profileElem.querySelector('.profile-name-input').value;
                        const directory = profileElem.querySelector('.directory-input').value;
                        const robots = [];
                        profileElem.querySelectorAll('.robot-item').forEach((robotElem, robotIndex) => {
                            robots.push({
                                name: robotElem.querySelector('.robot-name-input').value,
                                ip: robotElem.querySelector('.robot-ip-input').value,
                                ftpUser: robotElem.querySelector('.robot-ftpuser-input').value,
                                ftpPass: robotElem.querySelector('.robot-ftppass-input').value
                            });
                        });
                        profiles.push({ name, directory, robots });
                    });

                    // Get default backup directory if you have a global input for it
                    const defaultBackupDirInput = document.querySelector('.default-backup-dir-input');
                    const defaultBackupsDir = defaultBackupDirInput ? defaultBackupDirInput.value : undefined;

                    vscode.postMessage({
                        command: 'saveAll',
                        profiles,
                        defaultBackupsDir
                    });
                });

                // Save Default Backup Directory
                document.querySelector('.save-default-dir-button').addEventListener('click', () => {
                    const defaultBackupDirInput = document.querySelector('.default-backup-dir-input');
                    const defaultBackupsDir = defaultBackupDirInput.value;
                    vscode.postMessage({ command: 'saveDefaultBackupDir', defaultBackupsDir });
                });

                // Rename Profile
                document.getElementById('profiles').addEventListener('click', (event) => {
                    const button = event.target.closest('.rename-profile-button');
                    if (button) {
                        const profileElem = button.closest('.profile');
                        const profileIndex = Number(profileElem.dataset.profileIndex);
                        const nameInput = profileElem.querySelector('.profile-name-input');
                        const oldName = nameInput.value;

                        // Focus the input for editing
                        nameInput.removeAttribute('readonly');
                        nameInput.focus();

                        // Save on blur or Enter
                        function saveName() {
                            nameInput.setAttribute('readonly', 'readonly');
                            const newName = nameInput.value.trim();
                            if (newName && newName !== oldName) {
                                vscode.postMessage({
                                    command: 'renameProfile',
                                    profileIndex,
                                    newName
                                });
                            } else {
                                nameInput.value = oldName; // revert if unchanged or empty
                            }
                            nameInput.removeEventListener('blur', saveName);
                            nameInput.removeEventListener('keydown', onKeyDown);
                        }

                        function onKeyDown(e) {
                            if (e.key === 'Enter') {
                                nameInput.blur();
                            } else if (e.key === 'Escape') {
                                nameInput.value = oldName;
                                nameInput.blur();
                            }
                        }

                        nameInput.addEventListener('blur', saveName);
                        nameInput.addEventListener('keydown', onKeyDown);
                    }
                });

            </script>
        </body>
        </html>
    `;
}
//# sourceMappingURL=backupWebview.js.map