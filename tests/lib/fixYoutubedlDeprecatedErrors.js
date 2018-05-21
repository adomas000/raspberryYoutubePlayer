/**
 * youtube-dl has annoying deprecation warnings who get spammed
 * So hardcoding fix for that
 */
var fs = require('fs');
var path = require('path');
module.exports = (done) => {
  var file = path.resolve(path.join('node_modules', 'youtube-dl', 'lib', 'youtube-dl.js'));
  var contents = fs.readFileSync(file, 'utf-8').split("\n");
  for(const num in contents) {
    // Regex will mach line that contains these 2 strings in it only
    if(contents[num].match(/^(?=.*console.warn)(?=.*is deprecated, use).*$/gi)) {
      contents[num] = `// DELETED BY test ${path.basename(__filename)}`;
    }
  }
 
  fs.writeFileSync(file, contents.join('\n'));
  done();
}