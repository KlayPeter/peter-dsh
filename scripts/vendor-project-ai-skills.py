#!/usr/bin/env python3
"""Download reviewed, pinned skills without executing their contents."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1] / 'packages/project-ai-init/vendor'
SOURCES = [
    ('github/awesome-copilot', '4f4796f0bf30e105700f97ed8408c12b6aa95e06', 'MIT', ['skills/create-agentsmd'], ['LICENSE']),
    ('getsentry/skills', 'c2f99a5b04b4cd992ec3022d7c2c3e23e938d241', 'Apache-2.0', ['skills/agents-md'], ['LICENSE']),
    ('softaworks/agent-toolkit', '3027f20f3181758385a1bb8c022d4041dfb4de84', 'MIT', ['skills/agent-md-refactor'], ['LICENSE']),
    ('anthropics/claude-plugins-official', 'c447c3207a425bc4e2a0d068435f64b0477ae981', 'Apache-2.0', ['plugins/claude-code-setup/skills/claude-automation-recommender', 'plugins/claude-md-management/skills/claude-md-improver'], ['plugins/claude-code-setup/LICENSE', 'plugins/claude-md-management/LICENSE']),
]

def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'peter-dsh-vendor'}), timeout=30) as response:
        return response.read()

def main():
    records = []
    for repo, commit, license_name, directories, licenses in SOURCES:
        tree = json.loads(fetch(f'https://api.github.com/repos/{repo}/git/trees/{commit}?recursive=1'))
        if tree.get('truncated'):
            raise RuntimeError('Incomplete tree: ' + repo)
        notice_dirs = [str(Path(p).parent) for p in licenses]
        selected = [x['path'] for x in tree['tree'] if x['type'] == 'blob' and (any(x['path'].startswith(d + '/') for d in directories) or x['path'] in licenses or (Path(x['path']).name == 'NOTICE' and str(Path(x['path']).parent) in notice_dirs))]
        def download(source_path):
            data = fetch(f'https://raw.githubusercontent.com/{repo}/{commit}/{source_path}')
            target = ROOT / repo / source_path
            if target.exists() and target.read_bytes() != data:
                raise RuntimeError('Refusing to overwrite modified upstream: ' + str(target))
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            return {'path': target.relative_to(ROOT).as_posix(), 'upstreamPath': source_path, 'sha256': hashlib.sha256(data).hexdigest()}
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
            files = list(executor.map(download, selected))
        records.append({'repository': repo, 'commit': commit, 'license': license_name, 'directories': directories, 'files': sorted(files, key=lambda x: x['path'])})
        print(repo, len(files))
    (ROOT / 'provenance.json').write_text(json.dumps({'schemaVersion': 1, 'sources': records}, indent=2) + '\n')

if __name__ == '__main__':
    main()
