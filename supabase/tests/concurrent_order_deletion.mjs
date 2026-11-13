import { spawn } from "node:child_process";

// This test commits synthetic fixtures. Run only against a throwaway local
// Supabase project whose Docker container uses the VoltGear QA prefix.
const container = process.env.VOLTGEAR_QA_DB_CONTAINER ?? "";
if (!/^supabase_db_voltgear_delete_qa_[a-z0-9_]+$/.test(container)) {
  throw new Error("Set VOLTGEAR_QA_DB_CONTAINER to a disposable local VoltGear QA database container");
}
const stamp = Date.now();
const orderId = `QA-CONCURRENT-${stamp}`;
const slug = `qa-concurrent-${stamp}`;

function sql(query, onData) {
  return new Promise((resolve, reject) => {
    const proc = spawn("docker", ["exec", "-i", container, "psql", "-U", "supabase_admin", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At"], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    proc.stdout.on("data", chunk => { out += chunk; onData?.(out); });
    proc.stderr.on("data", chunk => { err += chunk; });
    proc.on("error", reject);
    proc.on("close", code => code === 0 ? resolve(out.trim()) : reject(new Error(`psql ${code}: ${err.trim()}`)));
    proc.stdin.end(query);
  });
}

await sql(`SET ROLE service_role;
INSERT INTO public.products(name,slug,category,quantity,stock_status)
VALUES ('QA concurrent product','${slug}','test',10,'in-stock');
DO $$ DECLARE v_id uuid; BEGIN
  INSERT INTO public.orders(order_id,customer,payment,subtotal,total,status,is_demo,inventory_reserved)
  VALUES ('${orderId}','{}'::jsonb,'cod',50,50,'new',true,true) RETURNING id INTO v_id;
  INSERT INTO public.order_items(order_id,slug,name,price,quantity,line_total)
  VALUES (v_id,'${slug}','QA item',50,1,50);
END $$;`);

let releaseBarrier;
const locked = new Promise(resolve => { releaseBarrier = resolve; });
const first = sql(`BEGIN; SET LOCAL ROLE service_role;
LOCK TABLE public.orders IN SHARE ROW EXCLUSIVE MODE;
SELECT 'QA_LOCKED';
SELECT 'first=' || public.admin_delete_order('${orderId}', gen_random_uuid(), NULL)::text;
SELECT pg_sleep(4); COMMIT;`, output => { if (output.includes('QA_LOCKED')) releaseBarrier(); });
await Promise.race([locked, first.then(() => { throw new Error("First session ended before the lock barrier"); }), new Promise((_,reject) => setTimeout(() => reject(new Error('First session did not acquire lock')), 60000))]);
const second = sql(`BEGIN; SET LOCAL ROLE service_role;
SELECT 'second=' || public.admin_delete_order('${orderId}', gen_random_uuid(), NULL)::text;
COMMIT;`);
const [a,b] = await Promise.all([first,second]);
const state = await sql(`SELECT 'orders=' || count(*) FROM public.orders WHERE order_id='${orderId}';
SELECT 'tombstones=' || count(*) FROM public.deleted_order_identity WHERE order_id='${orderId}';
SELECT 'deleted_audits=' || count(*) FROM public.order_deletion_log WHERE order_id='${orderId}' AND outcome='deleted';
SELECT 'rejected_audits=' || count(*) FROM public.order_deletion_log WHERE order_id='${orderId}' AND outcome='rejected';
SELECT 'stock=' || quantity FROM public.products WHERE slug='${slug}';`);
const firstResult = JSON.parse(a.split("\n").find(x => x.startsWith("first="))?.slice(6) ?? "null");
const secondResult = JSON.parse(b.split("\n").find(x => x.startsWith("second="))?.slice(7) ?? "null");
if (firstResult?.ok !== true) throw new Error(`First request failed: ${a}`);
if (secondResult?.ok !== false) throw new Error(`Second request unexpectedly succeeded: ${b}`);
for (const expected of ["orders=0","tombstones=1","deleted_audits=1","rejected_audits=1","stock=11"]) {
  if (!state.includes(expected)) throw new Error(`Missing ${expected}: ${state}`);
}
console.log(JSON.stringify({ ok: true, orderId, first: a.split("\n").find(x=>x.startsWith("first=")), second: b.split("\n").find(x=>x.startsWith("second=")), state: state.split("\n") }));
