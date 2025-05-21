import * as path from 'path';
import * as os from 'os';

export function isSafeDirectory(dir: string): boolean {
    const resolved = path.resolve(dir).toLowerCase();

    // List of forbidden roots (add more as needed)
    const forbiddenRoots = [
        path.resolve('C:\\Windows').toLowerCase(),
        path.resolve('C:\\Program Files').toLowerCase(),
        path.resolve('C:\\Program Files (x86)').toLowerCase(),
        path.resolve('C:\\Users\\Default').toLowerCase(),
        path.resolve('C:\\Users\\Public').toLowerCase(),
        path.resolve('C:\\$Recycle.Bin').toLowerCase(),
        path.resolve('C:\\System Volume Information').toLowerCase()
    ];

    // Block if the resolved path starts with any forbidden root
    for (const forbidden of forbiddenRoots) {
        if (resolved.startsWith(forbidden)) {
            return false;
        }
    }

    // Optionally, block root of C:\
    if (resolved === path.parse(resolved).root.toLowerCase()) {
        return false;
    }

    // Otherwise, allow
    return true;
}

export function isValidProfileName(name: string): boolean {
    // Disallow only characters not allowed in file/folder names
    return typeof name === 'string'
        && name.trim().length > 0
        && !/[\\/:*?"<>|]/.test(name);
}