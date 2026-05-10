export default {
  files: ['package.json', 'bin/**/*.mjs', 'src/**/*.mjs', 'test/**/*.mjs', 'test/fixtures/**/*.md'],
  mutate: ['src/**/*.mjs'],
  testRunner: 'command',
  commandRunner: {
    command: 'chmod +x bin/md-to-html.mjs && npm test',
  },
  coverageAnalysis: 'off',
  reporters: ['progress', 'clear-text'],
  thresholds: {
    high: 100,
    low: 100,
    break: 100,
  },
};