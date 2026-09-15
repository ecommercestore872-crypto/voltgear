const https = require('https');

https.get('https://buyntryy.com/', (res) => {
  let chunks = '';
  res.on('data', (chunk) => {
    chunks += chunk;
  });
  res.on('end', () => {
    console.log("Total bytes:", chunks.length);
    const split = chunks.split('CANDC DC');
    if (split.length > 1) {
      console.log('SURROUNDING HTML:', split[0].slice(-200) + 'CANDC DC' + split[1].substring(0, 200));
    } else {
      console.log('Not found');
    }
  });
});
