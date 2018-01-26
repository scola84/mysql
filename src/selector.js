import mysql from 'mysql';
import sprintf from 'sprintf-js';
import Database from './database';
import parts from './parts';

export default class Selector extends Database {
  build(box, data) {
    if (this._union.length > 0) {
      return this._buildUnion(box, data);
    }

    return this._buildSimple(box, data);
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

  _buildSimple(box, data) {
    if (this._query === null) {
      this._prepare();
    }

    const input = this.filter(box, data);

    const select = this._query.select;
    const from = this._query.from;

    const values = [
      ...select.values,
      ...from.values
    ];

    let sql = 'SELECT';

    sql += ' ' + select.sql.join(', ');
    sql += ' FROM ' + from.sql;

    sql += this._finishJoin(box, data, input, values);
    sql += this._finishWhere(box, data, input, values);
    sql += this._finishGroup(box, data, input, values);
    sql += this._finishOrder(box, data, input, values);
    sql += this._finishLimit(box, data, input, values);

    return {
      input,
      nestTables: this._nest,
      sql,
      values
    };
  }

  _buildUnion(box, data) {
    let sql = '';
    let query = {};
    const values = [];

    for (let i = 0; i < this._union.length; i += 1) {
      query = this._union[i].build(box, data);

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

      if (field.column === '*') {
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
