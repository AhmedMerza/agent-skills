#!/usr/bin/env python3
"""Run one Codex skill-evaluation arm in an isolated worktree.

Produces stream.jsonl, stderr.txt, final.txt, and summary.json in --out.
The with/without arms differ only in the target skill's enabled setting.
"""
import argparse
import fcntl
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import ast


def skill_config(skill_path, enabled):
    config_path = Path(os.environ.get('CODEX_HOME', Path.home() / '.codex')) / 'config.toml'
    entries = []
    current = None
    if config_path.exists():
        for raw in config_path.read_text().splitlines():
            line = raw.strip()
            if line == '[[skills.config]]':
                current = {}
                entries.append(current)
            elif line.startswith('['):
                current = None
            elif current is not None and '=' in line:
                key, value = (part.strip() for part in line.split('=', 1))
                if key in ('path', 'enabled'):
                    current[key] = ast.literal_eval(value) if key == 'path' else value.lower() == 'true'
    target = skill_path.resolve()
    kept = []
    for entry in entries:
        try:
            same = Path(entry['path']).expanduser().resolve() == target
        except (KeyError, TypeError):
            same = False
        if not same:
            kept.append(entry)
    kept.append({'path': str(skill_path), 'enabled': enabled})
    def literal(value):
        if isinstance(value, bool):
            return str(value).lower()
        if isinstance(value, str):
            return json.dumps(value)
        raise ValueError(f'unsupported skills.config value: {value!r}')
    return 'skills.config=[' + ','.join('{' + ','.join(f'{k}={literal(v)}' for k, v in entry.items()) + '}' for entry in kept) + ']'


def summarize(stream_path, skill, explicit):
    summary = dict(skill_called=False, skill_blocked=False, tool_calls=0, usage={}, final='')
    for line in stream_path.open(errors='replace'):
        try:
            event = json.loads(line)
        except ValueError:
            continue
        typ = event.get('type', '')
        item = event.get('item') or {}
        if typ == 'item.started' and item.get('type') in ('command_execution', 'mcp_tool_call', 'web_search_call', 'file_change'):
            summary['tool_calls'] += 1
        if typ == 'item.completed':
            if item.get('type') == 'agent_message':
                summary['final'] = item.get('text', summary['final'])
            if skill in str(item.get('command', '')) and 'SKILL.md' in str(item.get('command', '')):
                summary['skill_called'] = True
        if typ == 'turn.completed':
            summary['usage'] = event.get('usage') or {}
    if explicit:
        summary['skill_called'] = True
        summary['fired_via'] = 'explicit'
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('arm', 'skill', 'workdir', 'prompt-file', 'out'):
        parser.add_argument('--' + name, required=True)
    parser.add_argument('--model')
    parser.add_argument('--invoke', choices=('natural', 'explicit'), default='natural')
    parser.add_argument('--sandbox', choices=('read-only', 'workspace-write'), default='read-only')
    parser.add_argument('--timeout', type=int, default=900)
    parser.add_argument('--device')
    parser.add_argument('--setup')
    args = parser.parse_args()
    workdir = Path(args.workdir).resolve()
    out = Path(args.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    skill_path = Path(os.environ.get('CODEX_HOME', Path.home() / '.codex')) / 'skills' / args.skill / 'SKILL.md'
    if not skill_path.is_file():
        parser.error(f'skill not installed: {skill_path}')
    for root in (workdir, *workdir.parents, Path.home()):
        duplicate = root / '.agents/skills' / args.skill / 'SKILL.md'
        if duplicate.is_file() and duplicate.resolve() != skill_path.resolve():
            parser.error(f'duplicate named skill would invalidate the disabled arm: {duplicate}')
    env = dict(os.environ)
    lock = None
    if args.device:
        env['SERIAL'] = args.device
        lock_dir = Path.home() / '.cache/reflect/locks'
        lock_dir.mkdir(parents=True, exist_ok=True)
        lock = (lock_dir / (args.device + '.lock')).open('w')
        fcntl.flock(lock, fcntl.LOCK_EX)
    if args.setup:
        setup_out = out / 'setup'
        setup_out.mkdir(exist_ok=True)
        env.update(OUT=str(setup_out), ARM_OUT=str(out))
        with (out / 'setup.log').open('w') as log:
            rc = subprocess.run(['bash', args.setup], cwd=workdir, env=env, stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT).returncode
        if rc:
            summary = dict(arm=args.arm, skill=args.skill, setup_failed=rc)
            (out / 'summary.json').write_text(json.dumps(summary, indent=2))
            print(json.dumps(summary))
            return 3
    prompt = Path(args.prompt_file).read_text().strip()
    explicit = args.arm != 'without' and args.invoke == 'explicit'
    if explicit:
        prompt = f'${args.skill} {prompt}'
    enabled = args.arm != 'without'
    command = ['codex', 'exec', '--json', '--ephemeral', '-C', str(workdir), '--sandbox', args.sandbox,
               '-c', 'approval_policy="never"', '-c', 'web_search="disabled"',
               '-c', skill_config(skill_path, enabled), '-o', str(out / 'final.txt')]
    if args.model:
        command.extend(['--model', args.model])
    command.append(prompt)
    start = time.monotonic()
    with (out / 'stream.jsonl').open('w') as stream, (out / 'stderr.txt').open('w') as errors:
        try:
            code = subprocess.run(command, cwd=workdir, env=env, stdin=subprocess.DEVNULL,
                                  stdout=stream, stderr=errors, timeout=args.timeout).returncode
        except subprocess.TimeoutExpired:
            code = 124
    summary = summarize(out / 'stream.jsonl', args.skill, explicit and code == 0)
    if (out / 'final.txt').exists():
        summary['final'] = (out / 'final.txt').read_text()
    if explicit and any(message in summary['final'].lower() for message in ('unknown skill', 'skill not found')):
        summary['skill_called'] = False
        summary['fired_via'] = None
    summary.update(arm=args.arm, skill=args.skill, skill_blocked=not enabled, model=args.model,
                   exit_code=code, seconds=round(time.monotonic() - start))
    if args.device:
        summary.update(device=args.device, screenshots=sorted(str(p.relative_to(out)) for p in out.glob('*.png')))
    (out / 'final.txt').write_text(summary.pop('final'))
    (out / 'summary.json').write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary))
    return 0 if code == 0 else code


if __name__ == '__main__':
    sys.exit(main())
