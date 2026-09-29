// lode/engine/systemone_client.mjs — the receipted typesafe.ai systemone client
// for lode's scout/extract stages. Wire shape proven by jev-garden P-G6
// (teacher.mjs) and the wave-48 r8 calibration battery.
//
// Laws:
//   - pricing-first: EVERY call returns a usage receipt; the caller appends it
//     to the run's receipts file. No receipt, no call count.
//   - fail-closed: non-2xx / unparseable -> throw with the HTTP status; the
//     orchestrator converts to an honest FAIL record. No partial answers.
//   - key discipline: TYPESAFE_API_KEY runtime-only; never printed, never
//     written to any receipt or artifact.
export const BASE = 'https://api.typesafe.ai';

export async function systemone({ state, questions, model = 'jev-latest' }) {
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) throw new Error('TYPESAFE_API_KEY missing — engine channel closed (fail-closed)');
  const t0 = process.hrtime.bigint();
  const res = await fetch(`${BASE}/v1/systemone`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, state, questions }),
  });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`systemone HTTP ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
    err.http = res.status;
    throw err;
  }
  return {
    model: body.model ?? model,
    usage: body.usage ?? null,          // tokens of record (pricing-first)
    latency_ms: Math.round(ms * 1000) / 1000,
    answers: body.answers ?? null,
    raw: body,                           // caller persists what it needs
  };
}
