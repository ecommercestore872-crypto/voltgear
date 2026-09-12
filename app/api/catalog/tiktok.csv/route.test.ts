import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeCSV, extractPlainText, generateCSV } from "./route";

describe("TikTok Catalog CSV Feed", () => {
  it("escapes CSV values correctly protecting commas and quotes", () => {
    assert.equal(escapeCSV("Normal Title"), "Normal Title");
    assert.equal(escapeCSV(`Earbuds "Pro" 2`), `"Earbuds ""Pro"" 2"`);
    assert.equal(escapeCSV("High Bass, Low Price"), `"High Bass, Low Price"`);
    assert.equal(escapeCSV("Line1\nLine2"), `"Line1\nLine2"`);
  });

  it("extracts plain text safely from Portable Text schema", () => {
    const pt = [
      {
        _type: "block",
        children: [{ text: "Amazing " }, { text: "Quality" }]
      }
    ];
    assert.equal(extractPlainText(pt), "Amazing Quality");
  });

  it("generates correct Feed rows, format PKR, filters published-only, and prevents duplicate sku_ids", () => {
    const mockProducts = [
      {
        // Valid product with 1 variant
        name: "Airpods Clone",
        slug: "airpods-clone",
        sku: "AP-001",
        price: 4000,
        stockStatus: "in-stock",
        quantity: 10,
        images: ["/uploads/img1.png"],
        isDemo: false,
        shortDescription: "Best clone",
        variants: [
          {
            _key: "var-1",
            name: "White",
            sku: "AP-WHITE-01",
            price: 5499,
            stockStatus: "in-stock"
          }
        ]
      },
      {
         // Demo test product (must be filtered out)
         name: "Demo Product",
         slug: "demo",
         sku: "DEMO-01",
         price: 100,
         isDemo: true, // Should be ignored completely
         stockStatus: "in-stock"
      },
      {
        // Simple product with identical SKU as previous variant to test Dupe prevention
        name: "Duplicate SKU Product",
        slug: "dupe",
        sku: "AP-WHITE-01", // Resolves to an ID already seen in the earlier variant
        price: 3000,
        isDemo: false,
        stockStatus: "out-of-stock",
        quantity: 0
      },
      {
        // Out of stock product variant with absolute URL
        name: "Tripod",
        slug: "tripod-max",
        sku: "TP-MAX",
        price: 1500,
        stockStatus: "out-of-stock",
        images: ["https://res.cloudinary.com/demo.jpg"]
      }
    ];

    const csv = generateCSV(mockProducts);
    const lines = csv.split("\n").filter(Boolean);

    // Header + Variant Row + Tripod Row = 3 lines total. Demo & Dupe are dropped.
    assert.equal(lines.length, 3);
    assert.equal(lines[0], "sku_id,title,description,availability,condition,price,link,image_link");

    // Line 1: White variant
    // Expected: SKU, Title, Desc, In Stock, New, 5499 PKR, Absolute Link, Absolute Image
    const varRow = lines[1];
    assert.ok(varRow.includes("AP-WHITE-01"), "includes exact sku_id resolving from variant");
    assert.ok(varRow.includes("Airpods Clone - White"), "variant title appended");
    assert.ok(varRow.includes("5499 PKR"), "price appended with PKR");
    assert.ok(varRow.includes("https://buyntryy.com/product/airpods-clone"), "link resolved absolute");
    assert.ok(varRow.includes("https://buyntryy.com/uploads/img1.png"), "image link resolved absolute from root slash");
    assert.ok(varRow.includes("in stock"), "in stock correctly calculated");

    // Line 2: Tripod
    const tripodRow = lines[2];
    assert.ok(tripodRow.includes("TP-MAX"), "fallback to product SKU");
    assert.ok(tripodRow.includes("out of stock"), "resolves out-of-stock accurately");
    assert.ok(tripodRow.includes("1500 PKR"), "base price fallback");
    assert.ok(tripodRow.includes("https://res.cloudinary.com/demo.jpg"), "absolute URL preserved without prepending");
  });
});
