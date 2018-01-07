import LinkInserter from './inserter';
const query = 'REPLACE INTO ?? VALUES ?';

export default class LinkReplacer extends LinkInserter {
  act(box, data, callback) {
    const values = [
      this._table,
      this.filter(box, this._createValue(data))
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
