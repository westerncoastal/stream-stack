const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const busboy = require('busboy');
const schedule = require('node-schedule');

const { fetchVastAd } = require('./vast');
const { getUserProfile, chooseAdServer } = require('./targeting');

const app = express();
app.use(express.json());

let currentLiveSource = '/hls/live.m3u8'; 

// --- STREAMLINK HELPER ---
const getLiveUrl = (providerUrl) => {
    return new Promise((resolve, reject) => {
        exec(`streamlink --stream-url ${providerUrl} best`, (error, stdout) => {
            if (error) return reject(error);
            resolve(stdout.trim());
        });
    });
};

// 1. Relay Trigger (Twitch/Kick)
app.get('/relay', async (req, res) => {
    const { url } = req.query;
    try {
        currentLiveSource = await getLiveUrl(url);
        res.send({ status: "Relaying", source: url });
    } catch (e) {
        res.status(500).send("Streamlink failed to resolve URL");
    }
});

// 2. Scheduler
app.post('/schedule', (req, res) => {
    const { url, time } = req.body; 
    schedule.scheduleJob(new Date(time), async () => {
        try {
            currentLiveSource = await getLiveUrl(url);
            console.log(`Job Started: ${url}`);
        } catch (e) { console.error("Schedule Error", e); }
    });
    res.send({ status: "Event Scheduled", time });
});

// 3. 2GB Stream-to-Disk Upload
app.post('/upload', (req, res) => {
    const bb = busboy({ headers: req.headers, limits: { fileSize: 2 * 1024 * 1024 * 1024 } });
    bb.on('file', (name, file, info) => {
        file.pipe(fs.createWriteStream(path.join('/ads', info.filename)));
    });
    bb.on('close', () => res.send("Upload Finished"));
    req.pipe(bb);
});

// 4. Manifest Stitcher
app.get('/playlist.m3u8', async (req, res) => {
    // In a production scenario, you would fetch and parse the 'currentLiveSource' manifest here
    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(`#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1280000\n${currentLiveSource}`);
});

app.listen(4000, () => console.log("SSAI & Relay Engine Active"));
