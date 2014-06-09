SpaceBattalion.MainMenu = function (game) {	

};

SpaceBattalion.MainMenu.prototype = {

	create: function() {
		this.backgroundImage = this.add.tileSprite(0, 0, SpaceBattalion.windowWidth, SpaceBattalion.windowHeight, 'mainBg');

		this.music = this.add.audio('loadingMusic');
		//this.music.play('', 0, 1, true);

		/*this.startButton = this.add.button(this.world.centerX, this.world.centerY, 'button', this.startGame, this, 1, 0, 2);
		this.startButton.x = this.world.centerX - this.startButton.width/2;
		this.startButton.y = (this.world.centerY - this.startButton.height/2) - 225;
		this.makeText(this.startButton, 'Start game');

		this.controlsButton = this.add.button(this.world.centerX, this.world.centerY, 'button', '', this, 1, 0, 2);
		this.controlsButton.x = this.world.centerX - this.controlsButton.width/2;
		this.controlsButton.y = (this.world.centerY - this.controlsButton.height/2) - 75;
		this.makeText(this.controlsButton, 'Controls');

		this.statisticsButton = this.add.button(this.world.centerX, this.world.centerY, 'button', '', this, 1, 0, 2);
		this.statisticsButton.x = this.world.centerX - this.statisticsButton.width/2;
		this.statisticsButton.y = (this.world.centerY - this.statisticsButton.height/2) + 75;
		this.makeText(this.statisticsButton, 'Statistics');

		this.toggleSoundButton = this.add.button(this.world.centerX, this.world.centerY, 'button', this.toggleSound, this, 1, 0, 2);
		this.toggleSoundButton.x = this.world.centerX - this.toggleSoundButton.width/2;
		this.toggleSoundButton.y = (this.world.centerY - this.toggleSoundButton.height/2) + 225;
		this.makeText(this.toggleSoundButton, 'Sound off');*/

		this.startButton = this.add.button(this.world.centerX, this.world.centerY, '', this.startGame, this, 1, 0, 2);
		this.startButton.x = this.world.centerX - this.startButton.width/2;
		this.startButton.y = (this.world.centerY - this.startButton.height/2) - 105;
		this.makeText(this.startButton, 'Start game');

		this.controlsButton = this.add.button(this.world.centerX, this.world.centerY, '', '', this, 1, 0, 2);
		this.controlsButton.x = this.world.centerX - this.controlsButton.width/2;
		this.controlsButton.y = (this.world.centerY - this.controlsButton.height/2) - 35;
		this.makeText(this.controlsButton, 'Controls');

		this.statisticsButton = this.add.button(this.world.centerX, this.world.centerY, '', '', this, 1, 0, 2);
		this.statisticsButton.x = this.world.centerX - this.statisticsButton.width/2;
		this.statisticsButton.y = (this.world.centerY - this.statisticsButton.height/2) + 35;
		this.makeText(this.statisticsButton, 'Statistics');

		this.toggleSoundButton = this.add.button(this.world.centerX, this.world.centerY, '', this.toggleSound, this, 1, 0, 2);
		this.toggleSoundButton.x = this.world.centerX - this.toggleSoundButton.width/2;
		this.toggleSoundButton.y = (this.world.centerY - this.toggleSoundButton.height/2) + 105;
		this.makeText(this.toggleSoundButton, 'Sound off');
	},

	update: function() {
		if(this.game.device.desktop) {
			this.backgroundImage.tilePosition.x -= 2;
	   	 	this.backgroundImage.tilePosition.y += 1;
		}

		// Als window niet in focus is
		var self = this;
		window.onblur = function() {
			self.music.pause();
		}

		// Als window wel in focus is
		var self = this;
		window.onfocus = function() {
			if(SpaceBattalion.music) {
				self.music.resume();
			}
		}
	},

	startGame: function(pointer) {
		this.music.stop();

		this.state.start('Game');
	},

	makeText: function(button, text) {
		var label = this.add.bitmapText(button.x, button.y, 'C64', text, 48);	
		//label.tint = '0x2e2e2e';
		label.tint = '0xd77e00';
		label.updateText();
		label.x = button.width / 2 - label.textWidth / 2;
		label.y = button.height / 2 - label.textHeight / 2 + 7;
		label.align = 'center';

		button.addChild(label);
	},

	toggleSound: function(button) {
		if(this.music.isPlaying) {
			this.music.pause();
			button.children[0].setText('Sound on');			
			button.children[0].updateText();
			button.children[0].x = button.width / 2 - button.children[0].textWidth / 2;
			SpaceBattalion.music = false;
		} else {
			this.music.resume();
			button.children[0].setText('Sound off');			
			button.children[0].updateText();
			button.children[0].x = button.width / 2 - button.children[0].textWidth / 2;
			SpaceBattalion.music = true;
		}
	}
}