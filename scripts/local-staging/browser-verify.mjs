import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadLocalRuntime, stagingDirectory } from './runtime.mjs';

const runtime = await loadLocalRuntime();
const productId = process.argv[2];
assert.match(productId ?? '', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, 'Provide the synthetic browser-created product UUID');
const row = JSON.parse(runtime.sql(`SELECT row_to_json(p) FROM (
  SELECT id,slug,status,price,quantity,cost_price FROM public.products
  WHERE id='${productId}'::uuid) p;`));
assert.ok(row.slug.startsWith('browser-isolated-acceptance-'));
assert.equal(row.status, 'published');
assert.equal(row.price, 1999);
assert.equal(row.quantity, 5);
assert.equal(row.cost_price, 300);
await writeFile(join(stagingDirectory, 'browser-persistence.json'), JSON.stringify({ product: row,
  verified: 'Actual database state after browser create/save/reload/publish. Native upload NOT accepted.' }, null, 2));
console.log(JSON.stringify({ browserPersistence: 'passed', storefrontUrl: `http://127.0.0.1:3300/product/${row.slug}` }));
