var express = require('express');
var app = express();
var server = require("http").Server(app);
var io  = require("socket.io")(server);
var fs = require('fs');
var path = require('path');

server.listen(4321);

app.use(express.static('src'));
app.get('/', (req, res) => {
  fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
})


var clientCount = 0, userIds = [];

io.on('connection', function (socket) {
  initialiseEventsForUser(socket);
});


function initialiseEventsForUser(s) {
  io.emit('greeting', Object.values(io.eio.clients).map((x)=>x.id));
  io.emit('userCount', io.engine.clientsCount);


  s.on('disconnect', (reason) => {
    io.emit('greeting', Object.values(io.eio.clients).map((x)=>x.id));
    io.emit('userCount', io.engine.clientsCount);
  })

  s.on('addUrl', (url) => {
    
  })
}