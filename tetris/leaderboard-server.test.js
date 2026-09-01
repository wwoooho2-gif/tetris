import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const server = spawn(process.execPath, ['server.js'], {
  cwd: new URL('.', import.meta.url).pathname.replace(/\/$/, ''),
  stdio: ['ignore', 'pipe', 'pipe']
});

let output = '';
server.stdout.on('data', (chunk) => { output += chunk.toString(); });
server.stderr.on('data', (chunk) => { output += chunk.toString(); });

try {
  await delay(500);
  const res = await fetch('http://localhost:3001/api/leaderboard');
  assert.equal(res.status, 200, 'leaderboard API should respond');

  const post = await fetch('http://localhost:3001/api/leaderboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test Player', score: 4321, lines: 40, level: 5 })
  });
  assert.equal(post.status, 200, 'leaderboard submit should succeed');

  const list = await fetch('http://localhost:3001/api/leaderboard');
  const json = await list.json();
  assert.ok(Array.isArray(json), 'leaderboard should return an array');
  assert.ok(json.some((entry) => entry.name === 'Test Player'), 'submitted score should be returned');
  console.log('server leaderboard tests passed');
} finally {
  server.kill('SIGTERM');
  await once(server, 'exit').catch(() => {});
}
