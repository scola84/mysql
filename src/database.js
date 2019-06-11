/*eslint no-useless-escape: 0 */

import { Worker } from '@scola/worker';
import each from 'async/each';
import merge from 'lodash-es/merge';
import trim from 'lodash-es/trim';
import mysql from 'mysql';
import sprintf from 'sprintf-js';

const pools = {};
const woptions = {};

export const parts = {
  by: {
    asc: '?? ASC',
    ascsig: 'CAST(?? AS SIGNED) ASC',
    desc: '?? DESC',
    descsig: 'CAST(?? AS SIGNED) DESC',
    nodir: '??'
  },
  wrap: {
    avg: 'AVG(%1$s)',
    bit_and: 'BIT_AND(%1$s)',
    bit_or: 'BIT_OR(%1$s)',
    bit_xor: 'BIT_XOR(%1$s)',
    cast: 'CAST(%1$s AS %2$s)',
    coalesce: 'COALESCE(%1$s)',
    concat: 'GROUP_CONCAT(%1$s)',
    concat_ws: 'CONCAT_WS("%2$s",%1$s)',
    count: 'COUNT(%1$s)',
    distinct: 'DISTINCT %1$s',
    if: 'IF(%1$s,%2$s,%3$s)',
    ifnull: 'IFNULL(%1$s,%2$s)',
    insert: 'INSERT(%1$s,%2$s,%3$s,%4$s)',
    lag: 'LAG(%1$s)',
    last_id: 'LAST_INSERT_ID()',
    lead: 'LEAD(%1$s)',
    max: 'MAX(%1$s)',
    min: 'MIN(%1$s)',
    round_date: 'UNIX_TIMESTAMP(FROM_UNIXTIME((?? / 1000) + ??, %1$s)) * 1000',
    round_time: 'FLOOR(?? / (%1$s * 1000)) * (%1$s * 1000)',
    row_number: 'ROW_NUMBER()',
    std: 'STD(%1$s)',
    sum: 'SUM(%1$s)',
    substring: 'SUBSTRING(%1$s,%2$s,%3$s)',
    var: 'VARIANCE(%1$s)'
  }
};

const triggers = {
  after: [],
  before: []
};

export default class Database extends Worker {
  static getOptions() {
    return woptions;
  }

  static setOptions(options) {
    merge(woptions, options);
  }

  static createTrigger(time, event, worker) {
    triggers[time].push({
      event: new RegExp(event),
      worker
    });
  }

  constructor(options = {}) {
    super(options);

    this._commit = null;
    this._delete = {};
    this._from = {};
    this._group = [];
    this._host = null;
    this._join = [];
    this._insert = {};
    this._into = {};
    this._limit = {};
    this._order = [];
    this._replace = null;
    this._select = [];
    this._set = {};
    this._union = [];
    this._update = {};
    this._query = null;
    this._rollback = null;
    this._start = null;
    this._with = [];
    this._where = [];

    this._connection = null;
    this._create = null;
    this._execute = null;
    this._key = null;
    this._nest = null;
    this._timeout = null;
    this._trigger = null;

    this.setConnection(options.connection);
    this.setCreate(options.create);
    this.setExecute(options.execute);
    this.setKey(options.key);
    this.setNest(options.nest);
    this.setTimeout(options.timeout);
    this.setTrigger(options.trigger);
  }

  getOptions() {
    return Object.assign(super.getOptions(), {
      connection: this._connection,
      create: this._create,
      execute: this._execute,
      key: this._key,
      nest: this._nest,
      timeout: this._timeout,
      trigger: this._trigger
    });
  }

  getPool(box, data) {
    let name = this._host ?
      this._host.name :
      woptions.default;

    if (typeof name === 'function') {
      name = name(box, data);
    }

    const shard = this._host && this._host.shard ?
      this._host.shard(box, data) : null;

    const index = shard === null ?
      0 :
      Math.floor(shard / woptions[name].shards);

    const pool = name + index;

    if (typeof pools[pool] === 'undefined') {
      let options = woptions[name].options;

      if (typeof options === 'function') {
        options = options(box, data, index);
      }

      pools[pool] = mysql.createPool(options);
    }

    return pools[pool];
  }

  getConnection() {
    return this._connection;
  }

  setConnection(value = null) {
    this._connection = value;
    return this;
  }

  getCreate() {
    return this._create;
  }

  setCreate(value = null) {
    this._create = value;
    return this;
  }

  getExecute() {
    return this._execute;
  }

  setExecute(value = true) {
    this._execute = value;
    return this;
  }

  getKey() {
    return this._key;
  }

