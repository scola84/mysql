/*eslint no-useless-escape: 0 */

import { format } from 'util';
import DatabaseWorker from './database';

const parts = {
  wrap: {
    any: 'ANY_VALUE(%s)',
    avg: 'AVG(%s)',
    bit_and: 'BIT_AND(%s)',
    bit_or: 'BIT_OR(%s)',
    bit_xor: 'BIT_XOR(%s)',
    coalesce: 'COALESCE(%s)',
    concat: 'GROUP_CONCAT(%s)',
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
  is: /^is ((not )?null)$/,
  like: /\*/
};

export default class DatabaseSelector extends DatabaseWorker {
  constructor(options = {}) {
    super(options);

    this._coalesce = [];
    this._concat = [];
    this._flat = false;
    this._group = [];
    this._join = [];
    this._nest = null;
    this._query = null;
    this._select = [];
    this._where = [];

    this.setNest(options.nest);
  }

  setNest(value = false) {
    this._nest = value;
    return this;
  }

  select(select) {
    this._select.push(select);
    return this;
  }

  join(join) {
    this._join.push(join);
    return this;
  }

  from(from) {
    this._table = from.table;
    return this;
  }

  group(group) {
    this._group.push(group);
    return this;
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
      is[0]
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

  _buildQuery(box, data) {
    if (this._query === null) {
      this._prepareQuery();
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

    const options = {
      sql: query,
      nestTables: this._nest
    };

    return [options, values];
  }

  _buildWhere(params, values) {
    const where = Array.isArray(params.where) ?
      params.where : [params.where];
    const and = [];

    let field = null;
    let value = null;

    for (let i = 0; i < this._where.length; i += 1) {
      value = where[i];

      if (typeof value === 'string') {
        const or = [];
        const is = value.match(regexp.is);
        const like = value.match(regexp.like);
        const interval = value.match(regexp.interval);

        for (let j = 0; j < this._where[i].length; j += 1) {
          field = this._where[i][j];

          if (interval) {
            or[or.length] = this._buildInterval(field, interval, values);
          } else if (is) {
            or[or.length] = this._buildIs(field, is);
          } else if (like) {
            or[or.length] = this._buildLike(field, value, values);
          } else {
            or[or.length] = this._buildIn(field, value, values);
          }
        }

        and.push(or.join(' OR '));
      }
    }

    return and.length > 0 ? 'AND (' + and.join(') AND (') + ')' : '';
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
      entry.right ? 'link_' : '',
      entry.left,
      entry.right ? '_' + entry.right : '',
      name,
      left,
      id,
      name,
      id
    );
  }

  _prepareQuery() {
    const join = [];
    const select = [];

    this._select.forEach((entry) => {
      select.push(this._prepareSelect(entry));
    });

    this._join.forEach((entry, index) => {
      join.push(this._prepareJoin(entry, index));
    });

    const group = this._group.length > 0 ? format(
      parts.group,
      this._group.join(', ')
    ) : '';

    this._query = format(
      parts.query,
      select.length > 0 ? select.join(', ') : '*',
      this._table,
      join.length > 0 ? join.join(' ') : '',
      '%s',
      group,
      '%s',
      '%s'
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
