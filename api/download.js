// api/download.js
// Vercel serverless function — streams files from GitHub with a random filename

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token || !isValidToken(token)) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  const repo = 'BaconHub1/exoai';
  const branch = 'main';

  const files = {
    'launcher': 'Launcher.exe',
  };

  const key = getFileKeyFromToken(token);
  const fileName = files[key];

  if (!fileName) {
    return res.status(404).json({ error: 'File not found' });
  }

  const rawUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${fileName}`;

  try {
    const upstream = await fetch(rawUrl);
    if (!upstream.ok) {
      return res.status(502).json({ error: 'Failed to fetch upstream file' });
    }

    const randomName = randomString(10) + getExtension(fileName);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${randomName}"`);
    res.setHeader('Cache-Control', 'no-store');

    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (err) {
    res.status(500).json({ error: 'Internal error', details: err.message });
  }
}

function randomString(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function getExtension(name) {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i) : '';
}

function isValidToken(token) {
  const parts = String(token).split('-');
  if (parts.length !== 3) return false;
  const ts = parseInt(parts[2], 10);
  if (!ts || isNaN(ts)) return false;
  const ageSeconds = (Date.now() / 1000) - ts;
  return ageSeconds < 3600;
}

function getFileKeyFromToken(token) {
  return String(token).split('-')[0];
}
