import * as vscode from 'vscode';
import * as path from 'path';

export class CallDefinitionProvider implements vscode.DefinitionProvider {
    async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Location | vscode.Location[] | null> {
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