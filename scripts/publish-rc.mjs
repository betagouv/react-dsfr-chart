/**
 * Cuts a release candidate: bumps the version, commits, tags and pushes.
 *
 * A tag `v*` triggers .github/workflows/release.yml, which runs every check
 * and attaches the tarball to a GitHub Release. A tag that carries a
 * pre-release suffix stops there; publish.yml ignores it, so nothing reaches
 * npm. This script therefore only guards what a tag cannot undo once pushed:
 * a dirty tree, a stale branch, and a number already taken.
 *
 * The checks of the package (typecheck, test, size, check:package) are the
 * job of the workflow, not of this script.
 *
 * Run: npm run publish-rc 0.1.1 [--dry-run]
 */
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';

const DRY_RUN_FLAGS = ['--dry-run', '-n'];

/** Runs a command and returns its trimmed output. Throws on a non-zero exit. */
function run(command, args) {
  return execFileSync(command, args, { encoding: 'utf8' }).trim();
}

/** Runs a command and lets its output reach the terminal. */
function runLive(command, args) {
  execFileSync(command, args, { stdio: 'inherit' });
}

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.some((arg) => DRY_RUN_FLAGS.includes(arg));
const positional = args.filter((arg) => !arg.startsWith('-'));

if (positional.length !== 1) {
  fail('Usage: npm run publish-rc <version> [--dry-run]   e.g. npm run publish-rc 0.1.1');
}

const base = positional[0].replace(/^v/, '');
if (!/^\d+\.\d+\.\d+$/.test(base)) {
  fail(`"${positional[0]}" is not a plain version. Pass the target release, without a suffix: 0.1.1`);
}

// 1. The tree must hold nothing the tag would leave behind.
let branch;
try {
  branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
} catch {
  fail('Not inside a git repository.');
}

if (run('git', ['status', '--porcelain'])) {
  fail('The working tree is not clean. Commit or stash first.');
}

let upstream;
try {
  upstream = run('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
} catch {
  fail(`The branch ${branch} tracks no remote branch. Push it first: git push -u origin ${branch}`);
}

const remote = upstream.split('/')[0];

// 2. The remote holds the tags that decide the next number.
console.log(`Fetching ${remote}…`);
try {
  runLive('git', ['fetch', '--tags', '--quiet', remote]);
} catch {
  fail(`Cannot reach ${remote}. The next candidate number comes from its tags, so this script stops here.`);
}

const [behind] = run('git', ['rev-list', '--left-right', '--count', `${upstream}...HEAD`])
  .split(/\s+/)
  .map(Number);
if (behind > 0) {
  fail(`The branch ${branch} is ${behind} commit(s) behind ${upstream}. Pull first.`);
}

// 3. The next free candidate number for this version.
const tags = run('git', ['tag', '--list', `v${base}`, `v${base}-rc.*`]).split('\n').filter(Boolean);

if (tags.includes(`v${base}`)) {
  fail(`The tag v${base} already exists: version ${base} is released. Pick the next version.`);
}

const numbers = tags
  .map((tag) => Number(tag.slice(`v${base}-rc.`.length)))
  .filter((value) => Number.isInteger(value) && value > 0);
const next = `${base}-rc.${Math.max(0, ...numbers) + 1}`;
const tag = `v${next}`;

// 4. The plan, then the confirmation. A pushed tag runs a workflow.
const current = run('node', ['-p', 'require("./package.json").version']);

console.log('');
console.log('About to release:');
console.log(`  version  ${current} -> ${next}`);
console.log(`  tag      ${tag}`);
console.log(`  branch   ${branch} -> ${upstream}`);
if (branch !== 'main') {
  console.log(`\n  Note: ${branch} is not main.`);
}
console.log('');

if (dryRun) {
  console.log('Dry run: nothing changed.');
  process.exit(0);
}

if (!process.stdin.isTTY) {
  fail('This script asks for a confirmation, so it needs a terminal.');
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
let answer = '';
try {
  answer = await rl.question('Continue? [y/N] ');
} catch {
  // Ctrl+C or Ctrl+D at the prompt. Nothing has changed yet.
} finally {
  rl.close();
}

if (answer.trim().toLowerCase() !== 'y') {
  console.log('\nCancelled.');
  process.exit(0);
}

// 5. npm writes both package.json and package-lock.json, then commits and
// makes an annotated tag, which --follow-tags needs.
console.log('');
runLive('npm', ['version', next, '--message', 'chore: version %s']);

try {
  runLive('git', ['push', '--follow-tags', remote, `HEAD:${upstream.slice(remote.length + 1)}`]);
} catch {
  fail(
    `The push failed. The commit and the tag stay local. To undo them:\n` +
      `    git tag -d ${tag} && git reset --hard HEAD~1`,
  );
}

console.log('');
console.log(`Released ${tag}. The release workflow now runs the checks and attaches the tarball:`);
console.log('  https://github.com/betagouv/react-dsfr-chart/actions');
