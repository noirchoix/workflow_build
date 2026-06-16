# AI Workflow Builder

Production-style agent workflow studio for composing repository-aware AI workflows, automation patterns, test gates, security checks, approvals, and portable JSON/YAML exports.

## Backend

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8006
```

## Frontend

```bash
cd apps/web
npm install --registry=https://registry.npmjs.org/
cp .env.example .env
npm run dev -- --host 0.0.0.0
```

Set `VITE_API_BASE_URL=http://localhost:8006`.
