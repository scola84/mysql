import { Worker } from '@scola/worker';
import camel from 'lodash-es/camelCase';
import { Snippet, attach } from '../helper';

export default class Database extends Worker {
  static attach(name, prefix, options = {}) {
    Database.prototype[
      camel(Database.prototype[name] ?
        `${prefix}-${name}` : name)
    ] = (...list) => {
      return new Snippet(
        Object.assign(options, { list, name })
      );
    };
  }

  constructor(options = {}) {
    super(options);
    this._query = null;
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
