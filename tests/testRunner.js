var fs = require("fs");
var path = require("path");

var files = fs.readdirSync(path.join(__dirname, 'lib')).map(file=>path.join(__dirname, 'lib', file));

(function runTest(index) {
  if(!files[index]) return console.log("All good, write 'npm start'");
  require(files[index])(() => {
    console.log("Running test "+ path.basename(files[index]));
    runTest(++index);
  });
})(0);