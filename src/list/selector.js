import DatabaseWorker from '../worker/database';

const query = `
  SELECT *
  FROM ??
  LIMIT ?, ?`;

export default class ListSelector extends DatabaseWorker {
  act(box, data, callback) {
    const limit = this.filter(box, data);

    const values = [
      this._table,
      Number(limit.offset || 0),
      Number(limit.count || 10)
    ];

    this
      .getPool(this._table, values[2])
      .query(query, values, (error, result) => {
        if (error) {
          this.fail(box, error);
          return;
        }

        this.pass(box, result, callback);
      });
  }
}
