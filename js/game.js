

var Colors = {
	cherry: 0xe35d6a,
	blue: 0x00205B,
	white: 0xd8d0d1,
	black: 0x000000,
	brown: 0x59332e,
	peach: 0xffdab9,
	yellow: 0xffff00,
	olive: 0x556b2f,
	grey: 0x696969,
	sand: 0xc2b280,
	brownDark: 0x23190f,
	green: 0x669900,
	black: 0x000000
};

var deg2Rad = Math.PI / 180;

// Make a new world when the page is loaded.
window.addEventListener('load', function(){
	new World();
});

function World() {

	// Explicit binding of this even in changing contexts.
	var self = this;

	// Scoped variables in this world.
	var element, scene, camera, character, renderer, light,
		objects, paused, keysAllowed, score, 
		questionBoxes, questions, question_id, correct_count, difficulty,
		treePresenceProb, maxTreeSize, fogDistance, gameOver;

	// Initialize the world.
	init();
	
	/**
	  * Builds the renderer, scene, lights, camera, and the character,
	  * then begins the rendering loop.
	  */
	function init() {

		// Locate where the world is to be located on the screen.
		element = document.getElementById('world');

		// Initialize the renderer.
		renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: true
		});
		renderer.setSize(element.clientWidth, element.clientHeight);
		renderer.shadowMap.enabled = true;
		element.appendChild(renderer.domElement);

		// Initialize the scene.
		scene = new THREE.Scene();
		fogDistance = 40000;
		scene.fog = new THREE.Fog(0xbadbe4, 1, fogDistance);

		// Initialize the camera with field of view, aspect ratio,
		// near plane, and far plane.
		camera = new THREE.PerspectiveCamera(
			60, element.clientWidth / element.clientHeight, 1, 120000);
		camera.position.set(0, 1500, -2000);
		camera.lookAt(new THREE.Vector3(0, 600, -5000));
		window.camera = camera;

		// Set up resizing capabilities.
		window.addEventListener('resize', handleWindowResize, false);

		// Initialize the lights.
		light = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
		scene.add(light);

		// Initialize the character and add it to the scene.
		character = new Character();
		scene.add(character.element);

		var ground = createBox(3000, 20, 120000, Colors.sand, 0, -400, -60000);
		scene.add(ground);

		objects = [];
		questionBoxes = [];

		question_id = 0;
		treePresenceProb = 0.4;
		maxTreeSize = 0.5;
		questions = parseQuestions()
			.then(questions => {
				for (var i = 10; i < 40; i++) {
					question_id = createRowofObstacles(questions, question_id, i * -3000, treePresenceProb, 0.5, maxTreeSize);
				}
			});

		// The game is paused to begin with and the game is not over.
		gameOver = false;
		paused = true;

		// Start receiving feedback from the player.
		var left = 37;
		var up = 38;
		var right = 39;
		var p = 80;
		
		keysAllowed = {};
		document.addEventListener(
			'keydown',
			function(e) {
				if (!gameOver) {
					var key = e.keyCode;
					if (keysAllowed[key] === false) return;
					keysAllowed[key] = false;
					if (paused && !collisionsDetected() && key > 18) {
						paused = false;
						character.onUnpause();
						document.getElementById(
							"variable-content").style.visibility = "hidden";
						document.getElementById(
							"controls").style.display = "none";
					} else {
						if (key == p) {
							paused = true;
							character.onPause();
							document.getElementById(
								"variable-content").style.visibility = "visible";
							document.getElementById(
								"variable-content").innerHTML = 
								"Game is paused. Press any key to resume.";
						}
						if (key == up && !paused) {
							character.onUpKeyPressed();
						}
						if (key == left && !paused) {
							character.onLeftKeyPressed();
						}
						if (key == right && !paused) {
							character.onRightKeyPressed();
						}
					}
				}
			}
		);
		document.addEventListener(
			'keyup',
			function(e) {
				keysAllowed[e.keyCode] = true;
			}
		);
		document.addEventListener(
			'focus',
			function(e) {
				keysAllowed = {};
			}
		);

		// Initialize the scores and difficulty.
		score = 0;
		correct_count = 0;
		difficulty = 0;
		document.getElementById("score").innerHTML = score;
		document.getElementById("correct").innerHTML = correct_count;

		// Begin the rendering loop.
		loop();

	}
	
	/**
	  * The main animation loop.
	  */
	function loop() {

		// Update the game.
		if (!paused) {

			// Add more trees and increase the difficulty
			if ((objects.length > 1) && (objects[objects.length - 1].mesh.position.z) % 3000 == 0) {
				difficulty += 1;
				var levelLength = 30;
				if (difficulty % levelLength == 0) {
					var level = difficulty / levelLength;
					switch (level) {
						case 1:
							treePresenceProb = 0.35;
							maxTreeSize = 0.5;
							break;
						case 2:
							treePresenceProb = 0.35;
							maxTreeSize = 0.85;
							break;
						case 3:
							treePresenceProb = 0.5;
							maxTreeSize = 0.85;
							break;
						case 4:
							treePresenceProb = 0.5;
							maxTreeSize = 1.1;
							break;
						case 5:
							treePresenceProb = 0.5;
							maxTreeSize = 1.1;
							break;
						case 6:
							treePresenceProb = 0.55;
							maxTreeSize = 1.1;
							break;
						default:
							treePresenceProb = 0.55;
							maxTreeSize = 1.25;
					}
				}
				if ((difficulty >= 5 * levelLength && difficulty < 6 * levelLength)) {
					fogDistance -= (25000 / levelLength);
				} else if (difficulty >= 8 * levelLength && difficulty < 9 * levelLength) {
					fogDistance -= (5000 / levelLength);
				}
				question_id = createRowofObstacles(questions, question_id, -120000, treePresenceProb, 0.5, maxTreeSize);
				scene.fog.far = fogDistance;
			}

			// Move the obstcles closer to the character.
			objects.forEach(function(object) {
				object.mesh.position.z += 60;
			});
			questionBoxes.forEach(function(questionBox) {
				questionBox.mesh.position.z += 30;
			});


			// Remove obstacles that are outside of the world.
			objects = objects.filter(function(object) {
				return object.mesh.position.z < 0;
			});
			questionBoxes = questionBoxes.filter(function(box) {
				return box.mesh.position.z < 0;
			});



			// Make the character move according to the controls.
			character.update();

			// Check for collisions between the character and objects.
			if (correctAnswersDetected()) {
				correct_count += 1;
				score += 1000;
			}
			if (collisionsDetected()) {
				gameOver = true;
				paused = true;
				document.addEventListener(
        			'keydown',
        			function(e) {
        				if (e.keyCode == 40)
            			document.location.reload(true);
        			}
    			);
    			var variableContent = document.getElementById("variable-content");
    			variableContent.style.visibility = "visible";
    			variableContent.innerHTML = 
    				"Game over! Press the down arrow to try again.";
    			var table = document.getElementById("ranks");
    			var rankNames = ["Typical Steward", "Couch Potato", "Weekend Jogger", "Daily Runner",
    				"Local Prospect", "Regional Star", "National Champ", "Second Mo Farah"];
    			var rankIndex = Math.floor(score / 15000);

				// If applicable, display the next achievable rank.
				if (score < 124000) {
					var nextRankRow = table.insertRow(0);
					nextRankRow.insertCell(0).innerHTML = (rankIndex <= 5)
						? "".concat((rankIndex + 1) * 15, "k-", (rankIndex + 2) * 15, "k")
						: (rankIndex == 6)
							? "105k-124k"
							: "124k+";
					nextRankRow.insertCell(1).innerHTML = "*Score within this range to earn the next rank*";
				}

				// Display the achieved rank.
				var achievedRankRow = table.insertRow(0);
				achievedRankRow.insertCell(0).innerHTML = (rankIndex <= 6)
					? "".concat(rankIndex * 15, "k-", (rankIndex + 1) * 15, "k").bold()
					: (score < 124000)
						? "105k-124k".bold()
						: "124k+".bold();
				achievedRankRow.insertCell(1).innerHTML = (rankIndex <= 6)
					? "Congrats! You're a ".concat(rankNames[rankIndex], "!").bold()
					: (score < 124000)
						? "Congrats! You're a ".concat(rankNames[7], "!").bold()
						: "Congrats! You exceeded the creator's high score of 123790 and beat the game!".bold();

    			// Display all ranks lower than the achieved rank.
    			if (score >= 120000) {
    				rankIndex = 7;
    			}
    			for (var i = 0; i < rankIndex; i++) {
    				var row = table.insertRow(i);
    				row.insertCell(0).innerHTML = "".concat(i * 15, "k-", (i + 1) * 15, "k");
    				row.insertCell(1).innerHTML = rankNames[i];
    			}
    			if (score > 124000) {
    				var row = table.insertRow(7);
    				row.insertCell(0).innerHTML = "105k-124k";
    				row.insertCell(1).innerHTML = rankNames[7];
    			}

			}

			// Update the scores.
			score += 10;
			correct_count = correct_count//3;
			document.getElementById("score").innerHTML = score;
			document.getElementById("correct").innerHTML = correct_count;
		}

		// Render the page and repeat.
		renderer.render(scene, camera);
		requestAnimationFrame(loop);
	}

	/**
	  * A method called when window is resized.
	  */
	function handleWindowResize() {
		renderer.setSize(element.clientWidth, element.clientHeight);
		camera.aspect = element.clientWidth / element.clientHeight;
		camera.updateProjectionMatrix();
	}

	/**
	 * Creates and returns a row of trees according to the specifications.
	 *
	 * @param {number} POSITION The z-position of the row of trees.
 	 * @param {number} PROBABILITY The probability that a given lane in the row
 	 *                             has a tree.
 	 * @param {number} MINSCALE The minimum size of the trees. The trees have a 
 	 *							uniformly distributed size from minScale to maxScale.
 	 * @param {number} MAXSCALE The maximum size of the trees.
 	 *
	 */

	function createRowOfTrees(position, probability, minScale, maxScale) {
		for (var lane = -1; lane < 2; lane++) {
			var randomNumber = Math.random();
			if (randomNumber < probability) {
				var scale = minScale + (maxScale - minScale) * Math.random();
				var tree = new Tree(lane * 800, -400, position, scale);
				objects.push(tree);
				scene.add(tree.mesh);
			}
		}
	}

	function parseQuestions() {
		return new Promise((resolve, reject) => {
			fetch('../questionBank/03202024.json')
				.then(response => response.json())
				.then(data => {
					const questions = data.questions.map(questionData => {
						const text = questionData.question;
						const opt1 = addNewLines(questionData.answer_choices.A.option);
						const opt1_corr = questionData.answer_choices.A.correct;
						const opt2 = addNewLines(questionData.answer_choices.B.option);
						const opt2_corr = questionData.answer_choices.B.correct;
						return new Question(text, opt1, opt1_corr, opt2, opt2_corr);
					});
					resolve(questions);
				})
				.catch(error => {
					reject(error);
				});
		});
	}

	function addNewLines(text) {
		return text.split(' ').join('\n');
	}

	function createRowofAnswers(question, position, probability, minScale, maxScale) 
	{
		var scale = minScale + (maxScale - minScale) * Math.random();
		var options = [question.option1, question.option2];
		var questionBox = new QuestionBox(question.text, position/2, scale);
		questionBoxes.push(questionBox);
		scene.add(questionBox.mesh);

		var treePosition = Math.floor(Math.random() * 3) - 1;
		var obstacle;
		for (var lane = -1; lane < 2; lane++) {
			if (lane == treePosition) {
				obstacle = new Tree(lane * 800, -400, position, scale);
			} else {
				obstacle = new AnswerBox(lane * 800, -400, position, scale, options.pop());
			}
			objects.push(obstacle);
			scene.add(obstacle.mesh);
		}
	}

	function createRowofObstacles(questions, question_id, position, probability, minScale, maxScale) 
	{
		var randomNumber = Math.random();
		if (randomNumber < probability) {
			var randomNumber = Math.random();
			if (randomNumber < 0.5) {
				createRowOfTrees(position, 0.6, minScale, maxScale);
			} else {
				var question;
				if (questions.length > 0) {
					question = questions[question_id % questions.length]
				}
				if (question) {
					createRowofAnswers(question, position, probability, minScale, maxScale);
				}
				
			}
		}
		return question_id + 1;
	}
	/**
	 * Returns true if and only if the character is currently colliding with
	 * an object on the map.
	 */
	function correctAnswersDetected() {
		var charMinX = character.element.position.x - 115;
 		var charMaxX = character.element.position.x + 115;
 		var charMinY = character.element.position.y - 310;
 		var charMaxY = character.element.position.y + 320;
 		var charMinZ = character.element.position.z - 40;
 		var charMaxZ = character.element.position.z + 40;
 		for (var i = 0; i < objects.length; i++) {
 			if (objects[i].correct && objects[i].answersCorrect(charMinX, charMaxX, charMinY, 
 					charMaxY, charMinZ, charMaxZ)) {
 				return true;
 			}
 		}
 		return false;
	}
 	function collisionsDetected() {
 		var charMinX = character.element.position.x - 115;
 		var charMaxX = character.element.position.x + 115;
 		var charMinY = character.element.position.y - 310;
 		var charMaxY = character.element.position.y + 320;
 		var charMinZ = character.element.position.z - 40;
 		var charMaxZ = character.element.position.z + 40;
 		for (var i = 0; i < objects.length; i++) {
 			if (objects[i].collides(charMinX, charMaxX, charMinY, 
 					charMaxY, charMinZ, charMaxZ)) {
 				return true;
 			}
 		}
 		return false;
 	}
	
}

