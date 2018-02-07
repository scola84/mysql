/*eslint no-useless-escape: 0 */

import { Worker } from '@scola/worker';
import mysql from 'mysql';

const pools = {};
let poolOptions = {};

export const parts = {
  order: {
    asc: '?? ASC',
    ascsig: 'CAST(?? AS SIGNED) ASC',
    desc: '?? DESC',
    descsig: 'CAST(?? AS SIGNED) DESC'
  },
  wrap: {
    avg: 'AVG(%1$s)',
    bit_and: 'BIT_AND(%1$s)',
    bit_or: 'BIT_OR(%1$s)',
    bit_xor: 'BIT_XOR(%1$s)',
    coalesce: 'COALESCE(%1$s)',
    concat: 'GROUP_CONCAT(%1$s)',
    concat_ws: 'CONCAT_WS("%2$s",%1$s)',
    count: 'COUNT(%1$s)',
    distinct: 'DISTINCT %1$s',
    max: 'MAX(%1$s)',
    min: 'MIN(%1$s)',
    std: 'STD(%1$s)',
    sum: 'SUM(%1$s)',
    var: 'VARIANCE(%1$s)'
  }
};

export default class Database extends Worker {
  static setOptions(value) {
    poolOptions = value;
  }

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
    this._union = [];
    this._update = {};
    this._query = null;
    this._where = [];

    this.setNest(options.nest);
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

  join(value) {
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

  union(value) {
    this._union.push(value);
    return this;
  }

  update(value) {
    this._update = value;
    return this;
  }

  where(value) {
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
        values.push(...group.values[i]);
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
      field = this._join[i];

      string += ' ' + (field.type || 'LEFT') + ' JOIN ';

      if (field.table instanceof Database) {
        string += '(' + field.table.format(box, data) + ')';
      } else {
        string += field.table;
      }

      string += field.alias ? ' AS `' + field.alias + '`' : '';
      string += ' ON ' + join.sql[i];
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
        values.push(...order.values[i]);
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

      return ' WHERE ' + where.sql.join(' AND ');
    }

    return '';
  }

  _prepareBy(order, box, data, query = {}) {
    query = {
      sql: query.sql ? query.sql.slice() : [],
      values: query.values ? query.values.slice() : []
    };

    let sql = [];
    let values = [];

    let column = null;
    let dir = null;
    let field = null;

    for (let i = 0; i < order.length; i += 1) {
      if (query.sql[i]) {
        continue;
      }

      sql = [];
      values = [];
      field = order[i];

      if (typeof field === 'function') {
        if (typeof box === 'undefined') {
          continue;
        }

        field = field(box, data);
      }

      column = Array.isArray(field.column) ?
        field.column : [field.column];

      dir = Array.isArray(field.dir) ?
        field.dir : [field.dir];

      for (let j = 0; j < column.length; j += 1) {
        sql[j] = parts.order[dir[j] || 'asc'];
        values[j] = column[j];
      }

      if (sql.length) {
        query.sql[i] = sql.join(', ');
        query.values[i] = values;
      }
    }

    return query;
  }

  _prepareCompare(compare, box, data, query = {}, operator) {
    query = {
      sql: query.sql ? query.sql.slice() : [],
      values: query.values ? query.values.slice() : []
    };

    let column = null;
    let field = null;
    let sql = null;
    let sqlOr = null;
    let sqlAnd = null;
    let value = null;

    for (let i = 0; i < compare.length; i += 1) {
      if (query.sql[i]) {
        continue;
      }

      sql = [];
      field = compare[i];

      column = Array.isArray(field.column) ?
        field.column : [field.column];
      value = field.value;

      if (value instanceof Database) {
        if (typeof box !== 'undefined') {
          sql[sql.length] = '(' + field.value.format(box, data) + ')';
        }

        continue;
      }

      if (typeof value === 'function') {
        if (typeof box === 'undefined') {
          continue;
        }

        value = value(box, data);
      }

      if (Array.isArray(value)) {
        sqlOr = [];

        for (let j = 0; j < column.length; j += 1) {
          sqlOr[sqlOr.length] = this._prepareCompareField(field, column[j],
            query.values, String(value[j]));
        }

        sql[sql.length] = sqlOr.join(' ' + operator + ' ');
      } else {
        if (typeof value === 'undefined' || value === null) {
          if (field.required !== false) {
            const error = new Error('500 Compare value undefined');
            error.compare = compare;
            error.field = field;
            throw error;
          }

          continue;
        }

        sqlAnd = [];
        value = String(value).match(/[^"\s]+|"[^"]+"/g);

        for (let k = 0; k < value.length; k += 1) {
          sqlOr = [];

          for (let j = 0; j < column.length; j += 1) {
            sqlOr[sqlOr.length] = this._prepareCompareField(field, column[j],
              query.values, value[k]);
          }

          sqlAnd[sqlAnd.length] = sqlOr.join(' ' + operator + ' ');
        }

        sql[sql.length] = sqlAnd.length > 1 ?
          '(' + sqlAnd.join(') AND (') + ')' :
          sqlAnd.join('');
      }

      if (sql.length) {
        query.sql[query.sql.length] = '(' + sql.join(') AND (') + ')';
      }
    }

    return query;
  }

  _prepareCompareField(field, column, values, value) {
    const interval = value.match(
      /([\[\(])([-+]?[0-9]*\.?[0-9]*);([-+]?[0-9]*\.?[0-9]*)([\)\]])/
    );

    if (interval) {
      return this._prepareCompareInterval(field, column, values, interval);
    }

    const like = value.match(/\*/);

    if (like) {
      return this._prepareCompareLike(field, column, values, value);
    }

    return this._prepareCompareIs(field, column, values, value);
  }

  _prepareCompareIs(field, column, values, value) {
    let string = '??';
    values[values.length] = column;

    if (field.operator === 'IS') {
      string += ' IS ' + value;
    } else if (field.operator === 'IN') {
      values[values.length] = value;
      string += ' IN (?)';
    } else {
      values[values.length] = value;
      string += ' = ';
      string += typeof field.value === 'function' ? '?' : '??';
    }

    return string;
  }

  _prepareCompareInterval(field, column, values, value) {
    const intervals = [];

    if (value[2]) {
      values[values.length] = column;
      values[values.length] = value[2];
      intervals[intervals.length] = value[1] === '[' ? '?? >= ?' : '?? > ?';
    }

    if (value[3]) {
      values[values.length] = column;
      values[values.length] = value[3];
      intervals[intervals.length] = value[4] === ']' ? '?? <= ?' : '?? < ?';
    }

    return '(' + intervals.join(' AND ') + ')';
  }

  _prepareCompareLike(field, column, values, value) {
    values[values.length] = column;
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
    return this._prepareCompare(join, box, data, query, 'AND');
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
    return this._prepareCompare(where, box, data, query, 'OR');
  }

  _process(box, data, callback, query, error, result) {
    try {
      if (error) {
        this._processError(error);
        return;
      }

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
