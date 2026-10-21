#!/usr/bin/env python3
"""Smoke check the Codex reflect runner without making model calls."""
import json
import os
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory

HERE = Path(__file__).resolve().parent

with TemporaryDirectory() as tmp:
    root = Path(tmp)
    home = root / 'codex-home'
    skill = home / 'skills/reflect'
    skill.mkdir(parents=True)
    (skill / 'SKILL.md').write_text('---\nname: reflect\ndescription: test\n---\n')
    (home / 'config.toml').write_text('[[skills.config]]\npath = "/other/SKILL.md"\nenabled = false\n')
    bin_dir = root / 'bin'
    bin_dir.mkdir()
    stub = bin_dir / 'codex'
    stub.write_text('''#!/usr/bin/env python3
import json, pathlib, sys
args = sys.argv[1:]
pathlib.Path(__file__).with_name('args.json').write_text(json.dumps(args))
pathlib.Path(args[args.index('-o') + 1]).write_text('OK')
print(json.dumps({'type':'item.started','item':{'type':'command_execution'}}))
print(json.dumps({'type':'turn.completed','usage':{'input_tokens':12,'output_tokens':3}}))
''')
    stub.chmod(0o755)
    prompt = root / 'prompt.txt'
    prompt.write_text('Review this fixture')
    env = dict(os.environ, CODEX_HOME=str(home), PATH=str(bin_dir) + os.pathsep + os.environ['PATH'])
    for arm in ('with', 'without'):
        out = root / arm
        command = [sys.executable, str(HERE / 'run_arm.py'), '--arm', arm, '--skill', 'reflect',
                   '--workdir', str(root), '--prompt-file', str(prompt), '--out', str(out), '--invoke', 'explicit']
        result = subprocess.run(command, env=env, capture_output=True, text=True)
        assert result.returncode == 0, result.stderr + result.stdout
        args = json.loads((bin_dir / 'args.json').read_text())
        summary = json.loads((out / 'summary.json').read_text())
        setting = next(args[i + 1] for i, arg in enumerate(args[:-1]) if arg == '-c' and args[i + 1].startswith('skills.config='))
        assert 'path="/other/SKILL.md",enabled=false' in setting
        assert ('enabled=true' if arm == 'with' else 'enabled=false') in setting
        assert args[-1] == ('$reflect Review this fixture' if arm == 'with' else 'Review this fixture')
        assert summary['exit_code'] == 0 and summary['usage']['input_tokens'] == 12
        assert summary['skill_called'] == (arm == 'with')
        assert (out / 'final.txt').read_text() == 'OK'
    history = root / 'history.jsonl'
    history.write_text(json.dumps({'session_id':'one','ts':100,'text':'$reflect scout'}) + '\n' + json.dumps({'session_id':'one','ts':101,'text':'wrong result'}) + '\n')
    output = subprocess.check_output([sys.executable, str(HERE / 'mine_history.py'), '--history', str(history), '--skill', 'reflect'], env=env, text=True)
    assert json.loads(output)['skills']['reflect']['correction_cues'] == 1
print('Codex reflect runner smoke check passed')
