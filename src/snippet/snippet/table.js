import sprintf from 'sprintf-js';
import { Snippet } from '../snippet';

export class Table extends Snippet {
  constructor(options = {}) {
    super(options);
    this.setEscape(Snippet.ESCAPE_ID);
  }

  resolveInner(box, data) {
    const hostname = this._builder.formatHostname(box, data);

    if (hostname === null) {
      return this._list;
    }

    const database = this._builder.formatDatabase(box, data, hostname);

    if (database === null) {
      return this._list;
    }

    const shard = this._builder.formatShard(box, data);

    if (shard === null) {
      return database + '.' + this._list;
    }

    return sprintf.sprintf(database, shard) + '.' + this._list;
  }
}
