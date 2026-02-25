# bisk-religion-trivia-secondary

Islamic Quiz Contest app built for a competition at BISK School.

## About

A 3-round Islamic quiz: Round 1 (question board, 8 per team), Round 2 (prophet guessing from hints, 2 per team), and a final speed round for the top 2 teams. Includes team scoring, tie-breaker when scores are tied, and respectful use of ﷺ after the name of Prophet Muhammad ﷺ.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Host on GitHub Pages (free)

1. Push the latest code (including the `.github/workflows/deploy-pages.yml` file).
2. On GitHub: open your repo → **Settings** → **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. After the next push to `main`, the workflow will build and deploy. Your site will be at:
   **https://bryar1aiq.github.io/bisk-religion-trivia-secondary/**

## Other free hosting

- **Netlify:** [netlify.com](https://netlify.com) → Add new site → Import from Git → choose this repo. Build command: `npm run build`, publish directory: `dist`.
- **Vercel:** [vercel.com](https://vercel.com) → New Project → Import this repo. Same build/publish settings.
