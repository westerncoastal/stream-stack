const axios = require('axios');
const xml2js = require('xml2js');

async function fetchVastAd(vastUrl) {
  try {
    const res = await axios.get(vastUrl);
    const parsed = await xml2js.parseStringPromise(res.data);

    const media =
      parsed?.VAST?.Ad?.[0]?.InLine?.[0]?.Creatives?.[0]?.Creative?.[0]
        ?.Linear?.[0]?.MediaFiles?.[0]?.MediaFile?.[0]?._;

    return media || null;
  } catch (err) {
    console.error("VAST error:", err.message);
    return null;
  }
}

module.exports = { fetchVastAd };
