// basic nodes
(function() {


// Number constant
function BasicNumber() {
	var value;
	this.addOutput("value", "number");
	this.addProperties({
		value: {
			default: 1.0,
			type: "number",
			get: function() {
				return value;
			},
			set: function( v ) {
				if ( typeof(v) !== "number")
					v = parseFloat( v );
				value = v;
				this.outputs[ 0 ].label = value.toFixed( 3 );
				this.setDirtyCanvas( true );
			}
		}
	});
}

BasicNumber.title = "Number";
BasicNumber.desc = "Number value";

BasicNumber.prototype.setValue = function( v ) {
	this.properties.value = v;
};

BasicNumber.prototype.onExecute = function() {
	this.setOutputData( 0, this.properties.value );
};

BasicNumber.prototype.onWidget = function( e, widget ) {
	if ( widget.name == "value")
		this.setValue( widget.value );
};

LiteGraph.registerNodeType("basic/number", BasicNumber );


// Watch a value in the editor
function Watch() {
	this.addInput("value", 0, { label:"" });
	this.addOutput("value", 0, { label:"" });
	this.addProperties({
		value: ""
	});
}

Watch.title = "Watch";
Watch.desc = "Show value of input";

Watch.prototype.onExecute = function() {
	this.properties.value = this.getInputData( 0 );
	this.setOutputData( 0, this.properties.value );
};

Watch.prototype.onDrawBackground = function( ctx ) {
	// show the current value
	if ( this.inputs[ 0 ] && this.properties[ "value" ] != null ) {
		if ( this.properties[ "value" ].constructor === Number )
			this.inputs[ 0 ].label = this.properties[ "value" ].toFixed( 3 );
		else
		{
			var str = this.properties[ "value" ];
			if ( str && str.length ) // convert typed to array
				str = Array.prototype.slice.call( str ).join(",");
			this.inputs[ 0 ].label = str;
		}
	}
};

LiteGraph.registerNodeType("basic/watch", Watch );


// Show value inside the debug console
function Console() {
	this.addProperties({
		msg: ""
	});
	this.addInput("log", LiteGraph.EXECUTE );
	this.addInput("msg", 0 );
}

Console.title = "Console";
Console.desc = "Show value inside the console";

Console.prototype.onExecute = function() {
	var msg = this.getInputData( 1 );
	if ( msg !== undefined )
		this.properties.msg = msg;
	else
		msg = this.properties.msg;
	console.log( msg );
};

Console.prototype.onGetInputs = function() {
	return [ [ "log", LiteGraph.EXECUTE ], [ "warn", LiteGraph.EXECUTE ], [ "error", LiteGraph.EXECUTE ] ];
};

LiteGraph.registerNodeType("basic/console", Console );


// Branch the execution path depending on the condition value
function Branch() {
	this.addInput("if", LiteGraph.EXECUTE );
	this.addProperties({
		condition: {
			default: false,
			type: "boolean"
		}
	});
	this.addInput("condition", "boolean");
	this.addOutput("true", LiteGraph.EXECUTE );
	this.addOutput("false", LiteGraph.EXECUTE );
}

Branch.title = "Branch";
Branch.desc = "Choose a diferent execution brach depending on the value in condition";

Branch.prototype.onExecute = function() {
	var condition = this.getInputData( 1 );
	if ( condition !== undefined )
		this.properties.condition = condition;
	else
		condition = this.properties.condition;
	if ( condition )
		this.trigger("true");
	else
		this.trigger("false");
};

LiteGraph.registerNodeType("basic/branch", Branch );


// String constant
function BasicString() {
	this.addOutput("value", "string");
	this.addProperties({
		value: ""
	});
}

BasicString.title = "String";
BasicString.desc = "String value";

BasicString.prototype.setValue = function( v ) {
	if ( typeof(v) != "string") v = v.toString();
	this.properties[ "value" ] = v;
	this.setDirtyCanvas( true );
};

BasicString.prototype.onExecute = function() {
	this.setOutputData( 0, this.properties[ "value" ] );
};

BasicString.prototype.onDrawBackground = function( ctx ) {
	var text = this.properties[ "value" ];

	ctx.font = LGraphCanvas.innerTextFont;

	var width = ctx.measureText( text ).width;

	if ( width > this.size[ 0 ] - 20 )
		for ( var i = 1; i < text.length; i++ ) {
			var shortText = text.slice( 0, -i ) + "...";
			width = ctx.measureText( shortText ).width;
			if ( width <= this.size[ 0 ] - 20 ) {
				text = shortText;
				break;
			}
		}

	// show the current value
	this.outputs[ 0 ].label = text;
};

BasicString.prototype.onWidget = function( e, widget ) {
	if ( widget.name == "value")
		this.setValue( widget.value );
};

LiteGraph.registerNodeType("basic/string", BasicString );


// Boolean constant
function BasicBoolean() {
	this.addOutput("value", "boolean");
	this.addProperties({
		value: true
	});
}

BasicBoolean.title = "Boolean";
BasicBoolean.desc = "Boolean value";

BasicBoolean.prototype.setValue = function( v ) {
	if ( typeof(v) != "boolean") v = v === true;
	this.properties[ "value" ] = v;
	this.setDirtyCanvas( true );
};

BasicBoolean.prototype.onExecute = function() {
	this.setOutputData( 0, this.properties[ "value" ] );
};

BasicBoolean.prototype.onDrawBackground = function( ctx ) {
	// show the current value
	this.outputs[ 0 ].label = this.properties[ "value" ].toString();
};

BasicBoolean.prototype.onWidget = function( e, widget ) {
	if ( widget.name == "value")
		this.setValue( widget.value );
};

LiteGraph.registerNodeType("basic/boolean", BasicBoolean );


// Function wrapper
function Wrapper() {
	var functionName = undefined;
	var functionArguments = undefined;
	var functionReturn = undefined;

	this.addInput("call", LiteGraph.EXECUTE );
	this.addOutput("completed", LiteGraph.EXECUTE );

	this.addProperties({
		name: {
			default: "",
			type: "string",
			get: function() {
				return functionName;
			},
			set: function( v ) {
				if ( v == "")
					return;
				if ( functionName == v )
					return;
				this.title = v;

				// find a function with the given name
				var path = v.split(".");
				var functionObject = window[ path.shift() ];
				while ( path.length > 0 )
					functionObject = functionObject[ path.shift() ];
				this._functionObject = functionObject;

				functionName = v;
			}
		},
		arguments: {
			default: "",
			type: "string",
			get: function() {
				return functionArguments;
			},
			set: function( v ) {
				if ( v == "")
					return;
				if ( functionArguments == v )
					return;

				for ( var i = 1, l = this.inputs.length; i < l; i++ )
					this.removeInput( i );

				if ( v != undefined ) {
					var strings = v.split(",");
					if ( typeof(strings) === "string")
						this.addInput( strings );
					else
						for ( var i = 0, l = strings.length; i < l; i++ )
							this.addInput( strings[ i ] );
				}

				functionArguments = v;
			}
		},
		return: {
			default: "",
			type: "string",
			get: function() {
				return functionReturn;
			},
			set: function( v ) {
				if ( v == "")
					return;
				if ( functionReturn == v )
					return;

				if ( this.outputs.length == 2 )
					this.removeOutput( 1 );

				if ( v != undefined )
					this.addOutput( v );

				functionReturn = v;
			}
		}
	});

	this.properties.name = "console.log";
	this.properties.arguments = "msg";
	this.properties.return = undefined;
}

Wrapper.title = "Wrapper";
Wrapper.desc = "Function wrapper";

Wrapper.prototype.onExecute = function() {
	// collect the arguments
	var functionArguments = [];
	for ( var i = 1, l = this.inputs.length; i < l; i++ )
		functionArguments.push( this.getInputData( i ) );

	// call the wrapped function
	var functionObject = this._functionObject;
	if ( functionObject ) {
		var result = functionObject.apply( functionObject, functionArguments );
		if ( this.outputs.length == 2 ) // set output to the result
			this.setOutputData( 1, result );
	}

	// continue with the control flow
	this.trigger("completed");
};

LiteGraph.registerNodeType("basic/wrapper", Wrapper );


// For loop
function ForLoop() {
	this.addInput("for", LiteGraph.EXECUTE );
	this.addInput("first index", "number");
	this.addInput("last index", "number");
	this.addOutput("loop body", LiteGraph.EXECUTE );
	this.addOutput("index", "number");
	this.addOutput("completed", LiteGraph.EXECUTE );
}

ForLoop.title = "For loop";
ForLoop.desc = "Loop from the first to the last index";

ForLoop.prototype.onExecute = function() {
	var firstIndex = this.getInputData( 1 );
	var lastIndex = this.getInputData( 2 );

	for ( var i = firstIndex; i <= lastIndex; i++ ) {
		this.setOutputData( 1, i );
		this.trigger("loop body");
	}

	this.trigger("completed");
};

LiteGraph.registerNodeType("basic/forLoop", ForLoop );


// For loop with break
function ForLoopWithBreak() {
	this.addInput("for", LiteGraph.EXECUTE );
	this.addInput("first index", "number");
	this.addInput("last index", "number");
	this.addInput("break", LiteGraph.EXECUTE );
	this.addOutput("loop body", LiteGraph.EXECUTE );
	this.addOutput("index", "number");
	this.addOutput("completed", LiteGraph.EXECUTE );
}

ForLoopWithBreak.title = "For loop with break";
ForLoopWithBreak.desc = "Loop from the first to the last index, interrupted if break is triggered";

ForLoopWithBreak.prototype.onExecute = function( action ) {
	if ( action == "break" && this.looping ) {
		this.looping = false;
		return;
	}

	this.looping = true;

	var firstIndex = this.getInputData( 1 );
	var lastIndex = this.getInputData( 2 );

	for ( var i = firstIndex; i <= lastIndex; i++ ) {
		this.setOutputData( 1, i );
		this.trigger("loop body");
		if ( !this.looping ) return;
	}

	this.trigger("completed");
};

LiteGraph.registerNodeType("basic/forLoopWithBreak", ForLoopWithBreak );



})();
