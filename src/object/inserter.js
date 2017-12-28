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
      .query(query, values, (queryError, result) => {
        try {
          if (queryError) {
            throw queryError;
          }

          const merged = this.merge(box, data, Object.assign({
            [this._id]: result.insertId
          }, values[1]));

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
    return typeof object[this._id] === 'undefined';
  }

  merge(box, data, object) {
    if (this._merge) {
      return this._merge(box, data, object);
    }

    data.object = object;
    return data;
  }
}
