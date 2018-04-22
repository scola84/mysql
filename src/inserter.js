import Database from './database';

export default class Inserter extends Database {
  create(box, data) {
    if (this._query === null) {
      this._prepare();
    }

    const values = [];
    let sql = this._replace ? 'REPLACE' : 'INSERT';

    sql += this._finishInto(box, data, values);
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

      return ' ' + insert.sql;
    }

    return '';
  }

  _finishInto(box, data, values) {
    const into = this._prepareInto(this._into, box, data);

    for (let i = 0; i < into.values.length; i += 1) {
      values[values.length] = into.values[i];
    }

    return ' INTO ' + into.sql;
  }

  _prepare() {
    this._query = {
      insert: this._prepareInsert(this._insert),
      into: this._prepareInto(this._into)
    };
  }

  _prepareInsert(insert, box, data) {
    const query = {
      sql: '(??) VALUES ?',
      values: []
    };

    query.values[0] = insert.columns;
    query.values[1] = [];

    if (insert.value instanceof Database) {
      query.sql = insert.value.format(box, data);
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

  _prepareInto(into, box, data) {
    const query = {
      sql: '',
      values: []
    };

    let table = into.table;
    let shard = into.shard;

    if (typeof table === 'function') {
      if (typeof box === 'undefined') {
        return query;
      }

      table = table(box, data);
    }

    if (typeof shard !== 'undefined') {
      if (typeof box === 'undefined') {
        return query;
      }

      shard = typeof shard === 'function' ? shard(box, data) : shard;
      table = this._formatTable(box, data, table, shard);
    }

    query.sql = '??';
    query.values[0] = table;

    return query;
  }
}
