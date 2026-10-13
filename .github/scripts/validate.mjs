#!/usr/bin/env node
// Checks the repo layout described in CONTRIBUTING.md.
// Usage: node .github/scripts/validate.mjs [repo-root]
// No dependencies, Node 18 or newer.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..'));
const SLUG = /^[a-z0-9-]+$/;
const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

const errors = [];
const warnings = [];
const error = (file, msg) => errors.push(`${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);

const isStringArray = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string' && x.trim() !== '');

function checkMatch(folder) {
  const file = `${folder}/match.json`;
  const path = join(root, file);
  if (!existsSync(path)) {
    error(file, 'missing');
    return null;
  }
  let data;
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    error(file, `not valid JSON (${e.message})`);
    return null;
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    error(file, 'must be a JSON object');
    return null;
  }
  if (typeof data.name !== 'string' || data.name.trim() === '') error(file, '"name" is required and must be a non-empty string');
  for (const key of ['tags', 'eggs', 'images']) {
    if (key in data && !isStringArray(data[key])) error(file, `"${key}" must be an array of non-empty strings`);
  }
  if (![data.tags, data.eggs, data.images].some((v) => Array.isArray(v) && v.length > 0)) {
    warn(file, 'no tags, eggs or images: this folder only shows on eggs an admin pins to it');
  }

  let frameworks = new Set();
  if ('framework' in data) {
    const fw = data.framework;
    if (fw === null || typeof fw !== 'object' || Array.isArray(fw)) {
      error(file, '"framework" must be an object');
    } else {
      if ('variable' in fw && (typeof fw.variable !== 'string' || fw.variable.trim() === '')) {
        error(file, '"framework.variable" must be a non-empty string');
      }
      const values = fw.values;
      if (values === null || typeof values !== 'object' || Array.isArray(values) || Object.keys(values).length === 0) {
        error(file, '"framework.values" must be a non-empty object of key to label');
      } else {
        for (const [key, label] of Object.entries(values)) {
          if (!SLUG.test(key)) error(file, `framework key "${key}" must be lowercase letters, numbers and dashes`);
          if (key === 'vanilla') error(file, 'framework key "vanilla" is reserved: vanilla guides have no framework');
          if (typeof label !== 'string' || label.trim() === '') error(file, `framework "${key}" needs a non-empty label`);
          frameworks.add(key);
        }
      }
    }
  }
  return { frameworks };
}

function parseFrontMatter(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  if (lines[0].trim() !== '---') return null;
  const endTrim = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (endTrim === -1) return null;
  const meta = {};
  for (const line of lines.slice(1, endTrim)) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!m) return { meta, bad: line, body: '' };
    let value = m[2].trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    meta[m[1]] = value;
  }
  return { meta, body: lines.slice(endTrim + 1).join('\n') };
}

function checkGuide(folder, name, frameworks) {
  const file = `${folder}/${name}`;
  const slug = name.slice(0, -3);
  if (!SLUG.test(slug)) error(file, 'file name must be lowercase letters, numbers and dashes');
  const fm = parseFrontMatter(readFileSync(join(root, file), 'utf8'));
  if (!fm) {
    error(file, 'must start with front matter between two "---" lines');
    return;
  }
  if (fm.bad !== undefined) {
    error(file, `cannot read front matter line "${fm.bad}" (use "key: value")`);
    return;
  }
  const { meta, body } = fm;
  if (!meta.title) error(file, '"title" is required');
  if (meta.framework) {
    if (frameworks.size === 0) error(file, `framework "${meta.framework}" used, but ${folder}/match.json has no framework values`);
    else if (!frameworks.has(meta.framework)) error(file, `unknown framework "${meta.framework}" (known: ${[...frameworks].join(', ')})`);
  }
  if ('order' in meta && !/^-?\d+$/.test(meta.order)) error(file, '"order" must be a whole number');
  if (body.trim() === '') error(file, 'guide has no content');

  for (const m of body.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
    const src = m[1];
    if (/^[a-z]+:/i.test(src)) {
      warn(file, `external image ${src}: prefer a file in images/`);
      continue;
    }
    if (!src.startsWith('images/')) error(file, `image "${src}" must be inside images/`);
    else if (!IMAGE_EXT.test(src)) error(file, `image "${src}" must be png, jpg, webp or gif`);
    else if (!existsSync(join(root, folder, src))) error(file, `image "${src}" not found`);
  }
  for (const m of body.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
    const known = ['server.name', 'server.address', 'server.ip', 'server.port', 'server.domain'];
    if (!known.includes(m[1])) warn(file, `unknown placeholder {{${m[1]}}} will be shown as written`);
  }
}

const folders = readdirSync(root)
  .filter((n) => !n.startsWith('_') && !n.startsWith('.'))
  .filter((n) => statSync(join(root, n)).isDirectory())
  .sort();

let guideCount = 0;
for (const folder of folders) {
  if (!SLUG.test(folder)) error(folder, 'folder name must be lowercase letters, numbers and dashes');
  const match = checkMatch(folder);
  const frameworks = match ? match.frameworks : new Set();
  const entries = readdirSync(join(root, folder)).sort();
  const guides = entries.filter((n) => n.endsWith('.md'));
  if (guides.length === 0) warn(folder, 'no guides yet');
  for (const name of guides) {
    checkGuide(folder, name, frameworks);
    guideCount++;
  }
  for (const name of entries) {
    if (name === 'match.json' || name.endsWith('.md')) continue;
    const full = join(root, folder, name);
    if (name === 'images' && statSync(full).isDirectory()) {
      for (const img of readdirSync(full)) {
        if (!IMAGE_EXT.test(img)) error(`${folder}/images/${img}`, 'only png, jpg, webp and gif files belong here');
      }
      continue;
    }
    warn(`${folder}/${name}`, 'ignored by the extension');
  }
}

for (const w of warnings) console.log(`warning  ${w}`);
for (const e of errors) console.log(`error    ${e}`);
console.log(`\nChecked ${folders.length} game folder(s) and ${guideCount} guide(s): ${errors.length} error(s), ${warnings.length} warning(s).`);
process.exit(errors.length > 0 ? 1 : 0);
