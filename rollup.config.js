/**
 * 
 */

import filesize from 'rollup-plugin-filesize';
import resolve from '@rollup/plugin-node-resolve';
import {terser} from 'rollup-plugin-terser';
import visualizer from 'rollup-plugin-visualizer';

export default {
  input: './tokenizer.js',
  output: {
    file: 'tokenizer.bundled.js',
    format: 'esm',
  },
  onwarn: warn => {},
  plugins: [
    resolve(),
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
