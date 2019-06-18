import trim from 'lodash-es/trim';
import { Snippet } from '../snippet';

export class Search extends Snippet {
  resolveInner(box, data) {
    const [
      column,
      value,
      operator = 'OR',
      wildcard = /\*/g
    ] = this._list;

    const match = value.match(/[^"\s]+|"[^"]+"/g);
    let string = '';

    for (let i = 0; i < match.length; i += 1) {
      string += string.length ? ` ${operator} ` : '';
      string += this.resolveValue(box, data, column);
      string += ' LIKE ';
      string += this.resolveEscape(
        trim(match[i].replace(wildcard, '%')),
        Snippet.ESCAPE_VALUE
      );
    }

    return this.resolveParens(string, this._parens);
  }
}
