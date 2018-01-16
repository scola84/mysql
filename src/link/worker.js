import DatabaseWorker from '../worker/database';

export default class LinkWorker extends DatabaseWorker {
  constructor(options = {}) {
    super(options);

    this._left = null;
    this._leftId = null;
    this._right = null;
    this._rightId = null;

    this._setTable(options);
    this._setTableId(options);
  }

  _setTable(value) {
    this._left = value.left;
    this._right = value.right;
    this._table = 'link_' + this._left + '_' + this._right;
  }

  _setTableId(value) {
    this._leftId = value.leftId;
    this._rightId = value.rightId;
  }
}