/** 
 *
 * IMPORTANT OBJECTS
 * 
 * The character and environmental objects in the game.
 *
 */

/**
 * The player's character in the game.
 */
function Character() {

	// Explicit binding of this even in changing contexts.
	var self = this;

	// Character defaults that don't change throughout the game.
	this.skinColor = Colors.black;
	this.hairColor = Colors.black;
	this.shirtColor = Colors.black;
	this.shortsColor = Colors.black;
	this.jumpDuration = 0.6;
	this.jumpHeight = 1500;

	// Initialize the character.
	init();

	/**
	  * Builds the character in depth-first order. The parts of are 
  	  * modelled by the following object hierarchy:
	  *
	  * - character (this.element)
	  *    - head
	  *       - face
	  *       - hair
	  *    - torso
	  *    - leftArm
	  *       - leftLowerArm
	  *    - rightArm
	  *       - rightLowerArm
	  *    - leftLeg
	  *       - rightLowerLeg
	  *    - rightLeg
	  *       - rightLowerLeg
	  *
	  * Also set up the starting values for evolving parameters throughout
	  * the game.
	  * 
	  */
	function init() {

		// Build the character.
		self.face = createBox(100, 100, 60, self.skinColor, 0, 0, 0);
		self.hair = createBox(105, 20, 65, self.hairColor, 0, 50, 0);
		self.head = createGroup(0, 260, -25);
		self.head.add(self.face);
		self.head.add(self.hair);

		self.torso = createBox(150, 190, 40, self.shirtColor, 0, 100, 0);

		self.leftLowerArm = createLimb(20, 120, 30, self.skinColor, 0, -170, 0);
		self.leftArm = createLimb(30, 140, 40, self.skinColor, -100, 190, -10);
		self.leftArm.add(self.leftLowerArm);

		self.rightLowerArm = createLimb(
			20, 120, 30, self.skinColor, 0, -170, 0);
		self.rightArm = createLimb(30, 140, 40, self.skinColor, 100, 190, -10);
		self.rightArm.add(self.rightLowerArm);

		self.leftLowerLeg = createLimb(40, 200, 40, self.skinColor, 0, -200, 0);
		self.leftLeg = createLimb(50, 170, 50, self.shortsColor, -50, -10, 30);
		self.leftLeg.add(self.leftLowerLeg);

		self.rightLowerLeg = createLimb(
			40, 200, 40, self.skinColor, 0, -200, 0);
		self.rightLeg = createLimb(50, 170, 50, self.shortsColor, 50, -10, 30);
		self.rightLeg.add(self.rightLowerLeg);

		self.element = createGroup(0, 0, -4000);
		self.element.add(self.head);
		self.element.add(self.torso);
		self.element.add(self.leftArm);
		self.element.add(self.rightArm);
		self.element.add(self.leftLeg);
		self.element.add(self.rightLeg);

		// Initialize the player's changing parameters.
		self.isJumping = false;
		self.isSwitchingLeft = false;
		self.isSwitchingRight = false;
		self.currentLane = 0;
		self.runningStartTime = new Date() / 1000;
		self.pauseStartTime = new Date() / 1000;
		self.stepFreq = 2;
		self.queuedActions = [];

	}

	/**
	 * Creates and returns a limb with an axis of rotation at the top.
	 *
	 * @param {number} DX The width of the limb.
	 * @param {number} DY The length of the limb.
	 * @param {number} DZ The depth of the limb.
	 * @param {color} COLOR The color of the limb.
	 * @param {number} X The x-coordinate of the rotation center.
	 * @param {number} Y The y-coordinate of the rotation center.
	 * @param {number} Z The z-coordinate of the rotation center.
	 * @return {THREE.GROUP} A group that includes a box representing
	 *                       the limb, with the specified properties.
	 *
	 */
	function createLimb(dx, dy, dz, color, x, y, z) {
	    var limb = createGroup(x, y, z);
	    var offset = -1 * (Math.max(dx, dz) / 2 + dy / 2);
		var limbBox = createBox(dx, dy, dz, color, 0, offset, 0);
		limb.add(limbBox);
		return limb;
	}
	
	/**
	 * A method called on the character when time moves forward.
	 */
	this.update = function() {

		// Obtain the curren time for future calculations.
		var currentTime = new Date() / 1000;

		// Apply actions to the character if none are currently being
		// carried out.
		if (!self.isJumping &&
			!self.isSwitchingLeft &&
			!self.isSwitchingRight &&
			self.queuedActions.length > 0) {
			switch(self.queuedActions.shift()) {
				case "up":
					self.isJumping = true;
					self.jumpStartTime = new Date() / 1000;
					break;
				case "left":
					if (self.currentLane != -1) {
						self.isSwitchingLeft = true;
					}
					break;
				case "right":
					if (self.currentLane != 1) {
						self.isSwitchingRight = true;
					}
					break;
			}
		}

		// If the character is jumping, update the height of the character.
		// Otherwise, the character continues running.
		if (self.isJumping) {
			var jumpClock = currentTime - self.jumpStartTime;
			self.element.position.y = self.jumpHeight * Math.sin(
				(1 / self.jumpDuration) * Math.PI * jumpClock) +
				sinusoid(2 * self.stepFreq, 0, 20, 0,
					self.jumpStartTime - self.runningStartTime);
			if (jumpClock > self.jumpDuration) {
				self.isJumping = false;
				self.runningStartTime += self.jumpDuration;
			}
		} else {
			var runningClock = currentTime - self.runningStartTime;
			self.element.position.y = sinusoid(
				2 * self.stepFreq, 0, 20, 0, runningClock);
			self.head.rotation.x = sinusoid(
				2 * self.stepFreq, -10, -5, 0, runningClock) * deg2Rad;
			self.torso.rotation.x = sinusoid(
				2 * self.stepFreq, -10, -5, 180, runningClock) * deg2Rad;
			self.leftArm.rotation.x = sinusoid(
				self.stepFreq, -70, 50, 180, runningClock) * deg2Rad;
			self.rightArm.rotation.x = sinusoid(
				self.stepFreq, -70, 50, 0, runningClock) * deg2Rad;
			self.leftLowerArm.rotation.x = sinusoid(
				self.stepFreq, 70, 140, 180, runningClock) * deg2Rad;
			self.rightLowerArm.rotation.x = sinusoid(
				self.stepFreq, 70, 140, 0, runningClock) * deg2Rad;
			self.leftLeg.rotation.x = sinusoid(
				self.stepFreq, -20, 80, 0, runningClock) * deg2Rad;
			self.rightLeg.rotation.x = sinusoid(
				self.stepFreq, -20, 80, 180, runningClock) * deg2Rad;
			self.leftLowerLeg.rotation.x = sinusoid(
				self.stepFreq, -130, 5, 240, runningClock) * deg2Rad;
			self.rightLowerLeg.rotation.x = sinusoid(
				self.stepFreq, -130, 5, 60, runningClock) * deg2Rad;

			// If the character is not jumping, it may be switching lanes.
			if (self.isSwitchingLeft) {
				self.element.position.x -= 200;
				var offset = self.currentLane * 800 - self.element.position.x;
				if (offset > 800) {
					self.currentLane -= 1;
					self.element.position.x = self.currentLane * 800;
					self.isSwitchingLeft = false;
				}
			}
			if (self.isSwitchingRight) {
				self.element.position.x += 200;
				var offset = self.element.position.x - self.currentLane * 800;
				if (offset > 800) {
					self.currentLane += 1;
					self.element.position.x = self.currentLane * 800;
					self.isSwitchingRight = false;
				}
			}
		}
	}

	/**
	  * Handles character activity when the left key is pressed.
	  */
	this.onLeftKeyPressed = function() {
		self.queuedActions.push("left");
	}

	/**
	  * Handles character activity when the up key is pressed.
	  */
	this.onUpKeyPressed = function() {
		self.queuedActions.push("up");
	}

	/**
	  * Handles character activity when the right key is pressed.
	  */
	this.onRightKeyPressed = function() {
		self.queuedActions.push("right");
	}

	/**
	  * Handles character activity when the game is paused.
	  */
	this.onPause = function() {
		self.pauseStartTime = new Date() / 1000;
	}

	/**
	  * Handles character activity when the game is unpaused.
	  */
	this.onUnpause = function() {
		var currentTime = new Date() / 1000;
		var pauseDuration = currentTime - self.pauseStartTime;
		self.runningStartTime += pauseDuration;
		if (self.isJumping) {
			self.jumpStartTime += pauseDuration;
		}
	}

}

