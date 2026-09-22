/**
 * Measures a tick label.
 *
 * Chart.js sizes the plot box from the width of the widest tick label, which
 * it obtains from `CanvasRenderingContext2D.measureText`. This module calls
 * the same browser API with the same font, so that the two agree. The canvas
 * never leaves this module and nothing is ever drawn on it: the charts are
 * SVG.
 *
 * On a server there is no canvas. `measureText` then returns `null`, and the
 * caller renders the frame without an axis until the component mounts.
 */

/** `Chart.defaults.font` as `configureChartDefaults` of the upstream sets it. */
export const FONT_SIZE = 12;
export const LINE_HEIGHT_RATIO = 1.66;
export const FONT_FAMILY = 'Marianne';
export const LINE_HEIGHT = FONT_SIZE * LINE_HEIGHT_RATIO;
export const FONT = `${FONT_SIZE}px ${FONT_FAMILY}`;

let context: CanvasRenderingContext2D | null | undefined;

function getContext(): CanvasRenderingContext2D | null {
  if (context !== undefined) return context;
  if (typeof document === 'undefined') {
    context = null;
    return context;
  }
  context = document.createElement('canvas').getContext('2d');
  if (context) context.font = FONT;
  return context;
}

const cache = new Map<string, number>();

/** Forgets every measurement, which a font change makes stale. */
export function clearTextCache(): void {
  cache.clear();
}

/**
 * Resolves once the fonts of the page have loaded. Until Marianne arrives the
 * browser measures a fallback font, which is wider, and every axis would then
 * be laid out for text that is never drawn.
 */
export function fontsReady(): Promise<void> {
  const fonts = typeof document === 'undefined' ? undefined : (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
  if (!fonts?.ready) return Promise.resolve();
  return fonts.ready.then(() => undefined);
}

/** The width of one label in pixels, or `null` when nothing can measure it. */
export function measureText(text: string): number | null {
  const ctx = getContext();
  if (!ctx) return null;
  const cached = cache.get(text);
  if (cached !== undefined) return cached;
  // The font can be lost when the canvas is recreated; set it every time.
  ctx.font = FONT;
  const width = ctx.measureText(text).width;
  cache.set(text, width);
  return width;
}

/** The width of the widest label of a list. */
export function widestText(labels: string[]): number | null {
  let widest = 0;
  for (const label of labels) {
    const width = measureText(label);
    if (width === null) return null;
    if (width > widest) widest = width;
  }
  return widest;
}
