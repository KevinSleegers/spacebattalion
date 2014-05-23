/* ~~~~~~~ WIDTH AND HEIGHT ~~~~~~~ */
var w = window.innerWidth * window.devicePixelRatio,
    h = window.innerHeight * window.devicePixelRatio;

/* ~~~~~~~ NEW GAME ~~~~~~~ */
var game = new Phaser.Game(w, h, Phaser.AUTO, '', {
	preload: preload,
	create: create,
	update: update,
    render: render
});

/* ~~~~~~~ PRELOAD FUNCTION ~~~~~~~ */
function preload() {
	game.load.spritesheet('player', 'assets/img/spr_myplane_strip2.png', 64, 64);
	game.load.spritesheet('otherPlayers', 'assets/img/spr_plane_strip2.png', 64, 64);
	game.load.spritesheet('boss', 'assets/img/spr_boss_strip3.png', 128, 256);
	game.load.spritesheet('coop', 'assets/img/spr_double_final_strip4.png', 96, 128);
    //game.load.image('player', 'assets/img/spr_myplane.png');
    //game.load.image('otherPlayers', 'assets/img/spr_plane.png');
    //game.load.image('coop', 'assets/img/spr_doublePlane.png');
	//game.load.image('boss', 'assets/img/spr_boss.png');
	game.load.image('bullet', 'assets/img/spr_bullet.png');
	game.load.image('explosion', 'assets/img/spr_explosion.png');
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

/* ~~~~~~~ VARIABLE DECLERATION ~~~~~~~ */
var io = io.connect('', { rememberTransport: false, transports: ['WebSocket', 'Flash Socket', 'AJAX long-polling']}), 
    player, 
    boss, 
    players = {}, 
    coopPlayers = {},
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
    backgroundMusic,

    latitude,
    longitude,
    range = 500,

    coop,
    coopMovement = false,
    coopShooting = false
    ;

/* ~~~~~~~ CREATE GAME ~~~~~~~ */
function create() {
    // Keep game running, even if out of focus
    this.stage.disableVisibilityChange = true;

    game.renderer.clearBeforeRender = false;
    game.renderer.roundPixels = true;
    game.physics.startSystem(Phaser.Physics.ARCADE);    
    game.world.setBounds(0, 0, 2000, 2000);

    // Background
    bgtile = game.add.tileSprite(0, 0, 2000, 2000, 'mainBg');

    // Haal locatie gegevens op
    getLocation();

    // Refreshen van locatie wordt bepaald door browser dus haal op uit local storage
    if(localStorage.getItem('latitude') !== null && localStorage.getItem('longitude') !== null) {
    	latitude = localStorage.getItem('latitude');
    	longitude = localStorage.getItem('longitude');
    }

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
    if(!playerName) {
    	playerName = randName();
    }
    console.log(currentDate() + " | Welcome: " + playerName.charAt(0).toUpperCase() + playerName.substring(1) + ", your session is: " + io.socket.sessionid + ".");
    // playerName = randName();

    // Initialize sound effects
    backgroundMusic = game.add.audio('backgroundMusic');
    //backgroundMusic.play('', 0, 1, true); // loop background music
    //playerBullet = game.add.audio('playerBullet');

    // Create player group
    playerGroup = game.add.group();
    //playerGroup.sort('y', Phaser.Group.SORT_ASCENDING);

    // Create new player sprite
	player = game.add.sprite(game.world.centerX, game.world.centerY, 'player');
	player.anchor.setTo(.5,.5);
	player.name = io.socket.sessionid;
	player.allowControls = true;
	player.latitude = latitude;
	player.longitude = longitude;
	player.coop = false;
	player.move = true;
	player.shoot = true;
	player.health = 100;
	player.frame = 1;

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
        if(Object.getOwnPropertyNames(data).length === 0) {
        	console.log(currentDate() + ' | There are no other players online.');
        } else {
        	console.log(currentDate() + ' | There are other players online.');
        	// Check which players are in co-op mode
        	socket.emit('getCoopPlayers', io.socket.sessionid);
        }

        for(var onlinePlayer in data) {
        	if(data[onlinePlayer].session.length <= 20) {
        		console.log('Creating player', data[onlinePlayer].session);
            	newPlayer(data[onlinePlayer]);
            	//onlinePlayers.push(data[onlinePlayer].nickname);
            }
            onlinePlayers.push(data[onlinePlayer].session);
        }
        //console.log(currentDate() + " | Online players: " + onlinePlayers.toString());
        textOnlinePlayers.setText("Online Players:\nYou (" + playerName + ")\n" + onlinePlayers.join("\n"));
    });

    // Get already online coop players
    socket.on('onlineCoop', function(data) {
    	for (var onlineCoop in data) {
    		var player1 = data[onlineCoop].player1;    		
    		var player2 = data[onlineCoop].player2;
    		var shooter = data[onlineCoop].shoot;
    		var mover = data[onlineCoop].move;
    		var session = data[onlineCoop].session;

    		if(player1 !== io.socket.sessionid && player2 !== io.socket.sessionid) {

    			newCoop(player2, player1, shooter, mover, session, 'other');

    		}
    	}
    	console.log('Online coop-players', data);
    });

    // Send new player data to server
    var playerData = JSON.stringify({
        sessionid : io.socket.sessionid,
        nickname : playerName,
        x : game.world.centerX,
        y : game.world.centerY,
        lat : latitude,
        long : longitude
    });
    socket.emit('newPlayer', playerData);

    // Get new player
    socket.on('sendNewPlayer', function(data) {
        console.log(currentDate() + " | Player: " + data.nickname.charAt(0).toUpperCase() + data.nickname.substring(1) + " has joined the game!");
        newPlayer(data);
        console.log('new player added', data.lat);
        onlinePlayers.push(data.session);
        textOnlinePlayers.setText("Online Players:\nYou (" + playerName + ")\n" + onlinePlayers.join("\n"));
    });

    // Other player requests to coop
    socket.on('joinCoop', function(data) {

    	var obj = JSON.parse(data);
    	var player1 = obj.player1;
    	var player2 = obj.player2;
    	var mover = obj.move;
    	var shooter = obj.shoot;

    	newCoop(player1, player2, mover, shooter, 'join');
    });

    // Get players who are not in co-op mode
    socket.on('notCoop', function(data) {
    	for(var notCoopPlayer in data) {
    		compareGPS(data[notCoopPlayer].lat, data[notCoopPlayer].long, data[notCoopPlayer].session);
    	}
    });

    // Update player
    socket.on('updatePlayer', function(data) {
        updatePlayer(data);
    });

    // Damage player
    socket.on('playerShot', function(data) {
    	if(data === io.socket.sessionid) {
    		player.damage(10);

    		if(player.health === 0) {
    			game.world.removeAll();
    			game.stage.backgroundColor = '#ff0000';
    			alert('YOU DIED, GAME OVER');
				
				var emitter = game.add.emitter(player.x, player.y, 250);

				emitter.makeParticles('explosion');
				emitter.minParticleSpeed.setTo(-300, -300);

				emitter.maxParticleSpeed.setTo(300, 300);

				//  By setting the min and max rotation to zero, you disable rotation on the particles fully

				emitter.minRotation = 0;
				emitter.maxRotation = 0;

				emitter.start(true, 4000, null, 15);				

    			socket.emit('playerDied', io.socket.sessionid);
    		}
    	}
    	// data.length > 20 dan is het een coop speler
    	else if(data.length > 20) {
    		coopPlayers[data].damage(10);

    		var currFrame = coopPlayers[data].frame;

		    coopPlayers[data].frame = 0;

			setTimeout(function() {
		    	coopPlayers[data].frame = currFrame;
			}, 100);

			if(coopPlayers[data].health === 0) {				
    			game.world.removeAll();
    			game.stage.backgroundColor = '#ff0000';
    			alert('YOU AND YOUR PAL DIED, GAME OVER');
			}
    	} else {
    		players[data].damage(10);
    	}
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
    boss.frame = 2;

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
    otherBullets.setAll('static', true);
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
                        changePosition('-', o.x * 20, '+', o.y * 20, game.math.wrapAngle(anglePlayer, false), 'p');
                    } else {
                        changePosition('', '', '', '', 0, 'p');
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
                    changePosition('-', x * 40, '+', y * 40, game.math.wrapAngle(anglePlayer, false), 'p');
                } else {
                    changePosition('', '', '', '', 0, 'p');
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
	// Ga na welke coopspeler je bent, andere waardes kan ik hier niet aan.. dus dan maar zo
    if(Object.getOwnPropertyNames(coopPlayers).length !== 0) {
	    Object.keys(coopPlayers).forEach(function(key) {
	        if(key.indexOf(io.socket.sessionid) > -1) {
	        	coopPlayers[key].body.velocity.setTo(0,0);
	        }
	    });
	} else {
		player.body.velocity.setTo(0,0);
	}

	if(typeof player !== "undefined") {
		player.body.velocity.setTo(0,0);		
	}

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

    	if(player.visible === true || typeof player !== "undefined") {
    		var currentSprite = 'p';
    		movementSpeed = 350;
    	} else {
    		var currentSprite = 'c';
    		movementSpeed = 175;
    	}

    	if(typeof player !== "undefined" && player.move === true || coopMovement === true) {
    		// Ga na welke coopspeler je bent, andere waardes kan ik hier niet aan.. dus dan maar zo
        	Object.keys(coopPlayers).forEach(function(key) {
        		if(key.indexOf(io.socket.sessionid) > -1) {
        			currentSprite = key;
        		}
        	});

	        if(cursors.left.isDown) {   

	            if(cursors.left.isDown && cursors.down.isDown) {
	                changePosition('-', diagonalSpeed(movementSpeed), '+', diagonalSpeed(movementSpeed), 135, currentSprite);
	            }
	            else if(cursors.left.isDown && cursors.up.isDown) {  
	                changePosition('-', diagonalSpeed(movementSpeed), '-', diagonalSpeed(movementSpeed), -135, currentSprite);
	            }
	            else {
	                changePosition('-', movementSpeed, '', '', 180, currentSprite);
	            }
	        }
	        else if(cursors.right.isDown) {
	            if(cursors.right.isDown && cursors.down.isDown) {
	                changePosition('+', diagonalSpeed(movementSpeed), '+', diagonalSpeed(movementSpeed), 45, currentSprite);
	            }   
	            else if(cursors.right.isDown && cursors.up.isDown) {  
	                changePosition('+', diagonalSpeed(movementSpeed), '-', diagonalSpeed(movementSpeed), -45, currentSprite);         
	            }   
	            else {  
	                changePosition('+', movementSpeed, '', '', 0, currentSprite);
	            }
	        }
	        else if(cursors.up.isDown) {
	            changePosition('', '', '-', movementSpeed, -90, currentSprite);
	        }
	        else if(cursors.down.isDown) {
	            changePosition('', '', '+', movementSpeed, 90, currentSprite);
	        }
    	}

    	if(typeof player !== "undefined" && player.shoot === true || coopShooting === true) {
        // Check if coop exists, and if coop is allowed to move (if yes then disallow shooting)
        	if(game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR).isDown) {
	            fire();
	        }
        }    

        // Collisions
        game.physics.arcade.overlap(bullets, boss, bulletCollisionWithBoss, null, this);

        // Create collision detection for all players
        for(var plr in players) {
        	// your bullets hit other players
        	if(player.coop === false) {
            	game.physics.arcade.overlap(bullets, players[plr], bulletCollisionWithPlayer, null, this);
            }

            // other bullets hit you
            game.physics.arcade.overlap(otherBullets, player, otherBulletCollisionWithPlayer, null, this);
        }

        // Create collision detection for all co-op players
        for(var plr in coopPlayers) {
        	// your bullets hit co-op player
        	game.physics.arcade.overlap(bullets, coopPlayers[plr], bulletCollisionWithCoop, null, this);
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
            game.physics.arcade.velocityFromRotation(bullet.rotation += (Math.random() * (-0.100 - 0.100) + 0.100), 625, bullet.body.velocity);
			bulletTime = game.time.now + 250;

			console.log(currentDate() + ' | Bullet has been fired on sender client');
			
			bullet.y += Math.floor((Math.random() * 40) + -20);
			muzzleFlash = game.add.sprite(bullet.x + 10, bullet.y, 'muzzleFlash');
			muzzleFlash.anchor.setTo(0.5, 0.5);

			muzzleFlash.alpha = 0;
			game.add.tween(muzzleFlash).to( { alpha: 1 }, 100, Phaser.Easing.Linear.None, true, 0, 100, true);
			
			setTimeout(function() {
				muzzleFlash.destroy();
	        }, 100);
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
    players[plr.session].frame = 1;

    // Sla gps locatie van speler op (om na te gaan of iemand anders in de buurt is)
    players[plr.session].latitude = plr.lat;
    players[plr.session].longitude = plr.long;
    players[plr.session].coop = false;
    players[plr.session].coopPlayer = '';

    // Ga na of speler in co-op mode is, zo ja 'hide' deze speler dan
    if(typeof plr.coop !== "undefined" && plr.coop === true) {
    	players[plr.session].visible = false;
    }

    // Vergelijk locatie van nieuwe speler met jou
    //compareGPS(players[plr.session].latitude, players[plr.session].longitude, players[plr.session].name);

    playerGroup.add(players[plr.session]);
}

function updatePlayer(plr) {
    // updated player variables
    var playerSession = plr.session;
    var playerNick = plr.nickname;
    var newPlayerX = plr.x;
    var newPlayerY = plr.y;
	var newPlayerAngle = plr.angle;

	if(playerNick === 'coop') {
		coopPlayers[plr.session].x = plr.x;
		coopPlayers[plr.session].y = plr.y;
		coopPlayers[plr.session].angle = plr.angle;
	} else {
    	// change position of player
    	players[plr.session].x = plr.x;
    	players[plr.session].y = plr.y;	
		players[plr.session].angle = plr.angle;
	}
}

function removePlayer(plr) {
    var playerSession = plr;
	
	if (playerSession !== io.socket.sessionid) {
	   	players[playerSession].kill();
	}

	// Check if player who disconnected was in coop mode
    if(Object.getOwnPropertyNames(coopPlayers).length !== 0) {
	    Object.keys(coopPlayers).forEach(function(key) {
		    if(key.indexOf(io.socket.sessionid) > -1) {

		       	coopPlayers[key].kill();
		       	player.visible = true;
		       	player.allowControls = true;
		       	player.move = true;
		       	player.shoot = true;
		       	game.camera.follow(player);

		       	coopMovement = false;

		       	player.coop = false;

		       	Object.keys(coopPlayers).forEach(function(key2) {
        			if(key2.indexOf(key) > -1) {
        				delete coopPlayers[key];
        			}
        		});
		   	}
		});
	}
}

function newBullet(blt) {
	console.log(currentDate() + ' | Bullet has been fired on OTHER client');

    otherBullets.createMultiple(1, 'bullet');
    otherBullet = otherBullets.getFirstExists(false);
    
    if(otherBullet) {
        otherBullet.reset(blt.x, blt.y);
        otherBullet.rotation = blt.rotation;
        game.physics.arcade.velocityFromRotation(blt.rotation, 520, otherBullet.body.velocity);

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
function changePosition(xVal, xSpeed, yVal, ySpeed, angleVal, spriteVal) {
	// Bug.. op de één of andere manier werkt spriteVal.body.velocity.x enz niet, vandaar de if-else constructie

	if(spriteVal === 'p') {
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
	} else {		
		xSpeed == '' ? xSpeed = 0 : xSpeed;
	    ySpeed == '' ? ySpeed = 0 : ySpeed;

	    if(xVal == '+') { coopPlayers[spriteVal].body.velocity.x += xSpeed; } 
	    else if(xVal == '-') { coopPlayers[spriteVal].body.velocity.x -= xSpeed; } 
	    else { coopPlayers[spriteVal].body.velocity.x += 0; }

	    if(yVal == '+') { coopPlayers[spriteVal].body.velocity.y += ySpeed; } 
	    else if(yVal == '-') { coopPlayers[spriteVal].body.velocity.y -= ySpeed; } 
	    else { coopPlayers[spriteVal].body.velocity.y += 0; }

	    coopPlayers[spriteVal].angle = angleVal;

	    if(oldX !== coopPlayers[spriteVal].x || oldY !== coopPlayers[spriteVal].y) {
	                    
	        var playerPosition = JSON.stringify({
	            sessionid: coopSession,
	            nickname: 'coop',
	            x : coopPlayers[spriteVal].x,
	            y : coopPlayers[spriteVal].y,
	            angle : coopPlayers[spriteVal].angle
	        });   

	        // Check if difference between x or y values is larger than 1
	        if(diffNumbers(coopPlayers[spriteVal].x, oldX) >= 1 || diffNumbers(coopPlayers[spriteVal].y, oldY) >= 1 ) {
	            
	            // Send positions to server every 200 ms (0.2 seconds)
	            /*setTimeout(function() {
	                socket.emit('positionChange', playerPosition);
	            }, 200);*/
	            
	            // Emit new position immediately, without delay
	            socket.emit('positionChange', playerPosition);

	            // store the old positions in oldX and oldY
	            oldX = coopPlayers[spriteVal].x;
	            oldY = coopPlayers[spriteVal].y;
	        }
	    }
	}

    
}

function bulletCollisionWithBoss(plr, blt)
{
    bullet.destroy();  

    // damage done to boss (boss.health - boss.damage)
    boss.damage(100);

    boss.frame = 0;
	
	if(boss.health <= 0)
	{
		var emitter = game.add.emitter(boss.x, boss.y, 750);

		emitter.makeParticles('explosion');
		emitter.minParticleSpeed.setTo(-400, -400);

		emitter.maxParticleSpeed.setTo(400, 400);

		//  By setting the min and max rotation to zero, you disable rotation on the particles fully

		emitter.minRotation = 0;
		emitter.maxRotation = 0;

		emitter.start(true, 7000, null, 15);
	}

	setTimeout(function() {
    	boss.frame = 2;
	}, 100);
}

function otherBulletCollisionWithBoss(plr, blt)
{
    otherBullet.destroy();  

    // damage done to boss (boss.health - boss.damage)
    boss.damage(100);

    boss.frame = 0;

	setTimeout(function() {
    	boss.frame = 2;
	}, 100);
}

function bulletCollisionWithPlayer(plr, blt) {

	console.log(currentDate() + ' | Bullet hit player');

    bullet.destroy();

    var damagedPlayer = players[plr.name].name;
    socket.emit('damagePlayer', damagedPlayer);
	
	console.log(currentDate() + ' | other player got hit!', damagedPlayer);

    players[plr.name].damage(10);

    players[plr.name].frame = 0;

    setTimeout(function() {
    	players[plr.name].frame = 1;
	}, 100);
}

function bulletCollisionWithCoop(plr, blt) {

	// if niet jezelf
	if(Object.getOwnPropertyNames(coopPlayers).length !== 0) {
	    Object.keys(coopPlayers).forEach(function(key) {
	        if(key.indexOf(io.socket.sessionid) > -1) {
	        	console.log('je hit jezelf maat');
	        }
	    });
	} else {
	    bullet.destroy();

	    var damagedPlayer = coopPlayers[plr.name].name;
	    socket.emit('damagePlayer', damagedPlayer);
		
		console.log('other player got hit!', damagedPlayer);

	    coopPlayers[plr.name].damage(10);

	    coopPlayers[plr.name].frame = 0;

	    setTimeout(function() {
	    	coopPlayers[plr.name].frame = 3;
		}, 100);
	}
}

function otherBulletCollisionWithPlayer(plr, blt) {


	console.log(currentDate() + ' | Other Bullet hit player');

    otherBullet.destroy();

	player.frame = 2;

    setTimeout(function() {
    	player.frame = 1;
	}, 100);
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

// Function gets called if screen is resized.
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

/* ~~~~~~~ CO-OP FUNCTIONS ~~~~~~~ */

// Create new Co-op	
function newCoop(player1, player2, shoot, move, type) {
	if(type == 'join') {
		console.log(currentDate() + ' | I am now in co-op mode with ' + player2 + '.');
	}

	if(type == 'new') {
		coopSession = player1 + player2;
	}
	else {
		coopSession = player2 + player1;
	}

	coopPlayers[coopSession] = game.add.sprite(game.world.centerX, game.world.centerY, 'coop');
	coopPlayers[coopSession].name = coopSession;
	coopPlayers[coopSession].player1 = player1;
	coopPlayers[coopSession].player2 = player2;
	coopPlayers[coopSession].coopSession = coopSession;
	coopPlayers[coopSession].move = move;
	coopPlayers[coopSession].shoot = shoot;
	coopPlayers[coopSession].anchor.setTo(.5, .5);
	coopPlayers[coopSession].enableBody = true;
	game.physics.enable(coopPlayers[coopSession], Phaser.Physics.ARCADE);
	coopPlayers[coopSession].physicsBodyType = Phaser.Physics.ARCADE;
	coopPlayers[coopSession].health = 250;
	coopPlayers[coopSession].frame = 3;
	coopPlayers[coopSession].body.collideWorldBounds = true;
  
	if(coopPlayers[coopSession].move == io.socket.sessionid) {
		console.log(currentDate() + " | You may move, good sir.");
		textPlayer.setText('COOP MODE (move)');
		coopPlayers[coopSession].frame = 2;
		coopMovement = true;
		coopShooting = false;
	} else if (coopPlayers[coopSession].shoot == io.socket.sessionid) {
		console.log(currentDate() + " | You may shoot, good sir.");
		textPlayer.setText('COOP MODE (shoot)');
		coopPlayers[coopSession].frame = 1;
		coopShooting = true;
		coopMovement = false;
	}

	if(player1 == io.socket.sessionid) {
		player.coop = true;
		player.visible = false;
		player.renderable = false;
		player.allowControls = false;
		player.move = false;
		player.shoot = false;

		players[player2].visible = false;
		players[player2].coop = true;

		game.camera.follow(coopPlayers[coopSession]);
	} else if (player2 == io.socket.sessionid) {
		player.coop = true;
		player.visible = false;
		player.renderable = false;
		player.allowControls = false;
		player.move = false;
		player.shoot = false;

		players[player1].visible = false;
		players[player1].coop = true;

		game.camera.follow(coopPlayers[coopSession]);
	} else {
		console.log('tot hier komt ie');

		players[player1].visible = false;
		players[player1].coop = true;
		players[player1].renderable = false;

		players[player2].visible = false;
		players[player2].coop = true;
		players[player2].renderable = false;

		console.log(players[player1].visible);
		console.log(players[player2].visible);
	}

	if(type === 'new') {
		// Draai alles om, omdat player 1 dan de andere speler is..
		var coopData = JSON.stringify({
	        player1 : player2,
	        player2 : player1,
	        move : player2,
	        shoot : player1
	    });
		socket.emit('newCoop', coopData);
	}
}

// Function to compare location of yourself to other Player
// Decides to create newCoop if distance within range
function compareGPS(playerLat, playerLong, playerSession) {	
	// distance between you and other player in kilometers
	var dist = distance(player.latitude, player.longitude, playerLat, playerLong, "k");
	
	// distance in meters
	dist = dist * 1000;

	console.log('latitude', playerLat, 'longitude', playerLong, 'session', playerSession, 'distance', dist);

	// check if distance is within given range
	if(dist <= range && !isNaN(dist)) {
		// Coop both players (if other player is not you!)
		if(playerSession != io.socket.sessionid) {
			//console.log('Distance between YOU and ' + playerSession + ' is: ' + dist.toString() + ' meters.');
			if(player.coop === false && players[playerSession].coop === false) {
				//console.log('oke, maak maar coop van');
				newCoop(player.name, players[playerSession].name, players[playerSession].name, player.name, 'new');
			}
		} 
	} else {
		//console.log('Distance between YOU and ' + players[playerSession].name + ' (' + dist + ') is greater than the given range (' + range + ').');
	}
}

/* ~~~~~~~ GEOLOCATION FUNCTIONS ~~~~~~~ */
// Check if user's browser supports geolocation
function getLocation() {
	if(navigator.geolocation) {
		// navigator.geolocation.getCurrentPosition(foundPosition);
		navigator.geolocation.watchPosition(foundPosition);
	} else {
		console.log('GPS wordt niet ondersteund door uw device.');
	}
}

// Get exact location of user if geolocation is supported
// Just used to store the latitude and longitude of player at the moment
function foundPosition(position) {
	latitude = position.coords.latitude;
	longitude = position.coords.longitude;

	// Store variables in localStorage, so they can be accessed later on (NODIG?)
	localStorage.setItem('latitude', latitude);
	localStorage.setItem('longitude', longitude);

	// get google maps location details.
	var googleMapsURL = 'http://maps.googleapis.com/maps/api/geocode/json?latlng=' + latitude + ',' + longitude + '&sensor=false';

	$.ajax({
		url: googleMapsURL,
		type: "GET",
		dataType: "JSON",
		success: function(data) {
			var straat = data["results"][0]["address_components"][1]["long_name"];
			var plaats = data["results"][0]["address_components"][2]["long_name"];
		},
		error: function(error) {
			alert(error);
		}
	});
}

// Function to calculate distance between two players.
// source : http://www.geodatasource.com/developers/javascript
function distance(lat1, lon1, lat2, lon2, unit) {
    var radlat1 = Math.PI * lat1/180;
    var radlat2 = Math.PI * lat2/180;
    var radlon1 = Math.PI * lon1/180;
    var radlon2 = Math.PI * lon2/180;

    var theta = lon1-lon2;

    var radtheta = Math.PI * theta/180;

    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist);
    dist = dist * 180/Math.PI;
    dist = dist * 60 * 1.1515;

    if (unit=="K") { dist = dist * 1.609344 };
    if (unit=="N") { dist = dist * 0.8684 };
    return dist;
}



function render() {
	/*for(var player in players) {
		game.debug.spriteInfo(players[player], 32, 32);
	}*/
}