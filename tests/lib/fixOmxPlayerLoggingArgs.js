var fs = require('fs-extra');
var path = require('path')
module.exports = function(done) {
  var file = path.resolve(path.join('node_modules', 'node-omxplayer', 'index.js'));
  var contents = fs.readFileSync(file, 'utf-8').split('\n');
  if(contents[87].match(/args for omxplayer/gi)) contents[87] = ''; 
  fs.writeFileSync(file, contents.join('\n'));
  done();
}