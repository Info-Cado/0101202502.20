import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

// ESLint configuration
export default tseslint.config(
  // Ignore build output
  { ignores: ['dist'] },
  
  {
    // Extend recommended configs
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    
    // Apply to TypeScript files
    files: ['**/*.{ts,tsx}'],
    
    // Language options
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser, // Browser globals
    },
    
    // Configure plugins
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    
    // Rules configuration
    rules: {
      // Use recommended React Hooks rules
      ...reactHooks.configs.recommended.rules,
      
      // Configure React Refresh
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  }
);
