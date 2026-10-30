import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const finding = (id, severity, version='1', fixed=[]) => ({vulnerability:{id,severity,fix:{versions:fixed}},artifact:{name:'pkg',type:'deb',version}});
test('tracks remediation, new risks, retained version changes and escalations', () => {
 const dir=mkdtempSync(join(tmpdir(),'mythos-scan-'));
 try {
  const before={matches:[finding('gone','High'),finding('kept','Low')]};
  const after={matches:[finding('kept','High','2'),finding('new','Critical')]};
  writeFileSync(join(dir,'before'),JSON.stringify(before));writeFileSync(join(dir,'after'),JSON.stringify(after));
  const r=spawnSync(process.execPath,['scripts/security/compare-scans.mjs',join(dir,'before'),join(dir,'after'),join(dir,'result')]);
  assert.equal(r.status,1);
  const result=JSON.parse(readFileSync(join(dir,'result')));
  assert.deepEqual(result.resolved.map(v=>v.id),['gone']);assert.deepEqual(result.added.map(v=>v.id),['new']);assert.equal(result.unchanged[0].version,'2');assert.equal(result.escalated[0].id,'kept');
 } finally {rmSync(dir,{recursive:true});}
});
test('invalid scan cannot pass the policy',()=>{
 const r=spawnSync(process.execPath,['scripts/security/compare-scans.mjs','/does-not-exist','/does-not-exist','/tmp/unused']);assert.notEqual(r.status,0);
});
test('retained unfixed high remains visible, newly available high fix fails', () => {
 const dir=mkdtempSync(join(tmpdir(),'mythos-policy-'));
 try {
  const baseline={matches:[finding('open','High')]};
  writeFileSync(join(dir,'before'),JSON.stringify(baseline));
  writeFileSync(join(dir,'after'),JSON.stringify(baseline));
  const args=['scripts/security/compare-scans.mjs',join(dir,'before'),join(dir,'after'),join(dir,'result')];
  assert.equal(spawnSync(process.execPath,args).status,0);
  assert.equal(JSON.parse(readFileSync(join(dir,'result'))).unchanged.length,1);
  writeFileSync(join(dir,'after'),JSON.stringify({matches:[finding('open','High','1',['2'])]}));
  assert.equal(spawnSync(process.execPath,args).status,1);
 } finally {rmSync(dir,{recursive:true});}
});
