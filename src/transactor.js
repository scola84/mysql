import Database from './database';

export default class Transactor extends Database {
  constructor(options = {}) {
    super(options);

    this._begin = null;
    this._commit = null;
    this._rollback = null;

    this.setBegin(options.begin);
    this.setCommit(options.commit);
    this.setRollback(options.rollback);
  }

  setBegin(value = false) {
    this._begin = value;
    return this;
  }

  setCommit(value = false) {
    this._commit = value;
    return this;
  }

  setRollback(value = false) {
    this._rollback = value;
    return this;
  }

  act(box, data, callback) {
    if (this._begin) {
      this._beginTransaction(box, data, callback);
      return;
    }

    if (this._commit) {
      this._commitTransaction(box, data, callback);
      return;
    }

    if (this._rollback) {
      this._rollbackTransaction(box, data, callback);
      return;
    }

    this.pass(box, data, callback);
  }

  _beginTransaction(box, data, callback) {
    this.connection(box, data, (connectionError, connection) => {
      if (connectionError) {
        connectionError.data = data;
        this.fail(box, connectionError, callback);
        return;
      }

      connection.beginTransaction((error) => {
        if (error) {
          error.data = data;
          this.fail(box, error, callback);
        } else {
          this.pass(box, data, callback);
        }
      });
    });
  }

  _commitTransaction(box, data, callback) {
    this.connection(box, data, (connectionError, connection) => {
      if (connectionError) {
        connectionError.data = data;
        this.fail(box, connectionError, callback);
        return;
      }

      connection.commit((error) => {
        if (error) {
          connection.rollback(() => {
            connection.release();
            error.data = data;
            this.fail(box, error, callback);
          });
        } else {
          connection.release();
          this.pass(box, data, callback);
        }
      });
    });
  }

  _rollbackTransaction(box, data, callback) {
    this.connection(box, data, (connectionError, connection) => {
      if (connectionError) {
        connectionError.data = data;
        this.fail(box, connectionError, callback);
        return;
      }

      connection.rollback(() => {
        connection.release();
        this.pass(box, data, callback);
      });
    });
  }
}
