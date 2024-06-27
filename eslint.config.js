'use strict';

import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import pluginJs from '@eslint/js';
import sortDestructureKeys from 'eslint-plugin-sort-destructure-keys';
import sortImportsRequires from 'eslint-plugin-sort-imports-requires';
import sortKeysFix from 'eslint-plugin-sort-keys-fix';

export default [
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    plugins: {
      'sort-destructure-keys': sortDestructureKeys,
      'sort-imports-requires': sortImportsRequires,
      'sort-keys-fix': sortKeysFix
    },
    rules: {
      'prettier/prettier': [
        'error',
        {
          arrowParens: 'avoid',
          printWidth: 120,
          singleQuote: true,
          trailingComma: 'none'
        }
      ],
      'sort-destructure-keys/sort-destructure-keys': 'error',
      'sort-imports-requires/sort-imports': [
        'error',
        {
          unsafeAutofix: true,
          useOldSingleMemberSyntax: true
        }
      ],
      'sort-imports-requires/sort-requires': [
        'error',
        {
          unsafeAutofix: true,
          useAliases: false,
          useOldSingleMemberSyntax: true
        }
      ],
      'sort-keys-fix/sort-keys-fix': ['error', 'asc', { natural: true }]
    }
  }
];
