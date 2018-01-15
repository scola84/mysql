import DatabaseWorker from '../worker/database';
const query = 'DELETE FROM ?? WHERE ?? = ?';

export default class ObjectDeleter extends DatabaseWorker {
  act(box, data, callback) {
    const object = this.filter(box, data, 'act');
    const values = [
      this._table,
      this._tableId,
      object[this._tableId]
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

  decide(box, data) {
    const object = this.filter(box, data, 'decide');
    return typeof object[this._tableId] !== 'undefined';
  }
}
