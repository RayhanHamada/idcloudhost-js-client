import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import vitest from "ultracite/oxlint/vitest";

export default defineConfig({
    extends: [core, vitest],
    ignorePatterns: core.ignorePatterns,
    rules: {
        "func-style": "off",
        "no-abusive-eslint-disable": "off",
        "no-barrel-file": "off",
        "no-empty-interface": "off",
        "no-use-before-define": "off",
        "require-await": "off",
        "sort-keys": "off",
    },
});
