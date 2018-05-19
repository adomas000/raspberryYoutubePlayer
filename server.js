var express = require('express');
var app = express();
var server = require("http").Server(app);
var io = require("socket.io")(server);
var fs = require('fs-extra');
var path = require('path');
var omx = require('node-omxplayer');
var ytdl = require('youtube-dl');
var queue = require('queue');
var winston = require('winston');
var cluster = require('cluster');
var moment = require("moment");
var ip = require('ip');
var os = require('os');

var platform = os.platform();

var logger = new (winston.Logger)({
  transports:[
    new (winston.transports.Console)({colorize:true, timestamp:() => `[${moment().format('YYYY[/]MM[/]DD, HH:MM:ss')}]`}),
    new (winston.transports.File)({filename:'log.log', timestamp:() => `[${moment().format('YYYY[/]MM[/]DD, HH:MM:ss')}]`})
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'error.log' }),
    new (winston.transports.Console)({humanReadableUnhandledException: true,colorize:true, timestamp:() => `[${moment().format('YYYY[/]MM[/]DD, HH:MM:ss')}]`}),
  ]
});

try{
  var ENV = JSON.parse(fs.readFileSync('settings.json', 'utf-8'));
} catch (e) {
  return logger.error("Failed parsing settings.json, check its structure!");
}

// Don't let script shut down
if(!ENV.debug) {
  if (cluster.isMaster) {
    cluster.fork();
  
    cluster.on('exit', function(worker, code, signal) {
      if(--ENV.triesToRestartScript) {
        logger.warn("Process exited, trying to restart " + ENV.triesToRestartScript);
        cluster.fork();
      } else{ 
        logger.error("Process failed to start, exiting...");
      }
    });
  }

  if(!cluster.isWorker) return;
} else {
  logger.info("DEBUG MODE");
}



(function lisServ(port) {
  server.listen(port);
  server.on('error', (e) => lisServ(++port))
  server.on('listening', () => logger.info(`Started server on ${ip.address()}${port==80 ? '' : ':' + port}`));
})(ENV.port || 80)

app.use(express.static('src'));
app.get('/', (req, res) => {
  fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
})

fs.ensureDir(path.join(__dirname, 'output'))
  .then(() => {
    // Check if there is something in output folder and delete it, unless settings specify otherwise.
    fs.readdir(path.join(__dirname, 'output')).then((files) => files.length > 0 && ENV.deleteFilesInOutputOnStart ? files.map(f=>fs.unlink(path.join(__dirname, 'output', f))) : undefined);
  });


var clientCount = 0;
var userIds = [];
var player;
var getInfoQ = queue();
var downloadQ = queue();
var playQ = queue();
var results = {};

getInfoQ.autostart = true;
playQ.autostart = true;
downloadQ.autostart = true;

playQ.concurrency = 1;
downloadQ.concurrency = 3;

getInfoQ.timeout = 30000; // 30s;
playQ.timeout = 60 * 1000 * 15;// 15min
downloadQ.timeout = 60 * 1000 * 60;// 15min

io.on('connection', function (socket) {
  initialiseEventsForUser(socket);
});


function initialiseEventsForUser(s) {
  io.emit('greeting', Object.values(io.eio.clients).map((x) => x.id));
  io.emit('userCount', io.engine.clientsCount);
  io.emit('queueData', results);


  s.on('disconnect', (reason) => {
    io.emit('greeting', Object.values(io.eio.clients).map((x) => x.id));
    io.emit('userCount', io.engine.clientsCount);
  })

  s.on('addUrl', function (url) {
    const socket = this;
    getInfoQ.push(function (cb) {
      getInfoFromUrl(url, socket.handshake.address.replace("::ffff:",""), () => cb());
    });
  })

  s.on('volumeDown', function () {
    if(player){
      player.volDown()
    }
  });

  s.on('volumeUp', function () {
    if(player) {
      player.volUp()
    }
  });

  s.on('pauseAudio', function (id) {
    if(player) {
      player.pause();
      results[id].paused = true;
    }
  });

  s.on('resumeAudio', function (id) {
    if(player) {
      player.play();
      results[id].paused = false;
      streamSongProgress(id);
    }
  });
}

var id = 0;
var previousEnded = true;
var songProgressInSeconds = 0;

