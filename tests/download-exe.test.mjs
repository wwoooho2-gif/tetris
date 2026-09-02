import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pkgPath = new URL('../tetris/package.json', import.meta.url);
const mainPath = new URL('../tetris/electron-main.cjs', import.meta.url);

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const main = fs.readFileSync(mainPath, 'utf8');

test('build script is configured for a Windows EXE export', () => {
  assert.ok(pkg.scripts && pkg.scripts.dist, 'missing dist script');
  assert.match(pkg.scripts.dist, /electron-builder/i, 'dist script is not wired to electron-builder');
  assert.ok(pkg.devDependencies && pkg.devDependencies['electron-builder'], 'electron-builder is not installed');
});

test('electron main exposes an EXE download handler', () => {
  assert.match(main, /download-current-exe|download-exe/i, 'download handler missing from electron main process');
});
