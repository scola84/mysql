/*eslint no-useless-escape: 0 */

import mysql from 'mysql';
import { format } from 'util';
import DatabaseWorker from './database';

const parts = {
  wrap: {
    avg: 'AVG(%s)',
    bit_and: 'BIT_AND(%s)',
    bit_or: 'BIT_OR(%s)',
    bit_xor: 'BIT_XOR(%s)',
    coalesce: 'COALESCE(%s)',
    concat: 'GROUP_CONCAT(%s)',
    concat_ws: 'CONCAT_WS(" ",%s)',
    count: 'COUNT(%s)',
    max: 'MAX(%s)',
    min: 'MIN(%s)',
    std: 'STD(%s)',
    sum: 'SUM(%s)',
    var: 'VARIANCE(%s)'
  },
  alias: 'AS `%s`',
  group: 'GROUP BY %s',
  join: 'LEFT JOIN %s%s%s %s ON %s.%s = %s.%s',
  limit: 'LIMIT ?, ?',
  order: {
    asc: '?? ASC',
    ascsig: 'CAST(?? AS SIGNED) ASC',
    desc: '?? DESC',
    descsig: 'CAST(?? AS SIGNED) DESC'
  },
  query: 'SELECT %s FROM %s %s WHERE 1 %s %s ORDER BY %s %s',
  select: {
    all: '%s.*',
    distinct: 'DISTINCT %s.*'
  },
  where: '%s.%s %s'
};

const regexp = {
  interval: /([\[\(])([-+]?[0-9]*\.?[0-9]*);([-+]?[0-9]*\.?[0-9]*)([\)\]])/,
  is: /^is-((not-)?null)$/,
  like: /\*/
};

export default class DatabaseSelector extends DatabaseWorker {
  constructor(options = {}) {
    super(options);

    this._nest = null;
    this._where = [];

    this.setNest(options.nest);
  }

  setNest(value = false) {
    this._nest = value;
    return this;
  }

  build(box, data) {
    if (this._query === null) {
      this._query = this.prepare();
    }

    const params = this.filter(box, data) || {};
    const values = [];

    let where = '';
    let order = '';
    let limit = '';

    if (typeof params.where !== 'undefined') {
      where = this._buildWhere(params, values);
    }

    if (typeof params.order !== 'undefined') {
      order = this._buildOrder(params, values);
    } else {
      order = '1';
    }

    if (typeof params.count !== 'undefined') {
      limit = this._buildLimit(params, values);
    }

    const query = format(
      this._query,
      where,
      order,
      limit
    );

    return {
      sql: query,
      nestTables: this._nest,
      values
    };
  }

  format(box, data) {
    const query = this.build(box, data);
    return mysql.format(query.sql, query.values);
  }

  prepare() {
    const group = [];
    const join = [];
    const select = [];

    for (let i = 0; i < this._select.length; i += 1) {
      select.push(this._prepareSelect(this._select[i]));
    }

    for (let i = 0; i < this._join.length; i += 1) {
      join.push(this._prepareJoin(this._join[i], i));
    }

    for (let i = 0; i < this._group.length; i += 1) {
      group.push(this._prepareGroup(this._group[i]));
    }

    return format(
      parts.query,
      select.length > 0 ? select.join(', ') : '*',
      this._table,
      join.length > 0 ? join.join(' ') : '',
      '%s',
      group.length > 0 ? format(parts.group, group.join(', ')) : '',
      '%s',
      '%s'
    );
  }

  where(...where) {
    this._where.push(where);
    return this;
  }

  _buildIn(field, value, values) {
    values[values.length] = value;

    return format(
      parts.where,
      field.table || this._table,
      field.id,
      'IN (?)'
    );
  }

  _buildInterval(field, interval, values) {
    const intervals = [];

    if (interval[2]) {
      values[values.length] = interval[2];
      intervals[intervals.length] = format(
        parts.where,
        field.table || this._table,
        field.id,
        interval[1] === '[' ? '>= ?' : '> ?'
      );
    }

    if (interval[3]) {
      values[values.length] = interval[3];
      intervals[intervals.length] = format(
        parts.where,
        field.table || this._table,
        field.id,
        interval[4] === ']' ? '<= ?' : '< ?'
      );
    }

    return '(' + intervals.join(' AND ') + ')';
  }

  _buildIs(field, is) {
    return format(
      parts.where,
      field.table || this._table,
      field.id,
      is[0].replace('-', ' ')
    );
  }

  _buildLike(field, value, values) {
    values[values.length] = value.replace(regexp.like, '%');

    return format(
      parts.where,
      field.table || this._table,
      field.id,
      'LIKE ?'
    );
  }

  _buildLimit(params, values) {
    values[values.length] = params.offset || 0;
    values[values.length] = params.count || 10;

    return parts.limit;
  }

  _buildOrder(params, values) {
    const order = [];

    const ord = params.order;
    const dir = params.dir || [];

    for (let i = 0; i < ord.length; i += 1) {
      order[order.length] = parts.order[dir[i]] || parts.order.asc;
      values[values.length] = ord[i];
    }

    return order.join(', ');
  }

  _buildWhere(params, values) {
    const where = Array.isArray(params.where) ?
      params.where : [params.where];

    const and = [];
    let value = null;

    for (let i = 0; i < this._where.length; i += 1) {
      value = where[i];

      if (value === null || typeof value === 'undefined') {
        continue;
      }

      value = Array.isArray(value) ? value : String(value).split(' ');

      for (let j = 0; j < value.length; j += 1) {
        this._buildWhereAnd(i, and, value[j], values);
      }
    }

    return and.length > 0 ? 'AND (' + and.join(') AND (') + ')' : '';
  }

  _buildWhereAnd(i, and, value, values) {
    const or = [];
    let field = null;

    for (let j = 0; j < this._where[i].length; j += 1) {
      field = this._where[i][j];

      const interval = value.match(regexp.interval);

      if (interval) {
        or[or.length] = this._buildInterval(field, interval, values);
        break;
      }

      const is = value.match(regexp.is);

      if (is) {
        or[or.length] = this._buildIs(field, is);
        break;
      }

      const like = value.match(regexp.like);

      if (like) {
        or[or.length] = this._buildLike(field, value, values);
        break;
      }

      or[or.length] = this._buildIn(field, value, values);
    }

    and.push(or.join(' OR '));
  }

  _prepareGroup(entry) {
    return [
      entry.table || this._table,
      entry.id
    ].join('.');
  }

  _prepareJoin(entry, index) {
    const id = entry.id ? entry.id : entry.left + '_id';
    const name = 't' + index;

    const left = entry.left === this._table ?
      this._table :
      (index === 0 ?
        this._table :
        't' + (index - 1));

    return format(
      parts.join,
      entry.right ? 'link_' : entry.selector ? '(' : '',
      entry.selector ? entry.selector.format() : entry.left,
      entry.right ? '_' + entry.right : entry.selector ? ')' : '',
      name,
      left,
      id,
      name,
      id
    );
  }

  _prepareSelect(entry) {
    let select = entry.distinct ?
      parts.select.distinct : parts.select.all;

    select = entry.columns ? entry.columns.join(',') :
      format(select, entry.table);

    select = (entry.wrap || []).reduce((result, name) => {
      return format(parts.wrap[name], result);
    }, select);

    if (entry.alias) {
      select += ' ' + format(parts.alias, entry.alias);
    }

    return select;
  }
}
