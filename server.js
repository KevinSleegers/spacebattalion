var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io', { rememberTransport: false, transports: ['WebSocket', 'Flash Socket', 'AJAX long-polling'] }).listen(server),
    players = {},
    bullets = {};

server.listen(3000);

app.use(express.static(__dirname + '/'));

app.get('/', function(req, res){
    res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function(socket){
    
    var ip_address = socket.handshake.address.address;
    var remote_address = socket.handshake.address.remoteAddress;
    
    console.log('ip address: ', ip_address);
    console.log('remote ip: ', remote_address);
    
    // 1. Send already online players to client who requested the players data
    socket.on('requestPlayers', function(data) {    
        console.log(data);    
        io.sockets.socket(data).emit('onlinePlayer', players);
    });

    // Get new player from client
    socket.on('newPlayer', function(data) {
        var obj = JSON.parse(data);

        // Save data in variables
        var player_session = obj.sessionid;
        var player_nick = obj.nickname;
        var player_x = obj.x;
        var player_y = obj.y;

        // Save details in 'player' object
        var player = {};
        player.session = player_session;
        player.nickname = player_nick;
        player.x = player_x;
        player.y = player_y;

        // Add player to 'players' array
        players[player.session] = player;

        // Send new player to other clients
        socket.broadcast.emit('sendNewPlayer', players[player.session]);
    });      
    
    // Get updated position of player            
    socket.on('newPos', function(data) {  
        newPlayer(data);
    });

    socket.on('positionChange', function(data) {        
        var obj = JSON.parse(data);

        // Sla data op in tijdelijke variabelen
        var player_session = obj.sessionid;
        var player_nick = obj.nickname;
        var player_x = obj.x;
        var player_y = obj.y;
		var player_angle = obj.angle;

        var player = {};
        player.session = player_session;
        player.nickname = player_nick;
        player.x = player_x;
        player.y = player_y;
		player.angle = player_angle;

        players[player.session] = player;
        
        socket.broadcast.emit('updatePlayer', players[player.session]);
    });

    socket.on('bulletChange', function(data) {
    
        var obj = JSON.parse(data);
        
        var bullet = {};
        bullet.session =  obj.sessionid;
        bullet.nickname = obj.nickname;
        bullet.x = obj.x;
        bullet.y = obj.y;
        bullet.rotation = obj.rotation;
        
        bullets[bullet.session] = bullet;
        
        socket.broadcast.emit('newBullet', bullets[bullet.session]);
        
    });

    socket.on('disconnect', function() {
        // delete player from array of 'players'
        delete players[socket.id];

        // delete player from other clients
        socket.broadcast.emit('removePlayer', socket.id);
		
		console.log('player deleted: ', socket.id);
    });

    function newPlayer(data) {
        var obj = JSON.parse(data);

        var player = {};
        player.sessionID = obj.player;
        player.x = obj.x;
        player.y = obj.y;
        player.angle = obj.angle;

        players[player.sessionID] = player;

        socket.broadcast.emit('updatePos', players);
    }
});