# Admin session performance — isolated observation

Measured 2026-10-26, 12:39–12:40 Asia/Karachi. This is a local synthetic
measurement, not hosted performance certification or an application optimization.

## Evidence and method

Runner: `scripts/local-staging/session-performance.mjs`. Raw results remain ignored
at `tmp/isolated-staging/session-performance-results.json`; do not publish private
staging inputs. The recorded working HEAD was
`d998d3426a3451c08d95e85de350c5336fe24b1d`, branch
`codex/isolated-staging-certification`. The existing production-mode admin artifact
had BUILD_ID `1-LdQDvIe901cfKWAaelX`, checked unchanged before/after measurement.
The runner does not independently prove that artifact was compiled from that HEAD.

The measured runner is archived without overwrite at
`tmp/isolated-staging/session-performance-measured.mjs`, SHA256
`df179d5be6dd11b71edca7a1eb8858ae91bbc58bb973aca550484f8aa3bc5778`.
Raw result SHA256:
`400e45557abc4e1d7f54004bc20058e521b2497d4f08f1a9935bac37271e9a00`.
These preserve the local observation; they do not establish build provenance.

The guarded runner verified the owned loopback stack and all64 migration hashes
before creating one fresh synthetic allowlisted identity. One login was used. It
started one owned `next start` admin process on127.0.0.1:3301; it did not rebuild,
start storefront, change schema, clear caches or use hosted services. Synthetic
identity/history rows are retained in the local lab; no real account was changed.

Control and browser requests used the same protected read:
`/api/admin/products?page=1&pageSize=1`. All compared requests returned200 with
identical574-byte body digests and private/no-store headers. After a separately
recorded first pair and five warmup pairs, three rounds of20 adjacent pairs
alternated the first actor. Timing includes fetch through complete body receipt.
Concurrency was1; nearest-rank percentiles are sample statistics.

## Observed results

| Path | Samples | Median ms | Sample p95 ms | Maximum ms |
| --- | ---: | ---: | ---: | ---: |
| Browser cookie, protected GET |60|52.646|89.270|169.569|
| Machine bearer, same GET |60|30.409|46.196|61.425|
| Paired cookie minus bearer |60|21.669|43.900|135.705|
| Direct validator RPC, warmed Node client |30|8.922|10.230|10.667|
| Exact validator SELECT, PostgreSQL execution only |5|1.029|9.444|9.444|

The first pair measured256.531ms cookie and114.510ms bearer; these are excluded
from warm percentiles. Paired percentiles use the60 actual differences, not
subtraction of aggregate percentiles. Direct RPC has its own warmup. SQL timings
come from `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` on the deployed query body in a
rolled-back read-only transaction; synthetic token hashes are redacted before
persistence. These figures do not include Docker/psql startup.

Middleware and route authorization both validate browser sessions. The bearer
control skips these two checks; source uses no positive session cache. The observed
paired increase includes RPCs, hashing, JSON and runtime work. It cannot attribute
each component separately or measure the old browser implementation.

## Limits and next gate

Node24.14.0, Next15.5.28, Windows x64, i5-1135G7,8 logical CPUs,7,834.6MiB RAM.
Interval CPU busy fraction was87.783%; free RAM fell836.7→810.5MiB. These are host
observations, not attribution to the session checks. Fixture cardinality was19 Auth
users,19 Auth sessions,11 browser sessions and156 products. Hosted data size,
network distance, region, concurrency and external host workload were not modeled.

Node direct-RPC timing does not represent the middleware runtime; do not subtract
it to infer exact middleware/route cost. Five SQL plans on a small synthetic
dataset are diagnostic evidence, not a reliable database-tail percentile. No
rendering, upload responsiveness, Lighthouse, physical-device, capacity or real-user
p95 result follows from this run. No auth caching or weakened revocation was added.

The recorded synthetic logout returned200. The parent later observed no listeners
on3300/3301/55421 and no private `browser-input.json`. Docker's local engine pipe
was unavailable during guarded cleanup, so final container state could not be
verified; no engine restart, reset, volume deletion or broad process termination
was attempted.

Independent read-only review recomputed every pair/round/aggregate percentile and
confirmed the arithmetic. It found that the original runner marked measurement
success before checking cleanup. The prepared runner now records its own hash,
retained fixtures and cleanup outcome; logout failure or inability to verify the
owned admin port is released makes overall success false. This narrow runner
correction passes syntax review but has not been rerun against the now-unavailable
Docker engine. The measurements above belong to the archived original runner;
they are not claimed as runtime acceptance of the correction. Retaining synthetic
rows is intentional, consistent with the existing no-delete lab policy.

After separate isolated-host approval, repeat paired requests against pinned
matching hosted builds and synthetic data, record app/database regions and resource
levels, and measure browser actions separately. Review those observations before
claiming acceptable hosted overhead. Preserve immediate revocation and fail-closed
behavior; the local result alone does not justify changing authorization.
