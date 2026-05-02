const express = require('express');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const busboy = require('busboy');
const schedule = require('node-schedule');

const { fetchVastAd } = require('./vast');
const { getUserProfile, chooseAdServer } = require('./targeting');

const app = express();
app.use(express.json());

let currentLiveSource = '/hls/live.m3u8';

// --- SAFE STREAMLINK EXECUTION (FIXED COMMAND INJECTION) ---
const getLiveUrl = (providerUrl) => {
    return new Promise((resolve, reject) => {
        execFile('streamlink', ['--stream-url', providerUrl, 'best'], (error, stdout) => {
            if (error) return reject(error);
            resolve(stdout.trim());
        });
    });
};

// --- INPUT VALIDATION ---
const isValidUrl = (url) => {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
};

// 1. Relay Trigger
app.get('/relay', async (req, res) => {
    const { url } = req.query;

    if (!isValidUrl(url)) {
        return res.status(400).send("Invalid URL");
    }

    try {
        currentLiveSource = await getLiveUrl(url);
        res.send({ status: "Relaying", source: url });
    } catch (e) {
        res.status(500).send("Streamlink failed");
    }
});

// 2. Scheduler
app.post('/schedule', (req, res) => {
    const { url, time } = req.body;

    if (!isValidUrl(url)) {
        return res.status(400).send("Invalid URL");
    }

    schedule.scheduleJob(new Date(time), async () => {
        try {
            currentLiveSource = await getLiveUrl(url);
            console.log(`Job Started: ${url}`);
        } catch (e) {
            console.error("Schedule Error", e);
        }
    });

    res.send({ status: "Event Scheduled", time });
});

// 3. SAFE FILE UPLOAD (FIXED PATH TRAVERSAL)
app.post('/upload', (req, res) => {
    const bb = busboy({
        headers: req.headers,
        limits: { fileSize: 2 * 1024 * 1024 * 1024 }
    });

    bb.on('file', (name, file, info) => {
        const safeName = path.basename(info.filename);
        const savePath = path.join('/ads', safeName);

        const writeStream = fs.createWriteStream(savePath);
        file.pipe(writeStream);
    });

    bb.on('close', () => res.send("Upload Finished"));

    req.pipe(bb);
});

// 4. Manifest Stitcher
app.get('/playlist.m3u8', async (req, res) => {
    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(`#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1280000\n${currentLiveSource}`);
});

app.listen(4000, () => console.log("SSAI & Relay Engine Active"));
