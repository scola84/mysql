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
    this._union = [];
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

  insert(...value) {
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

  replace(...value) {
    this.insert(...value);
    this._replace = true;

    return this;
  }

  select(value) {
    this._select.push(value);
    return this;
  }

  set(...value) {
    this._set = value;
    return this;
  }

  union(value) {
    this._union.push(value);
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
    const query = this.create(box, data);

    this
      .getPool(this._table)
      .query(query, (error, result) => {
        this._process(box, data, callback, query, error, result);
      });
  }

  create() {
    throw new Error('Not implemented');
  }

  format(box, data) {
    const query = this.create(box, data);
    return mysql.format(query.sql, query.values);
  }

  _finishGroup(box, data, values) {
    const group = this._query.group;

    if (group.sql.length > 0) {
      for (let i = 0; i < group.values.length; i += 1) {
        values[values.length] = group.values[i];
      }

      return ' GROUP BY ' + group.sql.join(', ');
    }

    return '';
  }

  _finishJoin(box, data, values) {
    const join = this._prepareJoin(this._join,
      box, data, this._query.join);

    let field = null;
    let string = '';

    for (let i = 0; i < this._join.length; i += 1) {
      field = this._join[i][0];

      string += ' ' + (field.type || 'LEFT') + ' JOIN ';

      if (field.table instanceof Database) {
        string += '(' + field.table.format(box, data) + ')';
      } else {
        string += field.table;
      }

      string += field.alias ? ' AS `' + field.alias + '`' : '';
      string += ' ON (' + join.sql[i] + ')';
    }

    for (let i = 0; i < join.values.length; i += 1) {
      values[values.length] = join.values[i];
    }

    return string;
  }

  _finishLimit(box, data, values) {
    const limit = this._prepareLimit(this._limit,
      box, data, this._query.limit);

    if (limit.sql.length > 0) {
      for (let i = 0; i < limit.values.length; i += 1) {
        values[values.length] = limit.values[i];
      }

      return ' LIMIT ' + limit.sql;
    }

    return '';
  }

  _finishOrder(box, data, values) {
    const order = this._prepareBy(this._order,
      box, data, this._query.order);

    if (order.sql.length > 0) {
      for (let i = 0; i < order.values.length; i += 1) {
        values[values.length] = order.values[i];
      }

      return ' ORDER BY ' + order.sql.join(', ');
    }

    return '';
  }

  _finishWhere(box, data, values) {
    const where = this._prepareWhere(this._where,
      box, data, this._query.where);

    if (where.sql.length > 0) {
      for (let i = 0; i < where.values.length; i += 1) {
        values[values.length] = where.values[i];
      }

      return ' WHERE (' + where.sql.join(') AND (') + ')';
    }

    return '';
  }

  _prepareBy(order, box, data, query = {}) {
    query = {
      sql: query.sql ? query.sql.slice() : [],
      values: query.values ? query.values.slice() : []
    };

    let value = null;
    let column = [];
    let dir = [];

    for (let i = 0; i < order.length; i += 1) {
      value = order[i];

      if (typeof value === 'function') {
        if (typeof box === 'undefined') {
          continue;
        }

        value = value(box, data);
      }

      column = Array.isArray(value.column) ? value.column : [value.column];
      dir = Array.isArray(value.dir) ? value.dir : [value.dir];

      for (let j = 0; j < column.length; j += 1) {
        query.sql[j] = parts.order[dir[j] || 'asc'];
        query.values[j] = column[j];
      }
    }

    return query;
  }

  _prepareCompare(compare, box, data, query = {}, operator = 'AND') {
    query = {
      sql: query.sql ? query.sql.slice() : [],
      values: query.values ? query.values.slice() : []
    };

    let field = null;
    let value = null;
    let sql = null;

    for (let i = 0; i < compare.length; i += 1) {
      if (query.sql[i]) {
        continue;
      }

      sql = [];

      let max = compare[i].length;

      if (typeof compare[i][max - 1] === 'function') {
        if (typeof box === 'undefined') {
          continue;
        }

        value = compare[i][max - 1](box, data);
        max -= 1;

        if (Array.isArray(value)) {
          let string = '';

          for (let j = 0; j < max; j += 1) {
            field = compare[i][j];

            string += j === 0 ?
              '' : ' ' + (field.operator || operator) + ' ';
            string += this._prepareCompareField(field,
              query.values, value[j]);
          }

          sql[sql.length] = string;
        } else {
          if (typeof value === 'undefined' || value === null) {
            continue;
          }

          value = String(value).split(' ');

          for (let k = 0; k < value.length; k += 1) {
            let string = '';

            for (let j = 0; j < max; j += 1) {
              field = compare[i][j];

              string += j === 0 ?
                '' : ' ' + (field.operator || operator) + ' ';
              string += this._prepareCompareField(field,
                query.values, value[k]);
            }

            sql[sql.length] = string;
          }
        }
      } else {
        for (let j = 0; j < max; j += 1) {
          field = compare[i][j];

          if (typeof field.value !== 'undefined') {
            let string = j === 0 ?
              '' : ' ' + (field.operator || operator) + ' ';

            string += '??';
            string += ' ' + (field.operator || '=') + ' ';

            query.values[query.values.length] = field.column;

            if (field.value === 'NULL' || field.value === 'NOT NULL') {
              string += field.value;
            } else if (field.value instanceof Database) {
              string += '(' + field.value.format(box, data) + ')';
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

  _prepareCompareField(field, values, value) {
    const interval = value.match(
      /([\[\(])([-+]?[0-9]*\.?[0-9]*);([-+]?[0-9]*\.?[0-9]*)([\)\]])/
    );

    if (interval) {
      return this._prepareCompareInterval(field, values, interval);
    }

    const like = value.match(/\*/);

    if (like) {
      return this._prepareCompareLike(field, values, value);
    }

    return this._prepareCompareIn(field, values, value);
  }

  _prepareCompareIn(field, values, value) {
    values[values.length] = field.column;
    values[values.length] = value;
    return '?? IN (?)';
  }

  _prepareCompareInterval(field, values, value) {
    const intervals = [];

    if (value[2]) {
      values[values.length] = field.column;
      values[values.length] = value[2];
      intervals[intervals.length] = value[1] === '[' ? '?? >= ?' : '?? > ?';
    }

    if (value[3]) {
      values[values.length] = field.column;
      values[values.length] = value[3];
      intervals[intervals.length] = value[4] === ']' ? '?? <= ?' : '?? < ?';
    }

    return '(' + intervals.join(' AND ') + ')';
  }

  _prepareCompareLike(field, values, value) {
    values[values.length] = field.column;
    values[values.length] = value.replace(/\*/, '%');
    return '?? LIKE ?';
  }

  _prepareFrom(from, box, data) {
    const query = {
      sql: '',
      values: []
    };

    if (from.table instanceof Database) {
      query.sql = '(' + from.table.format(box, data) + ')';
    } else {
      query.sql = '??';
      query.values[0] = from.table;
    }

    if (from.alias) {
      query.sql += ' AS `' + from.alias + '`';
    }

    return query;
  }

  _prepareJoin(join, box, data, query) {
    return this._prepareCompare(join, box, data, query, 'OR');
  }

  _prepareLimit(limit, box, data, query = {}) {
    query = {
      sql: query.sql || '',
      values: query.values ? query.values.slice() : []
    };

    if (typeof box === 'undefined') {
      return query;
    }

    if (typeof limit === 'function') {
      limit = limit(box, data);
    }

    if (typeof limit.count !== 'undefined') {
      query.values[0] = limit.count;
    }

    if (typeof limit.offset !== 'undefined') {
      query.values[1] = limit.offset;
    }

    if (query.values.length > 0) {
      query.sql = '?';
    }

    if (query.values.length > 1) {
      query.sql = '? OFFSET ?';
    }

    return query;
  }

  _prepareWhere(where, box, data, query = {}) {
    return this._prepareCompare(where, box, data, query);
  }

  _process(box, data, callback, query, error, result) {
    try {
      if (error) {
        this._processError(error);
        return;
      }

      // only merge if result is defined

      data = this.merge(box, data, { query, result });

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
