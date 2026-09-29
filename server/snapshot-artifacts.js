const { isDeepStrictEqual } = require('node:util');
const { buildRuntimeSnapshot } = require('./runtime-snapshot');

function runtimeSnapshotMatches(full, runtime) {
  return isDeepStrictEqual(runtime, buildRuntimeSnapshot(full));
}

module.exports = { runtimeSnapshotMatches };
