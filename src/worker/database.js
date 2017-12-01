import { Worker } from '@scola/worker';
import mysql from 'mysql';

const pools = {};
let options = {};

export default class DatabaseWorker extends Worker {
  constructor(methods = {}) {
    super(methods);

    this._merge = methods.merge;

    this._id = null;
    this._table = null;
  }

  static setOptions(value) {
    options = value;
  }

  getPool(name = 'default') {
    if (!pools[name]) {
      pools[name] = mysql.createPool(options[name] || options.default);
    }

    return {
      query(string, values, callback) {
        pools[name].query(string, values, callback);
      }
    };
  }

  merge(box, data, result) {
    if (this._merge) {
      this._merge(box, data, result);
    } else {
      data.object = result;
    }
  }

  setTable(value, id) {
    this._table = value;
    this._id = id || value + '_id';

    return this;
  }
}
