/**
 * youtube-dl has annoying deprecation warnings who get spammed
 * So hardcoding fix for that
 */
var fs = require('fs');
var path = require('path');
module.exports = (done) => {
  var file = path.resolve("node_modules\\youtube-dl\\lib\\youtube-dl.js");
  var contents = fs.readFileSync(file, 'utf-8').split("\n");
  if(contents[232].match(/is deprecated/gi)) contents[232] = '';
  if(contents[238].match(/is deprecated/gi)) contents[238] = '';
  if(contents[244].match(/is deprecated/gi)) contents[244] = '';
  fs.writeFileSync(file, contents.join('\n'));
  done();
}