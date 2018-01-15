import LinkWorker from './worker';
const query = 'INSERT INTO ?? (??) VALUES ?';

export default class LinkInserter extends LinkWorker {
  act(box, data, callback) {
    const link = this.filter(box, data, 'act');
    const values = [
      this._table,
      this._columns,
      this._createInsert(link)
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
