/*eslint no-useless-escape: 0 */

import { format } from 'util';
import DatabaseWorker from './database';

const parts = {
  wrap: {
    avg: 'AVG(%s)',
    bit_and: 'BIT_AND(%s)',
    bit_or: 'BIT_OR(%s)',
    bit_xor: 'BIT_XOR(%s)',
    coalesce: 'COALESCE(%s)',
    concat: 'GROUP_CONCAT(DISTINCT %s)',
    count: 'COUNT(DISTINCT %s)',
    max: 'MAX(%s)',
    min: 'MIN(%s)',
    std: 'STD(%s)',
    sum: 'SUM(%s)',
    var: 'VARIANCE(%s)'
  },
  alias: 'AS %s',
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
  select: '%s.*',
  where: '%s.%s %s'
};

const regexp = {
  interval: /([\[\(])([-+]?[0-9]*\.?[0-9]*);([-+]?[0-9]*\.?[0-9]*)([\)\]])/,
  like: /\*/
};

export default class DatabaseSelector extends DatabaseWorker {
  constructor(methods) {
    super(methods);

    this._coalesce = [];
    this._concat = [];
    this._flat = false;
    this._group = [];
    this._join = [];
    this._nest = false;
    this._query = '';
    this._select = [];
    this._where = [];
  }

  select(select) {
    this._select.push(select);
    this._prepareQuery();

    return this;
  }

  join(join) {
    this._join.push(join);
    this._prepareQuery();

    return this;
  }

  from(from) {
    this._table = from.table;
    this._prepareQuery();

    return this;
  }

  group(group) {
    this._group.push(group);
    this._prepareQuery();

    return this;
  }

  where(...where) {
    this._where.push(where);
    return this;
  }

  setNest(value) {
    this._nest = value;
    return this;
  }

  setTable(value, id) {
    super.setTable(value, id);
    this._prepareQuery();

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
        const like = value.match(regexp.like);
        const interval = value.match(regexp.interval);

        for (let j = 0; j < this._where[i].length; j += 1) {
          field = this._where[i][j];

          if (like) {
            or[or.length] = this._buildLike(field, value, values);
          } else if (interval) {
            or[or.length] = this._buildInterval(field, interval, values);
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
    let select = entry.columns ? entry.columns.join(',') :
      format(parts.select, entry.table);

    select = (entry.wrap || []).reduce((result, name) => {
      return format(parts.wrap[name], result);
    }, select);

    if (entry.alias) {
      select += ' ' + format(parts.alias, entry.alias);
    }

    return select;
  }
}
