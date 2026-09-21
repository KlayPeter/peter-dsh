#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { readFile, cp, mkdir, access, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { exportDocument, reviewMarkdown, checkMarkdown, getGuide, profiles, skillRoot } from './index.js';

const help = `Peter Content Delivery 0.2.0

Usage:
  peter-deliver guide --type prd|explainer|design|blog|research [--mode format|improve|create] [--audience text]
  peter-deliver review --input final.md [--original notes.md] [--type explainer]
  peter-deliver check --input draft.md [--type explainer]
  peter-deliver export --input draft.md --out new-directory [--formats html,pdf,docx] [--type explainer]
  peter-deliver install-skill --target project/.agents/skills
  peter-deliver setup-browser

Options:
  --allow-draft  Export despite unfinished prose markers; manifest records draft status
  --no-toc       Omit the HTML/PDF navigation
  --help         Show this help

The Agent writes/rewrites. This CLI renders existing Markdown without model calls.
Output directories must be new. PDF and Mermaid require Chromium.
`;

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    help: { type: 'boolean', short: 'h' }, type: { type: 'string' }, mode: { type: 'string' }, audience: { type: 'string' }, input: { type: 'string' }, original: { type: 'string' }, out: { type: 'string' }, formats: { type: 'string' }, target: { type: 'string' }, 'allow-draft': { type: 'boolean' }, 'no-toc': { type: 'boolean' },
  } });
  const [command] = positionals;
  if (values.help || !command) return console.log(help);
  if (positionals.length !== 1) throw new Error('Unexpected positional argument. See --help.');
  const type = values.type || 'explainer';
  if (command === 'guide') return console.log(await getGuide({ type, mode: values.mode, audience: values.audience }));
  if (command === 'review') {
    if (!values.input) throw new Error('--input is required.');
    const result = reviewMarkdown(await readFile(values.input, 'utf8'), {type, original:values.original ? await readFile(values.original,'utf8') : undefined});
    console.log(JSON.stringify(result,null,2));
    if (result.status === 'blocked') process.exitCode = 1;
    else if (result.status === 'needs-review') process.exitCode = 2;
    return;
  }
  if (command === 'check') {
    if (!values.input) throw new Error('--input is required.');
    const result = checkMarkdown(await readFile(values.input, 'utf8'), { type });
    console.log(JSON.stringify(result, null, 2));
    if (result.status === 'blocked') process.exitCode = 1;
    return;
  }
  if (command === 'export') {
    const result = await exportDocument({ input: values.input, out: values.out, formats: (values.formats || 'html').split(',').map(f => f.trim()), type, allowDraft: values['allow-draft'], toc: !values['no-toc'] });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (command === 'install-skill') {
    if (!values.target) throw new Error('--target is required, e.g. .agents/skills');
    const target = path.resolve(values.target, 'content-delivery');
    // Reserve a fresh destination; never merge over a user's existing skill.
    await mkdir(path.dirname(target), { recursive: true });
    await mkdir(target);
    try {
      for (const entry of await readdir(skillRoot)) await cp(path.join(skillRoot, entry), path.join(target, entry), { recursive: true, force: false, errorOnExist: true });
      const vendor = fileURLToPath(new URL('../vendor/', import.meta.url));
      await access(vendor);
      await cp(vendor, path.join(target, 'upstream'), { recursive: true, force: false, errorOnExist: true });
    } catch (error) { await rm(target, { recursive: true, force: true }); throw error; }
    console.log(`Installed skill: ${target}\nUse the installed peter-deliver CLI to export. Restart or refresh your Agent's skill discovery.`);
    return;
  }
  if (command === 'setup-browser') {
    const require = createRequire(import.meta.url);
    const cli = path.join(path.dirname(require.resolve('playwright/package.json')), 'cli.js');
    const child = spawn(process.execPath, [cli, 'install', 'chromium'], { stdio: 'inherit' });
    process.exitCode = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', code => resolve(code ?? 1)); });
    return;
  }
  throw new Error(`Unknown command: ${command}. Document types: ${Object.keys(profiles).join(', ')}. See --help.`);
}

main().catch(error => { console.error(`Error: ${error.message}`); process.exitCode = 1; });
