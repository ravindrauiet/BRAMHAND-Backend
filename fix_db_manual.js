const mysql = require('mysql2/promise');
require('dotenv').config();

async function fix() {
    try {
        console.log("Connecting to DB:", process.env.DATABASE_URL.replace(/:[^:@]*@/, ':****@')); // Hide password in logs
        const connection = await mysql.createConnection(process.env.DATABASE_URL);

        console.log("Checking video_views table...");
        const [rows] = await connection.execute("SHOW COLUMNS FROM video_views");
        const columns = rows.map(r => r.Field);
        console.log("Current columns:", columns);

        if (!columns.includes('ip_address')) {
            console.log("Adding ip_address column...");
            await connection.execute("ALTER TABLE video_views ADD COLUMN ip_address VARCHAR(191)");
            console.log("Column ip_address added successfully.");
        } else {
            console.log("ip_address column already exists.");
        }

        if (!columns.includes('device')) {
            console.log("Adding device column...");
            await connection.execute("ALTER TABLE video_views ADD COLUMN device VARCHAR(191)");
            console.log("Column device added successfully.");
        }

        // Also check for user_id to be nullable if schema says so (it was Int?)
        // In schema: userId Int? @map("user_id")
        const userIdCol = rows.find(r => r.Field === 'user_id');
        if (userIdCol && userIdCol.Null === 'NO') {
            console.log("Modifying user_id to be nullable...");
            await connection.execute("ALTER TABLE video_views MODIFY COLUMN user_id INT NULL");
            console.log("user_id modified to be nullable.");
        }

        await connection.end();
    } catch (e) {
        console.error("Error executing URL fix:", e);
    }
}
fix();
