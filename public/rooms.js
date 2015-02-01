$(function() {
    var socket = io();

    socket.on('show rooms', function(data){
        $('#rooms').html('');
        $.each(data, function(i, r){ 
            $('#rooms').append('<tr><td><a href="/room/' + r.title + '">' + r.title + '</a><a href="/qrcode/'+ r.title +'" alt="二维码" class="qrcode"></a></tr>');
        });
    });

    socket.on('created room', function(r){
        alert('恭喜，' + r.title + ' 创建成功！');
        $('#rooms').prepend('<tr><td><a href="/room/' + r.title + '">' + r.title + '</a><a href="/qrcode/'+ r.title +'" alt="二维码" class="qrcode"></a></tr>');
    });

    socket.on('error msg', function(data){
        alert(data);
    });

    $('#room-form').submit(function(){
        socket.emit('create room', {
          title: $('#room-form [name=title]').val(),
          type: parseInt($('#room-form [name=type]:checked').val(), 10),
          periodTime: parseInt($('#room-form [name=periodTime]').val(), 10)
        });
        return false;
    });
    
    $('#room-form [name=type]').change(function(){
        if($('#room-form [name=type]:checked').val() == '2'){
            $('#room-form [name=periodTime]').parent().show();
        }else{
            $('#room-form [name=periodTime]').parent().hide();
        }
    });

    socket.emit('fetch rooms');
});
