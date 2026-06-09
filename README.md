# Digital Budget Network Explorer

Semantic analysis of the German federal budget: Exploring budget keywords as an interactive network.

## Features

- **Scrollytelling Intro:** Guided tour with an animated background network
- **Two Graph Modes:** Switch between Keyword Co-Occurrence and Bipartite Graph (Keywords ↔ Ministries)
- **Live Filtering:** Filter by year, digitalization area, classification, and ministry
- **Wikidata Enrichment:** Live fetching of context (descriptions, images, Wikipedia links) via the Wikidata API
- **Data Scope:** 581 keywords · 1,147 budget titles · 26 ministries

## Tech Stack

- **Frontend:** Vite + React + TypeScript + Sigma.js (WebGL) + Graphology
- **Data Preprocessing:** Python + rdflib (Turtle → JSON)
- **Deployment:** Netlify

## Development

### Setup

```bash
cd web
npm install
npm run dev  # opens http://localhost:5173
```

### Data Preprocessing (Optional)

If you update the `digitalhaushalt.ttl` linked data file, regenerate the JSON graph data:

```bash
python3 preprocess_graph.py  # overwrites web/public/data/graph.json
```

**Note:** The preprocessing script requires Python 3.9+ and rdflib 7.6+. The generated `graph.json` is committed to the repository, so this step is only needed when the source data changes.

## Deployment (Netlify)

The app is optimized for static hosting on Netlify.

### Option A: Netlify CLI (Recommended)

```bash
npm install -g netlify-cli
netlify login
netlify init              # One-time setup: create/link site
netlify deploy --prod     # Deploy to production
```

### Option B: Netlify UI

1. Push this repository to GitHub
2. Go to Netlify → "Add new site" → "Import from Git"
3. Netlify will automatically detect the build settings from `netlify.toml`
4. Click Deploy

**Build Settings:**
- Base directory: `web`
- Build command: `npm run build`
- Publish directory: `web/dist`

These are already configured in `netlify.toml` and will be detected automatically.

## Project Structure

```
digital-budget-network-explorer/
├── digitalhaushalt.ttl              # Source: Linked Data budget dataset (Turtle)
├── preprocess_graph.py              # Script: TTL → JSON conversion
├── web/                             # Frontend application
│   ├── public/data/graph.json       # Preprocessed data (committed)
│   ├── src/
│   │   ├── components/              # React components
│   │   ├── story/                   # Scrollytelling screens
│   │   ├── graph/                   # Graph computation logic
│   │   └── services/                # Wikidata API
│   └── dist/                        # Build output (gitignored)
├── netlify.toml                     # Netlify config
└── README.md                        # This file
```

## Data Sources

- **`digitalhaushalt.ttl`** – Linked Data budget dataset (Turtle format, 8.5 MB)
- **Wikidata** – Live enrichment via public API (CORS-enabled)

The dataset contains budget items (`dh:Haushaltsposten`) linked to keywords via `dcterms:subject` and ministries via `dh:einzelplan`. Keywords and ministries reference Wikidata entities via `skos:exactMatch` and `owl:sameAs`.

## License

[See LICENSE](LICENSE)
