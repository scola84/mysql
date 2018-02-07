import sprintf from 'sprintf-js';
import Database, { parts } from './database';

export default class Selector extends Database {
  create(box, data) {
    if (this._union.length > 0) {
      return this._createUnion(box, data);
    }

    return this._createSingle(box, data);
  }

  merge(box, data, { query, result }) {
    if (this._merge) {
      return this._merge(box, data, { query, result });
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

  _createSingle(box, data) {
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

    sql += this._finishJoin(box, data, values);
    sql += this._finishWhere(box, data, values);
    sql += this._finishGroup(box, data, values);
    sql += this._finishOrder(box, data, values);
    sql += this._finishLimit(box, data, values);

    return {
      nestTables: this._nest,
      sql,
      values
    };
  }

  _createUnion(box, data) {
    let sql = '';
    let query = {};
    const values = [];

    for (let i = 0; i < this._union.length; i += 1) {
      query = this._union[i].create(box, data);

      sql += i > 0 ? ') UNION (' : '';
      sql += query.sql;

      for (let j = 0; j < query.values.length; j += 1) {
        values[values.length] = query.values[j];
      }
    }

    sql = '(' + sql + ')';

    return {
      nestTables: this._nest,
      sql,
      values
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

      if (typeof field.value !== 'undefined') {
        value = '?';
        query.values[i] = field.value;
      } else if (field.column === '*') {
        value = field.column;
      } else {
        query.values[i] = field.column;
      }

      for (let j = wrap.length - 1; j >= 0; j -= 1) {
        value = sprintf.sprintf(
          parts.wrap[wrap[j]],
          value,
          ...(field[wrap[j]] || [])
        );
      }

      if (field.alias) {
        value += ' AS `' + field.alias + '`';
      }

      query.sql[i] = value;
    }

    return query;
  }
}
