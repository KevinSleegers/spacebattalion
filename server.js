var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io', { rememberTransport: false, transports: ['WebSocket', 'Flash Socket', 'AJAX long-polling'] }).listen(server),
    players = {},
    bullets = {},
    coopPlayers = {},
    room = '',
    rooms = {},
    maxPlayers = 3;
    skins = {},
    tints = {};

server.listen(process.env.PORT || 5000);

app.use(express.static(__dirname + '/'));

app.get('/', function(req, res){
    res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function(socket){

    /*if(room == '') {
        // maak nieuwe (eerste) room aan, je bent dan ook de eerste player
        room = randName();

        socket.join(room);
        console.log('Nieuwe room is: ' + room);
    } else {
        if(io.sockets.clients(room).length < maxPlayers) {   

            socket.join(room);

            if(io.sockets.clients(room).length == (maxPlayers - 1)) {
                // Socket emit naar iedereen in room, zodat de countdown kan starten
                // io.sockets.in(room).emit('startGame', true);
                socket.broadcast.to(room).emit('startGame', true);
            }

            console.log('Aantal players in Room: ' + io.sockets.clients(room).length);
        } else {
            console.log('Room: ' + room + ' is vol!, nieuwe Room wordt aangemaakt..');

            // maak nieuwe room aan
            room = randName();
            socket.join(room);
        }  
    }*/

    socket.emit('rooms', rooms);
    
    // 1. Send already online players to client who requested the players data
    socket.on('requestPlayers', function(data, i) {    
        var myRoom = i;

        var roomPlayers = {};
        // Haal spelers op uit huidige room
        var roster = io.sockets.clients(i);
        roster.forEach(function(plr) {
            if(plr.session !== socket.id) {
                roomPlayers[plr.session] = players[plr.session];
            }
        });

        //io.sockets.socket(data).emit('onlinePlayer', players);
        io.sockets.socket(socket.id).emit('onlinePlayer', roomPlayers);

        // send to all but 'data'
        //io.sockets.socket(data).emit('onlineCoop', coopPlayers);
    });

    // Get new player from client
    socket.on('newPlayer', function(data, i) {
        var myRoom = i;

        var obj = JSON.parse(data);

        // Save data in variable
        var player_session = obj.sessionid;
        var player_nick = obj.nickname;
        var player_x = obj.x;
        var player_y = obj.y;
        var player_lat = obj.lat;
        var player_long = obj.long;
        var player_angle = obj.angle;
		var isBoss = obj.isboss;

        if(typeof player_lat === 'undefined') {
            player_lat = 0;
        }

        if(typeof player_long === 'undefined') {
            player_long = 0;
        }

        // Save details in 'player' object
        var player = {};
        player.session  = player_session;
        player.nickname = player_nick;
        player.x        = player_x;
        player.y        = player_y;
        player.angle    = player_angle;
        player.lat      = player_lat;
        player.long     = player_long;
		player.boss 	= isBoss;

        // Check if player has chosen a different skin
        if(Object.getOwnPropertyNames(skins).length !== 0) {
            Object.keys(skins).forEach(function(key) {
                if(key.indexOf(obj.sessionid) > -1) {
                    player.skin = skins[obj.sessionid];
                } else {
                    player.skin = 0;
                }
            });
        } else {
            player.skin = 0;
        }

        // Check if player has chosen a different tint
        if(Object.getOwnPropertyNames(tints).length !== 0) {
            Object.keys(tints).forEach(function(key) {
                if(key.indexOf(obj.sessionid) > -1) {
                    player.tint = tints[obj.sessionid];
                } else {
                    player.tint = 0;
                }
            });
        } else {
            player.tint = 0;
        }

        // Add player to 'players' array
        players[player.session] = player;

        // Send new player to other clients
        // socket.broadcast.emit('sendNewPlayer', players[player.session]);
        socket.broadcast.to(myRoom).emit('sendNewPlayer', players[player.session]);
    });      

    socket.on('newCoop', function(data, i) {
        var myRoom = i;
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
        coop.x = obj.x;
        coop.y = obj.y;
        coop.angle = obj.angle;

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
        //socket.broadcast.emit('joinCoop', data);
        socket.broadcast.to(myRoom).emit('joinCoop', data);
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

        if(Object.getOwnPropertyNames(coopPlrs).length !== 0) {
            // Send players who are NOT YET in coop mode to clientside.
            io.sockets.socket(data).emit('notCoop', coopPlrs);
        }
    });

    socket.on('damagePlayer', function(data, i) {
        var myRoom = i;
        // Send to all clients (including sender)
        // io.sockets.emit('playerShot', data);
        io.sockets.in(myRoom).emit('playerShot', data);
    });

    socket.on('bossDied', function(data, i) {
        //socket.broadcast.emit('bossDead', data);
        var myRoom = i;

        io.sockets.in(myRoom).emit('bossDead', data);
    });

    socket.on('positionChange', function(data, i) {        
        var myRoom = i;

        var obj = JSON.parse(data);

        // Sla data op in tijdelijke variabelen
        var player_session = obj.sessionid;
        var player_nick = obj.nickname;
        var player_x = obj.x;
        var player_y = obj.y;
        var player_angle = obj.angle;
		var isBoss = obj.isboss;		

        var player      = {};
        player.session  = player_session;
        player.nickname = player_nick;
        player.x        = player_x;
        player.y        = player_y;
        player.angle    = player_angle;
        player.b    = player_angle;
		player.boss = isBoss;

        // Check if player has chosen a different skin
        if(Object.getOwnPropertyNames(skins).length !== 0) {
            Object.keys(skins).forEach(function(key) {
                if(key.indexOf(obj.sessionid) > -1) {
                    player.skin = skins[obj.sessionid];
                } else {
                    player.skin = 0;
                }
            });
        } else {
            player.skin = 0;
        }

        players[player.session] = player;
        
        //socket.broadcast.emit('updatePlayer', players[player.session]);

        // Broadcast naar alle players in room (behalve jezelf)
        socket.broadcast.to(myRoom).emit('updatePlayer', players[player.session]);
    });

    socket.on('locationUpdate', function(data, i) {
        var myRoom = i;
        var obj = JSON.parse(data);

        if(typeof obj !== 'undefined') {
            if(typeof players[obj.sessionid] !== 'undefined') {
                if(obj.lat !== '') {
                    players[obj.sessionid].lat = obj.lat;
                }

                if(obj.long !== '') {
                    players[obj.sessionid].long = obj.long;
                }

                socket.broadcast.to(myRoom).emit('updatedLocation', players[obj.sessionid]);
                //socket.broadcast.emit('updatedLocation', players[obj.sessionid]);
            }
        }
    });

    socket.on('bulletChange', function(data, i) {
        var myRoom = i;
    
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
        //io.sockets.emit('newBullet', bullets[bullet.session]);
        io.sockets.in(myRoom).emit('newBullet', bullets[bullet.session]);
    });

    socket.on('playerDied', function(data) {
        //delete players[data];

        console.log('Removed dead player: ', data);
    });

    socket.on('playerRevive', function(data, i) {
        var myRoom = i;

        socket.broadcast.to(myRoom).emit('playerAlive', data);
    });

    socket.on('playerMinion', function(data, i) {
        var myRoom = i;
        players[data].minion = true;

        // io.sockets.emit('minionPlayer', data);
        io.sockets.in(myRoom).emit('minionPlayer', data);
    });

    socket.on('newRoom', function(data) {
        var obj = JSON.parse(data);        

        // Voeg nieuwe room toe aan rooms
        var newRoom     = {};
        newRoom.name    = obj.address;
        newRoom.lat     = obj.lat;
        newRoom.lng     = obj.lng;
        newRoom.players = io.sockets.clients(obj.address).length;
        newRoom.max     = maxPlayers;

        rooms[newRoom.name] = newRoom;

        //socket.session = socket.id;
        //socket.join(room);

        //io.sockets.socket(socket.id).emit('joinedRoom', room);

        io.sockets.emit('roomUpdate', rooms);
    });

    socket.on('joinRoom', function(data) {
        if(io.sockets.clients(data).length < maxPlayers) {
            socket.session = socket.id;
            socket.join(data);

            io.sockets.socket(socket.id).emit('joinedRoom', data);

            if(io.sockets.clients(data).length === maxPlayers) {
                console.log('Max Players in room, START GAME');

                // Choose random boss from players in room
                var randNumber = Math.floor(Math.random() * io.sockets.clients(data).length);
                var boss = io.sockets.clients(data)[randNumber].session;
				
				var playerBoss = true;

                io.sockets.in(data).emit('startGame', true, boss);
            }

            rooms[data].players = io.sockets.clients(data).length;

            io.sockets.emit('roomUpdate', rooms);
        } else {
            io.sockets.socket(socket.id).emit('roomFull');
        }
    });

    socket.on('skin', function(data) {
        skins[socket.id] = data;
    });

    socket.on('tint', function(data) {
        tints[socket.id] = data;
    });

    socket.on('disconnect', function() {
        // delete player from array of 'players'
        delete players[socket.id];

        // delete player from other clients
        socket.broadcast.emit('removePlayer', socket.id);
    });

    function randName() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for( var i=0; i < 10; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }

    function isEmpty(obj) {
        for(var prop in obj) {
            if(obj.hasOwnProperty(prop))
                return false;
        }

        return true;
    }
});