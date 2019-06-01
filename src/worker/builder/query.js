import { Worker } from '@scola/worker';
import each from 'async/each';
import merge from 'lodash-es/merge';
import mysql from 'mysql';

import { attach } from '../../helper';
import { Snippet, Table } from '../../snippet';

const pools = {};
const woptions = {};

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

  static attach() {
    attach(Database, Snippet);
  }

  static createTrigger(time, event, worker) {
    triggers[time].push({
      event: new RegExp(event),
      worker
    });
  }

  constructor(options = {}) {
    super(options);

    this._connection = null;
    this._execute = null;
    this._host = null;
    this._key = null;
    this._nest = null;
    this._query = null;
    this._timeout = null;
    this._trigger = null;

    this.setConnection(options.connection);
    this.setExecute(options.execute);
    this.setHost(options.host);
    this.setKey(options.key);
    this.setNest(options.nest);
    this.setQuery(options.query);
    this.setTimeout(options.timeout);
    this.setTrigger(options.trigger);
  }

  getOptions() {
    return Object.assign(super.getOptions(), {
      connection: this._connection,
      execute: this._execute,
      host: this._host,
      key: this._key,
      nest: this._nest,
      query: this._query,
      timeout: this._timeout,
      trigger: this._trigger
    });
  }

  getConnection() {
    return this._connection;
  }

  setConnection(value = null) {
    this._connection = value;
    return this;
  }

  getExecute() {
    return this._execute;
  }

  setExecute(value = true) {
    this._execute = value;
    return this;
  }

  getHost() {
    return this._host;
  }

  setHost(value = null) {
    this._host = value;
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

  getQuery() {
    return this._query;
  }

  setQuery(query) {
    this._query = query;
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

  act(box, data, callback) {
    data = this.filter(box, data);

    const query = {
      nestTables: this._nest,
      sql: this._query.format(box, data),
      timeout: this._timeout
    };

    if (this._log === 'query') {
      console.log(query.sql);
    }

    if (this._execute === false) {
      this.pass(box, data, callback);
      return;
    }

    this.createConnection(box, data, (error, connection, release = true) => {
      if (error) {
        this._handleError(box, data, callback, error);
        return;
      }

      this._handleTriggers('before', box, data, query, () => {
        connection.query(query, (queryError, result) => {
          if (release) {
            connection.release();
          }

          try {
            this._handle(box, data, callback, query, queryError, result);
          } catch (tryError) {
            this._handleError(box, data, callback, tryError);
          }
        });
      });
    });
  }

  createConnection(box, data, callback) {
    const pool = this.createPool(box, data);

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

  createPool(box, data) {
    const hostname = this.resolve(
      this._host ? this._host.name : woptions.default,
      box,
      data
    );

    const shard = this._host && this._host.shard ?
      this._host.shard(box, data) : null;

    const index = shard === null ?
      0 :
      Math.floor(shard / woptions[hostname].shards);

    const pool = hostname + index;

    if (typeof pools[pool] === 'undefined') {
      const options = this.resolve(
        woptions[hostname].options,
        box,
        data,
        index
      );

      pools[pool] = mysql.createPool(options);
    }

    return pools[pool];
  }

  execute(query) {
    return this.setQuery(query);
  }

  formatDatabase(box, data, hostname) {
    return woptions[hostname].database;
  }

  formatHostname(box, data) {
    return this.resolve(
      this._host ? this._host.name : woptions.default,
      box,
      data
    );
  }

  formatShard(box, data) {
    return this._host && this._host.shard ?
      this._host.shard(box, data) : null;
  }

  table(...list) {
    return new Table({
      database: this,
      list
    });
  }

  _handle(box, data, callback, query, error, result) {
    if (error) {
      this._handleError(box, data, callback, error);
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

  _handleError(box, data, callback, error) {
    if (typeof error.code !== 'undefined') {
      error = this._replaceError(error);
    }

    if (error.code === 'ER_DUP_ENTRY') {
      error = this._handleErrorDuplicate(error);
    }

    error.data = data;
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

    if (data === null) {
      callback();
      return;
    }

    const items = [];

    let match = null;
    let trigger = null;

    for (let i = 0; i < triggers[time].length; i += 1) {
      trigger = triggers[time][i];
      match = query.sql.match(trigger.event);

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

attach(Database, Snippet);
