"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateIP = validateIP;
exports.startBackup = startBackup;
const child_process_1 = require("child_process");
function validateIP(ip) {
    return new Promise((resolve) => {
        (0, child_process_1.exec)(`ping -n 1 ${ip}`, (error) => {
            resolve(!error); // If no error, the IP is reachable
        });
    });
}
function startBackup(profiles) {
    const dateTime = new Date().toISOString().replace(/[:.]/g, '-');
    profiles.forEach((profile) => {
        const backupDir = `${profile.directory}/${dateTime}`;
        profile.robots.forEach((robot) => {
            if (robot.isConnected) {
                console.log(`Backing up ${robot.name} (${robot.ip}) to ${backupDir}`);
                // Implement FTP logic here
            }
        });
    });
}
//# sourceMappingURL=network.js.map