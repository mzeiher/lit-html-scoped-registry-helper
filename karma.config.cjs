/* eslint-disable */

const resolve = require('@rollup/plugin-node-resolve');
const babel = require('rollup-plugin-babel');
const sourcemaps = require('rollup-plugin-sourcemaps');
const path = require('path');
const fs = require('fs');

const extensions = [
  '.js', '.jsx', '.ts', '.tsx',
];

const isDebug = process.argv.some((value) => value === '--debug');
const isBenchmark = process.argv.some((value) => value === '--benchmark');
const forceInstrument = process.argv.some((value) => value === '--instrument');


module.exports = config => {
  config.set({
    autoWatch: false,
    browsers: isDebug ? ['Chrome'] : ['ChromeHeadless', 'FirefoxHeadless'],
    concurrency: 1,
    files: [{
      pattern: isBenchmark ? 'test/bench.ts' : 'test/spec.ts',
      watched: false
    }
    ],
    preprocessors: {
      'test/bench.ts': ['rollup', 'sourcemap'],
      'test/spec.ts': ['rollup', 'sourcemap'],
    },
    frameworks: [(isBenchmark ? 'benchmark' :'jasmine'), 'source-map-support'],
    reporters: [ ...(isBenchmark ? ['benchmark'] : ['mocha', 'junit']), ...(((!isDebug && !isBenchmark) || forceInstrument) ? ['coverage-istanbul'] : [])],
    singleRun: true,
    rollupPreprocessor: {
      plugins: [
        { // this plugin is needed, because this project uses .js extensions in ts imports, so these must be rewritten to .ts
          resolveId: function (importee, importer) {
            if (importee.startsWith('.')) {
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
        resolve({
          extensions,
        }),
        babel({
          extensions,
          babelrc: false,
          exclude: 'node_modules/**',
          presets: ['@babel/preset-typescript'],
          plugins: [
            '@babel/plugin-proposal-class-properties',
            ...(((!isDebug && !isBenchmark) || forceInstrument) ? [['babel-plugin-istanbul', {
              exclude: 'test/**'
            }]] : [])
          ]
        }),
        sourcemaps(),
      ],
      output: {
        format: 'esm',
        sourcemap: 'inline',
      },
    },
    junitReporter: {
      outputDir: path.join(__dirname, 'reports', 'junit')
    },
    coverageIstanbulReporter: {
      reports: ['html', 'lcovonly', 'text-summary', 'cobertura'],
      dir: path.join(__dirname, 'reports', 'coverage'),
      combineBrowserReports: true,
      fixWebpackSourcePaths: true,
      skipFilesWithNoCoverage: true,
      'report-config': {
        html: {
          subdir: 'html'
        }
      },
      thresholds: {
        emitWarning: false,
        global: {
          statements: 0,
          lines: 0,
          branches: 0,
          functions: 0
        },
        each: {
          statements: 0,
          lines: 0,
          branches: 0,
          functions: 0,
          overrides: {
          }
        }
      },

      verbose: false
    }
  });
};
