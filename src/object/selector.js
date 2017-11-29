import DatabaseWorker from '../worker/database';
const query = 'SELECT * FROM ?? WHERE ?? = ?';

export default class ObjectSelector extends DatabaseWorker {
  act(box, data, callback) {
    const values = [
      this._table,
      this._id,
      this.filter(box, data)
    ];

    this
      .getPool(this._table, values[2])
      .query(query, values, (error, result) => {
        if (error) {
          this.fail(box, error);
          return;
        }

        this.merge(box, data, result[0]);
        this.pass(box, data, callback);
      });
  }
}
