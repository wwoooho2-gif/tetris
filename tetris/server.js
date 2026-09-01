import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'leaderboard-data.json');
const PORT = Number(process.env.PORT || 3001);

async function ensureDataFile() {
  if (!existsSync(DATA_FILE)) {
    await writeFile(DATA_FILE, '[]', 'utf8');
  }
}

async function readEntries() {
  await ensureDataFile();
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeEntries(entries) {
  await ensureDataFile();
  await writeFile(DATA_FILE, JSON.stringify(entries), 'utf8');
}

function normalizeName(value) {
  return String(value || 'PLAYER').trim().replace(/\s+/g, ' ').slice(0, 12) || 'PLAYER';
}

function calculateStats(entries) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const totalRuns = safeEntries.length;
  const bestScore = safeEntries.reduce((max, entry) => Math.max(max, Number(entry.score) || 0), 0);
  const avgScore = totalRuns ? Math.round(safeEntries.reduce((sum, entry) => sum + (Number(entry.score) || 0), 0) / totalRuns) : 0;
  const totalLines = safeEntries.reduce((sum, entry) => sum + (Number(entry.lines) || 0), 0);
  const highestLevel = safeEntries.reduce((max, entry) => Math.max(max, Number(entry.level) || 1), 1);
  const tetrises = Math.max(0, Math.floor(totalLines / 4));
  return {
    totalRuns,
    bestScore,
    avgScore,
    totalLines,
    highestLevel,
    tetrises,
    topScore: bestScore,
    lastUpdated: new Date().toISOString()
  };
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  try {
    if (req.url === '/api/leaderboard' && req.method === 'GET') {
      const entries = (await readEntries()).sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
      sendJson(res, 200, entries.slice(0, 10));
      return;
    }

    if (req.url === '/api/leaderboard/stats' && req.method === 'GET') {
      const entries = (await readEntries()).sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
      sendJson(res, 200, calculateStats(entries));
      return;
    }

    if (req.url === '/api/leaderboard' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', async () => {
        try {
          const data = body ? JSON.parse(body) : {};

          if (Array.isArray(data.entries)) {
            const next = data.entries
              .filter(Boolean)
              .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
              .slice(0, 10);
            await writeEntries(next);
            sendJson(res, 200, next);
            return;
          }

          const entry = {
            id: Date.now() + Math.random().toString(16).slice(2),
            name: normalizeName(data.name),
            score: Number(data.score) || 0,
            lines: Number(data.lines) || 0,
            level: Number(data.level) || 1,
            date: new Date().toISOString()
          };

          const next = [...(await readEntries()), entry]
            .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
            .slice(0, 10);

          await writeEntries(next);
          sendJson(res, 200, next);
        } catch {
          sendJson(res, 400, { error: 'invalid payload' });
        }
      });
      return;
    }

    if (req.url === '/api/leaderboard' && req.method === 'DELETE') {
      await writeEntries([]);
      sendJson(res, 200, []);
      return;
    }

    const safeUrl = req.url === '/' ? '/index.html' : req.url;
    const filePath = path.join(__dirname, safeUrl.split('?')[0]);

    if (filePath.startsWith(__dirname) && existsSync(filePath) && !filePath.includes('..')) {
      const content = await readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const types = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
      };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      res.end(content);
      return;
    }

    sendJson(res, 404, { error: 'not found' });
  } catch {
    sendJson(res, 500, { error: 'server error' });
  }
});

server.listen(PORT, () => {
  console.log(`Leaderboard server running on http://localhost:${PORT}`);
});
