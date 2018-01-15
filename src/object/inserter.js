import DatabaseWorker from '../worker/database';
const query = 'INSERT INTO ?? (??) VALUES ?';

export default class ObjectInserter extends DatabaseWorker {
  act(box, data, callback) {
    const object = this.filter(box, data, 'act');
    const values = [
      this._table,
      this._columns,
      this._createInsert(object)
    ];

    this
      .getPool(this._table)
      .query(query, values, (queryError, result) => {
        try {
          if (queryError) {
            throw queryError;
          }

          if (Array.isArray(object) === false) {
            object[this._tableId] = result.insertId;
          }

          const merged = this.merge(box, data, object);

          if (typeof merged !== 'undefined') {
            data = merged;
          }

          this.pass(box, data, callback);
        } catch (error) {
          this.fail(box, error, callback);
        }
      });
  }

  decide(box, data) {
    const object = this.filter(box, data, 'decide');
    return typeof object[this._tableId] === 'undefined';
  }

  merge(box, data, object) {
    if (this._merge) {
      return this._merge(box, data, object);
    }

    data.object = object;
    return data;
  }
}
