module.exports = () => {
  // Keep backward compatibility with direct Rollup CLI usage while
  // allowing Nx target configurations (local/main/pserver) to select DEST.
  if (!process.env.DEST && process.env.NX_TASK_TARGET_CONFIGURATION) {
    process.env.DEST = process.env.NX_TASK_TARGET_CONFIGURATION;
  }

  return require("./rollup.config.js");
};
