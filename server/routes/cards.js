const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const tenantMiddleware = require('../middleware/tenant');

const router = express.Router();

// All routes require auth + tenant
router.use(authMiddleware, tenantMiddleware);

/**
 * POST /api/lists/:listId/cards
 * Create a new card in a list
 */
router.post('/lists/:listId/cards', async (req, res) => {
  try {
    const { listId } = req.params;
    const { title, description, priority, assigned_to, due_date } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Card title is required.' });
    }

    // Verify list belongs to tenant
    const list = await db('lists')
      .where({ id: listId, tenant_id: req.tenantId })
      .first();

    if (!list) {
      return res.status(404).json({ error: 'List not found.' });
    }

    // Get next position
    const maxPos = await db('cards')
      .where({ list_id: listId, tenant_id: req.tenantId })
      .max('position as max')
      .first();

    const position = (maxPos.max || 0) + 1;

    const [cardId] = await db('cards').insert({
      tenant_id: req.tenantId,
      list_id: listId,
      title,
      description: description || null,
      position,
      priority: priority || 'medium',
      assigned_to: assigned_to || null,
      due_date: due_date || null,
    });

    const card = await db('cards')
      .where({ 'cards.id': cardId })
      .leftJoin('users', 'cards.assigned_to', 'users.id')
      .select(
        'cards.*',
        'users.name as assignee_name',
        'users.avatar_color as assignee_avatar'
      )
      .first();

    res.status(201).json(card);
  } catch (err) {
    console.error('Create card error:', err);
    res.status(500).json({ error: 'Failed to create card.' });
  }
});

/**
 * PUT /api/cards/:id
 * Update a card
 */
router.put('/cards/:id', async (req, res) => {
  try {
    const { title, description, priority, assigned_to, due_date } = req.body;

    const card = await db('cards')
      .where({ id: req.params.id, tenant_id: req.tenantId })
      .first();

    if (!card) {
      return res.status(404).json({ error: 'Card not found.' });
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (priority !== undefined) updates.priority = priority;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to || null;
    if (due_date !== undefined) updates.due_date = due_date || null;
    updates.updated_at = db.fn.now();

    await db('cards')
      .where({ id: req.params.id, tenant_id: req.tenantId })
      .update(updates);

    const updated = await db('cards')
      .where({ 'cards.id': req.params.id })
      .leftJoin('users', 'cards.assigned_to', 'users.id')
      .select(
        'cards.*',
        'users.name as assignee_name',
        'users.avatar_color as assignee_avatar'
      )
      .first();

    res.json(updated);
  } catch (err) {
    console.error('Update card error:', err);
    res.status(500).json({ error: 'Failed to update card.' });
  }
});

/**
 * PUT /api/cards/:id/move
 * Move a card to a different list and/or position
 */
router.put('/cards/:id/move', async (req, res) => {
  try {
    const { list_id, position } = req.body;

    const card = await db('cards')
      .where({ id: req.params.id, tenant_id: req.tenantId })
      .first();

    if (!card) {
      return res.status(404).json({ error: 'Card not found.' });
    }

    // Verify target list belongs to tenant
    if (list_id) {
      const targetList = await db('lists')
        .where({ id: list_id, tenant_id: req.tenantId })
        .first();

      if (!targetList) {
        return res.status(404).json({ error: 'Target list not found.' });
      }
    }

    const updates = { updated_at: db.fn.now() };
    if (list_id !== undefined) updates.list_id = list_id;
    if (position !== undefined) updates.position = position;

    await db('cards')
      .where({ id: req.params.id, tenant_id: req.tenantId })
      .update(updates);

    const updated = await db('cards')
      .where({ 'cards.id': req.params.id })
      .leftJoin('users', 'cards.assigned_to', 'users.id')
      .select(
        'cards.*',
        'users.name as assignee_name',
        'users.avatar_color as assignee_avatar'
      )
      .first();

    res.json(updated);
  } catch (err) {
    console.error('Move card error:', err);
    res.status(500).json({ error: 'Failed to move card.' });
  }
});

/**
 * DELETE /api/cards/:id
 * Delete a card
 */
router.delete('/cards/:id', async (req, res) => {
  try {
    const deleted = await db('cards')
      .where({ id: req.params.id, tenant_id: req.tenantId })
      .del();

    if (!deleted) {
      return res.status(404).json({ error: 'Card not found.' });
    }

    res.json({ message: 'Card deleted successfully.' });
  } catch (err) {
    console.error('Delete card error:', err);
    res.status(500).json({ error: 'Failed to delete card.' });
  }
});

module.exports = router;
