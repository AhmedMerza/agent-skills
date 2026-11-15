#!/usr/bin/env bash
# Screenshots in a GitLab MR description, done the one way that renders.
#
#   gitlab-mr-images.sh upload <file>...   upload, print one markdown image line per file
#   gitlab-mr-images.sh verify <mr-iid>    check every image in the MR description; exit 1 on any bad one
#
# Run from the repo: host and project come from the `origin` remote (override: GITLAB_HOST, GITLAB_PROJECT
# = group/project path or numeric id). Self-hosted on plain http? Set GITLAB_SCHEME=http.
#
# Why: embedding the upload's `full_path` or an absolute http://host/<group>/<project>/uploads/... URL
# shows a broken image in the description (GitLab 19), and an anonymous or token fetch of either answers
# 302 to sign-in, so "it 302s, that's normal" hides the breakage. Only the response's `markdown`
# (relative /uploads/<secret>/<file>) renders. `verify` proves it: the link is relative, GitLab's rendered
# HTML resolves it to /-/project/<id>/uploads/..., and the API download returns the real image bytes.
set -euo pipefail
REMOTE=$(git remote get-url origin 2>/dev/null || true)
# git@host:group/proj.git | ssh://git@host:port/group/proj.git | http(s)://host[:port]/group/proj.git
if [[ $REMOTE =~ ^https?://([^/]+)/(.+)$ ]]; then R_HOST=${BASH_REMATCH[1]}; R_PATH=${BASH_REMATCH[2]}; R_SCHEME=${REMOTE%%://*}
elif [[ $REMOTE =~ ^ssh://[^@]+@([^:/]+)(:[0-9]+)?/(.+)$ ]]; then R_HOST=${BASH_REMATCH[1]}; R_PATH=${BASH_REMATCH[3]}
elif [[ $REMOTE =~ ^[^@]+@([^:]+):(.+)$ ]]; then R_HOST=${BASH_REMATCH[1]}; R_PATH=${BASH_REMATCH[2]}
fi
HOST=${GITLAB_HOST:-${R_HOST:-}}
PROJ_REF=${GITLAB_PROJECT:-${R_PATH%.git}}
[ -n "$HOST" ] && [ -n "$PROJ_REF" ] || { echo "no GitLab origin remote; set GITLAB_HOST and GITLAB_PROJECT" >&2; exit 2; }
TOKEN=$(glab config get token --host "$HOST")
SCHEME=${GITLAB_SCHEME:-${R_SCHEME:-https}}
ENC=$(python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$PROJ_REF")
# The rendered HTML names the numeric id, so resolve it once.
PROJ=$(curl -s --fail -H "PRIVATE-TOKEN: $TOKEN" "$SCHEME://$HOST/api/v4/projects/$ENC" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])') \
  || { echo "cannot reach project $PROJ_REF on $SCHEME://$HOST (set GITLAB_SCHEME=http for a plain-http host)" >&2; exit 2; }
API="$SCHEME://$HOST/api/v4/projects/$PROJ"

case "${1:-}" in
upload)
  shift
  [ $# -gt 0 ] || { echo "usage: $0 upload <file>..." >&2; exit 2; }
  for f in "$@"; do
    # glab api -F sends no multipart and gets HTTP 400; curl does it right.
    curl -s --fail -H "PRIVATE-TOKEN: $TOKEN" -F "file=@$f" "$API/uploads" \
      | python3 -c 'import sys,json; print(json.load(sys.stdin)["markdown"])'
  done
  ;;
verify)
  MR=${2:?usage: $0 verify <mr-iid>}
  curl -s --fail -H "PRIVATE-TOKEN: $TOKEN" "$API/merge_requests/$MR?render_html=true" | python3 -c '
import sys, json, re, subprocess
api, token, proj = sys.argv[1], sys.argv[2], sys.argv[3]
d = json.load(sys.stdin)
links = re.findall(r"!\[[^\]]*\]\(([^)\s]+)\)", d.get("description") or "")
rendered = re.findall(r"data-src=\"([^\"]+)\"", d.get("description_html") or "")
if not links:
    print("FAIL: no images in the description"); sys.exit(1)
bad = 0
for url in links:
    m = re.fullmatch(r"/uploads/([0-9a-f]{32})/([^/]+)", url)
    if not m:
        # A file committed to the repo (/-/raw/<sha>/path) also renders; anything else does not.
        ok = "/-/raw/" in url
        print(("ok   " if ok else "FAIL ") + url + ("" if ok else "  <- embed the upload response markdown (/uploads/<secret>/<file>), never full_path or an absolute URL"))
        bad += not ok; continue
    secret, name = m.groups()
    if not any(r.endswith(f"/-/project/{proj}/uploads/{secret}/{name}") for r in rendered):
        print(f"FAIL {url}  <- GitLab did not render it as an image"); bad += 1; continue
    head = subprocess.run(["curl", "-s", "--fail", "-r", "0-7", "-H", f"PRIVATE-TOKEN: {token}",
                           f"{api}/uploads/{secret}/{name}"], capture_output=True).stdout
    if not head.startswith((b"\x89PNG", b"\xff\xd8", b"GIF8", b"RIFF")):
        print(f"FAIL {url}  <- no image behind it (upload missing or another project)"); bad += 1; continue
    print("ok   " + url)
print(f"{len(links) - bad}/{len(links)} images render")
sys.exit(1 if bad else 0)
' "$API" "$TOKEN" "$PROJ"
  ;;
*) sed -n 2,6p "$0" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac
