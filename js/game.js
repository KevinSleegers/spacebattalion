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

// Google WebFont Loader
WebFontConfig = {
    active: function() { game.time.events.add(Phaser.Timer.SECOND, createText, this); },
    google: {
        families: ['Press Start 2P']
    }
};

/* ~~~~~~~ PRELOAD FUNCTION ~~~~~~~ */
function preload() {
    // Load font
    game.load.script('webfont', '//ajax.googleapis.com/ajax/libs/webfont/1.4.7/webfont.js');

	game.load.spritesheet('player', 'assets/img/spr_plane_strip11.png', 64, 64);
	game.load.spritesheet('otherPlayers', 'assets/img/spr_plane_strip2.png', 64, 64);
	game.load.spritesheet('boss', 'assets/img/spr_boss_die_strip13.png', 256, 128);
	game.load.spritesheet('coop', 'assets/img/spr_double_final_strip4.png', 96, 128);
	game.load.spritesheet('minion', 'assets/img/spr_minion_strip3.png', 64, 64);
	game.load.spritesheet('explosion', 'assets/img/fx_explosion_strip10.png', 64, 64);
	game.load.spritesheet('bullet', 'assets/img/fx_bullet_impact_strip7.png', 32, 32);
	game.load.image('star', 'assets/img/spr_star.png', 64, 64);
    //game.load.image('player', 'assets/img/spr_myplane.png');
    //game.load.image('otherPlayers', 'assets/img/spr_plane.png');
    //game.load.image('coop', 'assets/img/spr_doublePlane.png');
	//game.load.image('boss', 'assets/img/spr_boss.png');
	//game.load.image('bullet', 'assets/img/spr_bullet.png');
	//game.load.image('explosion', 'assets/img/spr_explosion.png');
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
	currentDirection,
    bulletsCount = 20,
    bulletTime = 0, 
    textPlayer, 
    textOnlinePlayers,
    textHealth,
    oldX = 0, 
    oldY = 0, 
    movementSpeed = 350,
    diagonalSpeed,
    vibrate = false,
    shakeScreen = 0,
    bossHealth = 100,
    muzzleFlash,
	bossIsDying = false.
	playerIsMinion = false,

    playerGroup,

    // Background image variable
    bgtile,

    // Cloud image
    clouds,
    cloudTimer = 0,
	
	// Star image
	stars,
	starTimer = 0,

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
    coopShooting = false,

    logging = true;
    ;

function createText() {
	// Check om na te gaan of playerName bestaat
	if(typeof playerName === 'undefined') {
		playerName = 'Onbekend';
	}

    textPlayer = game.add.text(game.world.centerX, 50, "Player: " + playerName);
    textPlayer.font = 'Press Start 2P';
    textPlayer.fontSize = 15;
    textPlayer.fill = '#f00';
    textPlayer.align = 'center';
    textPlayer.anchor.setTo(0.5, 0.5);
    textPlayer.fixedToCamera = true;

    // Check om na te gaan of 'player' al bestaat
    if(typeof player !== 'undefined') {
    	var playerHealth = player.health;
    } else {
    	var playerHealth = 100;
    }

    textHealth = game.add.text(window.screen.availWidth - 200, 50, "Health: " + playerHealth);
    textHealth.font = 'Press Start 2P';
    textHealth.fontSize = 15;
    textHealth.fill = '#f00';
    textHealth.align = 'center';
    textHealth.anchor.setTo(0.5, 0.5);
    textHealth.fixedToCamera = true;

    textOnlinePlayers = game.add.text(180, 0 + window.screen.availHeight - 200, "Online Players: " + (onlinePlayers.length + 1));    
    textOnlinePlayers.font = 'Press Start 2P';
    textOnlinePlayers.fontSize = 15;
    textOnlinePlayers.fill = '#f00';
    textOnlinePlayers.align = 'left';
    textOnlinePlayers.anchor.setTo(0.5, 0.5);
    textOnlinePlayers.fixedToCamera = true;
}

/* ~~~~~~~ CREATE GAME ~~~~~~~ */
function create() {
	if(logging === false) {
		console.log = function() {};
	}

	getLocation();

    // Keep game running, even if out of focus
    this.stage.disableVisibilityChange = true;

    game.renderer.clearBeforeRender = false;
    game.renderer.roundPixels = true;
    game.physics.startSystem(Phaser.Physics.ARCADE);    
    game.world.setBounds(0, 0, 2000, 2000);

    // Geanimeerde achtergrond
    bgtile = game.add.tileSprite(0, 0, 2000, 2000, 'mainBg');

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
	
	
	stars = game.add.group();
    stars.enableBody = true;
    stars.physicsBodyType = Phaser.Physics.ARCADE;
    stars.setAll('anchor.x', 0.5);
    stars.setAll('anchor.y', 0.5);
    stars.setAll('outOfBoundsKill', true);  
	createStar();
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

    // Geluidseffecten aanmaken
    backgroundMusic = game.add.audio('backgroundMusic');
    // backgroundMusic.play('', 0, 1, true); // loop background music
    //playerBullet = game.add.audio('playerBullet');

    // Bullets aanmaken
    // -> Bullets aanmaken voordat players er zijn zodat de bullets achter de player spawnen
	bullets = game.add.group();

    for(var i = 0; i < bulletsCount; i++) {
        var bullet = this.game.add.sprite(0, 0, 'bullet');
        bullets.add(bullet);

        bullet.animations.add('bulletCollide', [1, 2, 3, 4, 5, 6]);
        bullet.anchor.setTo(0.5, 0.5);
        this.game.physics.enable(bullet, Phaser.Physics.ARCADE);

        bullet.kill();
    }

    /*muzzleFlash = game.add.group();

    for(var i = 0; i < 30; i++) {
    	var muzzle = this.game.add.sprite(0, 0, 'muzzleFlash');

    	muzzleFlash.add(muzzle);

    	muzzle.anchor.setTo(0.5, 0.5);
    	this.game.physics.enable(muzzle, Phaser.Physics.ARCADE);

    	muzzle.kill();
    }


    //muzzleFlash.createMultiple(30, 'muzzleFlash');*/

    // Player group aanmaken
    playerGroup = game.add.group();

    // Player aanmaken
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
	player.frame = 3;
	player.bringToTop();
	game.physics.enable(player, Phaser.Physics.ARCADE);
	player.enableBody = true;
	player.body.collideWorldBounds = true;
	player.body.immovable = true;

	// Player toevoegen aan Player group
    playerGroup.add(player);

    // Player group bovenaan plaatsen
   	game.world.bringToTop(playerGroup);
    playerGroup.bringToTop(player);

   	// Camera volgt player
    game.camera.follow(player);

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
        if(textOnlinePlayers !== undefined) {
            textOnlinePlayers.setText("Online Players: " + (onlinePlayers.length + 1));
        }
    });

    // Get already online coop players
    socket.on('onlineCoop', function(data) {
    	for (var onlineCoop in data) {
    		var player1 = data[onlineCoop].player1;    		
    		var player2 = data[onlineCoop].player2;
    		var shooter = data[onlineCoop].shoot;
    		var mover = data[onlineCoop].move;
    		var session = data[onlineCoop].session;
    		var coopX = data[onlineCoop].x;
    		var coopY = data[onlineCoop].y;
    		var coopAngle = data[onlineCoop].angle;

    		if(player1 !== io.socket.sessionid && player2 !== io.socket.sessionid) {

    			console.log('Creating new Co-op (other players)');
    			newCoop(player2, player1, shooter, mover, session, coopX, coopY, coopAngle, 'other');
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
        long : longitude,
        angle : 0
    });
    socket.emit('newPlayer', playerData);

    // Get new player
    socket.on('sendNewPlayer', function(data) {
        console.log('Getting a new player', data);
        console.log(currentDate() + " | Player: " + data.nickname.charAt(0).toUpperCase() + data.nickname.substring(1) + " has joined the game!");
        newPlayer(data);
        //console.log('new player added', data.lat);
        onlinePlayers.push(data.session);
        textOnlinePlayers.setText("Online Players: " + (onlinePlayers.length + 1));
    });

    // Other player requests to coop
    socket.on('joinCoop', function(data) {

    	var obj = JSON.parse(data);
    	var player1 = obj.player1;
    	var player2 = obj.player2;
    	var mover = obj.move;
    	var shooter = obj.shoot;

    	console.log('Creating new Co-op (joined)');
    	newCoop(player1, player2, mover, shooter, '', '', '', 'join');
    });

    // Ga na welke spelers niet in co-op modus zitten (en al online waren)
    socket.on('notCoop', function(data) {
    	for(var notCoopPlayer in data) {
    		//console.log('CompareGPS notCoop speler');
    		//compareGPS(data[notCoopPlayer].lat, data[notCoopPlayer].long, data[notCoopPlayer].session);
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

        	textHealth.setText("Health: " + player.health);

        	console.log('ik wordt gehit');

        	if(player.health <= 70 && player.health > 30) {
        		player.frame = 4;
				player.tint = 0xFF9933;				
        	} else if(player.health <= 30 && player.health > 0) {
        		player.frame = 5;
				player.tint = 0xFF3300;	
        	} else if(player.health <= 0) {	
			
				//player.frame = 9;
				
				//if(boss over speler gaat)
				//{
					player.tint = 0xFFFFFF;
					player.frame = 12;
					player.health = 100;				
					playerIsMinion = true;
				//}
				
				// Standaard als via de function: damage() iets gekilled wordt, dan worden de statussen: alive, exist en visible op false gezet 
				// verder worden ook alle events gebonden aan de speler removed
				player.alive = true;
				player.exists = true;
				player.visible = true;
				
        		setTimeout(function() {
					explode(player.x, player.y);
        		}, 300);			

    			socket.emit('playerDied', io.socket.sessionid);
    		} else {
    			player.frame = 3;
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
    			//alert('YOU AND YOUR PAL DIED, GAME OVER');
			}
    	} else {
    		players[data].damage(10);

    		if(players[data].health <= 0) {		
    			explode(players[data].x, players[data].y);
    		}
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
        textOnlinePlayers.setText("Online Players: " + (onlinePlayers.length + 1));
    });

    // Boss gekillt in andere client
    socket.on('bossDead', function(data) {    	
        explode(boss.x, boss.y);
    });

    // Nieuwe locatie van (bestaande) speler ophalen
    socket.on('updatedLocation', function(data) {
    	players[data.session].lat = data.lat;
    	players[data.session].long = data.long;

   		//console.log('CompareGPS nieuwe locatie');
    	//compareGPS(players[data.session].lat, players[data.session].long, players[data.session].name);
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
    boss.frame = 1;
    boss.body.immovable = true;

	/*bullets.enableBody = true;
    bullets.physicsBodyType = Phaser.Physics.ARCADE;
    bullets.createMultiple(bulletsCount, 'bullet');
    bullets.setAll('static', true);
    bullets.setAll('anchor.x', 0.5);
    bullets.setAll('anchor.y', 1);
    bullets.setAll('outOfBoundsKill', true);	*/

    
    
    /*bullets.enableBody = true;
    bullets.physicsBodyType = Phaser.Physics.ARCADE;
    bullets.setAll('static', true);
    bullets.setAll('anchor.x', 0.5);
    bullets.setAll('anchor.y', 0.5);
    bullets.setAll('outOfBoundsKill', true); */ 

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
	
	// create stars
    if(game.time.now > starTimer) {          
        createStar();
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
					currentDirection = 'left-down';
	            }
	            else if(cursors.left.isDown && cursors.up.isDown) {  
	                changePosition('-', diagonalSpeed(movementSpeed), '-', diagonalSpeed(movementSpeed), -135, currentSprite);
					currentDirection = 'left-up';
	            }
	            else {
	                changePosition('-', movementSpeed, '', '', 180, currentSprite);
					currentDirection = 'left';
	            }
	        }
	        else if(cursors.right.isDown) {
	            if(cursors.right.isDown && cursors.down.isDown) {
	                changePosition('+', diagonalSpeed(movementSpeed), '+', diagonalSpeed(movementSpeed), 45, currentSprite);
					currentDirection = 'right-down';
	            }   
	            else if(cursors.right.isDown && cursors.up.isDown) {  
	                changePosition('+', diagonalSpeed(movementSpeed), '-', diagonalSpeed(movementSpeed), -45, currentSprite);    
					currentDirection = 'right-up';					
	            }   
	            else {  
	                changePosition('+', movementSpeed, '', '', 0, currentSprite);
					currentDirection = 'right';
	            }
	        }
	        else if(cursors.up.isDown) {
	            changePosition('', '', '-', movementSpeed, -90, currentSprite);
				currentDirection = 'up';
	        }
	        else if(cursors.down.isDown) {
	            changePosition('', '', '+', movementSpeed, 90, currentSprite);
				currentDirection = 'down';
	        }
    	}

    	if(typeof player !== "undefined" && player.shoot === true || coopShooting === true) {
        // Check if coop exists, and if coop is allowed to move (if yes then disallow shooting)
        	if(game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR).isDown) {
	            fire();
	        }
        }    

        // Collisions
        //game.physics.arcade.collide(bullets, boss, bulletCollisionWithBoss, null, this);

        // Create collision detection for all players
        for(var plr in players) {
        	// your bullets hit other players
        	if(players[plr].visible !== false) {
            	game.physics.arcade.collide(bullets, players[plr], bulletOtherPlayer, null, this);
            }

            if(player.visible !== false) {
            	// other bullets hit you
            	game.physics.arcade.collide(bullets, player, bulletPlayer, null, this);
            }
        }

        // Create collision detection for all co-op players
        for(var plr in coopPlayers) {
        	// your bullets hit co-op player
        	game.physics.arcade.collide(bullets, coopPlayers[plr], bulletCoop, null, this);
        }

        if(player.coop === true) {

        }

        game.physics.arcade.collide(bullets, boss, bulletBoss, null, this);
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
		//bullet = bullets.getFirstExists(false);
        bulletTime = game.time.now + 250;

        if(player.coop === true) {
        	var resetX = coopPlayers[coopSession].body.x + (coopPlayers[coopSession].width / 2);
        	var resetY = coopPlayers[coopSession].body.y + (coopPlayers[coopSession].height / 2);
        	var rotation = coopPlayers[coopSession].rotation;
        } else {            
        	var resetX = player.body.x + (player.width / 2);
        	var resetY = player.body.y + (player.height / 2);
        	var rotation = player.rotation;
        }

        var bulletY = Math.floor((Math.random() * 40) + -20);
        var randomVelocity = (Math.random() * (-0.100 - 0.100) + 0.100);
        
        var bulletPosition = JSON.stringify({
            sessionid: io.socket.sessionid,
            rotation: rotation,
            nickname: playerName,
            resetX: resetX,
            resetY: resetY,
            bulletY: bulletY,
            randVelocity: randomVelocity
        });
        
        socket.emit('bulletChange', bulletPosition);
    }

		/*var bullet = bullets.getFirstDead();

		if(bullet) {

			/*bullet.revive();

			bullet.frame = 0;
            bullet.checkWorldBounds = true;
            bullet.outOfBoundsKill = true;

            // Reset bullet at exact center of player
            bullet.reset(player.body.x + (player.width / 2), player.body.y + (player.height / 2));

			bullet.rotation = player.rotation;
            
            game.physics.arcade.velocityFromRotation(bullet.rotation += (Math.random() * (-0.100 - 0.100) + 0.100), 625, bullet.body.velocity);

			bulletTime = game.time.now + 250;

			console.log(currentDate() + ' | Bullet has been fired on sender client');

			bullet.y += Math.floor((Math.random() * 40) + -20);

			muzzleFlash = game.add.sprite(bullet.x, bullet.y, 'muzzleFlash');
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

            // send position of bullet to server
            var bulletPosition = JSON.stringify({
                sessionid: io.socket.sessionid,
                rotation : bullet.rotation,
                nickname: playerName,
                x : bullet.x,
                y : bullet.y
            });

            
		}
	}*/
}

