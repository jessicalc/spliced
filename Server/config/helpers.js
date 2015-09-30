var fs = require('fs');
var gm = require('gm').subClass({imageMagick: true});
var db = require('../DB/DB.js');
var session = require('express-session');

module.exports = {
  errorLogger: function (error, req, res, next) {
    // log the error then send it to the next middleware in
    // middleware.js

    console.error(error.stack);
    next(error);
  },
  errorHandler: function (error, req, res, next) {
    // send error message to client
    // message for gracefull error handling on app
    res.send(500, {error: error.message});
  },

  hasSession: function (req) {
    return req.session ? !!req.session.user : false;
  },
  
  decodeBase64Image: function(dataString) {
    var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
      response = {};

    if (matches.length !== 3) {
      return new Error('Invalid input string');
    }
    response.type = matches[1];
    console.log("response.type is", response.type);
    response.data = new Buffer(matches[2], 'base64');

    return response;
  },

  makeImages: function(gameCode) {
    console.log("---------");
    console.log("makeImages was invoked... making images");
    console.log("---------");

    var readStream = fs.createReadStream("Server/assets/drawings/player1.png");
    // using http://aheckmann.github.io/gm/docs.html#append 
      gm(readStream)
      .append("Server/assets/drawings/player2.png", "Server/assets/drawings/player3.png", "Server/assets/drawings/player4.png")
      .write('client/uploads/game.png', function (err) {
        console.log("Streaming the image now");
        if (err) {
          console.log("There was an error creating the exquisite corpse:", err);
        } else {
          console.log("The exquisite corpse was combined successfuly!");
          db.game.findOneAndUpdate({ game_code: gameCode }, {drawing_finished: true}, function(err, game) {
            if (err) {
              console.log("There was an error updating the drawing_finished property on the game in the DB.");
            } else {
              console.log("Great! The drawing_finished property was successfully updated.");
            }
          })
        }

    });
  },

  checkFinalImage: function(code, callback, error) {

    // **NB** this finalImageURL is hard coded right now, but later it should be path_to_images/gameID.png
    var finalImageURL = 'client/uploads/' + code + '.png'; 
    // first, check to see if the final image exists. 
    fs.stat(finalImageURL, function(err, res) {
      if (err) {
        error(err);
        console.log("The image", finalImageURL, "doesn't exist!");
      } else {
        // if the image exists, then send the path to the image onward. 
        var fixedFinalImageURL = finalImageURL.slice(6);
        console.log("The final image URL was successfully retrieved from the server. It's", fixedFinalImageURL);
        callback();
      }
    })
  },

  //Create a new player for a specific game.
  createPlayer: function(req, res, game, code) {
    var userName = "0".concat(game.count);

    // add this player to the database. 
    db.player.findOneAndUpdate({user_name: userName}, {user_name: userName, counted: true, game_code: code}, {upsert: true, 'new': true}, function (err, player) {
      console.log("New player", userName, "Has been added to game:", code);
      console.log("We are making cookies!");
      res.cookie('player', player, { maxAge: 900000, httpOnly: false});
      res.cookie('playerId', player.user_name, { maxAge: 900000, httpOnly: false});
      console.log("The player cookie is", player);
      res.cookie(code, true, { maxAge: 900000, httpOnly: false});
      console.log("The cookies are:", res.cookie);
      // once the player has been added, we'll update the game table with the new player's info
      // this update also includes count++
      console.log("We're creating the player. the Player is:", player);
      var gameObj = {};
      gameObj.$inc = {'count':1};
      gameObj.userName = player.id;
      db.game.findOneAndUpdate({game_code: code}, gameObj, function(err, game){
        if(err){
          console.log(err)
        } else {
          console.log("This is the game data", game);
          // send game back to client. 
          res.send({game: game});
        }

      });
    });
  },

  //gameid, playerid, url to image
  updatePlayer: function() {

  },

  createUniqueGameCode: function(){
  
    var text = "";
    var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 4; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;

  },

  createNewGameOld: function(player, userKey, userName, res) {

    var newGame = {num_players: 4, count: 1};
    newGame[userKey] = player.id;
    //need to change to update in the db.
    db.started = true;
    // console.log("game is started: " + db.started);
    //update the counted to true - prevents counting a player twice.
    db.player.findOneAndUpdate({user_name: userName}, {counted: true}, {upsert: true, 'new': true}, function (err, player) {
      console.log("Player counted updated.");
    });
    //puts the new game into the database
    db.game.update({game_code: code}, newGame, {upsert: true, 'new': true}, function(err, game){
      return res.sendStatus(201);
    });
  },

  createNewGame: function(res){
    var code = this.createUniqueGameCode();
    var game = new db.game({game_code: code, num_players: 4, count: 0, game_started: true, game_finished: false}).save();
    console.log("the unique code is:" + code);
    res.send(code);
  },

  //update a game if it already exists
  updateGame: function(player, userKey, userName, res) {
    //create a new game object
    var gameObj = {};
    gameObj[userKey] = player.id;
    //if the player has never submitted a drawing...
    if(!player.counted){
      //increment number of submitted drawings
      gameObj.$inc = {'count':1};
      //update the player to know they have been counted
      db.player.findOneAndUpdate({user_name: userName}, {counted: true, 'new': true}, {upsert: true}, function (err, player) {
        console.log("Player count updated.");
      });
      //update the game with the new player information
      db.game.findOneAndUpdate({game_code: "game"}, gameObj, {upsert: true, 'new': true}, function(err, game){
        //if all players have submitted drawings
        if (game.count === game.num_players) {
          console.log("Let's invoke the image stitcher function now");
          // invoke create unified image function 
          module.exports.makeImages(function() {
            if (err) throw err;
            console.log("Done drawing the image, check the image folder!");
          });
        }
      });
    }
    return res.sendStatus(201); 
  },

  resolveFinishedGame: function (game) {
    if (game.game_finished) {
      // we will check if the drawing is completed
      if (game.drawing_finished) {
        // if the drawing is completed
        this.checkFinalImage(code, function() {
          var imageURL = '/client/uploads' + code + '.png';
          // we need to send it back.
          res.send({imageURL: imageURL});
        });
      } else {
        res.sendStatus(500);
        // if the drawing got messed up or never got completed
          // we will try to draw it again.
      }
    } else {
      // if it's not completed
      res.send({gameInProgress: true});
        // tell the user that the game is still in progress 
    }
  }
}