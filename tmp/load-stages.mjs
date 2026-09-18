import { execSync } from 'child_process';

const stages = [10, 25, 50];

for (const c of stages) {
  console.log(`\n\n--- Concurrency ${c} ---`);
  try {
    const output = execSync(`npx --yes autocannon@8.0.0 -c ${c} -d 30 https://buyntryy.com`, { stdio: 'pipe' }).toString();
    console.log(output);
  } catch (e) {
    if (e.stdout) console.log(e.stdout.toString());
    console.log(`Failed at ${c}: ${e.message}`);
    // break;
  }
}
