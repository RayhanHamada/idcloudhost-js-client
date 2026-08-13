import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
    ...ultracite,
    tabWidth: 4,
    printWidth: 100,
});
