import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, 'src');

const allowDynamicImgExpressions = [
  'logo',
  'imagePreview',
  'selectedGif',
  'gifUrl',
  'data:',
];

const allowedGetOptimizedUrlFiles = new Set([
  path.join(SRC_ROOT, 'lib', 'imageUtils.ts'),
  path.join(SRC_ROOT, 'lib', 'imageUtils.test.ts'),
  path.join(SRC_ROOT, 'components', 'ui', 'public-image.tsx'),
]);

const allowedDynamicImgFiles = new Set([
  path.join(SRC_ROOT, 'components', 'PostComposer.tsx'),
  path.join(SRC_ROOT, 'components', 'GifPicker.tsx'),
  path.join(SRC_ROOT, 'components', 'StoryCardPreview.tsx'),
  path.join(SRC_ROOT, 'pages', 'Auth.tsx'),
  path.join(SRC_ROOT, 'pages', 'Index.tsx'),
  path.join(SRC_ROOT, 'pages', 'ResetPassword.tsx'),
  path.join(SRC_ROOT, 'components', 'Navbar.tsx'),
  path.join(SRC_ROOT, 'components', 'DesktopSidebar.tsx'),
  path.join(SRC_ROOT, 'components', 'ui', 'public-image.tsx'),
]);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (/\.(ts|tsx)$/.test(entry.name)) return [fullPath];
    return [];
  });
}

function collectViolations() {
  const violations = [];
  const files = walk(SRC_ROOT);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');

    if (content.includes('getOptimizedUrl(') && !allowedGetOptimizedUrlFiles.has(file)) {
      violations.push(`${path.relative(ROOT, file)} uses getOptimizedUrl directly; use PublicImage or AvatarImage instead.`);
    }

    if (content.includes('.storage') && content.includes('.upload(')) {
      violations.push(`${path.relative(ROOT, file)} appears to upload directly to Supabase Storage; use the shared signed-upload services instead.`);
    }

    if (!allowedDynamicImgFiles.has(file)) {
      const dynamicImgRegex = /<img[\s\S]*?src=\{([^}]+)\}/g;
      for (const match of content.matchAll(dynamicImgRegex)) {
        const expression = match[1];
        if (!allowDynamicImgExpressions.some((allowed) => expression.includes(allowed))) {
          violations.push(`${path.relative(ROOT, file)} renders a dynamic <img>; use PublicImage or AvatarImage unless it is an approved preview/static asset.`);
          break;
        }
      }
    }
  }

  return violations;
}

const violations = collectViolations();
if (violations.length > 0) {
  console.error('Image abstraction guard failed:\n');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Image abstraction guard passed.');
