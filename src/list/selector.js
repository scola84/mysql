import DatabaseSelector from '../worker/selector';

export default class ListSelector extends DatabaseSelector {
  act(box, data, callback) {
    const [query, values] = this._buildQuery(box, data);

    this
      .getPool(this._table)
      .query(query, values, (error, result) => {
        if (error) {
          this.fail(box, error);
          return;
        }

        this.merge(box, data, result);
        this.pass(box, result, callback);
      });
  }

  merge(box, data, result) {
    if (this._merge) {
      this._merge(box, data, result);
    }
  }
}
