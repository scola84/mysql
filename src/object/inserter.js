import DatabaseWorker from '../worker/database';
const query = 'INSERT INTO ?? SET ?';

export default class ObjectInserter extends DatabaseWorker {
  act(box, data, callback) {
    const values = [
      this._table,
      this.filter(box, data, 'act')
    ];

    this
      .getPool(this._table)
      .query(query, values, (error, result) => {
        if (error) {
          this.fail(box, error);
          return;
        }

        this.merge(box, data, Object.assign({
          [this._id]: result.insertId
        }, values[1]));

        this.pass(box, data, callback);
      });
  }

  decide(box, data) {
    const object = this.filter(box, data, 'decide');
    return typeof object[this._id] === 'undefined';
  }
}
