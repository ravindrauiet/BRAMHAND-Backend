const http = require('http');
const fs = require('fs');

function get(path) {
    return new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:3000/api${path}`, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        req.on('error', (e) => {
            console.error(`Request to ${path} failed:`, e.message);
            resolve({ status: 0, data: null });
        });
        req.end();
    });
}

async function test() {
    let log = 'Testing API Endpoints...\n';

    // 1. Songs (Trending)
    const songs = await get('/music/songs?is_trending=true');
    log += `Songs (Trending): Status ${songs.status}, Count: ${songs.data && songs.data.songs ? songs.data.songs.length : 'N/A'}\n`;
    if (songs.data && songs.data.songs && songs.data.songs.length > 0) {
        log += `  Sample: ${songs.data.songs[0].title}\n`;
    } else if (songs.data) {
        log += `  Response: ${JSON.stringify(songs.data).substring(0, 100)}\n`;
    }

    // 2. Playlists
    const playlists = await get('/music/playlists');
    log += `Playlists: Status ${playlists.status}, Count: ${playlists.data && playlists.data.playlists ? playlists.data.playlists.length : 'N/A'}\n`;

    // 3. Genres
    const genres = await get('/music/genres');
    log += `Genres: Status ${genres.status}, Count: ${genres.data && genres.data.genres ? genres.data.genres.length : 'N/A'}\n`;

    // 4. Creators
    const creators = await get('/creator/top');
    log += `Top Creators: Status ${creators.status}, Count: ${creators.data && creators.data.creators ? creators.data.creators.length : 'N/A'}\n`;

    fs.writeFileSync('api_test_log.txt', log);
    console.log(log);
}

test();
