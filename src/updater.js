import Database from './database';

export default class Updater extends Database {
  build(input = {}) {
    if (this._query === null) {
      this._prepare();
    }

    const update = this._query.update;
    const values = [...update.values];

    let sql = 'UPDATE';

    sql += ' ' + update.sql;
    sql += this._finishSet(input, values);
    sql += this._finishWhere(input, values);
    sql += this._finishOrder(input, values);
    sql += this._finishLimit(input, values);

    // console.log(input, sql, values);

    return { sql, values };
  }

  _finishSet(input, values) {
    const set = input.set ?
      this._prepareSet(this._set, this._query.set, input.set) :
      this._query.set;

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

  _prepareSet(set, query = {}, input = {}) {
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
