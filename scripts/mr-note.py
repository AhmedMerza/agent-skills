#!/usr/bin/env python3
"""Post, list and resolve GitLab MR review threads — deterministically.

Replaces the hand-rolled glab/python loops that /mr-review and /fix-review used to
write on every run. Each trap below was hit live, repeatedly (2026-08-31..09-23):
  - `-f position[...]` form fields return 201 but drop the position   -> JSON body via --input
  - a context line posted with new_line alone -> 400 line_code          -> anchors via diff-anchor.py
  - paginated output is concatenated JSON -> "Extra data"               -> --paginate --output ndjson
  - error responses print nothing on stdout -> "Expecting value"        -> check rc/stderr first
  - note bodies echo back raw control characters                        -> JSONDecoder(strict=False)
  - a retry after a misread "failure" duplicates the thread             -> marker-based dedupe
  - reply notes are never resolvable, so all(resolved) lies             -> check resolvable notes only

Usage (run from inside the repo; glab resolves the project from the git remote):
  mr-note.py post    <N> FINDINGS.json [--remote origin] [--dry-run]
  mr-note.py open    <N>
  mr-note.py resolve <N> <discussion_id> "<reply>"

FINDINGS.json: [{"title": str, "body": str, "path": str, "line": 42 | "old:42" | null}, ...]
  `line` is the finding's line in the NEW file as the reviewer reported it; the script
  snaps it to a valid anchor against the MR's CURRENT head (so a stale local ref can't
  misplace notes). Unanchorable or rejected -> posted as a general thread with path:line.

Output, one line per finding / thread:
  post:    <i> anchored|general|exists <discussion_id> [note]   or   <i> FAILED <reason>
  open:    <discussion_id> <path>:<line> <first line of body>
"""
import hashlib
import importlib.util
import json
import os
import re
import subprocess
import sys

DECODER = json.JSONDecoder(strict=False)
_spec = importlib.util.spec_from_file_location(
    'diff_anchor', os.path.join(os.path.dirname(os.path.realpath(__file__)), 'diff-anchor.py'))
diff_anchor = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(diff_anchor)


def glab(*args, body=None):
    """Run `glab api`; return (parsed_json_or_None, error_text_or_None)."""
    p = subprocess.run(['glab', 'api', *args], capture_output=True, text=True,
                       input=None if body is None else json.dumps(body))
    out = p.stdout.strip()
    if p.returncode != 0:
        return None, (p.stderr.strip() or out or f'exit {p.returncode}')[:300]
    if not out:
        return None, None
    try:
        return DECODER.decode(out), None
    except ValueError as e:
        return None, f'unparseable response: {e}'


def discussions(n):
    p = subprocess.run(['glab', 'api', '--paginate', '--output', 'ndjson',
                        f'projects/:id/merge_requests/{n}/discussions?per_page=100'],
                       capture_output=True, text=True)
    if p.returncode != 0:
        sys.exit(f'cannot list discussions: {p.stderr.strip()[:300]}')
    return [DECODER.decode(l) for l in p.stdout.splitlines() if l.strip()]


def post_json(n, path, payload, method='POST'):
    return glab('--method', method, f'projects/:id/merge_requests/{n}/{path}',
                '--header', 'Content-Type: application/json', '--input', '-', body=payload)


def key_of(f):
    return hashlib.sha1(f"{f['path']}|{f['title']}".encode()).hexdigest()[:10]


def find_existing(threads, f, key):
    """A thread already carrying this finding: our marker, or (pre-marker posts) same title + path."""
    for d in threads:
        note = d['notes'][0]
        body, pos = note.get('body') or '', note.get('position') or {}
        if f'<!-- finding:{key} -->' in body:
            return d['id']
        if heading_title(body) == f['title'] and (pos.get('new_path') == f['path'] or f['path'] in body):
            return d['id']
    return None


def heading_title(body):
    """'🟡 **IMPORTANT: Some title** (`a.php:3`)' -> 'Some title'"""
    first = body.split('\n', 1)[0]
    first = re.sub(r'\s*\(`[^`]*`\)\s*$', '', first.split(':', 1)[-1])
    return first.strip(' *#')


def head_diff(n, refs, remote):
    head = refs['head_sha']
    if subprocess.run(['git', 'cat-file', '-e', f'{head}^{{commit}}'], capture_output=True).returncode:
        subprocess.run(['git', 'fetch', '-q', remote, f'+refs/merge-requests/{n}/head:refs/mr/{n}'],
                       capture_output=True)
    p = subprocess.run(['git', 'diff', f"{refs['base_sha']}..{head}"], capture_output=True, text=True)
    if p.returncode:
        sys.exit(f'cannot diff {refs["base_sha"][:8]}..{head[:8]}: {p.stderr.strip()[:200]}')
    return diff_anchor.parse(p.stdout)


