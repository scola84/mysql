/*
SELECT
    CONCAT(help_topic.name, ',')
FROM
    help_topic
WHERE
    help_category_id IN (3, 15 , 19, 20, 38)
        AND NOT ((REGEXP_LIKE(description, '^Syntax:\n+[a-z0-9_]+\\(')
        OR REGEXP_LIKE(description, '^[a-z0-9_]+\\(')))
ORDER BY name;
*/

const alias = {
  '!=': 'notEq',
  '&': 'bitAnd',
  '*': 'multiply',
  '+': 'plus',
  '-': 'minus',
  '/': 'divide',
  '<': 'lt',
  '<<': 'bitLeft',
  '<=': 'ltEq',
  '<=>': 'safeEq',
  '=': 'eq',
  '>': 'gt',
  '>=': 'gtEq',
  '>>': 'bitRight',
  '^': 'bitXor',
  '|': 'bitOr',
  '~': 'bitInv',
};

const infix = [
  '!=',
  '&',
  '*',
  '+',
  '-',
  '/',
  '<',
  '<<',
  '<=',
  '<=>',
  '=',
  '>',
  '>=',
  '>>',
  '^',
  '|',
  '~',

  'AND',
  'BETWEEN',
  'DIV',
  'IN',
  'IS',
  'LIKE',
  'MATCH AGAINST',
  'NOT',
  'OR',
  'REGEXP',
  'RLIKE',
  'SOUNDS LIKE',
  'XOR',

  'AS',
  'UNION'
];

export default infix.map((item) => {
  const token = ` ${item} `;
  const name = alias[item];
  return name ? { name, token } : token;
});
