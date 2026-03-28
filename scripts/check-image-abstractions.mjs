/**
 * Lightweight guard: marketing site should not reintroduce direct Supabase storage uploads in `src/`.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, "src");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (/\.(ts|tsx)$/.test(entry.name)) return [fullPath];
    return [];
  });
}

const violations = [];
for (const file of walk(SRC_ROOT)) {
  const content = fs.readFileSync(file, "utf8");
  if (content.includes(".storage") && content.includes(".upload(")) {
    violations.push(
      `${path.relative(ROOT, file)} appears to upload directly to object storage; keep uploads out of the marketing site.`,
    );
  }
}

if (violations.length > 0) {
  console.error("Image / storage guard failed:\n");
  for (const v of violations) console.error(`- ${v}`);
  process.exit(1);
}

console.log("Image / storage guard passed.");
