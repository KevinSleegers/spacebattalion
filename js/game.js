// github test

var w = window.innerWidth * window.devicePixelRatio,
    h = window.innerHeight * window.devicePixelRatio;

var game = new Phaser.Game(w, h, Phaser.AUTO, '', {
	preload: preload,
	create: create,
	update: update,
    render: render
});

function preload() {
	//game.load.spritesheet('player', 'img/ally_sprite.png', 64, 64);
    game.load.image('player', 'assets/img/spr_myplane.png');
    game.load.image('otherPlayers', 'assets/img/spr_plane.png');
	game.load.image('boss', 'assets/img/spr_boss.png');
	game.load.image('bullet', 'assets/img/spr_bullet.png');
    game.load.image('muzzleFlash', 'assets/img/spr_muzzleFlash.png');

    // Animated background..
    game.load.spritesheet('mainBg', 'assets/img/spr_backgroundOverlay.png', 160, 160);

    // Cloud sprites
    game.load.image('cloud1', 'assets/img/spr_cloud1.png');
    game.load.image('cloud2', 'assets/img/spr_cloud2.png');

    // Moon sprite
    game.load.image('moon', 'assets/img/spr_moon.png');

    game.load.audio('backgroundMusic', ['assets/audio/TakingFlight.mp3', 'assets/audio/TakingFlight.ogg']);
    //game.load.audio('playerBullet', 'assets/audio/shot.wav');
}

var io = io.connect('', { rememberTransport: false, transports: ['WebSocket', 'Flash Socket', 'AJAX long-polling']}), 
    player, 
    boss, 
    players = {}, 
    playerName, 
    onlinePlayers = [],
    cursors, 
    fireButton, 
    bullets, 
    bulletTime = 0, 
    textBullets, 
    textPlayer, 
    bulletsCount = 100, 
    oldX = 0, 
    oldY = 0, 
    otherBullets, 
    movementSpeed = 350,
    diagonalSpeed,
    vibrate = false,
    shakeScreen = 0,
    bossHealth = 100,
    muzzleFlash,

    playerGroup,

    // Background image variable
    bgtile,

    // Cloud image
    clouds,
    cloudTimer = 0,

    // Moon image
    moon,

    // audio
    playerBullet,
    backgroundMusic
    ;

