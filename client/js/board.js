/**
 * Kanban Board — Lists, Cards, Drag & Drop
 */
let boardId, members = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!API.getToken()) { window.location.href = '/index.html'; return; }

  const params = new URLSearchParams(window.location.search);
  boardId = params.get('id');
  if (!boardId) { window.location.href = '/dashboard.html'; return; }

  const user = API.getUser();
  const userInitial = document.getElementById('userInitial');
  userInitial.textContent = user.name.charAt(0).toUpperCase();
  userInitial.style.background = user.avatarColor || '#6C63FF';

  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = '/dashboard.html';
  });
  document.getElementById('logoutBtn').addEventListener('click', () => {
    API.clearToken(); window.location.href = '/index.html';
  });

  loadMembers();
  loadBoard();
});

async function loadMembers() {
  try { members = await API.get('/auth/members'); } catch (e) { members = []; }
}

async function loadBoard() {
  try {
    const data = await API.get(`/boards/${boardId}/lists`);
    document.getElementById('boardTitle').textContent = data.board.title;
    document.getElementById('boardTitle').style.borderBottomColor = data.board.color;
    renderLists(data.lists);
  } catch (err) {
    document.getElementById('listsContainer').innerHTML =
      '<div class="empty-state"><p>Error loading board</p></div>';
  }
}

function renderLists(lists) {
  const container = document.getElementById('listsContainer');
  container.innerHTML = '';

  lists.forEach(list => {
    const col = document.createElement('div');
    col.className = 'list-column';
    col.dataset.listId = list.id;
    col.innerHTML = `
      <div class="list-header">
        <h3 class="list-title">${escapeHtml(list.title)}</h3>
        <span class="card-count">${list.cards.length}</span>
        <button class="list-menu-btn" title="Delete list">✕</button>
      </div>
      <div class="cards-container" data-list-id="${list.id}"></div>
      <button class="add-card-btn">+ Add Card</button>`;

    const cardsContainer = col.querySelector('.cards-container');
    list.cards.forEach(card => cardsContainer.appendChild(createCardEl(card)));

    // Drag-drop zone
    cardsContainer.addEventListener('dragover', handleDragOver);
    cardsContainer.addEventListener('drop', handleDrop);
    cardsContainer.addEventListener('dragenter', (e) => { e.preventDefault(); cardsContainer.classList.add('drag-over'); });
    cardsContainer.addEventListener('dragleave', (e) => { if (!cardsContainer.contains(e.relatedTarget)) cardsContainer.classList.remove('drag-over'); });

    // Add card
    col.querySelector('.add-card-btn').addEventListener('click', () => showAddCardForm(cardsContainer, list.id));
    // Delete list
    col.querySelector('.list-menu-btn').addEventListener('click', async () => {
      if (confirm(`Delete "${list.title}" and all its cards?`)) {
        await API.delete(`/lists/${list.id}`);
        loadBoard();
      }
    });

    container.appendChild(col);
  });

  // Add list button
  const addListCol = document.createElement('div');
  addListCol.className = 'list-column add-list-column';
  addListCol.innerHTML = '<button class="add-list-btn">+ Add List</button>';
  addListCol.querySelector('.add-list-btn').addEventListener('click', () => showAddListForm(addListCol));
  container.appendChild(addListCol);
}

function createCardEl(card) {
  const el = document.createElement('div');
  el.className = 'card';
  el.draggable = true;
  el.dataset.cardId = card.id;
  el.dataset.listId = card.list_id;

  const priorityColors = { high: '#EA5455', medium: '#FFD93D', low: '#28C76F' };
  const dueDateStr = card.due_date ? new Date(card.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const isOverdue = card.due_date && new Date(card.due_date) < new Date();

  el.innerHTML = `
    <div class="card-priority" style="background:${priorityColors[card.priority] || priorityColors.medium}"></div>
    <div class="card-body">
      <div class="card-title">${escapeHtml(card.title)}</div>
      ${card.description ? `<div class="card-desc">${escapeHtml(card.description).substring(0, 80)}</div>` : ''}
      <div class="card-footer">
        <div class="card-tags">
          ${dueDateStr ? `<span class="card-due ${isOverdue ? 'overdue' : ''}">${dueDateStr}</span>` : ''}
          <span class="card-badge priority-${card.priority}">${card.priority}</span>
        </div>
        ${card.assignee_name ? `<span class="avatar-sm" style="background:${card.assignee_avatar}" title="${escapeHtml(card.assignee_name)}">${card.assignee_name.charAt(0)}</span>` : ''}
      </div>
    </div>
    <div class="card-actions">
      <button class="card-edit-btn" title="Edit">✎</button>
      <button class="card-delete-btn" title="Delete">✕</button>
    </div>`;

  el.addEventListener('dragstart', handleDragStart);
  el.addEventListener('dragend', handleDragEnd);

  el.querySelector('.card-delete-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    await API.delete(`/cards/${card.id}`);
    el.remove();
    updateCardCounts();
  });

  el.querySelector('.card-edit-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    showEditCardModal(card);
  });

  return el;
}

