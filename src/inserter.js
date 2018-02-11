import Database from './database';

export default class Inserter extends Database {
  create(box, data) {
    if (this._query === null) {
      this._prepare();
    }

    const into = this._query.into;
    const values = [...into.values];

    let sql = this._replace ? 'REPLACE' : 'INSERT';

    sql += ' INTO ' + into.sql;
    sql += this._finishInsert(box, data, values);

    return { sql, values };
  }

  _finishInsert(box, data, values) {
    const insert = this._prepareInsert(this._insert,
      box, data, this._query.insert);

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

  _prepareInsert(insert, box, data, query = {}) {
    query = {
      sql: '?',
      values: []
    };

    query.values[0] = insert.columns;
    query.values[1] = [];

    if (insert.value instanceof Database) {
      query.sql = ' ' + insert.value.format(box, data);
      return query;
    }

    if (Array.isArray(insert.value) === true) {
      query.values[1] = insert.value;
      return query;
    }

    let column = null;
    let value = insert.value;

    if (typeof value === 'function') {
      if (typeof box === 'undefined') {
        return query;
      }

      value = value(box, data);
    }

    if (Array.isArray(value) === true) {
      query.values[1] = value;
      return query;
    }

    query.values[1][0] = [];

    for (let i = 0; i < insert.columns.length; i += 1) {
      column = insert.columns[i];

      if (typeof query.values[1][0][i] !== 'undefined') {
        continue;
      }

      query.values[1][0][i] = value[column] === '' ?
        null : value[column];
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
