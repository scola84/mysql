import sprintf from 'sprintf-js';
import Database from './database';
import parts from './parts';

export default class Selector extends Database {
  build(input = {}) {
    if (this._query === null) {
      this._prepare();
    }

    const select = this._query.select;
    const from = this._query.from;

    const values = [
      ...select.values,
      ...from.values
    ];

    let sql = 'SELECT';

    sql += ' ' + select.sql.join(', ');
    sql += ' FROM ' + from.sql;

    sql += this._finishJoin(input, values);
    sql += this._finishWhere(input, values);
    sql += this._finishGroup(input, values);
    sql += this._finishOrder(input, values);
    sql += this._finishLimit(input, values);

    return {
      nestTables: this._nest,
      sql,
      values
    };
  }

  merge(box, data, { input, result }) {
    if (this._type === 'object') {
      result = result[0];
    }

    if (this._merge) {
      return this._merge(box, data, { input, result });
    }

    return result;
  }

  _prepare() {
    this._query = {
      select: this._prepareSelect(this._select),
      from: this._prepareFrom(this._from),
      join: this._prepareJoin(this._join),
      where: this._prepareWhere(this._where),
      group: this._prepareBy(this._group),
      order: this._prepareBy(this._order),
      limit: this._prepareLimit(this._limit)
    };
  }

  _prepareSelect(select) {
    const query = {
      sql: [],
      values: []
    };

    let field = null;
    let value = null;
    let wrap = null;

    for (let i = 0; i < select.length; i += 1) {
      field = select[i];
      value = '??';
      wrap = select[i].wrap || [];

      query.values[i] = field.column;

      for (let j = wrap.length - 1; j >= 0; j -= 1) {
        value = sprintf.sprintf(
          parts.wrap[wrap[j]],
          value,
          ...(field[wrap[j]] || [])
        );
      }

      if (field.alias) {
        value += ' AS ' + field.alias;
      }

      query.sql[i] = value;
    }

    return query;
  }
}
