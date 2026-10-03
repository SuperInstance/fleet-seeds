# FB6-v2 spec — journal checkpoints + rewind (zeroclaw v0.8)

Date: 2026-10-04T00:50 CST · Status: SPEC, pre-build · Lays on: FB6 (journal-as-organ, toolkit PR #1)

## The gap v0.7.1 leaves

Every trust boot replays from genesis: O(n). Every mistake is permanent:
no lawful way to truncate. Two organs a grown journal needs, both missing.

## Smallest first build (one evening)

1. **Checkpoint rows.** `python3 zeroclaw.py checkpoint journal.jsonl` appends
   a normal chained row: `type: checkpoint`, payload =
   `{row_count, tip_hash}` where tip_hash = hash of the row immediately
   before it (its prev_hash). Self-verifying: verify() checks
   payload.tip_hash == row.prev_hash AND payload.row_count == row index.
   Forged payload → fail-closed, named.
2. **Rewind.** `python3 zeroclaw.py rewind journal.jsonl <target_index>`
   truncates after target_index. Law: target MUST be a checkpoint row or
   row 0 (genesis is implicitly a checkpoint). Removed tail's hashes are
   printed as a receipt for the caller to file externally — custody of
   forgetting is a separate receipt, never a journal row (a row could not
   survive its own truncation).
3. **Resume.** After rewind, `write` continues from the truncated tip with
   normal chaining. The checkpoint row that survived IS the new anchor.
4. **Byte-compat frozen.** fnv1a64/pyCanon untouched; the toolkit adapter's
   chain math is unaffected; v0.8 journals are v0.7.1-verifiable except
   the new checkpoint payload rules (old verifiers accept checkpoint rows
   as unknown type — acceptable, they skip type-specific checks).

## Fail-closed codes (new)

- `ZC_CHECKPOINT_TIP_MISMATCH` — checkpoint payload.tip_hash ≠ row.prev_hash
- `ZC_CHECKPOINT_COUNT_MISMATCH` — payload.row_count ≠ row index
- `ZC_REWIND_TARGET_NOT_CHECKPOINT` — truncate target not a checkpoint/genesis

## Why this is the right size

Checkpoints are ~40 lines; rewind ~30; verify additions ~25; pins ~7 new.
No schema migration (checkpoint is just a row type). The toolkit adapter
treats checkpoint rows as ordinary rows — chain integrity already covers
them; a snapshot canary at a checkpoint is the O(1) boot path later (toolkit
side, separate build).

## Non-goals (explicit)

- v2 file-format / hash-indexed seeks (the real O(1) boot) — needs format
  break, defer until ≥1k rows makes replay pain measured, not imagined.
- Multi-journal fork/merge — no callers.
- Toolkit-side checkpoint-bootstrap — after this lands.
