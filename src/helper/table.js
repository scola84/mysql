import sprintf from 'sprintf-js';
import Snippet from './snippet';

export default class Table extends Snippet {
  constructor(options = {}) {
    super(options);

    this._database = null;

    this.setDatabase(options.database);
    this.setEscape(Snippet.ESCAPE_ID);
  }

  getDatabase() {
    return this._database;
  }

  setDatabase(value = null) {
    this._database = value;
    return this;
  }

  _format(box, data) {
    const hostname = this._database.formatHostname(box, data);
    const shard = this._database.formatShard(box, data);

    let database = this._database.formatDatabase(box, data, hostname);

    if (shard !== null) {
      database = sprintf.sprintf(database, shard);
    }

    return this._resolve(database + '.' + this._list, box, data);
  }
}
