import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export interface Comparison {
  /** The share of pixels that differ, between 0 and 1. */
  ratio: number;
  different: number;
  total: number;
  /** Where the difference image was written, when pixels differ. */
  diffPath?: string;
}

/**
 * Compares two drawings of the same chart. One comes from a canvas, the other
 * from an SVG, so the two will never be equal: the browser antialiases a curve
 * differently in each. `threshold` sets how far apart two pixels may be in
 * colour before pixelmatch counts them, and the test asserts on the share of
 * counted pixels.
 */
export function compare(ours: Buffer, theirs: Buffer, name: string, threshold = 0.2): Comparison {
  const a = PNG.sync.read(ours);
  const b = PNG.sync.read(theirs);
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`The two drawings of "${name}" have different sizes: ${a.width}x${a.height} and ${b.width}x${b.height}.`);
  }

  const diff = new PNG({ width: a.width, height: a.height });
  const different = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold, includeAA: true });
  const total = a.width * a.height;

  let diffPath: string | undefined;
  if (different > 0) {
    diffPath = join('visual', 'output', `${name}.diff.png`);
    mkdirSync(dirname(diffPath), { recursive: true });
    writeFileSync(diffPath, PNG.sync.write(diff));
    writeFileSync(join('visual', 'output', `${name}.ours.png`), ours);
    writeFileSync(join('visual', 'output', `${name}.theirs.png`), theirs);
  }

  return { ratio: different / total, different, total, diffPath };
}
