export default [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        fetch: "readonly",
        URL: "readonly",
        Blob: "readonly",
        crypto: "readonly",
        Intl: "readonly",
        performance: "readonly",
        FileReader: "readonly",
        Image: "readonly",
        Uint8Array: "readonly",
        Uint32Array: "readonly",
        ArrayBuffer: "readonly",
        CustomEvent: "readonly",
        requestAnimationFrame: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        HTMLElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLTextAreaElement: "readonly",
        HTMLCanvasElement: "readonly",
        File: "readonly",
        Promise: "readonly",
        QRCode: "readonly",
        jspdf: "readonly",
        YMT: "writable"
      }
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { "args": "none", "caughtErrors": "none", "varsIgnorePattern": "^_" }],
      "no-redeclare": "error",
      "no-unreachable": "error",
      "no-constant-condition": "warn",
      "no-duplicate-case": "error"
    }
  },
  {
    ignores: [
      "assets/js/vendor/**",
      "tests/**",
      "eslint.config.js"
    ]
  }
];
