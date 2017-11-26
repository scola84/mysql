import { Worker } from '@scola/worker';
import mysql from 'mysql';

const pools = {};
let options = {};

export default class DatabaseWorker extends Worker {
  constructor(methods) {
    super(methods);

    this._filter = null;
    this._id = '';
    this._table = '';
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

  setFilter(value) {
    this._filter = value;
    return this;
  }

  setId(value) {
    this._id = value;
    return this;
  }

  setTable(value) {
    this._id = value + '_id';
    this._table = value;
    return this;
  }
}
