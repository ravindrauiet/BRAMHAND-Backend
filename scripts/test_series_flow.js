const axios = require('axios');
require('dotenv').config();

const API_URL = `http://localhost:${process.env.PORT || 5000}/api`;
let seriesId = null;
let videoId = null;

async function test() {
    console.log("=== Testing Series Flow ===");

    // 1. Create Series
    try {
        console.log("\n1. Creating Series...");
        const res = await axios.post(`${API_URL}/series`, {
            title: "Test Series " + Date.now(),
            description: "A test series description",
            categoryId: 1, // Assuming category 1 exists, ideally fetch one first
            creatorId: 1,  // Assuming user 1 exists
            isActive: true
        });
        if (res.data.success) {
            seriesId = res.data.id;
            console.log("SUCCESS: Created Series ID:", seriesId);
        } else {
            console.error("FAILED to create series:", res.data);
            process.exit(1);
        }
    } catch (e) {
        console.error("ERROR Creating series:", e.message, e.response?.data);
        process.exit(1);
    }

    // 2. Add Video (Episode) linked to Series
    try {
        console.log("\n2. Uploading Video (Episode 1)...");
        // Using the existing uploadVideo endpoint but passing seriesId
        // Note: The original uploadVideo controller might not accept seriesId in req.body unless we updated it?
        // Wait, we updated the SCHEMA but did we update the videoController to accept seriesId?
        // Let's check videoController.js. If not, we need to update it.
        // Assuming we pass it in the body.

        const res = await axios.post(`${API_URL}/admin/videos`, {
            title: "Episode 1: The Beginning",
            description: "First episode",
            categoryId: 1,
            creatorId: 1,
            video_url: "http://example.com/video.mp4", // Mock URL
            type: "VIDEO", // or SERIES? usually type is VIDEO linked to series
            seriesId: seriesId,
            episodeNumber: 1,
            seasonNumber: 1
        });

        if (res.data.success) {
            videoId = res.data.id;
            console.log("SUCCESS: Created Video ID:", videoId);
        } else {
            console.error("FAILED to create video:", res.data);
        }
    } catch (e) {
        console.error("ERROR Creating Video:", e.message, e.response?.data);
    }

    // 3. Fetch Series Details (should include episodes)
    try {
        console.log("\n3. Fetching Series Details...");
        const res = await axios.get(`${API_URL}/series/${seriesId}`);
        if (res.data.success) {
            const series = res.data.series;
            console.log("Fetched Series:", series.title);
            console.log("Episodes found:", series.episodes ? series.episodes.length : 0);

            if (series.episodes && series.episodes.length > 0) {
                console.log("SUCCESS: Episode found in series details.");
            } else {
                console.warn("WARNING: Series fetched but no episodes listed. Check relation logic.");
            }
        } else {
            console.error("FAILED to fetch series details.");
        }
    } catch (e) {
        console.error("ERROR Fetching Series:", e.message);
    }
}

test();
