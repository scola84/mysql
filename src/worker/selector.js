/*eslint no-useless-escape: 0 */

import { format } from 'util';
import DatabaseWorker from './database';

const parts = {
  group: {
    by: 'GROUP BY %s.%s',
    concat: 'GROUP_CONCAT(DISTINCT %s.%s) AS %s'
  },
  join: 'LEFT JOIN %s%s%s %s ON %s.%s = %s.%s',
  limit: 'LIMIT ?, ?',
  order: {
    asc: '?? ASC',
    ascsig: 'CAST(?? AS SIGNED) ASC',
    desc: '?? DESC',
    descsig: 'CAST(?? AS SIGNED) DESC'
  },
  select: 'SELECT %s FROM %s %s WHERE 1 %s %s ORDER BY %s %s',
  where: '%s.%s %s'
};

const regexp = {
  interval: /([\[\(])([-+]?[0-9]*\.?[0-9]*);([-+]?[0-9]*\.?[0-9]*)([\)\]])/,
  like: /\*/
};

export default class DatabaseSelector extends DatabaseWorker {
  constructor(methods) {
    super(methods);

    this._flat = false;
    this._from = {};
    this._join = [];
    this._nest = false;
    this._query = '';
    this._where = [];
  }

  addJoin(link) {
    this._join.push(link);
    this._prepareQuery();

    return this;
  }

  addWhere(...where) {
    this._where.push(where);
    return this;
  }

  setFlat(value) {
    this._flat = value;
    return this;
  }

  setFrom(from) {
    this._from = from;
    this.setTable(from.table, from.id);

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

    if (params.where) {
      where = this._buildWhere(params, values);
    }

    if (params.order) {
      order = this._buildOrder(params, values);
    } else {
      order = '1';
    }

    if (params.count) {
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

  _prepareSelect(alias, columns = ['*']) {
    return columns.map((column) => {
      return alias + '.' + column;
    }).join(', ');
  }

  _prepareQuery() {
    const select = [];
    const join = [];
    let group = '';

    if (this._from.select !== false) {
      select.push(this._prepareSelect(this._table, this._from.columns));
    }

    this._join.forEach((link, index) => {
      const related = this._flat ?
        this._table :
        (this._join[index - 1] && this._join[index - 1].alias ?
          this._join[index - 1].alias :
          (index === 0 ?
            this._table :
            't' + (index - 1)));

      if (link.alias) {
        if (link.group) {
          select.push(format(
            parts.group.concat,
            link.alias,
            link.group,
            link.alias
          ));

          group = format(
            parts.group.by,
            this._table,
            this._id
          );
        } else {
          select.push(this._prepareSelect(link.alias, link.columns));
        }
      }

      join.push(format(
        parts.join,
        link.right ? 'link_' : '',
        link.left,
        link.right ? '_' + link.right : '',
        link.alias ? link.alias : 't' + index,
        related,
        link.id ? link.id : link.left + '_id',
        link.alias ? link.alias : 't' + index,
        link.id ? link.id : link.left + '_id'
      ));
    });

    this._query = format(
      parts.select,
      select.length > 0 ? select.join(', ') : '',
      this._table,
      join.length > 0 ? join.join(' ') : '',
      '%s',
      group ? group : '',
      '%s',
      '%s'
    );
  }
}
