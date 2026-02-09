import "dotenv/config";
import typescript from "@rollup/plugin-typescript";
import copy from "rollup-plugin-copy";
import terser from "@rollup/plugin-terser";

const SCREEPS_SERVER = process.env.SCREEPS_SERVER;
const SCREEPS_BRANCH = process.env.SCREEPS_BRANCH;
const SCREEPS_DIR =
  process.env.SCREEPS_DIR ??
  `${process.env.HOME}/Library/Application Support/Screeps/scripts/${SCREEPS_SERVER}/${SCREEPS_BRANCH}`;

if ((!SCREEPS_SERVER && !SCREEPS_BRANCH) || !process.env.SCREEPS_DIR) {
  console.error(
    "Error: SCREEPS_SERVER and SCREEPS_BRANCH environment variables must be set.",
  );
  process.exit(1);
}

export default {
  input: "src/main.ts",
  output: {
    file: "dist/main.js",
    format: "cjs",
    exports: "named",
    sourcemap: true,
    compact: true,
  },
  plugins: [
    typescript({
      tsconfig: "./tsconfig.json",
    }),

    terser({
      compress: {
        passes: 2,
        pure_getters: true,
        unsafe: true,
        unsafe_arrows: true,
        unsafe_methods: true,
      },
      mangle: {
        properties: {
          regex: /^_/,
        },
      },
      format: {
        comments: false,
      },
    }),

    copy({
      targets: [{ src: "dist/main.js", dest: SCREEPS_DIR }],
      hook: "writeBundle",
      copyOnce: false,
    }),
  ],
};
