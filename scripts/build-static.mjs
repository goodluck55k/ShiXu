import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Qoder Sites 只接收已构建的静态目录；构建期间排除 Node Route Handler 与动态预览页。
const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const result = spawnSync(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  env: { ...process.env, NEXT_STATIC_EXPORT: "1" },
});

process.exit(result.status ?? 1);