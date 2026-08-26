#!/usr/bin/env node

import { access, copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultConfigPath = path.resolve(scriptDir, "../sync.config.json");
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".svg",
  ".txt",
]);

function parseArgs(argv) {
  const options = {
    clean: false,
    configPath: defaultConfigPath,
    targetNames: [],
    write: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--write") {
      options.write = true;
    } else if (argument === "--clean") {
      options.clean = true;
    } else if (argument === "--target") {
      const targetName = argv[index + 1];
      if (!targetName) throw new Error("--target requires a target name");
      options.targetNames.push(targetName);
      index += 1;
    } else if (argument === "--config") {
      const configPath = argv[index + 1];
      if (!configPath) throw new Error("--config requires a file path");
      options.configPath = path.resolve(process.cwd(), configPath);
      index += 1;
    } else if (argument === "--help" || argument === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (options.clean && !options.write) {
    throw new Error("--clean requires --write");
  }

  return options;
}

function printHelp() {
  console.log(`CAD-DELTAI selective sync

Usage:
  node api/scripts/sync-build.js [options]

Options:
  --target <name>  Run one configured target; repeat to run several
  --write          Apply the sync (dry-run is the default)
  --clean          Remove stale destination files; requires --write
  --config <path>  Use another configuration file
  --help           Show this help
`);
}

function normalizePath(value) {
  return value.split(path.sep).join("/").replace(/^\.\//, "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function globToRegExp(glob) {
  const normalized = normalizePath(glob);
  let expression = "^";

  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];

    if (character === "*") {
      const isDouble = normalized[index + 1] === "*";
      if (isDouble) {
        const followedBySlash = normalized[index + 2] === "/";
        expression += followedBySlash ? "(?:.*/)?" : ".*";
        index += followedBySlash ? 2 : 1;
      } else {
        expression += "[^/]*";
      }
    } else if (character === "?") {
      expression += "[^/]";
    } else {
      expression += escapeRegExp(character);
    }
  }

  return new RegExp(`${expression}$`);
}

function matchesAny(relativePath, patterns = []) {
  return patterns.some((pattern) => globToRegExp(pattern).test(relativePath));
}

