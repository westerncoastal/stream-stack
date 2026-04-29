const express = require('express');
const fs = require('fs');

const { fetchVastAd } = require('./vast');
const { getUserProfile, chooseAdServer } = require('./targeting');
const { fireBeacon } = require('./tracker');

const app = express();

const AD_INTERVAL = 5;

app.get('/playlist.m3u8', async (req, res) => {
  let playlist = fs.readFileSync('/hls/live.m3u8', 'utf8');

  const user = getUserProfile(req);
  const vastUrl = chooseAdServer(user);

  const adUrl = await fetchVastAd(vastUrl);

  const lines = playlist.split('\n');
  let segmentCount = 0;
  let output = [];

  for (let line of lines) {
    output.push(line);

    if (line.endsWith('.ts')) {
      segmentCount++;

      if (segmentCount % AD_INTERVAL === 0 && adUrl) {
        output.push('#EXTINF:5.0,');
        output.push(adUrl);

        // fire impression beacon (example)
        fireBeacon("https://tracker.example.com/impression");
      }
    }
  }

  res.set('Content-Type', 'application/vnd.apple.mpegurl');
  res.send(output.join('\n'));
});

app.use('/ad', express.static('/ads'));

app.listen(4000, () => console.log("Advanced SSAI running"));
