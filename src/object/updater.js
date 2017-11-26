import DatabaseWorker from '../worker/database';
const query = 'UPDATE ?? SET ? WHERE ?? = ?';

export default class ObjectUpdater extends DatabaseWorker {
  constructor(methods) {
    super(methods);
    this._filter = (request, data) => data;
  }

  act(request, data, callback) {
    const object = this._filter(request, data, 'act');

    const values = [
      this._table,
      object,
      this._id,
      object[this._id]
    ];

    this
      .getPool(this._table, values[3])
      .query(query, values, (error) => {
        if (error) {
          this.fail(request, error);
          return;
        }

        data[this._table] = Object.assign({}, values[1]);
        data.object = data[this._table];

        this.pass(request, data, callback);
      });
  }

  decide(request, data) {
    const object = this._filter(request, data, 'decide');
    return typeof object[this._id] !== 'undefined';
  }
}
