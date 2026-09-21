import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, access } from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';
import { initialize, loadPreset, doctor } from '../src/index.js';
import { exportPreferences } from '../src/preferences.js';
async function temp(t) {const p=await mkdtemp(path.join(os.tmpdir(),'peter-adapters-'));t.after(()=>rm(p,{recursive:true,force:true}));return p;}
async function put(p,file,text){await mkdir(path.dirname(path.join(p,file)),{recursive:true});await writeFile(path.join(p,file),text);}
const agent='.agents/skills/project-check/SKILL.md',claude='.claude/skills/project-check/SKILL.md';
const init=(root,targets,preset='peter')=>initialize({root,request:'配置当前项目',starter:'none',targets,preset});
test('Peter workflow uses native target locations, shares Codex/dsh and stays portable',async t=>{
 for(const targets of [['codex'],['dsh'],['claude'],['codex','dsh','claude']]){
  const p=await temp(t);await put(p,'package.json',JSON.stringify({packageManager:'pnpm@10',scripts:{test:'node --test',dev:'node server.js'}}));
  const r=await init(p,targets);assert.equal(r.status,'applied');
  if(targets.some(x=>x!=='claude')){const s=await readFile(path.join(p,agent),'utf8');assert.match(s,/pnpm run test/);assert.doesNotMatch(s,/pnpm run dev/);}else await assert.rejects(access(path.join(p,agent)));
  if(targets.includes('claude')){assert.match(await readFile(path.join(p,'CLAUDE.md'),'utf8'),/@AGENTS.md/);assert.match(await readFile(path.join(p,claude),'utf8'),/name: project-check/);}else await assert.rejects(access(path.join(p,claude)));
  assert.equal((await exportPreferences(p)).projectCheck,true);
  await initialize({root:p,operation:'sync'});assert.equal((await doctor(p)).status,'checks-passed');
  assert.deepEqual((await initialize({root:p,operation:'sync'})).changed,[]);
 }
});
test('workflow never takes over existing skill; hand edits and target removal are protected',async t=>{
 const p=await temp(t);await put(p,agent,'My existing skill');
 assert.equal((await init(p,['codex'])).status,'conflict');assert.equal(await readFile(path.join(p,agent),'utf8'),'My existing skill');
 const q=await temp(t);await init(q,['codex','claude']);const original=await readFile(path.join(q,claude),'utf8');await put(q,claude,original+'\nMy edit');
 assert.equal((await initialize({root:q,operation:'sync',targets:['codex']})).status,'conflict');
 await put(q,claude,original);await initialize({root:q,operation:'sync',targets:['codex']});await assert.rejects(access(path.join(q,claude)));assert.ok(await readFile(path.join(q,agent),'utf8'));
});
test('minimal remains lightweight and explicit workflow opt-out survives export',async t=>{
 const p=await temp(t);await init(p,['codex','claude'],'minimal');await assert.rejects(access(path.join(p,agent)));await assert.rejects(access(path.join(p,claude)));
 const preset={...await loadPreset('peter'),projectCheck:false};await init(p,['codex','claude'],preset);assert.equal((await exportPreferences(p)).projectCheck,false);await assert.rejects(access(path.join(p,agent)));
 await assert.rejects(loadPreset({...preset,projectCheck:'yes'}),/boolean/);
});
