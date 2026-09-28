// jcs.mjs — JCS RFC 8785 canonical JSON serializer. Zero-dependency ESM.
//
// PROVENANCE: embassy/vc-oracle lane (Task 32-a), built as a gift-oracle for
// SuperInstance/jev-quilt issue #42: wrap their G13/G14/G17 diploma/
// attestation shapes in a W3C Verifiable Credentials envelope, JCS-
// canonicalized, Ed25519-signable. This file is the canonicalization engine.
//
// LAW (RFC 8785):
//   * objects: keys sorted by UTF-16 code unit sequence (JS default sort IS
//     the normative comparator), values serialized recursively;
//   * literals: null/true/false verbatim; strings per ECMAScript
//     JSON.stringify escaping (normative reference per RFC §3.2.2.2 — this
//     includes ES2019+ well-formed escaping of lone surrogates, which is
//     what Node's JSON.stringify implements; delegation documented, tested
//     by the RFC unicode/weird vectors, not hidden);
//   * numbers: ECMAScript ES6 Number::toString (RFC §3.2.2.3) — implemented
//     HERE as an explicit formatting-rule table (the hard part: the ±21/±7
//     exponent boundaries and decimal-point placement). The shortest
//     round-trip DIGITS are extracted via the platform primitive String(n)
//     — V8's native ES6 algorithm, the RFC's own normative implementation
//     language — then re-formatted by this file's rules. The rule table is
//     testable code in this file; the digit extraction is the one honest
//     delegation, receipted by the RFC appendix vectors in vectors/.
//   * I-JSON input assumed: NaN/Infinity are a THROW (not "null" — that is
//     the stone-vs-JCS seam the bridge reports), undefined-valued object
//     keys are skipped (both houses agree), duplicate keys are undetectable
//     post-parse (documented honest boundary, see README).

// ---------------------------------------------------------------------------
// ES6 number-to-string (RFC 8785 §3.2.2.3)
// ---------------------------------------------------------------------------

// Decompose a finite positive double into (digits, n) where
//   value = 0.<digits> × 10^n  (digits has no leading/trailing zeros)
// The ES6 spec's (s, k, n) triple follows: k = digits.length, spec-n = n.
function decompose(a) {
  const s = String(a); // platform ES6 shortest repr — the ONE delegation
  let mant, exp = 0;
  const eIdx = s.indexOf('e');
  if (eIdx >= 0) { mant = s.slice(0, eIdx); exp = parseInt(s.slice(eIdx + 1), 10); }
  else mant = s;
  const dot = mant.indexOf('.');
  let digits, E; // E: decimal exponent of the integer formed by `digits`
  if (dot < 0) { digits = mant; E = exp; }
  else { digits = mant.slice(0, dot) + mant.slice(dot + 1); E = exp - (mant.length - dot - 1); }
  let lead = 0;
  while (lead < digits.length - 1 && digits[lead] === '0') lead++;
  digits = digits.slice(lead);
  let trail = digits.length - 1;
  while (trail > 0 && digits[trail] === '0') trail--;
  E += digits.length - 1 - trail; // trailing zeros removed => scale up
  digits = digits.slice(0, trail + 1);
  return { digits, n: E + digits.length }; // value = 0.digits × 10^n
}

export function es6NumberToString(x) {
  if (typeof x !== 'number' || Number.isNaN(x) || !Number.isFinite(x)) {
    throw new TypeError(`JCS: not a finite JSON number: ${String(x)}`);
  }
  if (Object.is(x, -0) || x === 0) return '0'; // ES6 step 1: -0 → "0"
  const neg = x < 0;
  const { digits, n } = decompose(Math.abs(x));
  const k = digits.length;
  let out;
  if (k <= n && n <= 21) {
    out = digits + '0'.repeat(n - k);                       // integer, no point
  } else if (0 < n && n <= 21) {
    out = digits.slice(0, n) + '.' + digits.slice(n);       // point inside
  } else if (-6 < n && n <= 0) {
    out = '0.' + '0'.repeat(-n) + digits;                   // sub-unit fixed
  } else if (k === 1) {
    out = digits + 'e' + (n - 1 >= 0 ? '+' : '-') + Math.abs(n - 1); // d e±X
  } else {
    out = digits[0] + '.' + digits.slice(1) + 'e' +
      (n - 1 >= 0 ? '+' : '-') + Math.abs(n - 1);           // d.rest e±X
  }
  return neg ? '-' + out : out;
}

// ---------------------------------------------------------------------------
// The serializer
// ---------------------------------------------------------------------------

export function jcsSerialize(value) {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'boolean') return value ? 'true' : 'false';
  if (t === 'number') return es6NumberToString(value);
  if (t === 'string') return JSON.stringify(value); // RFC-normative escaping
  if (t === 'bigint') throw new TypeError('JCS: bigint is not I-JSON');
  if (t === 'undefined' || t === 'function' || t === 'symbol') {
    throw new TypeError(`JCS: ${t} is not a JSON value at document root`);
  }
  if (t !== 'object') throw new TypeError(`JCS: unsupported type ${t}`);
  if (Array.isArray(value)) {
    return '[' + value.map((v) => (v === undefined ? 'null' : jcsSerialize(v))) + ']';
  }
  const keys = Object.keys(value).filter((key) => value[key] !== undefined).sort();
  return '{' + keys.map((key) => JSON.stringify(key) + ':' + jcsSerialize(value[key])).join(',') + '}';
}

export default jcsSerialize;
