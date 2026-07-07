/**
 * StudyPin backend server
 * -------------------------------------------
 * Plain Node.js (no Express, no npm install needed).
 * Serves the frontend from /public and exposes a small
 * REST API backed by a JSON file (data.json) as storage.
 *
 * Run with:  node server.js
 * Then open: http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const DATA_FILE = path.join(__dirname, 'data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3000;

/* ---------------- storage helpers ---------------- */
function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (e) {
    return { subjects: [], notes: [] };
  }
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------------- request helpers ---------------- */
function sendJSON(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json'
};

function serveStatic(req, res, pathname) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(PUBLIC_DIR, safePath);

  // prevent path traversal outside /public
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' });
    res.end(content);
  });
}

/* ---------------- server ---------------- */
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  try {
    // GET all data (subjects + notes)
    if (pathname === '/api/data' && req.method === 'GET') {
      return sendJSON(res, 200, loadData());
    }

    // Create a subject
    if (pathname === '/api/subjects' && req.method === 'POST') {
      const body = await readBody(req);
      if (!body.name) return sendJSON(res, 400, { error: 'name is required' });
      const data = loadData();
      const subject = { id: uid(), name: body.name, color: body.color || 'var(--yellow)' };
      data.subjects.push(subject);
      saveData(data);
      return sendJSON(res, 201, subject);
    }

    // Delete a subject (and its notes)
    const subjectMatch = pathname.match(/^\/api\/subjects\/([^/]+)$/);
    if (subjectMatch && req.method === 'DELETE') {
      const id = subjectMatch[1];
      const data = loadData();
      data.subjects = data.subjects.filter((s) => s.id !== id);
      data.notes = data.notes.filter((n) => n.subjectId !== id);
      saveData(data);
      return sendJSON(res, 200, { success: true });
    }

    // Create a note
    if (pathname === '/api/notes' && req.method === 'POST') {
      const body = await readBody(req);
      if (!body.subjectId || !body.text) {
        return sendJSON(res, 400, { error: 'subjectId and text are required' });
      }
      const data = loadData();
      const note = { id: uid(), subjectId: body.subjectId, text: body.text, done: false };
      data.notes.unshift(note);
      saveData(data);
      return sendJSON(res, 201, note);
    }

    // Update a note (toggle done)
    const noteMatch = pathname.match(/^\/api\/notes\/([^/]+)$/);
    if (noteMatch && req.method === 'PATCH') {
      const id = noteMatch[1];
      const body = await readBody(req);
      const data = loadData();
      const note = data.notes.find((n) => n.id === id);
      if (!note) return sendJSON(res, 404, { error: 'note not found' });
      if (typeof body.done === 'boolean') note.done = body.done;
      saveData(data);
      return sendJSON(res, 200, note);
    }

    // Delete a note
    if (noteMatch && req.method === 'DELETE') {
      const id = noteMatch[1];
      const data = loadData();
      data.notes = data.notes.filter((n) => n.id !== id);
      saveData(data);
      return sendJSON(res, 200, { success: true });
    }

    // Fallback: static files (index.html, style.css, script.js)
    if (req.method === 'GET') {
      return serveStatic(req, res, pathname);
    }

    sendJSON(res, 404, { error: 'not found' });
  } catch (err) {
    sendJSON(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`StudyPin server running at http://localhost:${PORT}`);
});
