var app = angular.module("App", []);

app.controller('mainCtrl', function($scope, $timeout) {
  var socket = io('http://localhost:4321');
  $scope.urlInput;
  $scope.users = [];
  $scope.isPlaying = false;
  $scope.isPageLoaded = true;

  $scope.trackTitle = "";


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

  $scope.addToQueue = function() {
    var url = $scope.urlInput;
    if(url!='')
    socket.emit('addUrl', url);
  }

  $scope.togglePlay = function() {
    if($scope.isPlaying) {
      socket.emit('pauseAudio');
    } else {
      socket.emit('resumeAudio');
    }
    $scope.isPlaying = !$scope.isPlaying;
  }
  
});

