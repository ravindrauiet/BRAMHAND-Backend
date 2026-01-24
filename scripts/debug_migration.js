const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '..', 'migration_debug.log');
const command = 'npx prisma db push';

console.log(`Running: ${command}`);
fs.writeFileSync(logFile, `Starting ${command}\n---\n`);

exec(command, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error: ${error.message}`);
        fs.appendFileSync(logFile, `ERROR CODE: ${error.code}\nOS ERROR: ${error.message}\n`);
    }
    if (stderr) {
        console.log(`Stderr: ${stderr}`);
        fs.appendFileSync(logFile, `STDERR:\n${stderr}\n`);
    }
    if (stdout) {
        console.log(`Stdout: ${stdout}`);
        fs.appendFileSync(logFile, `STDOUT:\n${stdout}\n`);
    }
    console.log('Done. Check migration_debug.log');
});
