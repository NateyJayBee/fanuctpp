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
exports.CallDefinitionProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class CallDefinitionProvider {
    provideDefinition(document, position, token) {
        return __awaiter(this, void 0, void 0, function* () {
            const range = document.getWordRangeAtPosition(position, /\bCALL\s+(\w+)|\bRUN\s+(\w+)/);
            if (range) {
                const word = document.getText(range);
                const programNameMatch = word.match(/\bCALL\s+(\w+)|\bRUN\s+(\w+)/);
                if (programNameMatch) {
                    const programName = programNameMatch[1] || programNameMatch[2];
                    const currentDir = path.dirname(document.uri.fsPath);
                    const programFilePath = path.join(currentDir, `${programName}.ls`);
                    const programFileUri = vscode.Uri.file(programFilePath);
                    try {
                        const doc = yield vscode.workspace.openTextDocument(programFileUri);
                        return new vscode.Location(programFileUri, new vscode.Position(0, 0));
                    }
                    catch (error) {
                        vscode.window.showErrorMessage(`Cannot open file: ${programFilePath}`);
                    }
                }
            }
            return null;
        });
    }
}
exports.CallDefinitionProvider = CallDefinitionProvider;
/*
// Definition provider for CALL and RUN statements
// TODO srch direcotory for MACRO.DG and interpret fanuc macros
class CallDefinitionProvider implements vscode.DefinitionProvider {
    async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Location | vscode.Location[] | null> {
        const range = document.getWordRangeAtPosition(position, /\bCALL\s+(\w+)|\bRUN\s+(\w+)/);
        if (range) {
            const word = document.getText(range);
            const programNameMatch = word.match(/\bCALL\s+(\w+)|\bRUN\s+(\w+)/);
            if (programNameMatch) {
                const programName = programNameMatch[1] || programNameMatch[2];
                const currentDir = path.dirname(document.uri.fsPath);
                const programFilePath = path.join(currentDir, `${programName}.ls`);
                const programFileUri = vscode.Uri.file(programFilePath);

                try {
                    const doc = await vscode.workspace.openTextDocument(programFileUri);
                    return new vscode.Location(programFileUri, new vscode.Position(0, 0));
                } catch (error) {
                    vscode.window.showErrorMessage(`Cannot open file: ${programFilePath}`);
                }
            }
        }
        return null;
    }
}
*/ 
//# sourceMappingURL=openProgramCommands.js.map