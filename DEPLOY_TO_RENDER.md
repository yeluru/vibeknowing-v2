# Deploying VibeKnowing V2 to Render.com

This guide outlines how to deploy the full VibeKnowing stack (Frontend, Backend, Worker, Database) to Render.com.

## Architecture Overview
You will deploy 4 services on Render:
1.  **PostgreSQL Database**: Managed relational database.
2.  **Web Service (API)**: Python FastAPI backend (`apps/api`).
3.  **Web Service (Worker)**: Python FastAPI worker (`vibeknowing-worker`).
4.  **Web Service (Frontend)**: Next.js frontend (`apps/web`).

---

## Step 1: Create the Database 🗄️
1.  Go to [Render Dashboard](https://dashboard.render.com).
2.  Click **New +** -> **PostgreSQL**.
3.  **Name**: `vibeknowing-db`
4.  **Region**: Choose closest to you (e.g., Oregon, Frankfurt).
5.  **Plan**: Free (for testing) or Starter.
6.  Click **Create Database**.
7.  **Wait** for it to become available.
8.  Copy the **Internal DB URL** (starts with `postgres://...`). You will need this for the other services.

---

## Step 2: Deploy the API Backend ⚙️
1.  Click **New +** -> **Web Service**.
2.  Connect your GitHub repository.
3.  **Name**: `vibeknowing-api`
4.  **Root Directory**: `vibeknowing-v2/apps/api`
5.  **Environment**: `Python 3`
6.  **Build Command**: `pip install -r requirements.txt`
7.  **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 10000`
8.  **Environment Variables**:
    *   `DATABASE_URL`: Paste the **Internal DB URL** from Step 1.
    *   `OPENAI_API_KEY`: Your OpenAI Key.
    *   `SECRET_KEY`: Generate a random string (e.g., `openssl rand -hex 32`).
    *   `WORKER_URL`: Set this later (after deploying Worker).
9.  Click **Create Web Service**.

---

## Step 3: Deploy the Worker 👷
1.  Click **New +** -> **Web Service**.
2.  Connect the **same** repository.
3.  **Name**: `vibeknowing-worker`
4.  **Root Directory**: `vibeknowing-worker`
5.  **Environment**: `Python 3`
6.  **Build Command**: `pip install -r requirements.txt`
7.  **Start Command**: `uvicorn worker:app --host 0.0.0.0 --port 10000`
8.  **Environment Variables**:
    *   `OPENAI_API_KEY`: Your OpenAI Key.
9.  Click **Create Web Service**.
10. **After Creation**: Copy the Worker's URL (e.g., `https://vibeknowing-worker.onrender.com`).
11. **Update API Env**: Go back to `vibeknowing-api` -> **Environment** -> Add `WORKER_URL` with this value.

---

## Step 4: Deploy the Frontend 🖥️
1.  Click **New +** -> **Web Service**.
2.  Connect the **same** repository.
3.  **Name**: `vibeknowing-web`
4.  **Root Directory**: `vibeknowing-v2/apps/web`
5.  **Environment**: `Node`
6.  **Build Command**: `npm install && npm run build`
7.  **Start Command**: `npm start`
8.  **Environment Variables**:
    *   `NEXT_PUBLIC_API_URL`: The URL of your `vibeknowing-api` service (e.g., `https://vibeknowing-api.onrender.com`).
9.  Click **Create Web Service**.

---

## Step 5: Initialize Production DB 🏁
Since Render's DB starts empty, you need to create the tables and admin user.
1.  Go to `vibeknowing-api` dashboard.
2.  Click **Shell** (Connect).
3.  Run the initialization commands:
    ```bash
    # Create tables
    python init_postgres.py
    
    # Create admin user (admin@localhost / admin)
    python seed_db.py
    ```

## Troubleshooting
*   **Logs**: Check the logs tab of each service if something fails.
*   **Cold Starts**: On the free tier, services spin down after inactivity. Initial requests may take 50s+.
