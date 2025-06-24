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
exports.getNameWebContent = getNameWebContent;
const path = __importStar(require("path"));
const state_1 = require("../state");
const constants_1 = require("../constants");
// Function to generate the HTML content for the Name Webview
function getNameWebContent(document, groupedNames, groupState) {
    const fileName = path.basename(document.fileName);
    if (!(fileName in (0, state_1.getFileDict)())) {
        return `<!DOCTYPE html>
    <html lang="en">
    </html>`;
    }
    // Generate HTML for each group
    let globalIndex = 0;
    const groupHtml = Object.keys(groupedNames).map(group => {
        const groupDescription = constants_1.keyToString[group] || group;
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
                                    <span class="name-text">]</span>
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
                    height: 1.1em;
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
            <input type="checkbox" id="directory-checkbox"> Apply changes to entire directory
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
//# sourceMappingURL=nameWebview.js.map