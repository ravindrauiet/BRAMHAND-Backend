require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'debug_output.txt');

function log(msg) {
    fs.appendFileSync(logFile, msg + '\n');
}

async function testCreatorsQuery() {
    try {
        log("Starting debug script at " + new Date().toISOString());
        log("DB_HOST: " + process.env.DB_HOST);

        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        log("Pool created. Executing query...");
        const [creators] = await pool.query(`
            SELECT c.id, CAST(c.total_earnings AS CHAR) as totalEarnings, c.is_monetization_enabled as isMonetizationEnabled, 
                   c.created_at as createdAt,
                   u.full_name as fullName, u.email, u.profile_image as profileImage, u.is_verified as isVerified
            FROM creator_profiles c
            JOIN users u ON c.user_id = u.id
            ORDER BY c.created_at DESC
        `);
        log("Success! Found " + creators.length + " creators.");
        log("First creator sample: " + JSON.stringify(creators[0] || {}, null, 2));
    } catch (error) {
        log("Query Failed!");
        log(error.toString());
        log(error.stack);
    }
    process.exit();
}

testCreatorsQuery();