def cmd_post(n, findings_file, remote='origin', dry=False):
    findings = json.load(open(findings_file))
    mr, err = glab(f'projects/:id/merge_requests/{n}')
    if not mr:
        sys.exit(f'cannot read MR {n}: {err}')
    refs = mr['diff_refs']
    files = head_diff(n, refs, remote)
    threads = discussions(n)
    for i, f in enumerate(findings, 1):
        key = key_of(f)
        if (did := find_existing(threads, f, key)):
            print(f'{i} exists {did}')
            continue
        body = f"{f['body']}\n\n<!-- finding:{key} -->"
        a = diff_anchor.anchor(files, f['path'], str(f['line'])) if f.get('line') is not None else None
        payload = {'body': body}
        if a:
            side, line = a.split()
            payload['position'] = {'position_type': 'text', 'base_sha': refs['base_sha'],
                                   'head_sha': refs['head_sha'], 'start_sha': refs['start_sha'],
                                   'new_path': f['path'], 'old_path': f.get('old_path', f['path']),
                                   side: int(line)}
        head, _, rest = body.partition('\n')
        general = {'body': f"{head}\n\n`{f['path']}:{f.get('line')}`\n{rest}"}
        if dry:
            print(f'{i} would-post {"anchored " + a if a else "general"}')
            continue
        print(f'{i} {send(n, payload, general, key, f)}')


def send(n, payload, general, key, f):
    if 'position' in payload:
        res, err = post_json(n, 'discussions', payload)
        if res and res['notes'][0].get('position'):
            return f"anchored {res['id']}"
        if res:  # created but unanchored: remove it, fall through to a general thread
            glab('--method', 'DELETE', f"projects/:id/merge_requests/{n}/discussions/{res['id']}/notes/{res['notes'][0]['id']}")
        elif (did := find_existing(discussions(n), f, key)):  # error text, but was it created?
            return f'anchored {did} (confirmed after error)'
        note = f'(anchor rejected: {err})' if err else '(unanchored, re-posted)'
    else:
        note = ''
    res, err = post_json(n, 'discussions', general)
    if res:
        return f"general {res['id']} {note}".rstrip()
    if (did := find_existing(discussions(n), f, key)):
        return f'general {did} (confirmed after error)'
    return f'FAILED {err}'


def cmd_open(n):
    for d in discussions(n):
        note = d['notes'][0]
        if not note.get('resolvable') or note.get('resolved'):
            continue
        pos = note.get('position') or {}
        where = f"{pos.get('new_path') or pos.get('old_path')}:{pos.get('new_line') or pos.get('old_line')}" if pos else '(general)'
        print(d['id'], where, (note.get('body') or '').split('\n', 1)[0][:140])


def cmd_resolve(n, did, reply):
    base = f'projects/:id/merge_requests/{n}/discussions/{did}'
    d, err = glab(base)
    if not d:
        sys.exit(f'FAILED cannot read {did}: {err}')
    if not any(x['body'] == reply for x in d['notes'][1:]):  # a retry must not duplicate the reply
        _, err = post_json(n, f'discussions/{did}/notes', {'body': reply})
        if err:
            sys.exit(f'FAILED reply: {err}')
    glab('--method', 'PUT', base, '-F', 'resolved=true')
    d, err = glab(base)
    ok = d and all(x['resolved'] for x in d['notes'] if x.get('resolvable'))
    print(f'{did} {"resolved" if ok else "NOT RESOLVED " + (err or "")}'.rstrip())


def main():
    a = sys.argv[1:]
    remote = a[a.index('--remote') + 1] if '--remote' in a else 'origin'
    dry = '--dry-run' in a
    a = [x for i, x in enumerate(a) if x not in ('--dry-run', '--remote') and (i == 0 or a[i - 1] != '--remote')]
    if len(a) == 3 and a[0] == 'post':
        cmd_post(a[1].lstrip('!'), a[2], remote, dry)
    elif len(a) == 2 and a[0] == 'open':
        cmd_open(a[1].lstrip('!'))
    elif len(a) == 4 and a[0] == 'resolve':
        cmd_resolve(a[1].lstrip('!'), a[2], a[3])
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
