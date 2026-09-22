import type { DetailedHTMLProps, HTMLAttributes } from 'react';

type WebComponent = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  x: string;
  y: string;
  name?: string;
  date?: string;
  'aspect-ratio'?: string;
  'selected-palette'?: string;
  'unit-tooltip'?: string;
};

/** The web components of @gouvfr/dsfr-chart, which the demo shows side by side. */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'pie-chart': WebComponent & { subx?: string; suby?: string; fill?: string };
      'bar-chart': WebComponent & {
        subx?: string;
        suby?: string;
        stacked?: string;
        horizontal?: string;
        'bar-size'?: string;
        'max-bar-size'?: string;
        'highlight-index'?: string;
        'x-min'?: string;
        'x-max'?: string;
        'y-min'?: string;
        'y-max'?: string;
      };
      'line-chart': WebComponent & { 'x-min'?: string; 'x-max'?: string; 'y-min'?: string; 'y-max'?: string };
    }
  }
}

declare module '@gouvfr/dsfr-chart/PieChart';
declare module '@gouvfr/dsfr-chart/PieChart/css';
declare module '@gouvfr/dsfr-chart/BarChart';
declare module '@gouvfr/dsfr-chart/BarChart/css';
declare module '@gouvfr/dsfr-chart/LineChart';
declare module '@gouvfr/dsfr-chart/LineChart/css';
