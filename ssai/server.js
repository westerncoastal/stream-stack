const express = require('express');
const fs = require('fs');

const app = express();

app.get('/playlist.m3u8', (req, res) => {
  let stream = fs.readFileSync('/hls/live.m3u8', 'utf8');

  // inject ad at start
  const ad = "#EXTINF:5.0,\n/ad/ad1.ts\n";

  const modified = stream.replace("#EXTM3U", "#EXTM3U\n" + ad);

  res.set('Content-Type', 'application/vnd.apple.mpegurl');
  res.send(modified);
});

app.use('/ad', express.static('/ads'));

app.listen(4000, () => console.log("SSAI running"));
