const bcrypt = require('bcryptjs');

/**
 * Seed: Demo data for development
 * Creates 2 tenants with users, boards, lists, and cards
 */
exports.seed = async function (knex) {
  // Clean tables in reverse dependency order
  await knex('cards').del();
  await knex('lists').del();
  await knex('boards').del();
  await knex('users').del();
  await knex('tenants').del();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // --- Tenant 1: Acme Corp ---
  const [tenantId1] = await knex('tenants').insert({
    name: 'Acme Corp',
    slug: 'acme-corp',
  });

  const [adminId1] = await knex('users').insert({
    tenant_id: tenantId1,
    name: 'Alice Johnson',
    email: 'alice@acme.com',
    password: hashedPassword,
    role: 'admin',
    avatar_color: '#6C63FF',
  });

  const [memberId1] = await knex('users').insert({
    tenant_id: tenantId1,
    name: 'Bob Smith',
    email: 'bob@acme.com',
    password: hashedPassword,
    role: 'member',
    avatar_color: '#FF6B6B',
  });

  const [memberId2] = await knex('users').insert({
    tenant_id: tenantId1,
    name: 'Carol Davis',
    email: 'carol@acme.com',
    password: hashedPassword,
    role: 'member',
    avatar_color: '#4ECDC4',
  });

  // Board 1
  const [boardId1] = await knex('boards').insert({
    tenant_id: tenantId1,
    title: 'Product Launch Q3',
    description: 'Planning and tracking the Q3 product launch',
    color: '#6C63FF',
    created_by: adminId1,
  });

  const [listTodo] = await knex('lists').insert({
    tenant_id: tenantId1,
    board_id: boardId1,
    title: 'To Do',
    position: 0,
  });

  const [listInProgress] = await knex('lists').insert({
    tenant_id: tenantId1,
    board_id: boardId1,
    title: 'In Progress',
    position: 1,
  });

  const [listReview] = await knex('lists').insert({
    tenant_id: tenantId1,
    board_id: boardId1,
    title: 'In Review',
    position: 2,
  });

  const [listDone] = await knex('lists').insert({
    tenant_id: tenantId1,
    board_id: boardId1,
    title: 'Done',
    position: 3,
  });

  await knex('cards').insert([
    {
      tenant_id: tenantId1,
      list_id: listTodo,
      title: 'Design landing page mockup',
      description: 'Create high-fidelity mockups for the new landing page',
      position: 0,
      priority: 'high',
      assigned_to: memberId1,
      due_date: '2026-06-15',
    },
    {
      tenant_id: tenantId1,
      list_id: listTodo,
      title: 'Write API documentation',
      description: 'Document all REST endpoints for the public API',
      position: 1,
      priority: 'medium',
      assigned_to: memberId2,
      due_date: '2026-06-20',
    },
    {
      tenant_id: tenantId1,
      list_id: listTodo,
      title: 'Set up CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing and deployment',
      position: 2,
      priority: 'medium',
      assigned_to: null,
    },
    {
      tenant_id: tenantId1,
      list_id: listInProgress,
      title: 'Implement user authentication',
      description: 'JWT-based auth with refresh tokens',
      position: 0,
      priority: 'high',
      assigned_to: adminId1,
      due_date: '2026-05-30',
    },
    {
      tenant_id: tenantId1,
      list_id: listInProgress,
      title: 'Database schema design',
      description: 'Finalize the database schema for v2',
      position: 1,
      priority: 'medium',
      assigned_to: memberId1,
    },
    {
      tenant_id: tenantId1,
      list_id: listReview,
      title: 'Mobile responsive CSS',
      description: 'Ensure all pages work on mobile devices',
      position: 0,
      priority: 'low',
      assigned_to: memberId2,
    },
    {
      tenant_id: tenantId1,
      list_id: listDone,
      title: 'Project kickoff meeting',
      description: 'Initial planning meeting with all stakeholders',
      position: 0,
      priority: 'low',
      assigned_to: adminId1,
    },
  ]);

  // Board 2
  await knex('boards').insert({
    tenant_id: tenantId1,
    title: 'Bug Tracker',
    description: 'Track and resolve production bugs',
    color: '#FF6B6B',
    created_by: adminId1,
  });

  // --- Tenant 2: Startup Inc ---
  const [tenantId2] = await knex('tenants').insert({
    name: 'Startup Inc',
    slug: 'startup-inc',
  });

  await knex('users').insert({
    tenant_id: tenantId2,
    name: 'Dave Wilson',
    email: 'dave@startup.io',
    password: hashedPassword,
    role: 'admin',
    avatar_color: '#FFD93D',
  });

  console.log('✅ Seed data inserted successfully');
  console.log('   Tenant 1: Acme Corp → alice@acme.com / password123');
  console.log('   Tenant 2: Startup Inc → dave@startup.io / password123');
};
