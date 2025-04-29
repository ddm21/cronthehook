const config = require('../lib/config');

/**
 * Middleware to check for valid X-API-KEY header
 */
function apiKeyAuth(req, res, next) {
  const apiKey = req.header('X-API-KEY');
  if (!apiKey || apiKey !== config.api.privateKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  next();
}

module.exports = apiKeyAuth; 