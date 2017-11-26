import DatabaseWorker from '../worker/database';
const query = 'INSERT INTO ?? SET ?';

export default class LinkInserter extends DatabaseWorker {
  constructor(methods) {
    super(methods);

    this._left = '';
    this._leftId = '';
    this._right = '';
    this._rightId = '';
  }

  setId(left, right) {
    this._leftId = left;
    this._rightId = right;

    return this;
  }

  setTable(left, right) {
    this._left = left;
    this._leftId = left + '_id';
    this._right = right;
    this._rightId = right + '_id';
    this._table = 'link_' + left + '_' + right;

    return this;
  }

  act(request, data, callback) {
    const value = {
      [this._leftId]: data[this._left][this._leftId],
      [this._rightId]: data[this._right][this._rightId]
    };

    const values = [
      this._table,
      value
    ];

    this.getPool(this._table).query(query, values, (error) => {
      if (error) {
        this.fail(request, error);
        return;
      }

      this.pass(request, data, callback);
    });
  }

  decide(request, data) {
    if (typeof data[this._left] === 'undefined') {
      throw new Error('404 Left part of link not found');
    }

    if (typeof data[this._right] === 'undefined') {
      throw new Error('404 Right part of link not found');
    }

    return true;
  }
}
