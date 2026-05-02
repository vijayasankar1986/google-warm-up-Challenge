/**
 * Dashboard — Board listing and creation
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!API.getToken()) { window.location.href = '/index.html'; return; }

  const user = API.getUser();
  const tenant = API.getTenant();
  document.getElementById('userName').textContent = user.name;
  document.getElementById('tenantName').textContent = tenant.name;

  const userInitial = document.getElementById('userInitial');
  userInitial.textContent = user.name.charAt(0).toUpperCase();
  userInitial.style.background = user.avatarColor || '#6C63FF';

  document.getElementById('logoutBtn').addEventListener('click', () => {
    API.clearToken(); window.location.href = '/index.html';
  });

  const boardsGrid = document.getElementById('boardsGrid');
  const modal = document.getElementById('createBoardModal');
  const createBoardForm = document.getElementById('createBoardForm');

  const colors = ['#6C63FF','#FF6B6B','#4ECDC4','#FFD93D','#A8E6CF','#FF8A5C','#EA5455','#7367F0'];

  document.getElementById('newBoardBtn').addEventListener('click', () => modal.classList.add('active'));
  document.getElementById('closeModal').addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

  // Color picker
  const colorPicker = document.getElementById('colorPicker');
  let selectedColor = colors[0];
  colors.forEach(c => {
    const dot = document.createElement('div');
    dot.className = 'color-dot' + (c === selectedColor ? ' active' : '');
    dot.style.background = c;
    dot.addEventListener('click', () => {
      colorPicker.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      selectedColor = c;
    });
    colorPicker.appendChild(dot);
  });

  createBoardForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await API.post('/boards', {
        title: document.getElementById('boardTitle').value,
        description: document.getElementById('boardDesc').value,
        color: selectedColor,
      });
      modal.classList.remove('active');
      createBoardForm.reset();
      loadBoards();
    } catch (err) { alert(err.message); }
  });

  async function loadBoards() {
    try {
      const boards = await API.get('/boards');
      boardsGrid.innerHTML = '';

      // Update metrics
      const metricTotalBoards = document.getElementById('metricTotalBoards');
      if (metricTotalBoards) {
        metricTotalBoards.textContent = boards.length;
      }

      if (boards.length === 0) {
        boardsGrid.innerHTML = `<div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>No boards yet</h3>
          <p>Create your first board to get started</p>
        </div>`;
        return;
      }

      boards.forEach(b => {
        const card = document.createElement('div');
        card.className = 'board-card';
        card.style.borderTopColor = b.color;
        card.innerHTML = `
          <div class="board-card-header" style="background:${b.color}20">
            <h3>${escapeHtml(b.title)}</h3>
            <button class="delete-board-btn" data-id="${b.id}" title="Delete board">✕</button>
          </div>
          <p class="board-card-desc">${escapeHtml(b.description || 'No description')}</p>
          <div class="board-card-meta">
            <span>${b.listCount || 0} lists</span>
            <span class="board-creator">
              <span class="avatar-sm" style="background:${b.creator_avatar}">${b.creator_name.charAt(0)}</span>
              ${escapeHtml(b.creator_name)}
            </span>
          </div>`;
        card.addEventListener('click', (e) => {
          if (e.target.classList.contains('delete-board-btn')) return;
          window.location.href = `/board.html?id=${b.id}`;
        });
        card.querySelector('.delete-board-btn').addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm(`Delete "${b.title}"?`)) {
            await API.delete(`/boards/${b.id}`);
            loadBoards();
          }
        });
        boardsGrid.appendChild(card);
      });
    } catch (err) {
      boardsGrid.innerHTML = `<div class="empty-state"><p>Error loading boards</p></div>`;
    }
  }

  loadBoards();
});

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}