/**
  * A collidable tree in the game positioned at X, Y, Z in the scene and with
  * scale S.
  */
function Tree(x, y, z, s) {

	// Explicit binding.
	var self = this;

	// The object portrayed in the scene.
	this.mesh = new THREE.Object3D();
    var top = createCylinder(1, 300, 300, 4, Colors.green, 0, 1000, 0);
    var mid = createCylinder(1, 400, 400, 4, Colors.green, 0, 800, 0);
    var bottom = createCylinder(1, 500, 500, 4, Colors.green, 0, 500, 0);
    var trunk = createCylinder(100, 100, 250, 32, Colors.brownDark, 0, 125, 0);
    this.mesh.add(top);
    this.mesh.add(mid);
    this.mesh.add(bottom);
    this.mesh.add(trunk);
    this.mesh.position.set(x, y, z);
	this.mesh.scale.set(s, s, s);
	this.scale = s;

	/**
	 * A method that detects whether this tree is colliding with the character,
	 * which is modelled as a box bounded by the given coordinate space.
	 */
    this.collides = function(minX, maxX, minY, maxY, minZ, maxZ) {
    	var treeMinX = self.mesh.position.x - this.scale * 250;
    	var treeMaxX = self.mesh.position.x + this.scale * 250;
    	var treeMinY = self.mesh.position.y;
    	var treeMaxY = self.mesh.position.y + this.scale * 1150;
    	var treeMinZ = self.mesh.position.z - this.scale * 250;
    	var treeMaxZ = self.mesh.position.z + this.scale * 250;
    	return treeMinX <= maxX && treeMaxX >= minX
    		&& treeMinY <= maxY && treeMaxY >= minY
    		&& treeMinZ <= maxZ && treeMaxZ >= minZ;
    }
}
function Question(text, opt1, opt1_corr, opt2, opt2_corr) {
    var self = this;
    this.text = text;
    this.option1 = {};
    this.option1.text = opt1;
    this.option1.correct = opt1_corr;

    this.option2 = {}; // Create a new object for option2
    this.option2.text = opt2;
    this.option2.correct = opt2_corr;
    
    this.valid = function() { // Check if both options have text and at least 1 is correct
        return ((this.option1.text && this.option2.text) && (this.option1.correct || this.option2.correct));
    }
}
function QuestionBox(text, z, s) {
    var self = this;
    this.mesh = new THREE.Object3D();
    var geometry = new THREE.BoxGeometry(5000, 1000, 0);
    var material = new THREE.MeshBasicMaterial({ color: Colors.yellow });
    var box = new THREE.Mesh(geometry, material);
    this.mesh.add(box);
    this.mesh.position.set(0, 2000, z);
    this.mesh.scale.set(s, s, s);
    this.scale = s;
    var textmesh;
    var loader = new THREE.FontLoader();
    loader.load('https://cdn.rawgit.com/mrdoob/three.js/master/examples/fonts/helvetiker_regular.typeface.json', function(font) {
        var textGeometry = new THREE.TextGeometry(text, {
            font: font,
            size: 100,
            height: 20,
            wrapMode: THREE.TextGeometry.prototype.WrapAroundGeometry
        });
        var textMaterial = new THREE.MeshBasicMaterial({ color: Colors.black });
        textMesh = new THREE.Mesh(textGeometry, textMaterial);
        
        // Center the text horizontally
        textMesh.geometry.computeBoundingBox();
        var textWidth = textMesh.geometry.boundingBox.max.x - textMesh.geometry.boundingBox.min.x;
        textMesh.position.x = -textWidth / 2;

        // Center the text vertically
        var textHeight = textMesh.geometry.boundingBox.max.y - textMesh.geometry.boundingBox.min.y;
        textMesh.position.y = -textHeight / 2;

        // Adjust position relative to the box
        textMesh.position.z = 100; // Adjust as needed

        this.mesh.add(textMesh); // Add textMesh to the scene
    }.bind(this));
}

