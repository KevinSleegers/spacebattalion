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
    textPlayers, 
	curPlayerFrame,
    textScore,
    oldX = 0, 
    oldY = 0, 
    movementSpeed = 350,
    diagonalSpeed,
    vibrate = false,
    shakeScreen = 0,
    muzzleFlash,
    playerType,
	bossIsDying = false,
	isBoss = false,
    playerGroup,
	bossGroup,
    bgtile,
    clouds,
	radarCursor,
	mergeIcon,
	bossSession,
	radarMeters,
    cloudTimer = 0,

	// Star image
	stars,
	starTimer = 0,

    // Moon image
    moon,

    // audio
    playerBullet,
    backgroundMusic,
    shipHitSound,

    range = 100,

    coop,
    coopMovement = false,
    coopShooting = false,

    logging = true,
    bounds = 2000,
    friendlyFire = true,
    deadTimer,
    deadPlayers = 0,
    revived = 0,
    minionTime = 5,
    bossHealth = 2000,
    scoreMultiplier = 1,
    bossPlayer = '';

SpaceBattalion.Game = function(game) {
	this.game;		//	a reference to the currently running game
    this.add;		//	used to add sprites, text, groups, etc
    this.camera;	//	a reference to the game camera
    this.debug;
    this.cache;		//	the game cache
    this.input;		//	the global input manager (you can access this.input.keyboard, this.input.mouse, as well from it)
    this.load;		//	for preloading assets
    this.math;		//	lots of useful common math operations
    this.sound;		//	the sound manager - add a sound, play one, set-up markers, etc
    this.stage;		//	the game stage
    this.time;		//	the clock
    this.tweens;    //  the tween manager
    this.state;	    //	the state manager
    this.world;		//	the game world
    this.particles;	//	the particle manager
    this.physics;	//	the physics manager
    this.renderer;
    this.rnd;		//	the repeatable random number generator
};

