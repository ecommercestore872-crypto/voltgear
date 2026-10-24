import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const literal = (value) => value === null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => value === null ? 'NULL::jsonb' : `${literal(JSON.stringify(value))}::jsonb`;
const document = (slug, extra = {}) => ({ name: `Synthetic ${slug}`, slug, category: 'synthetic',
  price: 100, images: [], quantity: extra.inventoryIntent?.mode === 'adjust' ? extra.inventoryIntent.quantity : 999,
  stockStatus: extra.inventoryIntent?.mode === 'adjust' ? extra.inventoryIntent.stockStatus : 'in-stock',
  inventoryIntent: { mode: 'preserve' }, ...extra });
const write = (action, id, doc, collections = null, expected = '0') =>
  `SELECT public.admin_write_product_v2(${literal(action)}, ${literal(id)}::uuid, ${json(doc)}, ${json(collections)}, ${literal(expected)}::bigint);`;
const checkout = (slug, orderId, quantity = 1, variantKey) => `SELECT public.checkout_place_order(
  ${literal(orderId)}, '{"email":"synthetic@example.invalid"}', 'cod', 100, 0, 100, 0, NULL, false,
  ${json([{ slug, name: 'Synthetic fixture', price: 100, quantity, lineTotal: quantity * 100,
    ...(variantKey ? { variantKey } : {}) }])}, NULL, NULL);`;

