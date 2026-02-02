/**
 * Database Adapter for SQLite
 * Provides PostgreSQL-like interface for better-sqlite3
 */

const { db, query, queryOne, run, transaction } = require('./database');

class DBAdapter {
  /**
   * Execute a query and return rows (PostgreSQL-like interface)
   * @param {string} sql - SQL query with ? placeholders
   * @param {array} params - Query parameters
   * @returns {object} - { rows: [...] }
   */
  async query(sql, params = []) {
    try {
      const rows = query(sql, params);
      return { rows };
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  /**
   * Connect (no-op for SQLite, returns mock client)
   */
  async connect() {
    return {
      query: this.query.bind(this),
      release: () => {}, // No-op for SQLite
    };
  }

  /**
   * Transaction helper
   */
  transaction(callback) {
    return transaction(callback);
  }

  /**
   * Direct database access
   */
  get raw() {
    return db;
  }
}

const pool = new DBAdapter();

module.exports = pool;
