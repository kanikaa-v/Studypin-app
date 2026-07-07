# StudyPin — Full-Stack Study Corkboard

A colorful, Google-Keep-style study planner. Pin tasks to subjects, check them off, delete them anytime.

## Project structure
```
studypin-fullstack/
├── server.js          # Backend: plain Node.js HTTP server + REST API (no npm install needed)
├── data.json           # Storage file — subjects & notes live here
├── public/
│   ├── index.html      # Frontend markup
│   ├── style.css        # Frontend styling
│   └── script.js         # Frontend logic (talks to backend via fetch)
└── README.md
```

## How to run

1. Make sure you have [Node.js](https://nodejs.org) installed (v14+).
2. Open a terminal in this folder.
3. Run:
   ```bash
   node server.js
   ```
4. Open your browser to:
   ```
   http://localhost:3000
   ```

No `npm install` is required — the backend only uses Node's built-in `http`, `fs`, `path`, and `url` modules.

## API endpoints

| Method | Endpoint              | Description                          |
|--------|-----------------------|--------------------------------------|
| GET    | `/api/data`           | Get all subjects and notes           |
| POST   | `/api/subjects`       | Create a subject `{ name, color }`   |
| DELETE | `/api/subjects/:id`   | Delete a subject + its notes         |
| POST   | `/api/notes`          | Create a note `{ subjectId, text }`  |
| PATCH  | `/api/notes/:id`      | Update a note `{ done: true/false }` |
| DELETE | `/api/notes/:id`      | Delete a note                        |

## Notes for your GitHub submission

- This uses a **JSON file as a database** — simple and good for a student project, but every request reads/writes `data.json` on disk. For a class project this is fine; for production you'd swap in a real database (SQLite, MongoDB, etc.).
- To deploy this live (not just localhost), you'd need a host that runs Node.js persistently — e.g. Render, Railway, or Replit — since GitHub Pages only serves static files and can't run a backend.
- Feel free to mention in your README that this demonstrates: REST API design, file I/O, async/await, and fetch-based frontend-backend communication.
