#!/usr/bin/env node
// m13-child.mjs — wave 68-f — the clean-env node executor runner.
//
// Spawned BY tools/m13-harness.mjs as executor-B (and as executor-C for the
// node-only positive control, with --random-seed variation). Runs ONE
// procedure ONCE against the inherited prefix and writes exactly
// canonicalJSON(emit) + '\n' to stdout. Any other stdout byte is divergence —
// fail-visible by construction.
//
// This file is INSTRUMENT, not procedure: it contains no procedure value. The
// procedures live in m13-procs.mjs (sealed); the prefix lives in the prefix
// JSON (sealed). The harness's seal covers this file too — an executor that
// could rewrite emits would invalidate the whole battery, so it is hashed.

import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function arg(name) {
  const hit = process.argv.find((s) => s.startsWith(`--${name}=`));
  if (!hit) {
    process.stderr.write(`E_ARGS: missing --${name}\n`);
    process.exit(2);
  }
  return hit.slice(name.length + 3);
}

const procsAbs = resolve(arg('procs'));
const prefixAbs = resolve(arg('prefix'));
const procId = arg('proc');

const mod = await import(pathToFileURL(procsAbs).href);
const prefix = JSON.parse(readFileSync(prefixAbs, 'utf8'));
const emit = mod.runProcedure(procId, prefix);
process.stdout.write(mod.emitLine(emit));
