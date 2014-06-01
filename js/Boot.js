var SpaceBattalion = {
	score: 0,
	music: true,
	orientated: false,
	windowWidth: window.innerWidth,
	windowHeight: window.innerHeight,
	background: null
};

SpaceBattalion.Boot = function (game) {

};

SpaceBattalion.Boot.prototype = {
	preload: function() {
		this.load.image('preloaderBar', 'assets/img/preloadbar.png');
	    this.load.image('portraitMode', 'assets/img/portrait_mode.png');
	},

	create: function() {
		this.input.maxPointers = 1;
		this.stage.disableVisibilityChange = true;

		if(this.game.device.desktop) {
			this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
			this.scale.pageAlignHorizontally = true;
		}
		else {
			this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
			this.scale.minWidth = 150;
			this.scale.minHeight = 250;
			this.scale.maxWidth = SpaceBattalion.windowWidth;
			this.scale.maxHeight = SpaceBattalion.windowHeight;
			this.scale.pageAlignHorizontally = true;
			this.scale.pageAlignVertically = true;
			this.scale.forceOrientation(true, false, 'portraitMode');
			this.scale.hasResized.add(this.gameResized, this);
			this.scale.enterIncorrectOrientation.add(this.enterIncorrectOrientation, this);
			this.scale.leaveIncorrectOrientation.add(this.leaveIncorrectOrientation, this);
			this.scale.setScreenSize(true);
		}

		this.state.start('Preloader');
	},

	gameResized: function (width, height) {

	},

	enterIncorrectOrientation: function() {
		SpaceBattalion.orientated = false;
	},

	leaveIncorrectOrientation: function() {
		SpaceBattalion.orientated = true;
	}
}