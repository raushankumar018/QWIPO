# Qwipo

Full-stack e-commerce demo with a React + Vite frontend, a Node backend (Express-style server), and a Python-based recommender/ML service.

This repository contains three main parts:

- `frontend/` — Vite + React app that provides the UI.
- `backend/` — Node.js server and API, seed data, and routes/controllers.
- `src/` — Python recommendation services and FastAPI app (models: cf/cb/hybrid + LLM utilities).

Important files

- `.gitignore` — ignores node_modules, Python venvs, environment files, editor/OS artifacts.
- `requirements.txt` — Python dependencies for the recommender service.
- `backend/server.js` — backend server entrypoint.
- `backend/seed.js` — helper to seed example data (see `backend/data/`).
- `src/api.py` — FastAPI app for the recommender service.


Quick start (Windows / PowerShell)

1) Backend (Node)

- From the project root, install dependencies and start the backend. The `backend/package.json` provides two scripts: `start` (production) and `dev` (uses nodemon).

```powershell
cd .\backend
npm install
# start in development (auto-restarts on code changes)
npm run dev
# or run production start
npm start
```

The backend loads configuration from environment variables and defaults to port 5000 (see `backend/server.js`). If you need to change the port, set `PORT` in the environment.

If you want to seed sample data (seed helper provided):

```powershell
cd .\backend
node seed.js
```

2) Frontend (Vite + React)

- From project root, install and run the frontend dev server:

```powershell
cd .\frontend
npm install
npm run dev
```

Vite will print a local URL (commonly `http://localhost:5173` or similar). If the frontend needs to call the backend API, update the API base URL in the frontend code or configure a proxy.

3) Python recommender (FastAPI)

This service lives in `src/` and exposes a FastAPI app. The repo includes `requirements.txt` listing packages such as `fastapi`, `uvicorn`, `sentence-transformers`, and `google-generativeai`.

- Create and activate a virtual environment (PowerShell) and install requirements:

```powershell
cd .
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

- Start the recommender FastAPI app with uvicorn:

```powershell
# from repository root
uvicorn src.api:app --reload --host 127.0.0.1 --port 8000
```

The recommender exposes endpoints such as `POST /recommendations/{retailer_id}` which accepts a JSON body like:

```json
{
	"recent_behavior_ids": ["product_id_1", "product_id_2"]
}
```

If the Python service cannot connect to MongoDB, it will skip model initialization — check logs for connection errors. The service reads `MONGO_URI` from the environment; set it before starting if you run a remote or local MongoDB instance.

Environment variables

- A project-level `.env` is present in the root (contains `GEMINI_API_KEY` in this workspace). Remove any secrets before committing to a remote. Prefer creating a `.env.example` with variable names but no secret values.

Git and GitHub

- `.gitignore` is already added at the project root. Typical workflow to add and push to GitHub:

```powershell
# from project root
git init
git add .
git commit -m "Initial commit: add project files and .gitignore"
# add remote (replace with your repo URL)
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

Notes & troubleshooting

- Ports: Backend, frontend and the recommender service use distinct ports. If a port is already in use, update the respective server config or stop the conflicting service.
- Secrets: Remove any real API keys from checked-in files. Use `.env` for local development and add `.env` to `.gitignore` (already done).
- Python packages: If installation fails, make sure you are using a supported Python version (3.8+ recommended).
- Node: Use Node LTS where possible.

Contributing

Feel free to open issues or PRs. If you add new environment variables, add them to a tracked `/.env.example` so other developers know what's required.

Contact

If you want me to commit the `.gitignore` and this `README.md` to a repo and push to GitHub, tell me the target repo remote and branch and I will run the git commands for you and show the terminal output.

Example request & sample response

1) Prepare environment

 - Copy `.env.example` to `.env` and fill in real values (for local development only):

```powershell
copy .\env.example .\env
# then edit .env to add values
notepad .\env
```

2) Example request (PowerShell - using curl alias):

```powershell
# Replace <retailer-id> and host/port if different
$body = '{"recent_behavior_ids": ["prod_123","prod_456"]}'
curl -Method POST -Uri http://127.0.0.1:8000/recommendations/<retailer-id> -Body $body -ContentType 'application/json'
```

3) Example request (curl):

```bash
curl -X POST "http://127.0.0.1:8000/recommendations/<retailer-id>" \
	-H "Content-Type: application/json" \
	-d '{"recent_behavior_ids": ["prod_123","prod_456"]}'
```

4) Sample JSON response (trimmed):

```json
{
	"retailer_id": "<retailer-id>",
	"recommendations": [
		{"product_id": "prod_789", "title": "Premium Ketchup 500g", "score": 0.87},
		{"product_id": "prod_321", "title": "Organic Peanut Butter 1kg", "score": 0.74}
	],
	"explanation": {
		"items": [
			{"product_id": "prod_789", "title": "Premium Ketchup 500g", "text": "High repurchase rate in similar stores; pairs well with fast-moving snacks."},
			{"product_id": "prod_321", "title": "Organic Peanut Butter 1kg", "text": "Trending item in your area with strong margin potential."}
		],
		"tip": "Actionable Tip: Stock small trial packs to measure local demand quickly."
	}
}
```

Note: The exact response depends on your database contents, trained models and Gemini AI availability.