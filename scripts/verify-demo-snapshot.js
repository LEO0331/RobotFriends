#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { evaluateDemoReadiness } = require('../server/demo-readiness');

const target = process.argv[2] || path.resolve(__dirname, '..', 'public', 'data', 'dashboard-snapshot.json');
let snapshot;
try {
  snapshot = JSON.parse(fs.readFileSync(target, 'utf8'));
} catch (error) {
  console.error(`Demo readiness: unable to read ${target}: ${error.message}`);
  process.exit(1);
}

const result = evaluateDemoReadiness(snapshot);
const mark = item => item.ok ? 'PASS' : item.severity === 'warning' ? 'WARN' : 'FAIL';
console.log(`Gridline demo readiness: ${result.status.toUpperCase()}`);
for (const item of result.checks) {
  const detail = item.detail ? ` ${JSON.stringify(item.detail)}` : '';
  console.log(`${mark(item).padEnd(4)}  ${item.id.padEnd(28)} ${item.message}${detail}`);
}
console.log(`\nBlockers: ${result.blockerCount} | Warnings: ${result.warningCount}`);
if (!result.ready) process.exit(1);
