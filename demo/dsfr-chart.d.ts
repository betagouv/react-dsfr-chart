import type { DetailedHTMLProps, HTMLAttributes } from 'react';

/** The web component of @gouvfr/dsfr-chart, which the demo shows side by side. */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'pie-chart': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        x: string;
        y: string;
        name?: string;
        subx?: string;
        suby?: string;
        fill?: string;
        date?: string;
        'aspect-ratio'?: string;
        'selected-palette'?: string;
        'unit-tooltip'?: string;
      };
    }
  }
}

declare module '@gouvfr/dsfr-chart/PieChart';
declare module '@gouvfr/dsfr-chart/PieChart/css';
