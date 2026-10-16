// Backward-compatible minor proposal protocol extension. Product schema is unchanged.
// Old operations are copied verbatim; updateDocument is optional and adds no approval.
import { readFile, writeFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
export async function migrateProposal(input) {
  const root = new URL('../', import.meta.url);
  const spec = JSON.parse(await readFile(new URL('schemas/product-spec.schema.json', root), 'utf8'));
  const schema = JSON.parse(await readFile(new URL('schemas/ai-proposal.schema.json', root), 'utf8'));
  const ajv = new Ajv2020({ strictTypes: false, strictRequired: false }); ajv.addSchema(spec);
  if (!ajv.compile(schema)(input)) throw new Error('Proposal is not compatible with protocol v0.2');
  return JSON.parse(JSON.stringify(input));
}
if (process.argv[2] && process.argv[3]) {
  const input = JSON.parse(await readFile(process.argv[2], 'utf8'));
  await writeFile(process.argv[3], JSON.stringify(await migrateProposal(input), null, 2) + '\n');
}
