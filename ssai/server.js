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

// --- FAILOVER SOURCES ---
let sources = [];
let currentIndex = 0;

const getCurrentSource = () => sources[currentIndex] || null;

// --- SAFE STREAMLINK ---
const getLiveUrl = (providerUrl) => {
  return new Promise((resolve, reject) => {
    execFile('streamlink', ['--stream-url', providerUrl, 'best'], (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout.trim());
    });
  });
};

// --- VALIDATION ---
const isValidUrl = (url) => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

// --- FAILOVER CHECK ---
setInterval(async () => {
  if (!sources.length) return;

  try {
    await fetch(getCurrentSource());
  } catch {
    console.log("⚠️ Switching stream...");
    currentIndex = (currentIndex + 1) % sources.length;
  }
}, 5000);

// 1. Add stream source
app.get('/relay', async (req, res) => {
  const { url } = req.query;

  if (!isValidUrl(url)) {
    return res.status(400).send("Invalid URL");
  }

  try {
    const live = await getLiveUrl(url);
    sources.push(live);

    res.send({ status: "Added", total: sources.length });
  } catch {
    res.status(500).send("Streamlink failed");
  }
});

// 2. Upload ads (safe)
app.post('/upload', (req, res) => {
  const bb = busboy({ headers: req.headers });

  bb.on('file', (name, file, info) => {
    const safeName = path.basename(info.filename);
    file.pipe(fs.createWriteStream(path.join('/ads', safeName)));
  });

  bb.on('close', () => res.send("Upload complete"));
  req.pipe(bb);
});

// 3. SSAI playlist
app.get('/playlist.m3u8', async (req, res) => {
  try {
    const source = getCurrentSource();
    if (!source) return res.status(404).send("No stream");

    const live = await fetch(source).then(r => r.text());

    const ad = await fetchVastAd(
      chooseAdServer(getUserProfile(req))
    );

    let stitched = live;

    if (ad) {
      stitched = live.replace(
        '#EXTINF',
        `#EXTINF:5.0,\n${ad}\n#EXTINF`
      );
    }

    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(stitched);

  } catch (e) {
    console.error(e);
    res.status(500).send("Stream error");
  }
});

app.listen(4000, () => console.log("SSAI running"));
