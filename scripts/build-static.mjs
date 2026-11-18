import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Qoder Sites 只接收已构建的静态目录；构建期间排除 Node Route Handler 与动态预览页。
const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const outDir = path.join(projectRoot, "out");
rmSync(outDir, { recursive: true, force: true });

const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const result = spawnSync(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  env: { ...process.env, NEXT_STATIC_EXPORT: "1", NEXT_PUBLIC_STATIC_EXPORT: "1" },
});

if (result.status !== 0) process.exit(result.status ?? 1);

// Next.js 16 在 Windows 上未规范化 path.relative() 的反斜杠，RSC 分段文件会写成
// out/diary/__next.diary/__PAGE__.txt；客户端实际请求 /diary/__next.diary.__PAGE__.txt。
const normalizedSegments = normalizeRscSegments(outDir);
console.log(`[build-static] normalized ${normalizedSegments} RSC segment file(s)`);

// /character-preview 仅用于开发预览，不属于正式产品导航。
for (const target of ["character-preview", "character-preview.html", "character-preview.txt"]) {
  rmSync(path.join(outDir, target), { recursive: true, force: true });
}

function normalizeRscSegments(rootDir) {
  let normalized = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.name.startsWith("__next.")) {
        normalized += flattenSegmentDir(fullPath);
      } else {
        walk(fullPath);
      }
    }
  };
  walk(rootDir);
  return normalized;
}

function flattenSegmentDir(segmentDir) {
  const parentDir = path.dirname(segmentDir);
  const prefix = path.basename(segmentDir);
  const files = [];

  const collect = (dir, parts) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collect(fullPath, [...parts, entry.name]);
      } else if (entry.name.endsWith(".txt")) {
        files.push({ source: fullPath, name: [prefix, ...parts, entry.name].join(".") });
      } else {
        throw new Error(`Unexpected file in RSC segment directory: ${fullPath}`);
      }
    }
  };
  collect(segmentDir, []);

  for (const file of files) {
    const destination = path.join(parentDir, file.name);
    if (existsSync(destination)) {
      throw new Error(`RSC segment filename collision: ${destination}`);
    }
    renameSync(file.source, destination);
  }
  rmSync(segmentDir, { recursive: true, force: true });
  return files.length;
}