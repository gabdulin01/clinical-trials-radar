# Clinical Trials Radar

An open-source, zero-backend explorer for current clinical study records from [ClinicalTrials.gov](https://clinicaltrials.gov/). Search by condition and location, inspect recruitment geography, compare trial phases, and filter the latest records without an API key.

> The interface is currently in Russian. Contributions adding more languages are welcome.

## Features

- Live ClinicalTrials.gov API v2 search
- Condition and location queries
- Recruitment, results, phase, and study-type filters
- A focused view of completed studies without posted results
- Phase distribution and country overview
- Direct links to authoritative study records
- Shareable search URLs
- Responsive and keyboard-accessible interface
- No analytics, cookies, backend, or API key

ClinicalTrials.gov search terms generally work best in English; the interface explains results in Russian.

## Quick start

Requirements: Node.js 20 or newer.

```bash
npm run dev
```

Open `http://127.0.0.1:4173`.

Tests and static checks:

```bash
npm test
npm run check
```

## Deploy to GitHub Pages

1. Create a GitHub repository and push this project to its `main` branch.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions**.
4. The included workflow tests the project and publishes the `dist` directory.

The application is entirely static. Browser requests go directly to the public ClinicalTrials.gov API.

## Data and responsible use

ClinicalTrials.gov is maintained by the U.S. National Library of Medicine. Study information is submitted by sponsors and investigators. A listed study is not an endorsement, and the data should not be used as medical advice or as proof that an intervention is safe or effective.

When redistributing ClinicalTrials.gov data, retain source attribution, the processing date, and a description of modifications. Review the official [terms and conditions](https://clinicaltrials.gov/about-site/terms-conditions).

## Architecture

```text
dist/
  index.html       application shell
  styles.css       responsive visual system
  app.js           UI, API requests, rendering, WebMCP hook
  lib.js           normalization, filtering, summaries
tests/
  lib.test.mjs     unit tests
scripts/
  serve.mjs        dependency-free local server
  check.mjs        static release checks
```

## Privacy

Search terms are sent only to ClinicalTrials.gov and reflected in the page URL so a search can be shared. This project does not collect personal data. Do not enter personal health information into the search fields.

## License

Source code is available under the [MIT License](LICENSE). ClinicalTrials.gov data remains subject to its own terms.
