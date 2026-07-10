/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'coinbase',
        'money',
        'ordering',
        'dashboard',
        'filter',
        'dnd',
        'refresh',
        'theme',
        'ui',
        'a11y',
        'lint',
        'test',
        'e2e',
        'ci',
        'deps',
        'security',
        'adr',
        'context',
        'scaffold',
        'cloudflare',
      ],
    ],
    'body-max-line-length': [0, 'always'],
  },
}
