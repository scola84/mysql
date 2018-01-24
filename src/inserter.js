import Database from './database';

export default class Inserter extends Database {
  build(input = {}) {
    if (this._query === null) {
      this._prepare();
    }

    const into = this._query.into;
    const values = [...into.values];

    let sql = this._replace ? 'REPLACE' : 'INSERT';

    sql += ' INTO ' + into.sql;
    sql += this._finishInsert(input, values);

    return { sql, values };
  }

  _finishInsert(input, values) {
    const insert = input.insert ?
      this._prepareInsert(this._insert, this._query.insert, input.insert) :
      this._query.insert;

    if (insert.sql.length > 0) {
      for (let i = 0; i < insert.values.length; i += 1) {
        values[values.length] = insert.values[i];
      }

      return (insert.values[1].length > 0 ? ' VALUES ' : '') +
        insert.sql;
    }

    return '';
  }

  _prepare() {
    this._query = {
      insert: this._prepareInsert(this._insert),
      into: this._prepareInto(this._into)
    };
  }

  _prepareInsert(insert, query = {}, input = {}) {
    query = {
      sql: '?',
      values: []
    };

    query.values[0] = insert.column;
    query.values[1] = [];

    if (insert.value instanceof Database) {
      query.sql = ' ' + insert.value.format(input);
      return query;
    }

    if (Array.isArray(insert.value) === true) {
      query.values[1] = insert.value;
      return query;
    }

    if (Array.isArray(input) === true) {
      query.values[1] = input;
      return query;
    }

    query.values[1][0] = [];

    let field = null;
    let value = null;

    for (let i = 0; i < insert.column.length; i += 1) {
      field = insert.column[i];

      if (typeof query.values[1][0][i] !== 'undefined') {
        continue;
      }

      value = insert.value && insert.value[field] || input[field];
      query.values[1][0][i] = value === '' ? null : value;
    }

    return query;
  }

  _prepareInto(into) {
    return {
      sql: '?? (??)',
      values: [into.table]
    };
  }
}
