import Database from './database';

export default class Deleter extends Database {
  build(box, data) {
    if (this._query === null) {
      this._prepare();
    }

    const input = this.filter(box, data);

    const del = this._query.delete;
    const from = this._query.from;

    const values = [
      ...del.values,
      ...from.values
    ];

    let sql = 'DELETE';

    sql += del.sql.length ? ' ' + del.sql : '';
    sql += ' FROM ' + from.sql;

    sql += this._finishJoin(box, data, input, values);
    sql += this._finishWhere(box, data, input, values);
    sql += this._finishOrder(box, data, input, values);
    sql += this._finishLimit(box, data, input, values);

    return { input, sql, values };
  }

  _prepare() {
    this._query = {
      delete: this._prepareDelete(this._delete),
      from: this._prepareFrom(this._from),
      join: this._prepareJoin(this._join),
      where: this._prepareWhere(this._where),
      order: this._prepareBy(this._order),
      limit: this._prepareLimit(this._limit)
    };
  }

  _prepareDelete(del) {
    return {
      sql: del.table ? '??' : '',
      values: del.table ? [del.table] : []
    };
  }
}
