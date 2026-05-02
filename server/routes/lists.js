const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const tenantMiddleware = require('../middleware/tenant');

const router = express.Router();

// All routes require auth + tenant
router.use(authMiddleware, tenantMiddleware);

/**
 * GET /api/boards/:boardId/lists
 * Get all lists and their cards for a board
 */
router.get('/boards/:boardId/lists', async (req, res) => {
  try {
    const { boardId } = req.params;

    // Verify board belongs to tenant
    const board = await db('boards')
      .where({ id: boardId, tenant_id: req.tenantId })
      .first();

    if (!board) {
      return res.status(404).json({ error: 'Board not found.' });
    }

    const lists = await db('lists')
      .where({ board_id: boardId, tenant_id: req.tenantId })
      .orderBy('position');

    // Get all cards for all lists in this board
    const listIds = lists.map((l) => l.id);
    const cards = await db('cards')
      .whereIn('list_id', listIds)
      .where({ 'cards.tenant_id': req.tenantId })
      .leftJoin('users', 'cards.assigned_to', 'users.id')
      .select(
        'cards.*',
        'users.name as assignee_name',
        'users.avatar_color as assignee_avatar'
      )
      .orderBy('cards.position');

    // Group cards by list
    const cardsByList = {};
    cards.forEach((card) => {
      if (!cardsByList[card.list_id]) {
        cardsByList[card.list_id] = [];
      }
      cardsByList[card.list_id].push(card);
    });

    const listsWithCards = lists.map((list) => ({
      ...list,
      cards: cardsByList[list.id] || [],
    }));

    res.json({ board, lists: listsWithCards });
  } catch (err) {
    console.error('Get lists error:', err);
    res.status(500).json({ error: 'Failed to fetch lists.' });
  }
});

/**
 * POST /api/boards/:boardId/lists
 * Create a new list in a board
 */
router.post('/boards/:boardId/lists', async (req, res) => {
  try {
    const { boardId } = req.params;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'List title is required.' });
    }

    // Get next position
    const maxPos = await db('lists')
      .where({ board_id: boardId, tenant_id: req.tenantId })
      .max('position as max')
      .first();

    const position = (maxPos.max || 0) + 1;

    const [listId] = await db('lists').insert({
      tenant_id: req.tenantId,
      board_id: boardId,
      title,
      position,
    });

    const list = await db('lists').where({ id: listId }).first();
    res.status(201).json({ ...list, cards: [] });
  } catch (err) {
    console.error('Create list error:', err);
    res.status(500).json({ error: 'Failed to create list.' });
  }
});

/**
 * PUT /api/lists/:id
 * Update a list title
 */
router.put('/lists/:id', async (req, res) => {
  try {
    const { title } = req.body;

    const list = await db('lists')
      .where({ id: req.params.id, tenant_id: req.tenantId })
      .first();

    if (!list) {
      return res.status(404).json({ error: 'List not found.' });
    }

    await db('lists')
      .where({ id: req.params.id })
      .update({ title: title || list.title });

    const updated = await db('lists').where({ id: req.params.id }).first();
    res.json(updated);
  } catch (err) {
    console.error('Update list error:', err);
    res.status(500).json({ error: 'Failed to update list.' });
  }
});

/**
 * PUT /api/lists/:id/reorder
 * Reorder lists within a board
 */
router.put('/lists/:id/reorder', async (req, res) => {
  try {
    const { position } = req.body;

    await db('lists')
      .where({ id: req.params.id, tenant_id: req.tenantId })
      .update({ position });

    res.json({ message: 'List reordered.' });
  } catch (err) {
    console.error('Reorder list error:', err);
    res.status(500).json({ error: 'Failed to reorder list.' });
  }
});

/**
 * DELETE /api/lists/:id
 * Delete a list and all its cards
 */
router.delete('/lists/:id', async (req, res) => {
  try {
    const deleted = await db('lists')
      .where({ id: req.params.id, tenant_id: req.tenantId })
      .del();

    if (!deleted) {
      return res.status(404).json({ error: 'List not found.' });
    }

    res.json({ message: 'List deleted successfully.' });
  } catch (err) {
    console.error('Delete list error:', err);
    res.status(500).json({ error: 'Failed to delete list.' });
  }
});

module.exports = router;
