/**
 * Migration: Create boards table
 * Boards are the top-level container for lists and cards
 */
exports.up = function (knex) {
  return knex.schema.createTable('boards', (table) => {
    table.increments('id').primary();
    table
      .integer('tenant_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('tenants')
      .onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table.string('color', 7).defaultTo('#6C63FF');
    table
      .integer('created_by')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.timestamps(true, true);

    table.index('tenant_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('boards');
};
