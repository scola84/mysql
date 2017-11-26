import DatabaseWorker from '../worker/database';

const query = `
  SELECT *
  FROM ??
  LIMIT ?, ?`;

export default class ListSelector extends DatabaseWorker {
  constructor(methods) {
    super(methods);

    this._filter = (request) => {
      const url = request.parseUrl();

      return [
        Number(url.query.offset) || 0,
        Number(url.query.count) || 10
      ];
    };
  }

  act(request, data, callback) {
    const values = [
      this._table,
      ...this._filter(request, data)
    ];

    this
      .getPool(this._table, values[2])
      .query(query, values, (error, result) => {
        if (error) {
          this.fail(request, error);
          return;
        }

        this.pass(request, result, callback);
      });
  }
}
