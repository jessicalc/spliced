angular.module('spliced.services', [])

.factory('Draw', function($http, $location) {
  var services = {};


  services.save = function(image, gameCode, cookieData) {
    console.log("Inside services, the image is", image);
    console.log("Inside services, the gameCode is", gameCode);
    console.log("Inside services, the cookieData is", cookieData);
    // write post request here! :)
    return $http.post('/game/' + gameCode, { image: image, cookieData: cookieData } )
    .then(function(response) {
      return response;
      console.log("The response is", response);
    }, function(err) {
      console.log("The error is", err)
    });
  };

  services.createGame = function() {
    return $http.get('/game')
    .then(function (gameCode) {
      return gameCode.data;
      // callback(gameCode.data)
    }, function(err) {
      console.log('There was an error getting the game code.');
    });
  };

  services.registerPlayer = function(gameCode){
    //POST request:
    console.log("Am I making a request?");
    return $http.get('/game/' + gameCode )
    .then(function(response){
      var newUrl = '/game/' + gameCode + '/draw';
      $location.path(newUrl);
      console.log(newUrl);
      console.log(response);
    }), function(err){
      console.log("There was an error registering the player", err)
    }
  };

  services.getGameStatus = function(gameCode) {
    console.log("Getting game data...");

    return $http.get('/game/' + gameCode + '/status')
    .then(function(response){
      console.log("The game data is...", response);
      return response;
      // callback(response);
    }, function(err){
      console.log("The game doesn't exist", err);
      $location.path('/#')
    })
  };

  return services;
});

// Store all four images in an object 
// On the result page, you'll create a canvas that has four images on top of it
