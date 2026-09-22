/**
 * Cuts a release candidate: bumps the version, tags it, and opens the pull
 * request that carries the bump back to the default branch.
 *
 * A tag `v*` triggers .github/workflows/release.yml, which runs every check
 * and attaches the tarball to a GitHub Release. A tag that carries a
 * pre-release suffix stops there; publish.yml ignores it, so nothing reaches
 * npm. The checks of the package are therefore the job of the workflow, not
 * of this script.
 *
 * The default branch is protected: a commit reaches it through a pull request
 * only. So the bump commit goes to its own branch, and the branch and the tag
 * are pushed in one atomic push — either both arrive or neither does. The
 * release starts as soon as the tag lands; the default branch catches up when
 * the pull request is merged.
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

// 1. The tree must hold nothing the tag would carry by accident.
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

/** The branch the pull request targets. */
let defaultBranch = 'main';
try {
  defaultBranch = run('git', ['symbolic-ref', '--short', `refs/remotes/${remote}/HEAD`]).slice(remote.length + 1);
} catch {
  // No origin/HEAD reference. main is the branch every workflow of this
  // repository names, so it stays the answer.
}

// The pull request holds the difference between the branch and the default
// branch. Starting from anywhere else would put unrelated work inside it.
if (branch !== defaultBranch) {
  fail(`Run this from ${defaultBranch}, not from ${branch}. The pull request would carry the work of ${branch} too.`);
}

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
const releaseBranch = `chore/version-${next}`;

let hasGh = true;
try {
  run('gh', ['auth', 'status']);
} catch {
  hasGh = false;
}

// 4. The plan, then the confirmation. A pushed tag runs a workflow.
const current = run('node', ['-p', 'require("./package.json").version']);

console.log('');
console.log('About to release:');
console.log(`  version  ${current} -> ${next}`);
console.log(`  tag      ${tag}`);
console.log(`  branch   ${releaseBranch} -> ${remote}`);
console.log(`  pull request  ${releaseBranch} -> ${defaultBranch}`);
if (!hasGh) {
  console.log(`\n  Note: gh is absent or not signed in. The script prints the command of the pull request instead.`);
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

console.log('');

// 5. The bump lives on its own branch. npm writes both package.json and
// package-lock.json, commits, and makes an annotated tag.
runLive('git', ['switch', '--quiet', '--create', releaseBranch]);

try {
  runLive('npm', ['version', next, '--message', 'chore: version %s']);
} catch {
  runLive('git', ['switch', '--quiet', branch]);
  runLive('git', ['branch', '--quiet', '--delete', releaseBranch]);
  fail('npm version failed. Nothing was pushed.');
}

/** Undoes everything this script made on the machine. */
function undoLocally() {
  runLive('git', ['switch', '--quiet', '--force', branch]);
  runLive('git', ['branch', '--quiet', '--delete', '--force', releaseBranch]);
  runLive('git', ['tag', '--delete', tag]);
}

// 6. One atomic push: the remote takes the branch and the tag together, or it
// takes nothing. A tag without its branch would release a commit that no pull
// request can carry back.
try {
  runLive('git', ['push', '--atomic', remote, `${releaseBranch}:${releaseBranch}`, `refs/tags/${tag}`]);
} catch {
  undoLocally();
  fail('The push failed. Nothing reached the remote, and the branch and the tag are removed here.');
}

// The release is under way. From here a failure costs a command, never the
// release, so the script reports and keeps going.
runLive('git', ['branch', '--quiet', `--set-upstream-to=${remote}/${releaseBranch}`, releaseBranch]);
runLive('git', ['switch', '--quiet', branch]);

const title = `chore: version ${next}`;
const body = `La release ${tag} est déjà en ligne. Cette pull request ramène la version sur ${defaultBranch}.`;

if (hasGh) {
  try {
    runLive('gh', ['pr', 'create', '--base', defaultBranch, '--head', releaseBranch, '--title', title, '--body', body]);
  } catch {
    console.error('\n  The pull request was not created. Open it by hand:');
    console.error(`    gh pr create --base ${defaultBranch} --head ${releaseBranch} --title "${title}" --fill\n`);
  }
} else {
  console.log('Open the pull request:');
  console.log(`  gh pr create --base ${defaultBranch} --head ${releaseBranch} --title "${title}" --fill`);
}

console.log('');
console.log(`Released ${tag}. The release workflow now runs the checks and attaches the tarball:`);
console.log('  https://github.com/betagouv/react-dsfr-chart/actions');
console.log(`Merge the pull request to bring version ${next} onto ${defaultBranch}.`);
