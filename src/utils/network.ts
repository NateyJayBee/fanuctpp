import { exec } from 'child_process';

export function validateIP(ip: string): Promise<boolean> {
    return new Promise((resolve) => {
        exec(`ping -n 1 ${ip}`, (error) => {
            resolve(!error); // If no error, the IP is reachable
        });
    });
}

export function startBackup(profiles: { directory: string; robots: { name: string; ip: string; isConnected: boolean }[] }[]) {
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