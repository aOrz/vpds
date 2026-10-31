const localHosts = ['localhost', '127.0.0.1', '[::1]'];

function requestGuard(ctx, next) {
  // Check Host even for static content: a rebinding origin must never load this
  // application and then execute API requests with a same-origin Origin header.
  const host = ctx.get('host');
  if (!localHosts.some(function (name) { return host === name + ':3000'; })) {
    ctx.throw(403, 'Untrusted Host');
  }
  if (/^\/api(?:\/|$)/i.test(ctx.path)) {
    // A custom header cannot be sent by cross-site images, links or forms,
    // including legacy browsers without Origin/Fetch Metadata on GETs.
    // No CORS middleware is enabled, so foreign scripts cannot preflight it.
    if (/^\/api\/(module|page)\/(install|copy|create|publish|build|dev)(?:\/|$)/i.test(ctx.path) &&
        ctx.get('x-vpds-request') !== '1') {
      ctx.throw(403, 'X-VPDS-Request: 1 is required');
    }
    const origin = ctx.get('origin');
    const fetchSite = ctx.get('sec-fetch-site');
    if ((origin && origin !== 'http://' + host) ||
        (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none')) {
      ctx.throw(403, 'Cross-origin API requests are not permitted');
    }
  }
  return next();
}

function listenHost(value) {
  const host = value || '127.0.0.1';
  if (['127.0.0.1', '::1', 'localhost'].indexOf(host) === -1) {
    throw new Error('VPDS_HOST must be a loopback address; remote access is not supported');
  }
  return host;
}

module.exports = {requestGuard, listenHost};
