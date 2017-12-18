import { Worker } from '@scola/worker';
import mysql from 'mysql';

const pools = {};
let poolOptions = {};

export default class DatabaseWorker extends Worker {
  constructor(options = {}) {
    super(options);

    this._id = null;
    this._table = null;

    this.setTable(options.table, options.id);
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

  setTable(value = '', id = null) {
    this._table = value;
    this._id = id || value + '_id';

    return this;
  }
}
