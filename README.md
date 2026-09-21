# react-dsfr-chart

Composants React de visualisation graphique pour le
[Système de Design de l'État](https://www.systeme-de-design.gouv.fr/).

Portage de [`@gouvfr/dsfr-chart`](https://github.com/GouvernementFR/dsfr-chart)
2.1.1 en SVG, sans aucune dépendance d'exécution : pas de Chart.js, pas de D3,
pas de chroma-js, pas de Vue.

> Version 0.1.0 — seul le `PieChart` est disponible. Le `BarChart` et le
> `LineChart` suivent.

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
| `unit-tooltip`     | `unitTooltip`      |                                                   |
| `date`             | `date`             |                                                   |
| `aspect-ratio`     | `aspectRatio`      | Défaut : `2`.                                     |
| —                  | `ariaLabel`        | Défaut : `Diagramme circulaire`.                  |
| —                  | `id`               |                                                   |
| —                  | `className`        |                                                   |
| —                  | `style`            |                                                   |

## Taille

Mesures `size-limit` (esbuild, minifié et gzippé, `react` externe) :

| Ce qui est chargé          | Taille    |
| -------------------------- | --------- |
| `PieChart`                 | 3,38 ko   |
| Feuille de style           | 1,54 ko   |
| Dépendances d'exécution    | 0         |

Pour comparaison, `@gouvfr/dsfr-chart` charge 116 ko pour le même graphique,
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

**Rendu serveur.** Le premier rendu produit le cadre et le tableau de données.
Le dessin arrive après le montage, quand la largeur est mesurée.

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
fenêtre de taille fixe, puis compte les pixels qui diffèrent. Neuf cas couvrent
l'anneau, le camembert, les deux thèmes et quatre palettes. Le seuil est de
0,5 % ; la mesure la plus haute est de 0,01 %.

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
