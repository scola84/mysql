import { Worker } from '@scola/worker';
import mysql from 'mysql';

const pools = {};
let poolOptions = {};

export default class DatabaseWorker extends Worker {
  constructor(options = {}) {
    super(options);

    this._replace = false;
    this._table = null;
    this._tableId = null;

    this._setTable(options);
    this._setTableId(options);
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

  delete() {
    return this;
  }

  from(from) {
    return this._setTable(from);
  }

  group(group) {
    this._group.push(group);
    return this;
  }

  join(join) {
    this._join.push(join);
    return this;
  }

  insert(insert) {
    this._columns = insert.columns;
    return this;
  }

  into(into) {
    return this._setTable(into);
  }

  replace(replace) {
    this._replace = true;
    return this._setTable(replace);
  }

  select(select) {
    this._select.push(select);
    return this;
  }

  set(set) {
    this._columns = set.columns;
    return this;
  }

  update(update) {
    return this._setTable(update);
  }

  where(where) {
    this._setTableId(where);
    return this;
  }

  _createInsert(object) {
    const value = [];
    const isArray = Array.isArray(object);

    object = isArray ? object : [object];
    let name = '';

    for (let i = 0; i < object.length; i += 1) {
      value[i] = [];

      for (let j = 0; j < this._columns.length; j += 1) {
        name = this._columns[j];
        value[i][j] = object[i][name];
      }
    }

    return isArray ? value : value[0];
  }

  _createUpdate(object) {
    const value = {};
    let name = '';

    for (let i = 0; i < this._columns.length; i += 1) {
      name = this._columns[i];
      value[name] = object[name];
    }

    return value;
  }

  _setTable(value) {
    this._table = value.table;
    return this;
  }

  _setTableId(value) {
    this._tableId = value.id;
    return this;
  }
}
