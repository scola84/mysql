import DatabaseWorker from '../worker/database';
const query = 'UPDATE ?? SET ? WHERE ?? = ?';

export default class ObjectUpdater extends DatabaseWorker {
  act(box, data, callback) {
    const object = this.filter(box, data, 'act');

    const values = [
      this._table,
      object,
      this._id,
      object[this._id]
    ];

    this
      .getPool(this._table)
      .query(query, values, (queryError) => {
        if (queryError) {
          this.fail(box, queryError);
          return;
        }

        try {
          this.merge(box, data, Object.assign({}, values[1]));
          this.pass(box, data, callback);
        } catch (error) {
          this.fail(box, error, callback);
        }
      });
  }

  decide(box, data) {
    const object = this.filter(box, data, 'decide');
    return typeof object[this._id] !== 'undefined';
  }
}
