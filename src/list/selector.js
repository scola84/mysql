import DatabaseSelector from '../worker/selector';

export default class ListSelector extends DatabaseSelector {
  act(box, data, callback) {
    const [query, values] = this._buildQuery(box, data);

    this
      .getPool(this._table)
      .query(query, values, (queryError, result) => {
        try {
          if (queryError) {
            throw queryError;
          }

          const merged = this.merge(box, data, result);

          if (typeof merged !== 'undefined') {
            data = merged;
          }

          this.pass(box, data, callback);
        } catch (error) {
          this.fail(box, error, callback);
        }
      });
  }

  merge(box, data, list) {
    if (this._merge) {
      return this._merge(box, data, list);
    }

    return list;
  }
}
