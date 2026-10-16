import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { compileFromFile } from 'json-schema-to-typescript';

const root = new URL('../', import.meta.url);
const outputs = [
  ['product-spec', 'ProductSpec'],
  ['ai-proposal', 'Proposal'],
];
await mkdir(new URL('src/domain/generated/', root), { recursive: true });
for (const [file, name] of outputs) {
  const content = await compileFromFile(fileURLToPath(new URL(`schemas/${file}.schema.json`, root)), {
    bannerComment: '/* Generated from the original v0.1 JSON Schema. Run npm run generate:types. */',
    additionalProperties: false,
    declareExternallyReferenced: true,
    $refOptions: { resolve: { http: false } },
  });
  // Schema titles are preserved; stable aliases provide a small public domain API.
  const title = file === 'product-spec' ? 'PSWProductSpecificationIRDraftV01' : 'PSWChangeProposalDraftV01';
  const result = `${content}\nexport type ${name} = ${title};\n`;
  const output = new URL(`src/domain/generated/${file}.ts`, root);
  if (process.argv.includes('--check')) {
    if ((await readFile(output, 'utf8')) !== result) throw new Error(`${name} types are stale. Run npm run generate:types.`);
  } else {
    await writeFile(output, result);
  }
}