export async function runCases({ sql, openSession, sleep }) {
  const row = async (id) => JSON.parse(await sql(`SELECT row_to_json(p) FROM products p WHERE id=${literal(id)}::uuid;`));
  async function seed(extra = {}) {
    const id = randomUUID();
    const slug = `synthetic-${randomUUID()}`;
    await sql(`INSERT INTO products(id,name,slug,category,price,quantity,stock_status,status,cost_price,is_demo)
      VALUES (${literal(id)}, 'Synthetic fixture', ${literal(slug)}, 'synthetic', 100, 10, 'in-stock', 'published', 20, false);`);
    if (Object.keys(extra).length) {
      const parts = Object.entries(extra).map(([key, value]) => `${key}=${typeof value === 'number' ? value : literal(value)}`);
      await sql(`UPDATE products SET ${parts.join(',')} WHERE id=${literal(id)};`);
    }
    return { id, slug };
  }
  const result = async (...args) => JSON.parse(await sql(write(...args)));
  async function expectFailure(statement, pattern, role) {
    await assert.rejects(sql(statement, role), pattern);
  }
  async function test(name, run) {
    await run();
    console.log(`PASS: ${name}`);
  }
  async function waitForLock(applicationName) {
    for (let attempt = 0; attempt < 50; attempt++) {
      const waiting = await sql(`SELECT count(*) FROM pg_stat_activity WHERE application_name=${literal(applicationName)} AND wait_event_type='Lock';`, 'postgres');
      if (waiting === '1') return;
      await sleep(50);
    }
    assert.fail(`Expected independent RPC connection ${applicationName} to block on a database lock`);
  }
  async function overlap(firstStatement, secondStatement, { firstRole = 'service_role', secondRole = 'service_role', secondFailure } = {}) {
    const first = await openSession(`first_${randomUUID()}`, firstRole);
    const secondName = `second_${randomUUID()}`;
    const second = await openSession(secondName, secondRole);
    try {
      await first.query('BEGIN;');
      await first.query(firstStatement);
      const pending = second.query(secondStatement);
      pending.catch(() => {});
      await waitForLock(secondName);
      await first.query('COMMIT;');
      if (secondFailure) await assert.rejects(pending, secondFailure);
      else await pending;
    } finally {
      first.close();
      second.close();
    }
  }

  const manual = randomUUID();
  const manual2 = randomUUID();
  const automatic = randomUUID();
  await sql(`INSERT INTO collections(id,name,slug,mode) VALUES
    (${literal(manual)}, 'Synthetic manual', 'synthetic-manual', 'manual'),
    (${literal(manual2)}, 'Synthetic manual 2', 'synthetic-manual-2', 'manual'),
    (${literal(automatic)}, 'Synthetic auto', 'synthetic-auto', 'auto');`);

  await test('legacy create keeps supplied initial inventory as draft adjustment intent', async () => {
    const slug = `initial-${randomUUID()}`;
    const draft = document(slug, { quantity: 8 });
    delete draft.inventoryIntent;
    const created = await result('create', null, draft, null, null);
    assert.equal(created.quantity, null);
    const saved = (await row(created.id)).draft;
    assert.deepEqual(saved.inventoryIntent, { mode: 'adjust', expectedRevision: '0', quantity: 8, stockStatus: 'in-stock' });
    const published = await result('publish', created.id, saved, null, '0');
    assert.equal(published.quantity, 8);
  });

  await test('create and draft save isolate cost/demo/inventory/membership until atomic publish', async () => {
    const slug = `create-${randomUUID()}`;
    const draft = document(slug, { costPrice: 42, isDemo: true, quantity: 7,
      inventoryIntent: { mode: 'adjust', expectedRevision: '0', quantity: 7, stockStatus: 'in-stock' },
      reviews: [{ name: 'Injected', rating: 5 }], rating: 5, reviewCount: 99 });
    const created = await result('create', null, draft, [manual], null);
    assert.equal(created.admin_revision, '0');
    assert.equal(created.inventory_revision, '0');
    assert.equal(created.quantity, null);
    assert.equal(created.stock_status, 'in-stock');
    const first = await row(created.id);
    assert.equal(first.cost_price, null);
    assert.equal(first.is_demo, false);
    assert.equal(first.status, 'draft');
    assert.equal(first.draft.reviews, undefined);
    assert.equal(first.draft.rating, undefined);
    assert.equal(first.draft.reviewCount, undefined);
    assert.deepEqual(first.draft._collectionIds, [manual]);
    assert.equal(await sql(`SELECT count(*) FROM collection_products WHERE product_id=${literal(created.id)};`), '0');
    const saved = await result('save', created.id, { ...draft, _collectionIds: [automatic] }, null, '0');
    assert.equal(saved.admin_revision, '1');
    assert.equal((await row(created.id)).draft.inventoryIntent.expectedRevision, '0');
    const published = await result('publish', created.id, (await row(created.id)).draft, null, '1');
    assert.equal(published.admin_revision, '2');
    assert.equal(published.inventory_revision, '1');
    assert.equal(published.quantity, 7);
    const live = await row(created.id);
    assert.equal(live.cost_price, 42);
    assert.equal(live.is_demo, true);
    assert.equal(live.draft, null);
    assert.equal(live.status, 'published');
    assert.equal(await sql(`SELECT collection_id FROM collection_products WHERE product_id=${literal(created.id)};`), manual);
  });

  await test('save/discard/unpublish preserve live inventory and separate draft membership', async () => {
    const { id, slug } = await seed();
    await sql(`INSERT INTO collection_products(collection_id,product_id) VALUES (${literal(manual)},${literal(id)}),(${literal(automatic)},${literal(id)});`);
    const doc = document(slug, { costPrice: 99, isDemo: true });
    await result('save', id, doc, [manual2], '0');
    let live = await row(id);
    assert.equal(live.cost_price, 20);
    assert.equal(live.is_demo, false);
    assert.equal(live.status, 'published');
    assert.equal(live.quantity, 10);
    assert.equal(live.inventory_revision, 0);
    const changed = await result('unpublish', id, null, null, '1');
    assert.equal(changed.admin_revision, '2');
    assert.deepEqual((await row(id)).draft._collectionIds, [manual2]);
    await result('discard', id, null, null, '2');
    live = await row(id);
    assert.equal(live.status, 'unpublished');
    assert.equal(live.draft, null);
    assert.equal(live.admin_revision, 3);
    assert.equal(await sql(`SELECT count(*) FROM collection_products WHERE product_id=${literal(id)};`), '2');
    await result('publish', id, doc, [manual2], '3');
    assert.equal(await sql(`SELECT count(*) FROM collection_products WHERE product_id=${literal(id)} AND collection_id IN (${literal(manual2)},${literal(automatic)});`), '2');
  });

  for (const variant of [false, true]) {
    for (const firstCommand of ['checkout', 'publish']) {
      await test(`${variant ? 'variant' : 'plain'} actual checkout/content publish lock ordering: ${firstCommand} first`, async () => {
        const { id, slug } = await seed();
        if (variant) await sql(`INSERT INTO product_variants(product_id,key,name,stock_status) VALUES (${literal(id)}, 'legacy', 'Legacy', 'low-stock');`);
        const variantId = variant ? await sql(`SELECT id FROM product_variants WHERE product_id=${literal(id)};`) : null;
        const doc = document(slug, { variants: variant ? [{ _key: 'legacy', name: 'Renamed legacy', stockStatus: 'in-stock' }] : [] });
        const publishSql = write('publish', id, doc);
        const checkoutSql = checkout(slug, `order-${randomUUID()}`, 1, variant ? 'legacy' : undefined);
        const first = await openSession(`first_${randomUUID()}`);
        const secondName = `second_${randomUUID()}`;
        const second = await openSession(secondName);
        let pending;
        try {
          await first.query('BEGIN;');
          await first.query(firstCommand === 'checkout' ? checkoutSql : publishSql);
          pending = second.query(firstCommand === 'checkout' ? publishSql : checkoutSql);
          // Attach a handler immediately so an unexpected early failure is not
          // reported as an unhandled promise while waiting for the lock probe.
          pending.catch(() => {});
          await waitForLock(secondName);
          await first.query('COMMIT;');
          await pending;
        } finally {
          first.close();
          second.close();
        }
        const live = await row(id);
        assert.equal(live.quantity, 9);
        assert.equal(live.inventory_revision, 1);
        assert.equal(live.admin_revision, 1);
        if (variant) {
          assert.equal(await sql(`SELECT stock_status FROM product_variants WHERE product_id=${literal(id)};`), 'low-stock');
          assert.equal(await sql(`SELECT id FROM product_variants WHERE product_id=${literal(id)};`), variantId);
        }
      });
    }
  }

  await test('actual checkout/cancel ABA makes saved adjustment stale across save and reload', async () => {
    const { id, slug } = await seed();
    const doc = document(slug, { inventoryIntent: { mode: 'adjust', expectedRevision: '0', quantity: 50, stockStatus: 'in-stock' } });
    await result('save', id, doc);
    const orderId = `aba-${randomUUID()}`;
    await sql(checkout(slug, orderId, 2));
    await sql(`SELECT cancel_order_restore_inventory(${literal(orderId)}, 'Synthetic cancellation');`);
    const afterCancel = await row(id);
    assert.equal(afterCancel.quantity, 10);
    assert.ok(afterCancel.inventory_revision >= 2);
    const saved = await result('save', id, doc, null, '1');
    assert.equal(saved.inventory_revision, String(afterCancel.inventory_revision));
    const reloaded = (await row(id)).draft;
    assert.equal(reloaded.inventoryIntent.expectedRevision, '0');
    await expectFailure(write('publish', id, reloaded, null, '2'), /40001[\s\S]*CONFLICT: Inventory/);
    assert.deepEqual((await row(id)).draft.inventoryIntent, doc.inventoryIntent);
    await expectFailure(write('publish', id, document(`rename-${randomUUID()}`), null, '2'), /Cannot rename slug referenced by an order/);
    await expectFailure(write('discard', id, null, null, '1'), /40001[\s\S]*CONFLICT: Product/);
  });

  for (const firstCommand of ['cancel', 'publish']) {
    await test(`actual cancellation/content publish lock ordering: ${firstCommand} first`, async () => {
      const { id, slug } = await seed();
      const orderId = `cancel-race-${randomUUID()}`;
      await sql(checkout(slug, orderId, 2));
      const cancelSql = `SELECT cancel_order_restore_inventory(${literal(orderId)}, 'Synthetic concurrent cancellation');`;
      const publishSql = write('publish', id, document(slug));
      await overlap(firstCommand === 'cancel' ? cancelSql : publishSql,
        firstCommand === 'cancel' ? publishSql : cancelSql);
      const live = await row(id);
      assert.equal(live.quantity, 10);
      assert.equal(live.admin_revision, 1);
      assert.ok(live.inventory_revision >= 2);
    });
  }

  await test('concurrent admin tabs serialize and reject the stale content revision', async () => {
    const { id, slug } = await seed();
    await overlap(write('save', id, document(slug, { name: 'Winning tab' })),
      write('save', id, document(slug, { name: 'Stale tab' })), { secondFailure: /40001[\s\S]*CONFLICT: Product/ });
    const live = await row(id);
    assert.equal(live.admin_revision, 1);
    assert.equal(live.draft.name, 'Winning tab');
    assert.equal(live.quantity, 10);
  });

  await test('explicit null inventory adjustment remains intentional and bumps revision once', async () => {
    const { id, slug } = await seed();
    const adjusted = await result('publish', id, document(slug, { inventoryIntent: {
      mode: 'adjust', expectedRevision: '0', quantity: null, stockStatus: 'out-of-stock',
    } }));
    assert.equal(adjusted.quantity, null);
    assert.equal(adjusted.stock_status, 'out-of-stock');
    assert.equal(adjusted.inventory_revision, '1');
    await sql(`UPDATE products SET quantity=NULL, stock_status='out-of-stock', inventory_revision=100 WHERE id=${literal(id)};`);
    assert.equal((await row(id)).inventory_revision, 1);
  });

  await test('unchanged legacy monetary values do not block actual checkout/cancellation', async () => {
    for (const legacyMoney of ["'-1'::numeric", "'NaN'::numeric"]) {
      const { id, slug } = await seed();
      await sql(`UPDATE products SET price=${legacyMoney}, cost_price=-1 WHERE id=${literal(id)};`);
      const before = await sql(`SELECT price::text FROM products WHERE id=${literal(id)};`);
      const orderId = `legacy-money-${randomUUID()}`;
      await sql(checkout(slug, orderId, 1));
      await sql(`SELECT cancel_order_restore_inventory(${literal(orderId)}, 'Synthetic legacy-row cancellation');`);
      assert.equal((await row(id)).quantity, 10);
      assert.equal(await sql(`SELECT price::text FROM products WHERE id=${literal(id)};`), before);
    }
  });

  await test('explicit adjustment conflicts after independent checkout and preserves live row', async () => {
    const { id, slug } = await seed();
    await sql(checkout(slug, `conflict-${randomUUID()}`));
    const before = await row(id);
    await expectFailure(write('publish', id, document(slug, { inventoryIntent: {
      mode: 'adjust', expectedRevision: '0', quantity: 8, stockStatus: 'in-stock',
    } })), /CONFLICT: Inventory/);
    assert.deepEqual(await row(id), before);
  });

  await test('actual review approval identity/linkage/aggregates survive a stale content publish', async () => {
    const { id, slug } = await seed();
    const stale = document(slug, { rating: 1, reviewCount: 100, reviews: [] });
    await result('save', id, stale);
    const submission = randomUUID();
    await sql(`INSERT INTO review_submissions(id,product_id,name,rating,comment) VALUES
      (${literal(submission)},${literal(id)},'Synthetic reviewer',4,'Synthetic review');`);
    await sql(`SELECT admin_moderate_review(${literal(submission)}, 'approve', 'Synthetic reply');`);
    const reviewId = await sql(`SELECT id FROM product_reviews WHERE submission_id=${literal(submission)};`);
    assert.ok(reviewId);
    await result('publish', id, stale, null, '1');
    assert.equal(await sql(`SELECT id FROM product_reviews WHERE submission_id=${literal(submission)};`), reviewId);
    const live = await row(id);
    assert.equal(live.rating, 4);
    assert.equal(live.review_count, 1);
    assert.equal(live.inventory_revision, 0);
    await sql(`SELECT admin_moderate_review(${literal(submission)}, 'approve', 'Updated reply');`);
    assert.equal(await sql(`SELECT id FROM product_reviews WHERE submission_id=${literal(submission)};`), reviewId);
    await sql(`SELECT admin_moderate_review(${literal(submission)}, 'reject', 'Synthetic rejection');`);
    assert.equal(await sql(`SELECT count(*) FROM product_reviews WHERE submission_id=${literal(submission)};`), '0');
    assert.equal((await row(id)).review_count, 0);
    await sql(`SELECT admin_moderate_review(${literal(submission)}, 'approve', NULL); SELECT admin_delete_review(${literal(submission)});`);
    assert.equal(await sql(`SELECT count(*) FROM product_reviews WHERE submission_id=${literal(submission)};`), '0');
    assert.equal((await row(id)).review_count, 0);
  });

  for (const firstCommand of ['approve', 'publish']) {
    await test(`actual review approval/content publish lock ordering: ${firstCommand} first`, async () => {
      const { id, slug } = await seed();
      const submission = randomUUID();
      await sql(`INSERT INTO review_submissions(id,product_id,name,rating,comment) VALUES
        (${literal(submission)},${literal(id)},'Synthetic concurrent reviewer',5,'Synthetic concurrent review');`);
      const stale = document(slug, { reviews: [], rating: 1, reviewCount: 99 });
      const approveSql = `SELECT admin_moderate_review(${literal(submission)}, 'approve', NULL);`;
      const publishSql = write('publish', id, stale);
      await overlap(firstCommand === 'approve' ? approveSql : publishSql,
        firstCommand === 'approve' ? publishSql : approveSql);
      assert.equal(await sql(`SELECT count(*) FROM product_reviews WHERE submission_id=${literal(submission)};`), '1');
      const live = await row(id);
      assert.equal(live.rating, 5);
      assert.equal(live.review_count, 1);
      assert.equal(live.admin_revision, 1);
    });
  }

  await test('collection membership validation holds mode/existence stable until commit', async () => {
    const { id, slug } = await seed();
    const collection = randomUUID();
    await sql(`INSERT INTO collections(id,name,slug,mode) VALUES (${literal(collection)},'Synthetic lock collection',${literal(`collection-${randomUUID()}`)},'manual');`);
    await overlap(write('publish', id, document(slug), [collection]),
      `UPDATE collections SET mode='auto' WHERE id=${literal(collection)};`);
    assert.equal((await row(id)).admin_revision, 1);
    const deletedCollection = randomUUID();
    await sql(`INSERT INTO collections(id,name,slug,mode) VALUES (${literal(deletedCollection)},'Synthetic deleted collection',${literal(`collection-${randomUUID()}`)},'manual');`);
    const before = await row(id);
    await overlap(`DELETE FROM collections WHERE id=${literal(deletedCollection)};`,
      write('publish', id, document(slug), [deletedCollection], '1'), { secondFailure: /Collection must exist/ });
    assert.deepEqual(await row(id), before);
  });

  await test('generated-axis variant availability uses authoritative post-adjustment shelf', async () => {
    const { id, slug } = await seed({ quantity: 0, stock_status: 'out-of-stock' });
    const before = await row(id);
    const doc = document(slug, { colorEnabled: true, colorOptions: [{ key: 'red', name: 'Red', enabled: true }],
      variants: [{ _key: 'red', name: 'Red', stockStatus: 'in-stock' }] });
    await result('publish', id, doc);
    assert.equal(await sql(`SELECT stock_status FROM product_variants WHERE product_id=${literal(id)};`), 'out-of-stock');
    const adjusted = await result('publish', id, { ...doc, quantity: 3, stockStatus: 'in-stock', inventoryIntent: {
      mode: 'adjust', expectedRevision: String(before.inventory_revision), quantity: 3, stockStatus: 'in-stock',
    } }, null, '1');
    assert.equal(adjusted.stock_status, 'low-stock');
    assert.equal(adjusted.inventory_revision, String(before.inventory_revision + 1));
    assert.equal(await sql(`SELECT stock_status FROM product_variants WHERE product_id=${literal(id)};`), 'low-stock');
    await sql(`UPDATE products SET inventory_revision=0 WHERE id=${literal(id)};`);
    assert.equal((await row(id)).inventory_revision, Number(adjusted.inventory_revision));
    await sql(`UPDATE products SET quantity=4, inventory_revision=999999 WHERE id=${literal(id)};`);
    assert.equal((await row(id)).inventory_revision, Number(adjusted.inventory_revision) + 1);
  });

  await test('SQL rejects malformed types, nonfinite/coercive values, negative prices, duplicate options/keys, invalid collections', async () => {
    const { id, slug } = await seed();
    const valid = document(slug);
    const before = await row(id);
    const bad = [
      { price: '100' }, { price: -1 }, { price: null }, { price: 1.001 }, { price: 90071992547410 },
      { compareAtPrice: 99 }, { costPrice: -1 }, { featured: 'false' }, { isDemo: null },
      { quantity: 1.5 }, { quantity: 2147483648 }, { stockStatus: null }, { images: [123] },
      { productVideo: { url: 123 } }, { specifications: [{ label: 'Label', value: 123 }] },
      { productFaq: [{ question: 'Synthetic?', answer: false }] }, { description: 123 },
      { inventoryIntent: null }, { inventoryIntent: { mode: null } }, { inventoryIntent: { mode: 'replace' } },
      { inventoryIntent: { mode: 'preserve', quantity: 1 } },
      { inventoryIntent: { mode: 'adjust', expectedRevision: 0, quantity: 2, stockStatus: 'in-stock' } },
      { inventoryIntent: { mode: 'adjust', expectedRevision: '0', quantity: '2', stockStatus: 'in-stock' } },
      { inventoryIntent: { mode: 'adjust', expectedRevision: '0', quantity: 2.5, stockStatus: 'in-stock' } },
      { inventoryIntent: { mode: 'adjust', expectedRevision: '0', quantity: 2, stockStatus: 'bad' } },
      { quantity: 1, inventoryIntent: { mode: 'adjust', expectedRevision: '0', quantity: 2, stockStatus: 'in-stock' } },
      { quantity: 2, stockStatus: 'out-of-stock', inventoryIntent: { mode: 'adjust', expectedRevision: '0', quantity: 2, stockStatus: 'in-stock' } },
      { inventoryIntent: { mode: 'adjust', expectedRevision: '9223372036854775808', quantity: 2, stockStatus: 'in-stock' } },
      { variants: [{ _key: 'same', name: 'One' }, { _key: 'same', name: 'Two' }] },
      { variants: [{ name: 'Zero', price: 0 }] }, { variants: [{ name: 'Negative', price: -1 }] },
      { variants: [{ name: 'Compare', price: 200, compareAtPrice: 100 }] },
      { variants: [{ name: 'Flag', isDefault: 'false' }] }, { addons: [{ name: 'Extra', price: -1 }] },
      { variants: [{ name: 'Image', image: {} }] },
      { colorOptions: [{ key: 'red', name: 'Red', enabled: true }, { key: 'red', name: 'Other', enabled: true }] },
      { colorOptions: [{ key: 'red', name: 'Red', enabled: 'true' }] }, { colorEnabled: true, colorOptions: [] },
    ];
    for (const patch of bad) await expectFailure(write('publish', id, { ...valid, ...patch }), /ERROR:/);
    await expectFailure(write(null, id, valid), /Invalid product action/);
    await expectFailure(write('delete', id, valid), /Invalid product action/);
    await expectFailure(write('save', id, valid, null, null), /CONFLICT: Product/);
    for (const membership of [[automatic], [randomUUID()], [manual, manual], [123], {}]) {
      await expectFailure(write('publish', id, valid, membership), /Collection|collection/);
    }
    assert.deepEqual(await row(id), before);
  });

  await test('child insertion failure rolls back catalog, inventory, membership, draft and revisions', async () => {
    const { id, slug } = await seed();
    await result('save', id, document(slug), [manual]);
    await sql(`INSERT INTO product_images(product_id,url) VALUES (${literal(id)},'synthetic-original');
      INSERT INTO collection_products(collection_id,product_id) VALUES (${literal(manual)},${literal(id)});`);
    await sql(`CREATE FUNCTION synthetic_child_failure() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.url='synthetic-fail' THEN RAISE EXCEPTION 'SYNTHETIC_CHILD_FAILURE'; END IF; RETURN NEW; END; $$;
      CREATE TRIGGER synthetic_child_failure BEFORE INSERT ON product_images FOR EACH ROW EXECUTE FUNCTION synthetic_child_failure();`, 'postgres');
    const before = await row(id);
    await expectFailure(write('publish', id, document(slug, { name: 'Must roll back', images: ['synthetic-fail'],
      inventoryIntent: { mode: 'adjust', expectedRevision: '0', quantity: 2, stockStatus: 'low-stock' },
    }), [manual2], '1'), /SYNTHETIC_CHILD_FAILURE/);
    assert.deepEqual(await row(id), before);
    assert.equal(await sql(`SELECT url FROM product_images WHERE product_id=${literal(id)};`), 'synthetic-original');
    assert.equal(await sql(`SELECT collection_id FROM collection_products WHERE product_id=${literal(id)};`), manual);
  });

  await test('legacy no-intent documents preserve live shelf and role grants fail closed', async () => {
    const { id, slug } = await seed();
    const legacy = document(slug);
    delete legacy.inventoryIntent;
    legacy.description = 'Existing legacy text description';
    await result('publish', id, legacy);
    assert.equal((await row(id)).quantity, 10);
    assert.equal((await row(id)).description, legacy.description);
    for (const role of ['anon', 'authenticated']) {
      await expectFailure(write('save', id, document(slug), null, '1'), /42501[\s\S]*permission denied/, role);
    }
    for (const role of ['anon', 'authenticated', 'service_role']) {
      await expectFailure(`SELECT admin_publish_product(${literal(id)}, '{}', '[]', '[]', '[]', NULL);`, /42501[\s\S]*permission denied/, role);
      await expectFailure(`SELECT admin_create_product_draft('{}', NULL);`, /42501[\s\S]*permission denied/, role);
    }
    await expectFailure('SELECT public.admin_write_product_v2_missing();', /42883[\s\S]*does not exist/);
    assert.equal(await sql(`SELECT count(*) FROM pg_proc p, LATERAL aclexplode(p.proacl) a
      WHERE p.oid='public.admin_write_product_v2(text,uuid,jsonb,jsonb,bigint)'::regprocedure AND a.grantee=0;`, 'postgres'), '0');
  });
}
