import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { docker, stagingDirectory } from './runtime.mjs';
import { createOwnedContainer } from './docker-create.mjs';
import { projectId, requireOwnedLocalDocker } from './isolation.mjs';

assert.equal(await readFile(join(stagingDirectory, 'OWNER'), 'utf8'), projectId);
requireOwnedLocalDocker(JSON.parse(docker(['context', 'inspect', 'desktop-linux']))[0]);
const name = `supabase_auth_${projectId}`;
const original = JSON.parse(docker(['inspect', name]))[0];
assert.equal(original.Config.Labels?.['com.supabase.cli.project'], projectId);
assert.equal(original.Config.Labels?.['com.supabase.cli.workdir'], stagingDirectory);
assert.deepEqual(Object.keys(original.NetworkSettings.Networks), [`${projectId}-loopback`]);
assert.ok(original.Config.Env.includes('GOTRUE_DISABLE_SIGNUP=true'));
assert.ok(original.Config.Env.includes('GOTRUE_EXTERNAL_EMAIL_ENABLED=false'));
const suffix = randomUUID().slice(0, 8);
const backup = `${name}_before_email_${suffix}`;
docker(['stop', original.Id]);
docker(['rename', original.Id, backup]);
let replacementId;
try {
  replacementId = await createOwnedContainer(name, { ...original.Config, Image: original.Image,
    Env: original.Config.Env.map((entry) => entry === 'GOTRUE_EXTERNAL_EMAIL_ENABLED=false' ? 'GOTRUE_EXTERNAL_EMAIL_ENABLED=true' : entry),
    Labels: { ...original.Config.Labels, 'buyntry.email-replacement-of': original.Id },
    HostConfig: original.HostConfig,
    NetworkingConfig: { EndpointsConfig: { [`${projectId}-loopback`]: { Aliases: original.NetworkSettings.Networks[`${projectId}-loopback`].Aliases ?? [] } } },
  });
  docker(['start', replacementId]);
  console.log('Local email/password provider enabled; public signup remains disabled. Original Auth container retained. Runtime acceptance required.');
} finally {
  await writeFile(join(stagingDirectory, `email-recovery-${suffix}.json`), JSON.stringify({ originalId: original.Id, backup, replacementId }, null, 2));
}
