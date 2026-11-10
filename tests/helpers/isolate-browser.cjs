'use strict';
// Only the tested origin may receive browser traffic. No test can reach a real
// Firebase project, even on CI runners with unrestricted outbound networking.
module.exports = async function isolateBrowser(context, target) {
  const origin = new URL(target).origin;
  await context.route('**/*', async route => {
    const request = new URL(route.request().url());
    if (request.origin !== origin) return route.abort('blockedbyclient');
    if (request.pathname.endsWith('/firebase-config.js'))
      return route.fulfill({status:200,contentType:'text/javascript; charset=utf-8',body:'globalThis.STELLAR_FIREBASE_CONFIG = Object.freeze({});'});
    return route.continue();
  });
};
