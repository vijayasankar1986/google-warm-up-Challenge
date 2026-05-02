/**
 * Migration: Create cards table
 * Cards are task items within a list
 */
exports.up = function (knex) {
  return knex.schema.createTable('cards', (table) => {
    table.increments('id').primary();
    table
      .integer('tenant_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('tenants')
      .onDelete('CASCADE');
    table
      .integer('list_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('lists')
      .onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table.integer('position').notNullable().defaultTo(0);
    table.enum('priority', ['low', 'medium', 'high']).defaultTo('medium');
    table
      .integer('assigned_to')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.date('due_date').nullable();
    table.timestamps(true, true);

    table.index(['list_id', 'position']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('cards');
};
