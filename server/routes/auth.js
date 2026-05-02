const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const tenantMiddleware = require('../middleware/tenant');
const { randomAvatarColor, slugify } = require('../utils/helpers');

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new tenant and admin user
 */
router.post('/register', async (req, res) => {
  try {
    const { tenantName, name, email, password } = req.body;

    if (!tenantName || !name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters.' });
    }

    const slug = slugify(tenantName);

    // Check if tenant slug already exists
    const existingTenant = await db('tenants').where({ slug }).first();
    if (existingTenant) {
      return res
        .status(409)
        .json({ error: 'An organization with that name already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create tenant and admin user in a transaction
    const result = await db.transaction(async (trx) => {
      const [tenantId] = await trx('tenants').insert({
        name: tenantName,
        slug,
      });

      const [userId] = await trx('users').insert({
        tenant_id: tenantId,
        name,
        email,
        password: hashedPassword,
        role: 'admin',
        avatar_color: randomAvatarColor(),
      });

      return { tenantId, userId };
    });

    const token = jwt.sign(
      {
        id: result.userId,
        tenantId: result.tenantId,
        email,
        role: 'admin',
        name,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: result.userId, name, email, role: 'admin' },
      tenant: { id: result.tenantId, name: tenantName, slug },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: 'Email and password are required.' });
    }

    const user = await db('users')
      .join('tenants', 'users.tenant_id', 'tenants.id')
      .where('users.email', email)
      .select(
        'users.id',
        'users.tenant_id',
        'users.name',
        'users.email',
        'users.password',
        'users.role',
        'users.avatar_color',
        'tenants.name as tenant_name',
        'tenants.slug as tenant_slug'
      )
      .first();

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarColor: user.avatar_color,
      },
      tenant: {
        id: user.tenant_id,
        name: user.tenant_name,
        slug: user.tenant_slug,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

/**
 * GET /api/auth/me
 * Get current user and tenant info
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await db('users')
      .join('tenants', 'users.tenant_id', 'tenants.id')
      .where('users.id', req.user.id)
      .select(
        'users.id',
        'users.tenant_id',
        'users.name',
        'users.email',
        'users.role',
        'users.avatar_color',
        'tenants.name as tenant_name',
        'tenants.slug as tenant_slug'
      )
      .first();

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarColor: user.avatar_color,
      },
      tenant: {
        id: user.tenant_id,
        name: user.tenant_name,
        slug: user.tenant_slug,
      },
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Failed to fetch user info.' });
  }
});

/**
 * POST /api/auth/invite
 * Invite a new member to the tenant (admin only)
 */
router.post(
  '/invite',
  authMiddleware,
  tenantMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res
          .status(403)
          .json({ error: 'Only admins can invite members.' });
      }

      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
      }

      // Check if email already exists in this tenant
      const existing = await db('users')
        .where({ tenant_id: req.tenantId, email })
        .first();

      if (existing) {
        return res
          .status(409)
          .json({ error: 'A user with this email already exists in your organization.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const [userId] = await db('users').insert({
        tenant_id: req.tenantId,
        name,
        email,
        password: hashedPassword,
        role: 'member',
        avatar_color: randomAvatarColor(),
      });

      res.status(201).json({
        message: 'Member invited successfully',
        user: { id: userId, name, email, role: 'member' },
      });
    } catch (err) {
      console.error('Invite error:', err);
      res.status(500).json({ error: 'Failed to invite member.' });
    }
  }
);

/**
 * GET /api/auth/members
 * Get all members of the current tenant
 */
router.get(
  '/members',
  authMiddleware,
  tenantMiddleware,
  async (req, res) => {
    try {
      const members = await db('users')
        .where({ tenant_id: req.tenantId })
        .select('id', 'name', 'email', 'role', 'avatar_color')
        .orderBy('name');

      res.json(members);
    } catch (err) {
      console.error('Members error:', err);
      res.status(500).json({ error: 'Failed to fetch members.' });
    }
  }
);

module.exports = router;
