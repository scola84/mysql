import LinkWorker from './worker';

const parts = {
  replace: 'REPLACE INTO ?? SET ?',
  update: 'UPDATE ?? SET ? WHERE ?? = ? AND ?? = ?'
};

export default class LinkUpdater extends LinkWorker {
  act(box, data, callback) {
    const link = this.filter(box, data, 'act');
    const values = [
      this._table,
      this._createUpdate(link),
      this._leftId,
      link[this._leftId],
      this._rightId,
      link[this._rightId]
    ];

    const query = this._replace ? parts.replace : parts.update;

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
