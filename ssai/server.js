const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const busboy = require('busboy');
const schedule = require('node-schedule');

const { fetchVastAd } = require('./vast');
const { getUserProfile, chooseAdServer } = require('./targeting');
const { fireBeacon } = require('./tracker');

const app = express();
app.use(express.json());

let currentLiveSource = '/hls/live.m3u8'; // Default local source

// --- STREAMLINK RELAY LOGIC ---
const getLiveUrl = (providerUrl) => {
    return new Promise((resolve, reject) => {
        // --stream-url gets the direct HLS link without downloading video data
        exec(`streamlink --stream-url ${providerUrl} best`, (error, stdout) => {
            if (error) return reject(error);
            resolve(stdout.trim());
        });
    });
};

// --- ROUTES ---

// 1. Relay Twitch/Kick
app.get('/relay', async (req, res) => {
    const { url } = req.query;
    try {
        const directUrl = await getLiveUrl(url);
        currentLiveSource = directUrl;
        res.send({ status: "Relaying", source: url });
    } catch (e) {
        res.status(500).send("Failed to resolve stream.");
    }
});

// 2. Schedule a Stream
app.post('/schedule', (req, res) => {
    const { url, time } = req.body; // time: "2026-05-01T20:00:00"
    schedule.scheduleJob(new Date(time), async () => {
        try {
            currentLiveSource = await getLiveUrl(url);
            console.log(`Scheduled stream started: ${url}`);
        } catch (e) { console.error("Schedule failed", e); }
    });
    res.send({ status: "Scheduled", time });
});

// 3. High-Efficiency 2GB Upload (Busboy)
app.post('/upload', (req, res) => {
    const bb = busboy({ headers: req.headers, limits: { fileSize: 2 * 1024 * 1024 * 1024 } });
    bb.on('file', (name, file, info) => {
        const saveTo = path.join('/ads', info.filename);
        file.pipe(fs.createWriteStream(saveTo));
    });
    bb.on('close', () => res.send("Upload Complete"));
    req.pipe(bb);
});

// 4. The SSAI Stitcher
app.get('/playlist.m3u8', async (req, res) => {
    // This now reads from either local file or external relay URL
    // For external URLs, you'd typically fetch the manifest text via axios
    res.send("SSAI Logic Redirecting to: " + currentLiveSource);
});

app.listen(4000, () => console.log("Relay & SSAI Engine Running"));
