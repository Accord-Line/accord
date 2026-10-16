// Create an explicitly fixed-fixture acceptance artifact, never the user's browser workspace.
import { createServer } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const domain = await server.ssrLoadModule('/src/domain/workspace.ts');
  const { handoffFiles } = await server.ssrLoadModule('/src/domain/handoff.ts');
  const { importWorkspaceFile } = await server.ssrLoadModule('/src/domain/portability.ts');
  const spec = JSON.parse(await readFile('examples/intentkit/project.spec.json', 'utf8'));
  const proposal = JSON.parse(await readFile('examples/intentkit/custom-recipe.proposal.json', 'utf8'));
  const approved = domain.approveProposal({ ...domain.createWorkspace(spec), proposal }, '验收：接受固定自定义配方样例（非模型调用）');
  const files = handoffFiles(approved); const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) zip.file(name, content);
  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  const output = resolve('..');
  await writeFile(resolve(output, 'PSW-HANDOFF-EXAMPLE-r2.zip'), bytes);
  const reloaded = await JSZip.loadAsync(bytes);
  for (const name of Object.keys(files)) {
    const content = await reloaded.file(name).async('string');
    assert.equal(content, files[name]);
    const target = resolve(output, 'handoff-example-r2', name);
    await mkdir(dirname(target), { recursive: true }); await writeFile(target, content);
  }
  const restored = await importWorkspaceFile('handoff.zip', bytes); assert.deepEqual(restored.approved, approved.approved);
  process.stdout.write(JSON.stringify({ fixture: 'fixed sample, not a real model response', revision: 2, files: Object.keys(files), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), roundtrip: 'pass', externalImplementation: 'not-run' }, null, 2) + '\n');
} finally { await server.close(); }
