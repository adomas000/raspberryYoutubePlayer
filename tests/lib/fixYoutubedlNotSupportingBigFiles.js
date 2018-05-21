/**
 * When given bigger file, like 1h long song, youtube-dl will throw error
 * Because maxBuffer will be exceeded
 */

var fs = require('fs');
var path = require('path');

const fix = `
// FIX EDIT : test: ${path.basename(__filename)} \n
if(!options) options = {};\n
options.maxBuffer = 999999 * 1024;
`;

module.exports = function(done) {
  var filePath = path.join('node_modules', 'youtube-dl', 'lib', 'youtube-dl.js');
  var lines = fs.readFileSync(filePath, 'utf-8').split("\n");
  var isFixed = false;
  for(const num in lines) {
    if(lines[num].match(/options\.maxBuffer = 999999 \* 1024;/gi)) isFixed = true;
  }

  if(!isFixed)
  for(const num in lines) {
    if(lines[num].match(/call\(url, defaultArgs, args, options, function done\(err, data\) \{/gi)) {
      lines.splice(num-1, 0, fix);
      break;
    }
  }

  fs.writeFileSync(filePath, lines.join("\n"));
  done();
}