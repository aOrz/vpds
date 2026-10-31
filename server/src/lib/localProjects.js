const fs = require('fs');
const path = require('path');
const validation = require('./validation.js');

async function directories(root) {
  try {
    const stat = await fs.promises.lstat(root);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return [];
    return (await fs.promises.readdir(root, {withFileTypes: true}))
      .filter(entry => entry.isDirectory() && !entry.isSymbolicLink());
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

// Enumerate only real project directories with real manifests. Do not follow
// symlinks while discovering projects, including scopes and package.json files.
async function list(root) {
  const projects = [];
  async function add(name) {
    let directory;
    try {
      directory = validation.within(root, name);
    } catch (error) {
      if (error.status === 400) return;
      throw error;
    }
    const filename = path.join(directory, 'package.json');
    try {
      const stat = await fs.promises.lstat(filename);
      if (stat.isFile() && !stat.isSymbolicLink()) projects.push({name, filename});
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  for (const entry of await directories(root)) {
    if (entry.name.startsWith('@')) {
      try { validation.packageName(entry.name + '/placeholder'); } catch (error) { continue; }
      for (const child of await directories(path.join(root, entry.name))) {
        await add(entry.name + '/' + child.name);
      }
    } else {
      await add(entry.name);
    }
  }
  return projects.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}

async function readManifest(project) {
  // O_NOFOLLOW also closes the final-component symlink race between discovery
  // and reading a manifest on platforms that provide the flag.
  const handle = await fs.promises.open(project.filename, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    if (!(await handle.stat()).isFile()) throw new Error('Project manifest is not a regular file');
    return JSON.parse(await handle.readFile('utf8'));
  } finally {
    await handle.close();
  }
}

module.exports = {list, readManifest};
