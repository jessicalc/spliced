angular.module('spliced.ready', [])

.controller('ReadyController', function ($scope, $route, Draw, $location, $cookies) {

  $scope.data = {};
  $scope.data.isComplete = $scope.data.isComplete || false;
  $scope.data.imageURL = $scope.data.imageURL || null;
  // console.log($route.current.params.code);
  $scope.data.gameCode = $route.current.params.code;

  $scope.data.gameURL = window.location.href;
  // $scope.data.image = // ng-model for the canvas itself, which we'll save

  // this asks the server for info about the game. 
  $scope.getGameStatus = function() {
    return Draw.getGameStatus($scope.data.gameCode)
    .then(function(response) {
      if (!response.data) { }
      if (response.data.hasOwnProperty("imageURL")) {
        $scope.data.isComplete = true;
        $scope.data.imageURL = response.data.imageURL;
      } 
    })
  }

  $scope.registerPlayer = function() {
     Draw.registerPlayer($scope.data.gameCode);
  }
  // this invokes getGameStatus when the page is loaded.

  $scope.getGameStatus();

});