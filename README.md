# RepLog

RepLog is a single-user workout tracker backed by FastAPI, SQLAlchemy, and SQLite, with a React/Vite interface.

## Run locally

Start the API from `backend/`:

```sh
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend uses `backend/.env` for its local settings and SQLite database URL. The existing database is preserved; startup creates missing tables and adds the optional plan target-weight column to older databases.

In another terminal, start the UI from `frontend/`:

```sh
npm install
npm run dev
```

The Vite development server runs on port 5173 by default. API documentation is available at `http://127.0.0.1:8000/docs`.

## Workout data

Live workouts and historical entries use the same persisted session, exercise, and set records. A live session remains active until explicitly finished, so refreshing or reopening RepLog resumes it from SQLite. Historical entries are saved as completed sessions and cannot become active.

Training volume is completed set weight in kilograms multiplied by repetitions. Unweighted or incomplete sets do not contribute volume. Estimated one-rep max uses the Epley formula (`weight × (1 + reps / 30)`) and is an estimate, not a tested maximum.

## Checks

Run the frontend production build with `cd frontend && npm run build`. Run the backend workflow tests with `cd backend && .venv/bin/python -m unittest discover -s tests`.# replog
# replog
