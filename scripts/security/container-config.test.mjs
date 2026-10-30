import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const yaml=require('../../frontend/node_modules/js-yaml');
test('production Compose retains upload storage and denies app privileges and DB exposure',()=>{
 const compose=yaml.load(fs.readFileSync('docker-compose.yml','utf8'));
 const {app,db,redis}=compose.services;
 assert.deepEqual(app.cap_drop,['ALL']);
 assert.ok(app.security_opt.includes('no-new-privileges:true'));
 assert.ok(!app.privileged);
 assert.equal(compose.networks.internal.internal,true);
 for(const service of [db,redis]){
  assert.ok(!service.ports?.length);
  assert.deepEqual(service.networks,['internal']);
 }
 assert.ok(app.networks.includes('proxy') && app.networks.includes('internal'));
 assert.ok(app.volumes.includes('uploads_data:/app/public/uploads'));
 assert.equal(app.environment.UPLOAD_DIR,'/app/public/uploads');
});
