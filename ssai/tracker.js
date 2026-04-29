const axios = require('axios');

async function fireBeacon(url) {
  try {
    await axios.get(url);
  } catch (e) {
    console.log("Beacon failed:", url);
  }
}

module.exports = { fireBeacon };
