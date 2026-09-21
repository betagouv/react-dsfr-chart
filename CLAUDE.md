# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Overview

`react-dsfr-chart` is a React port of [`@gouvfr/dsfr-chart`](https://github.com/GouvernementFR/dsfr-chart)
2.1.1 — the chart library of the French government design system (DSFR). It draws
with plain SVG and ships **zero runtime dependencies**.

The upstream weighs 116 kB gzipped for a single pie, because it bundles Vue and
Chart.js into every entry point. That is the whole reason this package exists.

| Folder        | Role                                                         |
| ------------- | ------------------------------------------------------------ |
| `src/core/`   | Geometry, palette, formatting, shared components             |
| `src/<Chart>/`| One folder per chart = one subpath export                    |
| `src/styles/` | `chart.css` (hand-written) + `colors.generated.css`          |
| `scripts/`    | `gen-colors.mjs`, the build-time colour generator            |
| `tests/`      | vitest + jsdom, including parity tests against Chart.js      |
| `visual/`     | Playwright, pixel comparison against the upstream web component |
| `demo/`       | Vite app: our charts side by side with `@gouvfr/dsfr-chart`  |

Status: `PieChart` only. `BarChart` and `LineChart` follow. Charts out of scope
for v1: BarLine, Scatter, Radar, Gauge, DataBox, Table, maps.

## Source of truth

The upstream repository is the specification. Before writing a chart, read:

- `src/components/{Pie,Bar,Line}Chart.vue` — behaviour and Chart.js options
- `src/utils/colors.js` — palette derivation
- `src/utils/global.js` — `formatNumber`, `capitalize`, Chart.js defaults
- `src/assets/colors.json` — the raw tokens (mirrored in `scripts/dsfr-colors.json`)
- `src/styles/{Tooltip,Legend,style}.scss`

Port the behaviour, including the bugs, unless the bug is visible to the user
and the fix is explicitly recorded in this file. Do **not** port: Vue, the
`Teleport`/`databox*` props, the `isMobile` user-agent regex, the FRANCE and
WORLD lookup tables.

## Work Rules

- **Beyond a single-file change**: present a short plan (files touched, what is
  ported from where, deviations that need validation) and wait for the go.
- **Simplest solution that works**: no opportunistic refactor of surrounding code.
- **Verification**: `npm run typecheck`, `npm test`, `npm run size`. Run
  `npm run test:visual` when the change can alter a drawing (geometry, colour,
  layout, CSS). Don't leave a dev server running.
- `typecheck` uses `noEmit`: **no output + exit code 0 = success**. Don't re-run
  thinking the output was truncated.

| Command             | What it checks                                        |
| ------------------- | ----------------------------------------------------- |
| `npm run typecheck` | `src`, `tests`, `demo`, `scripts`, `visual`           |
| `npm test`          | vitest, `tests/**/*.test.{ts,tsx}`                    |
| `npm run size`      | builds, then the budgets of `.size-limit.json`        |
| `npm run test:visual` | Playwright, ours vs upstream, pixel by pixel        |
| `npm run gen:colors`| regenerates the colour tables (chroma-js, dev only)   |
| `npm run demo`      | the side-by-side page, port 5175                      |

## Hard Rules (non-negotiable)

- **Zero runtime dependencies.** The only `peerDependency` is `react`. Chart.js,
  chroma-js and Playwright are development dependencies: they exist to *verify*
  our output, never to produce it. Adding a runtime dependency defeats the
  purpose of the package.
- **No bundler.** Plain `tsc` to ESM, one output file per source file. A bundled
  per-entry build duplicates `core/` inside every chart — the exact mistake the
  upstream makes. Imports carry the `.js` extension because the build uses
  `NodeNext`.
- **Colour values live in CSS, never in JavaScript.** Every colour a chart emits
  is `var(--rdc-…)` or a `color-mix()` of two of them. This is what makes a theme
  change free. Never read `document.documentElement.getAttribute('data-fr-theme')`,
  never listen to the `dsfr.theme` event, never ship a hexadecimal value in a
  `.ts` file.
- **Never edit a generated file.** `src/styles/colors.generated.css`,
  `src/core/colors.generated.ts` and `tests/fixtures/colors.json` are the output
  of `scripts/gen-colors.mjs`. Change the generator and run it. CI fails if the
  committed files differ from a fresh run.
- **Generate only the colours a chart can name.** `colors.json` holds fifteen
  numbered tokens; only 01–08 are a palette. 09/10 are the ends of the
  sequential scale, 11/13/15 the stops of the divergent one, 12 and 14 unused.
  Those feed the generator and must not reach the stylesheet.
- **The public API never exposes an engine object.** No Chart.js option bag, no
  SVG node, no internal geometry type in a prop or a return value.
- **Real pixels, no `viewBox` scaling.** The `<svg>` carries the measured
  `width`/`height`. Scaling through a `viewBox` would scale the text too, which
  breaks the DSFR type scale.
- **SSR-safe.** No `window`, `document` or `ResizeObserver` at import time. The
  first render produces the frame and the data table; the drawing appears after
  mount, when the width is known.

## Anti-Patterns (never do)

- No `chroma(...)` at runtime. Colour derivation happens in `gen-colors.mjs`.
- No `useEffect` to compute a path. Geometry is a `useMemo` of the props.
- No `dangerouslySetInnerHTML` for a path, a tooltip or a legend.
- No prop that takes a JSON string. The upstream does it because a web component
  attribute is a string; React props are typed values.
- No `any` to get past a Chart.js type in a test. Declare the shape you read.
- No test that asserts a hard-coded geometry value where Chart.js can be asked
  for the answer instead.

## Design Principles

**Parity first, then improve.** A drawing must match the upstream pixel for
pixel. Anything that differs is a deliberate, recorded decision — see
"Intentional deviations" below. The visual test enforces this.

**Accessibility is the reason to switch.** The upstream gives a screen reader a
`<canvas>` with a label and nothing else. Every chart here carries:

- `role="img"` + `aria-label` on the `<svg>` (same French defaults:
  `Diagramme circulaire`, `Graphique en barres`, `Graphique en ligne`)
- a `fr-sr-only` `<table>` holding the data
- a legend as a `<ul>` (`display: contents` keeps the upstream layout)
- focusable slices, bars and points, with the tooltip on focus as well as hover
- no transition under `prefers-reduced-motion`

**The tooltip and the legend are DOM, not SVG.** They reuse the DSFR classes
(`fr-text--sm`, `fr-mb-0`, …) so they inherit the design system's type and
colours, and they stay readable at any zoom level.

**Scoped CSS.** Every rule sits under `.rdc`, so this package and
`@gouvfr/dsfr-chart` can load on the same page. DSFR variables carry a fallback
(`var(--grey-1000-50, #ffffff)`): the chart stays legible without the DSFR
stylesheet.

## Coding Principles

- TypeScript, `strict`. React 19, function components, hooks only.
- A ported function keeps the upstream name (`generateColors`, `choosePalette`,
  `formatNumber`) and a doc comment naming the file it came from.
- Comments describe the current behaviour and the *why*, especially where the
  code reproduces something surprising ("the upstream fills every slice of a
  divergent palette with the same colour"). Never narrate the session ("we first
  tried X, then changed to Y").
- Constants that come from Chart.js defaults are named and commented
  (`BORDER_WIDTH`, `PADDING_X`), never inlined as a magic number.
- French for user-facing strings, English for code and comments.
- No formatter is configured. Match the file you are in: single quotes, semicolons,
  trailing commas, two-space indent, long lines rather than wrapped ones.

## Size Budget

`.size-limit.json` holds measured values, not aspirations. When a change grows
the output, either shrink it or raise the budget **in the same commit**, with
the new measurement in the message.

| Entry            | Budget  |
| ---------------- | ------- |
| `PieChart`       | 3.4 kB  |
| Stylesheet       | 1.6 kB  |
| Runtime deps     | 0       |

Targets for the full set: Pie + Bar + Line ≤ 15 kB gzipped.

## Tests

- **Geometry** (`tests/arc.test.ts`): builds a real Chart.js chart in jsdom
  through the stub context of `tests/chartjs-canvas.ts`, then compares centre,
  radii, angles and tooltip anchors over a table of sizes and data sets. A size
  whose ratio is not the chart's `aspectRatio` is not a valid case — Chart.js
  clamps it.
- **Colours** (`tests/colors.test.ts`): the generated stylesheet against a fresh
  chroma-js computation, both themes.
- **Palette** (`tests/palette.test.ts`): resolves our `var()` / `color-mix()`
  output to hexadecimal and compares with `chroma.scale().domain([max, min])`.
  One channel of tolerance: the upstream rounds each stop before interpolating.
- **Components**: render, prop change redraws, unmount disconnects the
  `ResizeObserver`, data table content, tooltip on hover and on focus, legend
  defaults.
- **Visual** (`visual/pie.spec.ts`): same data, both libraries, fixed viewport,
  `deviceScaleFactor: 1`. Tolerance 0.5 % of pixels; the highest measurement is
  0.01 %. A self-check compares a doughnut with a pie and requires the harness
  to report a difference — a result of 0.00 % proves nothing otherwise.

## Intentional deviations from `@gouvfr/dsfr-chart`

Don't "fix" these back:

- **Drill-down colours are recalculated** from the values on screen. The upstream
  keeps the first level's colours, so with a sequential palette a slice shows a
  colour that no longer matches its value. Identical result for a categorical
  palette.
- **`x` and `y` drop the outer array.** The upstream reads index 0 only. Drop the
  outer array wherever that is true, and nowhere else.
- **No custom-colour prop.** Upstream 2.1.1 exposes none for pie, bar and line;
  its `tmpColorParse` branch is dead code. If one is ever added, derive the hover
  colour with a CSS `filter: brightness()`, never with chroma-js at runtime.
- **`LineChart` gains `fill?: boolean`** (area), which the upstream lacks. It
  exists to replace `recharts`' `AreaChart`.
- **Hover colours differ per chart, as upstream does**: `darken(0.8)` for pie and
  bar, `brighten(0.5)` for line. Keep the asymmetry.
- **Value-based palettes interpolate in CSS**, so the hover colour of a scaled
  slice is an approximation of the upstream's. Accepted.

## Commits

Messages **in French**, describing the functional impact, not the technical
details. Format `<type>: <description>` or `<type>(<scope>): <description>`.
No uppercase after the prefix, no trailing period.

- Types: `feat:`, `fix:`, `perf:`, `docs:`, `test:`, `chore:`, `chore(deps):`
- Scopes (optional): `(pie)`, `(bar)`, `(line)`, `(core)`, `(demo)`

```bash
# ✅ says what changes for whoever uses the library
feat(pie): second niveau au clic sur une part
perf(core): 0,34 ko de CSS en moins, les couleurs 09 à 15 ne sont plus émises

# ❌ too technical
fix: change fill attribute computation in PieChart.tsx
```

A `perf:` commit carries the measurement. A commit that changes a drawing says
so, so the visual test result is easy to find later.

## Pull Requests

- **Title**: same format as commits.
- **Description**: only if necessary, a short descriptive text. No bullet points,
  no auto-generated sections.
- Signal explicitly when a change touches `src/core/arc.ts`, `src/core/palette.ts`
  or `scripts/gen-colors.mjs`: those affect every chart.

## Success Criteria

A good implementation:

- matches the upstream drawing within the visual tolerance, in both themes
- adds no runtime dependency and no byte the size budget did not expect
- switches theme without running any JavaScript
- gives a screen reader the data, not just a label
- renders on a server without touching `window`
- ports the upstream maths against a Chart.js oracle, not against a guess

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, list the unresolved questions, if any.

## CI

`.github/workflows/ci.yml`: typecheck → unit tests → size budgets → colour
generator idempotence → Playwright visual parity. Difference images are uploaded
as an artifact when a visual test fails.
