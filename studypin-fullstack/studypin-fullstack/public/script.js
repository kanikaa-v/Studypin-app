const PALETTE = ['var(--yellow)','var(--pink)','var(--blue)','var(--green)','var(--purple)','var(--orange)'];
const API = '/api';

let data = { subjects: [], notes: [] };
let activeSubject = 'all';
let selectedColor = PALETTE[0];

/* ---------------- API HELPERS ---------------- */
async function apiGet(path){
  const res = await fetch(API + path);
  if(!res.ok) throw new Error('Request failed: ' + path);
  return res.json();
}
async function apiPost(path, body){
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if(!res.ok) throw new Error('Request failed: ' + path);
  return res.json();
}
async function apiPatch(path, body){
  const res = await fetch(API + path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if(!res.ok) throw new Error('Request failed: ' + path);
  return res.json();
}
async function apiDelete(path){
  const res = await fetch(API + path, { method: 'DELETE' });
  if(!res.ok) throw new Error('Request failed: ' + path);
  return res.json();
}

async function loadAllData(){
  try{
    data = await apiGet('/data');
    renderTabs();
    renderBoard();
  }catch(e){
    showError('Could not reach the server. Is server.js running?');
  }
}

function showError(msg){
  let banner = document.querySelector('.status-banner');
  if(!banner){
    banner = document.createElement('div');
    banner.className = 'status-banner';
    document.querySelector('header').after(banner);
  }
  banner.textContent = '⚠ ' + msg;
}
function clearError(){
  const banner = document.querySelector('.status-banner');
  if(banner) banner.remove();
}

/* ---------------- SUBJECT MODAL ---------------- */
function openSubjectModal(){
  document.getElementById('subjectModal').classList.remove('hidden');
  document.getElementById('subjectNameInput').value = '';
  selectedColor = PALETTE[data.subjects.length % PALETTE.length];
  renderSwatches();
  document.getElementById('subjectNameInput').focus();
}
function closeSubjectModal(){
  document.getElementById('subjectModal').classList.add('hidden');
}
function renderSwatches(){
  const row = document.getElementById('swatchRow');
  row.innerHTML = '';
  PALETTE.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'swatch' + (c === selectedColor ? ' selected' : '');
    sw.style.background = c;
    sw.onclick = () => { selectedColor = c; renderSwatches(); };
    row.appendChild(sw);
  });
}
async function createSubject(){
  const name = document.getElementById('subjectNameInput').value.trim();
  if(!name) return;
  try{
    await apiPost('/subjects', { name, color: selectedColor });
    clearError();
    closeSubjectModal();
    await loadAllData();
  }catch(e){
    showError('Could not create subject.');
  }
}
async function deleteSubject(id, evt){
  evt.stopPropagation();
  if(!confirm('Delete this subject and all its notes?')) return;
  try{
    await apiDelete('/subjects/' + id);
    if(activeSubject === id) activeSubject = 'all';
    clearError();
    await loadAllData();
  }catch(e){
    showError('Could not delete subject.');
  }
}

/* ---------------- TABS ---------------- */
function renderTabs(){
  const row = document.getElementById('tabsRow');
  row.innerHTML = '';

  const allTab = document.createElement('button');
  allTab.className = 'tab all' + (activeSubject === 'all' ? ' active' : '');
  allTab.innerHTML = `All <span class="count">${data.notes.length}</span>`;
  allTab.onclick = () => { activeSubject = 'all'; renderTabs(); renderBoard(); };
  row.appendChild(allTab);

  data.subjects.forEach(s => {
    const count = data.notes.filter(n => n.subjectId === s.id).length;
    const tab = document.createElement('button');
    tab.className = 'tab' + (activeSubject === s.id ? ' active' : '');
    tab.style.background = s.color;
    tab.innerHTML = `${s.name} <span class="count">${count}</span> <button class="del-subject" title="delete subject">×</button>`;
    tab.onclick = () => { activeSubject = s.id; renderTabs(); renderBoard(); };
    tab.querySelector('.del-subject').onclick = (e) => deleteSubject(s.id, e);
    row.appendChild(tab);
  });
}

