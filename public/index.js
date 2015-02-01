$(function() {
  var FADE_TIME = 150; // ms
  var COLORS = [
    '#3c967c', '#7eb1b3', '#6f7da1'
  ];
  window.lastMessageTime = Date.parse(new Date())

  // Initialize varibles
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box

  var $loginPage = $('.login.page'); // The login page
  var $chatPage = $('.chat.page'); // The chatroom page

  // Prompt for setting a username
  var username;
  var connected = false;
  var typing = false;
  var $currentInput = $usernameInput.focus();

  var socket = io();

  // Sets the client's username
  function setUsername () {
    username = cleanInput($usernameInput.val().trim());

    // If the username is valid
    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      socket.emit('add user', username);
    }
  }

  function inRoom(){
      var parts = window.location.pathname.split('/')
      if(parts.length >= 3 && parts[1] == 'room') {
          socket.emit('in room', {room: parts[2]});
      }
  }

  // Sends a chat message
  function sendMessage () {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message,
        time: Date.parse(new Date()),
        user: 'self'  
      });
      // tell server to execute 'new message' and send along one parameter
      socket.emit('new message', {message:message});
    }
  }

  // Log a message
  function log (message, options) {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  function logTime(time, options) {
    var $el = $('<li>').addClass('log time').text(time);
    addMessageElement($el, options);
  }
 
  // Adds the visual chat message to the message list
  function addChatMessage (data, options) {

    var $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);


    var $subInfoContainer = $('<div class="sub-info-container clearfix" />')
        .append($usernameDiv)

    var $messageContainer = $('<div class="message-container"/>').
        append($messageBodyDiv)

    var $messageDiv
    if (data.user == 'self') {
      $messageDiv = $('<li class="message right clearfix"/>')
          .data('username', data.username)
          .append($subInfoContainer, $messageContainer);
    } else {
      $messageDiv = $('<li class="message clearfix"/>')
          .data('username', data.username)
          .append($subInfoContainer, $messageContainer);
    }

    var originTime = new Date(data.time)
    var timeDelta = data.time - window.lastMessageTime
    var time = originTime.toTimeString().substring(0,5)

    window.lastMessageTime = data.time

    // 如果和上一条message时间超过5min，则显示时间
    if (timeDelta >= 2000) {
      logTime(time)
    }

    addMessageElement($messageDiv, options);
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement (el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Prevents input from having injected markup
  function cleanInput (input) {
    return $('<div/>').text(input).text();
  }

  // Gets the color of a username through our hash function
  function getUsernameColor (username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Keyboard events

  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        typing = false;
      } else {
        setUsername();
        inRoom();
      }
    }
  });

  $('.submit').on('click', function() {
    setUsername();
  })
  $('#send-icon').on('click', function() {
    if (!username) return;
    sendMessage();
    typing = false;
  })

  // Click events

  // Focus input when clicking anywhere on login page
  $loginPage.click(function () {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });

  // Socket events

  // Whenever the server emits 'login', log the login message
  socket.on('login', function (data) {
    connected = true;
    // Display the welcome message
    logTime((new Date()).toTimeString().substring(0,5))
    var message = "欢迎来到聊天室";
    log(message);
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', function (data) {
    addChatMessage(data);
  });

  socket.on('show room', function(data){
    $('#room-info').html(data.title + '<a href="/qrcode/'+ data.title +'" alt="二维码" class="qrcode"></a>')
  });
});
