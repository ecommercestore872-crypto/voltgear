/**
 * Buy n Tryy website -> Orders sheet receiver.
 *
 * Add this file to the existing private Order Manager Apps Script project.
 * Set BNT_WEBSITE_SYNC_SECRET in Apps Script > Project Settings > Script
 * Properties before deploying a new web-app version.
 */

const BNT_WEBSITE_SYNC = Object.freeze({
  schemaVersion: 1,
  secretProperty: 'BNT_WEBSITE_SYNC_SECRET',
  sheetProperty: 'BNT_WEBSITE_SYNC_SHEET_ID',
  maximumClockSkewMs: 5 * 60 * 1000,
  maximumItems: 100,
});

function websiteBook_() {
  const configuredId = PropertiesService.getScriptProperties()
    .getProperty(BNT_WEBSITE_SYNC.sheetProperty);
  return SpreadsheetApp.openById(configuredId || BNT.sheetId);
}

function websiteOrdersSheet_() {
  const sheet = websiteBook_().getSheetByName('Orders');
  if (!sheet || sheet.getRange('W1').getValue() !== 'Submission ID') {
    throw new Error('The target Orders sheet is not configured.');
  }
  return sheet;
}

function websiteProductRows_() {
  const sheet = websiteBook_().getSheetByName('Products');
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues()
    .filter(function (row) {
      return String(row[0]).trim() && (row[4] === true || String(row[4]).toUpperCase() === 'TRUE');
    })
    .map(function (row) {
      return { name: String(row[0]).trim(), category: String(row[1]), cost: row[2], price: row[3] };
    });
}

function websiteJson_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function websiteText_(value, maximum, label, required) {
  const text = String(value == null ? '' : value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
  if (required && !text) throw new Error(label + ' is required.');
  if (text.length > maximum) throw new Error(label + ' is too long.');
  return text;
}

function websiteMoney_(value, label) {
  const number = Number(value == null ? 0 : value);
  if (!Number.isFinite(number) || number < 0 || number > 1000000000) {
    throw new Error(label + ' is invalid.');
  }
  return Math.round(number * 100) / 100;
}

function websiteQuantity_(value) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > 1000000) {
    throw new Error('Item quantity is invalid.');
  }
  return number;
}

function websiteSafeEqual_(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function verifyWebsiteEnvelope_(event) {
  const raw = event && event.postData && event.postData.contents;
  if (!raw || raw.length > 200000) throw new Error('Invalid request body.');

  let envelope;
  try { envelope = JSON.parse(raw); }
  catch (_) { throw new Error('Request body must be valid JSON.'); }

  const timestamp = websiteText_(envelope.timestamp, 20, 'Timestamp', true);
  const nonce = websiteText_(envelope.nonce, 100, 'Nonce', true);
  const payloadBase64 = websiteText_(envelope.payloadBase64, 180000, 'Payload', true);
  const signature = websiteText_(envelope.signature, 100, 'Signature', true);
  if (!/^\d{13}$/.test(timestamp)) throw new Error('Invalid timestamp.');
  if (Math.abs(Date.now() - Number(timestamp)) > BNT_WEBSITE_SYNC.maximumClockSkewMs) {
    throw new Error('Expired request.');
  }

  const secret = PropertiesService.getScriptProperties()
    .getProperty(BNT_WEBSITE_SYNC.secretProperty);
  if (!secret || secret.length < 32) throw new Error('Website synchronization is not configured.');

  const signedContent = timestamp + '.' + nonce + '.' + payloadBase64;
  const expected = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(signedContent, secret),
  ).replace(/=+$/, '');
  if (!websiteSafeEqual_(signature, expected)) throw new Error('Invalid signature.');

  let payload;
  try {
    payload = JSON.parse(
      Utilities.newBlob(Utilities.base64DecodeWebSafe(payloadBase64)).getDataAsString('UTF-8'),
    );
  } catch (_) {
    throw new Error('Invalid encoded payload.');
  }
  if (payload.schemaVersion !== BNT_WEBSITE_SYNC.schemaVersion) {
    throw new Error('Unsupported synchronization schema.');
  }
  return payload;
}

function websiteProductLookup_() {
  const products = websiteProductRows_();
  return products.reduce(function (lookup, product) {
    if (!lookup[product.name]) lookup[product.name] = [];
    lookup[product.name].push(product);
    return lookup;
  }, {});
}

function websiteOrderNotes_(order, item) {
  const notes = [];
  if (order.customer.note) notes.push('Customer note: ' + order.customer.note);
  if (order.customer.email) notes.push('Email: ' + order.customer.email);
  if (order.customer.postal) notes.push('Postal: ' + order.customer.postal);
  if (order.promoCode) notes.push('Promo: ' + order.promoCode);
  if (order.payment) notes.push('Payment: ' + order.payment);
  if (item.variant) notes.push('Variant: ' + item.variant);
  if (item.sku) notes.push('SKU: ' + item.sku);
  if (item.slug) notes.push('Product slug: ' + item.slug);
  return notes.join(' | ');
}