function create() {
    // Keep game running, even if out of focus
    this.stage.disableVisibilityChange = true;

    game.renderer.clearBeforeRender = false;
    game.renderer.roundPixels = true;
    game.physics.startSystem(Phaser.Physics.ARCADE);    
    game.world.setBounds(0, 0, 2000, 2000);

    // Background
    bgtile = game.add.tileSprite(0, 0, 2000, 2000, 'mainBg');

    clouds = game.add.group();
    clouds.enableBody = true;
    clouds.physicsBodyType = Phaser.Physics.ARCADE;
    clouds.setAll('anchor.x', 0.5);
    clouds.setAll('anchor.y', 0.5);
    clouds.setAll('outOfBoundsKill', true);  

    // Generate 5 clouds to start with.
    for(i = 0; i < 5; i++) {
        createCloud();
    }

    // Create moon
    createMoon();

    // Scaling of game
    game.scale.fullScreenScaleMode = Phaser.ScaleManager.NO_SCALE;
    game.input.onDown.add(goFullscreen, this);
    window.addEventListener('resize', function(event) {
        resizeGame();
        console.log('window has been resized!');
    });

    // Get nickname from player
    playerName = prompt("What's your battle name?");
    console.log(currentDate() + " | Welcome: " + playerName.charAt(0).toUpperCase() + playerName.substring(1) + ".");
    // playerName = randName();

    // Initialize sound effects
    backgroundMusic = game.add.audio('backgroundMusic');
    backgroundMusic.play('', 0, 1, true); // loop background music
    //playerBullet = game.add.audio('playerBullet');

    // Create player group
    playerGroup = game.add.group();
    //playerGroup.sort('y', Phaser.Group.SORT_ASCENDING);

    // Create new player sprite
	player = game.add.sprite(game.world.centerX, game.world.centerY, 'player');
	player.anchor.setTo(.5,.5);
	//player.animations.add('fly'); 
	//player.animations.play('fly', 10, true);
	game.physics.enable(player, Phaser.Physics.ARCADE);

	player.enableBody = true;
	player.body.collideWorldBounds = true;
    player.bringToTop();
    playerGroup.add(player);

    // change player sprite color (new in latest Phaser, just for testing purposes! :-)
    // player.tint = 0x33CC00;

    game.camera.follow(player);

    textPlayer = game.add.text(game.world.centerX, 50, "Player: " + playerName);
    textPlayer.font = 'Press Start 2P';
    textPlayer.fontSize = 15;
    textPlayer.fill = '#f00';
    textPlayer.align = 'center';
    textPlayer.anchor.setTo(0.5, 0.5);
    textPlayer.fixedToCamera = true;

    textBullets = game.add.text(window.screen.availWidth - 150, 50, "Bullets: " + bulletsCount);    
    textBullets.font = 'Press Start 2P';
    textBullets.fontSize = 15;
    textBullets.fill = '#f00';
    textBullets.align = 'left';
    textBullets.anchor.setTo(0.5, 0.5);
    textBullets.fixedToCamera = true;

    textOnlinePlayers = game.add.text(180, 0 + window.screen.availHeight - 200, "Online Players:\nYou (" + playerName + ")");    
    textOnlinePlayers.font = 'Press Start 2P';
    textOnlinePlayers.fontSize = 15;
    textOnlinePlayers.fill = '#f00';
    textOnlinePlayers.align = 'left';
    textOnlinePlayers.anchor.setTo(0.5, 0.5);
    textOnlinePlayers.fixedToCamera = true;

    // Request already online players
    socket.emit('requestPlayers', io.socket.sessionid);

    // Get already online players from server
    socket.on('onlinePlayer', function(data) {
        //console.log('Online Players: ', data.);
        for(var onlinePlayer in data) {
            newPlayer(data[onlinePlayer]);
            onlinePlayers.push(data[onlinePlayer].nickname);
        }
        //console.log(currentDate() + " | Online players: " + onlinePlayers.toString());
        textOnlinePlayers.setText("Online Players:\nYou (" + playerName + ")\n" + onlinePlayers.join("\n"));
    });

    // Send new player data to server
    var playerData = JSON.stringify({
        sessionid : io.socket.sessionid,
        nickname : playerName,
        x : game.world.centerX,
        y : game.world.centerY
    });
    socket.emit('newPlayer', playerData);

    // Get new player
    socket.on('sendNewPlayer', function(data) {
        console.log(currentDate() + " | Player: " + data.nickname.charAt(0).toUpperCase() + data.nickname.substring(1) + " has joined the game!");
        newPlayer(data);

        onlinePlayers.push(data.nickname);
        textOnlinePlayers.setText("Online Players:\nYou (" + playerName + ")\n" + onlinePlayers.join("\n"));
    });

    // Update player
    socket.on('updatePlayer', function(data) {
        updatePlayer(data);
    });

    // Remove player
    socket.on('removePlayer', function(data) {
        console.log('remove', data);

        //console.log(currentDate() + " | Player: " + players[data].name.charAt(0).toUpperCase() + players[data].name.substring(1) + " has left the game!");        
        removePlayer(data);

        var i = onlinePlayers.indexOf(players[data].name);
        if(i != -1) {
            onlinePlayers.splice(i,1);
        }        
        textOnlinePlayers.setText("Online Players:\nYou (" + playerName + ")\n" + onlinePlayers.join("\n"));
    });

    // Spawn bullet
    socket.on('newBullet', function(data) {
        newBullet(data);
    }); 

	boss = game.add.sprite(100, 200, 'boss');
    boss.anchor.setTo(.5, .5);
	boss.enableBody = true;
    game.physics.enable(boss, Phaser.Physics.ARCADE);
    boss.physicsBodyType = Phaser.Physics.ARCADE;
    boss.health = 1000;

	bullets = game.add.group();
	bullets.enableBody = true;
    bullets.physicsBodyType = Phaser.Physics.ARCADE;
    bullets.createMultiple(bulletsCount, 'bullet');
    bullets.setAll('static', true);
    bullets.setAll('anchor.x', 0.5);
    bullets.setAll('anchor.y', 1);
    bullets.setAll('outOfBoundsKill', true);	

    otherBullets = game.add.group();
    otherBullets.enableBody = true;
    otherBullets.physicsBodyType = Phaser.Physics.ARCADE;
    otherBullets.setAll('anchor.x', 0.5);
    otherBullets.setAll('anchor.y', 0.5);
    otherBullets.setAll('outOfBoundsKill', true);  

    muzzleFlash = game.add.group();
    muzzleFlash.createMultiple(30, 'muzzleFlash');

    //game.stage.backgroundColor = '#FFF';

    game.input.addPointer();
    fireButton = game.input.pointer1;

    // Set controls if player is not on desktop --> mobile
    if(!game.device.desktop) {

        // Check if mobile browser supports the HTML5 Vibration API
        navigator.vibrate = navigator.vibrate || navigator.webkitVibrate || navigator.mozVibrate || navigator.msVibrate || null;
        navigator.vibrate ? vibrate = true : vibrate = false;

        if(gyro.hasFeature('devicemotion')) {
            console.log(currentDate() + ' | Gyro.js loaded!');

            if(gyro.getFeatures().length > 0) {
                gyro.frequency = 10;

                gyro.startTracking(function(o) {      
                    var anglePlayer = Math.atan2(o.y, o.x);

                    angleRadians = anglePlayer * Math.PI/180;
                    anglePlayer *= 180/Math.PI;
                    anglePlayer = 180 - anglePlayer;

                    if(fireButton.isDown) {
                        fire();
                    }

                    if(o.z < 9.5 || o.z > 10) {
                        changePosition('-', o.x * 20, '+', o.y * 20, game.math.wrapAngle(anglePlayer, false));
                    } else {
                        changePosition('', '', '', '', 0);
                    } 
                });
            }
        }
        else {
            // fallback if gyro.js is not working
            console.log(currentDate() + ' | Gyro.js not loaded!');

            window.addEventListener('devicemotion', function(event) {
                var x = event.accelerationIncludingGravity.x;
                var y = event.accelerationIncludingGravity.y;
                var z = event.accelerationIncludingGravity.z;

                var anglePlayer = Math.atan2(y, x);
                anglePlayer *= 180/Math.PI;
                anglePlayer = 180 - anglePlayer;

                if(fireButton.isDown) {
                    fire();
                }

                if(z < 9.5 || z > 10) {
                    changePosition('-', x * 40, '+', y * 40, game.math.wrapAngle(anglePlayer, false));
                } else {
                    changePosition('', '', '', '', 0);
                }

                var interval = 10;
            });
        }
    }
    else {
		// Player is on desktop, enable cursors for arrow keys..
        cursors = game.input.keyboard.createCursorKeys();
    }
}

