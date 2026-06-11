# Digital Budget Network Explorer (Sprachnetzwerk Digitalhaushalt)

<p align="center">
  <em>A semantic analysis and interactive visualization of the German federal budget, exploring how keywords and ministries connect in the realm of digitalization.</em>
</p>

---

## About the Project

This network explorer was developed as part of a **Challenge by Agora Digitale Transformation**. The Agora calculated the German federal "digital budget" by classifying budget titles based on extracted keyword stems. 

This is a prototype that was developed quickly and may contain errors.
To learn more about how the data was generated, what uncertainties it contains, and how it can be interpreted, visit the [Agora website](https://agoradigital.de/projekte/digitalhaushalt/) and read about the method used to generate the original dataset.

We have extracted the keywords from this dataset that are associated with digital budget items.

We transformed their raw dataset into a **Linked Data Knowledge Graph (RDF/Turtle)**. Every keyword is modeled as an individual concept, linked via co-occurrence to other keywords and assigned to the respective ministries (Einzelpläne). 

To enhance the dataset, we algorithmically linked keywords to **Wikidata** entities (assisted by AI and manually verified). This allows the application to fetch live context (descriptions, images, categories) and categorize the semantic landscape into high-level groups like *Technology*, *Law/Strategy*, or *Infrastructure*.

**The Goal:** To make the digital budget accessible and explorable. The visualization shows which terms dominate the budget, which topics are funded across multiple ministries, where unique niche terms appear, and how thematic trends shift over the years.

## Features

- **Scrollytelling Intro:** A guided, cinematic tour introducing the concept with an animated background network.
- **Two Graph Modes:** 
  - **Keyword-Network:** Discover themes that frequently appear together (Co-Occurrence).
  - **Keyword ↔ Ministry:** Explore bipartite links to see which institutions drive which topics.
- **Live Filtering:** Filter the network by year, digitalization area, classification, primary group/function, and ministry.
- **Wikidata Enrichment:** Live fetching of context (descriptions, images, Wikipedia links) and automatic categorization of nodes via the Wikidata API.
- **Data Scope:** 735 keywords · 1,158 budget titles · 4,302 budget items (posten) · 25 ministries.

## Tech Stack

- **Frontend:** Vite + React + TypeScript
- **Network Rendering:** Sigma.js (WebGL) + Graphology + ForceAtlas2 layout
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

If you update the `digitalhaushalt_transformed...csv` or the `digitalhaushalt.ttl` linked data file, regenerate the JSON graph data:

```bash
# 1. (Optional) Convert CSV to TTL
python3 csv_to_ttl.py --input <your_csv_file>

# 2. (Optional) Update Wikidata mapping cache
python3 keywords_wikidata.py --input <your_csv_file>

# 3. Generate the compact graph.json for the frontend
python3 preprocess_graph.py
```

**Note:** The preprocessing script requires Python 3.9+ and `rdflib`. The generated `graph.json` is committed to the repository, so this step is only needed when the source data changes.

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

## Project Structure

```text
digital-budget-network-explorer/
├── digitalhaushalt.ttl              # Source: Linked Data budget dataset (Turtle)
├── preprocess_graph.py              # Script: TTL → JSON conversion
├── csv_to_ttl.py                    # Script: CSV → TTL conversion
├── keywords_wikidata.py             # Script: Wikidata mapping & caching
├── web/                             # Frontend application
│   ├── public/data/graph.json       # Preprocessed data (loaded by browser)
│   ├── src/
│   │   ├── components/              # React components (Sidebar, Modals)
│   │   ├── story/                   # Scrollytelling screens & logic
│   │   ├── graph/                   # Graph computation logic
│   │   └── services/                # Wikidata API fetching
│   └── dist/                        # Build output (gitignored)
├── netlify.toml                     # Netlify config
└── README.md                        # This file
```

## License

[See LICENSE](LICENSE)

---

## Credits

<table>
  <tr>
    <td>
      A project by: <a href="https://www.technologiestiftung-berlin.de/en/">
        <br />
        <br />
        <img width="150" src="https://logos.citylab-berlin.org/logo-technologiestiftung-berlin-en.svg" alt="Technologiestiftung Berlin Logo" />
      </a>
    </td>
  </tr>
</table>