function AnswerBox(x, y, z, s, option) {
    var self = this;
    this.mesh = new THREE.Object3D();
    var geometry = new THREE.BoxGeometry(1000, 4000, 500);
    var material = new THREE.MeshBasicMaterial({ color: Colors.blue });
    var box = new THREE.Mesh(geometry, material);
    this.mesh.add(box);
    this.mesh.position.set(x, y, z);
    this.mesh.scale.set(s, s, s);
    this.scale = s;
    this.correct = option.correct;
    var textmesh;
    var loader = new THREE.FontLoader();
    loader.load('https://cdn.rawgit.com/mrdoob/three.js/master/examples/fonts/helvetiker_regular.typeface.json', function(font) {
        var textGeometry = new THREE.TextGeometry(option.text, {
            font: font,
            size: 150,
            height: 50,
            wrapMode: THREE.TextGeometry.prototype.WrapAroundGeometry
        });
        var textMaterial = new THREE.MeshBasicMaterial({ color: Colors.white });
        textMesh = new THREE.Mesh(textGeometry, textMaterial);
        
        // Center the text horizontally
        textMesh.geometry.computeBoundingBox();
        var textWidth = textMesh.geometry.boundingBox.max.x - textMesh.geometry.boundingBox.min.x;
        textMesh.position.x = -textWidth / 2;

        // Center the text vertically
        var textHeight = textMesh.geometry.boundingBox.max.y - textMesh.geometry.boundingBox.min.y;
        textMesh.position.y = textHeight + 500; // Adjust for vertical centering

        // Adjust z-position to fit inside the box
        textMesh.position.z = 250; // Adjust as needed

        this.mesh.add(textMesh); // Add textMesh to the scene
    }.bind(this));

	this.answersCorrect = function(minX, maxX, minY, maxY, minZ, maxZ) {
		var boxMinX = self.mesh.position.x - this.scale * (500 / 2);
		var boxMaxX = self.mesh.position.x + this.scale * (500 / 2);
		var boxMinY = self.mesh.position.y - this.scale * (5000 / 2);
		var boxMaxY = self.mesh.position.y + this.scale * (500 / 2);
		var boxMinZ = self.mesh.position.z - this.scale * (500 / 2);
		var boxMaxZ = self.mesh.position.z + this.scale * (500 / 2);
    	return (this.correct==true) && boxMinX <= maxX && boxMaxX >= minX
    		&& boxMinY <= maxY && boxMaxY >= minY
    		&& boxMinZ <= maxZ && boxMaxZ >= minZ;
	}

	this.collides = function(minX, maxX, minY, maxY, minZ, maxZ) {
		var boxMinX = self.mesh.position.x - this.scale * (500 / 2);
		var boxMaxX = self.mesh.position.x + this.scale * (500 / 2);
		var boxMinY = self.mesh.position.y - this.scale * (5000 / 2);
		var boxMaxY = self.mesh.position.y + this.scale * (500 / 2);
		var boxMinZ = self.mesh.position.z - this.scale * (500 / 2);
		var boxMaxZ = self.mesh.position.z + this.scale * (500 / 2);
    	return (this.correct==false) && boxMinX <= maxX && boxMaxX >= minX
    		&& boxMinY <= maxY && boxMaxY >= minY
    		&& boxMinZ <= maxZ && boxMaxZ >= minZ;
    }
}


