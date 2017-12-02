import LinkInserter from './inserter';
const query = 'REPLACE INTO ?? SET ?';

export default class LinkReplacer extends LinkInserter {
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
}
