import DatabaseSelector from '../worker/selector';

export default class ListSelector extends DatabaseSelector {
  act(box, data, callback) {
    const [query, values] = this._buildQuery(box, data);

    this
      .getPool(this._table)
      .query(query, values, (queryError, result) => {
        if (queryError) {
          this.fail(box, queryError);
          return;
        }

        try {
          this.merge(box, data, result);
          this.pass(box, result, callback);
        } catch (error) {
          this.fail(box, error, callback);
        }
      });
  }
}
