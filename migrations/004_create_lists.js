/**
 * Migration: Create lists table
 * Lists are columns within a board (e.g. To Do, In Progress, Done)
 */
exports.up = function (knex) {
  return knex.schema.createTable('lists', (table) => {
    table.increments('id').primary();
    table
      .integer('tenant_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('tenants')
      .onDelete('CASCADE');
    table
      .integer('board_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('boards')
      .onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.integer('position').notNullable().defaultTo(0);
    table.timestamps(true, true);

    table.index(['board_id', 'position']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('lists');
};
