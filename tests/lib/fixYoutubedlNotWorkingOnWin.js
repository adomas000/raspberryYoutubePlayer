var request = require('request');
var fs = require('fs-extra');
var path = require('path');
var platform = require("os").platform();

module.exports = function(done) {
  if(platform != 'win32') return;
  var url = "https://yt-dl.org/downloads/2018.05.18/youtube-dl.exe";
  request(url)
    .pipe(fs.createWriteStream(path.resolve(path.join('node_modules', 'youtube-dl', 'bin', 'youtube-dl.exe'))))
      .on('finish', () => done())
      .on('error', (e) => console.error(e));

}