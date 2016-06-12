// graph nodes
(function() {


// Subgraph: a node that contains a graph
function Subgraph() {
	var that = this;

	// create inner graph
	this.subgraph = new LGraph();
	this.subgraph._subgraphNode = this;
	this.subgraph._isSubgraph = true;

	this.subgraph.onGlobalInputAdded = this.onSubgraphNewGlobalInput.bind( this );
	this.subgraph.onGlobalInputRenamed = this.onSubgraphRenamedGlobalInput.bind( this );
	this.subgraph.onGlobalInputTypeChanged = this.onSubgraphTypeChangeGlobalInput.bind( this );

	this.subgraph.onGlobalOutputAdded = this.onSubgraphNewGlobalOutput.bind( this );
	this.subgraph.onGlobalOutputRenamed = this.onSubgraphRenamedGlobalOutput.bind( this );
	this.subgraph.onGlobalOutputTypeChanged = this.onSubgraphTypeChangeGlobalOutput.bind( this );

	this.bgcolor = "#940";
}

Subgraph.title = "Subgraph";
Subgraph.desc = "Graph inside a node";

Subgraph.prototype.configure = function( o ) {
	LGraphNode.prototype.configure.call( this, o );
	// this.subgraph.configure(o.graph);
};

Subgraph.prototype.onSubgraphNewGlobalInput = function( name, type ) {
	// add input to the node
	this.addInput( name, type );
};

Subgraph.prototype.onSubgraphRenamedGlobalInput = function( oldname, name ) {
	var slot = this.findInputSlot( oldname );
	if ( slot == -1 )
		return;
	var info = this.getInputInfo( slot );
	info.name = name;
};

Subgraph.prototype.onSubgraphTypeChangeGlobalInput = function( name, type ) {
	var slot = this.findInputSlot( name );
	if ( slot == -1 )
		return;
	var info = this.getInputInfo( slot );
	info.type = type;
};

Subgraph.prototype.onSubgraphNewGlobalOutput = function( name, type ) {
	// add output to the node
	this.addOutput( name, type );
};

Subgraph.prototype.onSubgraphRenamedGlobalOutput = function( oldname, name ) {
	var slot = this.findOutputSlot( oldname );
	if ( slot == -1 )
		return;
	var info = this.getOutputInfo( slot );
	info.name = name;
};

Subgraph.prototype.onSubgraphTypeChangeGlobalOutput = function( name, type ) {
	var slot = this.findOutputSlot( name );
	if ( slot == -1 )
		return;
	var info = this.getOutputInfo( slot );
	info.type = type;
};

Subgraph.prototype.getExtraMenuOptions = function( graphcanvas ) {
	var that = this;
	return [ { content:"Open", callback:
		function() {
			graphcanvas.openSubgraph( that.subgraph );
		}
	} ];
};

Subgraph.prototype.onExecute = function() {
	// send inputs to subgraph global inputs
	if ( this.inputs )
		for ( var i = 0; i < this.inputs.length; i++ ) {
			var input = this.inputs[ i ];
			var value = this.getInputData( i );
			this.subgraph.setGlobalInputData( input.name, value );
		}

	// execute
	this.subgraph.runStep();

	// send subgraph global outputs to outputs
	if ( this.outputs )
		for ( var i = 0; i < this.outputs.length; i++ ) {
			var output = this.outputs[ i ];
			var value = this.subgraph.getGlobalOutputData( output.name );
			this.setOutputData( i, value );
		}
};

Subgraph.prototype.serialize = function() {
	var data = LGraphNode.prototype.serialize.call( this );
	data.subgraph = this.subgraph.serialize();
	return data;
};

Subgraph.prototype.clone = function() {
	var node = LiteGraph.createNode( this.type, this.title );
	var data = this.serialize();
	delete data.id;
	delete data.inputs;
	delete data.outputs;
	node.configure( data );
	return node;
};

Subgraph.prototype.invalidateConnectedLinks = function( slot ) {
	LGraphNode.prototype.invalidateConnectedLinks.call( this, slot );
};

LiteGraph.registerNodeType("graph/subgraph", Subgraph );


// Input for a subgraph
function GlobalInput( title ) {
	// random name to avoid problems with other outputs when added
	var inputName = title || "input_" + (Math.random() * 1000).toFixed();

	this.addOutput( inputName, null, { label:"" });

	this.properties = { name: inputName, type: null };

	this.addProperties({
		name: {
			default: "",
			type: "string",
			get: function() {
				return inputName;
			},
			set: function( v ) {
				if ( v == "")
					return;

				var info = this.getOutputInfo( 0 );
				if ( info.name == v )
					return;
				info.name = v;
				this.title = v;
				if ( this.graph )
					this.graph.renameGlobalInput( inputName, v );
				inputName = v;
			}
		},
		type: {
			default: "",
			type: "string",
			get: function() { return this.outputs[ 0 ].type; },
			set: function( v ) {
				this.outputs[ 0 ].type = v;
				if ( this.graph )
					this.graph.changeGlobalInputType( inputName, this.outputs[ 0 ].type );
			}
		}
	});
}

GlobalInput.title = "Input";
GlobalInput.desc = "Input of the graph";

// When added to graph tell the graph this is a new global input
GlobalInput.prototype.onAdded = function() {
	this.graph.addGlobalInput( this.properties.name, this.properties.type );
};

GlobalInput.prototype.onExecute = function() {
	var name = this.properties.name;

	// read from global input
	var	data = this.graph.globalInputs[ name ];
	if ( !data ) return;

	// put through output
	this.setOutputData( 0, data.value );
};

LiteGraph.registerNodeType("graph/input", GlobalInput );


// Output for a subgraph
function GlobalOutput( title ) {
	// random name to avoid problems with other outputs when added
	var outputName = title || "output_" + (Math.random() * 1000).toFixed();

	this.addInput( outputName, null, { label:"" });

	this.properties = { name: outputName, type: null };

	this.addProperties({
		name: {
			default: "",
			type: "string",
			get: function() {
				return outputName;
			},
			set: function( v ) {
				if ( v == "")
					return;

				var info = this.getInputInfo( 0 );
				if ( info.name == v )
					return;
				info.name = v;
				this.title = v;
				if ( this.graph )
					this.graph.renameGlobalOutput( outputName, v );
				outputName = v;
			}
		},
		type: {
			default: "",
			type: "string",
			get: function() { return this.inputs[ 0 ].type; },
			set: function( v ) {
				this.inputs[ 0 ].type = v;
				if ( this.graph )
					this.graph.changeGlobalInputType( outputName, this.inputs[ 0 ].type );
			}
		}
	});
}

GlobalOutput.title = "Ouput";
GlobalOutput.desc = "Output of the graph";

GlobalOutput.prototype.onAdded = function() {
	var name = this.graph.addGlobalOutput( this.properties.name, this.properties.type );
};

GlobalOutput.prototype.onExecute = function() {
	this.graph.setGlobalOutputData( this.properties.name, this.getInputData( 0 ) );
};

LiteGraph.registerNodeType("graph/output", GlobalOutput );


// Property getter
function GetProperty( title ) {
	this.title = title;

	this.addOutput("value", null );

	var propertyName = title;
	this.properties = { name: propertyName };

	this.addProperties({
		name: {
			default: "",
			type: "string",
			get: function() {
				return propertyName;
			},
			set: function( v ) {
				if ( v == "")
					return;
				if ( this.graph.properties[ v ] === undefined )
					return;

				var info = this.getOutputInfo( 0 );
				if ( info.name == v )
					return;
				info.name = v;
				propertyName = v;
			}
		}
	});
}

GetProperty.title = "Get Property";
GetProperty.desc = "Property getter";

GetProperty.prototype.onExecute = function() {
	var name = this.properties.name;

	// read from graph properties
	var	value = this.graph.properties[ name ];
	if ( value === undefined ) return;

	// put through output
	this.setOutputData( 0, value );
};

LiteGraph.registerNodeType("graph/getProperty", GetProperty );


// Property setter
function SetProperty( title ) {
	this.title = title;

	this.addInput("set", LiteGraph.EXECUTE, { label:"" });
	this.addInput("value", null );
	this.addOutput("completed", LiteGraph.EXECUTE, { label:"" });

	var propertyName = title;
	this.properties = { name: propertyName };

	this.addProperties({
		name: {
			default: "",
			type: "string",
			get: function() {
				return propertyName;
			},
			set: function( v ) {
				if ( v == "")
					return;
				if ( this.graph.properties[ v ] === undefined )
					return;

				var info = this.getInputInfo( 1 );
				if ( info.name == v )
					return;
				info.name = v;
				propertyName = v;

				this.computeSize();
			}
		}
	});
}

SetProperty.title = "Set Property";
SetProperty.desc = "Property setter";

SetProperty.prototype.onExecute = function() {
	var name = this.properties.name;
	this.graph.properties[ name ] = this.getInputData( 1 );
	this.graph.updatePropety( name );
	this.trigger("completed");
};

LiteGraph.registerNodeType("graph/setProperty", SetProperty );


// Comment: a node that encloses other nodes and have a comment message for title
function Comment( title ) {
	this.title = title;
	this.flags = {
		background: true
	};
	this.overlappingNodes = [];
	this.isDragging = false;
	this.bgcolor = "rgba(128,128,128,0.1)";
	this.resizable = true;
	this.collapsible = false;

	this.properties = { comment: this.title, color: this.bgcolor };

	var that = this;

	var handleImage = "imgs/resize-handle.png";
	this.handleImage = new Image();
	this.handleImage.name = handleImage;
	this.handleImage.src = handleImage;

	this.handleImage.onload = function() {
		that.graph.setDirtyCanvas( false, true );
	};

	this.addProperties({
		comment: {
			default: "",
			type: "string",
			get: function() {
				return this.title;
			},
			set: function( v ) {
				if ( v == "")
					return;
				this.title = v;
			}
		},
		color: {
			default: "",
			type: "string",
			get: function() {
				return this.bgcolor;
			},
			set: function( v ) {
				if ( v == "")
					return;
				this.bgcolor = v;
			}
		}
	});
}

Comment.title = "Comment";
Comment.desc = "Comment enclosing other nodes";

Comment.prototype.onAdded = function() {
	this.graph.sendActionToCanvas("sendToBack", [ this ]);
};

Comment.prototype.onMouseDown = function( e ) {
	var bounding = this.getBounding();

	this.isDragging = true;

	for ( var i = 0, l = this.graph._nodes.length; i < l; i++ ) {
		var node = this.graph._nodes[ i ];
		if ( !Object.is( this, node ) && containsBounding( bounding, node.getBounding() ) ) {
			var delta = [ node.pos[ 0 ] - this.pos[ 0 ], node.pos[ 1 ] - this.pos[ 1 ] ];
			this.overlappingNodes.push({ node: node, delta: delta });
		}
	}
};

Comment.prototype.onMouseMove = function( e ) {
	if ( this.isDragging && this.overlappingNodes )
		for ( var i = 0, l = this.overlappingNodes.length; i < l; i++ ) {
			var node = this.overlappingNodes[ i ].node;
			var delta = this.overlappingNodes[ i ].delta;
			node.pos = [ this.pos[ 0 ] + delta[ 0 ], this.pos[ 1 ] + delta[ 1 ] ];
		}
};

Comment.prototype.onMouseUp = function( e ) {
	this.onMouseMove( e );
	this.overlappingNodes = [];
	this.isDragging = false;
};

Comment.prototype.onDrawBackground = function( ctx ) {
	if ( !this.handlePattern )
		this.handlePattern = ctx.createPattern( this.handleImage, "repeat");

	var s = 13;
	var r = 5;
	var c = s - r;
	var p = 2;
	var t = [ this.size[ 0 ] - s - p, this.size[ 1 ] - s - p ];

	ctx.fillStyle = this.handlePattern;

	ctx.translate( t[ 0 ], t[ 1 ] );

	ctx.beginPath();
	ctx.moveTo( c, s );
	ctx.lineTo( 0, s );
	ctx.lineTo( s, 0 );
	ctx.lineTo( s, c );
	ctx.arc( c, c, r, 0, Math.PI / 2 );
	ctx.closePath();
	ctx.fill();

	ctx.translate( -t[ 0 ], -t[ 1 ] );
};

LiteGraph.registerNodeType("graph/comment", Comment );


})();
