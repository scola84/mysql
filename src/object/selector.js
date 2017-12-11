import DatabaseSelector from '../worker/selector';

export default class ObjectSelector extends DatabaseSelector {
  setTable(table, id) {
    return super
      .setTable(table, id)
      .where({ id });
  }

  act(box, data, callback) {
    const [query, values] = this._buildQuery(box, data);

    this
      .getPool(this._table)
      .query(query, values, (error, result) => {
        if (error) {
          this.fail(box, error);
          return;
        }

        this.merge(box, data, result[0]);
        this.pass(box, data, callback);
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
