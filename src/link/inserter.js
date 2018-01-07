import LinkWorker from './worker';
const query = 'INSERT INTO ?? VALUES ?';

export default class LinkInserter extends LinkWorker {
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
