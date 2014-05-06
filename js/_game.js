var game = new Phaser.Game(window.innerWidth, window.innerHeight, Phaser.AUTO, '', {
	preload: preload,
	create: create,
	update: update,
    render: render
});

function preload() {
	game.load.spritesheet('player', 'img/ally_sprite.png', 64, 64);
	game.load.image('boss', 'img/boss.png');
	game.load.image('bullet', 'img/bullet.png');

    game.load.audio('background', 'audio/test.wav');
}

var player, players = [], speler = {}, playerName, boss, cursors, x, y, z, xTouch, yTouch, fireButton, bullets, bulletTime = 50, text, textPlayer, bulletsCount = 30;
var options = {'sync disconnect on unload': true};
var io = io.connect('http://192.168.30.1:3000', options);

function create() {

    // Get nickname from player
    playerName = prompt("What's your battle name?");

    game.renderer.clearBeforeRender = false;
    game.renderer.roundPixels = true;

	game.physics.startSystem(Phaser.Physics.ARCADE);

    // Play background music
    game.add.audio('background').play();

    // Create new player sprite
	player = game.add.sprite(game.world.centerX, game.world.centerY, 'player');
	player.anchor.setTo(.5,.5);
	player.animations.add('fly'); 
	player.animations.play('fly', 10, true);
	game.physics.enable(player, Phaser.Physics.ARCADE);

	player.enableBody = true;
	player.body.collideWorldBounds = true;

    textPlayer = game.add.text(game.world.centerX, 50, "Player: " + playerName, {
        font: "25px Arial",
        fill: "#f00",
        align: "center"
    });
    textPlayer.anchor.setTo(0.5, 0.5);

    // Request already online players
    socket.emit('requestPlayers', io.socket.sessionid);

    // Get already online players from server
    socket.on('onlinePlayer', function(data) {
        console.log('Online Players: ', data);
        for(var onlinePlayer in data) {
            newPlayer(data[onlinePlayer]);
        }
    });

    // Send new player data to server
    var playerData = JSON.stringify({
        sessionid : io.socket.sessionid,
        nickname : playerName,
        x : game.world.centerX,
        y : game.world.centerY
    });
    socket.emit('newPlayer', playerData);

    // Get new playerq  
    socket.on('sendNewPlayer', function(data) {
        console.log('Nieuwe speler! met data: ', data);
        newPlayer(data);
    });

    // Update player
    socket.on('updatePlayer', function(data) {
        updatePlayer(data);
    });

    // Remove player
    socket.on('removePlayer', function(data) {
        removePlayer(data);
    });

	boss = game.add.sprite(game.centerX, game.centerY, 'boss');
	boss.enableBody = true;
	boss.physicsBodyType = Phaser.Physics.ARCADE;

	bullets = game.add.group();
	bullets.enableBody = true;
    bullets.physicsBodyType = Phaser.Physics.ARCADE;
    bullets.createMultiple(30, 'bullet');
    bullets.setAll('anchor.x', 0.5);
    bullets.setAll('anchor.y', 1);
    bullets.setAll('outOfBoundsKill', true);	

    game.stage.backgroundColor = '#ccc';

    game.input.addPointer();
    fireButton = game.input.pointer1;

    cursors = game.input.keyboard.createCursorKeys();
}

function update() {
	player.body.velocity.setTo(0,0);

    if(!isMobile.any) {

        if(cursors.left.isDown) {
            player.body.velocity.x -= 40;
			player.angle = 180;
            var playerPosition = JSON.stringify({
                sessionid: io.socket.sessionid,
                nickname: playerName,
                x : player.x,
                y : player.y,
                angle : player.angle
            });              
			setTimeout(function() {
				socket.emit('positionChange', playerPosition);
			}, 200);
        }
        else if(cursors.right.isDown) {        
            player.body.velocity.x += 40;
			player.angle = 0;
            var playerPosition = JSON.stringify({
                sessionid: io.socket.sessionid,
                nickname: playerName,
                x : player.x,
                y : player.y,
                angle : player.angle
            });
			setTimeout(function() {
				socket.emit('positionChange', playerPosition);
			}, 200);
        }
        else if(cursors.up.isDown) {
            player.body.velocity.y -= 40;
			player.angle = -90;
            var playerPosition = JSON.stringify({
                sessionid: io.socket.sessionid,
                nickname: playerName,
                x : player.x,
                y : player.y,
                angle : player.angle
            });
			setTimeout(function() {
				socket.emit('positionChange', playerPosition);
			}, 200);
        }
        else if(cursors.down.isDown) {
            player.body.velocity.y += 40;
			player.angle = 90;
            var playerPosition = JSON.stringify({
                sessionid: io.socket.sessionid,
                nickname: playerName,
                x : player.x,
                y : player.y,
                angle : player.angle
            });
			setTimeout(function() {
				socket.emit('positionChange', playerPosition);
			}, 200);
        }

        if(game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR).isDown) {
            fire();
        }        
    }
}

function fire() {
	if(game.time.now > bulletTime) {
		bullet = bullets.getFirstExists(false);

		if(bullet) {
			bullet.reset(player.body.x + 42, player.body.y + 42);
			bullet.rotation = player.rotation;
            game.physics.arcade.velocityFromRotation(player.rotation, 400, bullet.body.velocity);
			bulletTime = game.time.now + 50;

			// Update bullet counter
			bulletsCount --;
			//text.setText("Bullets: " + bulletsCount);
		}
	}
}

function newPlayer(plr) {
    // new player variables
    var newSession = plr.session;
    var newPlayerNick = plr.nickname;
    var newPlayerX = plr.x;
    var newPlayerY = plr.y;

    speler[plr.session] = game.add.sprite(plr.x, plr.y, 'player');

    // configurations for new player
    speler[plr.session].anchor.setTo(.5,.5);
    speler[plr.session].animations.add('fly'); 
    speler[plr.session].animations.play('fly', 10, true);
    game.physics.enable(speler[plr.session], Phaser.Physics.ARCADE);
    speler[plr.session].enableBody = true;
    speler[plr.session].body.collideWorldBounds = true;
}

function updatePlayer(plr) {
    // updated player variables
    var playerSession = plr.session;
    var playerNick = plr.nickname;
    var newPlayerX = plr.x;
    var newPlayerY = plr.y;
	var newPlayerAngle = plr.angle;

    // change position of player
    speler[plr.session].x = plr.x;
    speler[plr.session].y = plr.y;	
	speler[plr.session].angle = plr.angle;
}

function removePlayer(plr) {
    var playerSession = plr;

    speler[playerSession].kill();
}

function collisionHandler (bullet, boss) {
	boss.kill();
	bullet.kill();
	
	if(boss.countLiving() == 0) {
		
	}
}

function render() {
    for(var playerEnzo in speler) {
        game.debug.spriteInfo(speler[playerEnzo], 64, 64);
    }
}