function resolveInside(root, candidate, label) {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(root, candidate);
  const relative = path.relative(resolvedRoot, resolvedCandidate);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} escapes the configured repository root: ${candidate}`);
  }

  return resolvedCandidate;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(root) {
  if (!(await exists(root))) return [];

  const files = [];
  const entries = await readdir(root, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(entryPath)));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

function stripMarkedBlocks(content, blockNames, relativePath) {
  let output = content;
  let removedBlocks = 0;

  for (const blockName of blockNames) {
    const name = escapeRegExp(blockName);
    const patterns = [
      new RegExp(
        `<!--\\s*sync:begin\\s+${name}\\s*-->[\\s\\S]*?<!--\\s*sync:end\\s+${name}\\s*-->`,
        "g",
      ),
      new RegExp(
        `/\\*\\s*sync:begin\\s+${name}\\s*\\*/[\\s\\S]*?/\\*\\s*sync:end\\s+${name}\\s*\\*/`,
        "g",
      ),
    ];

    for (const pattern of patterns) {
      output = output.replace(pattern, () => {
        removedBlocks += 1;
        return "";
      });
    }
  }

  return { content: output, relativePath, removedBlocks };
}

function applyReplacements(content, replacements, relativePath) {
  let output = content;
  let replacementCount = 0;

  for (const replacement of replacements) {
    if (!matchesAny(relativePath, replacement.files || ["**/*"])) continue;

    const occurrences = output.split(replacement.from).length - 1;
    if (replacement.required && occurrences === 0) {
      throw new Error(
        `Required replacement was not found in ${relativePath}: ${replacement.from}`,
      );
    }

    if (occurrences > 0) {
      output = output.split(replacement.from).join(replacement.to);
      replacementCount += occurrences;
    }
  }

  return { content: output, replacementCount };
}

async function prepareFile(sourcePath, relativePath, target) {
  if (!textExtensions.has(path.extname(relativePath).toLowerCase())) {
    return { buffer: null, removedBlocks: 0, replacementCount: 0 };
  }

  const original = await readFile(sourcePath, "utf8");
  const stripped = stripMarkedBlocks(original, target.stripBlocks || [], relativePath);
  const replaced = applyReplacements(
    stripped.content,
    target.replacements || [],
    relativePath,
  );

  return {
    buffer: Buffer.from(replaced.content, "utf8"),
    removedBlocks: stripped.removedBlocks,
    replacementCount: replaced.replacementCount,
  };
}

async function syncTarget(repoRoot, target, options) {
  const sourceRoot = resolveInside(repoRoot, target.source, `${target.name} source`);
  const destinationRoot = resolveInside(
    repoRoot,
    target.destination,
    `${target.name} destination`,
  );

  if (destinationRoot === repoRoot || destinationRoot === sourceRoot) {
    throw new Error(`${target.name} destination must differ from its source and repository root`);
  }

  const sourceFiles = await listFiles(sourceRoot);
  const selectedFiles = sourceFiles
    .map((sourcePath) => ({
      sourcePath,
      relativePath: normalizePath(path.relative(sourceRoot, sourcePath)),
    }))
    .filter(({ relativePath }) => matchesAny(relativePath, target.include))
    .filter(({ relativePath }) => !matchesAny(relativePath, target.exclude));

  if (selectedFiles.length === 0) {
    throw new Error(`${target.name} selected no source files`);
  }

  const expectedDestinationFiles = new Set();
  let removedBlocks = 0;
  let replacementCount = 0;

  console.log(`\n[${target.name}] ${options.write ? "WRITE" : "DRY RUN"}`);
  console.log(`  ${target.source} -> ${target.destination}`);

  for (const selectedFile of selectedFiles) {
    const destinationPath = path.join(destinationRoot, selectedFile.relativePath);
    expectedDestinationFiles.add(normalizePath(path.resolve(destinationPath)));

    const prepared = await prepareFile(
      selectedFile.sourcePath,
      selectedFile.relativePath,
      target,
    );
    removedBlocks += prepared.removedBlocks;
    replacementCount += prepared.replacementCount;

    console.log(`  COPY ${selectedFile.relativePath}`);
    if (!options.write) continue;

    await mkdir(path.dirname(destinationPath), { recursive: true });
    if (prepared.buffer) {
      await writeFile(destinationPath, prepared.buffer);
    } else {
      await copyFile(selectedFile.sourcePath, destinationPath);
    }
  }

  let staleFiles = [];
  if (options.clean) {
    staleFiles = (await listFiles(destinationRoot)).filter(
      (filePath) => !expectedDestinationFiles.has(normalizePath(path.resolve(filePath))),
    );

    for (const staleFile of staleFiles) {
      console.log(`  DELETE ${normalizePath(path.relative(destinationRoot, staleFile))}`);
      await rm(staleFile);
    }
  }

  console.log(
    `  ${selectedFiles.length} file(s), ${removedBlocks} marked block(s) removed, ` +
      `${replacementCount} replacement(s), ${staleFiles.length} stale file(s) deleted`,
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const configText = await readFile(options.configPath, "utf8");
  const config = JSON.parse(configText);
  const configDir = path.dirname(options.configPath);
  const repoRoot = path.resolve(configDir, config.repoRoot || ".");
  const targetNames = new Set(options.targetNames);
  const targets = config.targets.filter(
    (target) => target.enabled !== false &&
      (targetNames.size === 0 || targetNames.has(target.name)),
  );

  if (targets.length === 0) {
    throw new Error("No enabled sync targets matched the request");
  }

  for (const target of targets) {
    await syncTarget(repoRoot, target, options);
  }

  if (!options.write) {
    console.log("\nDry run complete. Re-run with --write to apply these changes.");
  }
}

main().catch((error) => {
  console.error(`Sync failed: ${error.message}`);
  process.exitCode = 1;
});