  setKey(value = null) {
    this._key = value;
    return this;
  }

  getNest() {
    return this._nest;
  }

  setNest(value = false) {
    this._nest = value;
    return this;
  }

  getTimeout() {
    return this._timeout;
  }

  setTimeout(value = null) {
    this._timeout = value;
    return this;
  }

  getTrigger() {
    return this._trigger;
  }

  setTrigger(value) {
    this._trigger = this._trigger === false ?
      false : value;
    return this;
  }

  commit(value) {
    this._commit = value;
    return this;
  }

  delete(value) {
    Object.assign(this._delete, value);
    return this;
  }

  from(value) {
    if (this._union.length > 0) {
      return this._passToUnion('from', value);
    }

    Object.assign(this._from, value);
    return this;
  }

  group(value, index) {
    if (this._union.length > 0) {
      return this._passToUnion('group', value, index);
    }

    index = typeof index === 'undefined' ?
      this._group.length : index;

    if (typeof this._group[index] === 'undefined') {
      this._group[index] = {};
    }

    if (typeof value === 'function') {
      this._group[index] = value;
    } else {
      Object.assign(this._group[index], value);
    }

    return this;
  }

  host(value) {
    this._host = value;
    return this;
  }

  insert(value) {
    Object.assign(this._insert, value);
    return this;
  }

  into(value) {
    Object.assign(this._into, value);
    return this;
  }

  join(value, index) {
    if (this._union.length > 0) {
      return this._passToUnion('join', value, index);
    }

    index = typeof index === 'undefined' ?
      this._join.length : index;

    if (typeof this._join[index] === 'undefined') {
      this._join[index] = {};
    }

    Object.assign(this._join[index], value);
    return this;
  }

  limit(value) {
    if (typeof value === 'function') {
      this._limit = value;
    } else {
      Object.assign(this._limit, value);
    }

    return this;
  }

  order(value, index) {
    index = typeof index === 'undefined' ?
      this._order.length : index;

    if (typeof this._order[index] === 'undefined') {
      this._order[index] = {};
    }

    if (typeof value === 'function') {
      this._order[index] = value;
    } else {
      Object.assign(this._order[index], value);
    }

    return this;
  }

  replace(value, index) {
    this.insert(value, index);
    this._replace = true;

    return this;
  }

  rollback(value) {
    this._rollback = value;
    return this;
  }

  select(value, index) {
    if (this._union.length > 0) {
      return this._passToUnion('select', value, index);
    }

    index = typeof index === 'undefined' ?
      this._select.length : index;

    if (typeof this._select[index] === 'undefined') {
      this._select[index] = {};
    }

    Object.assign(this._select[index], value);
    return this;
  }

  set(value) {
    Object.assign(this._set, value);
    return this;
  }

  start(value) {
    this._start = value;
    return this;
  }

  union(value) {
    this._union.push(value);
    return this;
  }

  update(value) {
    Object.assign(this._update, value);
    return this;
  }

  with(value, index) {
    index = typeof index === 'undefined' ?
      this._with.length : index;

    if (typeof this._with[index] === 'undefined') {
      this._with[index] = {};
    }

    Object.assign(this._with[index], value);
    return this;
  }

  where(value, index) {
    if (this._union.length > 0) {
      return this._passToUnion('where', value, index);
    }

    index = typeof index === 'undefined' ?
      this._where.length : index;

    if (typeof this._where[index] === 'undefined') {
      this._where[index] = {};
    }

    Object.assign(this._where[index], value);
    return this;
  }

  act(box, data, callback) {
    data = this.filter(box, data);
    const query = this.create(box, data);

    if (this._log === 'query') {
      console.log(this.formatQuery(query));
    }

    if (this._execute === false) {
      this.pass(box, data, callback);
      return;
    }

    query.timeout = this._timeout === null ?
      query.timeout : this._timeout;

    this.connection(box, data, (connectionError, connection, release = true) => {
      if (connectionError) {
        this._handleError(box, data, callback, query, connectionError);
        return;
      }

      this._handleTriggers('before', box, data, query, () => {
        connection.query(query, (error, result) => {
          if (release) {
            connection.release();
          }

          try {
            this._handle(box, data, callback, query, error, result);
          } catch (tryError) {
            this._handleError(box, data, callback, query, tryError);
          }
        });
      });
    });
  }

  connection(box, data, callback) {
    const pool = this.getPool(box, data);

    if (this._connection) {
      this._connection(box, data, pool, callback);
      return;
    }

    if (box.connection) {
      callback(null, box.connection, false);
      return;
    }

    pool.getConnection(callback);
  }

