import buble from 'rollup-plugin-buble';
import builtins from 'rollup-plugin-node-builtins';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import resolve from 'rollup-plugin-node-resolve';

export default {
  input: './index.js',
  external: [
    'mysql'
  ],
  output: [{
    file: 'dist/mysql.cjs.js',
    format: 'cjs'
  }, {
    extend: true,
    file: 'dist/mysql.umd.js',
    format: 'umd',
    name: 'scola.mysql'
  }],
  plugins: [
    resolve(),
    commonjs(),
    builtins(),
    json(),
    buble()
  ]
};
