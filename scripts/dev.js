#!/usr/bin/env node
const { spawn } = require('child_process');

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];
let shuttingDown = false;

function start(label, args) {
  const child = spawn(npm, args, { stdio: 'inherit', env: process.env });
  children.push(child);
  child.on('exit', code => {
    if (shuttingDown) return;
    if (code && code !== 0) {
      console.error(`[gridline-dev] ${label} exited with code ${code}.`);
      shutdown(code);
    }
  });
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 150).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('[gridline-dev] Starting research API on :8787 and React UI on :3000.');
console.log('[gridline-dev] Press Ctrl+C to stop both processes.');
start('api', ['run', 'api']);
start('ui', ['start']);
