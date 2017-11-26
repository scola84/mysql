import DatabaseWorker from '../worker/database';
const query = 'INSERT INTO ?? SET ?';

export default class ObjectInserter extends DatabaseWorker {
  constructor(methods) {
    super(methods);
    this._filter = (request, data) => data;
  }

  act(request, data, callback) {
    const values = [
      this._table,
      this._filter(request, data, 'act')
    ];

    this
      .getPool(this._table)
      .query(query, values, (error, result) => {
        if (error) {
          this.fail(request, error);
          return;
        }

        data[this._table] = values[1];
        data[this._table][this._id] = result.insertId;
        data.object = data[this._table];

        this.pass(request, data, callback);
      });
  }

  decide(request, data) {
    const object = this._filter(request, data, 'decide');
    return typeof object[this._id] === 'undefined';
  }
}
