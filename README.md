# react-dsfr-chart

Composants React de visualisation graphique pour le
[Système de Design de l'État](https://www.systeme-de-design.gouv.fr/).

Portage de [`@gouvfr/dsfr-chart`](https://github.com/GouvernementFR/dsfr-chart)
2.1.1 en SVG, sans aucune dépendance d'exécution : pas de Chart.js, pas de D3,
pas de chroma-js, pas de Vue.

> Version 0.1.0 — `PieChart`, `BarChart` et `LineChart`.

## Installation

```sh
npm install react-dsfr-chart
```

Avant la publication sur npm, le paquet s'installe depuis l'archive attachée à
chaque [release GitHub](https://github.com/betagouv/react-dsfr-chart/releases) :

```sh
npm install https://github.com/betagouv/react-dsfr-chart/releases/download/v0.1.0/react-dsfr-chart-0.1.0.tgz
```

```ts
import { PieChart } from 'react-dsfr-chart/PieChart';
import { BarChart } from 'react-dsfr-chart/BarChart';
import { LineChart } from 'react-dsfr-chart/LineChart';
import 'react-dsfr-chart/css';
```

## Utilisation

```tsx
<PieChart
  x={['Emplois à durée indéterminée', 'Non-salariés', 'Apprentis']}
  y={[74.8, 11.7, 1.6]}
  name={['Emplois à durée indéterminée', 'Non-salariés', 'Apprentis']}
  unitTooltip="%"
/>
```

```tsx
<BarChart
  x={['2025', '2030', '2035']}
  y={[[69.1, 70.3, 71.4]]}
  name={['Population en millions']}
  selectedPalette="default"
  unitTooltip="millions"
/>
```

```tsx
<LineChart
  x={[2001, 2002, 2003]}
  y={[[51.5, 55.3, 61.5]]}
  name={['Indice des prix']}
  fill
/>
```

## Des attributs du composant web aux propriétés React

`@gouvfr/dsfr-chart` est un composant web : chaque attribut est une chaîne de
caractères, souvent du JSON. Ici, chaque propriété a son type réel.

| `<pie-chart>`      | `<PieChart>`       | Note                                              |
| ------------------ | ------------------ | ------------------------------------------------- |
| `x="[[…]]"`        | `x: string[]`      | Le tableau externe disparaît : seul `[0]` est lu.  |
| `y="[[…]]"`        | `y: number[]`      | Idem.                                             |
| `subx="[[…]]"`     | `subX: string[][]` | Le second niveau, ouvert par un clic.             |
| `suby="[[…]]"`     | `subY: number[][]` |                                                   |
| `name="[…]"`       | `name: string[]`   | Défaut : `Série 1`, `Série 2`, …                  |
| `fill="true"`      | `fill: boolean`    | `true` : camembert. `false` (défaut) : anneau.    |
| `selected-palette` | `selectedPalette`  |                                                   |
| —                  | `colors: string[]` | Une couleur par part. Absent de la version amont. |
| `unit-tooltip`     | `unitTooltip`      |                                                   |
| `date`             | `date`             |                                                   |
| `aspect-ratio`     | `aspectRatio`      | Défaut : `2`.                                     |
| —                  | `height: number`   | Une hauteur fixe, en pixels. Remplace `aspectRatio`. |
| —                  | `ariaLabel`        | Défaut : `Diagramme circulaire`.                  |
| —                  | `id`               |                                                   |
| —                  | `className`        |                                                   |
| —                  | `style`            |                                                   |

### `<BarChart>`

| `<bar-chart>`      | `<BarChart>`          | Note                                             |
| ------------------ | --------------------- | ------------------------------------------------ |
| `x="[[…]]"`        | `x: string[]`         | Le tableau externe disparaît.                    |
| `y="[[…], […]]"`   | `y: number[][]`       | Un tableau par série.                            |
| `subx` · `suby`    | `subX` · `subY`       | Le second niveau, ouvert par un clic.            |
| `name="[…]"`       | `name: string[]`      | Défaut : `Série 1`, `Série 2`, …                 |
| `stacked="true"`   | `stacked: boolean`    |                                                  |
| `horizontal="true"`| `horizontal: boolean` |                                                  |
| `bar-size`         | `barSize`             | Défaut : `'flex'`.                               |
| `max-bar-size`     | `maxBarSize`          | Défaut : `32`. `0` retire la limite.             |
| `highlight-index`  | `highlightIndex`      | Avec la palette `neutral`.                       |
| `x-min` · `x-max`  | `xMin` · `xMax`       | Une borne que l’axe englobe.                     |
| `y-min` · `y-max`  | `yMin` · `yMax`       |                                                  |
| —                  | `categorySize`        | La hauteur d’une catégorie, en pixels. Graphique horizontal seulement. |

### `<LineChart>`

| `<line-chart>`     | `<LineChart>`           | Note                                              |
| ------------------ | ----------------------- | ------------------------------------------------- |
| `x="[[…]]"`        | `x: (string\|number)[]` | Des nombres donnent un axe linéaire.              |
| `y="[[…], […]]"`   | `y: number[][]`         | Un tableau par série.                             |
| `name="[…]"`       | `name: string[]`        |                                                   |
| —                  | `fill: boolean`         | Remplit sous la courbe. Absent de la version amont. |
| `x-min` · `x-max`  | `xMin` · `xMax`         |                                                   |
| `y-min` · `y-max`  | `yMin` · `yMax`         |                                                   |

`vline`, `hline` et leurs attributs de couleur et de nom ne sont pas portés :
la version amont les signale comme non documentés et non destinés à l’usage.

Les trois graphiques acceptent aussi `selectedPalette`, `colors`,
`unitTooltip`, `date`, `aspectRatio`, `height`, `ariaLabel`, `id`, `className`
et `style`.

### La hauteur

Par défaut la hauteur suit la largeur, divisée par `aspectRatio`. `height` la
fixe en pixels, quelle que soit la largeur.

Un graphique en barres horizontal a une troisième option : `categorySize`
donne la hauteur d’une catégorie, axes compris, et la hauteur du graphique
suit alors le nombre de catégories.

```tsx
<BarChart x={regions} y={[valeurs]} horizontal categorySize={40} />
```

`height` l’emporte sur `categorySize`, qui l’emporte sur `aspectRatio`. Un
graphique vertical ignore `categorySize` : ses catégories se suivent sur la
largeur, que le conteneur donne.

### La propriété `colors`

Elle remplace la palette, part par part pour le camembert, série par série pour
les barres et la courbe. Une entrée absente ou illisible garde sa couleur de
palette, et le second niveau prend toujours la palette.

```tsx
<PieChart x={['A', 'B', 'C']} y={[60, 25, 15]} colors={['#000091', 'var(--ma-couleur)', 'red']} />
```

Sont acceptées les formes simples : `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()`,
`rgba()`, `hsl()`, `hwb()`, `lab()`, `lch()`, `oklab()`, `oklch()`,
`var(--nom)` et un mot-clé comme `red` ou `currentcolor`. Toute autre écriture
est refusée : une couleur donnée par l'application hôte ne doit pas pouvoir
faire charger un fichier distant.

La couleur n'est jamais écrite dans le dessin. Le graphique la pose sur son
conteneur, dans `--rdc-custom-0`, `--rdc-custom-1`, et les parts portent
`fill="var(--rdc-custom-0)"`. La couleur de survol vient d'un
`filter: brightness()` en CSS, jamais de chroma-js à l'exécution : `0,78` pour
le camembert et les barres, `1,155` pour la courbe, les deux facteurs les plus
proches du `darken(0.8)` et du `brighten(0.5)` de la version amont.

## Taille

Mesures `size-limit` (esbuild, minifié et gzippé, `react` externe) :

| Ce qui est chargé           | Taille    |
| --------------------------- | --------- |
| `PieChart`                  | 3,88 ko   |
| `BarChart`                  | 7,20 ko   |
| `LineChart`                 | 6,27 ko   |
| Les trois ensemble          | 9,89 ko   |
| Feuille de style            | 2,04 ko   |
| Dépendances d'exécution     | 0         |

Les trois ensemble pèsent moins que deux pris séparément : le cœur commun
n'est pas dupliqué par point d'entrée.

Pour comparaison, `@gouvfr/dsfr-chart` charge 116 ko pour un seul camembert,
Chart.js 52 ko et Recharts 100 ko.

## Ce qui change par rapport à `@gouvfr/dsfr-chart`

**Accessibilité.** Le graphique porte un `role="img"` et une étiquette, comme
en amont, mais il est accompagné d'un tableau de données réservé aux lecteurs
d'écran. La légende est une liste. Chaque part reçoit le focus au clavier et
ouvre son infobulle. Une préférence de mouvement réduit supprime la transition.

**Thème.** Les couleurs sont des propriétés personnalisées CSS. Un changement
de thème ne coûte aucun JavaScript : le composant n'écoute pas l'événement
`dsfr.theme`.

**Second niveau.** Les couleurs du second niveau sont recalculées à partir des
valeurs affichées. La version amont conserve celles du premier niveau, ce qui
donne, avec une palette séquentielle, des couleurs qui ne correspondent plus
aux valeurs.

**Étiquettes pivotées.** Quand les étiquettes de catégories sont trop longues,
Chart.js les fait pivoter après une négociation en plusieurs passes entre ses
boîtes de mise en page. Ce portage ne la reproduit pas : l'angle peut être plus
raide de 3 degrés, la zone de tracé se décaler de 4 pixels, et l'axe des
valeurs porter moins de graduations. Sans rotation, la zone de tracé est
identique au pixel près.

**Couleurs choisies.** La propriété `colors` n'existe pas en amont pour ces
trois graphiques : sa branche `tmpColorParse` est du code mort. Voir « La
propriété `colors` » plus haut.

**Rendu serveur.** Le premier rendu produit le cadre et le tableau de données.
Le dessin arrive après le montage, quand la largeur est mesurée.

## Ce qui reste à faire

`@gouvfr/dsfr-chart` propose onze graphiques. Trois sont portés. Voici les huit
autres, avec ce qu'ils demandent réellement, maintenant que le cœur commun
(échelles, graduations, mise en page, courbe, barres) existe et qu'il est
vérifié face à Chart.js.

### Prochaine étape évidente

**`BarLineChart`** — des barres et une courbe sur deux axes de valeurs. Tout
existe déjà : `core/plot.ts`, `core/bars.ts`, `core/spline.ts` et `core/Axes.tsx`.
Il manque un second axe de valeurs sur la droite et le port de
`generateBarLineChartColors`. C'est le graphique le moins cher et le plus
utile : il couvre les tableaux de bord qui superposent un volume et un taux.

**`GaugeChart`** — une jauge. `core/arc.ts` fait déjà les arcs du camembert ;
il faut un arc partiel, une aiguille et le texte central. Peu de code.

**`TableChart`** — un tableau, sans dessin. Aucune géométrie. Le tableau
accessible (`core/DataTable.tsx`) en est déjà la moitié.

### Ensuite

**`ScatterChart`** — un nuage de points. Deux axes linéaires : `core/scale.ts`
sait déjà le faire, et `core/plot.ts` accepte déjà un axe d'index linéaire. Il
faut y ajouter les lignes de repère verticales et horizontales, que le
`LineChart` n'a volontairement pas.

**`RadarChart`** — un radar. Géométrie polaire entièrement nouvelle : axes en
étoile, grille polygonale, échelle radiale. Rien à réutiliser au-delà des
palettes.

**`DataBox`** — un cadre qui porte un titre, une valeur et un graphique. En Vue,
la version amont s'appuie sur `Teleport` et sur des attributs `databox-*` ; en
React, c'est une simple composition de composants. Le travail est de concevoir
l'API, pas de la coder.

### À traiter à part

**`MapChart` et `MapChartReg`** — les cartes de France, des régions, des
académies et du monde. Elles demandent les tables `FRANCE` et `WORLD`
(1 875 lignes en amont) et les tracés SVG de chaque territoire. Le poids de ces
données dépasse à lui seul celui de toute la bibliothèque actuelle. Si ces
cartes arrivent un jour, elles doivent être un point d'entrée séparé, et chaque
fond de carte doit se charger indépendamment, sinon la raison d'être de ce
paquet disparaît.

### Améliorations qui ne sont pas des graphiques

- **Fermer l'écart sur les étiquettes pivotées.** Voir la section précédente :
  l'angle diffère de 3 degrés au plus. Il faudrait porter la négociation en
  plusieurs passes entre les boîtes de mise en page de Chart.js
  (`layouts.update` et `fitBoxes`).
- **Une valeur écrite sur chaque barre**, à la manière du `LabelList` de
  Recharts. Absent de la version amont, mais souvent demandé.
- **Des tests d'accessibilité automatisés** sur les trois graphiques.

## Développement

```sh
npm run gen:colors     # régénère les couleurs à partir de chroma-js
npm test               # vitest, dont les tests de parité avec Chart.js
npm run build          # tsc, ESM, un module par fichier
npm run size           # size-limit
npm run check:package  # contenu et dépendances du paquet publié
npm run test:visual    # Playwright : compare le rendu avec celui de la version amont
npm run demo           # comparaison côte à côte avec @gouvfr/dsfr-chart
npm run hooks:install  # crochet de pré-commit : recherche de secrets
```

Le test visuel dessine le même graphique avec les deux bibliothèques, dans une
fenêtre de taille fixe, puis compte les pixels qui diffèrent. Vingt-cinq cas
couvrent les trois graphiques, les deux thèmes et six palettes. Le camembert
reste sous 0,01 % : son texte est dans le DOM. Les barres et les lignes posent
leurs étiquettes dans le SVG, qu'un canvas ne rend jamais à l'identique ; chaque
cas porte la mesure du jour (0,9 % à 12,7 %) et le test autorise un point de
plus.

## Sécurité

La bibliothèque n'a **aucune dépendance d'exécution** : le seul code qui arrive
dans le navigateur est celui de ce dépôt. `npm run check:package` le vérifie à
chaque commit, avec le contenu de l'archive publiée.

Le texte passé en propriété (`x`, `name`, `unitTooltip`, `date`, `ariaLabel`)
traverse React et reste du texte. La bibliothèque n'utilise jamais
`dangerouslySetInnerHTML` ; `tests/security.test.tsx` le tient en place.

Chaque version publiée porte une attestation de provenance npm, qui la relie au
commit et au workflow qui l'ont produite :

```sh
npm audit signatures
```

Pour signaler une faille, lisez [SECURITY.md](SECURITY.md).

## Licence

MIT
