// ssai/targeting.js
function getUserProfile(req) {
  return {
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  };
}

function chooseAdServer(user) {
  // Use the SERVER_IP injected by the cloud-init script
  const ip = process.env.SERVER_IP || 'localhost';
  
  // zones=1 is the default for your first Revive video zone
  const vastUrl = `http://${ip}:8081/www/delivery/fc.php?script=bannerTypeHtml:vastInlineHtml&zones=1`;

  // Basic logic: you can append targeting parameters to the VAST URL
  if (user.userAgent.includes("Mobile")) {
    return `${vastUrl}&ct0=mobile`;
  }

  return vastUrl;
}

module.exports = { getUserProfile, chooseAdServer };
