#!/usr/bin/env bash
# Claude가 사업 점검표(/work/)를 읽고 고칠 때 쓰는 명령.
# 인증: 환경 변수 CHECKLIST_AGENT_TOKEN 이 있으면 그 값을 보내고,
#   없으면 클라우드 환경의 네트워크 시크릿이 요청에 토큰을 붙여 준다고 본다.
#   CHECKLIST_URL 은 생략하면 https://www.stagelogic.kr/api/checklist
#
#   scripts/checklist.sh list                        항목 목록 (id · 분야 · 상태 · 담당 · 제목)
#   scripts/checklist.sh status <id> <todo|doing|done|blocked>
#   scripts/checklist.sh note <id> "메모"
#   scripts/checklist.sh update <id> '{"title":"…","detail":"…"}'
#   scripts/checklist.sh add <area> <owner> <status> "제목" ["설명"] ["메모"]
#   scripts/checklist.sh delete <id>
#   분야: base portfolio stage web academy sales / 담당: 대표 Claude 함께
set -euo pipefail
URL="${CHECKLIST_URL:-https://www.stagelogic.kr/api/checklist}"
AUTH=()
[ -n "${CHECKLIST_AGENT_TOKEN:-}" ] && AUTH=(-H "x-checklist-token: $CHECKLIST_AGENT_TOKEN")

call() {
  local out
  if [ "$1" = GET ]; then
    out=$(curl -sS --fail-with-body "${AUTH[@]}" "$URL") || { echo "실패: $out" >&2; exit 1; }
  else
    out=$(curl -sS --fail-with-body -X POST -H 'Content-Type: application/json' \
      "${AUTH[@]}" --data "$2" "$URL") || { echo "실패: $out" >&2; exit 1; }
  fi
  printf '%s' "$out"
}
table() { jq -r '.items | sort_by(.area, .order)[] | [.id, .area, .status, .owner, .title] | @tsv'; }

cmd="${1:-list}"; shift || true
case "$cmd" in
  list)   call GET | table ;;
  status) call POST "$(jq -nc --arg id "$1" --arg s "$2" '{op:"status", id:$id, status:$s}')" | table ;;
  note)   call POST "$(jq -nc --arg id "$1" --arg n "$2" '{op:"update", id:$id, fields:{note:$n}}')" | table ;;
  update) call POST "$(jq -nc --arg id "$1" --argjson f "$2" '{op:"update", id:$id, fields:$f}')" | table ;;
  add)    call POST "$(jq -nc --arg a "$1" --arg o "$2" --arg s "$3" --arg t "$4" --arg d "${5:-}" --arg n "${6:-}" \
            '{op:"add", item:{area:$a, owner:$o, status:$s, title:$t, detail:$d, note:$n}}')" | table ;;
  delete) call POST "$(jq -nc --arg id "$1" '{op:"delete", id:$id}')" | table ;;
  *) echo "모르는 명령: $cmd" >&2; exit 2 ;;
esac