function update() {
	player.body.velocity.setTo(0,0);

    // Update background
    bgtile.tilePosition.x -= 1;
    bgtile.tilePosition.y += .5;

    // create clouds
    if(game.time.now > cloudTimer) {          
        createCloud();
    }

    if(moon.x > (game.world.width + moon.width)) {
        // Destroy old moon, and create new one..
        moon.destroy();

        createMoon();
    }

    // move boss
    /*boss.y -= 2;
    if(boss.y < -boss.height) {
        boss.y = game.world.height;
    }*/

    // Check window state
    // This overrides the default because we only want to pause the audio, and not the gameplay.
    if(document.hasFocus()) {
        // play music
        if(game.sound.mute == true) {            
            game.sound.mute = false;
        }
    }
    else {
        // mute music
        if(game.sound.mute == false) {
            game.sound.mute = true;
        }
    }

    if(game.device.desktop) {

        if(cursors.left.isDown) {            
            if(cursors.left.isDown && cursors.down.isDown) {
                changePosition('-', diagonalSpeed(movementSpeed), '+', diagonalSpeed(movementSpeed), 135);
            }
            else if(cursors.left.isDown && cursors.up.isDown) {  
                changePosition('-', diagonalSpeed(movementSpeed), '-', diagonalSpeed(movementSpeed), -135);
            }
            else {
                changePosition('-', movementSpeed, '', '', 180);
            }
        }
        else if(cursors.right.isDown) {
            if(cursors.right.isDown && cursors.down.isDown) {
                changePosition('+', diagonalSpeed(movementSpeed), '+', diagonalSpeed(movementSpeed), 45);
            }   
            else if(cursors.right.isDown && cursors.up.isDown) {  
                changePosition('+', diagonalSpeed(movementSpeed), '-', diagonalSpeed(movementSpeed), -45);         
            }   
            else {  
                changePosition('+', movementSpeed, '', '', 0);
            }
        }
        else if(cursors.up.isDown) {
            changePosition('', '', '-', movementSpeed, -90);
        }
        else if(cursors.down.isDown) {
            changePosition('', '', '+', movementSpeed, 90);
        }

        if(game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR).isDown) {
            fire();
        }        

        // Collisions
        game.physics.arcade.overlap(bullets, boss, bulletCollisionWithBoss, null, this);

        // Create collision detection for all players
        for(var plr in players) {
            game.physics.arcade.overlap(bullets, players[plr], bulletCollisionWithPlayer, null, this);
        }

        game.physics.arcade.overlap(otherBullets, boss, otherBulletCollisionWithBoss, null, this);
    }

    // Screen shake
    if(shakeScreen > 0) {
        var rand1 = game.rnd.integerInRange(-5,5);
        var rand2 = game.rnd.integerInRange(-5,5);

        game.world.setBounds(rand1, rand2, 2000 + rand1, 2000 + rand2);
        shakeScreen--;

        if(shakeScreen == 0) {
            game.world.setBounds(0, 0, 2000, 2000);
        }
    }

    // For debugging purposes, show FPS
    // game.time.advancedTiming = true;
    // console.log('FPS: ', game.time.fps);
}

