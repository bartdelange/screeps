import fs from "node:fs";
import path from "node:path";

export function createSyncChangedFilesPlugin(destinationDir) {
  return {
    name: "sync-changed-files",
    writeBundle(outputOptions, bundle) {
      const outputDir = outputOptions.dir;
      if (!outputDir) {
        throw new Error("Expected output.dir to be set for chunked builds.");
      }

      fs.mkdirSync(destinationDir, { recursive: true });

      for (const [fileName, output] of Object.entries(bundle)) {
        if (
          output.type !== "chunk" ||
          !fileName.endsWith(".js") ||
          fileName.includes("/")
        ) {
          continue;
        }

        const sourcePath = path.join(outputDir, fileName);
        const targetPath = path.join(destinationDir, fileName);
        const sourceContent = fs.readFileSync(sourcePath, "utf8");

        let targetContent = null;
        if (fs.existsSync(targetPath)) {
          targetContent = fs.readFileSync(targetPath, "utf8");
        }

        if (targetContent !== sourceContent) {
          fs.mkdirSync(path.dirname(targetPath), { recursive: true });
          fs.writeFileSync(targetPath, sourceContent, "utf8");
        }
      }
    },
  };
}
