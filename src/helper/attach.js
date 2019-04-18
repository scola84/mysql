import camel from 'lodash-es/camelCase';

import {
  func,
  infix,
  postfix,
  prefix
} from '../token';

export default function attach(Database, Snippet) {
  attachConst(Database, Snippet);
  attachCustom(Database, Snippet);
  attachToken(Database);
}

function attachConst(Database, Snippet) {
  Snippet.ESCAPE_NONE = 0;
  Snippet.ESCAPE_VALUE = 1;
  Snippet.ESCAPE_ID = 2;

  Database.prototype.ESCAPE_NONE = Snippet.ESCAPE_NONE;
  Database.prototype.ESCAPE_VALUE = Snippet.ESCAPE_VALUE;
  Database.prototype.ESCAPE_ID = Snippet.ESCAPE_ID;
}

function attachCustom(Database, Snippet) {
  Database.attach('query', '', {
    infix: ' '
  });

  Database.attach('string', '', {
    escape: Snippet.ESCAPE_VALUE,
    infix: ' '
  });

  Database.attach('from', '', {
    infix: '',
    prefix: 'FROM '
  });
}

function attachToken(Database) {
  infix.forEach((item) => {
    item = normalize(item);

    Database.attach(item.name, 'op', {
      infix: ` ${item.token} `
    });
  });

  prefix.forEach((item) => {
    item = normalize(item);

    Database.attach(item.name, 'pre', {
      prefix: `${item.token} `
    });
  });

  postfix.forEach((item) => {
    item = normalize(item);

    Database.attach(item.name, 'post', {
      postfix: ` ${item.token}`
    });
  });

  func.forEach((item) => {
    item = normalize(item);

    Database.attach(item.name, 'fn', {
      parens: true,
      prefix: item.token
    });
  });
}

function normalize(item) {
  return typeof item === 'string' ?
    ({ name: camel(item), token: item }) :
    item;
}
