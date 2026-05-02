/**
 * Migration: Create users table
 * Users belong to a tenant and have roles (admin/member)
 */
exports.up = function (knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table
      .integer('tenant_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('tenants')
      .onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.string('email', 255).notNullable();
    table.string('password', 255).notNullable();
    table.enum('role', ['admin', 'member']).defaultTo('member');
    table.string('avatar_color', 7).defaultTo('#6C63FF');
    table.timestamps(true, true);

    // Email must be unique within a tenant
    table.unique(['tenant_id', 'email']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('users');
};
