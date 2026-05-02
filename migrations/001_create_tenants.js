/**
 * Migration: Create tenants table
 * Each tenant represents an organization/team
 */
exports.up = function (knex) {
  return knex.schema.createTable('tenants', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.string('slug', 100).notNullable().unique();
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('tenants');
};
