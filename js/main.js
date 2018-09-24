//this game will have only 1 state
var GameState = {

	//initiate game settings
	init: function () {
		//adapt to screen size, fit all the game
		this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
		this.scale.pageAlignHorizontally = true;
		this.scale.pageAlignVertically = true;

		this.game.physics.startSystem(Phaser.Physics.ARCADE);
		this.game.physics.arcade.gravity.y = 1000

		this.cursors = this.game.input.keyboard.createCursorKeys();
	},

	//load the game assets before the game starts
	preload: function () {
		this.load.image('background', 'assets/images/bg.png');

		this.load.image('ground', 'assets/images/ground.png');
		this.load.image('platform', 'assets/images/platform.png');
		this.load.image('goal', 'assets/images/gorilla3.png');
		this.load.image('arrowButton', 'assets/images/arrowButton.png');
		this.load.image('actionButton', 'assets/images/actionButton.png');
		this.load.image('barrel', 'assets/images/barrel.png');

		this.load.spritesheet('player', 'assets/images/player_spritesheet.png', 28, 30, 5, 1, 1);
		this.load.spritesheet('fire', 'assets/images/fire_spritesheet.png', 20, 21, 2, 1, 1);

		for (i = 1; i <= game.levelsCount; i++) {
			this.load.text('level' + i, 'assets/data/level' + i + '.json');
		}
	},
	//executed after everything is loaded
	create: function () {
		//parse the file
		this.levelData = JSON.parse(this.game.cache.getText('level' + game.level));

		this.RUNNING_SPEED = this.levelData.running_speed;
		this.JUMPING_SPEED = this.levelData.jumping_speed;

		this.game.world.setBounds(0, 0, 360, this.levelData.world_height);

		this.background = this.add.sprite(0, 0, 'background');

		this.ground = this.add.sprite(0, this.levelData.world_height - 5, 'ground');
		this.game.physics.arcade.enable(this.ground);
		this.ground.body.allowGravity = false;
		this.ground.body.immovable = true;

		this.platforms = this.add.group();
		this.platforms.enableBody = true;

		this.levelData.platformData.forEach(function (element) {
			this.platforms.create(element.x, element.y, 'platform');
			this.lastPlatform = element.y;
		}, this);

		this.platforms.setAll('body.immovable', true);
		this.platforms.setAll('body.allowGravity', false);

		//fires
		this.fires = this.add.group();
		this.fires.enableBody = true;

		var fire;
		this.levelData.fireData.forEach(function (element) {
			fire = this.fires.create(element.x, element.y, 'fire');
			fire.animations.add('fire', [0, 1], 4, true);
			fire.play('fire');
		}, this);

		this.fires.setAll('body.allowGravity', false);

		//goal
		this.goal = this.add.sprite(this.levelData.goal.x, this.lastPlatform - 50, 'goal');
		this.game.physics.arcade.enable(this.goal);
		this.goal.body.allowGravity = false;
		if (this.levelData.goal.direction == 'left') {
			this.goal.scale.setTo(-1, 1);
		}

		//create player
		this.player = this.add.sprite(this.levelData.playerStart.x, this.levelData.playerStart.y, 'player', 3);
		this.player.anchor.setTo(0.5);
		this.player.scale.setTo(-1, 1);
		this.player.animations.add('walking', [0, 1, 2, 1], 6, true);
		this.game.physics.arcade.enable(this.player);
		this.player.customParams = {};
		this.player.body.collideWorldBounds = true;

		this.game.camera.follow(this.player);

		this.createOnscreenControls();

		this.barrels = this.add.group();
		this.barrels.enableBody = true;

		this.createBarrel();
		this.barrelCreator = this.game.time.events.loop(Phaser.Timer.SECOND * this.levelData.barrelFrequency, this.createBarrel, this)


		//  Level Text
		var levelText = game.add.text(200, 500, 'Level: ' + game.level, {
			font: "32px Arial",
			fill: "#ffffff",
			align: "center"
		});
		levelText.fixedToCamera = true;
		levelText.cameraOffset.setTo(235, 10);
	},
	update: function () {
		this.game.physics.arcade.collide(this.player, this.ground);
		this.game.physics.arcade.collide(this.player, this.platforms);

		this.game.physics.arcade.collide(this.barrels, this.ground);
		this.game.physics.arcade.collide(this.barrels, this.platforms);

		this.game.physics.arcade.overlap(this.player, this.fires, this.killPlayer);
		this.game.physics.arcade.overlap(this.player, this.barrels, this.killPlayer);
		this.game.physics.arcade.overlap(this.player, this.goal, this.win);

		this.player.body.velocity.x = 0;

		if (this.cursors.left.isDown || this.player.customParams.isMovingLeft) {
			this.player.body.velocity.x = -this.RUNNING_SPEED;
			this.player.scale.setTo(1, 1);
			this.player.play('walking');
		} else if (this.cursors.right.isDown || this.player.customParams.isMovingRight) {
			this.player.body.velocity.x = this.RUNNING_SPEED;
			this.player.scale.setTo(-1, 1);
			this.player.play('walking');
		} else {
			this.player.animations.stop();
			this.player.frame = 3;
		}

		if ((this.cursors.up.isDown || this.player.customParams.mustJump) && this.player.body.touching.down) {
			this.player.body.velocity.y = -this.JUMPING_SPEED;
			this.player.customParams.mustJump = false;
			if (this.player.customParams.isMovingRight) this.player.frame = 10;
			else this.player.frame = 5;
		}

		this.barrels.forEach(function (element) {
			if (element.x < 0 && element.y > 600) {
				element.kill();
			}
		}, this);
	},
	createOnscreenControls: function () {
		this.leftArrow = this.add.button(80, 570, 'arrowButton');
		this.rightArrow = this.add.button(90, 570, 'arrowButton');
		this.actionButton = this.add.button(290, 570, 'actionButton');

		this.leftArrow.alpha = 0.5;
		this.rightArrow.alpha = 0.5;
		this.actionButton.alpha = 0.5;

		this.leftArrow.scale.setTo(-1, 1);
		this.leftArrow.fixedToCamera = true;
		this.rightArrow.fixedToCamera = true;
		this.actionButton.fixedToCamera = true;

		this.actionButton.events.onInputDown.add(function () {
			this.player.customParams.mustJump = true;
		}, this);

		this.actionButton.events.onInputUp.add(function () {
			this.player.customParams.mustJump = false;
		}, this);

		//left
		this.leftArrow.events.onInputDown.add(function () {
			this.player.customParams.isMovingLeft = true;
		}, this);

		this.leftArrow.events.onInputUp.add(function () {
			this.player.customParams.isMovingLeft = false;
		}, this);

		this.leftArrow.events.onInputOver.add(function () {
			this.player.customParams.isMovingLeft = true;
		}, this);

		this.leftArrow.events.onInputOut.add(function () {
			this.player.customParams.isMovingLeft = false;
		}, this);

		//right
		this.rightArrow.events.onInputDown.add(function () {
			this.player.customParams.isMovingRight = true;
		}, this);

		this.rightArrow.events.onInputUp.add(function () {
			this.player.customParams.isMovingRight = false;
		}, this);

		this.rightArrow.events.onInputOver.add(function () {
			this.player.customParams.isMovingRight = true;
		}, this);

		this.rightArrow.events.onInputOut.add(function () {
			this.player.customParams.isMovingRight = false;
		}, this);
	},
	killPlayer: function (player, fire) {
		game.lives = 3;
		game.state.start('GameState');
	},
	win: function (player, goal) {
		if (game.level < game.levelsCount) {
			game.level = game.level + 1;
			game.state.start('GameState');
		} else {
			game.state.start('Win');
		}

	},
	createBarrel: function () {
		//give me the first dead sprite
		var barrel = this.barrels.getFirstExists(false);

		if (!barrel) {
			barrel = this.barrels.create(0, 0, 'barrel');
		}

		barrel.body.collideWorldBounds = true;
		barrel.body.bounce.set(1, 0);

		if (this.levelData.goal.direction == 'left') {
			barrel.reset(this.goal.x - 35, this.goal.y + 20);
			barrel.body.velocity.x = -this.levelData.barrelSpeed;
		} else {
			barrel.reset(this.goal.x + 35, this.goal.y + 20);
			barrel.body.velocity.x = this.levelData.barrelSpeed;
		}

		this.game.physics.arcade.enable(this.goal);
		this.goal.body.allowGravity = false;
	}

};

//initiate the Phaser framework
var game = new Phaser.Game(360, 640, Phaser.AUTO);
game.lives = 3;
game.level = 1;
game.levelsCount = 4;
game.state.add('GameState', GameState);
game.state.start('GameState');