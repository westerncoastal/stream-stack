function getUserProfile(req) {
  return {
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  };
}

function chooseAdServer(user) {
  // simple logic (expand later)
  if (user.userAgent.includes("Mobile")) {
    return "https://example.com/mobile-vast.xml";
  }
  return "https://example.com/desktop-vast.xml";
}

module.exports = { getUserProfile, chooseAdServer };
