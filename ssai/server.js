const express = require('express');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const busboy = require('busboy');

const { fetchVastAd } = require('./vast');
const { getUserProfile, chooseAdServer } = require('./targeting');

const app = express();
app.use(express.json());

/**
 * -------------------------
 * STREAM FAILOVER SYSTEM
 * -------------------------
 */
let sources = []; // { url, failCount }
let currentIndex = 0;

const getCurrentSource = () => sources[currentIndex]?.url || null;

/**
 * SAFE STREAMLINK EXECUTION
 */
const getLiveUrl = (providerUrl) => {
  return new Promise((resolve, reject) => {
    execFile(
      'streamlink',
      ['--stream-url', providerUrl, 'best'],
      (err, stdout) => {
        if (err) return reject(err);
        resolve(stdout.trim());
      }
    );
  });
};

/**
 * VALIDATE URL
 */
const isValidUrl = (url) => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

/**
 * FAILOVER MONITOR
 */
setInterval(async () => {
  if (!sources.length) return;

  const source = sources[currentIndex];

  try {
    await fetch(source.url);
    source.failCount = 0; // reset on success
  } catch {
    console.log("⚠️ Stream failed:", source.url);

    source.failCount++;

    if (source.failCount > 3) {
      console.log("🔁 Switching stream...");

      currentIndex = (currentIndex + 1) % sources.length;
    }
  }
}, 5000);

/**
 * ADD STREAM SOURCE
 */
app.get('/relay', async (req, res) => {
  const { url } = req.query;

  if (!isValidUrl(url)) {
    return res.status(400).send("Invalid URL");
  }

  try {
    const live = await getLiveUrl(url);

    sources.push({
      url: live,
      failCount: 0
    });

    res.send({
      status: "Added",
      total: sources.length
    });
  } catch {
    res.status(500).send("Streamlink failed");
  }
});

/**
 * SAFE UPLOAD
 */
app.post('/upload', (req, res) => {
  const bb = busboy({ headers: req.headers });

  bb.on('file', (name, file, info) => {
    const safeName = path.basename(info.filename);
    const savePath = path.join('/ads', safeName);

    file.pipe(fs.createWriteStream(savePath));
  });

  bb.on('close', () => res.send("Upload complete"));

  req.pipe(bb);
});

/**
 * -------------------------
 * SSAI PLAYLIST (FIXED)
 * -------------------------
 */
app.get('/playlist.m3u8', async (req, res) => {
  try {
    const source = getCurrentSource();
    if (!source) return res.status(404).send("No stream");

    const live = await fetch(source).then(r => r.text());
    const lines = live.split('\n');

    const ad = await fetchVastAd(
      chooseAdServer(getUserProfile(req))
    );

    let output = [];
    let segmentCount = 0;

    for (const line of lines) {
      output.push(line);

      if (line.startsWith('#EXTINF')) {
        segmentCount++;

        // inject ad every 5 segments
        if (segmentCount % 5 === 0 && ad) {
          output.push('#EXTINF:5.0,');
          output.push(ad);
        }
      }
    }

    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(output.join('\n'));

  } catch (err) {
    console.error(err);
    res.status(500).send("Stream error");
  }
});

app.listen(4000, () => console.log("SSAI running"));
