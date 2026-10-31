const fs = require('fs');
const path = require('path');

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

// Package names are also used as directory names; never accept shell syntax,
// filesystem navigation, registry URLs, or npm command-line options here.
function packageName(value) {
  const part = '[a-z0-9][a-z0-9._-]*';
  const pattern = new RegExp('^(?:@' + part + '/)?' + part + '$');
  if (typeof value !== 'string' || value.length > 214 ||
      value.indexOf('..') !== -1 || !pattern.test(value)) {
    throw invalid('Invalid package name');
  }
  return value;
}

function realPathIncludingMissing(target) {
  try {
    return fs.realpathSync(target);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    // A dangling symlink is not a safe location for a future write.
    try {
      if (fs.lstatSync(target).isSymbolicLink()) throw invalid('Invalid project path');
    } catch (statError) {
      if (statError.code !== 'ENOENT') throw statError;
    }
    const parent = path.dirname(target);
    if (parent === target) throw error;
    return path.join(realPathIncludingMissing(parent), path.basename(target));
  }
}

function within(root, name) {
  packageName(name);
  const base = path.resolve(root);
  const target = path.resolve(base, name);
  const realBase = realPathIncludingMissing(base);
  const realTarget = realPathIncludingMissing(target);
  const relative = path.relative(realBase, realTarget);
  if (!relative || relative === '..' || relative.indexOf('..' + path.sep) === 0 ||
      path.isAbsolute(relative)) {
    throw invalid('Project path escapes its directory');
  }
  return target;
}

function projectPath(root, kind, name) {
  if (kind !== 'module' && kind !== 'page') throw invalid('Invalid project kind');
  // Validate the category itself, so a symlinked pages/modules directory cannot
  // redirect operations outside the configured source tree.
  return within(within(root, kind + 's'), name);
}

module.exports = {packageName, within, projectPath};
