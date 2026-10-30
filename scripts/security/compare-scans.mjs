import fs from 'node:fs';
const [beforePath, afterPath, outputPath] = process.argv.slice(2);
const load = p => {
  const scan = JSON.parse(fs.readFileSync(p));
  if (!Array.isArray(scan.matches)) throw new Error(`Invalid scan: ${p}`);
  return new Map(scan.matches.map(m => [
    `${m.vulnerability.id}|${m.artifact.name}|${m.artifact.type}`,
    { id: m.vulnerability.id, package: m.artifact.name, version: m.artifact.version,
      severity: m.vulnerability.severity, fix: m.vulnerability.fix }
  ]));
};
const before = load(beforePath), after = load(afterPath);
const added = [...after].filter(([k]) => !before.has(k)).map(([, v]) => v);
const resolved = [...before].filter(([k]) => !after.has(k)).map(([, v]) => v);
const unchanged = [...after].filter(([k]) => before.has(k)).map(([, v]) => v);
const escalated = [...after].filter(([k,v]) => before.has(k) && ['High','Critical'].includes(v.severity) && !['High','Critical'].includes(before.get(k).severity)).map(([,v]) => v);
const result = { added, resolved, unchanged, escalated };
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(result).map(([k,v]) => [k,v.length]))));
if (added.some(v => ['High','Critical'].includes(v.severity)) || escalated.length || [...after.values()].some(v => v.severity === 'Critical' || (v.severity === 'High' && v.fix?.versions?.length))) process.exitCode = 1;
