import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadLocalRuntime, stagingDirectory } from './runtime.mjs';
const id = process.argv[2]; assert.match(id ?? '', /^[0-9a-f-]{36}$/);
const runtime = await loadLocalRuntime();
const state = JSON.parse(runtime.sql(`SELECT json_build_object('id',id,'slug',slug,'name',name,'status',status,
  'price',price,'cost',cost_price,'quantity',quantity,'draftPrice',draft->'price','draftCost',draft->'costPrice',
  'draftQuantity',draft->'quantity','adminRevision',admin_revision)
  FROM products WHERE id='${id}' AND slug LIKE 'browser-isolated-%';`));
assert.ok(state, 'Synthetic browser fixture only');
await writeFile(join(stagingDirectory, 'browser-final-state.json'), JSON.stringify(state, null, 2));
console.log(JSON.stringify(state));
