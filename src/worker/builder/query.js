import { Worker } from '@scola/worker';
import camel from 'lodash-es/camelCase';
import merge from 'lodash-es/merge';
import mysql from 'mysql';
import { Snippet, Table } from '../../snippet';

const pools = {};
const woptions = {};

export default class QueryBuilder extends Worker {
  static attachFactory(name, prefix, options = {}) {
    QueryBuilder.prototype[
      camel(QueryBuilder.prototype[name] ?
        `${prefix}-${name}` : name)
    ] = function create(...list) {
      return new Snippet(
        Object.assign(options, {
          builder: this,
          list,
          name
        })
      );
    };
  }

  static getOptions() {
    return woptions;
  }

  static setOptions(options) {
    merge(woptions, options);
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

    this.setConnection(options.connection);
    this.setExecute(options.execute);
    this.setHost(options.host);
    this.setKey(options.key);
    this.setNest(options.nest);
    this.setQuery(options.query);
    this.setTimeout(options.timeout);
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

  setQuery(query = null) {
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

  act(box, data, callback) {
    if (this._query === null) {
      this.pass(box, data, callback);
      return;
    }

    data = this.filter(box, data);

    const query = {
      nestTables: this._nest,
      sql: this._query.resolve(box, data),
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
        this.handleError(box, data, callback, error);
        return;
      }

      connection.query(query, (queryError, result) => {
        if (release) {
          connection.release();
        }

        try {
          this.handleQuery(box, data, callback, query, queryError, result);
        } catch (tryError) {
          this.handleError(box, data, callback, tryError);
        }
      });
    });
  }

  build(query) {
    return this.setQuery(query);
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
    const hostname = this.formatHostname(box, data);
    const shard = this.formatShard(box, data);

    const index = shard === null ?
      0 :
      Math.floor(shard / woptions[hostname].shards);

    const pool = hostname + index;

    if (typeof pools[pool] === 'undefined') {
      const options = this.resolve(
        box,
        data,
        woptions[hostname] && woptions[hostname].options || {},
        index
      );

      pools[pool] = mysql.createPool(options);
    }

    return pools[pool];
  }

  formatDatabase(box, data, hostname) {
    return this.resolve(
      box,
      data,
      woptions[hostname] && woptions[hostname].database || null
    );
  }

  formatHostname(box, data) {
    return this.resolve(
      box,
      data,
      this._host && this._host.name || woptions.default || null
    );
  }

  formatShard(box, data) {
    return this.resolve(
      box,
      data,
      this._host && this._host.shard || null
    );
  }

  handleError(box, data, callback, error) {
    if (error.code === 'ER_DUP_ENTRY') {
      error = this.handleErrorDuplicate(error);
    }

    error.data = data;

    this.fail(box, error, callback);
  }

  handleErrorDuplicate(error) {
    const reason = 'duplicate_' +
      (error.message.match(/key '(.+)'/) || ['key']).pop();

    error = new Error('409 Object already exists');
    error.reason = reason.toLowerCase();

    return error;
  }

  handleQuery(box, data, callback, query, error, result) {
    if (error) {
      this.handleError(box, data, callback, error);
      return;
    }

    data = this.merge(box, data, {
      key: this._key,
      query,
      result,
    });

    this.pass(box, data, callback);
  }

  merge(box, data, { key, query, result }) {
    if (this._merge) {
      return this._merge(box, data, { key, query, result });
    }

    return result;
  }

  table(...list) {
    return new Table({
      builder: this,
      list
    });
  }
}
