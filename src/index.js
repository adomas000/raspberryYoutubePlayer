var app = angular.module("App", []);

app.controller('mainCtrl', function($scope, $timeout, $interval) {
  var socket = io(location.origin);
  $scope.urlInput;
  $scope.users = [];
  $scope.isPlaying = false;
  $scope.isPageLoaded = true;

  $scope.queueData = {};
  $scope.historyData = {};
  $scope.currentSong = {};
  $scope.songProgress = 0;


  socket.on('greeting', (data) => {
    $scope.users = data;
    $scope.$applyAsync();
    $timeout(() => $scope.isPageLoaded = true, 0);
    $timeout(() => $scope.isPageLoadedAnimationEnded = true, 1000);
  });
  
  socket.on('userCount', (count) => {
    $scope.userCount = count;
    $scope.$applyAsync();
  });

  socket.on('trackData', (data) => {
    $scope.trackTitle = data.title;
  });

  socket.on('queueData', (data) => {
    $scope.historyData = {};
    $scope.queueData = {};
    Object.keys(data).map((key)=>{
      if(data[key].done) {
        $scope.historyData[key] = data[key];
      } else if(key != $scope.currentSong._id) {
        // If song was playing before client connected
        if(data[key].playing) {
          $scope.currentSong = data[key];
          $scope.isPlaying = true;
          $scope.songProgress = 100; // this is bad, but since I calculate on client side, nothing I can do(maybe move to server side, but meh)
        } else {
          $scope.queueData[key] = data[key];
        }
      } 
    });
    $scope.$applyAsync();
  })

  socket.on('isPlaying', (playing) => {
    $scope.isPlaying = playing;
    if(!playing) {
      $scope.songProgress = 0;
      songProgressSeconds = 0;
      $interval.cancel($scope.songProgressInterval);
    }
    $scope.$applyAsync();
  })

  socket.on('currentSong', (id) => {
    $scope.currentSong = $scope.queueData[id];
  })

  socket.on('songProgress', (seconds) => {
    $scope.songProgress = seconds * 100 / $scope.currentSong.info._duration_raw;
    console.log($scope.songProgress);
    $scope.$applyAsync();
  })

  $scope.addToQueue = function() {
    var url = $scope.urlInput;
    if(url!='')
    socket.emit('addUrl', url);
  }


  $scope.togglePlay = function() {
    if($scope.isPlaying) {
      socket.emit('pauseAudio', $scope.currentSong._id);
    } else {
      socket.emit('resumeAudio', $scope.currentSong._id);
    }
    $scope.currentSong.paused = !$scope.currentSong.paused;
  }

  $scope.volumeUp = function() {
    socket.emit('volumeUp');
  }

  $scope.volumeDown = function() {
    socket.emit('volumeDown');
  }
  
});

