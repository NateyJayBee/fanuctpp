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
exports.isSafeDirectory = isSafeDirectory;
exports.isValidProfileName = isValidProfileName;
const path = __importStar(require("path"));
function isSafeDirectory(dir) {
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
function isValidProfileName(name) {
    // Disallow only characters not allowed in file/folder names
    return typeof name === 'string'
        && name.trim().length > 0
        && !/[\\/:*?"<>|]/.test(name);
}
//# sourceMappingURL=files.js.map