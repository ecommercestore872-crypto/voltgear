const fs = require('fs');
const glob = require('glob'); // Note: running raw script might require local glob if not installed. Let's just use Node's recursive readdir.

const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('d:/Latest code/e commerce store (1)/e commerce store/components', (filePath) => {
  if (filePath.endsWith('.tsx') && !filePath.includes('node_modules')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    // Look for: productId: ...\n (or similar) and add freeShipping right after if not there
    let regex = /productId:\s*([a-zA-Z0-9_]+)\._id,?/g;
    content = content.replace(regex, (match, v) => {
      changed = true;
      return match + `\n        freeShipping: Boolean(${v}.freeShipping),`;
    });

    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log('Updated', filePath);
    }
  }
});
