import Database from './database';

export default class Deleter extends Database {
  create(box, data) {
    if (this._query === null) {
      this._prepare();
    }

    const values = [];
    let sql = 'DELETE';

    sql += this._finishWith(box, data, values);
    sql += this._finishDelete(box, data, values);
    sql += this._finishFrom(box, data, values);
    sql += this._finishJoin(box, data, values);
    sql += this._finishWhere(box, data, values);
    sql += this._finishOrder(box, data, values);
    sql += this._finishLimit(box, data, values);

    return { sql, values };
  }

  _finishFrom(box, data, values) {
    const from = this._prepareFrom(this._from,
      box, data, this._query.from);

    for (let i = 0; i < from.values.length; i += 1) {
      values[values.length] = from.values[i];
    }

    return ' FROM ' + from.sql;
  }

  _finishDelete(box, data, values) {
    const head = this._prepareHead(this._delete, box, data,
      this._query.delete);

    return this._finishHead(head, values);
  }

  _prepare() {
    this._query = {
      with: this._prepareWith(this._with),
      delete: this._prepareDelete(this._delete),
      from: this._prepareFrom(this._from),
      join: this._prepareJoin(this._join),
      where: this._prepareWhere(this._where),
      order: this._prepareBy(this._order),
      limit: this._prepareLimit(this._limit)
    };
  }

  _prepareDelete(head) {
    return this._prepareHead(head);
  }
}
