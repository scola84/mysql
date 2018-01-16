import DatabaseSelector from '../worker/selector';

export default class ObjectSelector extends DatabaseSelector {
  act(box, data, callback) {
    const query = this.build(box, data);

    this
      .getPool(this._table)
      .query(query, (queryError, result) => {
        try {
          if (queryError) {
            throw queryError;
          }

          const merged = this.merge(box, data, result[0]);

          if (typeof merged !== 'undefined') {
            data = merged;
          }

          this.pass(box, data, callback);
        } catch (error) {
          this.fail(box, error, callback);
        }
      });
  }

  merge(box, data, object) {
    if (this._merge) {
      return this._merge(box, data, object);
    }

    data.object = object;
    return data;
  }
}
