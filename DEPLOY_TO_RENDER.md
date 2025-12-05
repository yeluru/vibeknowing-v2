# Deploying VibeKnowing V2 to Render.com

This guide will walk you through deploying the full VibeKnowing V2 stack (Frontend, Backend, and Database) to Render.com using Infrastructure as Code (IaC).

## Prerequisites

1.  A [Render.com](https://render.com) account.
2.  Your GitHub repository connected to Render.
3.  An **OpenAI API Key** ready to use.

## Step 1: Push Your Code

Ensure your latest code is pushed to GitHub, including the `render.yaml` file in the root directory.

```bash
git add .
git commit -m "chore: add render deployment configuration"
git push origin main
```

## Step 2: Create a New Blueprint Instance

1.  Log in to your Render Dashboard.
2.  Click the **New +** button and select **Blueprint**.
3.  Connect your GitHub repository (`vibeknowing-v2`).
4.  Render will automatically detect the `render.yaml` file.

## Step 3: Configure Environment Variables

Render will show you the resources it's about to create:
-   `vibeknowing-db` (PostgreSQL Database)
-   `vibeknowing-api` (Python Backend)
-   `vibeknowing-web` (Node.js Frontend)

It will ask for one required environment variable:
-   **OPENAI_API_KEY**: Paste your OpenAI API key here.

## Step 4: Apply Blueprint

Click **Apply Blueprint**. Render will now:
1.  Provision a PostgreSQL database.
2.  Build and deploy the Backend API (and connect it to the DB).
3.  Build and deploy the Frontend (and connect it to the API).

This process typically takes 5-10 minutes.

## Step 5: Verify Deployment

Once the deployment finishes:
1.  Go to the **Dashboard**.
2.  Click on the **vibeknowing-web** service.
3.  Click the URL (e.g., `https://vibeknowing-web.onrender.com`).
4.  Your app should be live!

## Troubleshooting

### Database Migrations
The blueprint sets up the database but doesn't automatically run migrations (table creation). You might need to run them manually the first time.

1.  Go to the **vibeknowing-api** service in Render Dashboard.
2.  Click **Shell** to open a terminal in the running container.
3.  Run the migration command:
    ```bash
    cd apps/api
    python -m migrations.init_db
    ```
    *(Note: Ensure you have a migration script or use `python -c "from database import engine; from models import Base; Base.metadata.create_all(bind=engine)"` if you don't have a dedicated migration script yet.)*

### Build Failures
-   **Frontend**: Check the logs. If it fails on `npm install`, ensure `package-lock.json` is consistent.
-   **Backend**: Ensure `requirements.txt` has all dependencies.

### CORS Issues
If the frontend can't talk to the backend:
1.  Check the `vibeknowing-api` logs.
2.  You might need to update `main.py` to allow the specific Render frontend URL in `CORSMiddleware`.
    -   Currently, it allows `["*"]` (all origins), so it should work out of the box.

## Free Plan Limitations
-   **Spin-down**: Free web services on Render spin down after 15 minutes of inactivity. The first request might take 30-60 seconds to load.
-   **Database**: The free PostgreSQL database expires after 90 days. Upgrade to a paid plan for persistence.
