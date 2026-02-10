import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

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

function syncChangedFilesPlugin() {
  return {
    name: "sync-changed-files",
    writeBundle(outputOptions, bundle) {
      const outputDir = outputOptions.dir;
      if (!outputDir) {
        throw new Error("Expected output.dir to be set for chunked builds.");
      }

      fs.mkdirSync(SCREEPS_DIR, { recursive: true });

      for (const [fileName, output] of Object.entries(bundle)) {
        if (output.type !== "chunk" || !fileName.endsWith(".js")) {
          continue;
        }

        const sourcePath = path.join(outputDir, fileName);
        const destinationPath = path.join(SCREEPS_DIR, fileName);
        const sourceContent = fs.readFileSync(sourcePath, "utf8");

        let destinationContent = null;
        if (fs.existsSync(destinationPath)) {
          destinationContent = fs.readFileSync(destinationPath, "utf8");
        }

        if (destinationContent !== sourceContent) {
          fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
          fs.writeFileSync(destinationPath, sourceContent, "utf8");
        }
      }
    },
  };
}

export default {
  input: "src/main.ts",
  output: {
    dir: "dist",
    format: "cjs",
    exports: "named",
    sourcemap: true,
    compact: true,
    entryFileNames: "[name].js",
    chunkFileNames: "chunks/[name]-[hash].js",
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

    syncChangedFilesPlugin(),
  ],
};
