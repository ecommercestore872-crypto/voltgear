import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const literal = (value) => value === null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => value === null ? 'NULL::jsonb' : `${literal(JSON.stringify(value))}::jsonb`;
const doc = (ids = [], extra = {}) => ({ name: 'Synthetic collection', slug: `collection-${randomUUID()}`,
  description: null, mode: 'manual', autoRule: null, sortOrder: 0, active: true, homeSlot: null, productIds: ids, ...extra });
const command = (action, id, document, revision = null, slotRevision = null) =>
  `SELECT admin_write_collection_v1(${literal(action)},${literal(id)}::uuid,${json(document)},${literal(revision)}::bigint,${literal(slotRevision)}::bigint);`;

export async function runCollectionCases({ sql, openSession, sleep }) {
  const write = async (...args) => JSON.parse(await sql(command(...args)));
  const snapshot = async (id) => JSON.parse(await sql(`SELECT admin_collection_snapshot_v1(${literal(id)});`) || 'null');
  const product = async (id) => JSON.parse(await sql(`SELECT admin_product_editor_snapshot_v1(${literal(id)});`) || 'null');
  const failure = (statement, pattern = /40001[\s\S]*CONFLICT/) => assert.rejects(sql(statement), pattern);
  const test = async (name, run) => { await run(); console.log(`PASS: ${name}`); };
  async function seed() {
    const id = randomUUID(); const slug = `collection-product-${randomUUID()}`;
    await sql(`INSERT INTO products(id,name,slug,category,price,quantity,stock_status,status)
      VALUES(${literal(id)},'Synthetic',${literal(slug)},'synthetic',100,10,'in-stock','published');`);
    return { id, slug };
  }
  const publish = ({ id, slug }, membership, ids, admin = '0') => {
    const document = { name: 'Synthetic edited', slug, category: 'synthetic', price: 100, quantity: 10,
      stockStatus: 'in-stock', images: [], inventoryIntent: { mode: 'preserve' },
      collectionIntent: membership === undefined ? { mode: 'preserve' } : { mode: 'adjust', expectedRevision: membership } };
    return `SELECT admin_write_product_v2('publish',${literal(id)},${json(document)},${json(ids ?? null)},${literal(admin)});`;
  };
  async function waitForLock(name) {
    for (let attempt = 0; attempt < 60; attempt++) {
      if (await sql(`SELECT count(*) FROM pg_stat_activity WHERE application_name=${literal(name)} AND wait_event_type='Lock';`, 'postgres') === '1') return;
      await sleep(40);
    }
    assert.fail('Expected actual independent PostgreSQL lock wait');
  }
  async function overlap(firstSql, secondSql, reject = false) {
    const a = await openSession(`collection_first_${randomUUID()}`);
    const name = `collection_second_${randomUUID()}`; const b = await openSession(name);
    try {
      await a.query('BEGIN;'); await a.query(firstSql);
      const pending = b.query(secondSql); pending.catch(() => {});
      await waitForLock(name); await a.query('COMMIT;');
      if (reject) await assert.rejects(pending, /40001[\s\S]*CONFLICT/); else await pending;
    } finally { a.close(); b.close(); }
  }

  await test('collection create/update/reorder snapshots preserve order and exact version tokens', async () => {
    const a = await seed(); const b = await seed();
    const created = await write('create', null, doc([a.id, b.id]));
    const first = created.collection;
    assert.equal(created.previousSlug, null); assert.equal(created.revision, first.revision);
    assert.deepEqual(first.productIds, [a.id, b.id]);
    assert.equal((await product(a.id)).membership_revision, '1');
    const edited = await write('update', first.id, { ...doc([b.id, a.id]), slug: first.slug }, first.revision);
    assert.equal(edited.previousSlug, first.slug);
    assert.notEqual(edited.revision, first.revision);
    assert.deepEqual((await snapshot(first.id)).productIds, [b.id, a.id]);
    assert.equal((await product(a.id)).membership_revision, '1', 'reordering does not alter product set intent');
    assert.equal((await product(b.id)).membership_revision, '1');
    const before = await product(a.id);
    await write('update', first.id, { ...doc([b.id, a.id]), slug: first.slug, name: 'Metadata only' }, edited.revision);
    assert.equal((await product(a.id)).membership_revision, before.membership_revision);
    const list = JSON.parse(await sql('SELECT admin_collections_snapshot_v1();'));
    assert.deepEqual(list.find((entry) => entry.id === first.id), await snapshot(first.id));
  });

  await test('partial collection updates preserve omitted fields and automatic pinned order', async () => {
    const a = await seed(); const b = await seed();
    const c = (await write('create', null, { name: 'Synthetic defaults', mode: 'manual', productIds: [a.id,b.id] })).collection;
    assert.equal(c.slug,'synthetic-defaults'); assert.equal(c.active,true); assert.equal(c.sortOrder,0);
    const changed = (await write('update',c.id,{ name:'Only name changed' },c.revision)).collection;
    assert.equal(changed.slug,c.slug); assert.deepEqual(changed.productIds,[a.id,b.id]);
    const auto = (await write('update',c.id,{ mode:'auto',autoRule:'featured' },changed.revision)).collection;
    assert.deepEqual(auto.productIds,[a.id,b.id]);
    const revision = (await product(a.id)).membership_revision;
    await write('update',c.id,{ productIds:[b.id,a.id] },auto.revision);
    assert.equal((await product(a.id)).membership_revision,revision);
    await failure(command('update',c.id,{ name:null },(await snapshot(c.id)).revision),/Invalid collection fields/);
  });

  for (const adjust of [false, true]) {
    await test(`collection membership edit before product ${adjust ? 'adjust' : 'preserve'} publish uses shared product lock`, async () => {
      const p = await seed(); const created = await write('create', null, doc([p.id])); const c = created.collection;
      await overlap(command('update', c.id, { ...doc([]), slug: c.slug }, c.revision),
        publish(p, adjust ? '1' : undefined, adjust ? [c.id] : null), adjust);
      const after = await product(p.id);
      assert.deepEqual(after.manual_collection_ids, []);
      assert.equal(after.membership_revision, '2');
      assert.equal(after.admin_revision, adjust ? '0' : '1');
    });
  }

  await test('product publish before collection membership edit returns NOWAIT conflict without deadlock or lost set', async () => {
    const p = await seed(); const created = await write('create', null, doc([p.id])); const c = created.collection;
    const a = await openSession(`publisher_${randomUUID()}`);
    try {
      await a.query('BEGIN;'); await a.query(publish(p));
      await failure(command('update', c.id, { ...doc([]), slug: c.slug }, c.revision));
      await a.query('COMMIT;');
    } finally { a.close(); }
    assert.deepEqual((await snapshot(c.id)).productIds, [p.id]);
    await write('update', c.id, { ...doc([]), slug: c.slug }, c.revision);
    assert.deepEqual((await product(p.id)).manual_collection_ids, []);
  });

  await test('content-only publish does not wait for collection metadata row locks', async () => {
    const p = await seed(); const c = (await write('create', null, doc([p.id]))).collection;
    const a = await openSession(`metadata_${randomUUID()}`);
    try {
      await a.query('BEGIN;');
      await a.query(command('update', c.id, { ...doc([p.id]), slug: c.slug, name: 'Locked metadata' }, c.revision));
      await sql(publish(p));
      await a.query('COMMIT;');
    } finally { a.close(); }
    assert.deepEqual((await product(p.id)).manual_collection_ids, [c.id]);
  });

  for (const first of ['reorder','publish']) {
    await test(`actual reorder versus product membership publish: ${first} first`,async()=>{
      const a=await seed(); const b=await seed(); const c=await seed();
      const collection=(await write('create',null,doc([a.id,b.id,c.id]))).collection;
      const reordering=command('update',collection.id,{ productIds:[c.id,a.id,b.id] },collection.revision);
      const publishing=publish(b,'1',[]);
      if(first==='reorder') {
        await overlap(reordering,publishing);
        assert.deepEqual((await snapshot(collection.id)).productIds,[c.id,a.id]);
      } else {
        const session=await openSession(`reorder_publisher_${randomUUID()}`);
        try {
          await session.query('BEGIN;'); await session.query(publishing);
          await failure(reordering); await session.query('COMMIT;');
        } finally { session.close(); }
        assert.deepEqual((await snapshot(collection.id)).productIds,[a.id,c.id]);
      }
      assert.deepEqual((await product(b.id)).manual_collection_ids,[]);
      assert.equal((await product(b.id)).membership_revision,'2');
    });
  }

  for (const first of ['delete','publish']) {
    await test(`actual collection delete versus saved product intent publish: ${first} first`,async()=>{
      const p=await seed(); const c=(await write('create',null,doc([p.id]))).collection;
      const saved={ name:'Synthetic',slug:p.slug,category:'synthetic',price:100,
        inventoryIntent:{mode:'preserve'},collectionIntent:{mode:'adjust',expectedRevision:'1'} };
      await sql(`SELECT admin_write_product_v2('save',${literal(p.id)},${json(saved)},${json([c.id])},0);`);
      const publishing=publish(p,'1',[c.id],'1'); const deletion=command('delete',c.id,null,c.revision);
      if(first==='delete') {
        await overlap(deletion,publishing,true);
        assert.equal(await snapshot(c.id),null);
        assert.equal((await product(p.id)).draft.collectionIntent.expectedRevision,'1');
      } else {
        const session=await openSession(`deletion_publisher_${randomUUID()}`);
        try {
          await session.query('BEGIN;'); await session.query(publishing);
          await failure(deletion); await session.query('COMMIT;');
        } finally { session.close(); }
        assert.deepEqual((await snapshot(c.id)).productIds,[p.id]);
      }
    });
  }

  await test('same-collection concurrent metadata tabs reject stale revision after lock wait', async () => {
    const c = (await write('create', null, doc())).collection;
    await overlap(command('update', c.id, { ...doc(), slug: c.slug, name: 'Winning tab' }, c.revision),
      command('update', c.id, { ...doc(), slug: c.slug, name: 'Stale tab' }, c.revision), true);
    assert.equal((await snapshot(c.id)).name, 'Winning tab');
  });

  await test('membership ABA and legacy saved membership cannot silently overwrite fresh catalog sets', async () => {
    const p = await seed(); const c = (await write('create', null, doc([p.id]))).collection;
    let changed = await write('update', c.id, { ...doc(), slug: c.slug }, c.revision);
    changed = await write('update', c.id, { ...doc([p.id]), slug: c.slug }, changed.revision);
    assert.equal((await product(p.id)).membership_revision, '3');
    await failure(publish(p, '1', [c.id]));
    await sql(`UPDATE products SET draft='{"_collectionIds":[]}' WHERE id=${literal(p.id)};`);
    const legacy = { name: 'Synthetic', slug: p.slug, category: 'synthetic', price: 100 };
    await failure(`SELECT admin_write_product_v2('publish',${literal(p.id)},${json(legacy)},NULL,0);`);
    await sql(publish(p));
    assert.deepEqual((await product(p.id)).manual_collection_ids, [c.id]);
  });

  await test('manual/automatic mode transitions and delete bump membership without changing stock/admin versions', async () => {
    const p = await seed(); const c = (await write('create', null, doc([p.id]))).collection;
    const changed = await write('update', c.id, { ...doc(), slug: c.slug, mode: 'auto', autoRule: 'featured' }, c.revision);
    const after = await product(p.id);
    assert.equal(after.membership_revision, '2'); assert.equal(after.inventory_revision, '0'); assert.equal(after.admin_revision, '0');
    assert.deepEqual(after.manual_collection_ids, []);
    const manual = await write('update', c.id, { ...doc([p.id]), slug: c.slug }, changed.revision);
    const deleted = await write('delete', c.id, null, manual.revision);
    assert.equal(deleted.deleted, true); assert.equal(deleted.previousSlug, c.slug);
    assert.deepEqual((await product(p.id)).manual_collection_ids, []);
    assert.equal((await product(p.id)).membership_revision, '4');
  });

  await test('product deletion cascade invalidates collection snapshot revision', async () => {
    const p = await seed(); const c = (await write('create', null, doc([p.id]))).collection;
    await sql(`DELETE FROM products WHERE id=${literal(p.id)};`);
    const after = await snapshot(c.id);
    assert.notEqual(after.revision, c.revision); assert.deepEqual(after.productIds, []);
    await failure(command('delete', c.id, null, c.revision));
  });

  for (const first of ['delete','publish']) {
    await test(`product delete/publish reverse-child insertion uses sorted collection locks: ${first} first`,async()=>{
      const a=await seed(); const b=await seed();
      const c1=(await write('create',null,doc([a.id,b.id]))).collection;
      const c2=(await write('create',null,doc([a.id,b.id]))).collection;
      // Make the deleted product's physical child insertion order the reverse
      // of the UUID order used by the publisher; don't rely on random UUIDs.
      const reversed=[c1.id,c2.id].sort().reverse();
      await sql(`DELETE FROM collection_products WHERE product_id=${literal(a.id)};
        INSERT INTO collection_products(collection_id,product_id) VALUES
        (${literal(reversed[0])},${literal(a.id)}),(${literal(reversed[1])},${literal(a.id)});`);
      const deletion=`DELETE FROM products WHERE id=${literal(a.id)};`;
      const publishing=publish(b,(await product(b.id)).membership_revision,[c1.id,c2.id]);
      await overlap(first==='delete'?deletion:publishing,first==='delete'?publishing:deletion);
      assert.equal(await product(a.id),null);
      assert.deepEqual((await product(b.id)).manual_collection_ids,[c1.id,c2.id].sort());
      assert.equal((await product(b.id)).admin_revision,'1');
    });
  }

  await test('home slot claims are exclusive, versioned across release/claim ABA, and independently serialized', async () => {
    const before = JSON.parse(await sql(`SELECT jsonb_object_agg(slot,revision::text) FROM collection_home_slots;`));
    const a = (await write('create', null, doc([], { homeSlot: 'offers' }), null, before.offers)).collection;
    const current = a.slotRevisions.offers;
    await failure(command('create', null, doc([], { homeSlot: 'offers' }), null, current));
    const released = (await write('update', a.id, { ...doc(), slug: a.slug, homeSlot: 'offers', active: false }, a.revision)).collection;
    await failure(command('create', null, doc([], { homeSlot: 'offers' }), null, before.offers));
    await overlap(command('create', null, doc([], { homeSlot: 'offers' }), null, released.slotRevisions.offers),
      command('create', null, doc([], { homeSlot: 'offers' }), null, released.slotRevisions.offers), true);
    assert.equal(await sql("SELECT count(*) FROM collections WHERE active AND home_slot='offers';"), '1');
  });

  for (const operation of ['INSERT', 'DELETE']) {
    await test(`collection child ${operation.toLowerCase()} failure rolls back metadata, membership and all revisions`, async () => {
      const p = await seed(); const c = (await write('create', null, doc(operation === 'DELETE' ? [p.id] : []))).collection;
      const before = await product(p.id);
      await sql(`CREATE FUNCTION synthetic_collection_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_COLLECTION_FAILURE'; END; $$;
        CREATE TRIGGER synthetic_collection_failure BEFORE ${operation} ON collection_products FOR EACH ROW EXECUTE FUNCTION synthetic_collection_failure();`, 'postgres');
      try {
        await failure(command('update', c.id, { ...doc(operation === 'INSERT' ? [p.id] : []), slug: c.slug, name: 'Must roll back' }, c.revision), /SYNTHETIC_COLLECTION_FAILURE/);
        assert.deepEqual(await snapshot(c.id), c); assert.deepEqual(await product(p.id), before);
      } finally {
        await sql('DROP TRIGGER synthetic_collection_failure ON collection_products; DROP FUNCTION synthetic_collection_failure();', 'postgres');
      }
    });
  }

  for (const operation of ['INSERT','DELETE']) {
    await test(`product publish collection ${operation.toLowerCase()} failure rolls back catalog and membership atomically`, async () => {
      const p=await seed(); const c=(await write('create',null,doc(operation==='DELETE'?[p.id]:[]))).collection;
      const before=await product(p.id);
      await sql(`CREATE FUNCTION synthetic_product_collection_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_PRODUCT_COLLECTION_FAILURE'; END; $$;
        CREATE TRIGGER synthetic_product_collection_failure BEFORE ${operation} ON collection_products FOR EACH ROW EXECUTE FUNCTION synthetic_product_collection_failure();`,'postgres');
      try {
        await failure(publish(p,before.membership_revision,operation==='INSERT'?[c.id]:[]),/SYNTHETIC_PRODUCT_COLLECTION_FAILURE/);
        assert.deepEqual(await product(p.id),before); assert.deepEqual(await snapshot(c.id),c);
      } finally {
        await sql('DROP TRIGGER synthetic_product_collection_failure ON collection_products; DROP FUNCTION synthetic_product_collection_failure();','postgres');
      }
    });
  }

  await test('collection RPC and coherent snapshot functions are service-role-only and revision tampering is ignored', async () => {
    const p = await seed(); const c = (await write('create', null, doc([p.id]))).collection;
    await sql(`UPDATE products SET membership_revision=0 WHERE id=${literal(p.id)}; UPDATE collections SET revision=9999 WHERE id=${literal(c.id)};`);
    assert.equal((await product(p.id)).membership_revision, '1'); assert.equal((await snapshot(c.id)).revision, c.revision);
    const slots=(await snapshot(c.id)).slotRevisions;
    await sql('UPDATE collection_home_slots SET revision=0;');
    assert.deepEqual((await snapshot(c.id)).slotRevisions,slots);
    await assert.rejects(sql("DELETE FROM collection_home_slots WHERE slot='offers';"),/42501[\s\S]*permission denied/);
    for (const role of ['anon', 'authenticated']) {
      for (const statement of [command('create', null, doc()), `SELECT admin_collection_snapshot_v1(${literal(c.id)});`,
        'SELECT admin_collections_snapshot_v1();', `SELECT admin_product_editor_snapshot_v1(${literal(p.id)});`]) {
        await assert.rejects(sql(statement, role), /42501[\s\S]*permission denied/);
      }
    }
  });
}
