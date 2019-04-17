import { Worker } from '@scola/worker';
import camel from 'lodash-es/camelCase';
import sqlstring from 'sqlstring';
import { Snippet, attach } from '../helper';

export default class Database extends Worker {
  static attach(name, prefix, options = {}) {
    Database.prototype[
      camel(Database.prototype[name] ? `${prefix}-${name}` : name)
    ] = (...list) => {
      Object.assign(options, { list, name });
      return new Snippet(options);
    };
  }

  constructor(options = {}) {
    super(options);
    this._query = null;
  }

  escape(...args) {
    return sqlstring.escape(...args);
  }

  format(box, data) {
    return this._query.format(box, data);
  }

  set(query) {
    this._query = query;
    return this;
  }
}

attach(Database, Snippet);
