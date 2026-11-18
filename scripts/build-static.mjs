import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Qoder Sites 只接收已构建的静态目录；构建期间排除 Node Route Handler 与动态预览页。
const projectRoot = fileURLToPath(new URL("..", import.meta.url));
rmSync(path.join(projectRoot, "out"), { recursive: true, force: true });

const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const result = spawnSync(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  env: { ...process.env, NEXT_STATIC_EXPORT: "1" },
});

process.exit(result.status ?? 1);