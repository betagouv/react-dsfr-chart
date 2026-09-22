import '@testing-library/jest-dom/vitest';
import { stubCanvas } from './chartjs-canvas.js';

// The charts measure their tick labels with a canvas, which jsdom does not
// implement. The same stub serves the components and the Chart.js oracle, so
// both measure a label the same way.
stubCanvas();

/** jsdom implements no ResizeObserver. The charts only need the callback. */
class TestResizeObserver implements ResizeObserver {
  static instances: TestResizeObserver[] = [];
  disconnected = false;
  constructor(private callback: ResizeObserverCallback) {
    TestResizeObserver.instances.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  trigger() {
    this.callback([], this);
  }
}
globalThis.ResizeObserver = TestResizeObserver as unknown as typeof ResizeObserver;
(globalThis as Record<string, unknown>).TestResizeObserver = TestResizeObserver;

/** jsdom lays nothing out, so every element measures zero. Give the charts a width. */
export const TEST_WIDTH = 800;
Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
  configurable: true,
  writable: true,
  value(this: HTMLElement) {
    const width = this.classList.contains('chart') ? TEST_WIDTH : 0;
    return { width, height: 0, top: 0, left: 0, right: width, bottom: 0, x: 0, y: 0, toJSON: () => ({}) };
  },
});
