var fs = require('fs-extra');
var path = require('path')
module.exports = function(done) {
  var file = path.resolve(path.join('node_modules', 'node-omxplayer', 'index.js'));
  var contents = fs.readFileSync(file, 'utf-8').split('\n');
  for(const num in contents) {
    if(contents[num].match(/args for omxplayer/gi)){
      contents[num] = `// DELETED LINE BY ${path.basename(__filename)}`;
    }
  }
  
  fs.writeFileSync(file, contents.join('\n'));
  done();
}