const pool = require('../config/db');

async function migrate() {
    try {
        console.log('Migrating v4: Adding cast and crew columns...');
        const connection = await pool.getConnection();

        // Check if columns exist
        const [columns] = await connection.query(`SHOW COLUMNS FROM videos LIKE 'cast'`);
        if (columns.length === 0) {
            await connection.query(`
                ALTER TABLE videos
                ADD COLUMN cast JSON NULL,
                ADD COLUMN crew JSON NULL
            `);
            console.log('Added cast and crew columns.');
        } else {
            console.log('Columns already exist.');
        }

        connection.release();
        console.log('Migration v4 completed.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
