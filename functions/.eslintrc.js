module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    "ecmaVersion": 2020,
  },
  extends: [
    "eslint:recommended",
  ],
  rules: {
    "no-unused-vars": "off", // Allow unused variables
    "no-restricted-globals": "off", // Remove restricted globals
    "prefer-arrow-callback": "off", // Remove arrow callback requirement
    "quotes": "off", // Remove quote style requirements
    "max-len": "off", // Remove line length limit
    "indent": "off", // Remove indentation rules
    "comma-dangle": "off", // Remove comma dangle rules
    "object-curly-spacing": "off", // Remove spacing rules
    "require-jsdoc": "off", // Remove JSDoc requirement
    "valid-jsdoc": "off", // Remove JSDoc validation
    "semi": "off", // Remove semicolon requirements
    "no-trailing-spaces": "off", // Remove trailing spaces requirement
    "eol-last": "off", // Remove end of line requirement
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
