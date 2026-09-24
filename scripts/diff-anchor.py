#!/usr/bin/env python3
"""Map review findings to inline-comment anchors from a unified diff.

Deterministic replacement for "spawn an agent to read the diff and count hunk lines"
(measured: 58,815 tokens / 85s for an agent vs ~0.2s here).

Usage:
  git diff <base>..<head> | diff-anchor.py FINDINGS_FILE
FINDINGS_FILE lines:  <n>|<path>|<line>        line in the NEW file
                      <n>|<path>|old:<line>    line only in the OLD file (removed code)
Output, one per finding:
  <n>: <path> new_line <N>   |   <n>: <path> old_line <N>   |   <n>: unanchorable

Rules (GitLab rejects a context line posted with new_line alone — HTTP 400):
  - an added line anchors to itself;
  - a context line snaps to the nearest ADDED line in the same hunk;
  - a removed line (old:) anchors as old_line if it is in the diff;
  - anything not in a hunk, or a hunk with no added line, is unanchorable.
"""
import re
import sys


def parse(diff):
    """{path: [hunk, ...]}, hunk = {'added': {new_no}, 'context': {new_no}, 'removed': {old_no}}"""
    files, path, hunk, old, new = {}, None, None, 0, 0
    for line in diff.splitlines():
        if line.startswith('+++ '):
            path = line[6:] if line.startswith('+++ b/') else None
            continue
        if line.startswith('--- ') or line.startswith('diff --git'):
            continue
        m = re.match(r'@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@', line)
        if m:
            old, new = int(m.group(1)), int(m.group(2))
            hunk = {'added': set(), 'context': set(), 'removed': set()}
            if path:
                files.setdefault(path, []).append(hunk)
            continue
        if hunk is None or path is None:
            continue
        if line.startswith('+'):
            hunk['added'].add(new); new += 1
        elif line.startswith('-'):
            hunk['removed'].add(old); old += 1
        elif line.startswith(' '):
            hunk['context'].add(new); old += 1; new += 1
    return files


def anchor(files, path, spec):
    hunks = files.get(path, [])
    if spec.startswith('old:'):
        n = int(spec[4:])
        return f'old_line {n}' if any(n in h['removed'] for h in hunks) else None
    n = int(spec)
    for h in hunks:
        if n in h['added']:
            return f'new_line {n}'
        if n in h['context'] and h['added']:
            return f"new_line {min(h['added'], key=lambda a: (abs(a - n), a))}"
    return None


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    files = parse(sys.stdin.read())
    with open(sys.argv[1]) as fh:
        for raw in fh:
            if not raw.strip():
                continue
            n, path, spec = (p.strip() for p in raw.split('|', 2))
            a = anchor(files, path, spec)
            print(f'{n}: {path} {a}' if a else f'{n}: unanchorable')


if __name__ == '__main__':
    main()
