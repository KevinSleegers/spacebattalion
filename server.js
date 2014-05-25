var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io', { rememberTransport: false, transports: ['WebSocket', 'Flash Socket', 'AJAX long-polling'] }).listen(server),
    players = {},
    bullets = {},
    coopPlayers = {};

server.listen(process.env.PORT || 5000);

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
        io.sockets.socket(data).emit('onlinePlayer', players);

        // send to all but 'data'
        io.sockets.socket(data).emit('onlineCoop', coopPlayers);
    });

    // Get new player from client
    socket.on('newPlayer', function(data) {
        var obj = JSON.parse(data);

        // Save data in variables
        var player_session = obj.sessionid;
        var player_nick = obj.nickname;
        var player_x = obj.x;
        var player_y = obj.y;
        var player_lat = obj.lat;
        var player_long = obj.long;
        var player_angle = obj.angle;

        if(typeof player_lat === 'undefined') {
            player_lat = 0;
        }

        if(typeof player_long === 'undefined') {
            player_long = 0;
        }

        // Save details in 'player' object
        var player = {};
        player.session = player_session;
        player.nickname = player_nick;
        player.x = player_x;
        player.y = player_y;
        player.angle = player_angle;
        player.lat = player_lat;
        player.long = player_long;

        // Add player to 'players' array
        players[player.session] = player;

        // Send new player to other clients
        socket.broadcast.emit('sendNewPlayer', players[player.session]);
    });      

    socket.on('newCoop', function(data) {
        var obj = JSON.parse(data);

        var player1 = obj.player1;
        var player2 = obj.player2;
        var session = player1 + player2;
        var shoot = obj.shoot;
        var move = obj.move;

        var coop = {};
        coop.session = session;
        coop.player2 = player1;
        coop.player1 = player2;
        coop.shoot = shoot;
        coop.move = move;

        coopPlayers[coop.session] = coop;

        // Set players to coop = true (so new clients don't see these players)
        players[player1].coop = true;
        players[player2].coop = true;

        // players[player1].session = session;
        // players[player1].player2 = player1;        
        // players[player1].player1 = player2;
        // players[player1].shoot = shoot;
        // players[player1].move = move;

        // Send to other co-op player
        socket.broadcast.emit('joinCoop', data);
        //io.sockets.socket(player1).emit('joinCoop', data);
    });

    socket.on('getCoopPlayers', function(data) {
        var coopPlrs = {};
        for(var player in players) {
            // player = sessionid
            //console.log('Ik ben online', player);

            if(Object.getOwnPropertyNames(coopPlayers).length !== 0) {
                Object.keys(coopPlayers).forEach(function(key) {
                    if(key.indexOf(player) > -1) {
                        // Al in coop mode, dus skip
                        console.log('IS IN COOP MODE', player);
                    }
                    else {
                        console.log('not in coop mode', player);
                        // Nog niet in coop mode
                        coopPlrs[player] = players[player];
                        //io.sockets.socket(data).emit('newCoop', 'new');
                    }
                });
            } else {
                // coopPlayers object is empty
                coopPlrs[player] = players[player];
            }
        }

        console.log('alle NIET coop players', coopPlrs);

        if(Object.getOwnPropertyNames(coopPlrs).length !== 0) {
            // Send players who are NOT YET in coop mode to clientside.
            io.sockets.socket(data).emit('notCoop', coopPlrs);
        }
    });
    
    // Get updated position of player            
    socket.on('newPos', function(data) {  
        newPlayer(data);
    });

    socket.on('damagePlayer', function(data) {
        // Send to all clients (including sender)
        socket.broadcast.emit('playerShot', data);
    });

    socket.on('bossDied', function(data) {
        socket.broadcast.emit('bossDead', data);
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
        bullet.resetX = obj.resetX;
        bullet.resetY = obj.resetY;
        bullet.bulletY = obj.bulletY;
        bullet.rotation = obj.rotation;
        bullet.randVelocity = obj.randVelocity;
        
        bullets[bullet.session] = bullet;
        
        //socket.broadcast.emit('newBullet', bullets[bullet.session]);
        io.sockets.emit('newBullet', bullets[bullet.session]);
    });

    socket.on('playerDied', function(data) {
        delete players[data];

        console.log('Removed dead player: ', data);
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