function websiteValidateOrder_(payload) {
  const source = payload && payload.order;
  if (!source || typeof source !== 'object') throw new Error('Order payload is required.');
  if (!Array.isArray(source.items) || !source.items.length) {
    throw new Error('At least one order item is required.');
  }
  if (source.items.length > BNT_WEBSITE_SYNC.maximumItems) throw new Error('Too many order items.');

  const allowedStatuses = ['New', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  const order = {
    id: websiteText_(source.id, 100, 'Order ID', true),
    createdAt: new Date(source.createdAt),
    status: websiteText_(source.status, 30, 'Status', true),
    customer: {
      name: websiteText_(source.customer && source.customer.name, 150, 'Customer name', true),
      phone: websiteText_(source.customer && source.customer.phone, 30, 'Phone', true),
      city: websiteText_(source.customer && source.customer.city, 100, 'City', true),
      address: websiteText_(source.customer && source.customer.address, 1000, 'Address', true),
      email: websiteText_(source.customer && source.customer.email, 320, 'Email', false),
      postal: websiteText_(source.customer && source.customer.postal, 30, 'Postal code', false),
      note: websiteText_(source.customer && source.customer.note, 1000, 'Customer note', false),
    },
    payment: websiteText_(source.payment, 30, 'Payment', false),
    shipping: websiteMoney_(source.shipping, 'Shipping'),
    discount: websiteMoney_(source.discount, 'Discount'),
    total: websiteMoney_(source.total, 'Total'),
    promoCode: websiteText_(source.promoCode, 100, 'Promo code', false),
    trackingId: websiteText_(source.trackingId, 120, 'Tracking ID', false),
    courier: websiteText_(source.courier, 100, 'Courier', false),
    items: [],
  };
  if (Number.isNaN(order.createdAt.getTime())) throw new Error('Order date is invalid.');
  if (allowedStatuses.indexOf(order.status) === -1) throw new Error('Order status is invalid.');

  order.items = source.items.map(function (item) {
    return {
      submissionId: websiteText_(item.submissionId, 80, 'Submission ID', true),
      name: websiteText_(item.name, 200, 'Product name', true),
      slug: websiteText_(item.slug, 200, 'Product slug', false),
      variant: websiteText_(item.variant, 200, 'Variant', false),
      sku: websiteText_(item.sku, 120, 'SKU', false),
      quantity: websiteQuantity_(item.quantity),
      unitPrice: websiteMoney_(item.unitPrice, 'Unit price'),
    };
  });
  return order;
}

function websiteEnsureRow_(sheet, row) {
  if (row <= sheet.getMaxRows()) return;
  const count = Math.max(200, row - sheet.getMaxRows());
  const templateRow = Math.max(2, sheet.getMaxRows());
  sheet.insertRowsAfter(sheet.getMaxRows(), count);
  sheet.getRange(templateRow, 1, 1, 23)
    .copyTo(sheet.getRange(templateRow + 1, 1, count, 23), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  sheet.getRange(templateRow, 1, 1, 23)
    .copyTo(sheet.getRange(templateRow + 1, 1, count, 23), SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
}

function websiteUpsertOrder_(order) {
  const sheet = websiteOrdersSheet_();
  const entries = readRows_(sheet);
  const bySubmissionId = {};
  entries.forEach(function (entry) {
    const token = String(entry.v[22] || '');
    if (token) bySubmissionId[token] = entry;
  });
  const products = websiteProductLookup_();
  let nextRow = entries.length ? Math.max.apply(null, entries.map(function (entry) { return entry.row; })) + 1 : 2;
  let inserted = 0;
  let updated = 0;

  order.items.forEach(function (item, index) {
    const existing = bySubmissionId[item.submissionId];
    const row = existing ? existing.row : nextRow++;
    websiteEnsureRow_(sheet, row);

    const productMatches = products[item.name] || [];
    const category = existing ? String(existing.v[7] || '') : productMatches.length === 1 ? String(productMatches[0].category || '') : '';
    const productCost = existing ? Number(existing.v[10]) || 0 : productMatches.length === 1 ? websiteMoney_(productMatches[0].cost, 'Product cost') : 0;
    const courierCost = existing ? Number(existing.v[12]) || 0 : 0;
    const received = existing ? Number(existing.v[16]) || 0 : 0;
    const automaticNotes = websiteOrderNotes_(order, item);
    const notes = existing && String(existing.v[20] || '').trim()
      ? String(existing.v[20])
      : automaticNotes;

    const values = [[
      sheetText_(order.id),
      order.createdAt,
      sheetText_(order.customer.name),
      sheetText_(order.customer.phone),
      sheetText_(order.customer.city),
      sheetText_(order.customer.address),
      sheetText_(item.name),
      sheetText_(category),
      item.quantity,
      item.unitPrice,
      productCost,
      index === 0 ? order.shipping : 0,
      courierCost,
      index === 0 ? order.discount : 0,
      '=I' + row + '*J' + row + '+L' + row + '-N' + row,
      order.status,
      received,
      '=Q' + row + '-I' + row + '*K' + row + '-M' + row,
      sheetText_(order.trackingId),
      'Website',
      sheetText_(notes),
      sheetText_(order.courier),
      item.submissionId,
    ]];
    sheet.getRange(row, 1, 1, 23).setValues(values);
    if (existing) updated += 1;
    else inserted += 1;
  });

  SpreadsheetApp.flush();
  return { inserted: inserted, updated: updated, rows: order.items.length };
}

/** Helpers called by the existing Code.gs list/detail/dashboard functions. */
function websitePublicOrderGroup_(entries) {
  const first = publicOrder_(entries[0]);
  const totalQuantity = entries.reduce(function (sum, entry) { return sum + (Number(entry.v[8]) || 0); }, 0);
  const productCost = entries.reduce(function (sum, entry) {
    return sum + (Number(entry.v[8]) || 0) * (Number(entry.v[10]) || 0);
  }, 0);
  first.product = entries.map(function (entry) {
    return String(entry.v[6]) + ' × ' + (Number(entry.v[8]) || 0);
  }).join(' | ');
  first.category = Array.from(new Set(entries.map(function (entry) { return String(entry.v[7] || ''); }).filter(Boolean))).join(', ');
  first.quantity = totalQuantity;
  first.sellingPrice = entries.reduce(function (sum, entry) { return sum + (Number(entry.v[8]) || 0) * (Number(entry.v[9]) || 0); }, 0);
  first.productCost = productCost;
  first.deliveryCharged = entries.reduce(function (sum, entry) { return sum + (Number(entry.v[11]) || 0); }, 0);
  first.courierCost = entries.reduce(function (sum, entry) { return sum + (Number(entry.v[12]) || 0); }, 0);
  first.discount = entries.reduce(function (sum, entry) { return sum + (Number(entry.v[13]) || 0); }, 0);
  first.total = entries.reduce(function (sum, entry) { return sum + (Number(entry.v[14]) || 0); }, 0);
  first.received = entries.reduce(function (sum, entry) { return sum + (Number(entry.v[16]) || 0); }, 0);
  first.profit = entries.reduce(function (sum, entry) { return sum + (Number(entry.v[17]) || 0); }, 0);
  first.tracking = String((entries.find(function (entry) { return String(entry.v[18] || '').trim(); }) || entries[0]).v[18] || '');
  first.courier = String((entries.find(function (entry) { return String(entry.v[21] || '').trim(); }) || entries[0]).v[21] || '');
  first.version = version_(entries.map(function (entry) { return entry.v; }));
  first.websiteManaged = entries.some(function (entry) { return entry.v[19] === 'Website'; });
  return first;
}

function websiteGroupEntries_(entries) {
  const groups = {};
  entries.forEach(function (entry) {
    const id = String(entry.v[0]);
    if (!groups[id]) groups[id] = [];
    groups[id].push(entry);
  });
  return Object.keys(groups).map(function (id) { return groups[id]; });
}

function websiteGetOrders_(entries, query, status) {
  const q = String(query || '').toLowerCase().slice(0, 150);
  const filter = String(status || 'All');
  return websiteGroupEntries_(entries).filter(function (group) {
    const order = websitePublicOrderGroup_(group);
    const matchesStatus = filter === 'All' || order.status === filter;
    const matchesQuery = !q || [order.id, order.customer, order.phone, order.tracking, order.product]
      .some(function (value) { return String(value || '').toLowerCase().includes(q); });
    return matchesStatus && matchesQuery;
  }).reverse().map(websitePublicOrderGroup_);
}

function websiteGetOrderById_(entries, id) {
  const group = entries.filter(function (entry) { return entry.v[0] === id; });
  if (!group.length) throw new Error('Order not found. Refresh the orders list.');
  return websitePublicOrderGroup_(group);
}

function websiteDashboard_(entries) {
  const groups = websiteGroupEntries_(entries);
  const counts = {};
  BNT.statuses.forEach(function (status) { counts[status] = 0; });
  groups.forEach(function (group) {
    const status = group[0].v[15];
    if (status in counts) counts[status] += 1;
  });
  const received = entries.reduce(function (sum, entry) { return sum + (Number(entry.v[16]) || 0); }, 0);
  const productCost = entries.reduce(function (sum, entry) { return sum + (Number(entry.v[8]) || 0) * (Number(entry.v[10]) || 0); }, 0);
  const courierCost = entries.reduce(function (sum, entry) { return sum + (Number(entry.v[12]) || 0); }, 0);
  const profit = entries.reduce(function (sum, entry) { return sum + (Number(entry.v[17]) || 0); }, 0);
  return {
    total: groups.length,
    counts: counts,
    received: received,
    productCost: productCost,
    courierCost: courierCost,
    profit: profit,
    latest: groups.slice(-10).reverse().map(websitePublicOrderGroup_),
  };
}

/** Called from Code.gs updateOrder while its script lock is held. */
function websiteUpdateOrder_(sheet, entries, id, input, expectedVersion) {
  const group = entries.filter(function (entry) { return entry.v[0] === id; });
  if (!group.length) throw new Error('Order not found.');
  if (version_(group.map(function (entry) { return entry.v; })) !== expectedVersion) {
    throw new Error('This order changed in another tab. Close and reopen it before saving.');
  }
  if (!group.some(function (entry) { return entry.v[19] === 'Website'; })) return null;

  const status = websiteText_(input.status, 30, 'Status', true);
  if (BNT.statuses.indexOf(status) === -1) throw new Error('Choose a valid status.');
  const tracking = websiteText_(input.tracking, 120, 'Tracking ID', false);
  const courier = websiteText_(input.courier, 100, 'Courier service', false);
  const notes = websiteText_(input.notes, 3000, 'Notes', false);
  const received = websiteMoney_(input.received, 'Amount received');
  const courierCost = websiteMoney_(input.courierCost, 'Courier cost');

  group.forEach(function (entry, index) {
    sheet.getRange(entry.row, 16).setValue(status);
    sheet.getRange(entry.row, 19).setValue(sheetText_(tracking));
    sheet.getRange(entry.row, 20).setValue('Website');
    sheet.getRange(entry.row, 22).setValue(sheetText_(courier));
    if (index === 0) {
      sheet.getRange(entry.row, 13).setValue(courierCost);
      sheet.getRange(entry.row, 17).setValue(received);
      sheet.getRange(entry.row, 21).setValue(sheetText_(notes));
    }
  });
  SpreadsheetApp.flush();
  return { id: id };
}

function doPost(event) {
  try {
    const payload = verifyWebsiteEnvelope_(event);
    const order = websiteValidateOrder_(payload);
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const result = websiteUpsertOrder_(order);
      return websiteJson_({ ok: true, orderId: order.id, result: result });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error('[website-sync]', error && error.stack ? error.stack : error);
    return websiteJson_({ ok: false, error: error && error.message ? error.message : 'Website synchronization failed.' });
  }
}

function setupWebsiteSync() {
  authorize_();
  const secret = PropertiesService.getScriptProperties()
    .getProperty(BNT_WEBSITE_SYNC.secretProperty);
  if (!secret || secret.length < 32) {
    throw new Error('Add BNT_WEBSITE_SYNC_SECRET (32+ characters) in Script Properties.');
  }
  websiteOrdersSheet_();
  const dashboard = websiteBook_().getSheetByName('Dashboard');
  if (!dashboard) throw new Error('Dashboard sheet is missing.');
  dashboard.getRange('B5:B11').setFormulas([
    ['=IF(COUNTA(Orders!A2:A)=0,0,COUNTUNIQUE(FILTER(Orders!A2:A,Orders!A2:A<>"")))'],
    ['=IF(COUNTIF(Orders!P2:P,"New")=0,0,COUNTUNIQUE(FILTER(Orders!A2:A,Orders!A2:A<>"",Orders!P2:P="New")))'],
    ['=IF(COUNTIF(Orders!P2:P,"Processing")=0,0,COUNTUNIQUE(FILTER(Orders!A2:A,Orders!A2:A<>"",Orders!P2:P="Processing")))'],
    ['=IF(COUNTIF(Orders!P2:P,"Shipped")=0,0,COUNTUNIQUE(FILTER(Orders!A2:A,Orders!A2:A<>"",Orders!P2:P="Shipped")))'],
    ['=IF(COUNTIF(Orders!P2:P,"Delivered")=0,0,COUNTUNIQUE(FILTER(Orders!A2:A,Orders!A2:A<>"",Orders!P2:P="Delivered")))'],
    ['=IF(COUNTIF(Orders!P2:P,"Cancelled")=0,0,COUNTUNIQUE(FILTER(Orders!A2:A,Orders!A2:A<>"",Orders!P2:P="Cancelled")))'],
    ['=IF(COUNTIF(Orders!P2:P,"Returned")=0,0,COUNTUNIQUE(FILTER(Orders!A2:A,Orders!A2:A<>"",Orders!P2:P="Returned")))'],
  ]);
  SpreadsheetApp.flush();
  return 'Website synchronization is configured and Dashboard counts unique Order IDs.';
}
