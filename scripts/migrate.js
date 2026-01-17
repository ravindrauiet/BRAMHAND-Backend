const pool = require('../config/db');
const schemaSql = require('./schema');

async function migrate() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Connected to database. Starting migration...');

        const statements = schemaSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            // Basic check to ensure we don't run empty lines
            if (statement) {
                await connection.query(statement);
            }
        }

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        if (connection) connection.release();
        process.exit(0);
    }
}

migrate();
