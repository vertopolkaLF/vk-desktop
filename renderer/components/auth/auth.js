'use strict';

const querystring = require('querystring');

async function refreshToken(access_token) {
  let { token } = await vkapi('auth.refreshToken', {
    offToken: true,
    access_token: access_token,
    receipt: 'JSv5FBbXbY:APA91bF2K9B0eh61f2WaTZvm62GOHon3-vElmVq54ZOL5PHpFkIc85WQUxUH_wae8YEUKkEzLCcUC5V4bTWNNPbjTxgZRvQ-PLONDMZWo_6hwiqhlMM7gIZHM2K2KhvX-9oCcyD1ERw4'
  });

  return token;
}

function getFirstToken(login, password, params = {}) {
  return new Promise(async (resolve) => {
    let { data } = await request({
      host: 'oauth.vk.com',
      path: '/token?' + querystring.stringify({
        scope: 'all',
        client_id: 2274003,
        client_secret: 'hHbZxrka2uZ6jB1inYsH',
        username: login,
        password: password,
        '2fa_supported': 1,
        grant_type: 'password',
        lang: app.$store.state.langName,
        v: vkapi.version,
        ...params
      })
    });

    if(data.error) {
      if(data.error == 'invalid_client') resolve({ type: 'invalid_client' });
      else if(data.error == 'invalid_request') resolve({ type: 'invalid_code' });
      else if(data.error == 'need_validation') {
        resolve({
          type: 'need_validation',
          phone_mask: data.phone_mask,
          validation_type: data.validation_type
        });
      } else if(data.error == 'need_captcha') {
        app.$modals.open('captcha', {
          src: data.captcha_img,
          async send(code) {
            let res = await getFirstToken(login, password, Object.assign(params, {
              captcha_sid: data.captcha_sid,
              captcha_key: code
            }));

            resolve(res);
          }
        });
      }
    } else resolve({ token: data.access_token });
  });
}

async function getLastToken(firstToken) {
  let authLink = 'https://oauth.vk.com/authorize?' + querystring.stringify({
    redirect_uri: "https://oauth.vk.com/blank.html",
    display: 'page',
    response_type: 'token',
    access_token: firstToken,
    revoke: 1,
    lang: app.$store.state.langName,
    scope: 136297695,
    client_id: 6717234,
    sdk_package: 'com.danyadev.vkdesktop',
    sdk_fingerprint: 'A6SF876A8SF7A78G58ADHG89AGAG9'
  });

  let { data: site } = await request(authLink),
      link = 'https://oauth.vk.com' + site.match(/\/auth_by_token?.+=\w+/)[0],
      { headers: { location } } = await request(link),
      lastToken = location.match(/#access_token=([A-z0-9]{85})/)[1];

  return lastToken;
}

async function getSupportToken(VKToken) {
  let authLink = 'https://oauth.vk.com/authorize?' + querystring.stringify({
    redirect_uri: "https://oauth.vk.com/blank.html",
    display: 'page',
    response_type: 'token',
    access_token: VKToken,
    source_url: 'https://static.vk.com/support/#/support',
    revoke: 1,
    lang: app.$store.state.langName,
    scope: 'support,offline',
    client_id: 6126832
  });

  let { headers: { location: link } } = await request(authLink),
      { headers: { location } } = await request('https://oauth.vk.com' + link),
      supportToken = location.match(/#access_token=([A-z0-9]{85})/)[1];

  return supportToken;
}

module.exports = {
  refreshToken,
  getFirstToken,
  getLastToken,
  getSupportToken
}
