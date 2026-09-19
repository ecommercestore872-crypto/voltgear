import autocannon from 'autocannon';

async function runTest(url, title, c) {
  console.log(`\n\n--- ${title} Concurrency ${c} ---`);
  return new Promise((resolve) => {
    autocannon({
      url,
      connections: c,
      pipelining: 1,
      duration: 20,
    }, (err, res) => {
      if (err) {
        console.error(err);
      } else {
        console.log(`Req/s: ${res.requests.average}`);
        console.log(`p50: ${res.latency.p50}ms`);
        console.log(`p90: ${res.latency.p90}ms`);
        console.log(`p95: ${res.latency.p95}ms`);
        console.log(`p99: ${res.latency.p99}ms`);
        console.log(`2xx: ${res['2xx']}, 4xx: ${res['4xx']}, 5xx: ${res['5xx']}, timeouts: ${res.timeouts}`);
        console.log(`Error %: ${((res.timeouts + res['4xx'] + res['5xx']) / res.requests.total * 100).toFixed(2)}%`);
      }
      setTimeout(resolve, 5000); // cooldown to prevent immediate trigger
    });
  });
}

async function main() {
  await runTest('https://buyntryy.com/', 'HOMEPAGE', 5);
  await runTest('https://buyntryy.com/', 'HOMEPAGE', 10);
  await runTest('https://buyntryy.com/product/tws-m10', 'PDP', 5);
  await runTest('https://buyntryy.com/product/tws-m10', 'PDP', 10);
}
main();