// --- Drag and Drop ---
let draggedCard = null;

function handleDragStart(e) {
  draggedCard = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.cardId);
}

function handleDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  draggedCard = null;
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const afterEl = getDragAfterElement(this, e.clientY);
  if (afterEl) this.insertBefore(draggedCard, afterEl);
  else this.appendChild(draggedCard);
}

async function handleDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  const cardId = e.dataTransfer.getData('text/plain');
  const newListId = this.dataset.listId;
  const cards = [...this.querySelectorAll('.card')];
  const newPos = cards.findIndex(c => c.dataset.cardId === cardId);

  try {
    await API.put(`/cards/${cardId}/move`, { list_id: parseInt(newListId), position: newPos });
    updateCardCounts();
  } catch (err) { loadBoard(); }
}

function getDragAfterElement(container, y) {
  const els = [...container.querySelectorAll('.card:not(.dragging)')];
  return els.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateCardCounts() {
  document.querySelectorAll('.list-column:not(.add-list-column)').forEach(col => {
    const count = col.querySelectorAll('.card').length;
    col.querySelector('.card-count').textContent = count;
  });
}

// --- Add Card Form ---
function showAddCardForm(container, listId) {
  if (container.parentElement.querySelector('.add-card-form')) return;
  const form = document.createElement('div');
  form.className = 'add-card-form';
  form.innerHTML = `
    <textarea id="newCardTitle" placeholder="Card title..." rows="2"></textarea>
    <div class="add-card-actions">
      <button class="btn-add">Add</button>
      <button class="btn-cancel">✕</button>
    </div>`;
  container.parentElement.querySelector('.add-card-btn').before(form);
  form.querySelector('textarea').focus();

  form.querySelector('.btn-add').addEventListener('click', async () => {
    const title = form.querySelector('textarea').value.trim();
    if (!title) return;
    try {
      const card = await API.post(`/lists/${listId}/cards`, { title });
      container.appendChild(createCardEl(card));
      updateCardCounts();
      form.remove();
    } catch (err) { alert(err.message); }
  });
  form.querySelector('.btn-cancel').addEventListener('click', () => form.remove());
}

// --- Add List Form ---
function showAddListForm(addListCol) {
  if (addListCol.querySelector('.add-list-form')) return;
  addListCol.innerHTML = `
    <div class="add-list-form">
      <input type="text" placeholder="List title..." id="newListTitle" />
      <div class="add-card-actions">
        <button class="btn-add" id="addListSubmit">Add List</button>
        <button class="btn-cancel" id="addListCancel">✕</button>
      </div>
    </div>`;
  addListCol.querySelector('input').focus();

  document.getElementById('addListSubmit').addEventListener('click', async () => {
    const title = document.getElementById('newListTitle').value.trim();
    if (!title) return;
    try {
      await API.post(`/boards/${boardId}/lists`, { title });
      loadBoard();
    } catch (err) { alert(err.message); }
  });
  document.getElementById('addListCancel').addEventListener('click', () => loadBoard());
}

// --- Edit Card Modal ---
function showEditCardModal(card) {
  let modal = document.getElementById('editCardModal');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'editCardModal';
  modal.className = 'modal active';

  const memberOptions = members.map(m => `<option value="${m.id}" ${card.assigned_to == m.id ? 'selected' : ''}>${m.name}</option>`).join('');

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header"><h2>Edit Card</h2><button class="close-modal">✕</button></div>
      <form id="editCardForm">
        <label>Title</label>
        <input type="text" id="editTitle" value="${escapeHtml(card.title)}" required />
        <label>Description</label>
        <textarea id="editDesc" rows="3">${escapeHtml(card.description || '')}</textarea>
        <label>Priority</label>
        <select id="editPriority">
          <option value="low" ${card.priority==='low'?'selected':''}>Low</option>
          <option value="medium" ${card.priority==='medium'?'selected':''}>Medium</option>
          <option value="high" ${card.priority==='high'?'selected':''}>High</option>
        </select>
        <label>Assign To</label>
        <select id="editAssignee"><option value="">Unassigned</option>${memberOptions}</select>
        <label>Due Date</label>
        <input type="date" id="editDueDate" value="${card.due_date ? card.due_date.substring(0,10) : ''}" />
        <button type="submit" class="btn-primary">Save Changes</button>
      </form>
    </div>`;
  document.body.appendChild(modal);

  modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  document.getElementById('editCardForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await API.put(`/cards/${card.id}`, {
        title: document.getElementById('editTitle').value,
        description: document.getElementById('editDesc').value,
        priority: document.getElementById('editPriority').value,
        assigned_to: document.getElementById('editAssignee').value || null,
        due_date: document.getElementById('editDueDate').value || null,
      });
      modal.remove();
      loadBoard();
    } catch (err) { alert(err.message); }
  });
}

function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
