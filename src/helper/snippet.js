import sqlstring from 'sqlstring';
import toPath from 'lodash-es/toPath';

export default class Snippet {
  constructor(options = {}) {
    this._escape = null;
    this._infix = null;
    this._list = null;
    this._name = null;
    this._parens = null;
    this._postfix = null;
    this._prefix = null;

    this.setEscape(options.escape);
    this.setInfix(options.infix);
    this.setList(options.list);
    this.setName(options.name);
    this.setParens(options.parens);
    this.setPostfix(options.postfix);
    this.setPrefix(options.prefix);
  }

  getEscape() {
    return this._escape;
  }

  setEscape(value = Snippet.ESCAPE_NONE) {
    this._escape = value;
    return this;
  }

  getInfix() {
    return this._infix;
  }

  setInfix(value = ', ') {
    this._infix = value;
    return this;
  }

  getItem(index) {
    return this._list[index];
  }

  setItem(index, value) {
    this._list[index] = value;
    return this;
  }

  getList() {
    return this._list;
  }

  setList(value = []) {
    this._list = value;
    return this;
  }

  getName() {
    return this._name;
  }

  setName(value = null) {
    this._name = value;
    return this;
  }

  getParens() {
    return this._parens;
  }

  setParens(value = false) {
    this._parens = value;
    return this;
  }

  getPostfix() {
    return this._postfix;
  }

  setPostfix(value = '') {
    this._postfix = value;
    return this;
  }

  getPrefix() {
    return this._prefix;
  }

  setPrefix(value = '') {
    this._prefix = value;
    return this;
  }

  escape(value = Snippet.ESCAPE_VALUE) {
    this._escape = value;
    return this;
  }

  parens() {
    this._parens = true;
    return this;
  }

  set(path, index, value) {
    return this._set(path, index, value);
  }

  find(path, index) {
    return this._find(path, index);
  }

  format(box, data) {
    let string = '';

    string += this._prefix;
    string += this._format(box, data);
    string += this._postfix;

    return string;
  }

  _find(path, index) {
    path = toPath(path);

    let items = [];
    let item = null;

    if (
      path[0] === this._name ||
      path[0] === index ||
      path[0] === '*'
    ) {
      if (path.length === 1) {
        items[items.length] = this;
      } else {
        items = items.concat(this.find(path.slice(1)));
      }

      return items;
    }

    for (let i = 0; i < this._list.length; i += 1) {
      item = this._list[i];

      if (item instanceof Snippet) {
        items = items.concat(item.find(path, String(i)));
      }
    }

    return items;
  }

  _format(box, data) {
    let string = '';

    let count = 0;
    let value = null;

    for (let i = 0; i < this._list.length; i += 1) {
      value = this._resolve(this._list[i], box, data);

      if (value === null) {
        continue;
      }

      string += count === 0 ? '' : this._infix;
      string += value;

      count += 1;
    }

    return this._parenthise(string);
  }

  _parenthise(string) {
    return this._parens && string ?
      '(' + string + ')' :
      string;
  }

  _resolve(value, box, data) {
    if (value === null) {
      return null;
    }

    if (typeof value === 'function') {
      return this._resolve(value(box, data), box, data);
    }

    if (typeof value.format === 'function') {
      return value.format(box, data);
    }

    return this._resolveEscape(value);
  }

  _resolveEscape(value) {
    if (this._escape === Snippet.ESCAPE_VALUE) {
      return sqlstring.escape(value);
    }

    if (this._escape === Snippet.ESCAPE_ID) {
      return sqlstring.escapeId(value);
    }

    return value;
  }

  _set(path, index, value) {
    const items = this.find(path);

    for (let i = 0; i < items.length; i += 1) {
      items[i].setItem(index, value);
    }

    return items;
  }
}
