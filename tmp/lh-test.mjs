// This script will run later
import { exec } from 'child_process';
import fs from 'fs';

const url = "https://buyntryy.com/?utm_source=tiktok&utm_medium=paid&utm_campaign=qa_mobile_tiktok";
console.log('Running Lighthouse on:', url);
exec(`npx lighthouse "${url}" --emulated-form-factor=mobile --chrome-flags="--headless" --output=json --output-path=tmp/lh.json --only-categories=performance`, (error, stdout, stderr) => {
  if (error) { console.error('Lighthouse error:', error); return; }
  const data = JSON.parse(fs.readFileSync('tmp/lh.json', 'utf8'));
  const audits = data.audits;
  console.log('--- METRICS ---');
  console.log('FCP:', audits['first-contentful-paint'].displayValue);
  console.log('LCP:', audits['largest-contentful-paint'].displayValue);
  console.log('CLS:', audits['cumulative-layout-shift'].displayValue);
  console.log('TBT:', audits['total-blocking-time'].displayValue);
  console.log('Speed Index:', audits['speed-index'].displayValue);
  
  if (audits['largest-contentful-paint-element'] && audits['largest-contentful-paint-element'].details) {
    console.log('\n--- LCP ELEMENT ---');
    console.log(audits['largest-contentful-paint-element'].details.items[0]);
  }
  
  if (audits['network-requests'] && audits['network-requests'].details) {
    console.log('\n--- TOP 10 RESOURCES ---');
    const sorted = audits['network-requests'].details.items
      .sort((a,b) => b.transferSize - a.transferSize)
      .slice(0,10);
    sorted.forEach((r, i) => console.log(`${i+1}. [${r.resourceType}] ${r.url} - ${(r.transferSize/1024).toFixed(1)} KB`));
  }
});
