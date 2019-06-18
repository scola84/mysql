import camel from 'lodash-es/camelCase';
import { QueryBuilder } from '../../worker';
import { Snippet, snippet } from '../../snippet';
import * as token from '../../token';

export function attach() {
  function normalize(item) {
    return typeof item === 'string' ? {
      name: camel(item),
      token: item
    } : item;
  }

  Snippet.ESCAPE_NONE = 0;
  Snippet.ESCAPE_VALUE = 1;
  Snippet.ESCAPE_ID = 2;

  QueryBuilder.prototype.ESCAPE_NONE = Snippet.ESCAPE_NONE;
  QueryBuilder.prototype.ESCAPE_VALUE = Snippet.ESCAPE_VALUE;
  QueryBuilder.prototype.ESCAPE_ID = Snippet.ESCAPE_ID;

  QueryBuilder.attachFactory('', 'query', Snippet, {
    infix: ' '
  });

  QueryBuilder.attachFactory('', 'string', Snippet, {
    escape: Snippet.ESCAPE_VALUE,
    infix: ' '
  });

  QueryBuilder.attachFactory('', 'from', Snippet, {
    infix: '',
    prefix: 'FROM '
  });

  Object.keys(snippet).forEach((name) => {
    QueryBuilder.attachFactory('', name, snippet[name]);
  });

  token.infix.forEach((item) => {
    item = normalize(item);

    QueryBuilder.attachFactory('op', item.name, Snippet, {
      infix: ` ${item.token} `
    });
  });

  token.prefix.forEach((item) => {
    item = normalize(item);

    QueryBuilder.attachFactory('pre', item.name, Snippet, {
      prefix: `${item.token} `
    });
  });

  token.postfix.forEach((item) => {
    item = normalize(item);

    QueryBuilder.attachFactory('post', item.name, Snippet, {
      postfix: ` ${item.token}`
    });
  });

  token.func.forEach((item) => {
    item = normalize(item);

    QueryBuilder.attachFactory('fn', item.name, Snippet, {
      parens: true,
      prefix: item.token
    });
  });

}
