import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { X509Certificate, createHash, createPrivateKey, createPublicKey, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink, lstat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { commandEnvironment, stagingDirectory } from './runtime.mjs';
import { projectId } from './isolation.mjs';

const openssl = 'D:\\D FROM CHROME\\Git\\usr\\bin\\openssl.exe';
const pointer = join(stagingDirectory, 'browser-pki-active.json');
const owner = `${projectId}/browser-pki-v1`;
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
function powershell(script) {
  return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `$ErrorActionPreference='Stop'; ${script}`],
    { env: commandEnvironment(), encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function currentSid() {
  const sid = powershell('[Security.Principal.WindowsIdentity]::GetCurrent().User.Value');
  assert.match(sid, /^S-1-5-21-(?:\d+-){3}\d+$/);
  return sid;
}
function acl(directory) {
  return JSON.parse(powershell(`$a=Get-Acl -LiteralPath ${quote(directory)}; [pscustomobject]@{protected=$a.AreAccessRulesProtected; rules=@($a.Access | ForEach-Object { [pscustomobject]@{sid=$_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value; inherited=$_.IsInherited; type=$_.AccessControlType.ToString(); rights=$_.FileSystemRights.ToString()} })} | ConvertTo-Json -Depth 4 -Compress`));
}
function requirePrivateAcl(directory, sid) {
  const result = acl(directory);
  assert.equal(result.protected, true, 'Private PKI ACL must not inherit broad access');
  assert.equal(result.rules.length, 1, 'Only the current user may access the private PKI directory');
  assert.equal(result.rules[0].sid, sid);
  assert.equal(result.rules[0].type, 'Allow');
  assert.equal(result.rules[0].rights, 'FullControl');
}
function runOpenSsl(args) {
  execFileSync(openssl, args, { env: commandEnvironment(), stdio: 'ignore', timeout: 30000 });
}
export function requireBrowserCertificateDates(cert, { live = true, now = Date.now() } = {}) {
  const from = Date.parse(cert.validFrom); const to = Date.parse(cert.validTo);
  assert.ok(Number.isFinite(from) && Number.isFinite(to) && to > from && to - from <= 24 * 3600000, 'Invalid short-lived certificate dates');
  if (live) {
    assert.ok(from <= now, 'Certificate not valid yet');
    assert.ok(to > now + 5 * 60000, 'Certificate expired or test window too short');
  }
}
async function verifyBrowserPki(recoveryOnly = false) {
  assert.equal(process.platform, 'win32');
  assert.equal(await readFile(join(stagingDirectory, 'OWNER'), 'utf8'), projectId);
  const manifest = JSON.parse(await readFile(pointer, 'utf8'));
  assert.equal(manifest.owner, owner);
  assert.match(manifest.directory, /^browser-pki-[a-f0-9-]{36}$/);
  const directory = join(stagingDirectory, manifest.directory);
  assert.equal(resolve(directory, '..'), resolve(stagingDirectory));
  assert.equal((await lstat(directory)).isSymbolicLink(), false);
  assert.equal(await readFile(join(directory, 'OWNER'), 'utf8'), owner);
  assert.equal(manifest.sid, currentSid());
  requirePrivateAcl(directory, manifest.sid);
  const caPath = join(directory, 'root-ca.pem');
  const publicPath = join(directory, 'BuyNTry-LOCAL-ONLY.cer');
  const certPath = join(directory, 'server.pem');
  const keyPath = join(directory, 'server-key.pem');
  const ca = new X509Certificate(await readFile(caPath));
  const cert = new X509Certificate(await readFile(certPath));
  assert.equal(ca.ca, true); assert.equal(cert.ca, false);
  assert.equal(ca.verify(ca.publicKey), true); assert.equal(cert.verify(ca.publicKey), true);
  assert.equal(cert.checkIP('127.0.0.1'), '127.0.0.1');
  assert.equal(cert.checkHost('localhost'), 'localhost');
  assert.deepEqual(cert.keyUsage, ['1.3.6.1.5.5.7.3.1']);
  for (const item of [ca, cert]) {
    requireBrowserCertificateDates(item, { live: !recoveryOnly });
  }
  assert.equal(sha(ca.raw), manifest.sha256);
  assert.equal(sha(await readFile(publicPath)), manifest.sha256);
  assert.equal(sha(cert.raw), manifest.leafSha256);
  const publicKey = createPublicKey(createPrivateKey(await readFile(keyPath))).export({ format: 'der', type: 'spki' });
  assert.ok(publicKey.equals(cert.publicKey.export({ format: 'der', type: 'spki' })), 'Leaf private key mismatch');
  await assert.rejects(lstat(join(directory, 'root-ca-key.pem')), { code: 'ENOENT' });
  // Recovery gets metadata only, never TLS material to start an expired server.
  return recoveryOnly ? { directory, manifest, publicPath }
    : { directory, manifest, caPath, publicPath, certPath, keyPath, ca: await readFile(caPath) };
}
export const loadBrowserPki = () => verifyBrowserPki(false);
export const loadBrowserPkiForRecovery = () => verifyBrowserPki(true);
export async function prepareBrowserPki() {
  assert.equal(process.platform, 'win32');
  assert.equal(await readFile(join(stagingDirectory, 'OWNER'), 'utf8'), projectId);
  try { await lstat(pointer); return await loadBrowserPki(); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const sid = currentSid();
  const directoryName = `browser-pki-${randomUUID()}`;
  const directory = join(stagingDirectory, directoryName);
  await mkdir(directory); // New directory only: never change ACLs of existing material.
  execFileSync('icacls.exe', [directory, '/inheritance:r', '/grant:r', `*${sid}:(OI)(CI)F`],
    { env: commandEnvironment(), stdio: 'ignore', timeout: 10000 });
  requirePrivateAcl(directory, sid);
  await writeFile(join(directory, 'OWNER'), owner, { flag: 'wx' });
  const rootKey = join(directory, 'root-ca-key.pem');
  const caPath = join(directory, 'root-ca.pem');
  const keyPath = join(directory, 'server-key.pem');
  const csr = join(directory, 'server.csr');
  const certPath = join(directory, 'server.pem');
  const extensions = join(directory, 'server.ext');
  const label = `Buy N Try LOCAL ONLY ${directoryName.slice(-8)}`;
  try {
    runOpenSsl(['req', '-x509', '-newkey', 'rsa:3072', '-nodes', '-sha256', '-days', '1', '-subj', `/CN=${label}`,
      '-addext', 'basicConstraints=critical,CA:TRUE,pathlen:0', '-addext', 'keyUsage=critical,keyCertSign,cRLSign',
      '-addext', 'extendedKeyUsage=serverAuth', '-keyout', rootKey, '-out', caPath]);
    runOpenSsl(['req', '-new', '-newkey', 'rsa:2048', '-nodes', '-sha256', '-subj', '/CN=Buy N Try loopback only', '-keyout', keyPath, '-out', csr]);
    await writeFile(extensions, 'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\nsubjectAltName=IP:127.0.0.1,DNS:localhost\n', { flag: 'wx' });
    runOpenSsl(['x509', '-req', '-in', csr, '-CA', caPath, '-CAkey', rootKey, '-set_serial', `0x${randomUUID().replaceAll('-', '')}`,
      '-sha256', '-days', '1', '-extfile', extensions, '-out', certPath]);
    runOpenSsl(['verify', '-CAfile', caPath, '-purpose', 'sslserver', '-verify_ip', '127.0.0.1', certPath]);
    const ca = new X509Certificate(await readFile(caPath));
    const cert = new X509Certificate(await readFile(certPath));
    await writeFile(join(directory, 'BuyNTry-LOCAL-ONLY.cer'), ca.raw, { flag: 'wx' });
    const manifest = { owner, directory: directoryName, sid, subject: ca.subject, sha256: sha(ca.raw),
      sha1Thumbprint: ca.fingerprint.replaceAll(':', ''), leafSha256: sha(cert.raw),
      validFrom: ca.validFrom, validTo: ca.validTo, trustScope: 'CurrentUser only; manual import required', rootSigningKeyRetired: true };
    // Destroy only our newly generated signing key; it is never needed by servers.
    await unlink(rootKey);
    const script = `param([switch]$Remove)\n$ErrorActionPreference='Stop'\n# Exact owned temporary CA only. Never targets LocalMachine.\n$thumb='${manifest.sha1Thumbprint}'\n$expected='${manifest.sha256}'\n$path='Cert:\\CurrentUser\\Root\\'+$thumb\n$cert=Get-Item -LiteralPath $path -ErrorAction SilentlyContinue\nif (-not $cert) { Write-Output 'Exact temporary Current User CA is absent'; exit 0 }\n$hash=[Security.Cryptography.SHA256]::Create()\n$actual=[BitConverter]::ToString($hash.ComputeHash($cert.RawData)).Replace('-','')\n$hash.Dispose()\nif ($actual -ne $expected) { throw 'Certificate fingerprint mismatch; nothing removed' }\nif (-not $Remove) { Write-Output 'Exact temporary CA present. Add -Remove after testing to remove only this certificate.'; exit 0 }\nRemove-Item -LiteralPath $path -Confirm:$false\nif (Test-Path -LiteralPath $path) { throw 'Temporary CA removal not confirmed' }\nWrite-Output 'Exact temporary Current User CA removed; no Local Machine or other certificate changed'\n`;
    await writeFile(join(directory, 'Remove-Exact-Temporary-CA.ps1'), script, { flag: 'wx' });
    await writeFile(pointer, JSON.stringify(manifest, null, 2), { flag: 'wx' });
    return await loadBrowserPki();
  } finally {
    // Incomplete preparation must not retain an issuer key either.
    await unlink(rootKey).catch((error) => { if (error.code !== 'ENOENT') throw error; });
  }
}
export function browserTrustStatus(pki) {
  const thumb = pki.manifest.sha1Thumbprint;
  assert.match(thumb, /^[A-F0-9]{40}$/);
  return JSON.parse(powershell(`[pscustomobject]@{currentUserPresent=(Test-Path -LiteralPath 'Cert:\\CurrentUser\\Root\\${thumb}'); localMachinePresent=(Test-Path -LiteralPath 'Cert:\\LocalMachine\\Root\\${thumb}')} | ConvertTo-Json -Compress`));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const action = process.argv[2]; assert.ok(['prepare', 'status'].includes(action) && process.argv.length === 3);
  const pki = action === 'prepare' ? await prepareBrowserPki() : await loadBrowserPki();
  console.log(JSON.stringify({ publicCertificate: pki.publicPath, sha256Fingerprint: pki.manifest.sha256,
    sha1Thumbprint: pki.manifest.sha1Thumbprint, subject: pki.manifest.subject, validTo: pki.manifest.validTo,
    rootSigningKeyRetired: true, removalScript: join(pki.directory, 'Remove-Exact-Temporary-CA.ps1'), trust: browserTrustStatus(pki) }, null, 2));
}
