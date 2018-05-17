var app = angular.module("App", []);

app.controller('mainCtrl', function($scope, $timeout) {
  var socket = io('http://localhost:4321');
  $scope.urlInput;
  $scope.users = [];
  $scope.isPlaying = false;
  $scope.isPageLoaded = true;


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

  $scope.play = function() {
    var url = $scope.urlInput;
    socket.emit('addUrl', url);
  }
  
});