/* ---------------- BOARD / NOTES ---------------- */
function renderBoard(){
  const board = document.getElementById('board');
  board.innerHTML = '';

  if(data.subjects.length === 0){
    board.innerHTML = `<div class="empty-state"><span class="icon">📌</span><p>Add a subject first — then start pinning tasks.</p></div>`;
    return;
  }

  const visibleNotes = activeSubject === 'all'
    ? data.notes
    : data.notes.filter(n => n.subjectId === activeSubject);

  if(visibleNotes.length === 0){
    board.innerHTML = `<div class="empty-state"><span class="icon">🗒️</span><p>No notes here yet — pin your first task.</p></div>`;
  } else {
    visibleNotes.forEach(note => board.appendChild(renderNote(note)));
  }

  const tile = document.createElement('div');
  if(activeSubject === 'all'){
    tile.className = 'add-note-tile';
    tile.textContent = '+ pick a subject tab to add a note';
    tile.style.cursor = 'default';
    tile.style.opacity = '0.6';
  } else {
    tile.className = 'add-note-tile';
    tile.textContent = '+ pin a new task';
    tile.onclick = () => showAddNoteForm(tile);
  }
  board.appendChild(tile);
}

function showAddNoteForm(tile){
  const subject = data.subjects.find(s => s.id === activeSubject);
  const form = document.createElement('div');
  form.className = 'add-note-form';
  form.style.background = subject.color;
  form.innerHTML = `
    <textarea placeholder="What do you need to do?" maxlength="140" autofocus></textarea>
    <div class="form-row">
      <button class="btn-cancel">Cancel</button>
      <button class="btn-pin">Pin it</button>
    </div>
  `;
  tile.replaceWith(form);
  const textarea = form.querySelector('textarea');
  textarea.focus();
  form.querySelector('.btn-cancel').onclick = () => renderBoard();
  form.querySelector('.btn-pin').onclick = async () => {
    const text = textarea.value.trim();
    if(!text) return;
    try{
      await apiPost('/notes', { subjectId: activeSubject, text });
      clearError();
      await loadAllData();
    }catch(e){
      showError('Could not save note.');
    }
  };
  textarea.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)) form.querySelector('.btn-pin').click();
  });
}

function renderNote(note){
  const subject = data.subjects.find(s => s.id === note.subjectId);
  const el = document.createElement('div');
  el.className = 'note' + (note.done ? ' done' : '');
  el.style.background = subject ? subject.color : 'var(--yellow)';
  const tilt = (Math.round(Math.random()*6) - 3);
  el.style.transform = `rotate(${tilt}deg)`;

  el.innerHTML = `
    <div class="pin-dot"></div>
    <div class="note-text"></div>
    <div class="note-footer">
      <span class="note-tag">${subject ? subject.name : ''}</span>
      <div class="note-actions">
        <button class="note-check" title="mark done">✓</button>
        <button class="note-delete" title="delete">×</button>
      </div>
    </div>
  `;
  el.querySelector('.note-text').textContent = note.text;

  el.querySelector('.note-check').onclick = async () => {
    try{
      await apiPatch('/notes/' + note.id, { done: !note.done });
      clearError();
      await loadAllData();
    }catch(e){
      showError('Could not update note.');
    }
  };
  el.querySelector('.note-delete').onclick = () => {
    el.classList.add('removing');
    setTimeout(async () => {
      try{
        await apiDelete('/notes/' + note.id);
        clearError();
        await loadAllData();
      }catch(e){
        showError('Could not delete note.');
      }
    }, 300);
  };

  return el;
}

/* ---------------- INIT ---------------- */
loadAllData();