function getInfoFromUrl(url, ip, done) {
  var obj = {
    downloaded: false,
    gotInfo: false,
    playing: false,
    paused: false,
    done: false,
    url: url,
    info: {},
    filePath: null,
    id: null,
    _id:++id,
    requestedBy: ip,
    status:"Not started",
    
    statusCode:0,
    timestamp: new Date().getTime()
  };

  results[obj._id] = obj;
  io.emit('queueData', results);
  logger.info(`[Getting info] [In progress] url: ${url} id: ${obj._id}`);
  ytdl.getInfo(url, function (err, info) {
    logger.info(`[Getting info] [Completed] url: ${url} id: ${obj._id}`);
    results[obj._id].info = info;
    results[obj._id].id = (info.id + '-' + obj._id)//.replace(/"|'|`|\\|\//gi, "");
    results[obj._id].filePath = path.join(__dirname , `/output/${results[obj._id].id}.mp3`);
    results[obj._id].gotInfo = true;
    results[obj._id].status = "Downloading...";
    results[obj._id].statusCode = 1;
    io.emit('queueData', results);
    downloadQ.push(function(cb){
      downloadMusic(obj._id, () => cb());
    });
    done();
  });
}

/**
 * 
 * @param {number} id this id is _id, e.g. 0,1,2,3, but id in results is url id + _id 
 * @param {Function} done 
 */
function downloadMusic(id, done) {
  if (!results[id].gotInfo) return setTimeout(() => downloadMusic(id, done), 500);
  
  logger.info(`[Download] [In progress] ${results[id].info.title} (${results[id].id})`);
  ytdl(results[id].url, ['--format=18']).pipe(fs.createWriteStream(results[id].filePath)).on('finish', () => {
    results[id].downloaded = true;
    results[id].status = "Downloaded";
    results[id].statusCode = 2;
    io.emit('queueData', results);
    logger.info(`[Download] [Completed] ${results[id].info.title} (${results[id].id})`);
    playQ.push(function (cb) {
      playMusic(id, cb);
    });
    done();
  });
}

function playMusic(id, done) {
  if (!results[id].downloaded) return setTimeout(() => playMusic(id, done), 500);

  if (platform == 'win32') {
    results[id].done = true;
    io.emit('queueData', results);
    removeOldQueue();
    done();
    return;
  };
  
  try {
    player = omx(results[id].filePath);
    results[id].playing = true;
    streamSongProgress(id);
    io.emit('currentSong', id);
    io.emit('queueData', results);
    io.emit('isPlaying', true);
  } catch (e) {
    logger.error("Omx player couldn't start, " + e.message);
  }
  //player.play();
  logger.info(`[Playing] [In progress] ${results[id].info.title} (${results[id].id})`);
  player.on('close', () => {
    results[id].done = true;
    results[id].playing = false;
    io.emit('isPlaying', false);
    io.emit('queueData', results);
    logger.info(`[Playing] [Completed] ${results[id].info.title} (${results[id].id})`);
    fs.unlinkSync(results[id].filePath);
    removeOldQueue();
    done();
  });
  // setTimeout(()=>{
  //   results[id].done = true;
  //   results[id].playing = false;
  //   io.emit('isPlaying', false);
  //   io.emit('queueData', results);
  //   logger.info(`[Playing] [Completed] ${results[id].info.title} (${results[id].id})`);
  //   fs.unlinkSync(results[id].filePath);
  //   removeOldQueue();
  //   done();
  // }, results[id].info._duration_raw * 1000);
};

function streamSongProgress (id) {
  setTimeout(() => {
    if(results[id].playing) {
      if(results[id].paused) {
        return;
      }
      io.emit('songProgress', ++songProgressInSeconds);
      streamSongProgress(id);
    } else {
      songProgressInSeconds = 0;
    }
  }, 1000);
}

function removeOldQueue () {
  var done = Object.values(results).filter(val=>val.done);
  done = done.sort((a, b) => {
    return a.timestamp - b.timestamp;
  });
  
  if(ENV.songHistoryCount < done.length) {
    var howManyToDelete = done.length-ENV.songHistoryCount;
    for(let i; i<howManyToDelete;i++) {
      delete results[done[i]._id];
    }
  }
}