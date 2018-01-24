/*eslint no-useless-escape: 0 */

import { Worker } from '@scola/worker';
import mysql from 'mysql';
import parts from './parts';

const pools = {};
let poolOptions = {};

export default class Database extends Worker {
  constructor(options = {}) {
    super(options);

    this._delete = {};
    this._from = {};
    this._group = [];
    this._join = [];
    this._limit = {};
    this._nest = null;
    this._order = [];
    this._replace = null;
    this._select = [];
    this._set = {};
    this._type = null;
    this._update = {};
    this._query = null;
    this._where = [];

    this.setNest(options.nest);
    this.setType(options.type);
  }

  static setOptions(value) {
    poolOptions = value;
  }

  getPool(name = 'default') {
    if (!pools[name]) {
      pools[name] = mysql
        .createPool(poolOptions[name] || poolOptions.default);
    }

    return {
      query(string, values, callback) {
        pools[name].query(string, values, callback);
      }
    };
  }

  setNest(value = false) {
    this._nest = value;
    return this;
  }

  setType(value = 'object') {
    this._type = value;
    return this;
  }

  delete(value) {
    this._delete = value;
    return this;
  }

  from(value) {
    this._from = value;
    return this;
  }

  group(value) {
    this._group.push(value);
    return this;
  }

  insert(value) {
    this._insert = value;
    return this;
  }

  into(value) {
    this._into = value;
    return this;
  }

  join(...value) {
    this._join.push(value);
    return this;
  }

  limit(value) {
    this._limit = value;
    return this;
  }

  order(value) {
    this._order.push(value);
    return this;
  }

  replace(value) {
    this.insert(value);
    this._replace = true;

    return this;
  }

  select(value) {
    this._select.push(value);
    return this;
  }

  set(value) {
    this._set = value;
    return this;
  }

  update(value) {
    this._update = value;
    return this;
  }

  where(...value) {
    this._where.push(value);
    return this;
  }

  act(box, data, callback) {
    const input = this.filter(box, data);
    const query = this.build(input);

    this
      .getPool(this._table)
      .query(query, (error, result) => {
        this._process(box, data, callback,
          input, error, result);
      });
  }

  build() {
    throw new Error('Not implemented');
  }

  format(input) {
    const query = this.build(input);
    return mysql.format(query.sql, query.values);
  }

  _finishGroup(input, values) {
    const group = this._query.group;

    if (group.sql.length > 0) {
      for (let i = 0; i < group.values.length; i += 1) {
        values[values.length] = group.values[i];
      }

      return ' GROUP BY ' + group.sql.join(', ');
    }

    return '';
  }

  _finishJoin(input, values) {
    const join = input.join ?
      this._prepareJoin(this._join, this._query.join, input.join) :
      this._query.join;

    let field = null;
    let string = '';

    for (let i = 0; i < this._join.length; i += 1) {
      field = this._join[i][0];

      string += ' ' + (field.type || 'LEFT') + ' JOIN ';

      if (field.table instanceof Database) {
        string += '(' + field.table.format(input) + ')';
      } else {
        string += field.table;
      }

      string += field.alias ? ' AS ' + field.alias : '';
      string += ' ON (' + join.sql[i] + ')';
    }

    for (let i = 0; i < join.values.length; i += 1) {
      values[values.length] = join.values[i];
    }

    return string;
  }

  _finishLimit(input, values) {
    const limit = input.limit ?
      this._prepareLimit(this._limit, this._query.limit, input.limit) :
      this._query.limit;

    if (limit.sql.length > 0) {
      for (let i = 0; i < limit.values.length; i += 1) {
        values[values.length] = limit.values[i];
      }

      return ' LIMIT ' + limit.sql;
    }

    return '';
  }

  _finishOrder(input, values) {
    const order = input.order ?
      this._prepareBy(this._order, this._query.order, input.order) :
      this._query.order;

    if (order.sql.length > 0) {
      for (let i = 0; i < order.values.length; i += 1) {
        values[values.length] = order.values[i];
      }

      return ' ORDER BY ' + order.sql.join(', ');
    }

    return '';
  }

  _finishWhere(input, values) {
    const where = input.where ?
      this._prepareWhere(this._where, this._query.where, input.where) :
      this._query.where;

    if (where.sql.length > 0) {
      for (let i = 0; i < where.values.length; i += 1) {
        values[values.length] = where.values[i];
      }

      return ' WHERE (' + where.sql.join(') AND (') + ')';
    }

    return '';
  }

  _prepareBy(order, query = {}, input = {}) {
    query = {
      sql: query.sql ? query.sql.slice() : [],
      values: query.values ? query.values.slice() : []
    };

    input = {
      dir: input.dir || [],
      column: input.column || []
    };

    for (let i = 0; i < order.length; i += 1) {
      if (query.sql[i]) {
        continue;
      }

      query.sql[i] = parts.order[order[i].dir || 'asc'];
      query.values[i] = order[i].column;
    }

    for (let i = 0; i < input.column.length; i += 1) {
      query.sql[query.sql.length] = parts.order[input.dir[i]] ||
        parts.order.asc;
      query.values[query.values.length] = input.column[i];
    }

    return query;
  }

