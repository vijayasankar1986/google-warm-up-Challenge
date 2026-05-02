const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const tenantMiddleware = require('../middleware/tenant');

const router = express.Router();

// All routes require auth + tenant
router.use(authMiddleware, tenantMiddleware);

/**
 * GET /api/boards
 * List all boards for the current tenant
 */
router.get('/', async (req, res) => {
  try {
    const boards = await db('boards')
      .where({ 'boards.tenant_id': req.tenantId })
      .join('users', 'boards.created_by', 'users.id')
      .select(
        'boards.*',
        'users.name as creator_name',
        'users.avatar_color as creator_avatar'
      )
      .orderBy('boards.created_at', 'desc');

    // Get list counts for each board
    const boardIds = boards.map((b) => b.id);
    const listCounts = await db('lists')
      .whereIn('board_id', boardIds)
      .where({ tenant_id: req.tenantId })
      .groupBy('board_id')
      .select('board_id')
      .count('* as count');

    const listCountMap = {};
    listCounts.forEach((lc) => {
      listCountMap[lc.board_id] = parseInt(lc.count);
    });

    const enrichedBoards = boards.map((b) => ({
      ...b,
      listCount: listCountMap[b.id] || 0,
    }));

    res.json(enrichedBoards);
  } catch (err) {
    console.error('Get boards error:', err);
    res.status(500).json({ error: 'Failed to fetch boards.' });
  }
});

/**
 * POST /api/boards
 * Create a new board
 */
router.post('/', async (req, res) => {
  try {
    const { title, description, color } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Board title is required.' });
    }

    const [boardId] = await db('boards').insert({
      tenant_id: req.tenantId,
      title,
      description: description || null,
      color: color || '#6C63FF',
      created_by: req.user.id,
    });

    // Auto-create default lists
    await db('lists').insert([
      { tenant_id: req.tenantId, board_id: boardId, title: 'To Do', position: 0 },
      { tenant_id: req.tenantId, board_id: boardId, title: 'In Progress', position: 1 },
      { tenant_id: req.tenantId, board_id: boardId, title: 'Done', position: 2 },
    ]);

    const board = await db('boards').where({ id: boardId }).first();

    res.status(201).json(board);
  } catch (err) {
    console.error('Create board error:', err);
    res.status(500).json({ error: 'Failed to create board.' });
  }
});

/**
 * PUT /api/boards/:id
 * Update a board
 */
router.put('/:id', async (req, res) => {
  try {
    const { title, description, color } = req.body;

    const board = await db('boards')
      .where({ id: req.params.id, tenant_id: req.tenantId })
      .first();

    if (!board) {
      return res.status(404).json({ error: 'Board not found.' });
    }

    await db('boards')
      .where({ id: req.params.id, tenant_id: req.tenantId })
      .update({
        title: title || board.title,
        description: description !== undefined ? description : board.description,
        color: color || board.color,
        updated_at: db.fn.now(),
      });

    const updated = await db('boards').where({ id: req.params.id }).first();
    res.json(updated);
  } catch (err) {
    console.error('Update board error:', err);
    res.status(500).json({ error: 'Failed to update board.' });
  }
});

/**
 * DELETE /api/boards/:id
 * Delete a board and all its lists/cards (cascade)
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db('boards')
      .where({ id: req.params.id, tenant_id: req.tenantId })
      .del();

    if (!deleted) {
      return res.status(404).json({ error: 'Board not found.' });
    }

    res.json({ message: 'Board deleted successfully.' });
  } catch (err) {
    console.error('Delete board error:', err);
    res.status(500).json({ error: 'Failed to delete board.' });
  }
});

module.exports = router;
