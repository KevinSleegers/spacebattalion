SpaceBattalion.Preloader = function (game) {
	this.background = null;
	this.preloadBar = null;

	this.ready = false;
};

SpaceBattalion.Preloader.prototype = {
	preload: function() {
		// Sprites inladen voor loading screen
		this.preloadBar = this.add.sprite(this.world.centerX, this.world.centerY, 'preloaderBar');
		this.preloadBar.anchor.setTo(0, .5);
		this.preloadBar.scale.setTo(.5, 1);
		this.preloadBar.x = this.world.centerX - this.preloadBar.width / 2;		
		this.preloadBar.y = this.world.centerY - this.preloadBar.height / 2;

		this.load.setPreloadSprite(this.preloadBar);

		// Sprites, audio etc inladen voor daadwerkelijke game
	    this.load.spritesheet('mainBg', 'assets/img/spr_backgroundOverlay.png', 160, 160);
		this.load.spritesheet('player', 'assets/img/spr_plane_strip11.png', 64, 64);
		this.load.spritesheet('ns', 'assets/img/spr_ns_strip11.png', 64, 64);
		this.load.spritesheet('wk', 'assets/img/spr_wk_strip11.png', 64, 64);
		this.load.spritesheet('otherPlayers', 'assets/img/spr_plane_strip2.png', 64, 64);
		this.load.spritesheet('boss', 'assets/img/spr_boss_die_strip13.png', 128, 256);
		this.load.spritesheet('coop', 'assets/img/spr_double_final_strip4.png', 96, 128);
		this.load.spritesheet('minion', 'assets/img/spr_minion_strip3.png', 64, 64);
		this.load.spritesheet('explosion', 'assets/img/fx_explosion_strip10.png', 64, 64);
		this.load.spritesheet('bullet', 'assets/img/fx_bullet_impact_strip7.png', 32, 32);
	    this.load.spritesheet('button', 'assets/img/spr_button.png', 659, 97);

		this.load.image('star', 'assets/img/spr_star.png');
	    this.load.image('muzzleFlash', 'assets/img/spr_muzzleFlash.png');
	    this.load.image('flyRail', 'assets/img/fly_rail.png');
	    this.load.image('cloud1', 'assets/img/spr_cloud1.png');
	    this.load.image('cloud2', 'assets/img/spr_cloud2.png');
	    this.load.image('moon', 'assets/img/spr_moon.png');
	    this.load.image('radarCursor', 'assets/img/radar_cursor.png');
	    this.load.image('mergeButton', 'assets/img/mergeButton.png');
	    
	    this.load.audio('loadingMusic', ['assets/audio/Baseview.mp3', 'assets/audio/Baseview.ogg']);
	    this.load.audio('backgroundMusic', ['assets/audio/TakingFlight.mp3', 'assets/audio/TakingFlight.ogg']);
		this.load.audio('explosionSound', ['assets/audio/SFX/explosion.mp3', 'assets/audio/SFX/explosion.ogg']);
		this.load.audio('laserShotSound', ['assets/audio/SFX/LaserShot.mp3', 'assets/audio/SFX/LaserShot.ogg']);
		this.load.audio('menuClickSound', ['assets/audio/SFX/menuClick.mp3', 'assets/audio/SFX/menuClick.ogg']);
		this.load.audio('portalSound', 'assets/audio/SFX/portalSound.ogg');
		this.load.audio('shipHitSound', ['assets/audio/SFX/shipHit.mp3', 'assets/audio/SFX/shipHit.ogg']);

		this.load.bitmapFont('C64', 'assets/fonts/font.png', 'assets/fonts/font.fnt');
		
		
	},
	loadUpdate: function() {
		window.progressbar = this.load.progress
		$('.loader span').animate({"width":window.progressbar+"%"}, 200,function(){
			//$('.loader span').text(window.progressbar+'%');	
		});
		
		
	},

	create: function() {
		this.preloadBar.cropEnabled = false;

		this.stage.disableVisibilityChange = true;
	},

	update: function() {
		// Voortgang in percentage -> this.load.progress
		//console.log('voortgang', this.load.progress);
		if(this.cache.isSoundDecoded('backgroundMusic') && 
			this.cache.isSoundDecoded('loadingMusic') 	&&
			this.cache.isSoundDecoded('explosionSound') &&
			this.cache.isSoundDecoded('laserShotSound') &&
			this.cache.isSoundDecoded('menuClickSound') &&
			this.cache.isSoundDecoded('shipHitSound') 	&& 
			this.ready == false) 
		{
			this.ready = true;
			$('.loader span').stop();
			$('.loader span').animate({"width":"100%"}, 200);
			$('.payoff').fadeOut(200);
			this.state.start('MainMenu');
			
			var loadbar = setInterval(function(){
				var width = $('.loader span').width();
				var parentWidth = $('.loader span').offsetParent().width();
				var percent = 100*width/parentWidth;
				//console.log(percent);
				if(percent >= 99)
				{
					clearInterval(loadbar);
					window.startbutton = 1;
					
					$('.loader').animate({"height":"40px"},200,function(){
						$('.loader span').text('Start Game');	
					});
					$('.menulist').fadeIn(200);
					window.getLocation();
				}
			}, 200);

			
		}
	}
};