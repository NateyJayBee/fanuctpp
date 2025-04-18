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
exports.extractNumberFromLabel = extractNumberFromLabel;
exports.extractLabels = extractLabels;
exports.extractJumps = extractJumps;
exports.extractSkips = extractSkips;
exports.extractSkipJumps = extractSkipJumps;
exports.extractItemNames = extractItemNames;
const path = __importStar(require("path"));
const state_1 = require("../state"); // Import the fileDict from state
// Extract number from label
function extractNumberFromLabel(label) {
    const match = label.match(/\[(\d+)(?::[^\]]+)?\]/);
    return match ? match[1] : '';
}
// Label extraction
function extractLabels(document) {
    const labelRegex = /^\s*(\d{1,4}:)\s*LBL\[\d+(?::[^\]]+)?\]/g;
    const labels = [];
    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    if (!(fileName in (0, state_1.getFileDict)())) {
        return ["No labels found"];
    }
    // Destructure with default values
    let [startLine, endLine] = (0, state_1.getFileDict)()[fileName] || [0, document.lineCount];
    for (let i = startLine; i < endLine + 1; i++) {
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
function extractJumps(document, labels) {
    const jumpRegex = /JMP\s*LBL\[(\d*)\]/g;
    const jumps = {};
    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    const fileDict = (0, state_1.getFileDict)();
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
function extractSkips(document, labels) {
    const skips = {};
    const skipRegex = /Skip,LBL\[(\d*)\]/g;
    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    const fileDict = (0, state_1.getFileDict)();
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
function extractSkipJumps(document, labels) {
    const skipJumps = {};
    const skipJumpRegex = /SkipJump,LBL\[(\d*)\]/g;
    // Get the file name of the document
    const fileName = path.basename(document.fileName);
    const fileDict = (0, state_1.getFileDict)();
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
function extractItemNames(document) {
    var _a, _b;
    const combinedRegex = /(DI|DO|GI|GO|RI|RO|UI|UO|SI|SO|SPI|SPO|SSI|SSO|CSI|CSO|SIR|CPC|CSC|JPC|JSC|NSI|AR|SR|GO|F|M|VR|(?<!P)R)\[\d*:.*?(?=\])\]/g;
    const nameRegex = /(?<=:)[^:\]]+(?=\])/;
    const groupedMatches = {};
    const seenItems = new Set();
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i).text;
        const match = line.match(combinedRegex);
        if (match) {
            const item = match[0];
            const name = ((_b = (_a = item.match(nameRegex)) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.trim()) || '';
            const matchItem = item.match(/^[A-Z]+/);
            const type = matchItem ? matchItem[0] : '';
            if (!seenItems.has(item)) {
                if (!groupedMatches[type]) {
                    groupedMatches[type] = [];
                }
                groupedMatches[type].push({ item, name, lines: [i + 1] });
                seenItems.add(item);
            }
            else {
                const existingItem = groupedMatches[type].find(entry => entry.item === item);
                if (existingItem) {
                    existingItem.lines.push(i + 1);
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
    const sortedGroupedMatches = {};
    Object.keys(groupedMatches).sort().forEach(key => {
        sortedGroupedMatches[key] = groupedMatches[key];
    });
    return sortedGroupedMatches;
}
//# sourceMappingURL=extractors.js.map