const http = require('http');
const https = require('https');

https.get('https://buyntryy.com/product/candac-6360-professional-tripod', (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', JSON.stringify(res.headers, null, 2));
}).on('error', (e) => {
  console.error(e);
});