function explode(x, y) {
	explosion = game.add.sprite(x, y, 'explosion');
	explosion.anchor.setTo(0.5, 0.5);
	explosion.alpha = 0;
	game.add.tween(explosion).to( { alpha: 1 }, 100, Phaser.Easing.Linear.None, true, 0, 100, true);

	explosion.animations.add('explosion');
	explosion.play('explosion', '', false, true);
}

function newPlayer(plr) {
    console.log('New player data', plr.lat);

    // new player variables
    var newSession = plr.session;
    var newPlayerNick = plr.nickname;
    var newPlayerX = plr.x;
    var newPlayerY = plr.y;
    var newPlayerAngle = plr.angle;

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
    players[plr.session].angle = plr.angle;
    players[plr.session].body.immovable = true;

    // Sla gps locatie van speler op (om na te gaan of iemand anders in de buurt is)
    players[plr.session].latitude = plr.lat;
    players[plr.session].longitude = plr.long;
    players[plr.session].coop = false;
    players[plr.session].coopPlayer = '';

    players[plr.session].inputEnabled = true;
    players[plr.session].events.onInputDown.add(clickedPlayer, this);

    // Ga na of speler in co-op mode is, zo ja 'hide' deze speler dan
    if(typeof plr.coop !== "undefined" && plr.coop === true) {
    	players[plr.session].visible = false;
    }

    // Vergelijk locatie van nieuwe speler met jouw locatie
    //console.log('CompareGPS nieuwe speler');
    //compareGPS(players[plr.session].latitude, players[plr.session].longitude, players[plr.session].name);

    playerGroup.add(players[plr.session]);    
    playerGroup.bringToTop(player);
}

