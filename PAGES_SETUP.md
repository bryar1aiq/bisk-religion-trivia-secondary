# One-time GitHub Pages setup (fix "Get Pages site failed")

The workflow can only deploy **after** GitHub Pages is enabled in this repo. Do this once:

1. **Open your repo’s Pages settings** (click this link while logged into GitHub):  
   **https://github.com/bryar1aiq/bisk-religion-trivia-secondary/settings/pages**

2. Under **“Build and deployment”**:
   - **Source:** choose **“GitHub Actions”** (not “Deploy from a branch”).
   - Leave everything else as default.

3. Click **Save** (if the button is there).

4. Go to the **Actions** tab and run **“Deploy to GitHub Pages”** again (Run workflow → Run workflow).

After that, the site should be at: **https://bryar1aiq.github.io/bisk-religion-trivia-secondary/**