  _prepareCompare(compare, query = {}, input = [], op = 'AND') {
    query = {
      sql: query.sql ? query.sql.slice() : [],
      values: query.values ? query.values.slice() : []
    };

    input = Array.isArray(input) ? input : [input];

    let field = null;
    let value = null;
    let sql = null;

    for (let i = 0; i < compare.length; i += 1) {
      if (query.sql[i]) {
        continue;
      }

      sql = [];

      if (typeof input[i] !== 'undefined' && input[i] !== null) {
        value = String(input[i]).split(' ');

        for (let k = 0; k < value.length; k += 1) {
          let string = '';

          for (let j = 0; j < compare[i].length; j += 1) {
            field = compare[i][j];

            string += j === 0 ? '' : ' ' + (field.op || op) + ' ';
            string += this._prepareCompareField(field,
              query.values, value[k]);
          }

          sql[sql.length] = string;
        }
      } else {
        for (let j = 0; j < compare[i].length; j += 1) {
          field = compare[i][j];

          if (typeof field.value !== 'undefined') {
            let string = j === 0 ? '' : ' ' + (field.op || op) + ' ';

            string += '??';
            string += ' ' + (field.op || '=') + ' ';

            query.values[query.values.length] = field.column;

            if (field.value instanceof Database) {
              string += '(' + field.value.format(input) + ')';
            } else {
              string += '??';
              query.values[query.values.length] = field.value;
            }

            sql[sql.length] = string;
          }
        }
      }

      if (sql.length) {
        query.sql[query.sql.length] = sql.join('');
      }
    }

    return query;
  }

  _prepareCompareField(field, values, input) {
    const interval = input.match(
      /([\[\(])([-+]?[0-9]*\.?[0-9]*);([-+]?[0-9]*\.?[0-9]*)([\)\]])/
    );

    if (interval) {
      return this._prepareCompareInterval(field, values, interval);
    }

    const is = input.match(/^is-((not-)?null)$/);

    if (is) {
      return this._prepareCompareIs(field, values, is);
    }

    const like = input.match(/\*/);

    if (like) {
      return this._prepareCompareLike(field, values, input);
    }

    return this._prepareCompareIn(field, values, input);
  }

  _prepareCompareIn(field, values, input) {
    values[values.length] = field.column;
    values[values.length] = input;
    return '?? IN (?)';
  }

  _prepareCompareInterval(field, values, input) {
    const intervals = [];

    if (input[2]) {
      values[values.length] = field.column;
      values[values.length] = input[2];
      intervals[intervals.length] = input[1] === '[' ? '?? >= ?' : '?? > ?';
    }

    if (input[3]) {
      values[values.length] = field.column;
      values[values.length] = input[3];
      intervals[intervals.length] = input[4] === ']' ? '?? <= ?' : '?? < ?';
    }

    return '(' + intervals.join(' AND ') + ')';
  }

  _prepareCompareIs(field, values, input) {
    values[values.length] = field.column;
    return input[0] === 'is-null' ? '?? IS NULL' : '?? IS NOT NULL';
  }

  _prepareCompareLike(field, values, input) {
    values[values.length] = field.column;
    values[values.length] = input.replace(/\*/, '%');
    return '?? LIKE ?';
  }

  _prepareFrom(from) {
    const query = {
      sql: '',
      values: []
    };

    if (from.table instanceof Database) {
      query.sql = '(' + from.table.format() + ')';
    } else {
      query.sql = '??';
      query.values[0] = from.table;
    }

    if (from.alias) {
      query.sql += ' AS ' + from.alias;
    }

    return query;
  }

  _prepareJoin(join, query, input) {
    return this._prepareCompare(join, query, input, 'OR');
  }

  _prepareLimit(limit, query = {}, input = {}) {
    query = {
      sql: query.sql || '',
      values: query.values ? query.values.slice() : []
    };

    if (typeof limit.count !== 'undefined') {
      query.values[0] = limit.count;
    }

    if (typeof input.count !== 'undefined') {
      query.values[0] = input.count;
    }

    if (typeof limit.offset !== 'undefined') {
      query.values[1] = limit.offset;
    }

    if (typeof input.offset !== 'undefined') {
      query.values[1] = input.offset;
    }

    if (query.values.length > 0) {
      query.sql = '?';
    }

    if (query.values.length > 1) {
      query.sql = '? OFFSET ?';
    }

    return query;
  }

  _prepareWhere(where, query = {}, input = []) {
    return this._prepareCompare(where, query, input);
  }

  _process(box, data, callback, input, error, result) {
    try {
      if (error) {
        this._processError(error);
        return;
      }

      data = this.merge(box, data, { result, input });

      this.pass(box, data, callback);
    } catch (finalError) {
      this.fail(box, finalError, callback);
    }
  }

  _processError(error) {
    if (error.code === 'ER_DUP_ENTRY') {
      error = new Error('409 Object already exists');
    }

    throw error;
  }
}
