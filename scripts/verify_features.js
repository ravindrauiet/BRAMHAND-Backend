const fs = require('fs');
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const LOG_FILE = 'verification_logs.txt';

function log(msg) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

const run = async () => {
    fs.writeFileSync(LOG_FILE, ''); // Clear file
    try {
        log('--- START VERIFICATION ---');

        // 1. Register User A
        log('\n1. Register User A...');
        const userA = {
            mobile_or_email: 'usera@example.com',
            full_name: 'User A',
            password: 'password123'
        };
        // Expect fail if exists, so try login if fail
        let tokenA, idA;
        try {
            const regA = await axios.post(`${API_URL}/auth/register`, userA);
            tokenA = regA.data.token;
            idA = regA.data.user.id;
            log('User A Registered');
        } catch (e) {
            log('User A likely exists, logging in...');
            try {
                const loginA = await axios.post(`${API_URL}/auth/login`, { mobile_or_email: userA.mobile_or_email, password: userA.password });
                tokenA = loginA.data.token;
                idA = loginA.data.user.id;
            } catch (loginErr) {
                log('Login A Failed: ' + loginErr.message);
                process.exit(1);
            }
        }

        // 2. Register User B
        log('\n2. Register User B...');
        const userB = {
            mobile_or_email: 'userb@example.com',
            full_name: 'User B',
            password: 'password123'
        };
        let tokenB, idB;
        try {
            const regB = await axios.post(`${API_URL}/auth/register`, userB);
            tokenB = regB.data.token;
            idB = regB.data.user.id;
            log('User B Registered');
        } catch (e) {
            log('User B likely exists, logging in...');
            try {
                const loginB = await axios.post(`${API_URL}/auth/login`, { mobile_or_email: userB.mobile_or_email, password: userB.password });
                tokenB = loginB.data.token;
                idB = loginB.data.user.id;
            } catch (loginErr) {
                log('Login B Failed: ' + loginErr.message);
                process.exit(1);
            }
        }

        const authA = { headers: { Authorization: `Bearer ${tokenA}` } };
        const authB = { headers: { Authorization: `Bearer ${tokenB}` } };

        // 3. User A Follows User B
        log('\n3. User A Follows User B...');
        try {
            await axios.post(`${API_URL}/user/${idB}/follow`, {}, authA);
            log('Follow Success');
        } catch (e) {
            log('Follow Failed (maybe already following): ' + e.response?.data?.error);
        }

        // 4. Verify Followers
        log('\n4. Verify User B Followers...');
        const followersB = await axios.get(`${API_URL}/user/${idB}/followers`);
        const isFollowing = followersB.data.followers.some(f => f.id === idA);
        log('User A is in User B followers: ' + isFollowing);

        // 5. User A Comments on a Video (Assuming video ID 1 exists)
        log('\n5. User A Comments on Video 1...');
        try {
            await axios.post(`${API_URL}/comments/1`, { text: 'Great video!' }, authA);
            log('Comment Success');
        } catch (e) {
            log('Comment Failed: ' + (e.response?.data?.error || e.message));
        }

        // 6. Get Comments
        log('\n6. Get Comments for Video 1...');
        try {
            const comments = await axios.get(`${API_URL}/comments/1`);
            log('Comments count: ' + comments.data.comments.length);
            log('Last comment: ' + comments.data.comments[0]?.text);
        } catch (e) {
            log('Get Comments Failed: ' + e.message);
        }

        // 7. Watch History (View Video 1 as User A)
        log('\n7. User A Views Video 1...');
        await axios.post(`${API_URL}/videos/1/view`, {}, authA);
        log('View Recorded');

        // 8. Music: Create Playlist
        log('\n8. User A Creates Playlist...');
        try {
            const playlist = await axios.post(`${API_URL}/music/playlists`, { name: 'My Top Hits', is_public: true }, authA);
            log('Playlist Created ID: ' + playlist.data.id);
        } catch (e) {
            log('Create Playlist Failed: ' + (e.response?.data?.error || e.message));
        }

        log('\n--- VERIFICATION COMPLETE ---');

    } catch (error) {
        log('CRITICAL ERROR: ' + (error.response?.data || error.message));
        process.exit(1);
    }
};

run();
