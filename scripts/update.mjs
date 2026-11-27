#!/usr/bin/env node
// Notenmeister aktualisieren: neue Version holen, neu bauen, Server neu starten.
//
//   npm run update
//
// Die Daten liegen verschlüsselt in Chrome unter http://127.0.0.1:4317 und
// werden dabei nicht angefasst. Trotzdem vorher eine Sicherung exportieren.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const NPM = platform() === 'win32' ? 'npm.cmd' : 'npm';
const PLIST = join(homedir(), 'Library', 'LaunchAgents', 'local.notenmeister.server.plist');

const say = (msg = '') => console.log(msg);
function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}
function git(...args) {
  return execFileSync('git', args, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: REPO, stdio: 'inherit', shell: platform() === 'win32' });
  if (r.status !== 0) fail(`„${cmd} ${args.join(' ')}“ ist fehlgeschlagen. Die Meldung oben bitte vollständig an die KI oder an Franz Binder geben.`);
}
const version = () => JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')).version;

/** Abschnitte aus CHANGELOG.md, die neuer als `from` sind. */
function changesSince(from) {
  const file = join(REPO, 'CHANGELOG.md');
  if (!existsSync(file)) return '';
  const out = [];
  let take = false;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^## \[?(\d+\.\d+\.\d+)/);
    if (m) take = m[1] !== from && newer(m[1], from);
    if (take) out.push(line);
  }
  return out.join('\n').trim();
}
function newer(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] > pb[i];
  return false;
}

// ---------- Prüfungen ----------
if (!existsSync(join(REPO, '.git'))) {
  fail(
    'Dieser Ordner ist keine Git-Kopie (vermutlich als ZIP heruntergeladen) und kann sich nicht selbst aktualisieren.\n' +
      '  Einmalig neu holen: git clone https://github.com/fbinder14/Notenmeister.git\n' +
      '  Die Daten bleiben in Chrome erhalten, solange die Adresse http://127.0.0.1:4317 gleich bleibt.',
  );
}
try {
  git('--version');
} catch {
  fail('Git ist nicht installiert. Bitte Git installieren (https://git-scm.com) und erneut versuchen.');
}
// Ein von npm umgeschriebener Lockfile ist keine eigene Änderung: zurücksetzen.
const dirty = git('diff', 'HEAD', '--name-only').split('\n').filter(Boolean);
if (dirty.length === 1 && dirty[0] === 'package-lock.json') git('checkout', 'HEAD', '--', 'package-lock.json');
if (git('status', '--porcelain', '--untracked-files=no')) {
  fail(
    'Es gibt eigene, nicht gesicherte Änderungen am Code. Das Update wurde nicht gestartet.\n' +
      '  Bitte im Handbuch Prompt 6.2 („Updates in eigene Anpassungen übernehmen“) verwenden.',
  );
}
try {
  git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}');
} catch {
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  fail(
    `Der Zweig „${branch}“ ist mit keinem Stand auf GitHub verbunden, daher gibt es nichts zu holen.\n` +
      '  Für die veröffentlichte Version auf den Hauptzweig wechseln:  git checkout main',
  );
}

// ---------- Neue Version holen ----------
const before = version();
const headBefore = git('rev-parse', 'HEAD');
say(`Notenmeister ${before} – suche nach einer neuen Version …`);
try {
  git('pull', '--ff-only');
} catch (e) {
  const detail = String(e.stderr || e.message).trim();
  fail(
    'Die neue Version ließ sich nicht automatisch übernehmen.\n' +
      '  Häufigster Grund: eigene Änderungen am Code (Fork). Dann Prompt 6.2 im Handbuch verwenden.\n' +
      `  Meldung von Git: ${detail}`,
  );
}
const after = version();
const changed = git('rev-parse', 'HEAD') !== headBefore;

if (!changed) say('Bereits auf dem neuesten Stand.');
else say(`Neue Version geladen: ${before} → ${after}`);

// ---------- Bauen ----------
say('\nInstalliere Bausteine …');
// npm ci installiert genau den Stand aus package-lock.json und verändert ihn nicht.
run(NPM, ['ci', '--no-audit', '--no-fund']);
say('\nBaue die App …');
run(NPM, ['run', 'build']);

// ---------- Server neu starten ----------
if (platform() === 'darwin' && existsSync(PLIST)) {
  say('\nStarte den Server (Autostart) neu …');
  run('bash', [join('scripts', 'autostart-macos.sh'), 'install']);
} else {
  say('\nKein Autostart eingerichtet: Läuft der Server noch in einem Terminal, dort mit Strg+C beenden und neu starten mit:  npm start');
}

// ---------- Zusammenfassung ----------
if (changed) {
  const notes = changesSince(before);
  if (notes) say(`\nNeu seit ${before}:\n\n${notes}`);
}
say(
  `\n✓ Fertig. Notenmeister ${after}.\n` +
    '  In der App einmal sperren (⌘L bzw. Strg+L) und wieder entsperren – dann ist die neue Version aktiv.\n' +
    '  Die Versionsnummer steht unten in den Einstellungen.\n',
);
