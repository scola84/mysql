import LinkWorker from './worker';

const parts = {
  list: 'INSERT INTO ?? VALUES ?',
  object: 'INSERT INTO ?? SET ?'
};

export default class LinkInserter extends LinkWorker {
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
}
