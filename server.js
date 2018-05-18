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
var downloadQ = queue();
var playQ = queue();
var results = {};

playQ.autostart = true;
downloadQ.autostart = true;

playQ.concurrency = 1;
downloadQ.concurrency = 1;

playQ.timeout = 60 * 1000 * 60;
downloadQ.timeout = 60 * 1000 * 60;

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
    downloadQ.push(function (cb) {
	downloadMusic(url, () => cb());
    });
  })
}

var id = 0;
var previousEnded = true;


function downloadMusic(url, done) {
    var obj = {
	downloaded: false,
	info:{},
	filePath:null,
	id:null,
	done:false
    };
    
	ytdl.getInfo(url, function(err, info) {
	    obj.info = info;
	    obj.id = info.title+'-'+id++;
	    obj.filePath = __dirname + `/output/${obj.id}.mp3`;
	    
	    results[obj.id] = obj;
	    
	    playQ.push(function(cb){
		playMusic(obj.id, cb);
	    });
	    console.log("starting download for" + obj.id);
	    ytdl(url, ['-f 140']).pipe(fs.createWriteStream(obj.filePath)).on('finish', ()=>{
		results[obj.id].downloaded = true;
		console.log('download complete' + obj.info.title);
		done();
	    });
	});
	
}

function playMusic(id, done) {
    if(!results[id].downloaded) return setTimeout(()=>playMusic(id, done),1000);
	player = omx(results[id].filePath);
	//player.play();
	console.log("playing " + results[id].id);
	player.on('close', () => {
	    console.log(id + "finished playing");
            fs.unlinkSync(results[id].filePath);
	    delete results[id];
	    done();
	});
    };
