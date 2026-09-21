/** The example data of the storybook of @gouvfr/dsfr-chart (src/assets/data.js). */
export const doughnut = {
  x: ['Emplois à durée indéterminée', 'Non-salariés', 'Contrats à durée déterminée', 'Apprentis', 'Intérimaires'],
  y: [74.8, 11.7, 9.3, 1.6, 2.6],
  name: ['Emplois à durée indéterminée', 'Non-salariés', 'Contrats à durée déterminée', 'Apprentis', 'Intérimaires'],
  unitTooltip: '%',
};

export const pie = {
  x: ['Protection sociale', 'Santé', 'Affaires économiques', 'Services publics généraux', 'Autres', 'Enseignement', 'Défense'],
  y: [40.8, 15.6, 11.5, 10.6, 9.4, 9, 3.1],
  name: ['Protection sociale', 'Santé', 'Affaires économiques', 'Services publics généraux', 'Autres', 'Enseignement', 'Défense'],
  fill: true,
  unitTooltip: '%',
};

export const drilldown = {
  x: ['Google', 'Apple', 'Mozilla', 'Microsoft', 'Opera'],
  y: [10771923, 4532935, 2165000, 1589736, 124722],
  subX: [
    ['SmartPhone', 'Desktop', 'Tablet', 'SmallScreen', 'Tv'],
    ['SmartPhone', 'Desktop', 'SmallScreen'],
    ['Desktop', 'SmartPhone'],
    ['Desktop', 'SmartPhone', 'Tablet'],
    ['Desktop', 'SmartPhone', 'Tablet'],
  ],
  subY: [
    [6805604, 3806491, 158982, 740, 106],
    [3737323, 795533, 77],
    [2112000, 52999],
    [1544972, 44353, 411],
    [98533, 25000, 1189],
  ],
};
