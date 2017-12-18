import DatabaseWorker from '../worker/database';

const parts = {
  delete: 'DELETE FROM ??',
  update: 'UPDATE ?? SET deleted = ?',
  where: 'WHERE ?? = ?'
};

export default class ObjectDeleter extends DatabaseWorker {
  act(box, data, callback) {
    const [query, values] = this._buildQuery(box, data);

    this
      .getPool(this._table)
      .query(query, values, (error) => {
        if (error) {
          this.fail(box, error);
          return;
        }

        this.pass(box, data, callback);
      });
  }

  decide(box, data) {
    const object = this.filter(box, data, 'decide');
    return typeof object[this._id] !== 'undefined';
  }

  _buildQuery(box, data) {
    const object = this.filter(box, data, 'act');

    let query = '';
    const values = [this._table];

    if (typeof object.undelete === 'undefined') {
      query += parts.delete;
    } else {
      query += parts.update;
      values.push(object.undelete === '1' ? null : Date.now());
    }

    query += ' ' + parts.where;

    values.push(this._id);
    values.push(object[this._id]);

    return [query, values];
  }
}
