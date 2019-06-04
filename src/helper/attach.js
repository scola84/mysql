import camel from 'lodash-es/camelCase';
import * as token from '../token';

export default function attach(QueryBuilder, Snippet) {
  function normalize(item) {
    return typeof item === 'string' ?
      ({ name: camel(item), token: item }) :
      item;
  }

  Snippet.ESCAPE_NONE = 0;
  Snippet.ESCAPE_VALUE = 1;
  Snippet.ESCAPE_ID = 2;

  QueryBuilder.prototype.ESCAPE_NONE = Snippet.ESCAPE_NONE;
  QueryBuilder.prototype.ESCAPE_VALUE = Snippet.ESCAPE_VALUE;
  QueryBuilder.prototype.ESCAPE_ID = Snippet.ESCAPE_ID;

  QueryBuilder.attachFactory('query', '', {
    infix: ' '
  });

  QueryBuilder.attachFactory('string', '', {
    escape: Snippet.ESCAPE_VALUE,
    infix: ' '
  });

  QueryBuilder.attachFactory('from', '', {
    infix: '',
    prefix: 'FROM '
  });

  token.infix.forEach((item) => {
    item = normalize(item);

    QueryBuilder.attachFactory(item.name, 'op', {
      infix: ` ${item.token} `
    });
  });

  token.prefix.forEach((item) => {
    item = normalize(item);

    QueryBuilder.attachFactory(item.name, 'pre', {
      prefix: `${item.token} `
    });
  });

  token.postfix.forEach((item) => {
    item = normalize(item);

    QueryBuilder.attachFactory(item.name, 'post', {
      postfix: ` ${item.token}`
    });
  });

  token.func.forEach((item) => {
    item = normalize(item);

    QueryBuilder.attachFactory(item.name, 'fn', {
      parens: true,
      prefix: item.token
    });
  });
}
