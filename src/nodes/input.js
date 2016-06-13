(function() {

function GamepadInput() {
	this.addOutput("leftX_axis", "number");
	this.addOutput("leftY_axis", "number");
	this.properties = {};
}

GamepadInput.title = "Gamepad";
GamepadInput.desc = "gets the input of the gamepad";

GamepadInput.prototype.onExecute = function() {
	// get gamepad
	var gamepad = this.getGamepad();

	if ( this.outputs ) {
		for ( var i = 0; i < this.outputs.length; i++ ) {
			var output = this.outputs[ i ];
			var v = null;

			if ( gamepad ) {
				switch ( output.name ) {
					case "leftAxis": v = [ gamepad.xbox.axes.lx, gamepad.xbox.axes.ly ]; break;
					case "rightAxis": v = [ gamepad.xbox.axes.rx, gamepad.xbox.axes.ry ]; break;
					case "leftX_axis": v = gamepad.xbox.axes.lx; break;
					case "leftY_axis": v = gamepad.xbox.axes.ly; break;
					case "rightX_axis": v = gamepad.xbox.axes.rx; break;
					case "rightY_axis": v = gamepad.xbox.axes.ry; break;
					case "triggerLeft": v = gamepad.xbox.axes.ltrigger; break;
					case "triggerRight": v = gamepad.xbox.axes.rtrigger; break;
					case "aButton": v = gamepad.xbox.buttons.a ? 1 : 0; break;
					case "bButton": v = gamepad.xbox.buttons.b ? 1 : 0; break;
					case "xButton": v = gamepad.xbox.buttons.x ? 1 : 0; break;
					case "yButton": v = gamepad.xbox.buttons.y ? 1 : 0; break;
					case "lbButton": v = gamepad.xbox.buttons.lb ? 1 : 0; break;
					case "rbButton": v = gamepad.xbox.buttons.rb ? 1 : 0; break;
					case "lsButton": v = gamepad.xbox.buttons.ls ? 1 : 0; break;
					case "rsButton": v = gamepad.xbox.buttons.rs ? 1 : 0; break;
					case "startButton": v = gamepad.xbox.buttons.start ? 1 : 0; break;
					case "backButton": v = gamepad.xbox.buttons.back ? 1 : 0; break;
					default: break;
				}
			} else {
				// if no gamepad is connected, output 0
				switch ( output.name ) {
					case "leftAxis":
					case "rightAxis":
						v = [ 0, 0 ];
						break;
					default:
						v = 0;
				}
			}
			this.setOutputData( i, v );
		}
	}
};

GamepadInput.prototype.getGamepad = function() {
	var getGamepads = navigator.getGamepads || navigator.webkitGetGamepads || navigator.mozGetGamepads;
	if ( !getGamepads ) {
		return null;
	}
	var gamepads = getGamepads.call( navigator );
	var gamepad = null;

	for ( var i = 0; i < 4; i++ ) {
		if ( gamepads[ i ] ) {
			gamepad = gamepads[ i ];

			// xbox controller mapping
			var xbox = this.xboxMapping;
			if ( !xbox ) {
				xbox = this.xboxMapping = { axes:[], buttons:{}, hat: "" };
			}

			xbox.axes.lx = gamepad.axes[ 0 ];
			xbox.axes.ly = gamepad.axes[ 1 ];
			xbox.axes.rx = gamepad.axes[ 2 ];
			xbox.axes.ry = gamepad.axes[ 3 ];
			xbox.axes.ltrigger = gamepad.buttons[ 6 ].value;
			xbox.axes.rtrigger = gamepad.buttons[ 7 ].value;

			for ( var j = 0; j < gamepad.buttons.length; j++ ) {
				// mapping of XBOX
				switch ( j ) { // I use a switch to ensure that a player with another gamepad could play
					case 0:
						xbox.buttons.a = gamepad.buttons[ j ].pressed;
						break;

					case 1:
						xbox.buttons.b = gamepad.buttons[ j ].pressed;
						break;

					case 2:
						xbox.buttons.x = gamepad.buttons[ j ].pressed;
						break;

					case 3:
						xbox.buttons.y = gamepad.buttons[ j ].pressed;
						break;

					case 4:
						xbox.buttons.lb = gamepad.buttons[ j ].pressed;
						break;

					case 5:
						xbox.buttons.rb = gamepad.buttons[ j ].pressed;
						break;

					case 6:
						xbox.buttons.lt = gamepad.buttons[ j ].pressed;
						break;

					case 7:
						xbox.buttons.rt = gamepad.buttons[ j ].pressed;
						break;

					case 8:
						xbox.buttons.back = gamepad.buttons[ j ].pressed;
						break;

					case 9:
						xbox.buttons.start = gamepad.buttons[ j ].pressed;
						break;

					case 10:
						xbox.buttons.ls = gamepad.buttons[ j ].pressed;
						break;

					case 11:
						xbox.buttons.rs = gamepad.buttons[ j ].pressed;
						break;

					case 12:
						if ( gamepad.buttons[ j ].pressed ) {
							xbox.hat += "up";
						}
						break;

					case 13:
						if ( gamepad.buttons[ j ].pressed ) {
							xbox.hat += "down";
						}
						break;

					case 14:
						if ( gamepad.buttons[ j ].pressed ) {
							xbox.hat += "left";
						}
						break;

					case 15:
						if ( gamepad.buttons[ j ].pressed ) {
							xbox.hat += "right";
						}
						break;

					case 16:
						xbox.buttons.home = gamepad.buttons[ j ].pressed;
						break;

					default:
				}
			}
			gamepad.xbox = xbox;
			return gamepad;
		}
	}
};

GamepadInput.prototype.onDrawBackground = function( ctx ) { // eslint-disable-line no-unused-vars
	// render
};

GamepadInput.prototype.onGetOutputs = function() {
	return [
		[ "leftAxis", "vec2" ],
		[ "rightAxis", "vec2" ],
		[ "leftX_axis", "number" ],
		[ "leftY_axis", "number" ],
		[ "rightX_axis", "number" ],
		[ "rightY_axis", "number" ],
		[ "triggerLeft", "number" ],
		[ "triggerRight", "number" ],
		[ "aButton", "number" ],
		[ "bButton", "number" ],
		[ "xButton", "number" ],
		[ "yButton", "number" ],
		[ "lbButton", "number" ],
		[ "rbButton", "number" ],
		[ "lsButton", "number" ],
		[ "rsButton", "number" ],
		[ "start", "number" ],
		[ "back", "number" ]
	];
};

LiteGraph.registerNodeType("input/gamepad", GamepadInput );

})();
