const http = require('http');
const fs = require('fs');

const logFile = 'test_results.txt';

function log(message) {
    fs.appendFileSync(logFile, message + '\n');
}

fs.writeFileSync(logFile, 'Starting tests...\n');

function check(path) {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:3000${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                log(`GET ${path}: Status ${res.statusCode}`);
                if (res.statusCode === 200) {
                    resolve();
                } else {
                    log('Response: ' + data.substring(0, 200));
                    reject(new Error(`Status ${res.statusCode}`));
                }
            });
        }).on('error', err => {
            log(`Error: ${err.message}`);
            reject(err);
        });
    });
}

async function run() {
    try {
        log('Testing /api/videos/trending...');
        await check('/api/videos/trending');

        log('Testing /videos/trending...');
        await check('/videos/trending');

        log('All tests passed!');
    } catch (err) {
        log(`Test failed: ${err.message}`);
    }
}

setTimeout(run, 5000); // Wait 5s for server startup