function fire() {
	if(game.time.now > bulletTime) {
		bullet = bullets.getFirstExists(false);

		if(bullet) {

            if(player.angle == 0 || player.angle == -90 ) {
			    bullet.reset(player.body.x + 38, player.body.y + 38);
            } else {
                bullet.reset(player.body.x + 26, player.body.y + 26);
            }

			bullet.rotation = player.rotation;
            game.physics.arcade.velocityFromRotation(player.rotation, 500, bullet.body.velocity);
			bulletTime = game.time.now + 500;

            // Play shooting sound
            //playerBullet.play();

            // Vibrate phone
            if(vibrate == true) {
                navigator.vibrate(500);
            }

            // Shake screen for n frames
            shakeScreen = 15;

			// Update bullet counter
			bulletsCount --;
			textBullets.setText("Bullets: " + bulletsCount);

            // send position of bullet to server
            var bulletPosition = JSON.stringify({
                sessionid: io.socket.sessionid,
                rotation : bullet.rotation,
                nickname: playerName,
                x : bullet.x,
                y : bullet.y
            });
            
            socket.emit('bulletChange', bulletPosition);
		}
	}
}

function newPlayer(plr) {
    // new player variables
    var newSession = plr.session;
    var newPlayerNick = plr.nickname;
    var newPlayerX = plr.x;
    var newPlayerY = plr.y;

    players[plr.session] = game.add.sprite(plr.x, plr.y, 'otherPlayers');

    // configurations for new player
    players[plr.session].anchor.setTo(.5,.5);
    //players[plr.session].animations.add('fly'); 
    //players[plr.session].animations.play('fly', 10, true);
    game.physics.enable(players[plr.session], Phaser.Physics.ARCADE);
    players[plr.session].enableBody = true;
    players[plr.session].body.collideWorldBounds = true;
    players[plr.session].name = plr.session;
    players[plr.session].health = 100;

    playerGroup.add(players[plr.session]);
}

function updatePlayer(plr) {
    // updated player variables
    var playerSession = plr.session;
    var playerNick = plr.nickname;
    var newPlayerX = plr.x;
    var newPlayerY = plr.y;
	var newPlayerAngle = plr.angle;

    // change position of player
    players[plr.session].x = plr.x;
    players[plr.session].y = plr.y;	
	players[plr.session].angle = plr.angle;
}

function removePlayer(plr) {
    var playerSession = plr;

    players[playerSession].kill();
}

function newBullet(blt) {
    otherBullets.createMultiple(1, 'bullet');
    otherBullet = otherBullets.getFirstExists(false);
    
    if(otherBullet) {
        otherBullet.reset(blt.x, blt.y);
        otherBullet.rotation = blt.rotation;
        game.physics.arcade.velocityFromRotation(blt.rotation, 400, otherBullet.body.velocity);

        // Play bullet sound with lowered volume    
        //playerBullet.play();
        //playerBullet.volume = 0.5;
    }

}

// xVal is positief of negatief
// xSpeed is snelheid van x
// yVal is positief of negatief
// ySpeed is snelheid van y
// angleVal is hoek van player
function changePosition(xVal, xSpeed, yVal, ySpeed, angleVal) {

    xSpeed == '' ? xSpeed = 0 : xSpeed;
    ySpeed == '' ? ySpeed = 0 : ySpeed;

    if(xVal == '+') { player.body.velocity.x += xSpeed; } 
    else if(xVal == '-') { player.body.velocity.x -= xSpeed; } 
    else { player.body.velocity.x += 0; }

    if(yVal == '+') { player.body.velocity.y += ySpeed; } 
    else if(yVal == '-') { player.body.velocity.y -= ySpeed; } 
    else { player.body.velocity.y += 0; }

    player.angle = angleVal;

    if(oldX !== player.x || oldY !== player.y) {
                    
        var playerPosition = JSON.stringify({
            sessionid: io.socket.sessionid,
            nickname: playerName,
            x : player.x,
            y : player.y,
            angle : player.angle
        });   

        // Check if difference between x or y values is larger than 1
        if(diffNumbers(player.x, oldX) >= 1 || diffNumbers(player.y, oldY) >= 1 ) {
            
            // Send positions to server every 200 ms (0.2 seconds)
            /*setTimeout(function() {
                socket.emit('positionChange', playerPosition);
            }, 200);*/
            
            // Emit new position immediately, without delay
            socket.emit('positionChange', playerPosition);

            // store the old positions in oldX and oldY
            oldX = player.x;
            oldY = player.y;
        }
    }
}

