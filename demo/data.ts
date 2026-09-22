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

/** The bar chart examples of the storybook of @gouvfr/dsfr-chart. */
export const barVertical = {
  x: ['2025', '2030', '2035', '2040', '2050', '2060', '2070'],
  y: [[69.1, 70.3, 71.4, 72.5, 74, 75.2, 76.4]],
  name: ['Population en millions'],
  selectedPalette: 'default' as const,
  unitTooltip: 'millions',
};

export const barUnicolor = {
  x: ['15 à 29 ans', '30 à 44 ans', '45 à 59 ans', '60 à 74 ans', '75 ans ou plus'],
  y: [[75.4, 80.5, 66.8, 43.4, 12.1]],
  name: ['Achat sur internet au cours des 12 derniers mois (%)'],
  selectedPalette: 'neutral' as const,
  unitTooltip: '%',
  highlightIndex: [3, 4],
};

export const barSequential = {
  x: ['Nouvelle-Aquitaine', 'Hauts-de-France', 'Bourgogne-Franche-Comté', 'Auvergne-Rhône-Alpes', 'Normandie', 'Bretagne', 'Pays de la Loire', 'Occitanie', 'Grand Est', 'Centre-Val de Loire', 'Île-de-France', 'Provence-Alpes-Côte d’Azur', 'Corse'],
  y: [[1071, 927, 921, 850, 845, 838, 821, 793, 789, 771, 734, 485, 482]],
  name: ['Hauteur des précipitations (en mm)'],
  selectedPalette: 'sequentialDescending' as const,
  unitTooltip: 'mm',
};

export const barHorizontal = {
  x: ['2000', '2010', '2020'],
  y: [[11.1, 10.5, 8.4], [8.8, 7.5, 5.6]],
  name: ['Empreinte carbone', 'Émission sur le territoire national'],
  horizontal: true,
  barSize: 20,
  unitTooltip: 'tonnes',
};

export const barStacked = {
  x: ['Ensemble des Français', 'Agglomération parisienne', 'Communauté urbaine de province', 'Commune rurale'],
  y: [[15, 19, 15, 12], [34, 31, 36, 33], [51, 50, 49, 55]],
  name: ['Souvent', 'Parfois', 'Jamais'],
  stacked: true,
  unitTooltip: '%',
};

/** The line chart examples of the storybook of @gouvfr/dsfr-chart. */
export const lineDefault = {
  x: [2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020],
  y: [[51.5, 55.3, 61.5, 70.2, 81.1, 92.6, 100.2, 104.6, 96.9, 98.0, 104.9, 106.8, 104.7, 102.7, 100.2, 100.4, 102.9, 106.0, 109.1, 114.6]],
  name: ['Indices des prix des logements anciens'],
  selectedPalette: 'default' as const,
  unitTooltip: 'points d’indice',
};

export const lineMultiple = {
  x: [1975, 1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020],
  y: [[54.5, 58.2, 58.1, 59.6, 62.1, 64, 65.9, 67.1, 69, 69.2], [83.9, 83.2, 78.4, 75.9, 74.7, 75.3, 75.2, 75, 75.6, 74.8]],
  name: ['Femmes', 'Hommes'],
  unitTooltip: '%',
};
