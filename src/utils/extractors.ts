import * as vscode from 'vscode';
import * as path from 'path';
import { getFileDict } from '../state'; // Import the fileDict from state

// Extract number from label
export function extractNumberFromLabel(label: string): string {
    const match = label.match(/\[(\d+)(?::[^\]]+)?\]/);
    return match ? match[1] : '';
}

// Label extraction
export function extractLabels(document: vscode.TextDocument): string[] {
    const labelRegex = /^\s*(\d{1,4}:)\s*LBL\[\d+(?::[^\]]+)?\]/g;
    const labels: string[] = [];

    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    if (!(fileName in getFileDict())) {
        return ["No labels found"];
    }

    // Destructure with default values
    let [startLine, endLine] = getFileDict()[fileName] || [0, document.lineCount];


    for (let i = startLine; i < endLine+1; i++) {
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
export function extractJumps(document: vscode.TextDocument, labels: string[]): { [label: string]: string[] }  {
    const jumpRegex = /JMP\s*LBL\[(\d*)\]/g;
    const jumps: { [label: string]: string[] } = {};

    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    const fileDict = getFileDict();
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
export function extractSkips(document: vscode.TextDocument, labels: string[]): { [label: string]: string[] } {
    const skips: { [label: string]: string[] } = {};
    const skipRegex = /Skip,LBL\[(\d*)\]/g;

    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    const fileDict = getFileDict();
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
export function extractSkipJumps(document: vscode.TextDocument, labels: string[]): { [label: string]: string[] } {
    const skipJumps: { [label: string]: string[] } = {};
    const skipJumpRegex = /SkipJump,LBL\[(\d*)\]/g;

    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    const fileDict = getFileDict();
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


// Extract Reg and I/O names from the document
export function extractItemNames(document: vscode.TextDocument): { [type: string]: { item: string, name: string, lines: number[] }[] } {
    const combinedRegex = /(DI|DO|GI|GO|RI|RO|UI|UO|SI|SO|SPI|SPO|SSI|SSO|CSI|CSO|SIR|CPC|CSC|JPC|JSC|NSI|AR|SR|GO|F|M|VR|(?<!P)R)\[\d*:.*?(?=\])\]/g;
    const nameRegex = /(?<=:)[^:\]]+(?=\])/;
    const groupedMatches: { [type: string]: { item: string, name: string, lines: number[] }[] } = {};
    const seenItems = new Set<string>();

    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i).text;
        const match = line.match(combinedRegex);
        if (match) {
            const item = match[0];
            const name = item.match(nameRegex)?.[0]?.trim() || '';
            const matchItem = item.match(/^[A-Z]+/);
            const type = matchItem ? matchItem[0] : '';
            if (!seenItems.has(item)) {
                if (!groupedMatches[type]) {
                    groupedMatches[type] = [];
                }
                groupedMatches[type].push({ item, name, lines: [i+1]  });
                seenItems.add(item);
            } else {
                const existingItem = groupedMatches[type].find(entry => entry.item === item);
                if (existingItem) {
                    existingItem.lines.push(i+1);
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
    const sortedGroupedMatches: { [type: string]: { item: string, name: string, lines: number[] }[] } = {};
    Object.keys(groupedMatches).sort().forEach(key => {
        sortedGroupedMatches[key] = groupedMatches[key];
    });

    return sortedGroupedMatches;
}
