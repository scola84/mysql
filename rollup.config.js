import buble from 'rollup-plugin-buble';
import builtins from 'rollup-plugin-node-builtins';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import resolve from 'rollup-plugin-node-resolve';

const input = './index.js';

const external = [
  'mysql'
];

const plugins = [
  resolve(),
  commonjs(),
  builtins(),
  json(),
  buble()
];

export default [{
  input,
  external,
  output: {
    extend: true,
    file: 'dist/mysql.umd.js',
    format: 'umd',
    name: 'scola.mysql'
  },
  plugins
}, {
  input,
  external,
  output: {
    file: 'dist/mysql.cjs.js',
    format: 'cjs'
  },
  plugins
}];
