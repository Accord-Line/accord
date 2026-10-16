import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const records = [];
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path || entry.dev) continue;
  const pkg = JSON.parse(await readFile(join(path, 'package.json'), 'utf8'));
  const names = (await readdir(path)).filter((name) => /^(?:licen[cs]e|copying)(?:[.-].*)?$/i.test(name));
  const licenses = await Promise.all(names.map(async (name) => `--- ${name} ---\n${await readFile(join(path, name), 'utf8')}`));
  if (!names.length) {
    const readme = await readFile(join(path, 'README.md'), 'utf8');
    const section = readme.match(/^## License\s*\n([\s\S]*)/im)?.[1];
    if (!section?.includes('Permission is hereby granted')) throw new Error(`No full license found for ${pkg.name}`);
    licenses.push('--- License section from README.md ---\n' + section);
  }
  records.push(`=== ${pkg.name} ${pkg.version} (${pkg.license || entry.license || 'see license'}) ===\n\n${licenses.join('\n\n')}`);
}
const fonts = await Promise.all(['MaShanZheng-OFL.txt', 'WenKai-OFL.txt', 'Caveat-OFL.txt'].map(async (name) => `=== Font license: ${name} ===\n\n${await readFile(join('public/fonts', name), 'utf8')}`));
const text = 'Third-party runtime notices. Accord original code is licensed under Apache-2.0. JSZip is used under its MIT option. Package notices generated from the installed production graph. Self-hosted subset fonts: see public/fonts/README.md for provenance.\n\n' + records.join('\n\n') + '\n\n' + fonts.join('\n\n') + '\n';
await writeFile('THIRD_PARTY_NOTICES.txt', text);
await writeFile('public/THIRD_PARTY_NOTICES.txt', text);
process.stdout.write(`Collected ${records.length} runtime package notices.\n`);
