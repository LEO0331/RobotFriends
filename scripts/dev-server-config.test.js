const assert = require('node:assert/strict');
const { test } = require('node:test');
const WebpackDevServer = require('webpack-dev-server');
const { validate } = require('schema-utils');
const adaptConfig = require('./dev-server-config');

test('CRA configuration is accepted by webpack-dev-server 5, with and without a proxy', () => {
  process.env.NODE_ENV = 'development';
  const createConfig = require('react-scripts/config/webpackDevServer.config');
  const { prepareProxy } = require('react-dev-utils/WebpackDevServerUtils');
  const paths = require('react-scripts/config/paths');
  for (const proxy of [undefined, prepareProxy('http://localhost:8787', paths.appPublic, paths.publicUrlOrPath)]) {
    const config = adaptConfig(createConfig(proxy, 'localhost'), paths.publicUrlOrPath);
    validate(WebpackDevServer.schema, config);
    assert.equal(config.server, 'http');
    assert.equal(config.proxy, proxy);
    assert.equal('https' in config, false);
    assert.equal('onBeforeSetupMiddleware' in config, false);
    assert.equal('onAfterSetupMiddleware' in config, false);
  }
});

test('source-map/custom proxy setup precedes built-ins; redirect and service worker follow them', () => {
  const events = [];
  const config = adaptConfig({
    https: false,
    onBeforeSetupMiddleware(server) { server.app.use('source-map/custom-proxy'); },
    onAfterSetupMiddleware() { throw new Error('Legacy after hook must not run'); },
  }, '/Gridline/');
  const builtIn = { name: 'built-in', middleware() {} };
  const middlewares = config.setupMiddlewares([builtIn], { app: { use(value) { events.push(value); } } });
  assert.deepEqual(events, ['source-map/custom-proxy']);
  assert.equal(middlewares[0], builtIn);
  assert.deepEqual(middlewares.slice(1).map(item => item.name), ['cra-redirect-served-path', 'cra-noop-service-worker']);
  const response = { redirect(url) { events.push(url); } };
  middlewares[1].middleware({ url: '/other', path: '/other' }, response, () => assert.fail('Expected homepage redirect'));
  assert.equal(events[1], '/Gridline/other');
});

test('HTTPS and custom certificate options use the v5 server setting', () => {
  for (const https of [true, { key: 'key', cert: 'cert' }]) {
    const config = adaptConfig({ https, onBeforeSetupMiddleware() {} }, '/');
    assert.deepEqual(config.server, { type: 'https', options: https === true ? {} : https });
    validate(WebpackDevServer.schema, config);
  }
});

test('loopback hosts without a LAN address retain webpack host checking', () => {
  process.env.NODE_ENV = 'development';
  const createConfig = require('react-scripts/config/webpackDevServer.config');
  const config = adaptConfig(createConfig([{ target: 'http://localhost:8787' }], undefined), '/');
  assert.equal(config.allowedHosts, 'auto');
  validate(WebpackDevServer.schema, config);
});
