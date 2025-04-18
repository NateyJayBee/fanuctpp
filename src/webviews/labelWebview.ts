import * as vscode from 'vscode';
import * as path from 'path';

import { getFileDict } from '../state';
import { extractNumberFromLabel } from '../utils/extractors';

// Webview content
export function getLabelWebContent(document: vscode.TextDocument, labels: string[], 
    jumps: { [label: string]: string[] },
    skips: { [label: string]: string[] },
    skipJumps: { [label: string]: string[] }): string {

    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    if (!(fileName in getFileDict())) {
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