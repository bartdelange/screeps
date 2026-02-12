const typescript = require("@rollup/plugin-typescript");
const terser = require("@rollup/plugin-terser");
const screeps = require("rollup-plugin-screeps");

const nxConfiguration = process.env.NX_TASK_TARGET_CONFIGURATION;
const destination = process.env.DEST || nxConfiguration || "local";
const isLocal = !destination || destination === "local";
const screepsProfiles = require("./screeps.json");

function getScreepsConfig() {
  if (isLocal) {
    return undefined;
  }

  const profile = screepsProfiles[destination];
  if (!profile) {
    throw new Error(
      `Unknown DEST target "${destination}". Expected one of: ${Object.keys(
        screepsProfiles,
      ).join(", ")}, local`,
    );
  }

  // Normalize profile fields for screeps-api constructor.
  return {
    token: profile.token,
    email: profile.email ?? profile.username,
    password: profile.password,
    protocol:
      profile.protocol ??
      (typeof profile.secure === "boolean"
        ? profile.secure
          ? "https"
          : "http"
        : undefined),
    hostname: profile.hostname ?? profile.host,
    port: profile.port,
    path: profile.path ?? "/",
    branch: profile.branch,
  };
}

module.exports = {
  input: "src/main.ts",
  output: {
    file: "dist/main.js",
    format: "cjs",
    exports: "named",
    sourcemap: false,
    compact: true,
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
    screeps({
      config: getScreepsConfig(),
      dryRun: isLocal,
    }),
  ],
};
