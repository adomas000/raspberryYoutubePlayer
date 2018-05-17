var express = require('express');
var app = express();
var server = require("http").Server(app);
var io = require("socket.io")(server);
var fs = require('fs');
var path = require('path');
var omx = require('node-omxplayer');
var ytdl = require('youtube-dl');
var queue = require('queue');

server.listen(4321);

app.use(express.static('src'));
app.get('/', (req, res) => {
  fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
})


var clientCount = 0,
  userIds = [];
var player;
var q = queue();
var results = [];
q.autostart = true;
q.concurrency = 1;
q.timeout = 60 * 1000 * 60;

io.on('connection', function (socket) {
  initialiseEventsForUser(socket);
});


function initialiseEventsForUser(s) {
  io.emit('greeting', Object.values(io.eio.clients).map((x) => x.id));
  io.emit('userCount', io.engine.clientsCount);


  s.on('disconnect', (reason) => {
    io.emit('greeting', Object.values(io.eio.clients).map((x) => x.id));
    io.emit('userCount', io.engine.clientsCount);
  })

  s.on('addUrl', (url) => {

    q.push(function (cb) {
      playMusic(url, () => cb());
    });

  })
}

function playMusic(url, done) {
  ytdl.getInfo(url, function (err, info) {
    io.emit("trackData", info);
    var file = `./output/${info.id}.mp3`;
    var v = ytdl(url, ['-f 140']);
    v.pipe(fs.createWriteStream(file).on('finish', () => {
      player = omx(file);
      player.on('close', () => {
        fs.rmdirSync(file);
        done();
      })
    }));
  });
}