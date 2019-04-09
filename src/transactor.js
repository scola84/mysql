import Database from './database';

export default class Transactor extends Database {
  create(box, data) {
    if (this._query === null) {
      this._prepare();
    }

    let sql = '';

    sql += this._finishCommit(box, data);
    sql += this._finishRollback(box, data);
    sql += this._finishStart(box, data);

    return { sql };
  }

  _finishCommit(box, data) {
    const commit = this._prepareCommit(this._commit, box, data,
      this._query.commit);

    return commit.sql;
  }

  _finishRollback(box, data) {
    const rollback = this._prepareRollback(this._rollback, box, data,
      this._query.rollback);

    return rollback.sql;
  }

  _finishStart(box, data) {
    const start = this._prepareStart(this._start, box, data,
      this._query.start);

    return start.sql;
  }

  _prepare() {
    this._query = {
      commit: this._prepareCommit(this._commit),
      rollback: this._prepareRollback(this._rollback),
      start: this._prepareStart(this._start)
    };
  }

  _prepareCommit(commit, box, data, query = {}) {
    query = {
      sql: ''
    };

    if (commit === true) {
      query.sql = 'COMMIT';
    }

    return query;
  }

  _prepareRollback(rollback, box, data, query = {}) {
    query = {
      sql: ''
    };

    if (rollback === true) {
      query.sql = 'ROLLBACK';
    }

    return query;
  }

  _prepareStart(start, box, data, query = {}) {
    query = {
      sql: ''
    };

    if (start === true) {
      query.sql = 'START TRANSACTION';
    }

    return query;
  }
}
