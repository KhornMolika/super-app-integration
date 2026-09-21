import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

function pushPackage(pkgName, repoUrl, commitMsg) {
  const sourceDir = path.join(process.cwd(), pkgName);
  const tempDir = path.join(os.tmpdir(), `push-${pkgName}-${Date.now()}`);

  console.log(`\n==============================================`);
  console.log(`🚀 Pushing ${pkgName} -> ${repoUrl}`);
  console.log(`==============================================`);

  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  // Copy all files
  fs.cpSync(sourceDir, tempDir, { recursive: true });

  // Remove any nested .git
  const nestedGit = path.join(tempDir, '.git');
  if (fs.existsSync(nestedGit)) {
    fs.rmSync(nestedGit, { recursive: true, force: true });
  }

  // Initialize and push
  const exec = (cmd) => execSync(cmd, { cwd: tempDir, stdio: 'inherit' });

  exec('git init');
  exec('git config user.name "Molika Khorn"');
  exec('git config user.email "molikakhorn71@gmail.com"');
  exec('git add .');
  exec(`git commit -m "${commitMsg}"`);
  exec('git branch -M main');
  exec(`git remote add origin ${repoUrl}`);
  exec('git push --force origin main');

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log(`✅ ${pkgName} successfully pushed to ${repoUrl}!`);
}

try {
  pushPackage(
    'sc-public-miniapp',
    'https://github.com/KhornMolika/sc-public-miniapp.git',
    'feat: smart transit and metro pass public mini app'
  );

  pushPackage(
    'sc-private-miniapp',
    'https://github.com/KhornMolika/sc-private-miniapp.git',
    'feat: loyalty rewards and vip vouchers private mini app'
  );

  console.log('\n🎉 Both mini app repositories pushed successfully!');
} catch (err) {
  console.error('\n❌ Push failed:', err.message);
  process.exit(1);
}
