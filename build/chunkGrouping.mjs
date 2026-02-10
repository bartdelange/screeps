import fs from "node:fs";
import path from "node:path";

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function sanitizeChunkName(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function listSourceFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }

    if (entry.isFile() && /\.(ts|mts|cts|js|mjs|cjs)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function getTopLevelFromSourcePath(filePath, srcRoot) {
  const relativePath = toPosixPath(path.relative(srcRoot, filePath));
  const topLevel = relativePath.split("/")[0];
  if (!topLevel || topLevel.includes(".")) {
    return "core";
  }
  return sanitizeChunkName(topLevel);
}

function resolveLocalImport(importerPath, specifier) {
  const basePath = path.resolve(path.dirname(importerPath), specifier);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.mts`,
    `${basePath}.cts`,
    `${basePath}.js`,
    `${basePath}.mjs`,
    `${basePath}.cjs`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.mts"),
    path.join(basePath, "index.cts"),
    path.join(basePath, "index.js"),
    path.join(basePath, "index.mjs"),
    path.join(basePath, "index.cjs"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function extractImportSpecifiers(sourceCode) {
  const patterns = [
    /import\s+(?:[^"'()]+?\s+from\s+)?["']([^"']+)["']/g,
    /export\s+(?:[^"'()]+?\s+from\s+)?["']([^"']+)["']/g,
    /import\(\s*["']([^"']+)["']\s*\)/g,
  ];

  const specifiers = [];
  for (const pattern of patterns) {
    let match = pattern.exec(sourceCode);
    while (match) {
      specifiers.push(match[1]);
      match = pattern.exec(sourceCode);
    }
  }

  return specifiers;
}

function buildTopLevelChunkMap(srcRoot) {
  const sourceFiles = listSourceFiles(srcRoot);
  const edges = new Map();
  const nodes = new Set();
  const srcRootPrefix = `${toPosixPath(srcRoot)}/`;

  for (const sourceFile of sourceFiles) {
    const fromGroup = getTopLevelFromSourcePath(sourceFile, srcRoot);
    nodes.add(fromGroup);
    if (!edges.has(fromGroup)) {
      edges.set(fromGroup, new Set());
    }

    const sourceCode = fs.readFileSync(sourceFile, "utf8");
    const imports = extractImportSpecifiers(sourceCode);

    for (const specifier of imports) {
      if (!specifier.startsWith(".")) {
        continue;
      }

      const resolved = resolveLocalImport(sourceFile, specifier);
      if (!resolved) {
        continue;
      }

      if (!toPosixPath(resolved).startsWith(srcRootPrefix)) {
        continue;
      }

      const toGroup = getTopLevelFromSourcePath(resolved, srcRoot);
      nodes.add(toGroup);
      edges.get(fromGroup).add(toGroup);
    }
  }

  let index = 0;
  const indexByNode = new Map();
  const lowlinkByNode = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];

  function strongConnect(node) {
    indexByNode.set(node, index);
    lowlinkByNode.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);

    for (const neighbor of edges.get(node) ?? []) {
      if (!indexByNode.has(neighbor)) {
        strongConnect(neighbor);
        lowlinkByNode.set(
          node,
          Math.min(lowlinkByNode.get(node), lowlinkByNode.get(neighbor)),
        );
      } else if (onStack.has(neighbor)) {
        lowlinkByNode.set(
          node,
          Math.min(lowlinkByNode.get(node), indexByNode.get(neighbor)),
        );
      }
    }

    if (lowlinkByNode.get(node) === indexByNode.get(node)) {
      const component = [];
      let member = stack.pop();
      while (member !== undefined) {
        onStack.delete(member);
        component.push(member);
        if (member === node) {
          break;
        }
        member = stack.pop();
      }
      components.push(component);
    }
  }

  for (const node of nodes) {
    if (!indexByNode.has(node)) {
      strongConnect(node);
    }
  }

  const chunkNameByGroup = new Map();
  for (const component of components) {
    const hasCycle =
      component.length > 1 ||
      (component.length === 1 &&
        (edges.get(component[0]) ?? new Set()).has(component[0]));

    if (!hasCycle) {
      chunkNameByGroup.set(component[0], component[0]);
      continue;
    }

    // Keep cycle names traceable, e.g. creeps_links_scouting.js
    const mergedName = sanitizeChunkName([...component].sort().join("_"));
    for (const group of component) {
      chunkNameByGroup.set(group, mergedName);
    }
  }

  return chunkNameByGroup;
}

export function createTopLevelCycleChunker({
  projectRoot = process.cwd(),
  srcDir = "src",
} = {}) {
  const srcRoot = path.join(projectRoot, srcDir);
  const chunkNameByGroup = buildTopLevelChunkMap(srcRoot);

  return function manualChunks(id) {
    const normalizedId = toPosixPath(id);
    const srcMarker = `/${toPosixPath(srcDir)}/`;
    const srcIndex = normalizedId.lastIndexOf(srcMarker);
    if (srcIndex === -1) {
      return undefined;
    }

    const relativePath = normalizedId.slice(srcIndex + srcMarker.length);
    const topLevel = relativePath.split("/")[0];
    if (!topLevel) {
      return undefined;
    }

    const group = topLevel.includes(".") ? "core" : sanitizeChunkName(topLevel);
    return chunkNameByGroup.get(group) ?? group;
  };
}
