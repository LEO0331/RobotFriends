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
const reviewFile = path.resolve(__dirname, '..', 'public', 'data', 'event-review.json');
let reviewValid = true;
if (fs.existsSync(reviewFile)) {
  try {
    const review = JSON.parse(fs.readFileSync(reviewFile, 'utf8'));
    const records = review.observations || [];
    reviewValid = Number.isFinite(Date.parse(review.checkedAt)) && /^\d{4}-\d{2}-\d{2}$/.test(review.coverageThrough) &&
      review.sourceHealth?.events?.checkedAt === review.checkedAt && review.sourceHealth.events.recordCount === records.length && records.every(item => {
        try { return item.source === 'events' && item.type === 'infrastructureEvent' && item.id && item.value?.publishedAt <= `${review.coverageThrough}T23:59:59Z` &&
          Number.isFinite(Date.parse(`${item.value?.dateText} UTC`)) && new Date(`${item.value.dateText} UTC`).toISOString().slice(0, 10) === item.value.publishedAt.slice(0, 10) &&
          new URL(item.value?.url).protocol === 'https:'; }
        catch { return false; }
      });
  } catch { reviewValid = false; }
}
const mark = item => item.ok ? 'PASS' : item.severity === 'warning' ? 'WARN' : 'FAIL';
console.log(`Gridline demo readiness: ${result.status.toUpperCase()}`);
for (const item of result.checks) {
  const detail = item.detail ? ` ${JSON.stringify(item.detail)}` : '';
  console.log(`${mark(item).padEnd(4)}  ${item.id.padEnd(28)} ${item.message}${detail}`);
}
console.log(`\nBlockers: ${result.blockerCount} | Warnings: ${result.warningCount}`);
console.log(`${reviewValid ? 'PASS' : 'FAIL'}  dated-event-review             Manual event review has dated scope and HTTPS primary URLs.`);
if (!result.ready || !reviewValid) process.exit(1);
