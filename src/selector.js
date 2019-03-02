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
      with: this._prepareWith(this._with),
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

    const values = [];
    let sql = '';

    sql += this._finishWith(box, data, values);
    sql += this._finishSelect(box, data, values);
    sql += this._finishFrom(box, data, values);
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

  _finishSelect(box, data, values) {
    const select = this._prepareSelect(this._select,
      box, data, this._query.select);

    for (let i = 0; i < select.values.length; i += 1) {
      if (typeof select.values[i] === 'undefined') {
        continue;
      }

      if (typeof select.values[i].value !== 'undefined') {
        if (Array.isArray(select.values[i].value)) {
          values.splice(values.length, 0, ...select.values[i].value);
        } else {
          values[values.length] = select.values[i].value;
        }
      } else {
        values[values.length] = select.values[i];
      }
    }

    return 'SELECT ' + select.sql.join(', ');
  }

  _finishFrom(box, data, values) {
    const from = this._prepareFrom(this._from,
      box, data, this._query.from);

    for (let i = 0; i < from.values.length; i += 1) {
      values[values.length] = from.values[i];
    }

    return ' FROM ' + from.sql;
  }

  _createUnion(box, data) {
    if (this._query === null) {
      this._prepare();
    }

    let sql = '';
    let query = {};
    const values = [];

    for (let i = 0; i < this._union.length; i += 1) {
      if (this._union[i].decide(box, data) !== true) {
        continue;
      }

      query = this._union[i].create(box, data);

      sql += sql.length > 0 ? ') UNION (' : '';
      sql += query.sql;

      for (let j = 0; j < query.values.length; j += 1) {
        values[values.length] = query.values[j];
      }
    }

    sql = '(' + sql + ')';

    sql += this._finishOrder(box, data, values);
    sql += this._finishLimit(box, data, values);

    return {
      nestTables: this._nest,
      sql,
      values
    };
  }

  _prepareSelect(select, box, data, query = {}) {
    query = {
      sql: query.sql ? query.sql.slice() : [],
      values: query.values ? query.values.slice() : []
    };

    let field = null;
    let sql = null;
    let placeholder = null;
    let value = null;
    let wrap = null;
    let wrapper = null;

    for (let i = 0; i < select.length; i += 1) {
      if (query.sql[i]) {
        continue;
      }

      field = select[i];
      sql = '';
      placeholder = '??';
      value = null;
      wrap = select[i].wrap || [];

      if (field.variable) {
        sql = '@' + field.variable + ' := ';
      }

      if (typeof wrap === 'function') {
        if (typeof box === 'undefined') {
          continue;
        }

        wrap = wrap(box, data);
      }

      if (typeof field.value !== 'undefined') {
        value = field.value;

        if (typeof value === 'function') {
          if (typeof box === 'undefined') {
            continue;
          }

          value = value(box, data);
        }

        if (value instanceof Database) {
          if (typeof box !== 'undefined') {
            sql += '(' + value.format(box, data) + ')';

            if (field.alias) {
              sql += ' AS `' + field.alias + '`';
            }

            query.sql[i] = sql;
          }

          continue;
        }

        placeholder = '?';
        value = value === 'NULL' ? this.raw('NULL') : value;
        query.values[i] = { value };
      } else if (field.columns === '*') {
        placeholder = '*';
      } else {
        query.values[i] = field.columns;
      }

      for (let j = wrap.length - 1; j >= 0; j -= 1) {
        wrapper = wrap[j];

        wrapper = typeof wrapper === 'object' ? wrapper : {
          name: wrapper,
          args: field[wrapper]
        };

        placeholder = sprintf.sprintf(
          parts.wrap[wrapper.name],
          placeholder,
          ...(wrapper.args || [])
        );

        if (typeof wrapper.over !== 'undefined') {
          placeholder += ` OVER(${wrapper.over})`;
        }
      }

      sql = sql + placeholder;

      if (field.alias) {
        sql += ' AS `' + field.alias + '`';
      }

      query.sql[i] = sql;
    }

    return query;
  }
}
