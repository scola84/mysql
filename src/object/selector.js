import DatabaseSelector from '../worker/selector';

export default class ObjectSelector extends DatabaseSelector {
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
          this.merge(box, data, result[0]);
          this.pass(box, data, callback);
        } catch (error) {
          this.fail(box, error, callback);
        }
      });
  }

  merge(box, data, object) {
    if (this._merge) {
      this._merge(box, data, object);
    } else {
      data.object = object;
    }
  }
}
