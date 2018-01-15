import LinkWorker from './worker';
const query = 'DELETE FROM ?? WHERE ?? IN (?) AND ?? IN (?)';

export default class LinkDeleter extends LinkWorker {
  act(box, data, callback) {
    const link = this.filter(box, data);
    const values = [
      this._table,
      this._leftId,
      link[this._leftId],
      this._rightId,
      link[this._rightId]
    ];

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
}
