// CRA 5 still uses webpack-dev-server v4 configuration and shutdown APIs.
// Adapt only its development entry point; build and test retain CRA's defaults.
process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';
require('react-scripts/config/env');

const adaptDevServerConfig = require('./dev-server-config');
const paths = require('react-scripts/config/paths');
const configPath = require.resolve('react-scripts/config/webpackDevServer.config');
const createConfig = require(configPath);
require.cache[configPath].exports = (...args) =>
  adaptDevServerConfig(createConfig(...args), paths.publicUrlOrPath);

const WebpackDevServer = require('webpack-dev-server');
WebpackDevServer.prototype.close = WebpackDevServer.prototype.stopCallback;

require('react-scripts/scripts/start');
