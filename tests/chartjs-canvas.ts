/**
 * A 2d context good enough for Chart.js to lay a chart out under jsdom, which
 * ships no canvas implementation. Nothing is drawn: the parity tests read the
 * geometry Chart.js computes, not the pixels it would paint.
 */
const NOOP = () => {};

export function stubCanvas(): void {
  const proto = globalThis.HTMLCanvasElement?.prototype;
  if (!proto) throw new Error('The tests need a DOM environment.');

  proto.getContext = function getContext(this: HTMLCanvasElement) {
    const context = {
      canvas: this,
      fillStyle: '#000',
      strokeStyle: '#000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      lineDashOffset: 0,
      miterLimit: 10,
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      direction: 'ltr',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      shadowBlur: 0,
      shadowColor: 'rgba(0, 0, 0, 0)',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      filter: 'none',
      save: NOOP,
      restore: NOOP,
      scale: NOOP,
      rotate: NOOP,
      translate: NOOP,
      transform: NOOP,
      setTransform: NOOP,
      resetTransform: NOOP,
      beginPath: NOOP,
      closePath: NOOP,
      moveTo: NOOP,
      lineTo: NOOP,
      bezierCurveTo: NOOP,
      quadraticCurveTo: NOOP,
      arc: NOOP,
      arcTo: NOOP,
      ellipse: NOOP,
      rect: NOOP,
      roundRect: NOOP,
      fill: NOOP,
      stroke: NOOP,
      clip: NOOP,
      isPointInPath: () => false,
      clearRect: NOOP,
      fillRect: NOOP,
      strokeRect: NOOP,
      fillText: NOOP,
      strokeText: NOOP,
      drawImage: NOOP,
      setLineDash: NOOP,
      getLineDash: () => [] as number[],
      // Chart.js only reads `width`, to size the tick labels.
      measureText: (text: string) => ({ width: String(text).length * 6 }),
      createLinearGradient: () => ({ addColorStop: NOOP }),
      createRadialGradient: () => ({ addColorStop: NOOP }),
      createPattern: () => null,
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      putImageData: NOOP,
    };
    return context as unknown as CanvasRenderingContext2D;
  } as unknown as HTMLCanvasElement['getContext'];
}
