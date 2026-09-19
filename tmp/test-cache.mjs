import http from 'http';

function doRequest(options, body) {
  return new Promise((resolve) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ code: res.statusCode, data }));
    });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function getTitle(html) {
  const match = html.match(/<title[^>]*>(.*?)<\/title>/);
  return match ? match[1] : null;
}

async function run() {
  const baseUrl = 'http://localhost:3000';
  const cookie = 'vg_admin=vg_PLvuGw3mTW-pC0NvpI8401dVEcTNsPjP';

  console.log('1. Fetching homepage to warm cache');
  let res = await doRequest(baseUrl);
  let oldTitle = getTitle(res.data);
  console.log('Old title:', oldTitle);

  console.log('\n2. Changing settings via Admin Mutation');
  const getSettings = await doRequest({
    hostname: 'localhost', port: 3000, path: '/api/admin/settings',
    headers: { 'Cookie': cookie }
  });
  let settingsBody = JSON.parse(getSettings.data).settings;
  const originalBrand = settingsBody.draft?.brandName || settingsBody.brandName;
  
  settingsBody.brandName = 'TEST XYZ';
  
  const patchRes = await doRequest({
    method: 'PATCH', hostname: 'localhost', port: 3000, path: '/api/admin/settings',
    headers: { 'Cookie': cookie, 'Content-Type': 'application/json' }
  }, { action: 'publish', doc: { ...settingsBody } });
  
  console.log('Mutation Status:', patchRes.code);

  console.log('\n3. Immediately Fetching Homepage Again');
  res = await doRequest(baseUrl);
  let hasNewText = res.data.includes('TEST XYZ');
  console.log('Includes TEST XYZ?', hasNewText);

  console.log('\n4. Restoring original settings');
  settingsBody.brandName = originalBrand;
  await doRequest({
    method: 'PATCH', hostname: 'localhost', port: 3000, path: '/api/admin/settings',
    headers: { 'Cookie': cookie, 'Content-Type': 'application/json' }
  }, { action: 'publish', doc: { ...settingsBody } });
}
run();
