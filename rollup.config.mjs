import typescript from "@rollup/plugin-typescript";
import copy from "rollup-plugin-copy";
import terser from "@rollup/plugin-terser";

const SCREEPS_SERVER = process.env.SCREEPS_SERVER ?? "lanstede_nl___21025";
const SCREEPS_BRANCH = process.env.SCREEPS_BRANCH ?? "default";
const SCREEPS_DIR = `${process.env.HOME}/Library/Application Support/Screeps/scripts/${SCREEPS_SERVER}/${SCREEPS_BRANCH}`;

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
      targets: [
        { src: "dist/main.js", dest: SCREEPS_DIR },
        { src: "dist/main.js.map", dest: SCREEPS_DIR },
      ],
      hook: "writeBundle",
      copyOnce: false,
    }),
  ],
};
