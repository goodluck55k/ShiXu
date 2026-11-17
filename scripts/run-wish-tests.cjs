const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const sources = [
  "src/domain/wishes.ts",
  "src/lib/storage/wishStorage.ts",
  "src/components/wishes/wishView.ts",
  "src/components/wishes/wishLayout.ts",
  "scripts/wishTests.ts",
];

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "shixu-wish-tests-"));
process.on("exit", () => {
  try {
    fs.rmSync(outDir, { recursive: true, force: true });
  } catch {
    // 临时目录清理失败不影响测试结果。
  }
});

for (const relative of sources) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  const output = ts.transpileModule(source, {
    fileName: relative,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      isolatedModules: true,
    },
  }).outputText;
  const destination = path.join(outDir, relative.replace(/\.tsx?$/, ".js"));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, output);
}

require(path.join(outDir, "scripts", "wishTests.js"));