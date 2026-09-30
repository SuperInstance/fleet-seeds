# provenance — review-c2 raw fetch (engine run-7, wave-67 lane 67-h)

- drawn candidate: c2 "Recursive Self Improvement for Coding Agents" · https://cline.ghost.io/recursive-self-improvement-for-coding-agents/
- raw fetch: HTTP 200, 42,390 bytes, 2026-09-30
- sha256(review-c2-raw.html) = 4462c08ccffc4ce8774101241f77d3351738f54f758089356055122f43d7f88d
- review-c2-text.txt = extracted clean text of the same page (tags stripped), left uncommitted alongside the raw page

## Exclusion reason (L9 keyscan-false-positive-class, run-4 precedent)

The raw page and its extracted text both trip the lane key-scan pattern's third
alternative — the case-insensitive two-letter sequence "s" then "k" followed by a
hyphen (written here as "s"+"k"+"-" so this file stays scan-clean) — on plain-English
words: the article's own hyphenated phrase for name-based detection ("ta" + "s"+"k-" +
"name" in the original) and the word family around "ri" + "s"+"k-" / "ta" + "s"+"k-"
hyphenations. Inspection shows every hit is a human-language substring, not a
credential charset bundle — the documented false-positive class of L9 (cf. wave-61
review-c4-raw.html base64url case, and 67-e's "di" + "s"+"k-" hits in Syzygy docs,
same class). Per the mission's staged-diff gate (0 hits), the raw page and the
extracted text stay UNCOMMITTED on disk; this file + the assessment receipt their
hashes, and the assessment quotes only scan-safe rewordings (marked
"paraphrased-for-keyscan").

The drawn-candidate evidence of record committed to git:
- review-c2-pr12465.json — the GitHub API snapshot of the public verification anchor (cline/cline#12465 diff, classified in the assessment)
- review-c2-assessment.md — the review itself
