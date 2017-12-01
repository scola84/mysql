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

  setTable(left, right, leftId = null, rightId = null) {
    this._left = left;
    this._leftId = leftId || left + '_id';

    this._right = right;
    this._rightId = rightId || right + '_id';

    this._table = 'link_' + left + '_' + right;
    return this;
  }

  act(box, data, callback) {
    const value = {
      [this._leftId]: data[this._left][this._leftId],
      [this._rightId]: data[this._right][this._rightId]
    };

    const values = [
      this._table,
      value
    ];

    this
      .getPool(this._table)
      .query(query, values, (error) => {
        if (error) {
          this.fail(box, error);
          return;
        }

        this.pass(box, data, callback);
      });
  }

  decide(box, data) {
    if (typeof data[this._left] === 'undefined') {
      throw new Error('404 Left part of link not found');
    }

    if (typeof data[this._right] === 'undefined') {
      throw new Error('404 Right part of link not found');
    }

    return true;
  }
}
