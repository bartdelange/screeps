import "dotenv/config";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import { createTopLevelCycleChunker } from "./build/chunkGrouping.mjs";
import { createSyncChangedFilesPlugin } from "./build/syncChangedFilesPlugin.mjs";

const SCREEPS_SERVER = process.env.SCREEPS_SERVER;
const SCREEPS_BRANCH = process.env.SCREEPS_BRANCH;
const SCREEPS_DIR =
  process.env.SCREEPS_DIR ??
  `${process.env.HOME}/Library/Application Support/Screeps/scripts/${SCREEPS_SERVER}/${SCREEPS_BRANCH}`;

if (!SCREEPS_SERVER && !SCREEPS_BRANCH && !process.env.SCREEPS_DIR) {
  console.error(
    "Error: SCREEPS_SERVER and SCREEPS_BRANCH environment variables must be set.",
  );
  process.exit(1);
}

const manualChunks = createTopLevelCycleChunker();

export default {
  input: "src/main.ts",
  output: {
    dir: "dist",
    format: "cjs",
    exports: "named",
    sourcemap: true,
    compact: true,
    entryFileNames: "[name].js",
    chunkFileNames: "[name].js",
    onlyExplicitManualChunks: true,
    manualChunks,
  },
  plugins: [
    typescript({
      tsconfig: "./tsconfig.json",
    }),
    terser({
      maxWorkers: 1,
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
    createSyncChangedFilesPlugin(SCREEPS_DIR),
  ],
};
