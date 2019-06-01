import camel from 'lodash-es/camelCase';
import * as token from '../token';

export default function attach(Database, Snippet) {
  function attachFactory(name, prefix, options = {}) {
    Database.prototype[
      camel(Database.prototype[name] ?
        `${prefix}-${name}` : name)
    ] = (...list) => {
      return new Snippet(
        Object.assign(options, { list, name })
      );
    };
  }

  function normalize(item) {
    return typeof item === 'string' ?
      ({ name: camel(item), token: item }) :
      item;
  }

  Snippet.ESCAPE_NONE = 0;
  Snippet.ESCAPE_VALUE = 1;
  Snippet.ESCAPE_ID = 2;

  Database.prototype.ESCAPE_NONE = Snippet.ESCAPE_NONE;
  Database.prototype.ESCAPE_VALUE = Snippet.ESCAPE_VALUE;
  Database.prototype.ESCAPE_ID = Snippet.ESCAPE_ID;

  attachFactory('query', '', {
    infix: ' '
  });

  attachFactory('string', '', {
    escape: Snippet.ESCAPE_VALUE,
    infix: ' '
  });

  attachFactory('from', '', {
    infix: '',
    prefix: 'FROM '
  });

  token.infix.forEach((item) => {
    item = normalize(item);

    attachFactory(item.name, 'op', {
      infix: ` ${item.token} `
    });
  });

  token.prefix.forEach((item) => {
    item = normalize(item);

    attachFactory(item.name, 'pre', {
      prefix: `${item.token} `
    });
  });

  token.postfix.forEach((item) => {
    item = normalize(item);

    attachFactory(item.name, 'post', {
      postfix: ` ${item.token}`
    });
  });

  token.func.forEach((item) => {
    item = normalize(item);

    attachFactory(item.name, 'fn', {
      parens: true,
      prefix: item.token
    });
  });
}
