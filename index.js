// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
var Debug = require('debug');
var mongoose = require('mongoose');
var Boom = require('./models/boom');
var Room = require('./models/room');
var config = require('./config');

var connect = function() {
  var options = { server: { socketOptions: { keepAlive: 1}}};
  mongoose.connect('mongodb://' + config.host + '/' + config.dbname, options);
};

connect();
mongoose.connection.on('error', console.log);
mongoose.connection.on('disconnect', connect);

var log = Debug('Chat:server')

server.listen(port, function () {
  log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));
app.use('/room/*', express.static(__dirname + '/public/index.html'));
app.use('/wall/*', express.static(__dirname + '/public/danmu.html'));
app.use('/test/*', express.static(__dirname + '/public/component/component.html'));
app.use('/rooms', express.static(__dirname + '/public/rooms.html'));
app.use('/qrcode/*', express.static(__dirname + '/public/qrcode.html'));

// Chatroom

// usernames which are currently connected to the chat
var usernames = {};
var numUsers = 0;

io.on('connection', function (socket) {
  socket.room = 'default'
  socket.join(socket.room);
 
  function shout(e, data){
    data.room = socket.room
    socket.broadcast.to(socket.room).emit(e, data) 
  }  

  var addedUser = false;

  /* room */
  socket.on('in room', function(data) { 
    socket.join(data.room);
    socket.room = data.room;

    Room.getOneByName(data.room).then(function(result) {
        socket.emit('show room', result)
    });

    log(socket.username + ' join in room ' + data.room);
  });

  socket.on('exit room', function(data) { 
    socket.leave(data.room);
    socket.room = 'default'; 
  });

  socket.on('create room', function(data){
    if (!data.title) {
        socket.emit('error msg', '请填写名称先！');
        return;
    }

    Room.getOneByName(data.title).then(function(result) {
      if (result) {
          socket.emit('error msg', '名称已存在！换一个试试～');
          return;
      }

      var room = new Room(data);
      room.uploadAndSave().then(function() {
        log('add a room:' + room);
        socket.emit('created room', room);
      });
    });
  });

  socket.on('fetch rooms', function(data){
    Room.getAll().then(function(result){
      socket.emit('show rooms', result);
    })
  })

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    var boom = new Boom({
      room: socket.room,
      sender: socket.username,
      content: data.message,
      roomTime: data.roomTime
    });
    boom.uploadAndSave().then(function(result) {
      log('add one boom');
    });
    shout('new message', {
      username: socket.username,
      message: boom.content,
      roomTime: boom.roomTime,
      time: Date.parse(boom.time)
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    // we store the username in the socket session for this client
    socket.username = username;
    // add the client's username to the global list
    usernames[username] = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    shout('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    shout('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    shout('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    // remove the username from global usernames list
    if (addedUser) {
      delete usernames[socket.username];
      --numUsers;

      // echo globally that this client has left
      shout('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
