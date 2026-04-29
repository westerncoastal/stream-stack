const express = require('express');
const fs = require('fs');

const app = express();

// insert ad every N segments
const AD_INTERVAL = 5;

app.get('/playlist.m3u8', (req, res) => {
  let playlist = fs.readFileSync('/hls/live.m3u8', 'utf8');

  const lines = playlist.split('\n');
  let segmentCount = 0;
  let output = [];

  for (let line of lines) {
    output.push(line);

    if (line.endsWith('.ts')) {
      segmentCount++;

      if (segmentCount % AD_INTERVAL === 0) {
        output.push('#EXTINF:5.0,');
        output.push('/ad/ad1.ts');
      }
    }
  }

  res.set('Content-Type', 'application/vnd.apple.mpegurl');
  res.send(output.join('\n'));
});

app.use('/ad', express.static('/ads'));

app.listen(4000, () => console.log("SSAI mid-roll running"));