/** 
 *
 * UTILITY FUNCTIONS
 * 
 * Functions that simplify and minimize repeated code.
 *
 */

/**
 * Utility function for generating current values of sinusoidally
 * varying variables.
 *
 * @param {number} FREQUENCY The number of oscillations per second.
 * @param {number} MINIMUM The minimum value of the sinusoid.
 * @param {number} MAXIMUM The maximum value of the sinusoid.
 * @param {number} PHASE The phase offset in degrees.
 * @param {number} TIME The time, in seconds, in the sinusoid's scope.
 * @return {number} The value of the sinusoid.
 *
 */
function sinusoid(frequency, minimum, maximum, phase, time) {
	var amplitude = 0.5 * (maximum - minimum);
	var angularFrequency = 2 * Math.PI * frequency;
	var phaseRadians = phase * Math.PI / 180;
	var offset = amplitude * Math.sin(
		angularFrequency * time + phaseRadians);
	var average = (minimum + maximum) / 2;
	return average + offset;
}

/**
 * Creates an empty group of objects at a specified location.
 *
 * @param {number} X The x-coordinate of the group.
 * @param {number} Y The y-coordinate of the group.
 * @param {number} Z The z-coordinate of the group.
 * @return {Three.Group} An empty group at the specified coordinates.
 *
 */