function updatePlayer(plr) {
    // updated player variables
    var playerSession = plr.session;
    var playerNick = plr.nickname;
    var newPlayerX = plr.x;
    var newPlayerY = plr.y;
	var newPlayerAngle = plr.angle;

	if(playerNick === 'coop') {
		console.log('jajajajaja');
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
	   	// Check if player who disconnected was in coop mode
	    if(Object.getOwnPropertyNames(coopPlayers).length !== 0) {
		    Object.keys(coopPlayers).forEach(function(key) {
			    if(key.indexOf(io.socket.sessionid) > -1) {

			       	coopPlayers[key].kill();
			       	player.visible = true;
			       	player.allowControls = true;
			       	player.move = true;
			       	player.shoot = true;
			       	player.enableBody = true;
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
		} else {
	   		players[playerSession].kill();
	   	}
	}

	
}

function newBullet(blt) {
    var bullet = bullets.getFirstDead();

    if(bullet) {
        bullet.revive();
		
        // Muzzleflash
        muzzleFlash = game.add.sprite(blt.resetX, blt.resetY, 'muzzleFlash');
		
		console.log(player.rotation);
		
		// Positie van muzzleflash, kon even geen andere manier bedenken dus dan maar zo :D
		if(currentDirection == 'left')
		{
			muzzleFlash.anchor.setTo(1.9, .4);
		}else if(currentDirection == 'left-up')
		{
			muzzleFlash.anchor.setTo(2.2, 2.1);
		}else if(currentDirection == 'left-down')
		{
			muzzleFlash.anchor.setTo(2.2, -1.4);
		}else if(currentDirection == 'right-up')
		{
			muzzleFlash.anchor.setTo(-1.2, 2.1);
		}else if(currentDirection == 'right-down')
		{
			muzzleFlash.anchor.setTo(-1.2, -1.2);
		}else if(currentDirection == 'right')
		{
			muzzleFlash.anchor.setTo(-.9, .6);
		}else if(currentDirection == 'down')
		{
			muzzleFlash.anchor.setTo(.5, -1.0);
		}else if(currentDirection == 'up')
		{
			muzzleFlash.anchor.setTo(.5, 1.9);
		}else
		{
			muzzleFlash.anchor.setTo(.5, .5);		
		}

		muzzleFlash.alpha = 0;
		game.add.tween(muzzleFlash).to( { alpha: 1 }, 100, Phaser.Easing.Linear.None, true, 0, 100, true);
		
		// Muzzleflash wordt automatisch verwijdert na 200ms
		muzzleFlash.lifespan = 200;					

        bullet.checkWorldBounds = true;
        bullet.outOfBoundsKill = true;

        bullet.reset(blt.resetX, blt.resetY);
        bullet.rotation = blt.rotation;
        bullet.y += blt.bulletY;
        game.physics.arcade.velocityFromRotation(blt.rotation += blt.randVelocity, 625, bullet.body.velocity);
        //game.physics.arcade.velocityFromRotation(blt.rotation, 450, otherBullet.body.velocity);
        bullet.animations.add('bulletCollide', [1, 2, 3, 4, 5, 6]);

        shakeScreen = 15;

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

function bulletBoss(plr, blt)
{
	if(!bossIsDying)
	{
		console.log(currentDate() + ' | A bullet hit the Boss!');

		// damage done to boss (boss.health - boss.damage)
		boss.damage(100);

		boss.frame = 0;
	
		if(boss.health <= 500 && boss.health > 200) 
		{
			boss.tint = 0xFF9933;				
		} 
		else if(boss.health <= 200 && boss.health > 0)
		{
			boss.tint = 0xFF0000;	
		} 
		else if(boss.health <= 0) 
		{
			bossIsDying = true;
			boss.tint = 0xFFFFFF;		
			explode(boss.x, boss.y);
			
			boss.alive = true;
			boss.exists = true;
			boss.visible = true;		

			boss.animations.add('boss');
			boss.animations.play('boss', 15, false, true);	

			socket.emit('bossDied', io.socket.sessionid);
		}
		
		setTimeout(function() {
			boss.frame = 1;
		}, 100);	
	}
	
	blt.animations.play('bulletCollide');
	blt.events.onAnimationComplete.add(function() {
		blt.kill();
	}, this); 
}

function bulletOtherPlayer(plr, blt) {

	blt.animations.play('bulletCollide');

	blt.events.onAnimationComplete.add(function() {
    	blt.kill();
	}, this);

    var damagedPlayer = players[plr.name].name;
    socket.emit('damagePlayer', damagedPlayer);
	
	console.log(currentDate() + ' | A bullet hit another player!');

    players[plr.name].damage(10);

    if(players[plr.name].health <= 0) {
        explode(players[plr.name].x, players[plr.name].y);
    }
}

function bulletCoop(plr, blt) {

	blt.animations.play('bulletCollide');

	blt.events.onAnimationComplete.add(function() {
    	blt.kill();
	}, this);

    var damagedPlayer = coopPlayers[plr.name].name;
    socket.emit('damagePlayer', damagedPlayer);
	
	console.log('other player got hit!', damagedPlayer);

    coopPlayers[plr.name].damage(10);

    coopPlayers[plr.name].frame = 0;

    setTimeout(function() {
    	coopPlayers[plr.name].frame = 3;
	}, 100);
}

function bulletPlayer(plr, blt) {
	console.log(currentDate() + ' | A bullet hit you!');

	blt.animations.play('bulletCollide');

	blt.events.onAnimationComplete.add(function() {
    	blt.kill();
	}, this);

    if(player.health <= 0) {
        explode(player.x, player.y);
    }  
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


function createStar() {
    // random getal tussen 0 en 1
    var randStar = Math.floor((Math.random() * 10) + 1);

    // random x waarde tussen 800 en 400
    var random = Math.floor(Math.random() * (800 - 400 + 1)) + 400;

    
    var star = game.add.sprite(-(Math.random() * random), game.world.randomY, 'star');
    


    starTimer = game.time.now + 5000;

    stars.add(star);
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
function newCoop(player1, player2, shoot, move, x, y, angle, type) {
	if(type == 'join') {
		console.log(currentDate() + ' | I am now in co-op mode with ' + player2 + '.');
	}

	if(type == 'new') {
		coopSession = player1 + player2;
	}
	else {
		coopSession = player2 + player1;
	}

	console.log('player 1', player1);
	console.log('player 2', player2);
	console.log('coop session', coopSession);

	if(player1 === io.socket.sessionid || player2 === io.socket.sessionid) {
		player.coop = true;
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
	coopPlayers[coopSession].body.immovable = true;

	if(x !== '' && y !== '' && angle !== '') {
		coopPlayers[coopSession].x = x;
		coopPlayers[coopSession].y = y;
		coopPlayers[coopSession].angle = angle;
	}
  
	if(coopPlayers[coopSession].move == io.socket.sessionid) {
		console.log(currentDate() + " | You may move, good sir.");
		textPlayer.setText('COOP MODE (move)');
		coopPlayers[coopSession].frame = 2;
		coopMovement = true;
		coopShooting = false;
	} 

	if(coopPlayers[coopSession].shoot == io.socket.sessionid) {
		console.log(currentDate() + " | You may shoot, good sir.");
		textPlayer.setText('COOP MODE (shoot)');
		coopPlayers[coopSession].frame = 1;
		coopShooting = true;
		coopMovement = false;
		player.move = false;
	}

	if(player1 == io.socket.sessionid) {
		console.log('jij bent player 1');

		player.coop = true;
		player.visible = false;
		player.renderable = false;
		player.allowControls = false;
		player.move = false;
		player.shoot = false;

		players[player2].visible = false;
		players[player2].coop = true;
		players[player2].renderable = false;
		players[player2].enableBody = false;

		game.camera.follow(coopPlayers[coopSession]);
	}

	else if (player2 == io.socket.sessionid) {
		console.log('jij bent player 2');

		player.coop = true;
		player.visible = false;
		player.renderable = false;
		player.allowControls = false;
		player.move = false;
		player.shoot = false;

		players[player1].visible = false;
		players[player1].coop = true;
		players[player1].renderable = false;
		players[player1].enableBody = false;

		game.camera.follow(coopPlayers[coopSession]);
	} 

	else {
		console.log('jij bent geen van beide');

		players[player1].visible = false;
		players[player1].coop = true;
		players[player1].renderable = false;
		players[player1].enableBody = false;

		players[player2].visible = false;
		players[player2].coop = true;
		players[player2].renderable = false;
		players[player2].enableBody = false;
	}

	if(type === 'new') {
		// Draai alles om, omdat player 1 dan de andere speler is..
		var coopData = JSON.stringify({
	        player1 : player2,
	        player2 : player1,
	        move : player2,
	        shoot : player1,
	        x : coopPlayers[coopSession].x,
	        y : coopPlayers[coopSession].y,
	        angle : coopPlayers[coopSession].angle
	    });
		socket.emit('newCoop', coopData);
	}
}

// Function to compare location of yourself to other Player
// Decides to create newCoop if distance within range
function compareGPS(playerLat, playerLong, playerSession) {	
	if(playerLat !== '' && playerLong !== '') {
		// distance between you and other player in kilometers
		var dist = distance(latitude, longitude, playerLat, playerLong, "k");

		// distance in meters
		dist = dist * 1000;

		// check if distance is within given range
		//if(dist <= range && !isNaN(dist)) {
			// Ga na of te vergelijken speler niet jijzelf is (je kunt niet co-oppen met jezelf :p)
			if(playerSession != io.socket.sessionid) {
				console.log(currentDate() + ' | Distance between YOU and ' + playerSession + ' is: ' + dist.toString() + ' meters.');
				// Ga na of jijzelf nog niet in co-op bent

				if(player.coop === false) {
					console.log(currentDate() + ' | Ik ben nog niet in co-op modus');
					if(players[playerSession].coop === false) {
						console.log(currentDate() + ' | ' + playerSession + ' is ook nog niet in co-op modus');

						newCoop(player.name, players[playerSession].name, players[playerSession].name, player.name, '', '', '', 'new');
					}
				} else {
					console.log('NEEEEEEEEEEEEEEEEEEEEEEE');
				}

				/*if(player.coop === false && players[playerSession].coop === false) {
					console.log('oke, maak maar coop van');
					newCoop(player.name, players[playerSession].name, players[playerSession].name, player.name, 'new');
				}*/
		} else {
			console.log(currentDate() + ' | Distance between YOU and ' + players[playerSession].name + ' (' + dist + ') is greater than the given range (' + range + ').');
		}
	}
}

/* ~~~~~~~ GEOLOCATION FUNCTIONS ~~~~~~~ */
// Check if user's browser supports geolocation
function getLocation() {
	if(navigator.geolocation) {
		navigator.geolocation.watchPosition(foundPosition, function(error) {
			console.log('Error', error);
            if(error.code == error.PERMISSION_DENIED) {
                latitude = 0;
                longitude = 0;
            }
        }, {enableHighAccuracy: false});
        // HighAccuracy staat uit i.v.m. accu duur
	} else {
		console.log('Het ophalen van uw locatie is mislukt\nGPS wordt niet ondersteund op uw smart device.');
	}
}

// Get exact location of user if geolocation is supported
// Just used to store the latitude and longitude of player at the moment
function foundPosition(position) {
    if(position.coords.latitude !== latitude || position.coords.longitude !== longitude) {
    	latitude = position.coords.latitude;
		longitude = position.coords.longitude;

		var updatedLocation = JSON.stringify({
			sessionid : io.socket.sessionid,
			lat : latitude,
			long : longitude
		});
		socket.emit('locationUpdate', updatedLocation);
    }
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

function clickedPlayer(event, sprite) {
	compareGPS(players[event.name].latitude, players[event.name].longitude, players[event.name].name);
}

function render() {
	/*for(var player in players) {
		game.debug.spriteInfo(players[player], 32, 32);
	}*/
}