SpaceBattalion.GameEnd = function (game) {	

};

SpaceBattalion.GameEnd.prototype = {

	create: function() {
		this.stage.disableVisibilityChange = true;
		
		alert('Game ended!\n\nBoss died');

		this.state.start('MainMenu');
	},

	update: function() {
	}
}