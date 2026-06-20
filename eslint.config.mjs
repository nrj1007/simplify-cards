import next from "eslint-config-next";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      ".tmp/**",
      ".tmp-debug/**",
      ".tmp-recommend/**",
      ".tmp-score/**",
      ".codex/**",
      "scratch/**"
    ]
  },
  ...next
];