function bulletCollisionWithBoss(plr, blt)
{
    bullet.destroy();  

    // damage done to boss (boss.health - boss.damage)
    boss.damage(100);
}

function otherBulletCollisionWithBoss(plr, blt)
{
    otherBullet.destroy();  

    // damage done to boss (boss.health - boss.damage)
    boss.damage(100);
}

function bulletCollisionWithPlayer(plr, blt) {
    bullet.destroy();

    players[plr.name].damage(10);

    if(players[plr.name].health == 0) {
        alert('You have killed player: ' + players[plr.name].name + '!');
    }

    // other player add damage..
}

function diagonalSpeed(speed) {
    var diagonalSpeed = Math.sqrt(Math.pow(speed, 2) * 2) / 2;
    return diagonalSpeed;
}

function createCloud() {
    // random getal tussen 0 en 1
    var randCloud = Math.floor((Math.random() * 10) + 1);

    // random x waarde tussen 800 en 400
    var random = Math.floor(Math.random() * (800 - 400 + 1)) + 400;

    if(randCloud < 5) {
        var cloud = game.add.sprite(-(Math.random() * random), game.world.randomY, 'cloud1');
    } else {
        var cloud = game.add.sprite(-(Math.random() * random), game.world.randomY, 'cloud2');
    }

    cloud.angle = game.rnd.angle();

    game.add.tween(cloud).to({ x: game.width + (1600 + cloud.x) }, 150000, Phaser.Easing.Linear.None, true);
    game.add.tween(cloud).to({ angle: cloud.angle}, 150000, Phaser.Easing.Linear.None, true);

    cloudTimer = game.time.now + 5000;

    clouds.add(cloud);
}

function createMoon() {
    var randY = game.world.randomY;

    // Make sure the moon is always fully within screen (height = 164, round to 300)
    if(randY < 300) {
        // Define new randomY with added height of moon
        randY = randY + 164;
    } else if(randY > 1700) {
        randY = randY - 164;
    } else {
        randY = randY;
    }

    console.log(randY);

    moon = game.add.sprite(-(Math.random() * 400), randY, 'moon');
    moon.angle = game.rnd.angle();

    // Tween angle werkt niet op de 1 of andere manier :o
    //game.add.tween(moon).to({ angle: 180 }, 5000, Phaser.Easing.Linear.None, true);
    game.add.tween(moon).to({ x: game.width + (1600 + moon.x) }, 300000, Phaser.Easing.Linear.None, true);
}

function randName() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 10; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function diffNumbers(a, b) {
    return Math.abs(a - b);
}

function currentDate() {
    var d = new Date(),
    minutes = d.getMinutes().toString().length == 1 ? '0'+d.getMinutes() : d.getMinutes(),
    seconds = d.getSeconds().toString().length == 1 ? '0'+d.getSeconds() : d.getSeconds(),
    hours = d.getHours().toString().length == 1 ? '0'+d.getHours() : d.getHours();
    return d.getDate() + '-' + (d.getMonth()+1) + '-' + d.getFullYear() +' ' + hours + ':' + minutes + ':' + seconds;
}

function goFullscreen() {
    //game.scale.startFullScreen();
}

function resizeGame() {
    var w = window.innerWidth * window.devicePixelRatio,
    h = window.innerHeight * window.devicePixelRatio;

    game.width = w;
    game.height = h;
    game.stage.width = w;
    game.stage.height = h;
    game.scale.width = w;
    game.scale.height = h;

    if(game.renderType === Phaser.WEBGL) {
        game.renderer.resize(w, h);
    } else if (game.renderType === Phaser.CANVAS) {        
        game.renderer.resize(w, h);
        Phaser.Canvas.setSmoothingEnabled(game.context, false);
    }

    game.scale.setSize();
}

function render() {
    //game.debug.soundInfo(backgroundMusic, 100, 100);
}