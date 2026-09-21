/**
 * Checks what the published package contains, before it reaches npm.
 *
 * A chart library runs in the browser of every visitor of every site that
 * installs it, and in the build of that site. Three properties keep that blast
 * radius small, and each one is easy to lose in a careless commit:
 *
 *   1. no runtime dependency, so no transitive package to trust;
 *   2. nothing in the tarball but the build output and the documentation;
 *   3. no absolute path of a developer's machine inside the build output.
 *
 * Run: npm run check:package (after npm run build)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

/** Every path the tarball may hold. npm always adds package.json and LICENSE. */
const ALLOWED = [/^dist\//, /^README\.md$/, /^package\.json$/, /^LICENSE(\.\w+)?$/];

/** The only package the library may ask of its host. */
const ALLOWED_PEERS = ['react'];

const errors = [];

// 1. Zero runtime dependency. The first hard rule of the project: the upstream
//    bundles Vue and Chart.js, which is the reason this port exists.
const deps = Object.keys(pkg.dependencies ?? {});
if (deps.length > 0) {
  errors.push(`package.json declares a runtime dependency: ${deps.join(', ')}`);
}
const bundled = Object.keys(pkg.bundleDependencies ?? pkg.bundledDependencies ?? {});
if (bundled.length > 0) {
  errors.push(`package.json bundles a dependency: ${bundled.join(', ')}`);
}
const peers = Object.keys(pkg.peerDependencies ?? {});
const unexpectedPeers = peers.filter((name) => !ALLOWED_PEERS.includes(name));
if (unexpectedPeers.length > 0) {
  errors.push(`package.json declares an unexpected peerDependency: ${unexpectedPeers.join(', ')}`);
}

// 2. No lifecycle script in the published package. An install script of a
//    dependency is how the Shai-Hulud worm spreads; do not offer the same hook.
const INSTALL_HOOKS = ['preinstall', 'install', 'postinstall', 'preuninstall', 'uninstall', 'postuninstall'];
const publishedHooks = INSTALL_HOOKS.filter((name) => pkg.scripts?.[name]);
if (publishedHooks.length > 0) {
  errors.push(`package.json declares an install script: ${publishedHooks.join(', ')}`);
}

// 3. The content of the tarball.
if (!existsSync(join(root, 'dist'))) {
  errors.push('dist/ is absent. Run npm run build first.');
} else {
  const output = execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: root, encoding: 'utf8' });
  const files = JSON.parse(output)[0].files.map((file) => file.path);
  for (const path of files) {
    if (!ALLOWED.some((pattern) => pattern.test(path))) {
      errors.push(`the tarball holds an unexpected file: ${path}`);
    }
  }
  if (!files.some((path) => path === 'dist/index.js')) {
    errors.push('the tarball holds no dist/index.js');
  }

  // 4. No absolute path of the machine that built the package. A source map or
  //    a stray comment leaks the name of a person and the layout of a disk.
  const walk = (directory) =>
    readdirSync(directory).flatMap((name) => {
      const path = join(directory, name);
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
  for (const path of walk(join(root, 'dist'))) {
    const content = readFileSync(path, 'utf8');
    if (/\/(Users|home)\/[^/\s"']+/.test(content)) {
      errors.push(`${relative(root, path)} holds an absolute path of the build machine`);
    }
  }
}

if (errors.length > 0) {
  console.error('The package fails its supply chain checks:\n');
  for (const error of errors) console.error(`  - ${error}`);
  console.error('');
  process.exit(1);
}

console.log(`OK: ${pkg.name} ships no runtime dependency and nothing outside dist/ and README.md.`);
