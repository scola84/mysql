import DatabaseWorker from '../worker/database';

export default class LinkWorker extends DatabaseWorker {
  constructor(options = {}) {
    super(options);

    this._left = null;
    this._leftId = null;
    this._right = null;
    this._rightId = null;

    this.setTable(options.left, options.right,
      options.leftId, options.rightId);
  }

  setTable(left = '', right = '', leftId = null, rightId = null) {
    this._left = left;
    this._leftId = leftId || left + '_id';

    this._right = right;
    this._rightId = rightId || right + '_id';

    this._table = 'link_' + left + '_' + right;
    return this;
  }

  _createValue(data) {
    if (typeof data[this._left] === 'undefined') {
      return data;
    }

    if (typeof data[this._right] === 'undefined') {
      return data;
    }

    return {
      [this._leftId]: data[this._left][this._leftId],
      [this._rightId]: data[this._right][this._rightId]
    };
  }
}
