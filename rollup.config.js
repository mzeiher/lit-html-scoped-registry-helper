/* eslint-disable */

import filesize from 'rollup-plugin-filesize';
import babel from 'rollup-plugin-babel';
import { terser } from 'rollup-plugin-terser';
import visualizer from 'rollup-plugin-visualizer';
import * as path from 'path';
import * as fs from 'fs';

const extensions = [
  '.js', '.jsx', '.ts', '.tsx',
];


export default {
  input: './src/index.ts',
  output: {
    file: 'tokenizer.bundled.js',
    format: 'esm',
  },
  external: ['lit-html'],
  plugins: [
    { // this plugin is needed, because this project uses .js extensions in ts imports, so these must be rewritten to .ts
      resolveId: function (importee, importer) {
        if (importee.startsWith('.') && importer) {
          const pathInfo = path.parse(importer);
          const fullpath = path.resolve(pathInfo.dir, importee);
          if (!fs.existsSync(fullpath)) {
            const pathInfo = path.parse(fullpath);
            const newxt = path.resolve(pathInfo.dir, pathInfo.name + '.ts');
            return newxt;
          }
        }
        return null;
      }
    },
    babel({
      extensions,
      babelrc: false,
      exclude: 'node_modules/**',
      presets: ['@babel/preset-typescript'],
      plugins: [
        '@babel/plugin-proposal-class-properties',
      ]
    }),
    terser({
      warnings: true,
      mangle: {
        properties: {
          regex: /^_/,
        },
      },
    }),
    filesize({
      showBrotliSize: true,
    }),
    visualizer({filename: './reports/stats.html', template: 'treemap'})
  ]
}
