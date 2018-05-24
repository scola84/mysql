import Database from './database';

export default class Updater extends Database {
  create(box, data) {
    if (this._query === null) {
      this._prepare();
    }

    const values = [];
    let sql = 'UPDATE';

    sql += this._finishUpdate(box, data, values);
    sql += this._finishSet(box, data, values);
    sql += this._finishWhere(box, data, values);
    sql += this._finishOrder(box, data, values);
    sql += this._finishLimit(box, data, values);

    return { sql, values };
  }

  _finishSet(box, data, values) {
    const set = this._prepareSet(this._set, box, data, this._query.set);

    if (set.sql.length > 0) {
      for (let i = 0; i < set.values.length; i += 1) {
        values[values.length] = set.values[i];
      }

      return ' SET ' + set.sql;
    }

    return '';
  }

  _finishUpdate(box, data, values) {
    const head = this._prepareHead(this._update, box, data,
      this._query.update);

    return this._finishHead(head, values);
  }

  _prepare() {
    this._query = {
      update: this._prepareUpdate(this._update),
      set: this._prepareSet(this._set),
      where: this._prepareWhere(this._where),
      order: this._prepareBy(this._order),
      limit: this._prepareLimit(this._limit)
    };
  }

  _prepareSet(set, box, data, query = {}) {
    query = {
      sql: '?',
      values: [{}]
    };

    let column = null;
    let value = set.value;

    if (typeof value === 'function') {
      if (typeof box === 'undefined') {
        return query;
      }

      value = value(box, data);
    }

    for (let i = 0; i < set.columns.length; i += 1) {
      column = set.columns[i];

      if (typeof query.values[0][column] !== 'undefined') {
        continue;
      }

      if (typeof value[column] === 'undefined' && set.any === true) {
        continue;
      }

      query.values[0][column] = value[column];
    }

    return query;
  }

  _prepareUpdate(head) {
    return this._prepareHead(head);
  }
}
