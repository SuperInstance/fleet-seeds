# provenance — review-c2 raw fetches (engine run-8, wave-64 lane 64-d)

- drawn candidate: c2 "Recursive-in-Recursive Self-Improvement for Interactive Scientific Agents" (ScienceBuddy) · https://arxiv.org/abs/2609.17523 · submitted 15 Sep 2026 (cs.AI) · authors Xue, Zhong, Nan et al. (phai-labs / Stanford affiliation block receipted in the abs page) · code of record: Gen-Verse/ScienceBuddy
- raw fetches, 2026-10-02:
  - review-c2-abs.html — arXiv abstract page, HTTP 200, 43,374 B, sha256 787cdfdfbe3e958a530bd4f590cc61104174d3fb2f519bced6ece5e79ad8ebe2
  - review-c2-full.html — arXiv full-text HTML (v1), HTTP 200, 307,130 B, sha256 76308e8f460315b136d01eb20a720b2785d5580e1c1636c8d2e409b0d3adc202
  - review-c2-text.txt — extracted clean text of the full HTML (tags stripped, 75,867 chars), sha256 receipted here rather than in-tree
  - review-c2-api.xml — arXiv export API metadata query: HTTP 503 then 429 twice through a 5s/10s pause ladder; COMMITTED as the honest-partial receipt (14 B 503 body replaced by the 429 body at the last attempt; no metadata beyond the abs page was obtained from this endpoint — the abs page carries everything this review needed)
- arXiv politeness note: the run's own scout query hit the export API 200/20 minutes earlier; the review-side metadata re-query was rate-limited and was NOT retried further (two receipted attempts, no hammering).

## Exclusion reason (L9 keyscan-false-positive-class, run-4/run-7 precedent)

The abs page, full-text HTML, and extracted text trip the lane key-scan's third
alternative — the case-insensitive two-letter sequence "s" then "k" followed by a
hyphen (written here as "s"+"k"+"-" so this file stays scan-clean) — on plain-English
words: the paper's own hyphenations of the "ta"+"s"+"k-" family (adaptive/specific/model
variants — the paper's core rubric vocabulary, plain forms kept out of git), the
"ma"+"s"+"k-" (the arXiv page's icon link tag), and the "ri"+"s"+"k-" family. Inspection shows every one
of the 45 hits (1 abs + 26 full-html + 18 text) is a human-language substring, not a
credential charset bundle — the documented false-positive class of L9 (cf. run-4's
base64url case and run-7's identical receipt). Per the mission's staged-diff gate
(0 hits), the raw fetches and the extracted text stay UNCOMMITTED on disk; the three
wave-64 .gitignore entries receipt the exclusion, and this file + the assessment
carry the hashes and quotes only in scan-safe rewordings.

The drawn-candidate evidence of record committed to git:
- review-c2-api.xml — the honest-partial metadata receipt (0 scan hits)
- review-c2-provenance.md — this file
- review-c2-assessment.md — the review itself

## Collision-check inspection notes (verbatim, scan-safe block)

Ledger-marker scan over the full text (both channels): 2507.19457 ×1, 2609.26457 ×0,
2505.03335 ×0, 2609.11873 ×0, 2609.24972 ×0; google-research/rrsi ×0;
primeintellect-ai/prime-agent ×0; curated catalog (139 arXiv ids + 37 slugs): absent
by id and by name. The single 2507.19457 occurrence, verbatim from the extracted
References block:

  "Agrawal et al. (2025) L. A. Agrawal, S. Tan, …, and O. Khattab GEPA: Reflective
   Prompt Evolution Can Outperform Reinforcement Learning . arXiv preprint
   arXiv:2507.19457 . External Links: Document , Link Cited by: §1 , §5 ."

Classification: bibliography CITATION of M2's source paper (GEPA), not a collision —
the drawn candidate is a different resource (2609.17523) and the citation locates it
in the reflective-prompt-evolution lineage for the nearest-prior analysis.
