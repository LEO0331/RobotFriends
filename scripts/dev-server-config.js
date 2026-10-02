const redirectServedPath = require('react-dev-utils/redirectServedPathMiddleware');
const noopServiceWorkerMiddleware = require('react-dev-utils/noopServiceWorkerMiddleware');

// Keep CRA's proxy, static files and client settings while migrating its v4 hooks.
module.exports = function adaptDevServerConfig(config, publicUrlOrPath) {
  const {
    https,
    onBeforeSetupMiddleware,
    proxy,
    ...options
  } = config;
  delete options.onAfterSetupMiddleware;

  // CRA cannot derive a LAN hostname when HOST is a loopback address.
  if (Array.isArray(options.allowedHosts)) {
    const hosts = options.allowedHosts.filter(Boolean);
    options.allowedHosts = hosts.length ? hosts : 'auto';
  }

  return {
    ...options,
    server: https
      ? { type: 'https', options: https === true ? {} : https }
      : 'http',
    ...(proxy ? { proxy } : {}),
    setupMiddlewares(middlewares, devServer) {
      // CRA also loads src/setupProxy.js here, before the built-in middleware.
      onBeforeSetupMiddleware(devServer);
      middlewares.push(
        {
          name: 'cra-redirect-served-path',
          middleware: redirectServedPath(publicUrlOrPath),
        },
        {
          name: 'cra-noop-service-worker',
          middleware: noopServiceWorkerMiddleware(publicUrlOrPath),
        }
      );
      return middlewares;
    },
  };
};