  create(box, data) {
    if (this._create) {
      return this._create(box, data);
    }

    throw new Error('Not implemented');
  }

  format(box, data) {
    return this.formatQuery(this.create(box, data));
  }

  formatQuery(query) {
    return mysql.format(query.sql, query.values);
  }

  operate(name, operator, value) {
    return mysql.raw(`${mysql.escapeId(name)} ${operator} ${value}`);
  }

  raw(value) {
    return mysql.raw(value);
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

  _finishHead(head, values) {
    if (head.sql.length > 0) {
      for (let i = 0; i < head.values.length; i += 1) {
        values[values.length] = head.values[i];
      }

      return ' ' + head.sql.join(', ');
    }

    return '';
  }

  _finishJoin(box, data, values) {
    const join = this._prepareJoin(this._join,
      box, data, this._query.join);

    let field = null;
    let shard = null;
    let string = '';
    let table = null;

    for (let i = 0; i < this._join.length; i += 1) {
      if (typeof join.sql[i] === 'undefined') {
        continue;
      }

      field = this._join[i];
      table = field.table;
      shard = field.shard;

      string += ' ' + (field.type || 'LEFT') + ' JOIN ';

      if (table instanceof Database) {
        string += '(' + field.table.format(box, data) + ')';
      } else if (table && table[0] === '`') {
        string += table;
      } else {
        if (typeof shard !== 'undefined') {
          shard = typeof shard === 'function' ? shard(box, data) : shard;
        }

        string += this._formatTable(box, data, table, shard, true);
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

  _finishWith(box, data, values) {
    const wth = this._prepareWith(this._with,
      box, data, this._query.with);

    if (wth.sql.length > 0) {
      for (let i = 0; i < wth.values.length; i += 1) {
        values[values.length] = wth.values[i];
      }

      return 'WITH ' + wth.sql + ' ';
    }

    return '';
  }

  _finishWhere(box, data, values) {
    const where = this._prepareWhere(this._where,
      box, data, this._query.where);

    let sql = '';

    for (let i = 0; i < where.sql.length; i += 1) {
      if (typeof where.sql[i] === 'undefined') {
        continue;
      }

      sql += sql.length === 0 ? ' WHERE ' : ' AND ';
      sql += where.sql[i];
    }

    if (sql.length > 0) {
      for (let i = 0; i < where.values.length; i += 1) {
        values[values.length] = where.values[i];
      }

      return sql;
    }

    return '';
  }

  _formatTable(box, data, table, shard = null, quote = false) {
    let name = this._host ?
      this._host.name :
      woptions.default;

    if (typeof name === 'function') {
      if (typeof box === 'undefined') {
        return null;
      }

      name = name(box, data);
    }

    let database = woptions[name].database;

    if (shard !== null) {
      database = sprintf.sprintf(database, shard);
    }

    return quote ? `\`${database}\`.\`${table}\`` : `${database}.${table}`;
  }

  _passToUnion(name, ...args) {
    for (let i = 0; i < this._union.length; i += 1) {
      this._union[i][name](...args);
    }

    return this;
  }

  _prepareBy(by, box, data, query = {}) {
    query = {
      sql: query.sql ? query.sql.slice() : [],
      values: query.values ? query.values.slice() : []
    };

    let columns = null;
    let dir = null;
    let field = null;

    let sql = [];
    let values = [];

    for (let i = 0; i < by.length; i += 1) {
      if (query.sql[i]) {
        continue;
      }

      field = by[i];
      sql = [];
      values = [];

      if (typeof field === 'function') {
        if (typeof box === 'undefined') {
          continue;
        }

        field = field(box, data);
      }

      columns = Array.isArray(field.columns) ?
        field.columns : [field.columns];

      dir = Array.isArray(field.dir) ?
        field.dir : [field.dir];

      for (let j = 0; j < columns.length; j += 1) {
        if (typeof columns[j] !== 'undefined') {
          sql[j] = parts.by[dir[j] || 'nodir'];
          values[j] = columns[j];
        }
      }

      if (sql.length) {
        query.sql[i] = sql.join(', ');
        query.values[i] = values;
      }
    }

    return query;
  }

  _prepareCompare(compare, box, data, query = {}, join) {
    query = {
      sql: query.sql ? query.sql.slice() : [],
      values: query.values ? query.values.slice() : []
    };

    let columns = null;
    let field = null;
    let operators = null;
    let sql = null;
    let value = null;

    for (let i = 0; i < compare.length; i += 1) {
      if (query.sql[i]) {
        continue;
      }

      sql = [];
      field = compare[i];

      columns = field.columns;
      operators = field.operator;
      value = field.value;

      if (value instanceof Database) {
        if (typeof box !== 'undefined') {
          sql[sql.length] = '(' + field.value.format(box, data) + ')';
        }

        continue;
      }

      if (typeof columns === 'function') {
        if (typeof box === 'undefined') {
          continue;
        }

        columns = columns(box, data);
      }

      if (typeof operators === 'function') {
        if (typeof box === 'undefined') {
          continue;
        }

        operators = operators(box, data);
      }

      if (typeof value === 'function') {
        if (typeof box === 'undefined') {
          continue;
        }

        value = value(box, data);
      }

      columns = Array.isArray(columns) ? columns : [columns];
      operators = Array.isArray(operators) ? operators : [operators];

      if (Array.isArray(value)) {
        sql = this._prepareCompareAsArray(field, columns, operators,
          query.values, value, field.join || join);
      } else {
        sql = this._prepareCompareAsString(field, columns, operators,
          query.values, value, field.join || join);
      }

      if (sql) {
        query.sql[i] = sql;
      }
    }

    return query;
  }

  _prepareCompareAsArray(field, columns, operators, values, value, join) {
    const sqlOr = [];

    for (let i = 0; i < columns.length; i += 1) {
      sqlOr[sqlOr.length] = (field.not ? 'NOT ' : '') +
        this._prepareCompareField(field, columns[i], operators[i],
          values, value[i]);
    }

    return '(' + sqlOr.join(' ' + join + ' ') + ')';
  }

  _prepareCompareAsString(field, columns, operators, values, value, join) {
    if (typeof value === 'undefined' || value === null || value === '') {
      if (field.required !== false) {
        const error = new Error('500 Compare value undefined');
        error.field = field;
        throw error;
      }

      return null;
    }

    const sqlAnd = [];
    let sqlOr = null;

    value = typeof value === 'object' && value.toSqlString ?
      ([value]) : String(value).match(/[^"\s]+|"[^"]+"/g);

    for (let i = 0; i < value.length; i += 1) {
      sqlOr = [];

      for (let j = 0; j < columns.length; j += 1) {
        sqlOr[sqlOr.length] = (field.not ? 'NOT ' : '') +
          this._prepareCompareField(field, columns[j], operators[j],
            values, value[i]);
      }

      sqlAnd[sqlAnd.length] = sqlOr.length > 1 ?
        '(' + sqlOr.join(' ' + join + ' ') + ')' :
        sqlOr.join('');
    }

    return sqlAnd.length > 1 ?
      '(' + sqlAnd.join(') AND (') + ')' :
      sqlAnd.join('');
  }

  _prepareCompareField(field, column, operator, values, value) {
    if (typeof value === 'object' && value.toSqlString) {
      return this._prepareCompareFieldRaw(field, column, operator,
        values, value);
    }

    if (operator === 'IN') {
      return this._prepareCompareFieldIn(field, column, operator,
        values, value);
    }

    value = trim(value, '"');

    const interval = value.match(
      /([\[\(])([-+]?[0-9]*\.?[0-9]*);([-+]?[0-9]*\.?[0-9]*)([\)\]])/
    );

    if (interval) {
      return this._prepareCompareFieldInterval(field, column, operator,
        values, interval);
    }

    const like = value.match(/\*/);

    if (like) {
      return this._prepareCompareFieldLike(field, column, operator,
        values, value);
    }

    return this._prepareCompareFieldIs(field, column, operator,
      values, value);
  }

  _prepareCompareFieldIn(field, column, operator, values, value) {
    let placeholder = '?';

    if (typeof column === 'string') {
      column = column.split(',');
      placeholder = '??';
    }

    values[values.length] = column;
    values[values.length] = value;

    return `(${placeholder}) IN (?)`;
  }

  _prepareCompareFieldInterval(field, column, operator, values, value) {
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

  _prepareCompareFieldIs(field, column, operator, values, value) {
    let string = typeof column === 'string' ? '??' : '?';
    values[values.length] = column;

    string += ' ' + (operator || '=') + ' ';

    if (operator === 'IS') {
      string += value;
    } else {
      values[values.length] = value;
      string += typeof field.value === 'function' ? '?' : '??';
    }

    return string;
  }

  _prepareCompareFieldLike(field, column, operator, values, value) {
    values[values.length] = column;
    values[values.length] = value.replace(/\*/g, '%');
    return '?? LIKE ?';
  }

  _prepareCompareFieldRaw(field, column, operator, values, value) {
    values[values.length] = column;
    values[values.length] = value;
    return '?? = ?';
  }

  _prepareFrom(from, box, data) {
    const query = {
      sql: '',
      values: []
    };

    let table = from.table;
    let shard = from.shard;

    if (typeof table === 'function') {
      if (typeof box === 'undefined') {
        return query;
      }

      table = table(box, data);
    }

    if (typeof table === 'undefined') {
      return query;
    }

    if (table instanceof Database) {
      query.sql = '(' + table.format(box, data) + ')';
    } else if (table[0] === '`') {
      query.sql = table;
    } else {
      if (typeof shard !== 'undefined') {
        if (typeof box === 'undefined') {
          return query;
        }

        shard = typeof shard === 'function' ? shard(box, data) : shard;
      }

      query.sql = '??';
      query.values[0] = this._formatTable(box, data, table, shard);
    }

    if (from.alias) {
      query.sql += ' AS `' + from.alias + '`';
    }

    return query;
  }

  _prepareHead(head, box, data, query = {}) {
    query = {
      sql: query.sql ? query.sql.slice() : [],
      values: query.values ? query.values.slice() : []
    };

    if (query.sql.length > 0) {
      return query;
    }

    let shard = head.shard;
    let table = head.table;

    if (typeof table === 'function') {
      if (typeof box === 'undefined') {
        return query;
      }

      table = table(box, data);
    }

    if (typeof shard !== 'undefined') {
      if (typeof box === 'undefined') {
        return query;
      }

      shard = typeof shard === 'function' ? shard(box, data) : shard;
    }

    if (typeof table !== 'undefined') {
      table = Array.isArray(table) ? table : [table];

      for (let i = 0; i < table.length; i += 1) {
        query.sql[i] = '??';
        query.values[i] = this._formatTable(box, data, table[i], shard);
      }
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

  _prepareWith(wth, box, data, query = {}) {
    query = {
      sql: query.sql ? query.sql.slice() : [],
      values: query.values ? query.values.slice() : []
    };

    let clause = null;
    let columns = null;
    let list = null;
    let name = null;
    let sql = null;
    let value = null;

    for (let i = 0; i < wth.length; i += 1) {
      if (query.sql[i]) {
        continue;
      }

      clause = wth[i];
      list = [];

      columns = clause.columns || [];
      name = clause.name;
      value = clause.value;

      columns = Array.isArray(columns) ?
        columns : [columns];

      if (value instanceof Database) {
        if (typeof box === 'undefined') {
          return query;
        }

        value = value.format(box, data);
      }

      sql = '??';
      query.values[query.values.length] = name;

      for (let j = 0; j < columns.length; j += 1) {
        list[list.length] = '??';
        query.values[query.values.length] = columns[j];
      }

      sql += list.length > 0 ? ` (${list.join(',')})` : '';
      sql += ` AS (${value})`;

      query.sql[query.sql.length] = sql;
    }

    return query;
  }

  _prepareWhere(where, box, data, query = {}) {
    return this._prepareCompare(where, box, data, query, 'OR');
  }

  _handle(box, data, callback, query, error, result) {
    if (error) {
      this._handleError(box, data, callback, query, error);
      return;
    }

    this._handleTriggers('after', box, data, query, () => {
      data = this.merge(box, data, {
        key: this._key,
        query,
        result,
      });

      this.pass(box, data, callback);
    });
  }

  _handleError(box, data, callback, query, error) {
    if (typeof error.code !== 'undefined') {
      error = this._replaceError(error);
    }

    if (error.code === 'ER_DUP_ENTRY') {
      error = this._handleErrorDuplicate(error);
    }

    error.data = data;
    error.sql = query && query.sql;
    error.tag = 'mysql,database';

    this.fail(box, error, callback);
  }

  _handleErrorDuplicate(error) {
    const reason = 'duplicate_' +
      (error.message.match(/key '(.+)'/) || ['key']).pop();

    error = new Error('409 Object already exists');
    error.reason = reason.toLowerCase();

    return error;
  }

  _handleTriggers(time, box, data, query, callback) {
    data = this._trigger ? this._trigger(box, data) : null;
    query = this.formatQuery(query);

    if (data === null) {
      callback();
      return;
    }

    const items = [];

    let match = null;
    let trigger = null;

    for (let i = 0; i < triggers[time].length; i += 1) {
      trigger = triggers[time][i];
      match = query.match(trigger.event);

      if (match !== null) {
        items[items.length] = trigger.worker;
      }
    }

    if (items.length === 0) {
      callback();
      return;
    }

    each(items, (item, eachCallback) => {
      item.handle(box, data, eachCallback);
    }, callback);
  }

  _replaceError(error) {
    const newError = new Error(error.message);
    newError.code = error.code;

    return newError;
  }
}
