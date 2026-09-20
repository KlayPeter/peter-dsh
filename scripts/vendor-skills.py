#!/usr/bin/env python3
"""Restore reviewed upstream snapshots. No scripts from upstream are executed."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1] / 'packages/content-delivery/vendor'
SOURCES = [
    ('softaworks/agent-toolkit', '3027f20f3181758385a1bb8c022d4041dfb4de84', 'MIT', ['skills/writing-clearly-and-concisely', 'skills/mermaid-diagrams']),
    ('github/awesome-copilot', '4f4796f0bf30e105700f97ed8408c12b6aa95e06', 'MIT', ['skills/prd']),
    ('product-on-purpose/pm-skills', '1cef1a9eae10017389863d51e289e0ae41e17fcb', 'Apache-2.0', ['skills/deliver-prd', 'skills/utility-mermaid-diagrams']),
    ('JimLiu/baoyu-skills', '1567581c26ec29f4216c6e6835415bf30343b0e3', 'MIT', ['skills/baoyu-article-illustrator', 'skills/baoyu-infographic']),
]

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'peter-dsh-vendor'})
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read()

def download(job):
    repo, commit, source_path, target = job
    data = fetch(f'https://raw.githubusercontent.com/{repo}/{commit}/{source_path}')
    if target.exists() and target.read_bytes() != data:
        raise RuntimeError(f'Refusing to overwrite modified upstream file: {target}')
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return {'path': target.relative_to(ROOT).as_posix(), 'upstreamPath': source_path, 'sha256': hashlib.sha256(data).hexdigest()}

def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    records = []
    for repo, commit, license_name, directories in SOURCES:
        tree = json.loads(fetch(f'https://api.github.com/repos/{repo}/git/trees/{commit}?recursive=1'))
        if tree.get('truncated'):
            raise RuntimeError(f'Incomplete tree: {repo}')
        selected = [x['path'] for x in tree['tree'] if x['type'] == 'blob' and (any(x['path'].startswith(d + '/') for d in directories) or x['path'] in ['LICENSE', 'NOTICE'])]
        jobs = [(repo, commit, p, ROOT / repo / p) for p in selected]
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            files = list(executor.map(download, jobs))
        records.append({'repository': repo, 'commit': commit, 'license': license_name, 'directories': directories, 'files': sorted(files, key=lambda f: f['path'])})
        print(f'{repo}: {len(files)} files')
    (ROOT / 'provenance.json').write_text(json.dumps({'schemaVersion': 1, 'sources': records}, ensure_ascii=False, indent=2) + '\n')

if __name__ == '__main__':
    main()
