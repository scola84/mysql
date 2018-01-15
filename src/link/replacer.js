import LinkInserter from './inserter';

const parts = {
  list: 'REPLACE INTO ?? VALUES ?',
  object: 'REPLACE INTO ?? SET ?'
};

export default class LinkReplacer extends LinkInserter {
  act(box, data, callback) {
    const values = [
      this._table,
      this.filter(box, this._createValue(data))
    ];

    const query = Array.isArray(values[0]) ?
      parts.list : parts.object;

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
