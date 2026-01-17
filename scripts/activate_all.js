const pool = require('../config/db');

async function activate() {
    try {
        console.log('Activating all videos...');
        await pool.query('UPDATE videos SET is_active = 1');
        console.log('All videos set to is_active = 1');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
activate();