SpaceBattalion.Game.prototype = {

	create: function() {
		if(window.boss === io.socket.sessionid) {
			console.log('ik ben de boss');
			console.log('window.boss = ' , window.boss);
			bossSession = window.boss;
			isBoss = true;
		}

		bossPlayer = window.boss;

		// Stuur huidige locatie naar server
		var updatedLocation = JSON.stringify({
			sessionid : io.socket.sessionid,
			lat : window.lat,
			long : window.lng
		});
		socket.emit('locationUpdate', updatedLocation, myRoom);		

		this.stage.disableVisibilityChange = true;

		// Phaser advanced timing aan -> FPS
		this.time.advancedTiming = true;
		this.input.maxPointers = 1;

		console.log('je huidige room is: ' + myRoom);
		//alert('ROOM IM IN: ' + myRoom);

		// Console.log aan / uit zetten
		if(!logging) {
			console.log = function() {};
		}

		// Ga na of device kan loggen, zo niet log dan niet! (performance)
		if(typeof console === "undefined"){
      		console = {};
		}

		/*this.renderer.clearBeforeRender = true;
		this.renderer.roundPixels = true;*/
		this.physics.startSystem(Phaser.Physics.ARCADE);
		this.world.setBounds(0, 0, bounds, bounds);

		// Achtergrond muziek en andere geluiden
		this.backgroundMusic = this.add.audio('backgroundMusic');
		if(SpaceBattalion.music) {
			this.backgroundMusic.play('', 0, 1, true);
		}

		this.shipHitSound 	= this.add.audio('shipHitSound');
		this.laserShotSound = this.add.audio('laserShotSound');
		this.explosionSound	= this.add.audio('explosionSound');
		
		playerName = window.inlognaam;

		bgtile = this.add.tileSprite(0, 0, bounds, bounds, 'mainBg');

		player 	= this.add.sprite(this.world.centerX, this.world.centerY, window.skin);		

		boss 	= this.add.sprite(600, 700, 'boss'); 		

		if(isBoss) {
			playerType = boss;
		} else {
			playerType = player;
		}

		// Locatie van player ophalen
		this.getLocation();

		// Player instellingen
		player.anchor.setTo(.5,.5);
		player.name = io.socket.sessionid;
		player.allowControls = true;
		player.coop = false;
		player.move = true;
		player.shoot = true;
		player.health = 100;
		player.bringToTop();
		this.physics.enable(player, Phaser.Physics.ARCADE);
		player.physicsBodyType = Phaser.Physics.ARCADE;
		player.enableBody = true;
		player.body.collideWorldBounds = true;
		player.body.immovable = true;	
		player.score = 0;
		player.frame = 3;
		player.minion = false;

		if(isBoss) {
			player.boss = true;
			player.visible = false;
			player.enableBody = false;
		} else {
			player.boss = false;
		}

		console.log('is boss', isBoss);

		if(typeof window.tint !== "undefined" && window.tint !== 0) {
			player.tint = window.tint;
		}

		player.lat = window.lat;
		player.lng = window.lng;
		
		// Player group instellingen
		playerGroup = this.add.group();
		playerGroup.add(player);
		playerGroup.bringToTop(player);
		
		// Merge icoon
		mergeIcon = this.add.sprite(this.world.centerX, this.world.centerY, 'mergeButton');
		mergeIcon.fixedToCamera = true;
		mergeIcon.cameraOffset.setTo(200, 200);	
		mergeIcon.visible = false;

		// Boss instellingen
		boss.anchor.setTo(.5, .5);
		boss.allowControls = true;
		boss.enableBody = true;
	    this.physics.enable(boss, Phaser.Physics.ARCADE);
	    boss.physicsBodyType = Phaser.Physics.ARCADE;
		boss.body.collideWorldBounds = true;		
	    boss.health = bossHealth;
	    boss.frame = 1;
	    boss.body.immovable = true;
	    boss.move = false;
		
		// Player group instellingen
		bossGroup = this.add.group();
		bossGroup.add(boss);
		bossGroup.bringToTop(boss);		

		//this.camera.follow(boss, Phaser.Camera.FOLLOW_TOPDOWN);	
		this.camera.follow(playerType, Phaser.Camera.FOLLOW_LOCKON);	
	
		

		// Bullets aanmaken
		bullets = this.add.group();
		for(var i = 0; i < bulletsCount; i++) {
	        var bullet = this.add.sprite(0, 0, 'bullet');
	        bullets.add(bullet);

	        bullet.animations.add('bulletCollide', [1, 2, 3, 4, 5, 6]);
	        bullet.anchor.setTo(0.5, 0.5);
	        bullet.frame = 0;
	        this.physics.enable(bullet, Phaser.Physics.ARCADE);

	        bullet.kill();
	    };	

		// Verzoek om spelers op te halen van server uit je huidige room
		socket.emit('requestPlayers', io.socket.sessionid, myRoom);

		// Haal spelers van server die al online zijn
	    var self = this;
    	socket.on('onlinePlayer', function(data) {
    		console.log(data);

	        if(Object.getOwnPropertyNames(data).length === 0) {
	        	console.log('There are no other players online.');
	        } else {
	        	console.log('There are other players online.');
	        	// Check which players are in co-op mode
	        	socket.emit('getCoopPlayers', io.socket.sessionid);
	        }

	        for(var onlinePlayer in data) {
	        	if(data[onlinePlayer].session.length <= 20) {
	        		console.log('Creating player', data[onlinePlayer].session);
	        		console.log(data[onlinePlayer]);
	            	self.createPlayer(data[onlinePlayer]);
	            	//onlinePlayers.push(data[onlinePlayer].nickname);
	            }
	            onlinePlayers.push(data[onlinePlayer].session);
	        }
	    });

	    // Haal co-op spelers van server die al online zijn
	    var self = this;
	    socket.on('onlineCoop', function(data) {
	    	for (var onlineCoop in data) {
	    		var player1 	= data[onlineCoop].player1;    		
	    		var player2 	= data[onlineCoop].player2;
	    		var shooter 	= data[onlineCoop].shoot;
	    		var mover 		= data[onlineCoop].move;
	    		var session 	= data[onlineCoop].session;
	    		var coopX 		= data[onlineCoop].x;
	    		var coopY 		= data[onlineCoop].y;
	    		var coopAngle 	= data[onlineCoop].angle;

	    		if(player1 !== io.socket.sessionid && player2 !== io.socket.sessionid) {
	    			console.log('Creating new Co-op (other players)');
	    			self.createCoop(player2, player1, shooter, mover, session, coopX, coopY, coopAngle, 'other');
	    		}
	    	}
	    });

	    // Stuur nieuwe speler door naar server		
		if(playerType == boss)
		{	
			var playerData = JSON.stringify({
				sessionid : io.socket.sessionid,
				nickname : playerName,
				x : this.world.centerX,
				y : this.world.centerY,
				lat : player.lat,
				long : player.lng,
				angle : 0,
				isboss : true
			});			
		}
		else
		{
			var playerData = JSON.stringify({
				sessionid : io.socket.sessionid,
				nickname : playerName,
				x : this.world.centerX,
				y : this.world.centerY,
				lat : player.lat,
				long : player.lng,
				angle : 0,
				isboss : false
			});				
		}

	    socket.emit('newPlayer', playerData, myRoom);

	    // Haal nieuwe speler op van server
	    var self = this;
	    socket.on('sendNewPlayer', function(data) {
	    	if(data.session !== io.socket.sessionid) {
	        	self.createPlayer(data);
	        	//console.log('new player added', data.lat);
	        	onlinePlayers.push(data.session);
	        }
	    });		

	    // Andere spelers in co-op
	    var self = this;
	    socket.on('joinCoop', function(data) {
	    	var obj = JSON.parse(data);
	    	var player1 	= obj.player1;
	    	var player2 	= obj.player2;
	    	var mover 		= obj.move;
	    	var shooter 	= obj.shoot;

	    	self.createCoop(player1, player2, mover, shooter, '', '', '', 'join');
	    });

	    // Update positie van speler
	    var self = this;
	    socket.on('updatePlayer', function(data) {
	    	self.updatePlayer(data);
	    });	

	    var self = this;
	    socket.on('removePlayer', function(data) {
	    	self.removePlayer(data);

	    	var i = onlinePlayers.indexOf(players[data].name);
	        if(i != -1) {
	            onlinePlayers.splice(i,1);
	        }    
	    });

	    // Nieuwe bullet spawnen
	    var self = this;
	    socket.on('newBullet', function(data) {
	    	self.createBullet(data);
	    });

	    // Een player is geraakt door een bullet
	    var self = this;
	    socket.on('playerShot', function(data) {
	    	if(SpaceBattalion.music) {
	    		self.shipHitSound.play();
	    	}

	    	if(data === io.socket.sessionid) {

	    		player.damage(10);

	        	console.log('ik wordt gehit');

	        	if(player.minion === false) {
		        	if(player.health <= 70 && player.health > 30) {
		        		player.frame = 10;

		    			setTimeout(function() {
		    				player.frame = 4;
		    			}, 100);
						//player.tint = 0xFF9933;				
		        	} else if(player.health <= 30 && player.health > 0) {
		        		player.frame = 10;

		        		setTimeout(function() {
		        			player.frame = 5;
		        		}, 100);
						//player.tint = 0xFF3300;	
		        	} else if(player.health <= 0) {	
		        		player.frame = 10;

		        		setTimeout(function() {
		        			player.frame = 9;
		        		}, 100);		
						
						// Standaard als via de function: damage() iets gekilled wordt, dan worden de statussen: alive, exist en visible op false gezet 
						// verder worden ook alle events gebonden aan de speler removed
						player.alive = true;
						player.exists = true;
						player.visible = true;

						player.allowControls = false;	

		    			socket.emit('playerDied', io.socket.sessionid);

		    			if(revived === 0) {
			    			deadTimer = game.time.create(false);

			    			deadTimer.add(minionTime * 1000, function() {
			    				console.log('player dood, starten van timer..');

			    				self.explode(player.x, player.y);

								deadPlayers++;

			    				socket.emit('playerMinion', io.socket.sessionid, myRoom);
			    			}, this);

			    			deadTimer.start();
		    			} else {
		    				deadPlayers++;

		    				socket.emit('playerMinion', io.socket.sessionid, myRoom);
		    			}

		    		} else {
		    			var currentFrame = player.frame;

		    			player.frame = 10;

		        		setTimeout(function() {
		        			player.frame = currentFrame;
		        		}, 100);	
		    		}
		    	} else {
		    		player.frame = 11;

					setTimeout(function() {
				    	player.frame = 12;
					}, 100);
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

	    		var dist = self.distance(player.lat, player.lng, players[data].lat, players[data].lng, "M");	

	    		if(players[data].minion === false) { 

	    			if(players[data].health <= 70 && players[data].health > 30) {
	    				players[data].frame = 10;

	    				if(dist <= range) {
	    					setTimeout(function() {
	    						players[data].frame = 7;
	    					}, 100);

	    					scoreMultiplier = 1.5;
 	    				} else {
			    			setTimeout(function() {
			    				players[data].frame = 1;
			    			}, 100);

			    			scoreMultiplier = 1;
		    			}
						//player.tint = 0xFF9933;				
		        	} else if(players[data].health <= 30 && players[data].health > 0) {
		        		players[data].frame = 10;

		    			if(dist <= range) {
		    				setTimeout(function() {
		    					players[data].frame = 8;
		    				}, 100);

		    				scoreMultiplier = 1.5;
		    			} else {
		    				setTimeout(function() {
		    					players[data].frame = 2;
		    				}, 100);

		    				scoreMultiplier = 1;
		    			}
						//player.tint = 0xFF3300;
					} else if(players[data].health <= 0) {		
		    			players[data].frame = 10;

		    			setTimeout(function() {
		    				players[data].frame = 9;
		    			}, 100);

		    			deadPlayers++;
						
						// Standaard als via de function: damage() iets gekilled wordt, dan worden de statussen: alive, exist en visible op false gezet 
						// verder worden ook alle events gebonden aan de speler removed
						players[data].alive = true;
						players[data].exists = true;
						players[data].visible = true;	

						if(deadPlayers === Object.keys(players).length && typeof Object.keys(players).length != 'undefined') {
							console.log('alle andere players zijn dood');

							if(playerType === player) {
								console.log('ben ik ook dood?', player.minion);
								if(player.minion === true) {
									window.shutdown = minion;

									setTimeout(function() {
										self.shutdown();
									}, 500);
								}
							}
						}		

						setTimeout(function() {
							self.explode(players[data].x, players[data].y);
						}, 1000);
		    		} else {
		    			var currentFrame = players[data].frame;

		    			players[data].frame = 10;

		    			setTimeout(function() {
		    				players[data].frame = currentFrame;
		    			}, 100);
		    		}
	    		} else {
	    			players[data].frame = 11;

	    			setTimeout(function() {
	    				players[data].frame = 13;
	    			}, 100);
	    		}
	    	}
	    });

		// Speler is gerevived
		var self = this;
		socket.on('playerAlive', function(data) {
			players[data].revive();

			var dist = self.distance(player.lat, player.lng, players[data].lat, players[data].lng, "M");

			if(dist <= range) {
				players[data].frame = 6;
			} else {
				players[data].frame = 0;
			}

			players[data].health = 100;
			players[data].alive = true;			
		});

		// Speler is minion geworden
		socket.on('minionPlayer', function(data) {
			if(data === io.socket.sessionid) {

				player.revive();
				player.frame = 12;
				player.minion = true;
				player.health = 100;
				player.allowControls = true;

			} else {

				players[data].revive();
				players[data].frame = 13;
				players[data].minion = true;
				players[data].health = 100;
				players[data].allowControls = true;

			}
		});

		// Boss is gekillt door andere speler
		var self = this;
		socket.on('bossDead', function(data) {
			window.shutdown = boss;

			self.explode(boss.x, boss.y);
			player.score += 1000 * scoreMultiplier;
			
			console.log('Total score: ' + player.score);
			$.ajax({
				type:"post",
				url:"http://buitmediasolutions.nl/spacebattalion/score.php",
				data:{id: window.playerObject.id, score: player.score},
				success:function(data){
					console.log(data);
					
				}
			});

			setTimeout(function() {
				self.shutdown();
			}, 500);
		});

		// Locatie (GPS) van andere speler is geupdatet
		var self = this;
		socket.on('updatedLocation', function(data) {
			console.log('updating position');

			players[data.session].lat = data.lat;
			players[data.session].lng = data.long;

			if(players[data.session].boss === false) {
				var dist = self.distance(player.lat, player.lng, players[data.session].lat, players[data.session].lng, "M");

				if(dist <= range) {
					scoreMultiplier = 1.5;

					if(radarCursor == '' || radarCursor == null || typeof radarCursor == "undefined") {
						var angleCursor = self.calcAngle(player.lat, player.lng, players[data.session].lat, players[data.session].lng);

						// Radar cursor aanmaken
						radarCursor = self.add.sprite(0, 0, 'radarCursor');
						radarCursor.anchor.setTo(.5, .5);
						radarCursor.fixedToCamera = true;
						radarCursor.cameraOffset.setTo(cursorOffsetX, 100);	
						radarCursor.angle = angleCursor;
						console.log('radarcursor angle 1', angleCursor);
							
						radarMeters = self.add.text(0, 0, dist + " M", { font: "14px Arial", fill: "#ffffff", align: "center" });
						radarMeters.fixedToCamera = true;
						radarMeters.cameraOffset.setTo(cursorOffsetX - 15, 140);	

						players[data.session].frame = 6;
						
						cursorOffsetX += 60;
					} else {
						radarMeters.setText(dist + ' M');
					}
				} else {
					scoreMultiplier = 1;
				}
			}
		});

	    if(this.game.device.desktop) {
	    	cursors = this.input.keyboard.createCursorKeys();

	    	// Maak wolken group aan
			clouds = this.add.group();
			clouds.enableBody = true;
		    clouds.physicsBodyType = Phaser.Physics.ARCADE;
		    clouds.setAll('anchor.x', 0.5);
		    clouds.setAll('anchor.y', 0.5);
		    clouds.setAll('outOfBoundsKill', true);  

		    // Maak 5 wolken aan
		    for(i = 0; i < 5; i++) {
		     	this.createCloud();
		    }
			
			// Maak sterren group aan
			stars = this.add.group();
		    stars.enableBody = true;
		    stars.physicsBodyType = Phaser.Physics.ARCADE;
		    stars.setAll('anchor.x', 0.5);
		    stars.setAll('anchor.y', 0.5);
		    stars.setAll('outOfBoundsKill', true);  
		    
		    // Maak maan aan
		    this.createMoon();
		} 
		else {
			// Hide logo en payoff op mobiel als game start..
			$('.logo, .payoff').css('display', 'none');

	    	// Camera instellingen
	    	this.camera.setSize(500, 500);

			// Niet op desktop
			navigator.vibrate = navigator.vibrate || navigator.webkitVibrate || navigator.mozVibrate || navigator.msVibrate || null;
	        navigator.vibrate ? vibrate = true : vibrate = false;

	        var self = this;
	        if(gyro.hasFeature('devicemotion')) {
	            console.log('Gyro.js loaded!');

	            if(gyro.getFeatures().length > 0) {
	                gyro.frequency = 10;

	                gyro.startTracking(function(o) {   
	                	// TO DO beweging fixen voor landscape mode!!!

	                    var anglePlayer = Math.atan2(o.y, o.x);

	                    angleRadians = anglePlayer * Math.PI/180;
	                    anglePlayer *= 180/Math.PI;
	                    anglePlayer -= 90;
	                    anglePlayer = self.math.wrapAngle(-anglePlayer);

	                    //if(self.input.activePointer.isDown) {
	                    	//self.fire();
	                    //}
	                    
	                    //if(this.game.input.pointer.isDown) {
	                        //self.fire();
	                    //}

	                    if(player.allowControls === true) {	                    	
		                    if(o.z < 9.5 || o.z > 10) {	
		                    	// max y is gelijk aan movementspeed op desktop
		                    	if((o.y * 50) > 350) {
		                    		var accelY = 350;
		                    	} else {
		                    		var accelY = o.y * 50;
		                    	}

		                    	// max x is gelijk aan movementspeed op desktop
		                    	if((o.x * 50) > 350) {
		                    		var accelX = 350;
		                    	} else {
		                    		var accelX = o.x * 50;
		                    	}

		                    	self.changePosition('+', accelY, '+', accelX, anglePlayer, 'p');		                    	
		                    } else {
		                   		// Als je telefoon vrijwel horizontaal is, stop dan beweging maar behoudt angle
		                        self.changePosition('+', 0, '+', 0, playerType.angle, 'p');
		                    } 
	                    }
	                });
	            }
	        }

		}
	},

	update: function() {

		// Als window niet in focus is
		var self = this;
		window.onblur = function() {
			self.backgroundMusic.pause();
		}

		// Als window wel in focus is
		var self = this;
		window.onfocus = function() {	
			self.backgroundMusic.resume();
		}
		
		// Animatie voor radarcursor in hier
		if(radarCursor)
		{
			
		}

		// Zet velocity weer op 0 van jezelf
		if(Object.getOwnPropertyNames(coopPlayers).length !== 0) {
			Object.keys(coopPlayers).forEach(function(key) {
				if(key.indexOf(io.socket.sessionid) > -1) {
					coopPlayers[key].body.velocity.setTo(0, 0);
				} else {
					playerType.body.velocity.setTo(0, 0);
				}
			});
		} else {
			if(playerType === boss) {
				playerType.body.velocity.setTo(0, 0);
			} else {
				if(typeof player !== 'undefined') {
					player.body.velocity.setTo(0, 0);
				}
			}
		}			

	    // Alleen uitvoeren als gebruiker op desktop is
		if(this.game.device.desktop) {    	

			// Laat achtergrond bewegen
			bgtile.tilePosition.x -= 2;
	    	bgtile.tilePosition.y += 1;

	    	// Maak wolken aan
	    	if(clouds.length >= 30) {
	    		console.log('meer dan 30 wolken.. ');
	    		clouds.removeAll();
	    	} else {
			    if(this.time.now > cloudTimer) {          
			        this.createCloud();
			    }
			}
			
			// Maak sterren aan
			if(stars.length >= 40) {
	    		console.log('meer dan 40 sterren.. ');
				stars.removeAll();
			} else {
				if(this.time.now > starTimer) {          
			        this.createStar();
			    }
			}
		
			// Maak maan aan
			if(moon.x > (this.world.width + moon.width)) {
			    moon.destroy();

			    this.createMoon();
			}

		    if(typeof player !== "undefined" && player.visible === true && player.coop === false || playerType == boss) {
	    		var currentSprite = 'p';
	    		movementSpeed = 350;
	    	} else {
	    		var currentSprite = 'c';
	    		movementSpeed = 175;
	    	}

	    	if(typeof player !== "undefined" && player.move === true && player.allowControls === true || coopMovement === true) {

	    		// Ga na welke coopspeler je bent, andere waardes kan ik hier niet aan.. dus dan maar zo
	        	Object.keys(coopPlayers).forEach(function(key) {
	        		if(key.indexOf(io.socket.sessionid) > -1) {
	        			currentSprite = key;
	        		}
	        	});

		        if(cursors.left.isDown) {   

		            if(cursors.left.isDown && cursors.down.isDown) {
		                this.changePosition('-', this.diagonalSpeed(movementSpeed), '+', this.diagonalSpeed(movementSpeed), 135, currentSprite);
						currentDirection = 'left-down';
		            }
		            else if(cursors.left.isDown && cursors.up.isDown) {  
		                this.changePosition('-', this.diagonalSpeed(movementSpeed), '-', this.diagonalSpeed(movementSpeed), -135, currentSprite);
						currentDirection = 'left-up';
		            }
		            else {
		                this.changePosition('-', movementSpeed, '', '', 180, currentSprite);
						currentDirection = 'left';
		            }
		        }
		        else if(cursors.right.isDown) {
		            if(cursors.right.isDown && cursors.down.isDown) {
		                this.changePosition('+', this.diagonalSpeed(movementSpeed), '+', this.diagonalSpeed(movementSpeed), 45, currentSprite);
						currentDirection = 'right-down';
		            }   
		            else if(cursors.right.isDown && cursors.up.isDown) {  
		                this.changePosition('+', this.diagonalSpeed(movementSpeed), '-', this.diagonalSpeed(movementSpeed), -45, currentSprite);    
						currentDirection = 'right-up';					
		            }   
		            else {  
		                this.changePosition('+', movementSpeed, '', '', 0, currentSprite);
						currentDirection = 'right';
		            }
		        }
		        else if(cursors.up.isDown) {
		            this.changePosition('', '', '-', movementSpeed, -90, currentSprite);
					currentDirection = 'up';
		        }
		        else if(cursors.down.isDown) {
		            this.changePosition('', '', '+', movementSpeed, 90, currentSprite);
					currentDirection = 'down';
		        }
	    	}

	    	if(typeof player !== "undefined" && player.shoot === true || coopShooting === true) {
	        // Check if coop exists, and if coop is allowed to move (if yes then disallow shooting)
	        	if(this.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR).isDown) {
		            this.fire(null);
		            console.log('aaa');
		        }
	        }
	    } else {
	    	/* Maak wolken aan
	    	if(clouds.length >= 10) {
	    		console.log('meer dan 10 wolken.. ');
	    		clouds.removeAll();
	    	} else {
			    if(this.time.now > cloudTimer) {          
			        this.createCloud();
			    }
			}
			
			// Maak sterren aan
			if(stars.length >= 15) {
	    		console.log('meer dan 15 sterren.. ');
				stars.removeAll();
			} else {
				if(this.time.now > starTimer) {          
			        this.createStar();
			    }
			}*/

			this.input.onTap.add(this.tapScreen, this);
	    }    

        // Collision detection voor alle players && Icoon om samen te voegen
        for(var plr in players) {
			//onsole.dir(players[plr].name + " : " + window.boss);
			// console.log(bossSession);
        	// Bullets raken andere players
        	if(playerType !== player && players[plr].visible !== false && friendlyFire == true && players[plr].health > 0 && players[plr].minion === false) {
            	this.physics.arcade.collide(bullets, players[plr], this.bulletOtherPlayer, null, this);
            }

            if(player.visible !== false && friendlyFire == true && player.health > 0 && player.minion === false) {
            	// Bullets raken jou
            	this.physics.arcade.collide(bullets, player, this.bulletPlayer, null, this);
            }			
		
			if(typeof player.lat !== "undefined" && typeof player.lng !== "undefined" && players[plr].boss === false) {

				//	Als afstand kleiner dan 100 meter is
				//console.log(player.boss);
				//if(!isBoss)
				//{
				//console.log("id is " + io.socket.sessionid + " name is : " + players[plr].name);
				//console.log(io.socket.sessionid);
				//if(players[plr].name !== window.boss) {

				if(player.boss === false && players[plr].boss === false) {
					if(this.physics.arcade.distanceBetween(players[plr], player) <= (range * 2)) {
						mergeIcon.visible = true;

						mergeIcon.inputEnabled = true;
						mergeIcon.events.onInputDown.add(this.mergePlayers, this);
					} else {
						console.log('nee');

						mergeIcon.visible = false;
					}
				} else {
					mergeIcon.visible = false;
				}
					
				/*if(players[plr].boss === false && player.boss === false || player.boss === false || isBoss === false) {
					var dist = this.distance(player.lat, player.lng, players[plr].lat, players[plr].lng, "M");

					if(	dist <= range && 
						this.physics.arcade.distanceBetween(players[plr], player) <= (range * 2) && 
						players[plr].minion === false && 
						players[plr].health > 0 && 
						players[plr].coop === false)
					{				
						mergeIcon.visible = true;

						mergeIcon.inputEnabled = true;
						mergeIcon.events.onInputDown.add(this.mergePlayers, this);
					}
					else
					{
						mergeIcon.visible = false;
					}
				}*/
				//}
				//console.log(players[plr].nickname + players[plr].latitude + " ");
			} else {
				mergeIcon.visible = false;
			}

			// Player revived andere player
			if(player.health === 0 && player.minion === false && revived === 0) {
				this.physics.arcade.overlap(players[plr], player, this.revivePlayer, null, this);
			}
		}

        // Collision detection voor co-op players
        for(var plr in coopPlayers) {
        	// Bullets raken co-op players
        	this.physics.arcade.collide(bullets, coopPlayers[plr], this.bulletCoop, null, this);
        }

        // Bullets raken boss
        if(player.minion === false) {
        	this.physics.arcade.collide(bullets, boss, this.bulletBoss, null, this);
        }

        // Overlap tussen boss en player
        // this.physics.arcade.overlap(player, boss, this.overlapPlayer, null, this);			
	},

	createPlayer: function(plr) {		
		// new player variables
	    var newSession = plr.session;
	    var newPlayerNick = plr.nickname;
	    var newPlayerX = plr.x;
	    var newPlayerY = plr.y;
	    var newPlayerAngle = plr.angle;
	
		players[plr.session] = this.add.sprite(plr.x, plr.y, 'player');
	
	    // configurations for new player
	    players[plr.session].anchor.setTo(.5,.5);
	    //players[plr.session].animations.add('fly'); 
	    //players[plr.session].animations.play('fly', 10, true);
	    this.physics.enable(players[plr.session], Phaser.Physics.ARCADE);
	    players[plr.session].enableBody = true;
	    players[plr.session].body.collideWorldBounds = true;
	    players[plr.session].name = plr.session;
	    players[plr.session].health = 100;
	    players[plr.session].minion = false;
	    //players[plr.session].frame = 1;
	    players[plr.session].angle = plr.angle;
	    players[plr.session].body.immovable = true;

	    if(bossPlayer === players[plr.session].name) {
	    	players[plr.session].boss = true;
	    	players[plr.session].visible = false;
	    	players[plr.session].enableBody = false;
	    } else {
	    	players[plr.session].boss = false;
	    }

	    if(typeof plr.minion !== 'undefined') {
	    	if(plr.minion === true) {
	    		players[plr.session].minion = true;
	    		players[plr.session].frame = 13;
	    	} else {    		
	    		players[plr.session].minion = false;
	    		players[plr.session].frame = 0;
	    	}
	    }
	
	    // Sla gps locatie van speler op (om na te gaan of iemand anders in de buurt is)
	    players[plr.session].lat = plr.lat; 	
	    players[plr.session].lng = plr.long;

	    console.log('new player pos', players[plr.session].lat, players[plr.session].lng);

	    //players[plr.session] = game.add.sprite(plr.x, plr.y, 'otherPlayers');
	    if(plr.skin == 'ns') {
	    	players[plr.session].loadTexture('ns');
	    } else if (plr.skin == 'wk') {
	    	players[plr.session].loadTexture('wk');
	    }

		if(plr.tint !== 0) {
			players[plr.session].tint = plr.tint;
		}

	    players[plr.session].coop = false;
	    players[plr.session].coopPlayer = '';

	    // Ga na of speler in co-op mode is, zo ja 'hide' deze speler dan
	    if(typeof plr.coop !== "undefined" && plr.coop === true) {
	    	players[plr.session].visible = false;
	    }

	    // Vergelijk locatie van nieuwe speler met jouw locatie
	    //console.log('CompareGPS nieuwe speler');
	    //compareGPS(players[plr.session].latitude, players[plr.session].longitude, players[plr.session].name);

	    playerGroup.add(players[plr.session]);    
	    playerGroup.bringToTop(player);
		bossGroup.bringToTop(boss);	
		
		var cursorOffsetX = 400;		

		if(player.lat !== 0 && player.lng !== 0 && players[plr.session].lat !== 0 && players[plr.session].lng !== 0) {
			var dist = this.distance(player.lat, player.lng, players[plr.session].lat, players[plr.session].lng, "M");

			console.log('distance tussen mijzelf en andere: ' + dist);

			if(dist <= range && bossSession !== player.name || typeof bossSession === undefined) {
				scoreMultiplier = 1.5;
				players[plr.session].frame = 6;
				
				if(radarCursor == '' || radarCursor == null || typeof radarCursor == "undefined") {
					var angleCursor = this.calcAngle(player.lat, player.lng, players[plr.session].lat, players[plr.session].lng);

					// Radar cursor aanmaken
					radarCursor = this.add.sprite(0, 0, 'radarCursor');
					radarCursor.anchor.setTo(.5, .5);
					radarCursor.fixedToCamera = true;
					radarCursor.cameraOffset.setTo(cursorOffsetX, 100);			
					radarCursor.angle = angleCursor;
					console.log('radarcursor angle 2', angleCursor);
							
					radarMeters = this.add.text(0, 0, dist + " M", { font: "14px Arial", fill: "#ffffff", align: "center" });
					radarMeters.fixedToCamera = true;
					radarMeters.cameraOffset.setTo(cursorOffsetX - 15, 140);	
						
					cursorOffsetX += 60;
				} else {
					radarMeters.setText(dist + ' M');

				} 
			} else {
				scoreMultiplier = 1;
			}
		}
		
		/*for(var plr in players) 
		{
			console.log(newPlayerNick + " : " + players[plr].lat + " : " + players[plr].lng);
			
			if(player.lat !== 0 && player.lng !== 0) {
				var dist = this.distance(player.lat, player.lng, players[plr].lat, players[plr].lng, "k");
				// Afstand omrekenen naar m
				dist = dist * 1000;		

				console.log('dist: ' + dist);

				//	Als afstand kleiner dan 100 meter is
				if(dist <= range)
				{					
					console.log('dist', dist, ' kleiner dan ', range);

					// Radar cursor aanmaken
					radarCursor = this.add.sprite(0, 0, 'radarCursor');
					radarCursor.anchor.setTo(.5, .5);
					radarCursor.fixedToCamera = true;
					radarCursor.cameraOffset.setTo(cursorOffsetX, 100);						
					radarCursor.angle = angle;
						
					radarMeters = this.add.text(0, 0, dist + " M", { font: "14px Arial", fill: "#ffffff", align: "center" });
					radarMeters.fixedToCamera = true;
					radarMeters.cameraOffset.setTo(cursorOffsetX - 15, 140);	

					players[plr].frame = 6;
					
					cursorOffsetX += 60;
				} else {
					console.log('dist', dist, ' groter dan ', range);
				}
				//console.log(players[plr].nickname + players[plr].latitude + " ");
			}
		}*/
		
		//compareGPS(players[plr.session].latitude, players[plr.session].longitude, players[plr.session].name);		
	},

	createCoop: function(player1, player2, shoot, move, x, y, angle, type) {
		mergeIcon.visible = false;

		if(type == 'new') {
			coopSession = player1 + player2;
		}
		else {
			coopSession = player2 + player1;
		}

		if(player1 === io.socket.sessionid || player2 === io.socket.sessionid) {
			player.coop = true;
		}

		coopPlayers[coopSession] = this.add.sprite(this.world.centerX, this.world.centerY, 'coop');
		coopPlayers[coopSession].name = coopSession;
		coopPlayers[coopSession].player1 = player1;
		coopPlayers[coopSession].player2 = player2;
		coopPlayers[coopSession].coopSession = coopSession;
		coopPlayers[coopSession].move = move;
		coopPlayers[coopSession].shoot = shoot;
		coopPlayers[coopSession].anchor.setTo(.5, .5);
		coopPlayers[coopSession].enableBody = true;
		this.physics.enable(coopPlayers[coopSession], Phaser.Physics.ARCADE);
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
			coopPlayers[coopSession].frame = 2;
			coopMovement = true;
			coopShooting = false;
		} 

		if(coopPlayers[coopSession].shoot == io.socket.sessionid) {
			coopPlayers[coopSession].frame = 1;
			coopShooting = true;
			coopMovement = false;
			player.move = false;
		}

		if(player1 === io.socket.sessionid) {

			if(typeof player !== 'undefined') {
				player.coop = true;
				player.visible = false;
				player.renderable = false;
				player.allowControls = false;
				player.move = false;
				player.shoot = false;
				player.enableBody = false;
			}

			if(typeof players[player2] !== 'undefined') {
				players[player2].visible = false;
				players[player2].coop = true;
				players[player2].renderable = false;
				players[player2].enableBody = false;
			}

			this.camera.follow(coopPlayers[coopSession], Phaser.Camera.FOLLOW_TOPDOWN);

		} else if (player2 === io.socket.sessionid) {

			if(typeof player !== 'undefined') {
				player.coop = true;
				player.visible = false;
				player.renderable = false;
				player.allowControls = false;
				player.move = false;
				player.shoot = false;
				player.enableBody = false;
			}

			if(typeof players[player1] !== 'undefined') {
				players[player1].visible = false;
				players[player1].coop = true;
				players[player1].renderable = false;
				players[player1].enableBody = false;
			}

			this.camera.follow(coopPlayers[coopSession], Phaser.Camera.FOLLOW_TOPDOWN);

		} else {

			if(typeof players[player1] !== 'undefined') {
				players[player1].visible = false;
				players[player1].coop = true;
				players[player1].renderable = false;
				players[player1].enableBody = false;
				players[player1].allowControls = false;
			}

			if(typeof players[player2] !== 'undefined') {
				players[player2].visible = false;
				players[player2].coop = true;
				players[player2].renderable = false;
				players[player2].enableBody = false;
				players[player2].allowControls = false;
			}

		}

		if(type === 'new') {
			// Draai alles om, omdat player 1 dan de andere speler is..
			var coopData = JSON.stringify({
		        player1 : 	player2,
		        player2 : 	player1,
		        move 	: 	player2,
		        shoot 	: 	player1,
		        x 		: 	coopPlayers[coopSession].x,
		        y 		: 	coopPlayers[coopSession].y,
		        angle 	: 	coopPlayers[coopSession].angle
		    });
			socket.emit('newCoop', coopData, myRoom);
		}
	},

	updatePlayer: function(plr) {
		//console.log("Speler is een boss? : " + plr.boss);

		console.log(plr.session);
		
		if(plr.boss === true) {
			boss.x = players[plr.session].x;
			boss.y = players[plr.session].y;
			boss.angle = plr.angle;
			
	    	players[plr.session].x = plr.x;
	    	players[plr.session].y = plr.y;	
			players[plr.session].angle = plr.angle;
		}
		else if(plr.coop === true || plr.session.length > 20) {
			coopPlayers[plr.session].x = plr.x;
			coopPlayers[plr.session].y = plr.y;
			coopPlayers[plr.session].angle = plr.angle;
		} else {
	    	players[plr.session].x = plr.x;
	    	players[plr.session].y = plr.y;	
			players[plr.session].angle = plr.angle;
		}
	},

	fire: function(dir) {
		if(this.time.now > bulletTime) {
			bulletTime = this.time.now + 250;

			if(player.boss === true) {
				// Links
				var resetLeftX = boss.body.x + (boss.width * .25);
				var resetLeftY = boss.body.y + (boss.height * .25);
				var randomVelocity = 0;
				var bulletY = 0;

				var rotation = boss.rotation;

				var bulletLeft = JSON.stringify({
		            sessionid: io.socket.sessionid,
		            rotation: rotation,
		            nickname: playerName,
		            resetX: resetLeftX,
		            resetY: resetLeftY,
		            bulletY: bulletY,
		            randVelocity: randomVelocity
		        });
		        
		        socket.emit('bulletChange', bulletLeft, myRoom);

		        // Rechts
				var resetRightX = boss.body.x + (boss.width * .75);
				var resetRightY = boss.body.y + (boss.height * .75);
				var randomVelocity = 0;
				var bulletY = 0;

				var rotation = boss.rotation;

				var bulletRight = JSON.stringify({
		            sessionid: io.socket.sessionid,
		            rotation: rotation,
		            nickname: playerName,
		            resetX: resetRightX,
		            resetY: resetRightY,
		            bulletY: bulletY,
		            randVelocity: randomVelocity
		        });
		        
		        socket.emit('bulletChange', bulletRight, myRoom);
			} else {
				if(player.coop === true) {
		        	var resetX = coopPlayers[coopSession].body.x + (coopPlayers[coopSession].width / 2);
		        	var resetY = coopPlayers[coopSession].body.y + (coopPlayers[coopSession].height / 2);
		        	var rotation = coopPlayers[coopSession].rotation;
		        	var randomVelocity = (Math.random() * (-0.100 - 0.100) + 0.100);
		        	var bulletY = Math.floor((Math.random() * 40) + -20);
		        } else {          
		        	if(dir === 'left') {
		        		// Spawn bullet aan linker kant van schip
		        		var resetX = playerType.body.x + (playerType.width * .25);
		        		var resetY = playerType.body.y + (playerType.height * .25);
		        		var randomVelocity = 0;
		        		var bulletY = 0;
		        	} else if (dir === 'right') {	  
		        		// Spawn bullet aan rechter kant van schip      		
		        		var resetX = playerType.body.x + (playerType.width * .75);
		        		var resetY = playerType.body.y + (playerType.height * .75);
		        		var randomVelocity = 0;
		        		var bulletY = 0;
		        	}
		        	else {
		        		// Spawn bullet in het midden van schip
		        		var resetX = playerType.body.x + (playerType.width / 2);
		        		var resetY = playerType.body.y + (playerType.height / 2);
		        		var randomVelocity = (Math.random() * (-0.100 - 0.100) + 0.100);
		        		var bulletY = Math.floor((Math.random() * 40) + -20);
		        	}

		        	var rotation = playerType.rotation;
		        }
		        
		        var bulletPosition = JSON.stringify({
		            sessionid: io.socket.sessionid,
		            rotation: rotation,
		            nickname: playerName,
		            resetX: resetX,
		            resetY: resetY,
		            bulletY: bulletY,
		            randVelocity: randomVelocity
		        });
		        
		        socket.emit('bulletChange', bulletPosition, myRoom);
			}

	        if(SpaceBattalion.music) {
				this.laserShotSound.play();
			}
		}
	},

	explode: function(x, y) {
		explosion = this.add.sprite(x, y, 'explosion');
		explosion.anchor.setTo(0.5, 0.5);
		explosion.alpha = 0;

		this.add.tween(explosion).to( { alpha: 1 }, 100, Phaser.Easing.Linear.None, true, 0, 100, true);

		explosion.animations.add('explosion');
		explosion.play('explosion', '', false, true);

		if(SpaceBattalion.music) {
			this.explosionSound.play();
		}
	},

	bulletOtherPlayer: function(plr, blt) {
		
		blt.animations.play('bulletCollide');

		blt.events.onAnimationComplete.add(function() {

			//Jou kogel heeft iemand geraakt
			if (player.name == blt.session)
			{
				player.score += 10 * scoreMultiplier;
			}
			blt.kill();
		}, this);

		socket.emit('damagePlayer', players[plr.name].name, myRoom);
	},

	bulletPlayer: function(plr, blt) {
		blt.animations.play('bulletCollide');

		blt.events.onAnimationComplete.add(function() {
			blt.kill();
		}, this);
	},

	bulletCoop: function(plr, blt) {
		console.log('coop wordt geraakt');

		blt.animations.play('bulletCollide');

		blt.events.onAnimationComplete.add(function() {
			blt.kill();
		}, this);

		socket.emit('damagePlayer', coopPlayers[plr.name].name, myRoom);
	},

	bulletBoss: function(plr, blt) {
		if(!bossIsDying) {
			if(blt.session === io.socket.sessionid) {
				if(player.minion === false) {
					player.score += 10 * scoreMultiplier;
					//textScore.setText('Score: ' + player.score);
					var minion = false;
				} else {
					var minion = true;
				}
			} else {		
				if(players[blt.session].minion === false) {
					var minion = false;
				} else {
					var minion = true;
				}
			}

			if(minion === false) {
				boss.damage(100);

				boss.frame = 0;
			
				if(boss.health <= (70 / 100) * bossHealth  && boss.health > (40 / 100) * bossHealth) 
				{
					boss.tint = 0xFF9933;				
				} 
				else if(boss.health <= (40 / 100) * bossHealth && boss.health > 0)
				{
					boss.tint = 0xFF0000;	
				} 
				else if(boss.health <= 0) 
				{
					bossIsDying = true;

					boss.tint = 0xFFFFFF;		
					
					boss.alive = true;
					boss.visible = true;	
					boss.exists = true;	

					boss.animations.add('boss');
					boss.animations.play('boss', 8, false, true);

					var self = this;
					boss.events.onAnimationComplete.add(function() {
						socket.emit('bossDied', io.socket.sessionid, myRoom);
					});	
					player.score += 2000 * scoreMultiplier;
			
					console.log('Total score: '+player.score);
					$.ajax({
						type:"post",
						url:"http://buitmediasolutions.nl/spacebattalion/score.php",
						data:{id: window.playerObject.id, score: player.score},
						success:function(data){
							console.log(data);
							
						}
					});
				}
				
				setTimeout(function() {
					boss.frame = 1;
				}, 100);	
			}
		}

		blt.animations.play('bulletCollide');

		blt.events.onAnimationComplete.add(function() {
			blt.kill();
		}, this); 

		if(SpaceBattalion.music) {
			this.shipHitSound.play();
		}
	},

	overlapPlayer: function(plr, boss) {
		/*if(plr.minion === false && boss.move === true && playerType !== boss) {
			if(plr.name === io.socket.sessionid) {
				player.minion = true;
				player.frame = 12;
				player.health = 100;
				socket.emit('playerMinion', io.socket.sessionid);
			} else {
				players[plr.name].minion = true;
				players[plr.name].frame = 12;
				players[plr.name].health = 100;
				// Dit hoeft niet? Wordt gedaan in andere client waar players[plr.name] player is toch?
				// socket.emit('playerMinion', plr.name);
			}
		}*/
	},

	mergePlayers: function(event, sprite) {
		var playerFound = 0;

		// Pak alleen eerste player uit for loop
		if(playerFound == 0) {
			for(var plr in players) {
				if(this.physics.arcade.distanceBetween(players[plr], player) <= range * 2 && playerFound == 0) {
					// Ga na of jijzelf nog niet in co-op bent
					if(player.coop === false) {
						console.log('Ik ben nog niet in co-op modus');
						if(players[plr].coop === false) {
							console.log(players[plr].name + ' is ook nog niet in co-op modus');

							this.createCoop(player.name, players[plr].name, players[plr].name, player.name, '', '', '', 'new');
						}
					}
					/*if(player.coop === false && players[playerSession].coop === false) {
						console.log('oke, maak maar coop van');
						newCoop(player.name, players[playerSession].name, players[playerSession].name, player.name, 'new');
					}*/
					playerFound++;
				}
			}
		}
		//this.compareGPS(players[event.name].lat, players[event.name].lng, players[event.name].name);
	},

	tapScreen: function(pointer) {
		if(pointer.pageX >= 0 && pointer.pageX <= (SpaceBattalion.windowWidth / 2)) {
			this.fire('left');
		} else {
			this.fire('right');
		}
	},

	changePosition: function(xVal, xSpeed, yVal, ySpeed, angleVal, spriteVal) {
		if(spriteVal === 'p') {

			xSpeed == '' ? xSpeed = 0 : xSpeed;
		    ySpeed == '' ? ySpeed = 0 : ySpeed;

		    if(xVal == '+') { playerType.body.velocity.x += xSpeed; } 
		    else if(xVal == '-') { playerType.body.velocity.x -= xSpeed; } 
		    else { playerType.body.velocity.x += 0; }

		    if(yVal == '+') { playerType.body.velocity.y += ySpeed; } 
		    else if(yVal == '-') { playerType.body.velocity.y -= ySpeed; } 
		    else { playerType.body.velocity.y += 0; }

		    playerType.angle = angleVal;

		    if(oldX !== playerType.x || oldY !== playerType.y) {
			    	
			    // Particles achter schip
				if(this.game.device.desktop && playerType == 'player') {
					emitter = this.add.emitter(playerType.x, playerType.y, 1);
				    emitter.makeParticles('flyRail');

				    emitter.setRotation(0, 0);
				    emitter.setAlpha(0.3, 0.8);
				    emitter.setScale(0.8, 3);
				    emitter.gravity = 400;

				    emitter.start(true, 150, 100);
				}
			    
				this.world.bringToTop(playerGroup); 
				this.world.bringToTop(bossGroup); 
				
				if(playerType == boss)
				{
					var playerPosition = JSON.stringify({
						sessionid: io.socket.sessionid,
						nickname: playerName,
						x : playerType.x,
						y : playerType.y,
						angle : playerType.angle,
						isboss : true
					});   					
				}	
				else				
				{
					var playerPosition = JSON.stringify({
						sessionid: io.socket.sessionid,
						nickname: playerName,
						x : playerType.x,
						y : playerType.y,
						angle : playerType.angle,
						isboss : false
					});  				
				}
		                    


		        // Check if difference between x or y values is larger than 1
		        if(this.diffNumbers(playerType.x, oldX) >= 1 || this.diffNumbers(playerType.y, oldY) >= 1 ) {
		            
		            // Send positions to server every 200 ms (0.2 seconds)
		            /*setTimeout(function() {
		                socket.emit('positionChange', playerPosition);
		            }, 200);*/
		            
		            // Emit new position immediately, without delay
		            socket.emit('positionChange', playerPosition, myRoom);

		            // store the old positions in oldX and oldY
		            oldX = playerType.x;
		            oldY = playerType.y;
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
		        if(this.diffNumbers(coopPlayers[spriteVal].x, oldX) >= 1 || this.diffNumbers(coopPlayers[spriteVal].y, oldY) >= 1 ) {
		            
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
	},

	createCloud: function() {
	    // random getal tussen 1 en 10
	    var randCloud = Math.floor((Math.random() * 10) + 1);

	    if(randCloud < 5) {
	        //var cloud = game.add.sprite(-(Math.random() * random), game.world.randomY, 'cloud1');
	        var cloud = this.add.sprite(this.world.randomX, this.world.randomY, 'cloud1');
	    } else {
	        //var cloud = game.add.sprite(-(Math.random() * random), game.world.randomY, 'cloud2');
	        var cloud = this.add.sprite(this.world.randomX, this.world.randomY, 'cloud2');
	    }
	    
	    cloud.alpha = 0;
	    cloud.angle = this.rnd.angle();

	    /*this.add.tween(cloud).to( { alpha: 1 }, 2000, Phaser.Easing.Linear.None)
	    .to({ x: this.game.width + (1600 + cloud.x) }, 150000, Phaser.Easing.Linear.None)
	    .to({ angle: cloud.angle}, 150000, Phaser.Easing.Linear.None)
	    .start();*/

	    // wolk alleen laten spawnen (niet bewegen)
	    this.add.tween(cloud).to( { alpha: 1 }, 2000, Phaser.Easing.Linear.None).start();

	    // Spawn elke 5 sec een nieuwe wolk random
	    cloudTimer = this.time.now + 5000;
	    clouds.add(cloud);
	},

	createStar: function() {
		var star = this.add.sprite(this.world.randomX, this.world.randomY, 'star');

	    star.alpha = 0;
	    star.angle = this.rnd.angle();

	    this.add.tween(star).to( { alpha: 1 }, 1000, Phaser.Easing.Linear.None).start();

	    starTimer = this.time.now + 3000;
	    stars.add(star);
	},

	createMoon: function() {
		var randY = this.world.randomY;

	    // Make sure the moon is always fully within screen (height = 164, round to 300)
	    if(randY < 300) {
	        // Define new randomY with added height of moon
	        randY = randY + 164;
	    } else if(randY > 1700) {
	        randY = randY - 164;
	    } else {
	        randY = randY;
	    }

	    moon = this.add.sprite(this.world.randomX, randY, 'moon');

	    moon.alpha = 0;
	    moon.angle = this.rnd.angle();

	    this.add.tween(moon).to( { alpha: 1 }, 1000, Phaser.Easing.Linear.None)
	    .to({ x: this.game.width + (1600 + moon.x) }, 300000, Phaser.Easing.Linear.None)
	    .to({ angle: moon.angle}, 150000, Phaser.Easing.Linear.None)
	    .start();

	    //game.add.tween(moon).to( { alpha: 1 }, 1000, Phaser.Easing.Linear.None).start();
	},

	removePlayer: function(plr) {
		if (plr !== io.socket.sessionid) { 	
		   	// Check if player who disconnected was in coop mode
		    if(Object.getOwnPropertyNames(coopPlayers).length !== 0) {
		    	var self = this;
			    Object.keys(coopPlayers).forEach(function(key) {
				    if(key.indexOf(io.socket.sessionid) > -1) {

				       	coopPlayers[key].kill();
				    	coopMovement = false;
				       	player.coop = false;
				       	player.visible = true;
				       	player.allowControls = true;
				       	player.move = true;
				       	player.shoot = true;
				       	player.enableBody = true;
				       	self.camera.follow(player, Phaser.Camera.FOLLOW_TOPDOWN);	

				       	Object.keys(coopPlayers).forEach(function(key2) {
		        			if(key2.indexOf(key) > -1) {
		        				delete coopPlayers[key];
		        			}
		        		});
				   	}
				});
			} else {
		   		players[plr].kill();
		   	}
		}
	},

	createBullet: function(blt) {
		var bullet = bullets.getFirstDead();

	   	if(bullet) {
	        bullet.revive();
			
			if(this.game.device.desktop) {
		        // Muzzleflash
		        muzzleFlash = this.add.sprite(blt.resetX, blt.resetY, 'muzzleFlash');
				
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
				this.add.tween(muzzleFlash).to( { alpha: 1 }, 100, Phaser.Easing.Linear.None, true, 0, 100, true);
				
				// Muzzleflash wordt automatisch verwijdert na 200ms
				muzzleFlash.lifespan = 200;		
			}			

	        bullet.checkWorldBounds = true;
	        bullet.outOfBoundsKill = true;

	        bullet.reset(blt.resetX, blt.resetY);
	        bullet.rotation = blt.rotation;
	        bullet.y += blt.bulletY;
	        bullet.session = blt.session;

	        this.physics.arcade.velocityFromRotation(blt.rotation += blt.randVelocity, 1000, bullet.body.velocity);
	        //game.physics.arcade.velocityFromRotation(blt.rotation, 450, otherBullet.body.velocity);
	        bullet.animations.add('bulletCollide');

	        shakeScreen = 15;
	    }
	},

	revivePlayer: function(plr, myPlr) {
		console.log('overlap');

		deadTimer.stop();

		// Frame updaten
		// Nagaan of speler binnen range is
		var dist = this.distance(plr.lat, plr.lng, myPlr.lat, myPlr.lng, "M");

		myPlr.frame = 3;
		myPlr.health = 100;
		myPlr.alive = true;
		myPlr.allowControls = true;

		socket.emit('playerRevive', myPlr.name, myRoom);

		revived++;
	},

	diagonalSpeed: function(speed) {
    	var diagonalSpeed = Math.sqrt(Math.pow(speed, 2) * 2) / 2;
    	return diagonalSpeed;
	},

	compareGPS: function(playerLat, playerLong, playerSession) {
		if(playerLat !== '' && playerLong !== '') {
			// Afstand tussen player 1 en player 2 in km
			var dist = this.distance(latitude, longitude, playerLat, playerLong, "M");
			var angle = self.calcAngle(player.lat, player.lng, playerLat, playerLong);

			// Ga na of afstand binnen 'range' iss
			if(dist <= range && !isNaN(dist)) {
				// Ga na of te vergelijken speler niet jijzelf is (je kunt niet co-oppen met jezelf :p)
				if(playerSession != io.socket.sessionid) {
					console.log('Distance between YOU and ' + playerSession + ' is: ' + dist.toString() + ' meters.');

					// Ga na of jijzelf nog niet in co-op bent
					if(player.coop === false) {
						console.log('Ik ben nog niet in co-op modus');
						if(players[playerSession].coop === false) {
							console.log(playerSession + ' is ook nog niet in co-op modus');

							this.createCoop(player.name, players[playerSession].name, players[playerSession].name, player.name, '', '', '', 'new');
						}
					}
					/*if(player.coop === false && players[playerSession].coop === false) {
						console.log('oke, maak maar coop van');
						newCoop(player.name, players[playerSession].name, players[playerSession].name, player.name, 'new');
					}*/
				}
			} else {
				console.log('Distance between YOU and ' + players[playerSession].name + ' (' + dist + ') is greater than the given range (' + range + ').');
			}
		}
	},

	getLocation: function() {
		console.log('getting location');

		if(navigator.geolocation) {
			navigator.geolocation.watchPosition(this.foundPosition, function(error) {
	            console.log('OEPS', error.code);
	        }, {enableHighAccuracy: true});
		} else {
			console.log('Het ophalen van uw locatie is mislukt\nGPS wordt niet ondersteund op uw smart device.');
		}
	},

	foundPosition: function(position) {
		console.log('position lat', position.coords.latitude, 'long', position.coords.longitude);

		if(position.coords.latitude !== player.lat || position.coords.longitude !== player.lng) {
			player.lat = position.coords.latitude;
			player.lng = position.coords.longitude;
			
			// Vergelijk opnieuw afstand tussen andere spelers en mijzelf
			for(var plr in players) {
				if(players[plr].boss === false) {
					var dist = this.distance(player.lat, player.lng, players[plr].lat, players[plr].lng, "M");

					console.log('distance tussen mijzelf en andere: ' + dist);

					if(dist <= range) {
						console.log('dist', dist, 'kleiner dan', range);
						scoreMultiplier = 1.5;

						if(radarCursor == '' || radarCursor == null || typeof radarCursor == "undefined") {
							var angleCursor = this.calcAngle(player.lat, player.lng, players[plr].lat, players[plr].lng);

							// Radar cursor aanmaken
							radarCursor = this.add.sprite(0, 0, 'radarCursor');
							radarCursor.anchor.setTo(.5, .5);
							radarCursor.fixedToCamera = true;
							radarCursor.cameraOffset.setTo(cursorOffsetX, 100);							
							radarCursor.angle = angleCursor;
							console.log('radarcursor angle 3', angleCursor);

							radarMeters = this.add.text(0, 0, dist + " M", { font: "14px Arial", fill: "#ffffff", align: "center" });
							radarMeters.fixedToCamera = true;
							radarMeters.cameraOffset.setTo(cursorOffsetX - 15, 140);	

							players[plr.session].frame = 6;
								
							cursorOffsetX += 60;
						} else {
							radarMeters.setText(dist + ' M');
						}
					} else {	
						scoreMultiplier = 1;			
						console.log('dist', dist, ' groter dan ', range);
					}
				}
			}

			var updatedLocation = JSON.stringify({
				sessionid : io.socket.sessionid,
				lat : position.coords.latitude,
				long : position.coords.longitude
			});
			socket.emit('locationUpdate', updatedLocation, myRoom);			
		}
	},

	// Bron : http://www.geodatasource.com/developers/javascript
	distance: function(lat1, lon1, lat2, lon2, unit) {
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
	    if (unit=="M") { dist = ((dist * 1.609344) * 1000)};
	    return Math.round(dist);
	}, 

	randName: function() {
		var text = "";
	    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	    for( var i=0; i < 10; i++ )
	        text += possible.charAt(Math.floor(Math.random() * possible.length));

	    return text;
	},

	calcAngle: function(lat1, lng1, lat2, lng2) {
		var dLon = (lng2 - lng1);

		var y = Math.sin(dLon) * Math.cos(lat2);
	    var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

	    var brng = Math.atan2(y, x);

	    brng = brng * (180/Math.PI);
	    brng = (brng + 360) % 360;
	    brng = 360 - brng;

	    brng = this.math.wrapAngle(brng);

	    console.log('angle volgens functie: ', brng);

	    return brng;
	},

	diffNumbers: function(a, b) {
		return Math.abs(a - b);
	},

	render: function() {
		// FPS DEBUGGEN
		// this.game.debug.text('FPS: ' + this.time.fps, 80, 150, 'rgb(255,255,255)', '24px Courier');
	},

	shutdown: function() {
		SpaceBattalion.score = player.score;

		setTimeout(function() {
			player.destroy();
			boss.destroy();
			bullets.destroy();

			if(typeof stars != 'undefined') {				
				stars.destroy();
			}

			if(typeof moon != 'undefined') {				
				moon.destroy();
			}

			if(typeof clouds != 'undefined') {				
				clouds.destroy();
			}

			bgtile.destroy();
			playerGroup.destroy();
			bossGroup.destroy();

			if(typeof radarMeters != 'undefined') {
				radarMeters.destroy();
			}

			if(typeof mergeIcon != 'undefined') {
				mergeIcon.destroy();
			}

			textPlayers 	= '';
			textScore 		= '';
			playerType		= null;			

			movementSpeed	= 0;

			players 		= {};
			coopPlayers 	= {};
			onlinePlayers	= [];

			// Switch state
			game.state.start('GameEnd', true, false);
		}, 2000);
	},
};