# seed-onboarding: initiation is an event; onboarding is a law

*Zero-shot lane, Task 28-d. Written from outside the code, grounded in the
fleet's own record — every example below actually happened, with refs.*

## The distinction that matters

**Initiation** is the moment a new member produces its first verified artifact:
first commit, first receipt, first edge to an existing lane. It is an event,
it is cheap, and it is already well-served: `git init`, the toolkit idiom, a
smoke file — an afternoon.

**Onboarding** is everything that makes initiation *possible*: the standing
laws that let a stranger's first artifact be trusted without anyone vouching
for the stranger personally. The fleet kept discovering these laws by breaking
them. This seed collects them, because a community that cannot state its own
onboarding physics is one refactor away from losing them.

## The three laws the record already proves

**1. Cold-start must be memoryless.** yiluodi's first admission rule required
endorsers, who required edges, who required endorsements — a deadlock the
tests refused to let pass. The fix became R9's law: admission is a pure
function of what is journaled (two connected witnesses), never of history a
newcomer cannot have. `(ref: yiluodi/app/engine.js, R9 opening-hands)`

**2. Join by import, not by fork.** The strongest onboarding in the record is
one line: `quilt-silicon` imports `quilt-arch/arch/q32.mjs` for its arithmetic
instead of copying it. Cross-repo consistency became the *point*; when silicon
found its seed's halt-rule ambiguous, it resolved toward the parent's exact
boundary (6806210843 ok / 6806210844 refuse) rather than inventing its own.
An onboarded lane disagrees *on the parent's terms*. `(ref: Erised edge
quilt-silicon->quilt-arch; quilt-silicon E-S1 R5)`

**3. Declare yourself where verifiers look.** The mirror read 41 of 45 fleet
chains on first sight and could not verify yiluodi's four — which were
perfectly valid — because their genesis lived only in the writers' heads
(`YILUODI-E-L1-GENESIS`…). The law now written into the mirror: a chain must
announce its genesis in its own sources. Onboarding is not only being
trustable; it is being *checkable without asking*. `(ref: Erised finding,
45/45 after genesis discovery)`

## The measurable shape

From murmur-protocol's admission params to the mirror's kinship scan, the same
curve keeps appearing: **skepticism up front (epsNew), evidence in depth
(minEdgesIndep), bounded influence while young (capShare), full voice after
the window (admitWindow).** A community that onboards well is one where this
curve is *executable* — where "trust the newcomer exactly as much as their
verified record" is code, not vibes.

## The one-line test

> A project is 已落地 for newcomers when a stranger's first artifact can be
> verified, admitted, and remembered by the system itself — with no human
> vouching, no secret handshakes, and no history the stranger is required to
> already share.

Build toward that line and onboarding stops being a docs page. It becomes a
property of the machine.
