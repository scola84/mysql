import DatabaseWorker from '../worker/database';
const query = 'SELECT * FROM ?? WHERE ?? = ?';

export default class ObjectSelector extends DatabaseWorker {
  constructor(methods) {
    super(methods);
    this._filter = (request) => request.params[1];
  }

  act(request, data, callback) {
    const values = [
      this._table,
      this._id,
      this._filter(request, data)
    ];

    this
      .getPool(this._table, values[2])
      .query(query, values, (error, result) => {
        if (error) {
          this.fail(request, error);
          return;
        }

        data[this._table] = result[0];
        data.object = data[this._table];

        this.pass(request, data, callback);
      });
  }
}
