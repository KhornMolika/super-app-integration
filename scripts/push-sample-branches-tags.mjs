import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

function pushBranchesAndTags(pkgName, repoUrl) {
  const sourceDir = path.join(process.cwd(), pkgName);
  const tempDir = path.join(os.tmpdir(), `push-branches-${pkgName}-${Date.now()}`);

  console.log(`\n==============================================`);
  console.log(`🚀 Creating branches & tags for ${pkgName} -> ${repoUrl}`);
  console.log(`==============================================`);

  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  fs.cpSync(sourceDir, tempDir, { recursive: true });

  const nestedGit = path.join(tempDir, '.git');
  if (fs.existsSync(nestedGit)) {
    fs.rmSync(nestedGit, { recursive: true, force: true });
  }

  const exec = (cmd) => execSync(cmd, { cwd: tempDir, stdio: 'inherit' });

  exec('git init');
  exec('git config user.name "Molika Khorn"');
  exec('git config user.email "molikakhorn71@gmail.com"');
  exec('git add .');
  exec('git commit -m "feat: initial stable release v1.0.0"');
  exec('git branch -M main');
  exec(`git remote add origin ${repoUrl}`);

  // Create tag v1.0.0 and v0.9.0
  exec('git tag -a v1.0.0 -m "Release v1.0.0"');
  exec('git tag -a v0.9.0 -m "Beta release v0.9.0"');

  // Create develop branch with a minor commit
  exec('git checkout -b develop');
  fs.appendFileSync(path.join(tempDir, 'README.md'), '\n\n## Development Branch\nActive feature staging and integration tests.\n');
  exec('git add README.md');
  exec('git commit -m "chore(dev): staging updates for next release"');

  // Create staging branch with another commit
  exec('git checkout -b staging');
  fs.appendFileSync(path.join(tempDir, 'README.md'), '\n## Staging Candidate\nPre-release validation.\n');
  exec('git add README.md');
  exec('git commit -m "chore(staging): pre-release candidate build"');

  // Push main, develop, staging, and tags
  console.log(`Pushing branches (main, develop, staging)...`);
  exec('git push --force origin main');
  exec('git push --force origin develop');
  exec('git push --force origin staging');

  console.log(`Pushing tags (v1.0.0, v0.9.0)...`);
  exec('git push --force origin --tags');

  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log(`✅ ${pkgName} branches and tags pushed successfully!`);
}

try {
  pushBranchesAndTags(
    'sc-public-miniapp',
    'https://github.com/KhornMolika/sc-public-miniapp.git'
  );

  pushBranchesAndTags(
    'sc-private-miniapp',
    'https://github.com/KhornMolika/sc-private-miniapp.git'
  );

  console.log('\n🎉 Successfully created and pushed branches (main, develop, staging) and tags (v1.0.0, v0.9.0) for both repositories!');
} catch (err) {
  console.error('\n❌ Push failed:', err.message);
  process.exit(1);
}
