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

1. On GitHub open your repo: **https://github.com/bryar1aiq/bisk-religion-trivia-secondary**
2. Go to **Settings** → **Pages** (left sidebar).
3. Under **Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch”). Save.
4. Go to the **Actions** tab. You should see the “Deploy to GitHub Pages” workflow. Either:
   - Click **Run workflow** → **Run workflow** to deploy now, or
   - Push a new commit to `main` to trigger it.
5. Wait 1–2 minutes. When the workflow run is green (✓), the site will be at:
   **https://bryar1aiq.github.io/bisk-religion-trivia-secondary/**

**Still 404?** Make sure in **Settings → Pages** the source is **GitHub Actions**. If it’s set to “Deploy from a branch”, the site won’t use the workflow and you’ll get 404.

## Other free hosting

- **Netlify:** [netlify.com](https://netlify.com) → Add new site → Import from Git → choose this repo. Build command: `npm run build`, publish directory: `dist`.
- **Vercel:** [vercel.com](https://vercel.com) → New Project → Import this repo. Same build/publish settings.
