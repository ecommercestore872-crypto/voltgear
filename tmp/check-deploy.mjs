fetch('https://buyntryy.com/_next/static/chunks/app/checkout/page-c0e2735297785d31.js').then(r => r.text()).then(t => console.log(t.includes("Couldn't place order") ? 'FOUND' : 'NOT FOUND'))
