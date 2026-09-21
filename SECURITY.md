# Politique de sécurité

`react-dsfr-chart` est une bibliothèque publiée sur npm. Elle s'exécute dans le
navigateur de la personne qui visite le site qui l'installe, et pendant la
construction de ce site. Une faille ici se propage à chaque site consommateur :
les signalements sont pris au sérieux.

## Signaler une vulnérabilité

Merci de **ne pas** ouvrir d'issue publique pour une faille de sécurité.

**Contact** : [contact@zacharie.beta.gouv.fr](mailto:contact@zacharie.beta.gouv.fr)

Vous pouvez aussi utiliser
[l'avis de sécurité privé GitHub](https://github.com/betagouv/react-dsfr-chart/security/advisories/new),
qui reste invisible jusqu'à la publication du correctif.

Indiquez la version du paquet, le code qui déclenche le problème, et l'impact
que vous avez observé.

## Délais

- Accusé de réception sous 3 jours ouvrés.
- Première évaluation sous 10 jours ouvrés.
- Correctif publié sur npm dès que possible selon la criticité.

## Périmètre

- Le paquet npm `react-dsfr-chart` et son contenu (`dist/`).
- Le code source de `src/`, de `scripts/` et de la chaîne d'intégration continue.
- Les cas où une donnée passée en propriété (`x`, `y`, `name`, `unitTooltip`,
  `date`, `ariaLabel`) s'échappe du texte et devient du code exécutable.

## Hors périmètre

- Les vulnérabilités des dépendances de développement (`vitest`, `vite`,
  `playwright`) sans impact démontré sur le paquet publié. Ce paquet n'a
  **aucune dépendance d'exécution**.
- Le site de démonstration `demo/`, qui n'est pas déployé.
- Les attaques par déni de service et l'ingénierie sociale.
- `@gouvfr/dsfr-chart` et `@gouvfr/dsfr`, qui ont leurs propres dépôts.

## Mesures en place

| Mesure | Où |
| ------ | -- |
| Zéro dépendance d'exécution, vérifié à chaque commit | `scripts/check-package.mjs` |
| Contenu du paquet publié restreint à `dist/` et `README.md` | `scripts/check-package.mjs` |
| Signature de provenance npm liant le paquet à son commit | `.github/workflows/publish.yml` |
| Scripts d'installation des dépendances désactivés | `.npmrc` |
| Détection de secrets avant le commit | `.githooks/pre-commit` |
| Détection de secrets, audit des dépendances et des workflows | `.github/workflows/security.yml` |
| Analyse statique CodeQL et détection de secrets GitGuardian | activées par l'organisation betagouv |

## Pour les personnes qui contribuent

Installez le crochet de pré-commit après le clonage :

```sh
npm run hooks:install
```

Il refuse un commit qui contient un secret. Il a besoin de
[Gitleaks](https://github.com/gitleaks/gitleaks) (`brew install gitleaks`) et il
ne fait rien si l'outil est absent.
