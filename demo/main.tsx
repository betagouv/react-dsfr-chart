import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@gouvfr/dsfr/dist/dsfr.min.css';
import '@gouvfr/dsfr/dist/utility/utility.min.css';
import '@gouvfr/dsfr-chart/PieChart/css';
import '@gouvfr/dsfr-chart/PieChart';
import '../src/styles/colors.generated.css';
import '../src/styles/chart.css';
import { App } from './App.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
