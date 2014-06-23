SpaceBattalion.GameEnd = function (game) {	

};

SpaceBattalion.GameEnd.prototype = {

	create: function() {
		this.stage.disableVisibilityChange = true;

		var scoreString = 'SCORE: ' + SpaceBattalion.score;

		var centerX = SpaceBattalion.windowWidth / 2;
		var centerY = SpaceBattalion.windowHeight / 2;
		
		this.backgroundImage = this.add.tileSprite(0, 0, SpaceBattalion.windowWidth, SpaceBattalion.windowHeight, 'mainBg');
		
		var header = this.add.bitmapText(centerX, centerY - 125, 'C64', 'GAME OVER', 50);
		header.align = 'center';
		header.tint = '0xff7102';
		header.x = centerX - header.textWidth / 2;

		if(window.shutdown === boss) {
			var text = 'BOSS DIED';
			var subHeader = this.add.bitmapText(centerX, centerY - 50, 'C64', text, 40);
			subHeader.align = 'center';
			subHeader.tint = '0xe6e500';
			subHeader.x = centerX - subHeader.textWidth / 2;
		} else if(window.shutdown === minion) {
			var text = 'PLAYERS DIED';
			var subHeader = this.add.bitmapText(centerX, centerY - 50, 'C64', text, 40);
			subHeader.align = 'center';
			subHeader.tint = '0xe6e500';
			subHeader.x = centerX - subHeader.textWidth / 2;
		}		

		var scoreText = this.add.bitmapText(centerX, centerY, 'C64', scoreString, 45);
		scoreText.align = 'center';
		scoreText.x = centerX - scoreText.textWidth / 2;

		this.homeButton = this.add.button(centerX, centerY + 75, '', this.homeRedirect, this, 1, 0, 2);
		this.homeButton.x = centerX - this.homeButton.width / 2;
		this.makeText(this.homeButton, 'HOME');
	},

	makeText: function(button, text) {
		var label = this.add.bitmapText(button.x, button.y, 'C64', text, 35);	
		//label.tint = '0x2e2e2e';
		label.tint = '0xd77e00';
		label.updateText();
		label.x = button.width / 2 - label.textWidth / 2;
		label.y = button.height / 2 - label.textHeight / 2 + 7;
		label.align = 'center';

		button.addChild(label);
	},

	homeRedirect: function() {
		console.log('back to home');
		window.location.href = 'index.html';
	},

	update: function() {
		if(this.game.device.desktop) {
			this.backgroundImage.tilePosition.x -= 2;
	   	 	this.backgroundImage.tilePosition.y += 1;
		}
	}
}