function createGroup(x, y, z) {
	var group = new THREE.Group();
	group.position.set(x, y, z);
	return group;
}

/**
 * Creates and returns a simple box with the specified properties.
 *
 * @param {number} DX The width of the box.
 * @param {number} DY The height of the box.
 * @param {number} DZ The depth of the box.
 * @param {color} COLOR The color of the box.
 * @param {number} X The x-coordinate of the center of the box.
 * @param {number} Y The y-coordinate of the center of the box.
 * @param {number} Z The z-coordinate of the center of the box.
 * @param {boolean} NOTFLATSHADING True iff the flatShading is false.
 * @return {THREE.Mesh} A box with the specified properties.
 *
 */
function createBox(dx, dy, dz, color, x, y, z, notFlatShading) {
    var geom = new THREE.BoxGeometry(dx, dy, dz);
    var mat = new THREE.MeshPhongMaterial({
		color:color, 
    	flatShading: notFlatShading != true
    });
    var box = new THREE.Mesh(geom, mat);
    box.castShadow = true;
    box.receiveShadow = true;
    box.position.set(x, y, z);
    return box;
}

/**
 * Creates and returns a (possibly asymmetrical) cyinder with the 
 * specified properties.
 *
 * @param {number} RADIUSTOP The radius of the cylinder at the top.
 * @param {number} RADIUSBOTTOM The radius of the cylinder at the bottom.
 * @param {number} HEIGHT The height of the cylinder.
 * @param {number} RADIALSEGMENTS The number of segmented faces around 
 *                                the circumference of the cylinder.
 * @param {color} COLOR The color of the cylinder.
 * @param {number} X The x-coordinate of the center of the cylinder.
 * @param {number} Y The y-coordinate of the center of the cylinder.
 * @param {number} Z The z-coordinate of the center of the cylinder.
 * @return {THREE.Mesh} A box with the specified properties.
 */
function createCylinder(radiusTop, radiusBottom, height, radialSegments, 
						color, x, y, z) {
    var geom = new THREE.CylinderGeometry(
    	radiusTop, radiusBottom, height, radialSegments);
    var mat = new THREE.MeshPhongMaterial({
    	color: color,
    	flatShading: true
    });
    var cylinder = new THREE.Mesh(geom, mat);
    cylinder.castShadow = true;
    cylinder.receiveShadow = true;
    cylinder.position.set(x, y, z);
    return cylinder;
}
