import Database from './database';

export default class Updater extends Database {
  build(box, data) {
    if (this._query === null) {
      this._prepare();
    }

    const input = this.filter(box, data);

    const update = this._query.update;
    const values = [...update.values];

    let sql = 'UPDATE';

    sql += ' ' + update.sql;
    sql += this._finishSet(box, data, input, values);
    sql += this._finishWhere(box, data, input, values);
    sql += this._finishOrder(box, data, input, values);
    sql += this._finishLimit(box, data, input, values);

    return { input, sql, values };
  }

  _finishSet(box, data, input, values) {
    const set = input.set ? this._prepareSet(this._set, box, data,
      this._query.set, input.set) : this._query.set;

    if (set.sql.length > 0) {
      for (let i = 0; i < set.values.length; i += 1) {
        values[values.length] = set.values[i];
      }

      return ' SET ' + set.sql;
    }

    return '';
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

  _prepareSet(set, box, data, query = {}, input = {}) {
    query = {
      sql: '?',
      values: [{}]
    };

    let field = null;
    let value = null;

    for (let i = 0; i < set.column.length; i += 1) {
      field = set.column[i];

      if (typeof query.values[0][field] !== 'undefined') {
        continue;
      }

      value = set.value && set.value[field] || input[field];
      query.values[0][field] = value === '' ? null : value;
    }

    return query;
  }

  _prepareUpdate(update) {
    return {
      sql: '??',
      values: [update.table]
    };
  }
}
