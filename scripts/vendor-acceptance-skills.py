#!/usr/bin/env python3
"""Fetch pinned references and licenses; never execute upstream code."""
import hashlib, json, pathlib, urllib.request
root = pathlib.Path(__file__).resolve().parents[1] / 'packages/delivery-acceptance/vendor'
sources = [
 ('obra/superpowers','5bf4e78011075bcfc0dc295f0724994cd123ee71','skills/verification-before-completion','LICENSE'),
 ('anthropics/skills','34040c9c568585f6929bedeaad110ad08f079624','skills/webapp-testing','skills/webapp-testing/LICENSE.txt'),
]
def fetch(url):
 return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'peter-dsh'}),timeout=30).read()
manifest=[]
for repo,sha,prefix,license in sources:
 tree=json.loads(fetch(f'https://api.github.com/repos/{repo}/git/trees/{sha}?recursive=1'))
 if tree.get('truncated'): raise RuntimeError('Incomplete upstream tree')
 paths=[x['path'] for x in tree['tree'] if x['type']=='blob' and (x['path'].startswith(prefix+'/') or x['path']==license)]
 for file in paths:
  body=fetch(f'https://raw.githubusercontent.com/{repo}/{sha}/{file}');dest=root/repo/file
  dest.parent.mkdir(parents=True,exist_ok=True)
  if dest.exists() and dest.read_bytes()!=body: raise RuntimeError(f'Refusing to replace changed vendor file: {dest}')
  dest.write_bytes(body)
  manifest.append({'repository':repo,'commit':sha,'file':file,'sha256':hashlib.sha256(body).hexdigest()})
(root/'provenance.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Vendored {len(manifest)} files with licenses and pinned hashes.')
