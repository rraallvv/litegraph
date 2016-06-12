/****************************************************************************
Copyright (C) 2013 Javi Agenjo
Copyright (C) 2016 Rhody Lugo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
****************************************************************************/

// *************************************************************
//   LiteGraph CLASS                                     *******
// *************************************************************

/**
* The Global Scope. It contains all the registered node classes.
*
* @class LiteGraph
* @constructor
*/

var LiteGraph = {

	NODE_TITLE_HEIGHT: 16,
	NODE_SLOT_HEIGHT: 15,
	// NODE_WIDTH: 140,
	NODE_MIN_WIDTH: 105,
	NODE_COLLAPSED_RADIUS: 10,
	CANVAS_GRID_SIZE: 10,
	NODE_TITLE_COLOR: "#222",
	NODE_DEFAULT_COLOR: "#999",
	NODE_DEFAULT_BGCOLOR: "rgba(68,68,68,0.8)",
	NODE_DEFAULT_BOXCOLOR: "#AEF",
	NODE_DEFAULT_SHAPE: "box",
	MAX_NUMBER_OF_NODES: 1000, // avoid infinite loops
	DEFAULT_POSITION: [ 100, 100 ],// default node position
	nodeImagesPath: "",

	// enums
	INPUT: 1,
	OUTPUT: 2,

	EXECUTE: -1,

	proxy: null, // used to redirect calls

	debug: false,
	throwErrors: true,
	registeredNodeTypes: {}, // nodetypes by string
	Nodes: {}, // node types by classname

	/**
	* Register a node class so it can be listed when the user wants to create a new one
	* @method registerNodeType
	* @param {String} type name of the node and path
	* @param {Class} baseClass class containing the structure of a node
	*/

	registerNodeType: function( type, baseClass ) {
		if ( !baseClass.prototype )
			throw("Cannot register a simple object, it must be a class with a prototype");
		baseClass.type = type;

		if ( LiteGraph.debug )
			console.log("Node registered: " + type );

		var categories = type.split("/");

		var pos = type.lastIndexOf("/");
		baseClass.category = type.substr( 0, pos );
		// info.name = name.substr(pos+1,name.length - pos);

		// extend class
		if ( baseClass.prototype ) // is a class
			for ( var i in LGraphNode.prototype )
				if ( !baseClass.prototype[ i ] )
					baseClass.prototype[ i ] = LGraphNode.prototype[ i ];

		this.registeredNodeTypes[ type ] = baseClass;
		if ( baseClass.constructor.name )
			this.Nodes[ baseClass.constructor.name ] = baseClass;
	},

	/**
	* Adds this method to all nodetypes, existing and to be created
	* (You can add it to LGraphNode.prototype but then existing node types wont have it)
	* @method addNodeMethod
	* @param {Function} func
	*/
	addNodeMethod: function( name, func ) {
		LGraphNode.prototype[ name ] = func;
		for ( var i in this.registeredNodeTypes )
			this.registeredNodeTypes[ i ].prototype[ name ] = func;
	},

	/**
	* Create a node of a given type with a name. The node is not attached to any graph yet.
	* @method createNode
	* @param {String} type full name of the node class. p.e. "math/sin"
	* @param {String} name a name to distinguish from other nodes
	* @param {Object} options to set options
	*/

	createNode: function( type, title, options ) {
		var baseClass = this.registeredNodeTypes[ type ];
		if ( !baseClass ) {
			if ( LiteGraph.debug )
				console.log("GraphNode type \"" + type + "\" not registered.");
			return null;
		}

		var prototype = baseClass.prototype || baseClass;

		title = title || baseClass.title || type;

		var node = new baseClass( title );

		node.type = type;
		if ( !node.title ) node.title = title;
		if ( !node.properties ) node.properties = {};
		if ( !node.propertiesInfo ) node.propertiesInfo = [];
		if ( !node.flags ) node.flags = {};
		/*if (!node.size)*/ node.size = node.computeSize();
		if ( !node.pos ) node.pos = LiteGraph.DEFAULT_POSITION.concat();
		if ( !node.enabled ) node.enabled = true;

		// extra options
		if ( options ) {
			for ( var i in options )
				node[ i ] = options[ i ];
		}

		if ( !node.shape )
			node.shape = node.subgraph ? "box" : "round";

		return node;
	},

	/**
	* Returns a registered node type with a given name
	* @method getNodeType
	* @param {String} type full name of the node class. p.e. "math/sin"
	* @return {Class} the node class
	*/

	getNodeType: function( type ) {
		return this.registeredNodeTypes[ type ];
	},


	/**
	* Returns a list of node types matching one category
	* @method getNodeType
	* @param {String} category category name
	* @return {Array} array with all the node classes
	*/

	getNodeTypesInCategory: function( category ) {
		var r = [];
		for ( var i in this.registeredNodeTypes )
			if ( category == "") {
				if ( this.registeredNodeTypes[ i ].category == null )
					r.push( this.registeredNodeTypes[ i ] );
			} else if ( this.registeredNodeTypes[ i ].category == category )
				r.push( this.registeredNodeTypes[ i ] );

		return r;
	},

	/**
	* Returns a list with all the node type categories
	* @method getNodeTypesCategories
	* @return {Array} array with all the names of the categories
	*/

	getNodeTypesCategories: function() {
		var categories = { "":1 };
		for ( var i in this.registeredNodeTypes )
			if ( this.registeredNodeTypes[ i ].category && !this.registeredNodeTypes[ i ].skipList )
				categories[ this.registeredNodeTypes[ i ].category ] = 1;
		var result = [];
		for ( var i in categories )
			result.push( i );
		return result;
	},

	// debug purposes: reloads all the js scripts that matches a wilcard
	reloadNodes: function( folderWildcard ) {
		var tmp = document.getElementsByTagName("script");
		// weird, this array changes by its own, so we use a copy
		var scriptFiles = [];
		for ( var i in tmp )
			scriptFiles.push( tmp[ i ] );


		var docHeadObj = document.getElementsByTagName("head")[ 0 ];
		folderWildcard = document.location.href + folderWildcard;

		for ( var i in scriptFiles ) {
			var src = scriptFiles[ i ].src;
			if ( !src || src.substr( 0, folderWildcard.length ) != folderWildcard )
				continue;

			try
			{
				if ( LiteGraph.debug )
					console.log("Reloading: " + src );
				var dynamicScript = document.createElement("script");
				dynamicScript.type = "text/javascript";
				dynamicScript.src = src;
				docHeadObj.appendChild( dynamicScript );
				docHeadObj.removeChild( scriptFiles[ i ] );
			}
			catch ( err ) {
				if ( LiteGraph.throwErrors )
					throw err;
				if ( LiteGraph.debug )
					console.log("Error while reloading " + src );
			}
		}

		if ( LiteGraph.debug )
			console.log("Nodes reloaded");
	},

	// separated just to improve if it doesnt work
	cloneObject: function( obj, target ) {
		if ( obj == null ) return null;
		var r = JSON.parse( JSON.stringify( obj ) );
		if ( !target ) return r;

		for ( var i in r )
			target[ i ] = r[ i ];
		return target;
	},

	isValidConnection: function( typeA, typeB ) {
		if ( !typeA ||  // generic output
			typeA == typeB || // same type (is valid for triggers)
			(typeA !== LiteGraph.EXECUTE && (!typeB || (typeB !== LiteGraph.EXECUTE && typeA.toLowerCase() == typeB.toLowerCase()) ) ) ) // same type
			return true;
		return false;
	}
};

// LiteGraph.debug = true;

if ( typeof(performance) != "undefined")
	LiteGraph.getTime = function getTime() { return performance.now(); }; else
	LiteGraph.getTime = function getTime() { return Date.now(); };






// *********************************************************************************
// LGraph CLASS
// *********************************************************************************

/**
* LGraph is the class that contain a full graph. We instantiate one and add nodes to it, and then we can run the execution loop.
*
* @class LGraph
* @constructor
*/

function LGraph() {
	if ( LiteGraph.debug )
		console.log("Graph created");
	this.listOfGraphcanvas = null;
	this.clear();
}

// default supported types
LGraph.supportedTypes = [ "number", "string", "boolean" ];

// used to know which types of connections support this graph (some graphs do not allow certain types)
LGraph.prototype.getSupportedTypes = function() { return this.supportedTypes || LGraph.supportedTypes; };

LGraph.STATUS_STOPPED = 1;
LGraph.STATUS_RUNNING = 2;

/**
* Configure a graph from a JSON string
* @method configure
* @param {String} str configure a graph from a JSON string
*/
LGraph.prototype.configure = function( data, keepOld ) {
	if ( !keepOld )
		this.clear();

	var nodes = data.nodes;

	// copy all stored fields
	for ( var i in data )
		this[ i ] = data[ i ];

	var error = false;

	// create nodes
	this._nodes = [];
	for ( var i = 0, l = nodes.length; i < l; ++i ) {
		var nInfo = nodes[ i ]; // stored info
		var node = LiteGraph.createNode( nInfo.type, nInfo.title );
		if ( !node ) {
			if ( LiteGraph.debug )
				console.log("Node not found: " + nInfo.type );
			error = true;
			continue;
		}

		node.id = nInfo.id; // id it or it will create a new id
		this.add( node, true ); // add before configure, otherwise configure cannot create links
		node.configure( nInfo );
	}

	// create links
	var links = data.links;
	if ( links )
		for ( var i = 0, l = links.length; i < l; ++i ) {
			var lInfo = links[ i ]; // stored info

			var originInfo = String( lInfo[ 0 ] ).split(".");
			var targetInfo = String( lInfo[ 1 ] ).split(".");

			var nodeA = this.getNodeById( originInfo[ 0 ] | 0 );
			if ( !nodeA ) {
				if ( LiteGraph.debug )
					console.log("Node A in link not found: " + lInfo.type );
				error = true;
				continue;
			}

			var nodeB = this.getNodeById( targetInfo[ 0 ] | 0 );
			if ( !nodeB ) {
				if ( LiteGraph.debug )
					console.log("Node B in link not found: " + lInfo.type );
				error = true;
				continue;
			}

			var slotA = originInfo[ 1 ] | 0;
			var slotB = targetInfo[ 1 ] | 0;

			nodeA.connect( slotA, nodeB, slotB );
		}

	this.updateExecutionOrder();
	this.setDirtyCanvas( true, true );
	return error;
};

/**
* Removes all nodes from this graph
* @method clear
*/

LGraph.prototype.clear = function() {
	this.stop();
	this.status = LGraph.STATUS_STOPPED;
	this.lastNodeId = 0;

	// nodes
	this._nodes = [];
	this._nodesById = {};

	// links
	this.lastLinkId = 0;
	this.links = {}; // container with all the links

	// iterations
	this.iteration = 0;

	this.config = {
	};

	// timing
	this.globaltime = 0;
	this.runningtime = 0;
	this.fixedtime =  0;
	this.fixedtimeLapse = 0.01;
	this.elapsedTime = 0.01;
	this.starttime = 0;

	// globals
	this.globalInputs = {};
	this.globalOutputs = {};

	// this.graph = {};
	this.debug = true;

	this.change();

	this.sendActionToCanvas("clear");
};

/**
* Attach Canvas to this graph
* @method attachCanvas
* @param {GraphCanvas} graphCanvas
*/

LGraph.prototype.attachCanvas = function( graphcanvas ) {
	if ( graphcanvas.constructor != LGraphCanvas )
		throw("attachCanvas expects a LGraphCanvas instance");
	if ( graphcanvas.graph && graphcanvas.graph != this )
		graphcanvas.graph.detachCanvas( graphcanvas );

	graphcanvas.graph = this;
	if ( !this.listOfGraphcanvas )
		this.listOfGraphcanvas = [];
	this.listOfGraphcanvas.push( graphcanvas );
};

/**
* Detach Canvas from this graph
* @method detachCanvas
* @param {GraphCanvas} graphCanvas
*/

LGraph.prototype.detachCanvas = function( graphcanvas ) {
	if ( !this.listOfGraphcanvas )
		return;

	var pos = this.listOfGraphcanvas.indexOf( graphcanvas );
	if ( pos == -1 )
		return;
	graphcanvas.graph = null;
	this.listOfGraphcanvas.splice( pos, 1 );
};

/**
* Starts running this graph every interval milliseconds.
* @method start
* @param {number} interval amount of milliseconds between executions, default is 1
*/

LGraph.prototype.start = function( interval ) {
	if ( this.status == LGraph.STATUS_RUNNING ) return;
	this.status = LGraph.STATUS_RUNNING;

	if ( this.onPlayEvent )
		this.onPlayEvent();

	this.sendEventToAllNodes("onStart");

	// launch
	this.starttime = LiteGraph.getTime();
	interval = interval || 1;
	var that = this;

	this.executionTimerId = setInterval(function() {
		// execute
		that.runStep( 1 );
	}, interval );
};

/**
* Stops the execution loop of the graph
* @method stop execution
*/

LGraph.prototype.stop = function() {
	if ( this.status == LGraph.STATUS_STOPPED )
		return;

	this.status = LGraph.STATUS_STOPPED;

	if ( this.onStopEvent )
		this.onStopEvent();

	if ( this.executionTimerId != null )
		clearInterval( this.executionTimerId );
	this.executionTimerId = null;

	this.sendEventToAllNodes("onStop");
};

/**
* Run N steps (cycles) of the graph
* @method runStep
* @param {number} num number of steps to run, default is 1
*/

LGraph.prototype.runStep = function( num ) {
	num = num || 1;

	var start = LiteGraph.getTime();
	this.globaltime = 0.001 * (start - this.starttime);

	var nodes = this._nodesInOrder ? this._nodesInOrder : this._nodes;
	if ( !nodes )
		return;

	try
	{
		// iterations
		for ( var i = 0; i < num; i++ ) {
			for ( var j = 0, l = nodes.length; j < l; ++j ) {
				var node = nodes[ j ];
				if ( node.enabled && node.onExecute )
					node.onExecute();
			}

			this.fixedtime += this.fixedtimeLapse;
			if ( this.onExecuteStep )
				this.onExecuteStep();
		}

		if ( this.onAfterExecute )
			this.onAfterExecute();
		this.errorsInExecution = false;
	}
	catch ( err ) {
		this.errorsInExecution = true;
		if ( LiteGraph.throwErrors )
			throw err;
		if ( LiteGraph.debug )
			console.log("Error during execution: " + err );
		this.stop();
	}

	var elapsed = LiteGraph.getTime() - start;
	if ( elapsed == 0 )
		elapsed = 1;
	this.elapsedTime = 0.001 * elapsed;
	this.globaltime += 0.001 * elapsed;
	this.iteration += 1;
};

/**
* Updates the graph execution order according to relevance of the nodes (nodes with only outputs have more relevance than
* nodes with only inputs.
* @method updateExecutionOrder
*/

LGraph.prototype.updateExecutionOrder = function() {
	this._nodesInOrder = this.computeExecutionOrder();
};

// This is more internal, it computes the order and returns it
LGraph.prototype.computeExecutionOrder = function() {
	var L = [];
	var S = [];
	var M = {};
	var visitedLinks = {}; // to avoid repeating links
	var remainingLinks = {}; // to a

	// search for the nodes without inputs (starting nodes)
	for ( var i = 0, l = this._nodes.length; i < l; ++i ) {
		var n = this._nodes[ i ];
		M[ n.id ] = n; // add to pending nodes

		var num = 0; // num of input connections
		if ( n.inputs )
			for ( var j = 0, l2 = n.inputs.length; j < l2; j++ )
				if ( n.inputs[ j ] && n.inputs[ j ].links )
					num += n.inputs[ j ].links.length;

		if ( num == 0 ) // is a starting node
			S.push( n );
		else // num of input links
			remainingLinks[ n.id ] = num;
	}

	while ( true ) {
		if ( S.length == 0 )
			break;

		// get an starting node
		var n = S.shift();
		L.push( n ); // add to ordered list
		delete M[ n.id ]; // remove from the pending nodes

		// for every output
		if ( n.outputs )
			for ( var i = 0; i < n.outputs.length; i++ ) {
				var output = n.outputs[ i ];
				// not connected
				if ( !output || !output.links )
					continue;

				// for every connection
				for ( var j = 0; j < output.links.length; j++ ) {
					var linkId = output.links[ j ];
					var link = this.links[ linkId ];
					if ( !link ) continue;

					// already visited link (ignore it)
					if ( visitedLinks[ link.id ] )
						continue;

					var targetNode = this.getNodeById( link.targetId );
					if ( targetNode == null ) {
						visitedLinks[ link.id ] = true;
						continue;
					}

					visitedLinks[ link.id ] = true; // mark as visited
					remainingLinks[ targetNode.id ] -= 1; // reduce the number of links remaining
					if ( remainingLinks[ targetNode.id ] == 0 )
						S.push( targetNode ); // if no more links, then add to Starters array
				}
			}
	}

	// the remaining ones (loops)
	for ( var i in M )
		L.push( M[ i ] );

	if ( L.length != this._nodes.length && LiteGraph.debug )
		console.warn("something went wrong, nodes missing");

	// save order number in the node
	for ( var i = 0; i < L.length; ++i )
		L[ i ].order = i;

	return L;
};


/**
* Returns the amount of time the graph has been running in milliseconds
* @method getTime
* @return {number} number of milliseconds the graph has been running
*/

LGraph.prototype.getTime = function() {
	return this.globaltime;
};

/**
* Returns the amount of time accumulated using the fixedtimeLapse var. This is used in context where the time increments should be constant
* @method getFixedTime
* @return {number} number of milliseconds the graph has been running
*/

LGraph.prototype.getFixedTime = function() {
	return this.fixedtime;
};

/**
* Returns the amount of time it took to compute the latest iteration. Take into account that this number could be not correct
* if the nodes are using graphical actions
* @method getElapsedTime
* @return {number} number of milliseconds it took the last cycle
*/

LGraph.prototype.getElapsedTime = function() {
	return this.elapsedTime;
};

/**
* Sends an event to all the nodes, useful to trigger stuff
* @method sendEventToAllNodes
* @param {String} eventname the name of the event (function to be called)
* @param {Array} params parameters in array format
*/

LGraph.prototype.sendEventToAllNodes = function( eventname, params, enabled ) {
	enabled = enabled || true;

	var nodes = this._nodesInOrder ? this._nodesInOrder : this._nodes;
	if ( !nodes )
		return;

	for ( var j = 0, l = nodes.length; j < l; ++j ) {
		var node = nodes[ j ];
		if ( node[ eventname ] && node.enabled == enabled ) {
			if ( params === undefined )
				node[ eventname ]();
			else if ( params && params.constructor === Array )
				node[ eventname ].apply( node, params );
			else
				node[ eventname ]( params );
		}
	}
};

LGraph.prototype.sendActionToCanvas = function( action, params ) {
	if ( !this.listOfGraphcanvas )
		return;

	for ( var i = 0; i < this.listOfGraphcanvas.length; ++i ) {
		var c = this.listOfGraphcanvas[ i ];
		if ( c[ action ] )
			c[ action ].apply( c, params );
	}
};

/**
* Adds a new node instasnce to this graph
* @method add
* @param {LGraphNode} node the instance of the node
*/

LGraph.prototype.add = function( node, skipComputeOrder ) {
	if ( !node || (node.id != -1 && this._nodesById[ node.id ] != null) )
		return; // already added

	if ( this._nodes.length >= LiteGraph.MAX_NUMBER_OF_NODES )
		throw("LiteGraph: max number of nodes in a graph reached");

	// give him an id
	if ( node.id == null || node.id == -1 )
		node.id = this.lastNodeId++;

	node.graph = this;

	this._nodes.push( node );
	this._nodesById[ node.id ] = node;

	/*
	// rendering stuf...
	if (node.bgImageUrl)
		node.bgImage = node.loadImage(node.bgImageUrl);
	*/

	if ( node.onAdded )
		node.onAdded( this );

	if ( this.config.alignToGrid )
		node.alignToGrid();

	if ( !skipComputeOrder )
		this.updateExecutionOrder();

	if ( this.onNodeAdded )
		this.onNodeAdded( node );


	this.setDirtyCanvas( true );

	this.change();

	return node; // to chain actions
};

/**
* Removes a node from the graph
* @method remove
* @param {LGraphNode} node the instance of the node
*/

LGraph.prototype.remove = function( node ) {
	if ( this._nodesById[ node.id ] == null )
		return; // not found

	if ( node.ignoreRemove )
		return; // cannot be removed

	// disconnect inputs
	if ( node.inputs )
		for ( var i = 0; i < node.inputs.length; i++ ) {
			var slot = node.inputs[ i ];
			if ( slot.links )
				node.disconnectInput( i );
		}

	// disconnect outputs
	if ( node.outputs )
		for ( var i = 0; i < node.outputs.length; i++ ) {
			var slot = node.outputs[ i ];
			if ( slot.links )
				node.disconnectOutput( i );
		}

	// node.id = -1; // why?

	// callback
	if ( node.onRemoved )
		node.onRemoved();

	node.graph = null;

	// remove from canvas render
	if ( this.listOfGraphcanvas ) {
		for ( var i = 0; i < this.listOfGraphcanvas.length; ++i ) {
			var canvas = this.listOfGraphcanvas[ i ];
			if ( canvas.selectedNodes[ node.id ] )
				delete canvas.selectedNodes[ node.id ];
			if ( canvas.nodeDragged == node )
				canvas.nodeDragged = null;
		}
	}

	// remove from containers
	var pos = this._nodes.indexOf( node );
	if ( pos != -1 )
		this._nodes.splice( pos, 1 );
	delete this._nodesById[ node.id ];

	if ( this.onNodeRemoved )
		this.onNodeRemoved( node );

	this.setDirtyCanvas( true, true );

	this.change();

	this.updateExecutionOrder();
};

/**
* Returns a node by its id.
* @method getNodeById
* @param {String} id
*/

LGraph.prototype.getNodeById = function( id ) {
	if ( id == null ) return null;
	return this._nodesById[ id ];
};

/**
* Returns a list of nodes that matches a class
* @method findNodesByClass
* @param {Class} classObject the class itself (not an string)
* @return {Array} a list with all the nodes of this type
*/

LGraph.prototype.findNodesByClass = function( classObject ) {
	var r = [];
	for ( var i = 0, l = this._nodes.length; i < l; ++i )
		if ( this._nodes[ i ].constructor === classObject )
			r.push( this._nodes[ i ] );
	return r;
};

/**
* Returns a list of nodes that matches a type
* @method findNodesByType
* @param {String} type the name of the node type
* @return {Array} a list with all the nodes of this type
*/

LGraph.prototype.findNodesByType = function( type ) {
	var type = type.toLowerCase();
	var r = [];
	for ( var i = 0, l = this._nodes.length; i < l; ++i )
		if ( this._nodes[ i ].type.toLowerCase() == type )
			r.push( this._nodes[ i ] );
	return r;
};

/**
* Returns a list of nodes that matches a name
* @method findNodesByName
* @param {String} name the name of the node to search
* @return {Array} a list with all the nodes with this name
*/

LGraph.prototype.findNodesByTitle = function( title ) {
	var result = [];
	for ( var i = 0, l = this._nodes.length; i < l; ++i )
		if ( this._nodes[ i ].title == title )
			result.push( this._nodes[ i ] );
	return result;
};

/**
* Returns the top-most node in this position of the canvas
* @method getNodeOnPos
* @param {number} x the x coordinate in canvas space
* @param {number} y the y coordinate in canvas space
* @param {Array} nodesList a list with all the nodes to search from, by default is all the nodes in the graph
* @return {Array} a list with all the nodes that intersect this coordinate
*/

LGraph.prototype.getNodeOnPos = function( x, y, nodesList ) {
	nodesList = nodesList || this._nodes;
	for ( var i = nodesList.length - 1; i >= 0; i-- ) {
		var n = nodesList[ i ];
		if ( n.isPointInsideNode( x, y, 6 ) )
			return n;
	}
	return null;
};

// ********** GLOBALS *****************

// Tell this graph has a global input of this type
LGraph.prototype.addGlobalInput = function( name, type, value ) {
	this.globalInputs[ name ] = { name: name, type: type, value: value };

	if ( this.onGlobalInputAdded )
		this.onGlobalInputAdded( name, type );

	if ( this.onGlobalsChange )
		this.onGlobalsChange();
};

// assign a data to the global input
LGraph.prototype.setGlobalInputData = function( name, data ) {
	var input = this.globalInputs[ name ];
	if ( !input )
		return;
	input.value = data;
};

// assign a data to the global input
LGraph.prototype.getGlobalInputData = function( name ) {
	var input = this.globalInputs[ name ];
	if ( !input )
		return null;
	return input.value;
};

// rename the global input
LGraph.prototype.renameGlobalInput = function( oldName, name ) {
	if ( name == oldName )
		return;

	if ( !this.globalInputs[ oldName ] )
		return false;

	if ( this.globalInputs[ name ] ) {
		console.error("there is already one input with that name");
		return false;
	}

	this.globalInputs[ name ] = this.globalInputs[ oldName ];
	delete this.globalInputs[ oldName ];

	if ( this.onGlobalInputRenamed )
		this.onGlobalInputRenamed( oldName, name );

	if ( this.onGlobalsChange )
		this.onGlobalsChange();
};

LGraph.prototype.changeGlobalInputType = function( name, type ) {
	if ( !this.globalInputs[ name ] )
		return false;

	if ( this.globalInputs[ name ].type.toLowerCase() == type.toLowerCase() )
		return;

	this.globalInputs[ name ].type = type;
	if ( this.onGlobalInputTypeChanged )
		this.onGlobalInputTypeChanged( name, type );
};

LGraph.prototype.removeGlobalInput = function( name ) {
	if ( !this.globalInputs[ name ] )
		return false;

	delete this.globalInputs[ name ];

	if ( this.onGlobalInputRemoved )
		this.onGlobalInputRemoved( name );

	if ( this.onGlobalsChange )
		this.onGlobalsChange();
	return true;
};


LGraph.prototype.addGlobalOutput = function( name, type, value ) {
	this.globalOutputs[ name ] = { name: name, type: type, value: value };

	if ( this.onGlobalOutputAdded )
		this.onGlobalOutputAdded( name, type );

	if ( this.onGlobalsChange )
		this.onGlobalsChange();
};

// assign a data to the global output
LGraph.prototype.setGlobalOutputData = function( name, value ) {
	var output = this.globalOutputs[ name ];
	if ( !output )
		return;
	output.value = value;
};

// assign a data to the global input
LGraph.prototype.getGlobalOutputData = function( name ) {
	var output = this.globalOutputs[ name ];
	if ( !output )
		return null;
	return output.value;
};


// rename the global output
LGraph.prototype.renameGlobalOutput = function( oldName, name ) {
	if ( !this.globalOutputs[ oldName ] )
		return false;

	if ( this.globalOutputs[ name ] ) {
		console.error("there is already one output with that name");
		return false;
	}

	this.globalOutputs[ name ] = this.globalOutputs[ oldName ];
	delete this.globalOutputs[ oldName ];

	if ( this.onGlobalOutputRenamed )
		this.onGlobalOutputRenamed( oldName, name );

	if ( this.onGlobalsChange )
		this.onGlobalsChange();
};

LGraph.prototype.changeGlobalOutputType = function( name, type ) {
	if ( !this.globalOutputs[ name ] )
		return false;

	if ( this.globalOutputs[ name ].type.toLowerCase() == type.toLowerCase() )
		return;

	this.globalOutputs[ name ].type = type;
	if ( this.onGlobalOutputTypeChanged )
		this.onGlobalOutputTypeChanged( name, type );
};

LGraph.prototype.removeGlobalOutput = function( name ) {
	if ( !this.globalOutputs[ name ] )
		return false;
	delete this.globalOutputs[ name ];

	if ( this.onGlobalOutputRemoved )
		this.onGlobalOutputRemoved( name );

	if ( this.onGlobalsChange )
		this.onGlobalsChange();
	return true;
};


/**
* Assigns a value to all the nodes that matches this name. This is used to create global variables of the node that
* can be easily accesed from the outside of the graph
* @method setInputData
* @param {String} name the name of the node
* @param {*} value value to assign to this node
*/

LGraph.prototype.setInputData = function( name, value ) {
	var nodes = this.findNodesByName( name );
	for ( var i = 0, l = nodes.length; i < l; ++i )
		nodes[ i ].setValue( value );
};

/**
* Returns the value of the first node with this name. This is used to access global variables of the graph from the outside
* @method setInputData
* @param {String} name the name of the node
* @return {*} value of the node
*/

LGraph.prototype.getOutputData = function( name ) {
	var n = this.findNodesByName( name );
	if ( n.length )
		return m[ 0 ].getValue();
	return null;
};

// This feature is not finished yet, is to create graphs where nodes are not executed unless a trigger message is received

LGraph.prototype.triggerInput = function( name, value ) {
	var nodes = this.findNodesByName( name );
	for ( var i = 0; i < nodes.length; ++i )
		nodes[ i ].onTrigger( value );
};

LGraph.prototype.setCallback = function( name, func ) {
	var nodes = this.findNodesByName( name );
	for ( var i = 0; i < nodes.length; ++i )
		nodes[ i ].setTrigger( func );
};


LGraph.prototype.connectionChange = function( node ) {
	this.updateExecutionOrder();
	if ( this.onConnectionChange )
		this.onConnectionChange( node );
	this.sendActionToCanvas("onConnectionChange");
};

/* Called when something visually changed */
LGraph.prototype.change = function() {
	if ( LiteGraph.debug )
		console.log("Graph changed");

	this.sendActionToCanvas("setDirty", [ true, true ]);

	if ( this.onChange )
		this.onChange( this );
};

LGraph.prototype.setDirtyCanvas = function( fg, bg ) {
	this.sendActionToCanvas("setDirty", [ fg, bg ]);
};

// save and recover app state ***************************************
/**
* Creates a Object containing all the info about this graph, it can be serialized
* @method serialize
* @return {Object} value of the node
*/
LGraph.prototype.serialize = function() {
	// store the nodes to serialize
	var nodesInfo = [];
	for ( var i = 0, l = this._nodes.length; i < l; ++i )
		nodesInfo.push( this._nodes[ i ].serialize() );

	// sort nodes to serialize by id
	nodesInfo.sort( compare );

	// remove id from nodes
	for ( var i in nodesInfo )
		delete nodesInfo[ i ].id;

	// store the links to serialize
	var links = [];
	for ( var i = 0, l = this.links.length; i < l; ++i ) {
		var link = this.links[ i ];
		links.push({
			id: link.id,
			originId: link.originId,
			originSlot: link.originSlot,
			targetId: link.targetId,
			targetSlot: link.targetSlot
		});
	}

	// sort links to serialize by id
	links.sort( compare );

	// parse links
	linksInfo = [];
	for ( var i = 0, l = links.length; i < l; i++ ) {
		var linkInfo = links[ i ];
		linksInfo.push([
			parseFloat( linkInfo.originId + "." + linkInfo.originSlot ),
			parseFloat( linkInfo.targetId + "." + linkInfo.targetSlot )
		]);
	}

	var data = {
//		graph: this.graph,

//		iteration: this.iteration,
//		frame: this.frame,
//		lastNodeId: this.lastNodeId,
//		lastLinkId: this.lastLinkId,
		nodes: nodesInfo,
		links: linksInfo
//		properties: propertiesInfo,

//		config: this.config,
	};

	// store the properties to serialize
	if ( !isEmpty( this.properties ) )
		data.properties = LiteGraph.cloneObject( this.properties );

	function compare( a, b ) {
		if ( a.id < b.id )
			return -1;
		else if ( a.id > b.id )
			return 1;
		else
			return 0;
	}

	return data;
};

LGraph.prototype.onNodeTrace = function( node, msg, color ) {
	// TODO
};

LGraph.prototype.updatePropety = function( property ) {
	for ( var i = 0, l = this._nodes.length; i < l; i++ ) {
		var node = this._nodes[ i ];
		if ( node.type == "graph/getProperty" && node.properties.name == property )
			node.invalidateConnectedLinks();
	}
};

LGraph.prototype.invalidateConnectedLinks = function( slot ) {
	var node = this._subgraphNode;
	if ( node && node.invalidateConnectedLinks )
		node.invalidateConnectedLinks( slot );
};

// *************************************************************
//   Node CLASS                                          *******
// *************************************************************

/*
	title: string
	pos: [x,y]
	size: [x,y]

	input|output: every connection
		+  { name:string, type:string, pos: [x,y]=Optional, direction: "input"|"output", links: Array });

	flags:
		+ skipTitleRender
		+ clipArea
		+ unsafeExecution: not allowed for safe execution

	supported callbacks:
		+ onAdded: when added to graph
		+ onRemoved: when removed from graph
		+ onStart:	when starts playing
		+ onStop:	when stops playing
		+ onDrawForeground: render the inside widgets inside the node
		+ onDrawBackground: render the background area inside the node (only in edit mode)
		+ onMouseDown
		+ onMouseMove
		+ onMouseUp
		+ onMouseEnter
		+ onMouseLeave
		+ onExecute: execute the node
		+ onPropertyChange: when a property is changed in the panel (return true to skip default behaviour)
		+ onGetInputs: returns an array of possible inputs
		+ onGetOutputs: returns an array of possible outputs
		+ onDblClick
		+ onSerialize
		+ onSelected
		+ onDeselected
		+ onDropItem : DOM item dropped over the node
		+ onDropFile : file dropped over the node
		+ onConnectInput : if returns false the incoming connection will be canceled
		+ onConnectionsChange : a connection changed (new one or removed)
*/

/**
* Base Class for all the node type classes
* @class LGraphNode
* @param {String} name a name for the node
*/

function LGraphNode( title ) {
	this.title = title || "Unnamed";
	this.size = [ LiteGraph.NODE_MIN_WIDTH, 60 ];
	this.graph = null;

	this._pos = new Float32Array( 10, 10 );

	Object.defineProperty( this, "pos", {
		set: function( v ) {
			if ( !v || !v.length < 2 )
				return;
			this._pos[ 0 ] = v[ 0 ];
			this._pos[ 1 ] = v[ 1 ];
		},
		get: function() {
			return this._pos;
		},
		enumerable: true
	});

	this.id = -1; // not know till not added
	this.type = null;

	// inputs available: array of inputs
	this.inputs = [];
	this.outputs = [];
	this.connections = [];

	// local data
	this.properties = {}; // for the values
	this.propertiesInfo = []; // for the info

	this.data = null; // persistent local data
	this.flags = {
		// skipTitleRender: true,
		// unsafeExecution: false,
	};
}

/**
* configure a node from an object containing the serialized info
* @method configure
*/
LGraphNode.prototype.configure = function( info ) {
	for ( var j in info ) {
		if ( j == "console")
			continue;

		if ( j == "properties") {
			// i dont want to clone properties, I want to reuse the old container
			for ( var k in info.properties ) {
				this.properties[ k ] = info.properties[ k ];
				if ( this.onPropertyChanged )
					this.onPropertyChanged( k, info.properties[ k ] );
			}
			continue;
		}

		if ( info[ j ] == null )
			continue;
		else if ( typeof(info[ j ]) == "object" ) // object
		{
			if ( this[ j ] && this[ j ].configure )
				this[ j ].configure( info[ j ] );
			else
				this[ j ] = LiteGraph.cloneObject( info[ j ], this[ j ] );
		} else // value
			this[ j ] = info[ j ];
	}

	if ( this.onConnectionsChange )
		this.onConnectionsChange();

	// FOR LEGACY, PLEASE REMOVE ON NEXT VERSION
	for ( var i in this.inputs ) {
		var input = this.inputs[ i ];
		if ( !input.link || !input.link.length )
			continue;
		var link = input.link;
		if ( typeof(link) != "object")
			continue;
		input.link = link[ 0 ];
		this.graph.links[ link[ 0 ] ] = { id: link[ 0 ], originId: link[ 1 ], originSlot: link[ 2 ], targetId: link[ 3 ], targetSlot: link[ 4 ] };
	}
	for ( var i in this.outputs ) {
		var output = this.outputs[ i ];
		if ( !output.links )
			continue;
		for ( var j in output.links ) {
			var link = output.links[ j ];
			if ( typeof(link) != "object")
				continue;
			output.links[ j ] = link[ 0 ];
		}
	}

};

/**
* serialize the content
* @method serialize
*/

LGraphNode.prototype.serialize = function() {
	var o = {};
	o.id = this.id;
//		title: this.title,
	o.type = this.type;
	o.pos = this.pos;
	if ( this.resizable )
		o.size = this.size;
	if ( this.data && this.data.length )
		o.data = this.data;
	if ( this.flags && this.flags.length )
		o.flags = LiteGraph.cloneObject( this.flags );
//		inputs: this.inputs,
//		outputs: this.outputs,
	if ( this.enabled === false )
		o.enabled = this.enabled;

	if ( !isEmpty( this.properties ) )
		o.properties = LiteGraph.cloneObject( this.properties );

	if ( !o.type )
		o.type = this.constructor.type;

//	if (this.color)
//		o.color = this.color;
//	if (this.bgcolor)
//		o.bgcolor = this.bgcolor;
//	if (this.boxcolor)
//		o.boxcolor = this.boxcolor;
//	if (this.shape)
//		o.shape = this.shape;

	if ( this.onSerialize )
		this.onSerialize( o );

	return o;
};


/* Creates a clone of this node */
LGraphNode.prototype.clone = function() {
	var node = LiteGraph.createNode( this.type, this.title );

	// we clone it because serialize returns shared containers
	var data = LiteGraph.cloneObject( this.serialize() );

	// remove links
	if ( data.inputs )
		for ( var i in data.inputs )
			data.inputs[ i ].links = null;
	if ( data.outputs )
		for ( var i in data.outputs )
			data.outputs[ i ].links = null;
	delete data.id;
	// remove links
	node.configure( data );

	return node;
};


/**
* serialize and stringify
* @method toString
*/

LGraphNode.prototype.toString = function() {
	return JSON.stringify( this.serialize() );
};
// LGraphNode.prototype.unserialize = function(info) {} // this cannot be done from within, must be done in LiteGraph


/**
* get the title string
* @method getTitle
*/

LGraphNode.prototype.getTitle = function() {
	return this.title || this.constructor.title;
};



// Execution *************************
/**
* sets the output data
* @method setOutputData
* @param {number} slot
* @param {*} data
*/
LGraphNode.prototype.setOutputData = function( slot, data ) {
	if ( !this.outputs )
		return;

	if ( slot > -1 && slot < this.outputs.length && this.outputs[ slot ] && this.outputs[ slot ].links != null ) {
		var output = this.outputs[ slot ];
		for ( var i = 0, l = output.links.length; i < l; i++ ) {
			var linkId = output.links[ i ];
			var link = this.graph.links[ linkId ];
			link.data = data;
			var node = this.graph.getNodeById( link.targetId );
			if ( node )
				node.invalidateConnectedLinks();
		}
	}
};

/**
* retrieves the input data (data traveling through the connection) from one slot
* @method getInputData
* @param {number} slot
* @return {*} data or if it is not connected returns undefined
*/
LGraphNode.prototype.getInputData = function( slot, forceUpdate ) {
	if ( !this.inputs )
		return; // undefined;

	if ( slot < 0 || slot >= this.inputs.length )
		return; // slot is out of range

	var input = this.inputs[ slot ];

	if ( input.type == LiteGraph.EXECUTE )
		return; // only data ports shoud carry data

	if ( !input.links || input.links.length == 0 )
		return; // not connected, TODO: check whether this is necessary anyway

	var linkId = input.links[ 0 ]; // only one data port is allowed to be connected at a time
	var link = this.graph.links[ linkId ];

	if ( !forceUpdate && link.data != undefined )
		return link.data;

	var node = this.graph.getNodeById( link.originId );
	if ( !node )
		return link.data;

	if ( node.updateOutputData )
		node.updateOutputData( link.originSlot );
	else if ( node.onExecute )
		node.onExecute();

	return link.data;
};

/**
* tells you if there is a connection in one input slot
* @method isInputConnected
* @param {number} slot
* @return {boolean}
*/
LGraphNode.prototype.isInputConnected = function( slot ) {
	if ( !this.inputs )
		return false;
	return (slot < this.inputs.length && this.inputs[ slot ].links);
};

/**
* tells you info about an input connection (which node, type, etc)
* @method getInputInfo
* @param {number} slot
* @return {Object} object or null
*/
LGraphNode.prototype.getInputInfo = function( slot ) {
	if ( !this.inputs )
		return null;
	if ( slot < this.inputs.length )
		return this.inputs[ slot ];
	return null;
};


/**
* tells you info about an output connection (which node, type, etc)
* @method getOutputInfo
* @param {number} slot
* @return {Object}  object or null
*/
LGraphNode.prototype.getOutputInfo = function( slot ) {
	if ( !this.outputs )
		return null;
	if ( slot < this.outputs.length )
		return this.outputs[ slot ];
	return null;
};


/**
* tells you if there is a connection in one output slot
* @method isOutputConnected
* @param {number} slot
* @return {boolean}
*/
LGraphNode.prototype.isOutputConnected = function( slot ) {
	if ( !this.outputs )
		return null;
	return (slot < this.outputs.length && this.outputs[ slot ].links && this.outputs[ slot ].links.length);
};

/**
* retrieves all the nodes connected to this output slot
* @method getOutputNodes
* @param {number} slot
* @return {array}
*/
LGraphNode.prototype.getOutputNodes = function( slot ) {
	if ( !this.outputs || this.outputs.length == 0 ) return null;
	if ( slot < this.outputs.length ) {
		var output = this.outputs[ slot ];
		var r = [];
		for ( var i = 0; i < output.length; i++ )
			r.push( this.graph.getNodeById( output.links[ i ].targetId ) );
		return r;
	}
	return null;
};

/**
* Triggers an event in this node, this will trigger any output with the same name
* @method trigger
* @param {String} event name ( "onPlay", ... )
*/
LGraphNode.prototype.trigger = function( action ) {
	if ( !this.outputs || !this.outputs.length )
		return;

	if ( this.graph )
		this.graph._lastTriggerTime = LiteGraph.getTime();

	for ( var i = 0; i < this.outputs.length; ++i ) {
		var output = this.outputs[ i ];
		if ( output.type !== LiteGraph.EXECUTE || output.name != action )
			continue;

		var links = output.links;
		if ( links )
			for ( var k = 0; k < links.length; ++k ) {
				var linkInfo = this.graph.links[ links[ k ] ];
				if ( !linkInfo )
					continue;
				var node = this.graph.getNodeById( linkInfo.targetId );
				if ( !node )
					continue;

				// used to mark events in graph
				linkInfo._lastTime = LiteGraph.getTime();

				var targetConnection = node.inputs[ linkInfo.targetSlot ];

				if ( node.enabled ) {
					if ( node.onExecute )
						node.onExecute( targetConnection.name );
				}
			}
	}
};

/**
* add a list of properties to this node
* @method addProperties
* @param {Object} info this is the list of property names with the metadata (type, default, set, get, values, etc.)
*/
LGraphNode.prototype.addProperties = function( info ) {
	if ( isEmpty( info ) )
		return;

	for ( var i in info ) {
		var o = { name: i };
		var metadata = info[ i ];

		if ( !this.properties )
			this.properties = {};

		if ( typeof metadata === "object" ) {
			var definition = {};
			for ( var j in metadata ) {
				var v = metadata[ j ];
				if ( j === "set" || j === "get") {
					if ( typeof v === "function") {
						definition[ j ] = v.bind( this );
					}
				} else
					o[ j ] = v;
			}
			if ( !isEmpty( definition ) ) {
				definition.enumerable = true;
				Object.defineProperty( this.properties, i, definition );
			}
		} else
			o.default = metadata;

		if ( !this.propertiesInfo )
			this.propertiesInfo = [];

		this.propertiesInfo.push( o );
		this.properties[ i ] = o.default;
	}
};


// connections

/**
* add a new output slot to use in this node
* @method addOutput
* @param {string} name
* @param {string} type string defining the output type ("vec3","number",...)
* @param {Object} extraInfo this can be used to have special properties of an output (label, special color, position, etc)
*/
LGraphNode.prototype.addOutput = function( name, type, extraInfo ) {
	var o = { name: name, type: type, links: null };
	if ( extraInfo )
		for ( var i in extraInfo )
			o[ i ] = extraInfo[ i ];

	if ( !this.outputs )
		this.outputs = [];
	this.outputs.push( o );
	if ( this.onOutputAdded )
		this.onOutputAdded( o );
	this.size = this.computeSize();
	return o;
};

/**
* add a new output slot to use in this node
* @method addOutputs
* @param {Array} array of triplets like [[name,type,extraInfo],[...]]
*/
LGraphNode.prototype.addOutputs = function( array ) {
	for ( var i = 0; i < array.length; ++i ) {
		var info = array[ i ];
		var o = { name:info[ 0 ], type:info[ 1 ], link:null };
		if ( array[ 2 ] )
			for ( var j in info[ 2 ] )
				o[ j ] = info[ 2 ][ j ];

		if ( !this.outputs )
			this.outputs = [];
		this.outputs.push( o );
		if ( this.onOutputAdded )
			this.onOutputAdded( o );
	}

	this.size = this.computeSize();
};

/**
* remove an existing output slot
* @method removeOutput
* @param {number} slot
*/
LGraphNode.prototype.removeOutput = function( slot ) {
	this.disconnectOutput( slot );
	this.outputs.splice( slot, 1 );
	this.size = this.computeSize();
	if ( this.onOutputRemoved )
		this.onOutputRemoved( slot );
};

/**
* add a new input slot to use in this node
* @method addInput
* @param {string} name
* @param {string} type string defining the input type ("vec3","number",...), it its a generic one use 0
* @param {Object} extraInfo this can be used to have special properties of an input (label, color, position, etc)
*/
LGraphNode.prototype.addInput = function( name, type, extraInfo ) {
	type = type || 0;
	var o = { name:name, type:type, link:null };
	if ( extraInfo )
		for ( var i in extraInfo )
			o[ i ] = extraInfo[ i ];

	if ( !this.inputs )
		this.inputs = [];
	this.inputs.push( o );
	this.size = this.computeSize();
	if ( this.onInputAdded )
		this.onInputAdded( o );
	return o;
};

/**
* add several new input slots in this node
* @method addInputs
* @param {Array} array of triplets like [[name,type,extraInfo],[...]]
*/
LGraphNode.prototype.addInputs = function( array ) {
	for ( var i = 0; i < array.length; ++i ) {
		var info = array[ i ];
		var o = { name:info[ 0 ], type:info[ 1 ], link:null };
		if ( array[ 2 ] )
			for ( var j in info[ 2 ] )
				o[ j ] = info[ 2 ][ j ];

		if ( !this.inputs )
			this.inputs = [];
		this.inputs.push( o );
		if ( this.onInputAdded )
			this.onInputAdded( o );
	}

	this.size = this.computeSize();
};

/**
* remove an existing input slot
* @method removeInput
* @param {number} slot
*/
LGraphNode.prototype.removeInput = function( slot ) {
	this.disconnectInput( slot );
	this.inputs.splice( slot, 1 );
	this.size = this.computeSize();
	if ( this.onInputRemoved )
		this.onInputRemoved( slot );
};

/**
* add an special connection to this node (used for special kinds of graphs)
* @method addConnection
* @param {string} name
* @param {string} type string defining the input type ("vec3","number",...)
* @param {[x,y]} pos position of the connection inside the node
* @param {string} direction if is input or output
*/
LGraphNode.prototype.addConnection = function( name, type, pos, direction ) {
	var o = {
		name: name,
		type: type,
		pos: pos,
		direction: direction,
		links: null
	};
	this.connections.push( o );
	return o;
};

/**
* computes the size of a node according to its inputs and output slots
* @method computeSize
* @param {number} minHeight
* @return {number} the total size
*/
LGraphNode.prototype.computeSize = function( minHeight, out ) {
	var canvas = computeTextSize.canvas || (computeTextSize.canvas = document.createElement("canvas"));
	var ctx = canvas.getContext("2d");

	var rows = Math.max( this.inputs ? this.inputs.length : 1, this.outputs ? this.outputs.length : 1 );
	var size = out || [ 0, 0 ];
	rows = Math.max( rows, 1 );
	size[ 1 ] = rows * 14 + 6;

	var titleWidth = computeTextSize( this.title, LGraphCanvas.titleTextFont );
	var titleHeight = LiteGraph.NODE_TITLE_HEIGHT;
	var inputToOutputSeparation = 10;

	var inputWidth = 0;
	var outputWidth = 0;

	if ( this.inputs )
		for ( var i = 0, l = this.inputs.length; i < l; ++i ) {
			var input = this.inputs[ i ];
			var text = input.label != null ? input.label : input.name || "";
			var textWidth = computeTextSize( text, LGraphCanvas.innerTextFont );
			if ( inputWidth < textWidth )
				inputWidth = textWidth;
		}

	if ( this.outputs )
		for ( var i = 0, l = this.outputs.length; i < l; ++i ) {
			var output = this.outputs[ i ];
			var text = output.label != null ? output.label : output.name || "";
			var textWidth = computeTextSize( text, LGraphCanvas.innerTextFont );
			if ( outputWidth < textWidth )
				outputWidth = textWidth;
		}

	size[ 0 ] = Math.max( inputWidth + 10 + outputWidth + 10 + inputToOutputSeparation, 4 + titleWidth + titleHeight );
	size[ 0 ] = Math.max( size[ 0 ], LiteGraph.NODE_MIN_WIDTH );

	if ( this.onComputeMinSize ) {
		var minSize = this.onComputeMinSize( ctx );
		if ( minSize ) {
			size[ 0 ] = Math.max( size[ 0 ], minSize[ 0 ] );
			size[ 1 ] = Math.max( size[ 1 ], minSize[ 1 ] );
		}
	}

	function computeTextSize( text, font ) {
		if ( !text )
			return 0;
		ctx.font = font;
		return ctx.measureText( text ).width;
	}

	return size;
};

/**
* returns the bounding of the object, used for rendering purposes
* @method getBounding
* @return {Float32Array[4]} the total size
*/
LGraphNode.prototype.getBounding = function() {
	return new Float32Array([ this.pos[ 0 ] - 4, this.pos[ 1 ] - LiteGraph.NODE_TITLE_HEIGHT, this.pos[ 0 ] + this.size[ 0 ] + 4, this.pos[ 1 ] + this.size[ 1 ] + LiteGraph.NODE_TITLE_HEIGHT ]);
};

/**
* checks if a point is inside the shape of a node
* @method isPointInsideNode
* @param {number} x
* @param {number} y
* @return {boolean}
*/
LGraphNode.prototype.isPointInsideNode = function( x, y, margin ) {
	margin = margin || 0;

	var titleHeight = LiteGraph.NODE_TITLE_HEIGHT;
	var left = this.pos[ 0 ] - margin;
	var top = this.pos[ 1 ] - titleHeight - margin;
	var width = this.size[ 0 ] + 2 * margin;
	var height = (this.flags.collapsed ? 0 : this.size[ 1 ]) + titleHeight + 2 * margin;

	// if ( distance([x,y], [this.pos[0] + this.size[0]*0.5, this.pos[1] + this.size[1]*0.5]) < LiteGraph.NODE_COLLAPSED_RADIUS)
	if ( isInsideRectangle( x, y, left, top, width, height ) )
		return true;

	return false;
};

/**
* checks if a point is inside a node slot, and returns info about which slot
* @method getSlotInPosition
* @param {number} x
* @param {number} y
* @return {Object} if found the object contains { input|output: slot object, slot: number, linkPos: [x,y] }
*/
LGraphNode.prototype.getSlotInPosition = function( x, y ) {
	// search for inputs
	if ( this.inputs )
		for ( var i = 0, l = this.inputs.length; i < l; ++i ) {
			var input = this.inputs[ i ];
			var linkPos = this.getConnectionPos( true, i );
			if ( isInsideRectangle( x, y, linkPos[ 0 ] - 10, linkPos[ 1 ] - 5, 20, 10 ) )
				return { input: input, slot: i, linkPos: linkPos, locked: input.locked };
		}

	if ( this.outputs )
		for ( var i = 0, l = this.outputs.length; i < l; ++i ) {
			var output = this.outputs[ i ];
			var linkPos = this.getConnectionPos( false, i );
			if ( isInsideRectangle( x, y, linkPos[ 0 ] - 10, linkPos[ 1 ] - 5, 20, 10 ) )
				return { output: output, slot: i, linkPos: linkPos, locked: output.locked };
		}

	return null;
};

/**
* returns the input slot with a given name (used for dynamic slots), -1 if not found
* @method findInputSlot
* @param {string} name the name of the slot
* @return {number} the slot (-1 if not found)
*/
LGraphNode.prototype.findInputSlot = function( name ) {
	if ( !this.inputs ) return -1;
	for ( var i = 0, l = this.inputs.length; i < l; ++i )
		if ( name == this.inputs[ i ].name )
			return i;
	return -1;
};

/**
* returns the output slot with a given name (used for dynamic slots), -1 if not found
* @method findOutputSlot
* @param {string} name the name of the slot
* @return {number} the slot (-1 if not found)
*/
LGraphNode.prototype.findOutputSlot = function( name ) {
	if ( !this.outputs ) return -1;
	for ( var i = 0, l = this.outputs.length; i < l; ++i )
		if ( name == this.outputs[ i ].name )
			return i;
	return -1;
};

/**
* connect this node output to the input of another node
* @method connect
* @param {numberOrString} slot (could be the number of the slot or the string with the name of the slot)
* @param {LGraphNode} node the target node
* @param {numberOrString} targetSlot the input slot of the target node (could be the number of the slot or the string with the name of the slot, or -1 to connect a trigger)
* @return {boolean} if it was connected succesfully
*/
LGraphNode.prototype.connect = function( slot, node, targetSlot ) {
	targetSlot = targetSlot || 0;

	// seek for the output slot
	if ( slot.constructor === String ) {
		slot = this.findOutputSlot( slot );
		if ( slot == -1 ) {
			if ( LiteGraph.debug )
				console.log("Connect: Error, no slot of name " + slot );
			return false;
		}
	} else if ( !this.outputs || slot >= this.outputs.length ) {
		if ( LiteGraph.debug )
			console.log("Connect: Error, slot number not found");
		return false;
	}

	if ( node && node.constructor === Number )
		node = this.graph.getNodeById( node );
	if ( !node )
		throw("Node not found");

	// avoid loopback
	if ( node == this )
		return false;
	// if ( node.constructor != LGraphNode ) throw ("LGraphNode.connect: node is not of type LGraphNode");

	// you can specify the slot by name
	if ( targetSlot.constructor === String ) {
		targetSlot = node.findInputSlot( targetSlot );
		if ( targetSlot == -1 ) {
			if ( LiteGraph.debug )
				console.log("Connect: Error, no slot of name " + targetSlot );
			return false;
		}
	} else if ( targetSlot === LiteGraph.EXECUTE ) {
		// search for first slot with event?
		/*
		// create input for trigger
		var input = node.addInput("onTrigger", LiteGraph.EXECUTE );
		targetSlot = node.inputs.length - 1; // last one is the one created
		node.mode = LiteGraph.ON_TRIGGER;
		*/
		return false;
	} else if ( !node.inputs || targetSlot >= node.inputs.length ) {
		if ( LiteGraph.debug )
			console.log("Connect: Error, slot number not found");
		return false;
	}

	var input = node.inputs[ targetSlot ];

	// if there is something already connected to a data port, disconnect it
	if ( input.links && input.type != LiteGraph.EXECUTE )
		node.disconnectInput( targetSlot );

	// why here??
	this.setDirtyCanvas( false, true );
	this.graph.connectionChange( this );

	var output = this.outputs[ slot ];

	// allows nodes to block connection
	if ( node.onConnectInput )
		if ( node.onConnectInput( targetSlot, output.type, output ) === false )
			return false;

	if ( LiteGraph.isValidConnection( output.type, input.type ) ) {
		if ( node.invalidateConnectedLinks )
			node.invalidateConnectedLinks();

		var link = {
			id: this.graph.lastLinkId++,
			originId: this.id,
			originSlot: slot,
			targetId: node.id,
			targetSlot: targetSlot
		};

		// add to graph links list
		this.graph.links[ link.id ] = link;

		// connect in output
		if ( output.links == null )
			output.links = [];
		output.links.push( link.id );
		// connect in input
		if ( input.links == null )
			input.links = [];
		input.links.push( link.id );

		if ( this.onConnectionsChange )
			this.onConnectionsChange( LiteGraph.OUTPUT, slot );
		if ( node.onConnectionsChange )
			node.onConnectionsChange( LiteGraph.OUTPUT, targetSlot );
	}

	this.setDirtyCanvas( false, true );
	this.graph.connectionChange( this );

	return true;
};

/**
* disconnect one output to an specific node
* @method disconnectOutput
* @param {numberOrString} slot (could be the number of the slot or the string with the name of the slot)
* @param {LGraphNode} targetNode the target node to which this slot is connected [Optional, if not targetNode is specified all nodes will be disconnected]
* @return {boolean} if it was disconnected succesfully
*/
LGraphNode.prototype.disconnectOutput = function( slot, targetNode ) {
	if ( slot.constructor === String ) {
		slot = this.findOutputSlot( slot );
		if ( slot == -1 ) {
			if ( LiteGraph.debug )
				console.log("Connect: Error, no slot of name " + slot );
			return false;
		}
	} else if ( !this.outputs || slot >= this.outputs.length ) {
		if ( LiteGraph.debug )
			console.log("Connect: Error, slot number not found");
		return false;
	}

	// get output slot
	var output = this.outputs[ slot ];
	if ( !output.links )
		return false;

	// one of the links
	if ( targetNode ) {
		if ( targetNode.constructor === Number )
			targetNode = this.graph.getNodeById( targetNode );
		if ( !targetNode )
			throw("Target Node not found");

		for ( var i = 0, l = output.links.length; i < l; i++ ) {
			var linkId = output.links[ i ];
			var linkInfo = this.graph.links[ linkId ];

			// is the link we are searching for...
			if ( linkInfo.targetId == targetNode.id ) {
				output.links.splice( i, 1 ); // remove here
				if ( output.links.length == 0 ) output.links = null;

				var input = targetNode.inputs[ linkInfo.targetSlot ];

				for ( var j = 0, m = input.links.length; j < m; j++ ) {
					if ( input.links[ j ] == linkId ) {
						input.links.splice( j, 1 ); // remove there
						if ( input.links.length == 0 ) input.links = null;
						break;
					}
				}
				delete this.graph.links[ linkId ]; // remove the link from the links pool
				break;
			}
		}
	} else // all the links
	{
		for ( var i = 0, l = output.links.length; i < l; i++ ) {
			var linkId = output.links[ i ];
			var linkInfo = this.graph.links[ linkId ];

			var targetNode = this.graph.getNodeById( linkInfo.targetId );
			if ( targetNode ) {
				var input = targetNode.inputs[ linkInfo.targetSlot ];

				for ( var j = 0, m = input.links.length; j < m; j++ ) {
					if ( input.links[ j ] == linkId ) {
						input.links.splice( j, 1 ); // remove other side link
						if ( input.links.length == 0 ) input.links = null;
						break;
					}
				}
			}
			delete this.graph.links[ linkId ]; // remove the link from the links pool
		}
		output.links = null;
	}

	this.setDirtyCanvas( false, true );
	this.graph.connectionChange( this );
	return true;
};

/**
* disconnect one input
* @method disconnectInput
* @param {numberOrString} slot (could be the number of the slot or the string with the name of the slot)
* @return {boolean} if it was disconnected succesfully
*/
LGraphNode.prototype.disconnectInput = function( slot ) {
	// seek for the output slot
	if ( slot.constructor === String ) {
		slot = this.findInputSlot( slot );
		if ( slot == -1 ) {
			if ( LiteGraph.debug )
				console.log("Connect: Error, no slot of name " + slot );
			return false;
		}
	} else if ( !this.inputs || slot >= this.inputs.length ) {
		if ( LiteGraph.debug )
			console.log("Connect: Error, slot number not found");
		return false;
	}

	var input = this.inputs[ slot ];
	if ( !input )
		return false;

	var disconnected = false;

	if ( input.links ) {
		for ( var i = 0, l = input.links.length; i < l; i++ ) {
			var linkId = input.links[ i ];

			// remove other side
			var linkInfo = this.graph.links[ linkId ];
			if ( linkInfo ) {
				var node = this.graph.getNodeById( linkInfo.originId );
				if ( !node )
					continue;

				var output = node.outputs[ linkInfo.originSlot ];
				if ( !output || !output.links )
					continue;

				// check outputs
				for ( var j = 0, m = output.links.length; j < m; j++ ) {
					var linkInfo = this.graph.links[ output.links[ j ] ];
					if ( linkInfo.targetId == this.id ) {
						output.links.splice( j, 1 );
						if ( output.links.length == 0 ) output.links = null;
						disconnected = true;
						break;
					}
				}

				if ( this.onConnectionsChange )
					this.onConnectionsChange( LiteGraph.OUTPUT );
				if ( node.onConnectionsChange )
					node.onConnectionsChange( LiteGraph.INPUT );
			}
		}
		input.links = null;
	}

	if ( disconnected ) {
		if ( this.invalidateConnectedLinks )
			this.invalidateConnectedLinks();
		this.setDirtyCanvas( false, true );
		this.graph.connectionChange( this );
	}

	return disconnected;
};

/**
* returns the center of a connection point in canvas coords
* @method getConnectionPos
* @param {boolean} isInput true if if a input slot, false if it is an output
* @param {numberOrString} slot (could be the number of the slot or the string with the name of the slot)
* @return {[x,y]} the position
**/
LGraphNode.prototype.getConnectionPos = function( isInput, slotNumber ) {
	if ( this.flags.collapsed ) {
		if ( isInput )
			return [ this.pos[ 0 ], this.pos[ 1 ] - LiteGraph.NODE_TITLE_HEIGHT * 0.5 ];
		else
			return [ this.pos[ 0 ] + this.size[ 0 ], this.pos[ 1 ] - LiteGraph.NODE_TITLE_HEIGHT * 0.5 ];
		// return [this.pos[0] + this.size[0] * 0.5, this.pos[1] + this.size[1] * 0.5];
	}

	if ( isInput && slotNumber == -1 ) {
		return [ this.pos[ 0 ] + 10, this.pos[ 1 ] + 10 ];
	}

	if ( isInput && this.inputs.length > slotNumber && this.inputs[ slotNumber ].pos )
		return [ this.pos[ 0 ] + this.inputs[ slotNumber ].pos[ 0 ], this.pos[ 1 ] + this.inputs[ slotNumber ].pos[ 1 ] ];
	else if ( !isInput && this.outputs.length > slotNumber && this.outputs[ slotNumber ].pos )
		return [ this.pos[ 0 ] + this.outputs[ slotNumber ].pos[ 0 ], this.pos[ 1 ] + this.outputs[ slotNumber ].pos[ 1 ] ];

	if ( !isInput ) // output
		return [ this.pos[ 0 ] + this.size[ 0 ] + 1, this.pos[ 1 ] + 10 + slotNumber * LiteGraph.NODE_SLOT_HEIGHT ];
	return [ this.pos[ 0 ], this.pos[ 1 ] + 10 + slotNumber * LiteGraph.NODE_SLOT_HEIGHT ];
};

/* Force align to grid */
LGraphNode.prototype.alignToGrid = function() {
	this.pos[ 0 ] = LiteGraph.CANVAS_GRID_SIZE * Math.round( this.pos[ 0 ] / LiteGraph.CANVAS_GRID_SIZE );
	this.pos[ 1 ] = LiteGraph.CANVAS_GRID_SIZE * Math.round( this.pos[ 1 ] / LiteGraph.CANVAS_GRID_SIZE );
};


/* Console output */
LGraphNode.prototype.trace = function( msg ) {
	if ( !this.console )
		this.console = [];
	this.console.push( msg );
	if ( this.console.length > LGraphNode.MAX_CONSOLE )
		this.console.shift();

	this.graph.onNodeTrace( this, msg );
};

/* Forces to redraw or the main canvas (LGraphNode) or the bg canvas (links) */
LGraphNode.prototype.setDirtyCanvas = function( dirtyForeground, dirtyBackground ) {
	if ( !this.graph )
		return;
	this.graph.sendActionToCanvas("setDirty", [ dirtyForeground, dirtyBackground ]);
};

LGraphNode.prototype.loadImage = function( url ) {
	var img = new Image();
	img.src = LiteGraph.nodeImagesPath + url;
	img.ready = false;

	var that = this;
	img.onload = function() {
		this.ready = true;
		that.setDirtyCanvas( true );
	};
	return img;
};

// safe LGraphNode action execution (not sure if safe)
/*
LGraphNode.prototype.executeAction = function(action) {
	if (action == "") return false;

	if ( action.indexOf(";") != -1 || action.indexOf("}") != -1) {
		this.trace("Error: Action contains unsafe characters");
		return false;
	}

	var tokens = action.split("(");
	var funcName = tokens[0];
	if ( typeof(this[funcName]) != "function") {
		this.trace("Error: Action not found on node: " + funcName);
		return false;
	}

	var code = action;

	try
	{
		var _foo = eval;
		eval = null;
		(new Function("with(this) { " + code + "}")).call(this);
		eval = _foo;
	}
	catch (err) {
		this.trace("Error executing action {" + action + "} :" + err);
		return false;
	}

	return true;
}
*/

/* Allows to get onMouseMove and onMouseUp events even if the mouse is out of focus */
LGraphNode.prototype.captureInput = function( v ) {
	if ( !this.graph || !this.graph.listOfGraphcanvas )
		return;

	var list = this.graph.listOfGraphcanvas;

	for ( var i = 0; i < list.length; ++i ) {
		var c = list[ i ];
		// releasing somebody elses capture?!
		if ( !v && c.nodeCapturingInput != this )
			continue;

		// change
		c.nodeCapturingInput = v ? this : null;
	}
};

/**
* Collapse the node to make it smaller on the canvas
* @method collapse
**/
LGraphNode.prototype.collapse = function() {
	if ( !this.flags.collapsed )
		this.flags.collapsed = true;
	else
		this.flags.collapsed = false;
	this.setDirtyCanvas( true, true );
};

/**
* Forces the node to be rendered in the back canvas on top of the background
* @method background
**/

LGraphNode.prototype.background = function( v ) {
	if ( v === undefined )
		this.flags.background = !this.flags.background;
	else
		this.flags.background = v;
};

LGraphNode.prototype.localToScreen = function( x, y, graphcanvas ) {
	return [ (x + this.pos[ 0 ]) * graphcanvas.scale + graphcanvas.offset[ 0 ],
		(y + this.pos[ 1 ]) * graphcanvas.scale + graphcanvas.offset[ 1 ] ];
};

LGraphNode.prototype.invalidateConnectedLinks = function( slot ) {
	if ( !this.outputs )
		return;

	var that = this;

	if ( slot !== undefined )
		invalidateOutputSlot( slot );
	else
		for ( var i = 0, l = this.outputs.length; i < l; i++ )
			invalidateOutputSlot( i );

	function invalidateOutputSlot( slot ) {
		var output = that.outputs[ slot ];
		if ( output.type != LiteGraph.EXECUTE )
			if ( output.links )
				for ( var j = 0, m = output.links.length; j < m; j++ ) {
					var linkId = output.links[ j ];
					var link = that.graph.links[ linkId ];
					if ( link.data !== undefined ) {
						delete link.data;
						var node = that.graph.getNodeById( link.targetId );
						if ( node && node.invalidateConnectedLinks )
							node.invalidateConnectedLinks();
					}
				}
	}
};


// *********************************************************************************
// LGraphCanvas: LGraph renderer CLASS
// *********************************************************************************

/**
* The Global Scope. It contains all the registered node classes.
* Valid callbacks are: onNodeSelected, onNodeDeselected, onShowNodePanel, onNodeDblClicked
*
* @class LGraphCanvas
* @constructor
* @param {HTMLCanvas} canvas the canvas where you want to render (it accepts a selector in string format or the canvas itself)
* @param {LGraph} graph [optional]
* @param {Object} options [optional] { skipRendering, autoresize }
*/
function LGraphCanvas( canvas, graph, options ) {
	options = options || {};

	// if (graph === undefined)
	//	throw ("No graph assigned");

	if ( canvas && canvas.constructor === String )
		canvas = document.querySelector( canvas );

	this.maxZoom = 1;
	this.minZoom = 0.15;
	this.zoomSensitivity = 0.05;

	this.defaultLinkColor = "#AAC";

	this.highqualityRender = true;
	this.editorAlpha = 1; // used for transition
	this.pauseRendering = false;
	this.renderShadows = false;
	this.clearBackground = true;

	this.renderOnlySelected = true;
	this.showInfo = true;
	this.allowDragcanvas = true;
	this.allowDragnodes = true;

	this.alwaysRenderBackground = false;
	this.renderConnectionsShadows = false; // too much cpu
	this.renderConnectionsBorder = false;
	this.renderCurvedConnections = true;
	this.renderConnectionArrows = false;
	this.renderConnectionFlow = true;

	this.connectionsWidth = 2;
	this.selectionOutlineWidth = 6;

	this.targetInterval = 1 / 60;

	// link canvas and graph
	if ( graph )
		graph.attachCanvas( this );

	this.setCanvas( canvas );
	this.clear();

	if ( !options.skipRender )
		this.startRendering();

	this.autoresize = options.autoresize;
}

LGraphCanvas.linkTypeColors = { "-1":"#F85", "number":"#AAC", "node":"#DCA" };
LGraphCanvas.titleTextFont = "bold 14px Arial";
LGraphCanvas.innerTextFont = "normal 12px Arial";

/**
* clears all the data inside
*
* @method clear
*/
LGraphCanvas.prototype.clear = function() {
	this.frame = 0;
	this.lastDrawTime = 0;
	this.renderTime = 0;
	this.fps = 0;

	this.scale = 1;
	this.offset = [ 0, 0 ];

	this.selectedNodes = {};
	this.nodeDragged = null;
	this.nodeOver = null;
	this.nodeCapturingInput = null;
	this.connectingNode = null;

	this.dirtyCanvas = true;
	this.dirtyBgcanvas = true;
	this.dirtyArea = null;

	this.nodeInPanel = null;

	this.lastMouse = [ 0, 0 ];
	this.lastMouseclick = 0;

	if ( this.onClear )
		this.onClear();
	// this.UIinit();
};

/**
* assigns a graph, you can reasign graphs to the same canvas
*
* @method setGraph
* @param {LGraph} graph
*/
LGraphCanvas.prototype.setGraph = function( graph, skipClear ) {
	if ( this.graph == graph )
		return;

	if ( !skipClear )
		this.clear();

	if ( !graph && this.graph ) {
		this.graph.detachCanvas( this );
		return;
	}

	/*
	if (this.graph)
		this.graph.canvas = null; // remove old graph link to the canvas
	this.graph = graph;
	if (this.graph)
		this.graph.canvas = this;
	*/
	graph.attachCanvas( this );
	this.setDirty( true, true );
};

/**
* opens a graph contained inside a node in the current graph
*
* @method openSubgraph
* @param {LGraph} graph
*/
LGraphCanvas.prototype.openSubgraph = function( graph ) {
	if ( !graph )
		throw("graph cannot be null");

	if ( this.graph == graph )
		throw("graph cannot be the same");

	this.deselectAllNodes();

	this.clear();

	if ( this.graph ) {
		if ( !this._graphStack )
			this._graphStack = [];
		this._graphStack.push( this.graph );
	}

	graph.attachCanvas( this );
	this.setDirty( true, true );
};

/**
* closes a subgraph contained inside a node
*
* @method closeSubgraph
* @param {LGraph} assigns a graph
*/
LGraphCanvas.prototype.closeSubgraph = function() {
	if ( !this._graphStack || this._graphStack.length == 0 )
		return;
	this.deselectAllNodes();
	var graph = this._graphStack.pop();
	graph.attachCanvas( this );
	this.setDirty( true, true );
};

/**
* assigns a canvas
*
* @method setCanvas
* @param {Canvas} assigns a canvas
*/
LGraphCanvas.prototype.setCanvas = function( canvas, skipEvents ) {
	var that = this;

	if ( canvas ) {
		if ( canvas.constructor === String ) {
			canvas = document.getElementById( canvas );
			if ( !canvas )
				throw("Error creating LiteGraph canvas: Canvas not found");
		}
	}

	if ( canvas === this.canvas )
		return;

	if ( !canvas && this.canvas ) {
		// maybe detach events from oldCanvas
		if ( !skipEvents )
			this.unbindEvents();
	}

	this.canvas = canvas;

	if ( !canvas )
		return;

	// this.canvas.tabindex = "1000";
	canvas.className += " lgraphcanvas";
	canvas.data = this;

	// bg canvas: used for non changing stuff
	this.bgcanvas = null;
	if ( !this.bgcanvas ) {
		this.bgcanvas = document.createElement("canvas");
		this.bgcanvas.width = this.canvas.width;
		this.bgcanvas.height = this.canvas.height;
	}

	if ( canvas.getContext == null ) {
		throw("This browser doesnt support Canvas");
	}

	var ctx = this.ctx = canvas.getContext("2d");
	if ( ctx == null ) {
		console.warn("This canvas seems to be WebGL, enabling WebGL renderer");
		this.enableWebGL();
	}

	// input:  (move and up could be unbinded)
	this._mousemoveCallback = this.processMouseMove.bind( this );
	this._mouseupCallback = this.processMouseUp.bind( this );

	if ( !skipEvents )
		this.bindEvents();
};

// used in some events to capture them
LGraphCanvas.prototype._doNothing = function doNothing( e ) { e.preventDefault(); return false; };
LGraphCanvas.prototype._doReturnTrue = function doNothing( e ) { e.preventDefault(); return true; };

LGraphCanvas.prototype.bindEvents = function() {
	if (	this._eventsBinded ) {
		console.warn("LGraphCanvas: events already binded");
		return;
	}

	var canvas = this.canvas;

	this._mousedownCallback = this.processMouseDown.bind( this );
	this._mousewheelCallback = this.processMouseWheel.bind( this );

	canvas.addEventListener("mousedown", this._mousedownCallback, true ); // down do not need to store the binded
	canvas.addEventListener("mousemove", this._mousemoveCallback );
	canvas.addEventListener("mousewheel", this._mousewheelCallback, false );

	canvas.addEventListener("contextmenu", this._doNothing );
	canvas.addEventListener("DOMMouseScroll", this._mousewheelCallback, false );

	// touch events
	if ( "touchstart" in document.documentElement ) {
		canvas.addEventListener("touchstart", this.touchHandler, true );
		canvas.addEventListener("touchmove", this.touchHandler, true );
		canvas.addEventListener("touchend", this.touchHandler, true );
		canvas.addEventListener("touchcancel", this.touchHandler, true );
	}

	// Keyboard ******************
	this._keyCallback = this.processKey.bind( this );

	canvas.addEventListener("keydown", this._keyCallback );
	canvas.addEventListener("keyup", this._keyCallback );

	// Droping Stuff over nodes ************************************
	this._ondropCallback = this.processDrop.bind( this );

	canvas.addEventListener("dragover", this._doNothing, false );
	canvas.addEventListener("dragend", this._doNothing, false );
	canvas.addEventListener("drop", this._ondropCallback, false );
	canvas.addEventListener("dragenter", this._doReturnTrue, false );

	this._eventsBinded = true;
};

LGraphCanvas.prototype.unbindEvents = function() {
	if (	!this._eventsBinded ) {
		console.warn("LGraphCanvas: no events binded");
		return;
	}

	this.canvas.removeEventListener( "mousedown", this._mousedownCallback );
	this.canvas.removeEventListener( "mousewheel", this._mousewheelCallback );
	this.canvas.removeEventListener( "DOMMouseScroll", this._mousewheelCallback );
	this.canvas.removeEventListener( "keydown", this._keyCallback );
	this.canvas.removeEventListener( "keyup", this._keyCallback );
	this.canvas.removeEventListener( "contextmenu", this._doNothing );
	this.canvas.removeEventListener( "drop", this._ondropCallback );
	this.canvas.removeEventListener( "dragenter", this._doReturnTrue );

	this.canvas.removeEventListener("touchstart", this.touchHandler );
	this.canvas.removeEventListener("touchmove", this.touchHandler );
	this.canvas.removeEventListener("touchend", this.touchHandler );
	this.canvas.removeEventListener("touchcancel", this.touchHandler );

	this._mousedownCallback = null;
	this._mousewheelCallback = null;
	this._keyCallback = null;
	this._ondropCallback = null;

	this._eventsBinded = false;
};

LGraphCanvas.getFileExtension = function( url ) {
	var question = url.indexOf("?");
	if ( question != -1 )
		url = url.substr( 0, question );
	var point = url.lastIndexOf(".");
	if ( point == -1 )
		return "";
	return url.substr( point + 1 ).toLowerCase();
};

// this file allows to render the canvas using WebGL instead of Canvas2D
// this is useful if you plant to render 3D objects inside your nodes
LGraphCanvas.prototype.enableWebGL = function() {
	if ( typeof(GL) === undefined )
		throw("litegl.js must be included to use a WebGL canvas");
	if ( typeof(enableWebGLCanvas) === undefined )
		throw("webglCanvas.js must be included to use this feature");

	this.gl = this.ctx = enableWebGLCanvas( this.canvas );
	this.ctx.webgl = true;
	this.bgcanvas = this.canvas;
	this.bgctx = this.gl;

	/*
	GL.create({ canvas: this.bgcanvas });
	this.bgctx = enableWebGLCanvas( this.bgcanvas );
	window.gl = this.gl;
	*/
};


/*
LGraphCanvas.prototype.UIinit = function() {
	var that = this;
	$("#node-console input").change(function(e) {
		if (e.target.value == "")
			return;

		var node = that.nodeInPanel;
		if (!node)
			return;

		node.trace("] " + e.target.value, "#333");
		if (node.onConsoleCommand) {
			if (!node.onConsoleCommand(e.target.value))
				node.trace("command not found", "#A33");
		}
		else if (e.target.value == "info") {
			node.trace("Special methods:");
			for (var i in node) {
				if (typeof(node[i]) == "function" && LGraphNode.prototype[i] == null && i.substr(0,2) != "on" && i[0] != "_")
					node.trace(" + " + i);
			}
		}
		else
		{
			try
			{
				eval("var _foo = function() { return ("+e.target.value+"); }");
				var result = _foo.call(node);
				if (result)
					node.trace(result.toString());
				delete window._foo;
			}
			catch(err) {
				node.trace("error: " + err, "#A33");
			}
		}

		this.value = "";
	});
}
*/

/**
* marks as dirty the canvas, this way it will be rendered again
*
* @class LGraphCanvas
* @method setDirty
* @param {bool} fgcanvas if the foreground canvas is dirty (the one containing the nodes)
* @param {bool} bgcanvas if the background canvas is dirty (the one containing the wires)
*/
LGraphCanvas.prototype.setDirty = function( fgcanvas, bgcanvas ) {
	if ( fgcanvas )
		this.dirtyCanvas = true;
	if ( bgcanvas )
		this.dirtyBgcanvas = true;
};

/**
* Used to attach the canvas in a popup
*
* @method getCanvasWindow
* @return {window} returns the window where the canvas is attached (the DOM root node)
*/
LGraphCanvas.prototype.getCanvasWindow = function() {
	var doc = this.canvas.ownerDocument;
	return doc.defaultView || doc.parentWindow;
};

/**
* starts rendering the content of the canvas when needed
*
* @method startRendering
*/
LGraphCanvas.prototype.startRendering = function() {
	if ( this.isRendering ) return; // already rendering

	this.isRendering = true;
	renderFrame.call( this );

	function renderFrame() {
		if ( !this.pauseRendering )
			this.draw();

		var window = this.getCanvasWindow();
		if ( this.isRendering )
			window.requestAnimationFrame( renderFrame.bind( this ) );
	}
};

/**
* stops rendering the content of the canvas (to save resources)
*
* @method stopRendering
*/
LGraphCanvas.prototype.stopRendering = function() {
	this.isRendering = false;
	/*
	if (this.renderingTimerId) {
		clearInterval(this.renderingTimerId);
		this.renderingTimerId = null;
	}
	*/
};

/* LiteGraphCanvas input */

LGraphCanvas.prototype.processMouseDown = function( e ) {
	if ( !this.graph )
		return;

	this.adjustMouseEvent( e );

	var refWindow = this.getCanvasWindow();
	var document = refWindow.document;

	// move mouse move event to the window in case it drags outside of the canvas
	this.canvas.removeEventListener("mousemove", this._mousemoveCallback );
	refWindow.document.addEventListener("mousemove", this._mousemoveCallback, true ); // catch for the entire window
	refWindow.document.addEventListener("mouseup", this._mouseupCallback, true );

	var n = this.graph.getNodeOnPos( e.canvasX, e.canvasY, this.visibleNodes );
	var skipDragging = false;

		LiteGraph.closeAllContextualMenus( refWindow );

	if ( e.which == 1 ) // left button mouse
	{
		if ( !e.shiftKey ) {
						// no node or another node selected
						if ( !n || !this.selectedNodes[ n.id ] )
				this.deselectAllNodes();
		}
		var clickingCanvasBg = false;

		// when clicked on top of a node
		// and it is not interactive
		if ( n ) {
			if ( !n.flags.background )
				this.bringToFront( n ); // if it wasnt selected?
			var skipAction = false;

			var titleHeight = LiteGraph.NODE_TITLE_HEIGHT;

			// not dragging mouse to connect two slots
			if ( !this.connectingNode && !n.flags.collapsed ) {
				// search for outputs
				if ( n.outputs )
					for ( var i = 0, l = n.outputs.length; i < l; ++i ) {
						var output = n.outputs[ i ];
						var linkPos = n.getConnectionPos( false, i );
						if ( isInsideRectangle( e.canvasX, e.canvasY, linkPos[ 0 ] - 10, linkPos[ 1 ] - 5, 20, 10 ) ) {
							this.connectingNode = n;
							this.connectingOutput = output;
							this.connectingPos = linkPos;
							this.connectingSlot = i;

							skipAction = true;
							break;
						}
					}

				// search for inputs
				if ( n.inputs )
					for ( var i = 0, l = n.inputs.length; i < l; ++i ) {
						var input = n.inputs[ i ];
						var linkPos = n.getConnectionPos( true, i );
						if ( isInsideRectangle( e.canvasX, e.canvasY, linkPos[ 0 ] - 10, linkPos[ 1 ] - 5, 20, 10 ) ) {
							if ( input.links ) {
								var shouldReconnect = input.links.length == 1;

								// save one link for reconnection
								var link = this.graph.links[ input.links[ 0 ] ];

								n.disconnectInput( i );

								// start reconnection if there was only one output connected to this input
								if ( link !== null && shouldReconnect ) {
									var node = this.graph.getNodeById( link.originId );
									if ( node !== null ) {
										var slot = link.originSlot;
										var output = node.outputs[ slot ];
										linkPos = node.getConnectionPos( false, slot );

										this.connectingNode = node;
										this.connectingOutput = output;
										this.connectingPos = linkPos;
										this.connectingSlot = slot;
									}
								}

								// this.dirtyBgcanvas = true;
								skipAction = true;
								break;
							}
						}
					}

				// Search for corner
				var corner = detectCorner( e.canvasX, e.canvasY, n.pos[ 0 ], n.pos[ 1 ] - titleHeight, n.size[ 0 ], n.size[ 1 ] + titleHeight, 10, 10 );
				if ( n.resizable && !skipAction && corner != 0 ) {
					this.resizingNode = n;
					this.resizingCorner = corner;
					if ( this.resizingCorner == 1 || this.resizingCorner == 3 )
						this.canvas.style.cursor = "nwse-resize";
					else if ( this.resizingCorner == 2 || this.resizingCorner == 4 )
						this.canvas.style.cursor = "nesw-resize";
					skipAction = true;
				}
			}

			// Search for corner
			if ( n.collapsible !== false && !skipAction && isInsideRectangle( e.canvasX, e.canvasY, n.pos[ 0 ] + n.size[ 0 ] - titleHeight, n.pos[ 1 ] - titleHeight, titleHeight, titleHeight ) ) {
				n.collapse();
				skipAction = true;
			}

			// it wasnt clicked on the links boxes
			if ( !skipAction ) {
				var blockDragNode = false;

				// double clicking
				var now = LiteGraph.getTime();
				if ( (now - this.lastMouseclick) < 300 && this.selectedNodes[ n.id ] ) {
					// double click node
					if ( n.onDblClick )
						n.onDblClick( e );
					this.processNodeDblClicked( n );
					blockDragNode = true;
				}

				// if do not capture mouse

				if ( n.onMouseDown && n.onMouseDown( e, [ e.canvasX - n.pos[ 0 ], e.canvasY - n.pos[ 1 ] ]) )
					blockDragNode = true;

				if ( !blockDragNode ) {
					if ( this.allowDragnodes )
						this.nodeDragged = n;

					if ( !this.selectedNodes[ n.id ] )
						this.processNodeSelected( n, e );
				}

				this.dirtyCanvas = true;
			}
		} else
			clickingCanvasBg = true;

		if ( clickingCanvasBg && this.allowDragcanvas ) {
			this.draggingCanvas = true;
		}
	} else if ( e.which == 2 ) // middle button
	{

	} else if ( e.which == 3 ) // right button
	{
		if ( !e.shiftKey ) {
						// no node or another node selected
						if ( !n || !this.selectedNodes[ n.id ] )
				this.deselectAllNodes();
		}

		if ( n && !this.selectedNodes[ n.id ] )
			this.processNodeSelected( n, e );

		this.processContextualMenu( n, e );
	}

	// TODO
	// if (this.nodeSelected != prevSelected)
	//	this.onNodeSelectionChange(this.nodeSelected);

	this.lastMouse[ 0 ] = e.localX;
	this.lastMouse[ 1 ] = e.localY;
	this.lastMouseclick = LiteGraph.getTime();
	this.canvasMouse = [ e.canvasX, e.canvasY ];

	/*
	if ( (this.dirtyCanvas || this.dirtyBgcanvas) && this.renderingTimerId == null)
		this.draw();
	*/

	this.graph.change();

	// this is to ensure to defocus(blur) if a text input element is on focus
	if ( !refWindow.document.activeElement || (refWindow.document.activeElement.nodeName.toLowerCase() != "input" && refWindow.document.activeElement.nodeName.toLowerCase() != "textarea") )
		e.preventDefault();
	e.stopPropagation();

	if ( this.onMouseDown )
		this.onMouseDown( e );

	return false;
};

LGraphCanvas.prototype.processMouseMove = function( e ) {
	if ( this.autoresize )
		this.resize();

	if ( !this.graph )
		return;

	this.adjustMouseEvent( e );
	var mouse = [ e.localX, e.localY ];
	var delta = [ mouse[ 0 ] - this.lastMouse[ 0 ], mouse[ 1 ] - this.lastMouse[ 1 ] ];
	this.lastMouse = mouse;
	this.canvasMouse = [ e.canvasX, e.canvasY ];

	if ( this.draggingCanvas ) {
		this.offset[ 0 ] += delta[ 0 ] / this.scale;
		this.offset[ 1 ] += delta[ 1 ] / this.scale;
		this.dirtyCanvas = true;
		this.dirtyBgcanvas = true;
	} else
	{
		if ( this.connectingNode )
			this.dirtyCanvas = true;

		// get node over
		var n = this.graph.getNodeOnPos( e.canvasX, e.canvasY, this.visibleNodes );

		// remove mouseover flag
		for ( var i = 0, l = this.graph._nodes.length; i < l; ++i ) {
			if ( this.graph._nodes[ i ].mouseOver && n != this.graph._nodes[ i ] ) {
				// mouse leave
				this.graph._nodes[ i ].mouseOver = false;
				if ( this.nodeOver && this.nodeOver.onMouseLeave )
					this.nodeOver.onMouseLeave( e );
				this.nodeOver = null;
				this.dirtyCanvas = true;
			}
		}

		// mouse over a node
		if ( n ) {
			// this.canvas.style.cursor = "move";
			if ( !n.mouseOver ) {
				// mouse enter
				n.mouseOver = true;
				this.nodeOver = n;
				this.dirtyCanvas = true;

				if ( n.onMouseEnter ) n.onMouseEnter( e );
			}

			if ( n.onMouseMove ) n.onMouseMove( e, delta );

			// on top of input
			if ( this.connectingNode ) {
				var pos = this._highlightInput || [ 0, 0 ]; // to store the output of isOverNodeInput

				if ( this.isOverNodeBox( n, e.canvasX, e.canvasY ) ) {
					// mouse on top of the corner box, dont know what to do
				} else
				{
					var slot = this.isOverNodeInput( n, e.canvasX, e.canvasY, pos );
					if ( slot != -1 && n.inputs[ slot ] ) {
						var slotType = n.inputs[ slot ].type;
						if ( LiteGraph.isValidConnection( this.connectingOutput.type, slotType ) )
							this._highlightInput = pos;
					} else
						this._highlightInput = null;
				}
			}

			// Search for corner
			var titleHeight = LiteGraph.NODE_TITLE_HEIGHT;
			var corner = detectCorner( e.canvasX, e.canvasY, n.pos[ 0 ], n.pos[ 1 ] - titleHeight, n.size[ 0 ], n.size[ 1 ] + titleHeight, 10, 10 );
			if ( n.resizable && corner != 0 ) {
				if ( corner == 1 || corner == 3 )
					this.canvas.style.cursor = "nwse-resize";
				else if ( corner == 2 || corner == 4 )
					this.canvas.style.cursor = "nesw-resize";
			} else
				this.canvas.style.cursor = null;
		} else
		{
			this._highlightInput = null;
			this.canvas.style.cursor = null;
		}

		if ( this.nodeCapturingInput && this.nodeCapturingInput != n && this.nodeCapturingInput.onMouseMove ) {
			this.nodeCapturingInput.onMouseMove( e, delta );
		}


		if ( this.nodeDragged ) {
			/*
			this.nodeDragged.pos[0] += delta[0] / this.scale;
			this.nodeDragged.pos[1] += delta[1] / this.scale;
			this.nodeDragged.pos[0] = Math.round(this.nodeDragged.pos[0]);
			this.nodeDragged.pos[1] = Math.round(this.nodeDragged.pos[1]);
			*/

			for ( var i in this.selectedNodes ) {
				var n = this.selectedNodes[ i ];

				n.pos[ 0 ] += delta[ 0 ] / this.scale;
				n.pos[ 1 ] += delta[ 1 ] / this.scale;
				// n.pos[0] = Math.round(n.pos[0]);
				// n.pos[1] = Math.round(n.pos[1]);
			}

			this.dirtyCanvas = true;
			this.dirtyBgcanvas = true;
		}

		if ( this.resizingNode ) {
			switch ( this.resizingCorner ) {
				case 1:
					this.resizingNode.pos[ 0 ] += delta[ 0 ] / this.scale;
					this.resizingNode.pos[ 1 ] += delta[ 1 ] / this.scale;
					this.resizingNode.size[ 0 ] -= delta[ 0 ] / this.scale;
					this.resizingNode.size[ 1 ] -= delta[ 1 ] / this.scale;
					break;
				case 2:
					this.resizingNode.pos[ 1 ] += delta[ 1 ] / this.scale;
					this.resizingNode.size[ 0 ] += delta[ 0 ] / this.scale;
					this.resizingNode.size[ 1 ] -= delta[ 1 ] / this.scale;
					break;
				case 3:
					this.resizingNode.size[ 0 ] += delta[ 0 ] / this.scale;
					this.resizingNode.size[ 1 ] += delta[ 1 ] / this.scale;
					break;
				case 4:
					this.resizingNode.pos[ 0 ] += delta[ 0 ] / this.scale;
					this.resizingNode.size[ 0 ] -= delta[ 0 ] / this.scale;
					this.resizingNode.size[ 1 ] += delta[ 1 ] / this.scale;
					break;
			}

			var maxSlots = Math.max( this.resizingNode.inputs ? this.resizingNode.inputs.length : 0, this.resizingNode.outputs ? this.resizingNode.outputs.length : 0 );
			if ( this.resizingNode.size[ 1 ] < maxSlots * LiteGraph.NODE_SLOT_HEIGHT + 4 )
				this.resizingNode.size[ 1 ] = maxSlots * LiteGraph.NODE_SLOT_HEIGHT + 4;
			if ( this.resizingNode.size[ 0 ] < LiteGraph.NODE_MIN_WIDTH )
				this.resizingNode.size[ 0 ] = LiteGraph.NODE_MIN_WIDTH;

			if ( this.resizingCorner == 1 || this.resizingCorner == 3 )
				this.canvas.style.cursor = "nwse-resize";
			else if ( this.resizingCorner == 2 || this.resizingCorner == 4 )
				this.canvas.style.cursor = "nesw-resize";

			this.dirtyCanvas = true;
			this.dirtyBgcanvas = true;
		}
	}

	/*
	if ((this.dirtyCanvas || this.dirtyBgcanvas) && this.renderingTimerId == null)
		this.draw();
	*/

	e.preventDefault();
	// e.stopPropagation();
	return false;
	// this is not really optimal
	// this.graph.change();
};

LGraphCanvas.prototype.processMouseUp = function( e ) {
	if ( !this.graph )
		return;

	var window = this.getCanvasWindow();
	var document = window.document;

	// restore the mousemove event back to the canvas
	document.removeEventListener("mousemove", this._mousemoveCallback, true );
	this.canvas.addEventListener("mousemove", this._mousemoveCallback, true );
	document.removeEventListener("mouseup", this._mouseupCallback, true );

	this.adjustMouseEvent( e );

	if ( e.which == 1 ) // left button
	{
		// dragging a connection
		if ( this.connectingNode ) {
			this.dirtyCanvas = true;
			this.dirtyBgcanvas = true;

			var node = this.graph.getNodeOnPos( e.canvasX, e.canvasY, this.visibleNodes );

			// node below mouse
			if ( node ) {
				if ( this.connectingOutput.type == LiteGraph.EXECUTE && this.isOverNodeBox( node, e.canvasX, e.canvasY ) ) {
					this.connectingNode.connect( this.connectingSlot, node, LiteGraph.EXECUTE );
				} else
				{
					// slot below mouse? connect
					var slot = this.isOverNodeInput( node, e.canvasX, e.canvasY );
					if ( slot != -1 ) {
						this.connectingNode.connect( this.connectingSlot, node, slot );
					} else
					{ // not on top of an input
						var input = node.getInputInfo( 0 );
						// auto connect
						if ( this.connectingOutput.type == LiteGraph.EXECUTE )
							this.connectingNode.connect( this.connectingSlot, node, LiteGraph.EXECUTE );
						else
							// allow multiple connections for non-data inputs
							if ( input && (input.type == LiteGraph.EXECUTE || !input.links) && input.type == this.connectingOutput.type ) // toLowerCase missing
								this.connectingNode.connect( this.connectingSlot, node, 0 );
					}
				}
			}

			this.connectingOutput = null;
			this.connectingPos = null;
			this.connectingNode = null;
			this.connectingSlot = -1;

		}// not dragging connection
		else if ( this.resizingNode ) {
			this.dirtyCanvas = true;
			this.dirtyBgcanvas = true;
			this.resizingNode = null;
			this.resizingCorner = 0;
		} else if ( this.nodeDragged ) // node being dragged?
		{
			this.dirtyCanvas = true;
			this.dirtyBgcanvas = true;
			this.nodeDragged.pos[ 0 ] = Math.round( this.nodeDragged.pos[ 0 ] );
			this.nodeDragged.pos[ 1 ] = Math.round( this.nodeDragged.pos[ 1 ] );
			if ( this.graph.config.alignToGrid )
				this.nodeDragged.alignToGrid();
			if ( this.nodeDragged.onMouseUp )
				this.nodeDragged.onMouseUp( e, [ e.canvasX - this.nodeDragged.pos[ 0 ], e.canvasY - this.nodeDragged.pos[ 1 ] ]);
			this.nodeDragged = null;
		} else // no node being dragged
		{
			this.dirtyCanvas = true;
			this.draggingCanvas = false;

			if ( this.nodeOver && this.nodeOver.onMouseUp )
				this.nodeOver.onMouseUp( e, [ e.canvasX - this.nodeOver.pos[ 0 ], e.canvasY - this.nodeOver.pos[ 1 ] ]);
			if ( this.nodeCapturingInput && this.nodeCapturingInput.onMouseUp )
				this.nodeCapturingInput.onMouseUp( e, [ e.canvasX - this.nodeCapturingInput.pos[ 0 ], e.canvasY - this.nodeCapturingInput.pos[ 1 ] ]);
		}
	} else if ( e.which == 2 ) // middle button
	{
		// trace("middle");
		this.dirtyCanvas = true;
		this.draggingCanvas = false;
	} else if ( e.which == 3 ) // right button
	{
		// trace("right");
		this.dirtyCanvas = true;
		this.draggingCanvas = false;
	}

	/*
	if ((this.dirtyCanvas || this.dirtyBgcanvas) && this.renderingTimerId == null)
		this.draw();
	*/

	this.graph.change();

	e.stopPropagation();
	e.preventDefault();
	return false;
};


LGraphCanvas.prototype.processMouseWheel = function( e ) {
	if ( !this.graph || !this.allowDragcanvas )
		return;

	var delta = (e.wheelDeltaY != null ? e.wheelDeltaY : e.detail * -60);

	this.adjustMouseEvent( e );

	var zoom = this.scale;

	if ( delta > 0 )
		zoom *= 1 + this.zoomSensitivity;
	else if ( delta < 0 )
		zoom /= 1 + this.zoomSensitivity;

	this.setZoom( zoom, [ e.localX, e.localY ]);

	/*
	if (this.renderingTimerId == null)
		this.draw();
	*/

	this.graph.change();

	e.preventDefault();
	return false; // prevent default
};

LGraphCanvas.prototype.isOverNodeBox = function( node, canvasx, canvasy ) {
	var titleHeight = LiteGraph.NODE_TITLE_HEIGHT;
	if ( isInsideRectangle( canvasx, canvasy, node.pos[ 0 ] + 2, node.pos[ 1 ] + 2 - titleHeight, titleHeight - 4, titleHeight - 4 ) )
		return true;
	return false;
};

LGraphCanvas.prototype.isOverNodeInput = function( node, canvasx, canvasy, slotPos ) {
	if ( node.inputs )
		for ( var i = 0, l = node.inputs.length; i < l; ++i ) {
			var input = node.inputs[ i ];
			var linkPos = node.getConnectionPos( true, i );
			if ( isInsideRectangle( canvasx, canvasy, linkPos[ 0 ] - 10, linkPos[ 1 ] - 5, 20, 10 ) ) {
				if ( slotPos ) {
					slotPos[ 0 ] = linkPos[ 0 ];
					slotPos[ 1 ] = linkPos[ 1 ];
				}
				return i;
			}
		}
	return -1;
};

LGraphCanvas.prototype.processKey = function( e ) {
	if ( !this.graph )
		return;

	var blockDefault = false;

	if ( e.type == "keydown") {
		// select all Control A
		if ( e.keyCode == 65 && e.ctrlKey ) {
			this.selectAllNodes();
			blockDefault = true;
		}

		// delete or backspace
		if ( e.keyCode == 46 || e.keyCode == 8 ) {
			this.deleteSelectedNodes();
			blockDefault = true;
		}

		// collapse
		// ...

		// TODO
		if ( this.selectedNodes )
			for ( var i in this.selectedNodes )
				if ( this.selectedNodes[ i ].onKeyDown )
					this.selectedNodes[ i ].onKeyDown( e );
	} else if ( e.type == "keyup" ) {
		if ( this.selectedNodes )
			for ( var i in this.selectedNodes )
				if ( this.selectedNodes[ i ].onKeyUp )
					this.selectedNodes[ i ].onKeyUp( e );
	}

	this.graph.change();

	if ( blockDefault ) {
		e.preventDefault();
		return false;
	}
};

LGraphCanvas.prototype.processDrop = function( e ) {
	e.preventDefault();
	this.adjustMouseEvent( e );


	var pos = [ e.canvasX, e.canvasY ];
	var node = this.graph.getNodeOnPos( pos[ 0 ], pos[ 1 ] );

	if ( !node ) {
		if ( this.onDropItem )
			this.onDropItem( event );
		return;
	}

	if ( node.onDropFile ) {
		var files = e.dataTransfer.files;
		if ( files && files.length ) {
			for ( var i = 0; i < files.length; i++ ) {
				var file = e.dataTransfer.files[ 0 ];
				var filename = file.name;
				var ext = LGraphCanvas.getFileExtension( filename );
				// console.log(file);

				// prepare reader
				var reader = new FileReader();
				reader.onload = function( event ) {
					// console.log(event.target);
					var data = event.target.result;
					node.onDropFile( data, filename, file );
				};

				// read data
				var type = file.type.split("/")[ 0 ];
				if ( type == "text" || type == "")
					reader.readAsText( file );
				else if ( type == "image")
					reader.readAsDataURL( file );
				else
					reader.readAsArrayBuffer( file );
			}
		}
	}

	if ( node.onDropItem ) {
		if ( node.onDropItem( event ) )
			return true;
	}

	if ( this.onDropItem )
		return this.onDropItem( event );

	return false;
};

LGraphCanvas.prototype.processNodeSelected = function( n, e ) {
	n.selected = true;
	if ( n.onSelected )
		n.onSelected();

	if ( e && e.shiftKey ) // add to selection
		this.selectedNodes[ n.id ] = n;
	else
	{
		this.selectedNodes = {};
		this.selectedNodes[ n.id ] = n;
	}

	this.dirtyCanvas = true;

	if ( this.onNodeSelected )
		this.onNodeSelected( n );

	// if (this.nodeInPanel) this.showNodePanel(n);
};

LGraphCanvas.prototype.processNodeDeselected = function( n ) {
	n.selected = false;
	if ( n.onDeselected )
		n.onDeselected();

	delete this.selectedNodes[ n.id ];

	if ( this.onNodeDeselected )
		this.onNodeDeselected( n );

	this.dirtyCanvas = true;
};

LGraphCanvas.prototype.processNodeDblClicked = function( n ) {
	if ( this.onShowNodePanel )
		this.onShowNodePanel( n );

	if ( this.onNodeDblClicked )
		this.onNodeDblClicked( n );

	this.setDirty( true );
};

LGraphCanvas.prototype.selectNode = function( node ) {
	this.deselectAllNodes();

	if ( !node )
		return;

	if ( !node.selected && node.onSelected )
		node.onSelected();
	node.selected = true;
	this.selectedNodes[ node.id ] = node;
	this.setDirty( true );
};

LGraphCanvas.prototype.selectAllNodes = function() {
	for ( var i = 0; i < this.graph._nodes.length; ++i ) {
		var n = this.graph._nodes[ i ];
		if ( !n.selected && n.onSelected )
			n.onSelected();
		n.selected = true;
		this.selectedNodes[ this.graph._nodes[ i ].id ] = n;
	}

	this.setDirty( true );
};

LGraphCanvas.prototype.deselectAllNodes = function() {
	var todeselect = [];
	for ( var i in this.selectedNodes )
		// if (this.selectedNodes[i] != n)
		todeselect.push( this.selectedNodes[ i ] );
	// two passes to avoid problems modifying the container
	for ( var i in todeselect )
		this.processNodeDeselected( todeselect[ i ] );
	// this.selectedNodes = {};
	// this.setDirty(true);
};

LGraphCanvas.prototype.deleteSelectedNodes = function() {
	for ( var i in this.selectedNodes ) {
		var m = this.selectedNodes[ i ];
		// if (m == this.nodeInPanel) this.showNodePanel(null);
		this.graph.remove( m );
	}
	this.selectedNodes = {};
	this.setDirty( true );
};

LGraphCanvas.prototype.centerOnNode = function( node ) {
	this.offset[ 0 ] = -node.pos[ 0 ] - node.size[ 0 ] * 0.5 + (this.canvas.width * 0.5 / this.scale);
	this.offset[ 1 ] = -node.pos[ 1 ] - node.size[ 1 ] * 0.5 + (this.canvas.height * 0.5 / this.scale);
	this.setDirty( true, true );
};

LGraphCanvas.prototype.adjustMouseEvent = function( e ) {
	var b = this.canvas.getBoundingClientRect();
	e.localX = e.pageX - b.left;
	e.localY = e.pageY - b.top;

	e.canvasX = e.localX / this.scale - this.offset[ 0 ];
	e.canvasY = e.localY / this.scale - this.offset[ 1 ];
};

LGraphCanvas.prototype.setZoom = function( value, zoomingCenter ) {
	if ( !zoomingCenter )
		zoomingCenter = [ this.canvas.width * 0.5, this.canvas.height * 0.5 ];

	var center = this.convertOffsetToCanvas( zoomingCenter );

	this.scale = value;

	if ( this.scale > this.maxZoom )
		this.scale = this.maxZoom;
	else if ( this.scale < this.minZoom )
		this.scale = this.minZoom;

	var newCenter = this.convertOffsetToCanvas( zoomingCenter );
	var deltaOffset = [ newCenter[ 0 ] - center[ 0 ], newCenter[ 1 ] - center[ 1 ] ];

	this.offset[ 0 ] += deltaOffset[ 0 ];
	this.offset[ 1 ] += deltaOffset[ 1 ];

	this.dirtyCanvas = true;
	this.dirtyBgcanvas = true;
};

LGraphCanvas.prototype.convertOffsetToCanvas = function( pos ) {
	return [ pos[ 0 ] / this.scale - this.offset[ 0 ], pos[ 1 ] / this.scale - this.offset[ 1 ] ];
};

LGraphCanvas.prototype.convertCanvasToOffset = function( pos ) {
	return [ (pos[ 0 ] + this.offset[ 0 ]) * this.scale,
		(pos[ 1 ] + this.offset[ 1 ]) * this.scale ];
};

LGraphCanvas.prototype.convertEventToCanvas = function( e ) {
	var rect = this.canvas.getClientRects()[ 0 ];
	return this.convertOffsetToCanvas([ e.pageX - rect.left, e.pageY - rect.top ]);
};

LGraphCanvas.prototype.bringToFront = function( n ) {
	var i = this.graph._nodes.indexOf( n );
	if ( i == -1 ) return;

	this.graph._nodes.splice( i, 1 );
	this.graph._nodes.push( n );
};

LGraphCanvas.prototype.sendToBack = function( n ) {
	var i = this.graph._nodes.indexOf( n );
	if ( i == -1 ) return;

	this.graph._nodes.splice( i, 1 );
	this.graph._nodes.unshift( n );
};

/* Interaction */



/* LGraphCanvas render */

LGraphCanvas.prototype.computeVisibleNodes = function() {
	var visibleNodes = [];
	for ( var i = 0, l = this.graph._nodes.length; i < l; ++i ) {
		var n = this.graph._nodes[ i ];

		if ( !overlapBounding( this.visibleArea, n.getBounding() ) )
			continue; // out of the visible area

		visibleNodes.push( n );
	}
	return visibleNodes;
};

LGraphCanvas.prototype.draw = function( forceCanvas, forceBgcanvas ) {
	// fps counting
	var now = LiteGraph.getTime();
	this.renderTime = (now - this.lastDrawTime) * 0.001;

	if ( this.renderTime > this.targetInterval ) {
		if ( this.graph ) {
			var start = [ -this.offset[ 0 ], -this.offset[ 1 ] ];
			var end = [ start[ 0 ] + this.canvas.width / this.scale, start[ 1 ] + this.canvas.height / this.scale ];
			this.visibleArea = new Float32Array([ start[ 0 ], start[ 1 ], end[ 0 ], end[ 1 ] ]);
		}

		if ( this.dirtyBgcanvas || forceBgcanvas || this.alwaysRenderBackground || (this.graph && this.graph._lastTriggerTime && (now - this.graph._lastTriggerTime) < 1000) )
			this.drawBackCanvas();

		if ( this.dirtyCanvas || forceCanvas )
			this.drawFrontCanvas();

		this.fps = this.renderTime ? (1.0 / this.renderTime) : 0;
		this.frame += 1;

		this.lastDrawTime = now - 1000 * (this.renderTime % this.targetInterval);
	}
};

LGraphCanvas.prototype.drawFrontCanvas = function() {
	if ( !this.ctx )
		this.ctx = this.bgcanvas.getContext("2d");
	var ctx = this.ctx;
	if ( !ctx ) // maybe is using webgl...
		return;

	if ( ctx.start2D )
		ctx.start2D();

	var canvas = this.canvas;

	// reset in case of error
	ctx.restore();
	ctx.setTransform( 1, 0, 0, 1, 0, 0 );

	// clip dirty area if there is one, otherwise work in full canvas
	if ( this.dirtyArea ) {
		ctx.save();
		ctx.beginPath();
		ctx.rect( this.dirtyArea[ 0 ], this.dirtyArea[ 1 ], this.dirtyArea[ 2 ], this.dirtyArea[ 3 ] );
		ctx.clip();
	}

	// clear
	// canvas.width = canvas.width;
	if ( this.clearBackground )
		ctx.clearRect( 0, 0, canvas.width, canvas.height );

	// draw bg canvas
	if ( this.bgcanvas == this.canvas )
		this.drawBackCanvas();
	else
		ctx.drawImage( this.bgcanvas, 0, 0 );

	// rendering
	if ( this.onRender )
		this.onRender( canvas, ctx );

	// info widget
	if ( this.showInfo )
		this.renderInfo( ctx );

	if ( this.graph ) {
		// apply transformations
		ctx.save();
		ctx.scale( this.scale, this.scale );
		ctx.translate( this.offset[ 0 ], this.offset[ 1 ] );

		// draw nodes
		var drawnNodes = 0;
		var visibleNodes = this.computeVisibleNodes();
		this.visibleNodes = visibleNodes;

		for ( var i = 0; i < visibleNodes.length; ++i ) {
			var node = visibleNodes[ i ];

			if ( node.flags.background )
				continue;

			// transform coords system
			ctx.save();
			ctx.translate( node.pos[ 0 ], node.pos[ 1 ] );

			// Draw
			this.drawNode( node, ctx );
			drawnNodes += 1;

			// Restore
			ctx.restore();
		}

		// connections ontop?
		// if (this.graph.config.linksOntop)
		//    this.drawConnections(ctx);

		// current connection
		if ( this.connectingPos != null ) {
			ctx.lineWidth = this.connectionsWidth;
			var linkColor = null;
			switch ( this.connectingOutput.type ) {
				case LiteGraph.EXECUTE: linkColor = "#F85"; break;
				default:
					linkColor = "#AFA";
			}
			this.renderLink( ctx, this.connectingPos, [ this.canvasMouse[ 0 ], this.canvasMouse[ 1 ] ], linkColor );

			ctx.beginPath();

			if ( this.connectingOutput.type === LiteGraph.EXECUTE )
				ctx.executablePort( this.connectingPos[ 0 ], this.connectingPos[ 1 ] );
			else
				ctx.dataPort( this.connectingPos[ 0 ], this.connectingPos[ 1 ] );

			/*
			if ( this.connectingOutput.round)
				ctx.arc( this.connectingPos[0], this.connectingPos[1],4,0,Math.PI*2);
			else
				ctx.rect( this.connectingPos[0], this.connectingPos[1],12,6);
			*/
			ctx.fill();

			ctx.fillStyle = "#ffcc00";
			if ( this._highlightInput ) {
				ctx.beginPath();
				// ctx.arc( this._highlightInput[0], this._highlightInput[1],6,0,Math.PI*2);
				if ( this.connectingOutput.type === LiteGraph.EXECUTE )
					ctx.executablePort( this._highlightInput[ 0 ], this._highlightInput[ 1 ] );
				else
					ctx.dataPort( this._highlightInput[ 0 ], this._highlightInput[ 1 ] );
				ctx.fill();
			}
		}

		// draw the comments
		for ( var i = 0; i < visibleNodes.length; ++i ) {
			var node = visibleNodes[ i ];

			if ( !node.properties.comment )
				continue;

			// transform coords system
			ctx.save();
			ctx.translate( node.pos[ 0 ], node.pos[ 1 ] );

			// Draw
			this.drawNodeComment( node, ctx );

			// Restore
			ctx.restore();
		}

		ctx.restore();
	}

	if ( this.dirtyArea ) {
		ctx.restore();
		// this.dirtyArea = null;
	}

	if ( ctx.finish2D ) // this is a function I use in webgl renderer
		ctx.finish2D();

	this.dirtyCanvas = false;
};

LGraphCanvas.prototype.renderInfo = function( ctx, x, y ) {
	x = x || 0;
	y = y || 0;

	ctx.save();
	ctx.translate( x, y );

	ctx.font = "10px Arial";
	ctx.fillStyle = "#888";
	if ( this.graph ) {
		ctx.fillText( "T: " + this.graph.globaltime.toFixed( 2 ) + "s", 5, 13 * 1 );
		ctx.fillText( "I: " + this.graph.iteration, 5, 13 * 2 );
		ctx.fillText( "F: " + this.frame, 5, 13 * 3 );
		ctx.fillText( "FPS:" + this.fps.toFixed( 2 ), 5, 13 * 4 );
	} else
		ctx.fillText( "No graph selected", 5, 13 * 1 );
	ctx.restore();
};

LGraphCanvas.prototype.drawBackCanvas = function() {
	var canvas = this.bgcanvas;
	if ( canvas.width != this.canvas.width ||
		canvas.height != this.canvas.height ) {
		canvas.width = this.canvas.width;
		canvas.height = this.canvas.height;
	}

	if ( !this.bgctx )
		this.bgctx = this.bgcanvas.getContext("2d");
	var ctx = this.bgctx;
	if ( ctx.start )
		ctx.start();

	// clear
	if ( this.clearBackground )
		ctx.clearRect( 0, 0, canvas.width, canvas.height );

	// reset in case of error
	ctx.restore();
	ctx.setTransform( 1, 0, 0, 1, 0, 0 );

	if ( this.graph ) {
		// apply transformations
		ctx.save();
		ctx.scale( this.scale, this.scale );
		ctx.translate( this.offset[ 0 ], this.offset[ 1 ] );

		// render BG
		if ( this.backgroundImage && this.scale > 0.5 ) {
			ctx.globalAlpha = (1.0 - 0.5 / this.scale) * this.editorAlpha;
			ctx.webkitImageSmoothingEnabled = ctx.mozImageSmoothingEnabled = ctx.imageSmoothingEnabled = false;
			if ( !this._bgImg || this._bgImg.name != this.backgroundImage ) {
				this._bgImg = new Image();
				this._bgImg.name = this.backgroundImage;
				this._bgImg.src = this.backgroundImage;
				var that = this;
				this._bgImg.onload = function() {
					// that.draw(true,true);
					that.graph.setDirtyCanvas( false, true );
				};
			}

			var pattern = null;
			if ( this._pattern == null && this._bgImg.width > 0 ) {
				pattern = ctx.createPattern( this._bgImg, "repeat" );
				this._patternImg = this._bgImg;
				this._pattern = pattern;
			} else
				pattern = this._pattern;
			if ( pattern ) {
				ctx.fillStyle = pattern;
				ctx.fillRect( this.visibleArea[ 0 ], this.visibleArea[ 1 ], this.visibleArea[ 2 ] - this.visibleArea[ 0 ], this.visibleArea[ 3 ] - this.visibleArea[ 1 ] );
				ctx.fillStyle = "transparent";
			}

			ctx.globalAlpha = 1.0;
			ctx.webkitImageSmoothingEnabled = ctx.mozImageSmoothingEnabled = ctx.imageSmoothingEnabled = true;
		}

		if ( this.onBackgroundRender )
			this.onBackgroundRender( canvas, ctx );

		// DEBUG: show clipping area
		// ctx.fillStyle = "red";
		// ctx.fillRect( this.visibleArea[0] + 10, this.visibleArea[1] + 10, this.visibleArea[2] - this.visibleArea[0] - 20, this.visibleArea[3] - this.visibleArea[1] - 20);

		// bg
		ctx.strokeStyle = "#235";
		ctx.strokeRect( 0, 0, canvas.width, canvas.height );

		// draw nodes
		var drawnNodes = 0;
		var visibleNodes = this.computeVisibleNodes();
		this.visibleNodes = visibleNodes;

		for ( var i = 0; i < visibleNodes.length; ++i ) {
			var node = visibleNodes[ i ];

			if ( !node.flags.background )
				continue;

			// transform coords system
			ctx.save();
			ctx.translate( node.pos[ 0 ], node.pos[ 1 ] );

			// Draw
			this.drawNode( node, ctx );
			drawnNodes += 1;

			// Restore
			ctx.restore();
		}

		if ( this.renderConnectionsShadows ) {
			ctx.shadowColor = "#000";
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = 6;
		} else
			ctx.shadowColor = "rgba(0,0,0,0)";

		// draw connections
		this.drawConnections( ctx );

		ctx.shadowColor = "rgba(0,0,0,0)";

		// restore state
		ctx.restore();
	}

	if ( ctx.finish )
		ctx.finish();

	this.dirtyBgcanvas = false;
	this.dirtyCanvas = true; // to force to repaint the front canvas with the bgcanvas
};

/* Renders the LGraphNode on the canvas */
LGraphCanvas.prototype.drawNode = function( node, ctx ) {
	var glow = false;

	var color = node.color || LiteGraph.NODE_DEFAULT_COLOR;
	// if (this.selected) color = "#88F";

	var renderTitle = true;
	if ( node.flags.skipTitleRender )
		renderTitle = false;
	if ( node.mouseOver )
		renderTitle = true;

	// shadow and glow
	if ( node.mouseOver ) glow = true;

	if ( node.selected ) {
		/*
		ctx.shadowColor = "#EEEEFF";// glow ? "#AAF" : "#000";
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;
		ctx.shadowBlur = 1;
		*/
	} else if ( this.renderShadows ) {
		ctx.shadowColor = "rgba(0,0,0,0.5)";
		ctx.shadowOffsetX = 2;
		ctx.shadowOffsetY = 2;
		ctx.shadowBlur = 3;
	} else
		ctx.shadowColor = "transparent";

	// draw in collapsed form
	/*
	if (node.flags.collapsed) {
		if (!node.onDrawCollapsed || node.onDrawCollapsed(ctx) == false)
			this.drawNodeCollapsed(node, ctx, color, node.bgcolor);
		return;
	}
	*/

	var editorAlpha = this.editorAlpha;
	ctx.globalAlpha = editorAlpha;

	// clip if required (mask)
	var shape = node.shape || "box";
	var size = new Float32Array( node.size );
	if ( node.flags.collapsed ) {
		size[ 0 ] = node.size[ 0 ];
		size[ 1 ] = 0;
	}

	// Start clipping
	if ( node.flags.clipArea ) {
		ctx.save();
		if ( shape == "box") {
			ctx.beginPath();
			ctx.rect( 0, 0, size[ 0 ], size[ 1 ] );
		} else if ( shape == "round") {
			ctx.beginPath();
			ctx.roundRect( 0, 0, size[ 0 ], size[ 1 ], 10 );
		} else if ( shape == "circle") {
			ctx.beginPath();
			ctx.arc( size[ 0 ] * 0.5, size[ 1 ] * 0.5, size[ 0 ] * 0.5, 0, Math.PI * 2 );
		}
		ctx.clip();
	}

	// draw shape
	this.drawNodeShape( node, ctx, size, color, node.bgcolor, !renderTitle, node.selected );
	ctx.shadowColor = "transparent";

	// connection slots
	ctx.textAlign = "left";
	ctx.font = LGraphCanvas.innerTextFont;

	var renderText = this.scale > 0.6;

	var outSlot = this.connectingOutput;

	// render inputs and outputs
	if ( !node.flags.collapsed ) {
		// input connection slots
		if ( node.inputs )
			for ( var i = 0; i < node.inputs.length; i++ ) {
				var slot = node.inputs[ i ];

				ctx.globalAlpha = editorAlpha;
				// change opacity of incompatible slots
				if ( this.connectingNode && LiteGraph.isValidConnection( slot.type && outSlot.type ) )
					ctx.globalAlpha = 0.4 * editorAlpha;

				ctx.fillStyle = slot.links ? "#7F7" : "#AAA";

				var pos = node.getConnectionPos( true, i );
				pos[ 0 ] -= node.pos[ 0 ];
				pos[ 1 ] -= node.pos[ 1 ];

				ctx.beginPath();

				if ( slot.type === LiteGraph.EXECUTE )
					ctx.executablePort( pos[ 0 ], pos[ 1 ] );
				else
					ctx.dataPort( pos[ 0 ], pos[ 1 ] );

				ctx.fill();

				// render name
				if ( renderText ) {
					var text = slot.label != null ? slot.label : slot.name;
					if ( text ) {
						ctx.fillStyle = color;
						ctx.fillText( text, pos[ 0 ] + 10, pos[ 1 ] + 5 );
					}
				}
			}

		// output connection slots
		if ( this.connectingNode )
			ctx.globalAlpha = 0.4 * editorAlpha;

		ctx.lineWidth = 1;

		ctx.textAlign = "right";
		ctx.strokeStyle = "black";
		if ( node.outputs )
			for ( var i = 0; i < node.outputs.length; i++ ) {
				var slot = node.outputs[ i ];

				var pos = node.getConnectionPos( false, i );
				pos[ 0 ] -= node.pos[ 0 ];
				pos[ 1 ] -= node.pos[ 1 ];

				ctx.fillStyle = slot.links ? "#7F7" : "#AAA";
				ctx.beginPath();
				// ctx.rect( node.size[0] - 14,i*14,10,10);

				if ( slot.type === LiteGraph.EXECUTE )
					ctx.executablePort( pos[ 0 ], pos[ 1 ] );
				else
					ctx.dataPort( pos[ 0 ], pos[ 1 ] );

				// trigger
				// if (slot.nodeId != null && slot.slot == -1)
				//	ctx.fillStyle = "#F85";

				// if (slot.links != null && slot.links.length)
				ctx.fill();
				// ctx.stroke();

				// render output name
				if ( renderText ) {
					var text = slot.label != null ? slot.label : slot.name;
					if ( text ) {
						ctx.fillStyle = color;
						ctx.fillText( text, pos[ 0 ] - 10, pos[ 1 ] + 5 );
					}
				}
			}

		ctx.textAlign = "left";
		ctx.globalAlpha = 1;

		if ( node.onDrawForeground )
			node.onDrawForeground( ctx );
	}// !collapsed

	if ( node.flags.clipArea )
		ctx.restore();

	ctx.globalAlpha = 1.0;
};

/* Renders the node shape */
LGraphCanvas.prototype.drawNodeShape = function( node, ctx, size, fgcolor, bgcolor, noTitle, selected ) {
	// bg rect
	ctx.strokeStyle = fgcolor || LiteGraph.NODE_DEFAULT_COLOR;
	ctx.fillStyle = bgcolor || LiteGraph.NODE_DEFAULT_BGCOLOR;

	/* gradient test
	var grad = ctx.createLinearGradient(0,0,0,node.size[1]);
	grad.addColorStop(0, "#AAA");
	grad.addColorStop(0.5, fgcolor || LiteGraph.NODE_DEFAULT_COLOR);
	grad.addColorStop(1, bgcolor || LiteGraph.NODE_DEFAULT_BGCOLOR);
	ctx.fillStyle = grad;
	// */

	var titleHeight = LiteGraph.NODE_TITLE_HEIGHT;
	ctx.lineWidth = this.selectionOutlineWidth;

	// render depending on shape
	var shape = node.shape || "box";
	if ( shape == "box") {
		if ( selected ) {
			ctx.strokeStyle = "#CCC";
			ctx.strokeRect( 0, noTitle ? 0 : -titleHeight, size[ 0 ], noTitle ? size[ 1 ] : size[ 1 ] + titleHeight );
			ctx.strokeStyle = fgcolor;
		}

		ctx.beginPath();
		ctx.rect( 0, noTitle ? 0 : -titleHeight, size[ 0 ], noTitle ? size[ 1 ] : size[ 1 ] + titleHeight );
		ctx.fill();
	} else if ( node.shape == "round") {
		if ( selected ) {
			ctx.strokeStyle = "#CCC";
			ctx.beginPath();
			ctx.roundRect( 0, noTitle ? 0 : -titleHeight, size[ 0 ], noTitle ? size[ 1 ] : size[ 1 ] + titleHeight, 10 );
			ctx.stroke();
			ctx.strokeStyle = fgcolor;
		}

		ctx.beginPath();
		ctx.roundRect( 0, noTitle ? 0 : -titleHeight, size[ 0 ], noTitle ? size[ 1 ] : size[ 1 ] + titleHeight, 10 );
		ctx.fill();
	} else if ( node.shape == "circle") {
		ctx.beginPath();
		ctx.arc( size[ 0 ] * 0.5, size[ 1 ] * 0.5, size[ 0 ] * 0.5, 0, Math.PI * 2 );
		ctx.fill();
	}

	ctx.shadowColor = "transparent";

	// ctx.stroke();

	// image
	if ( node.bgImage && node.bgImage.width )
		ctx.drawImage( node.bgImage, (size[ 0 ] - node.bgImage.width) * 0.5, (size[ 1 ] - node.bgImage.height) * 0.5 );

	if ( node.bgImageUrl && !node.bgImage )
		node.bgImage = node.loadImage( node.bgImageUrl );

	if ( node.onDrawBackground )
		node.onDrawBackground( ctx );

	// title bg (remember, it is rendered ABOVE the node
	if ( !noTitle ) {
		ctx.fillStyle = fgcolor || LiteGraph.NODE_DEFAULT_COLOR;
		var oldAlpha = ctx.globalAlpha;
		ctx.globalAlpha = 0.5 * oldAlpha;
		if ( shape == "box") {
			ctx.beginPath();
			ctx.rect( 0, -titleHeight, size[ 0 ], titleHeight );
			ctx.fill();
			// ctx.stroke();
		} else if ( shape == "round") {
			var bottomRadius = node.flags.collapsed ? 10 : 0;
			ctx.beginPath();
			ctx.roundRect( 0, -titleHeight, size[ 0 ], titleHeight, 10, bottomRadius );
			// ctx.fillRect(0,8,size[0],NODE_TITLE_HEIGHT - 12);
			ctx.fill();
			// ctx.stroke();
		}

		// title box
		if ( node.collapsible !== false ) {
			ctx.fillStyle = node.boxcolor || LiteGraph.NODE_DEFAULT_BOXCOLOR;
			ctx.beginPath();
			if ( node.flags.collapsed ) {
				ctx.moveTo( size[ 0 ] - 11, 8 - titleHeight );
				ctx.lineTo( size[ 0 ] - 5, 13 - titleHeight );
				ctx.lineTo( size[ 0 ] - 5, 3 - titleHeight );
			} else
			{
				ctx.moveTo( size[ 0 ] - 8, 12 - titleHeight );
				ctx.lineTo( size[ 0 ] - 13, 6 - titleHeight );
				ctx.lineTo( size[ 0 ] - 3, 6 - titleHeight );
			}
			ctx.fill();
		}

		ctx.globalAlpha = oldAlpha;

		// title text
		ctx.font = LGraphCanvas.titleTextFont;
		var title = node.getTitle();
		if ( title && this.scale > 0.5 ) {
			ctx.fillStyle = LiteGraph.NODE_TITLE_COLOR;
			ctx.fillText( title, 4, 13 - titleHeight );
		}
	}
};

/* Renders the node comment */
LGraphCanvas.prototype.drawNodeComment = function( node, ctx ) {
	var comment = node.properties.comment;
	var title = node.getTitle();

	if ( comment == title && this.scale == 1 )
		return;

	var titleHeight = LiteGraph.NODE_TITLE_HEIGHT;
	var commentHeight = parseInt( ctx.font );
	var padding = 3;
	var separation = 8;
	var nodeBorderRadius = 10;

	var scale = 1 / this.scale;

	ctx.save();
	ctx.translate( 0, -titleHeight );
	ctx.scale( scale, scale );

	var oldAlpha = ctx.globalAlpha;
	ctx.globalAlpha = 0.5 * oldAlpha;

	ctx.font = LGraphCanvas.titleTextFont;

	// comment box
	ctx.fillStyle = "#fff";
	ctx.beginPath();
	ctx.roundRect( 0, -separation - commentHeight - 2 * padding, ctx.measureText( comment ).width + 2 * padding, commentHeight + 2 * padding, 3 );
	ctx.moveTo( nodeBorderRadius, -separation );
	ctx.lineTo( nodeBorderRadius + separation, -separation );
	ctx.lineTo( nodeBorderRadius + separation / 2, separation - separation );
	ctx.fill();
	ctx.globalAlpha = oldAlpha;

	// comment text
	ctx.fillStyle = "#000";
	ctx.fillText( comment, padding, -separation - padding );

	ctx.restore();
};

/* Renders the node when collapsed */
LGraphCanvas.prototype.drawNodeCollapsed = function( node, ctx, fgcolor, bgcolor ) {
	// draw default collapsed shape
	ctx.strokeStyle = fgcolor || LiteGraph.NODE_DEFAULT_COLOR;
	ctx.fillStyle = bgcolor || LiteGraph.NODE_DEFAULT_BGCOLOR;

	var collapsedRadius = LiteGraph.NODE_COLLAPSED_RADIUS;

	// circle shape
	var shape = node.shape || "box";
	if ( shape == "circle") {
		ctx.beginPath();
		ctx.arc( node.size[ 0 ] * 0.5, node.size[ 1 ] * 0.5, collapsedRadius, 0, Math.PI * 2 );
		ctx.fill();
		ctx.shadowColor = "rgba(0,0,0,0)";
		ctx.stroke();

		ctx.fillStyle = node.boxcolor || LiteGraph.NODE_DEFAULT_BOXCOLOR;
		ctx.beginPath();
		ctx.arc( node.size[ 0 ] * 0.5, node.size[ 1 ] * 0.5, collapsedRadius * 0.5, 0, Math.PI * 2 );
		ctx.fill();
	} else if ( shape == "round") // rounded box
	{
		ctx.beginPath();
		ctx.roundRect( node.size[ 0 ] * 0.5 - collapsedRadius, node.size[ 1 ] * 0.5 - collapsedRadius, 2 * collapsedRadius, 2 * collapsedRadius, 5 );
		ctx.fill();
		ctx.shadowColor = "rgba(0,0,0,0)";
		ctx.stroke();

		ctx.fillStyle = node.boxcolor || LiteGraph.NODE_DEFAULT_BOXCOLOR;
		ctx.beginPath();
		ctx.roundRect( node.size[ 0 ] * 0.5 - collapsedRadius * 0.5, node.size[ 1 ] * 0.5 - collapsedRadius * 0.5, collapsedRadius, collapsedRadius, 2 );
		ctx.fill();
	} else // flat box
	{
		ctx.beginPath();
		// ctx.rect(node.size[0] * 0.5 - collapsedRadius, node.size[1] * 0.5 - collapsedRadius, 2*collapsedRadius, 2*collapsedRadius);
		ctx.rect( 0, 0, node.size[ 0 ], collapsedRadius * 2 );
		ctx.fill();
		ctx.shadowColor = "rgba(0,0,0,0)";
		ctx.stroke();

		ctx.fillStyle = node.boxcolor || LiteGraph.NODE_DEFAULT_BOXCOLOR;
		ctx.beginPath();
		// ctx.rect(node.size[0] * 0.5 - collapsedRadius*0.5, node.size[1] * 0.5 - collapsedRadius*0.5, collapsedRadius,collapsedRadius);
		ctx.rect( collapsedRadius * 0.5, collapsedRadius * 0.5, collapsedRadius, collapsedRadius );
		ctx.fill();
	}
};

// OPTIMIZE THIS: precatch connections position instead of recomputing them every time
LGraphCanvas.prototype.drawConnections = function( ctx ) {
	var now = LiteGraph.getTime();

	// draw connections
	ctx.lineWidth = this.connectionsWidth;

	ctx.fillStyle = "#AAA";
	ctx.strokeStyle = "#AAA";
	ctx.globalAlpha = this.editorAlpha;
	// for every node
	for ( var n = 0, l = this.graph._nodes.length; n < l; ++n ) {
		var node = this.graph._nodes[ n ];
		// for every input (we render just inputs because it is easier as every slot can only have one input)
		if ( node.inputs && node.inputs.length )
			for ( var i = 0; i < node.inputs.length; ++i ) {
				var input = node.inputs[ i ];
				if ( !input || !input.links )
					continue;

				for ( var j = 0; j < input.links.length; ++j ) {
					var linkId = input.links[ j ];

					var link = this.graph.links[ linkId ];
					if ( !link )
						continue;

					var startNode = this.graph.getNodeById( link.originId );
					if ( startNode == null ) continue;
					var startNodeSlot = link.originSlot;
					var startNodeSlotpos = null;

					if ( startNodeSlot == -1 )
						startNodeSlotpos = [ startNode.pos[ 0 ] + 10, startNode.pos[ 1 ] + 10 ];
					else
						startNodeSlotpos = startNode.getConnectionPos( false, startNodeSlot );

					var color = LGraphCanvas.linkTypeColors[ node.inputs[ i ].type ] || this.defaultLinkColor;

					this.renderLink( ctx, startNodeSlotpos, node.getConnectionPos( true, i ), color );

					if ( link && link._lastTime && now - link._lastTime < 1000 ) {
						var f = 2.0 - (now - link._lastTime) * 0.002;
						var color = "rgba(255,255,255, " + f.toFixed( 2 ) + ")";
						this.renderLink( ctx, startNodeSlotpos, node.getConnectionPos( true, i ), color, true, f );
					}

					if ( LiteGraph.debug && link.data ) {
						var a = startNodeSlotpos;
						var b = node.getConnectionPos( true, i );
						var x = (a[ 0 ] + b[ 0 ]) / 2;
						var y = (a[ 1 ] + b[ 1 ]) / 2;
						var w = ctx.measureText( link.data ).width;
						var h = parseInt( ctx.font );
						var m = 2;
						ctx.fillStyle = "#000";
						ctx.beginPath();
						ctx.roundRect( x - m - w / 2, y - h - m + h / 2, w + 2 * m, h + 2 * m, m );
						ctx.fill();
						ctx.fillStyle = this.defaultLinkColor;
						ctx.fillText( link.data, x - w / 2, y + h / 2 );
					}
				}
			}
	}
	ctx.globalAlpha = 1;
};

LGraphCanvas.prototype.renderLink = function( ctx, a, b, color, skipBorder, flow ) {
	if ( !this.highqualityRender ) {
		ctx.beginPath();
		ctx.moveTo( a[ 0 ], a[ 1 ] );
		ctx.lineTo( b[ 0 ], b[ 1 ] );
		ctx.stroke();
		return;
	}

	// control points
	const control = 0.25;// 0.5;

	var cdist = computeConnectionDistance( a, b );
	// var cdist = b[0] - a[0];

	if ( this.renderConnectionsBorder && this.scale > 0.6 )
		ctx.lineWidth = this.connectionsWidth + 4;

	ctx.beginPath();

	if ( this.renderCurvedConnections ) // splines
	{
		ctx.moveTo( a[ 0 ], a[ 1 ] );
		ctx.bezierCurveTo( a[ 0 ] + cdist * control, a[ 1 ],
							b[ 0 ] - cdist * control, b[ 1 ],
							b[ 0 ], b[ 1 ] );
	} else // lines
	{
		ctx.moveTo( a[ 0 ] + 10, a[ 1 ] );
		ctx.lineTo( ((a[ 0 ] + 10) + (b[ 0 ] - 10)) * 0.5, a[ 1 ] );
		ctx.lineTo( ((a[ 0 ] + 10) + (b[ 0 ] - 10)) * 0.5, b[ 1 ] );
		ctx.lineTo( b[ 0 ] - 10, b[ 1 ] );
	}

	if ( this.renderConnectionsBorder && this.scale > 0.6 && !skipBorder ) {
		ctx.strokeStyle = "rgba(0,0,0,0.5)";
		ctx.stroke();
	}

	ctx.lineWidth = this.connectionsWidth;
	ctx.fillStyle = ctx.strokeStyle = color;
	ctx.stroke();

	// render arrow
	if ( this.renderConnectionArrows && this.scale > 0.6 ) {
		var pos = computeConnectionPoint( a, b, 0.5, cdist );
		var pos2 = computeConnectionPoint( a, b, 0.51, cdist );

		// get two points in the bezier curve
		var angle = 0;
		if ( this.renderCurvedConnections )
			angle = -Math.atan2( pos2[ 0 ] - pos[ 0 ], pos2[ 1 ] - pos[ 1 ] );
		else
			angle = b[ 1 ] > a[ 1 ] ? 0 : Math.PI;

		ctx.save();
		ctx.translate( pos[ 0 ], pos[ 1 ] );
		ctx.rotate( angle );
		ctx.beginPath();
		ctx.moveTo( -5, -5 );
		ctx.lineTo( 0, +5 );
		ctx.lineTo( +5, -5 );
		ctx.fill();
		ctx.restore();
	}

	// render flow
	if ( flow && this.renderConnectionFlow && this.scale > 0.6 ) {
		var dist = distance( a, b );
		var dotsCount = Math.round( dist / 47 );
		var dotsSpeed = 0.235 / dist;

		for ( var i = 0; i < dotsCount; ++i ) {
			var f = (LiteGraph.getTime() * dotsSpeed + (i * 1 / dotsCount)) % 1;
			var pos = computeConnectionPoint( a, b, f, cdist );
			ctx.beginPath();
			ctx.arc( pos[ 0 ], pos[ 1 ], 2 * this.connectionsWidth, 0, 2 * Math.PI );
			ctx.fill();
		}
	}

	function computeConnectionDistance( a, b ) {
		// connection going forward
		var df = 100;
		const sf = 2;
		// connection going backwards
		var db = 600;
		const sb = 4;
		// transition threshold
		const th = 300;

		var d = distance( a, b );
		// var d = b[0] - a[0];

		// fix distance
		df = df + (d - df) / sf;
		db = db + (d - db) / sb;

		if ( a[ 0 ] < b[ 0 ] ) // forward
			d = df;
		else if ( a[ 0 ] > b[ 0 ] + th ) // backwards
			d = db;
		else // transition
		{
			var t = (a[ 0 ] - b[ 0 ]) / th;
			d = (1 - t) * df + t * db;
		}

		return d;
	}

	function computeConnectionPoint( a, b, t, d ) {
		var p0 = a;
		var p1 = [ a[ 0 ] + d * control, a[ 1 ] ];
		var p2 = [ b[ 0 ] - d * control, b[ 1 ] ];
		var p3 = b;

		var c1 = (1 - t) * (1 - t) * (1 - t);
		var c2 = 3 * ((1 - t) * (1 - t)) * t;
		var c3 = 3 * (1 - t) * (t * t);
		var c4 = t * t * t;

		var x = c1 * p0[ 0 ] + c2 * p1[ 0 ] + c3 * p2[ 0 ] + c4 * p3[ 0 ];
		var y = c1 * p0[ 1 ] + c2 * p1[ 1 ] + c3 * p2[ 1 ] + c4 * p3[ 1 ];
		return [ x, y ];
	}
};

/*
LGraphCanvas.prototype.resizeCanvas = function(width,height) {
	this.canvas.width = width;
	if (height)
		this.canvas.height = height;

	this.bgcanvas.width = this.canvas.width;
	this.bgcanvas.height = this.canvas.height;
	this.draw(true,true);
}
*/

LGraphCanvas.prototype.resize = function( width, height ) {
	if ( !width && !height ) {
		var parent = this.canvas.parentNode;
		width = parent.offsetWidth;
		height = parent.offsetHeight;
	}

	if ( this.canvas.width == width && this.canvas.height == height )
		return;

	this.canvas.width = width;
	this.canvas.height = height;
	this.bgcanvas.width = this.canvas.width;
	this.bgcanvas.height = this.canvas.height;
	this.setDirty( true, true );
};

LGraphCanvas.prototype.onNodeDblClicked = function( node ) {
	var subgraph = node.subgraph;
	if ( subgraph )
		this.openSubgraph( subgraph );
};

LGraphCanvas.prototype.onNodeSelectionChange = function( node ) {
	return; // disabled
	// if (this.nodeInPanel) this.showNodePanel(node);
};

LGraphCanvas.prototype.touchHandler = function( event ) {
	// alert("foo");
		var touches = event.changedTouches,
				first = touches[ 0 ],
				type = "";

				 switch ( event.type ) {
				case "touchstart": type = "mousedown"; break;
				case "touchmove":  type = "mousemove"; break;
				case "touchend":   type = "mouseup"; break;
				default: return;
		}

						 // initMouseEvent(type, canBubble, cancelable, view, clickCount,
		//           screenX, screenY, clientX, clientY, ctrlKey,
		//           altKey, shiftKey, metaKey, button, relatedTarget);

	var window = this.getCanvasWindow();
	var document = window.document;

		var simulatedEvent = document.createEvent("MouseEvent");
		simulatedEvent.initMouseEvent( type, true, true, window, 1,
															first.screenX, first.screenY,
															first.clientX, first.clientY, false,
															false, false, false, 0/*left*/, null );
	first.target.dispatchEvent( simulatedEvent );
		event.preventDefault();
};

/* CONTEXT MENU ********************/

LGraphCanvas.onMenuAdd = function( node, e, prevMenu, canvas, firstEvent ) {
	var refWindow = canvas.getCanvasWindow();

	var values = LiteGraph.getNodeTypesCategories();
	var entries = {};
	for ( var i in values )
		if ( values[ i ] )
			entries[ i ] = { value: values[ i ], content: values[ i ], isMenu: true };

	var menu = LiteGraph.createContextualMenu( entries, { event: e, callback: innerClicked, from: prevMenu }, refWindow );

	function innerClicked( v, e ) {
		var category = v.value;
		var nodeTypes = LiteGraph.getNodeTypesInCategory( category );
		var values = [];
		for ( var i in nodeTypes )
			values.push({ content: nodeTypes[ i ].title, value: nodeTypes[ i ].type });

		LiteGraph.createContextualMenu( values, { event: e, callback: innerCreate, from: menu }, refWindow );
		return false;
	}

	function innerCreate( v, e ) {
		var node = LiteGraph.createNode( v.value );
		if ( node ) {
			node.pos = canvas.convertEventToCanvas( firstEvent );
			canvas.graph.add( node );
		}
	}

	return false;
};

LGraphCanvas.onMenuCollapseAll = function() {

};


LGraphCanvas.onMenuNodeEdit = function() {

};

LGraphCanvas.showMenuNodeInputs = function( node, e, prevMenu ) {
	if ( !node )
		return;

	var that = this;
	var refWindow = this.getCanvasWindow();

	var options = node.optionalInputs;
	if ( node.onGetInputs )
		options = node.onGetInputs();

	var entries = [];
	if ( options )
		for ( var i in options ) {
			var entry = options[ i ];
			var label = entry[ 0 ];
			if ( entry[ 2 ] && entry[ 2 ].label )
				label = entry[ 2 ].label;
			entries.push({ content: label, value: entry });
		}

	if ( this.onMenuNodeInputs )
		entries = this.onMenuNodeInputs( entries );

	if ( !entries.length )
		return;

	var menu = LiteGraph.createContextualMenu( entries, { event: e, callback: innerClicked, from: prevMenu }, refWindow );

	function innerClicked( v, e, prev ) {
		if ( !node )
			return;

		if ( v.callback )
			v.callback.call( that, node, v, e, prev );

		if ( v.value )
			node.addInput( v.value[ 0 ], v.value[ 1 ], v.value[ 2 ] );
	}

	return false;
};

LGraphCanvas.showMenuNodeOutputs = function( node, e, prevMenu ) {
	if ( !node )
		return;

	var that = this;
	var refWindow = this.getCanvasWindow();

	var options = node.optionalOutputs;
	if ( node.onGetOutputs )
		options = node.onGetOutputs();

	var entries = [];
	if ( options )
		for ( var i in options ) {
			var entry = options[ i ];
			if ( !entry ) // separator?
			{
				entries.push( null );
				continue;
			}

			if ( node.findOutputSlot( entry[ 0 ] ) != -1 )
				continue; // skip the ones already on
			var label = entry[ 0 ];
			if ( entry[ 2 ] && entry[ 2 ].label )
				label = entry[ 2 ].label;
			var data = { content: label, value: entry };
			if ( entry[ 1 ] == LiteGraph.EXECUTE )
				data.className = "event";
			entries.push( data );
		}

	if ( this.onMenuNodeOutputs )
		entries = this.onMenuNodeOutputs( entries );

	if ( !entries.length )
		return;

	var menu = LiteGraph.createContextualMenu( entries, { event: e, callback: innerClicked, from: prevMenu }, refWindow );

	function innerClicked( v, e, prev ) {
		if ( !node )
			return;

		if ( v.callback )
			v.callback.call( that, node, v, e, prev );

		if ( !v.value )
			return;

		var value = v.value[ 1 ];

		if ( value && (value.constructor === Object || value.constructor === Array) ) // submenu why?
		{
			var entries = [];
			for ( var i in value )
				entries.push({ content: i, value: value[ i ] });
			LiteGraph.createContextualMenu( entries, { event: e, callback: innerClicked, from: prevMenu });
			return false;
		} else
			node.addOutput( v.value[ 0 ], v.value[ 1 ], v.value[ 2 ] );
	}

	return false;
};

LGraphCanvas.onShowMenuNodeProperties = function( node, e, prevMenu ) {
	if ( !node )
		node = this.graph;

	if ( node.subgraph )
		node = node.subgraph;

	if ( !node.properties )
		return;

	var that = this;
	var refWindow = this.getCanvasWindow();

	var entries = [];
		for ( var i in node.properties )
			entries.push({ content: "<span class='propertyName'>" + i + "</span>" + "<span class='propertyValue'>" + node.properties[ i ] + "</span>", value: i });
	if ( !entries.length )
		return;

	var menu = LiteGraph.createContextualMenu( entries, { event: e, callback: innerClicked, from: prevMenu }, refWindow );

	function innerClicked( v, e, prev ) {
		if ( !node )
			return;
		that.showEditPropertyValue( node, v.value, { event: e });
	}

	return false;
};

LGraphCanvas.prototype.showEditPropertyValue = function( node, property, options ) {
	if ( !node || node.properties[ property ] === undefined )
		return;

	options = options || {};
	var that = this;

	var dialog = document.createElement("div");
	dialog.className = "graphdialog";
	dialog.innerHTML = "<span class='name'>" + property + "</span><input autofocus type='text' class='value'/><button>OK</button>";
	var input = dialog.querySelector("input");
	input.value = node.properties[ property ];
	input.addEventListener("keydown", function( e ) {
		if ( e.keyCode != 13 )
			return;
		inner();
		e.preventDefault();
		e.stopPropagation();
	});

	var rect = this.canvas.getClientRects()[ 0 ];
	var offsetx = -20;
	var offsety = -20;
	if ( rect ) {
		offsetx -= rect.left;
		offsety -= rect.top;
	}

	if ( options.event ) {
		dialog.style.left = (options.event.pageX + offsetx) + "px";
		dialog.style.top = (options.event.pageY + offsety) + "px";
	} else
	{
		dialog.style.left = (this.canvas.width * 0.5 + offsetx) + "px";
		dialog.style.top = (this.canvas.height * 0.5 + offsety) + "px";
	}

	var button = dialog.querySelector("button");
	button.addEventListener("click", inner );

	this.canvas.parentNode.appendChild( dialog );


	function inner() {
		var value = input.value;
		var type = typeof( node.properties[ property ] );
		if ( type == "number")
			node.properties[ property ] = Number( value );
		else if ( type == "boolean")
			node.properties[ property ] = value === "true";
		else
			node.properties[ property ] = value;
		if ( node.updatePropety )
			node.updatePropety( property );
		if ( node.invalidateConnectedLinks )
			node.invalidateConnectedLinks();
		dialog.parentNode.removeChild( dialog );
		node.setDirtyCanvas( true, true );
	}
};

LGraphCanvas.onMenuNodeCollapse = function( node ) {
	node.flags.collapsed = !node.flags.collapsed;
	node.setDirtyCanvas( true, true );
};

LGraphCanvas.onMenuNodeMode = function( node, e, prevMenu ) {
	LiteGraph.createContextualMenu([ "Enabled", "Disabled" ], { event: e, callback: innerClicked, from: prevMenu });

	function innerClicked( v ) {
		if ( !node )
			return;
		switch ( v ) {
			case "Disabled": node.enabled = false; break;
			case "Enabled":
			default:
				node.enabled = true; break;
		}
	}

	return false;
};

LGraphCanvas.onMenuNodeColors = function( node, e, prevMenu ) {
	var values = [];
	for ( var i in LGraphCanvas.nodeColors ) {
		var color = LGraphCanvas.nodeColors[ i ];
		var value = { value:i, content:"<span style='display: block; color:" + color.color + "; background-color:" + color.bgcolor + "'>" + i + "</span>" };
		values.push( value );
	}
	LiteGraph.createContextualMenu( values, { event: e, callback: innerClicked, from: prevMenu });

	function innerClicked( v ) {
		if ( !node ) return;
		var color = LGraphCanvas.nodeColors[ v.value ];
		if ( color ) {
			node.color = color.color;
			node.bgcolor = color.bgcolor;
			node.setDirtyCanvas( true );
		}
	}

	return false;
};

LGraphCanvas.onMenuNodeShapes = function( node, e ) {
	LiteGraph.createContextualMenu([ "box", "round" ], { event: e, callback: innerClicked });

	function innerClicked( v ) {
		if ( !node ) return;
		node.shape = v;
		node.setDirtyCanvas( true );
	}

	return false;
};

LGraphCanvas.onMenuNodeRemove = function( node ) {
	if ( node.removable == false ) return;
	node.graph.remove( node );
	node.setDirtyCanvas( true, true );
};

LGraphCanvas.onMenuNodeClone = function( node ) {
	if ( node.clonable == false ) return;
	var newnode = node.clone();
	if ( !newnode ) return;
	newnode.pos = [ node.pos[ 0 ] + 5, node.pos[ 1 ] + 5 ];
	node.graph.add( newnode );
	node.setDirtyCanvas( true, true );
};

LGraphCanvas.nodeColors = {
	"red": { color:"#FAA", bgcolor:"#A44" },
	"green": { color:"#AFA", bgcolor:"#4A4" },
	"blue": { color:"#AAF", bgcolor:"#44A" },
	"white": { color:"#FFF", bgcolor:"#AAA" }
};

LGraphCanvas.prototype.getCanvasMenuOptions = function() {
	var options = null;
	if ( this.getMenuOptions )
		options = this.getMenuOptions();
	else
	{
		options = [
			{ content:"Add Node", isMenu: true, callback: LGraphCanvas.onMenuAdd },
			null,
			{ content:"Properties", isMenu: true, callback: LGraphCanvas.onShowMenuNodeProperties }
			// {content:"Collapse All", callback: LGraphCanvas.onMenuCollapseAll }
		];

		if ( this._graphStack && this._graphStack.length > 0 )
			options = [ { content:"Close subgraph", callback: this.closeSubgraph.bind( this ) }, null ].concat( options );
	}

	if ( this.getExtraMenuOptions ) {
		var extra = this.getExtraMenuOptions( this, options );
		if ( extra )
			options = options.concat( extra );
	}

	return options;
};

LGraphCanvas.prototype.getNodeMenuOptions = function( node ) {
	var options = null;

	if ( node.getMenuOptions )
		options = node.getMenuOptions( this );
	else
	{
		var isCollapsed = node.flags.collapsed || false;
		var collapseText = isCollapsed ? "Expand" : "Collapse";

		options = [
			{ content:"Inputs", isMenu: true, disabled:true, callback: LGraphCanvas.showMenuNodeInputs },
			{ content:"Outputs", isMenu: true, disabled:true, callback: LGraphCanvas.showMenuNodeOutputs },
			null,
			{ content:"Properties", isMenu: true, callback: LGraphCanvas.onShowMenuNodeProperties },
			null,
			{ content:"Mode", isMenu: true, callback: LGraphCanvas.onMenuNodeMode },
			{ content:collapseText, callback: LGraphCanvas.onMenuNodeCollapse },
			{ content:"Colors", isMenu: true, callback: LGraphCanvas.onMenuNodeColors },
			{ content:"Shapes", isMenu: true, callback: LGraphCanvas.onMenuNodeShapes },
			null
		];
	}

	if ( node.getExtraMenuOptions ) {
		var extra = node.getExtraMenuOptions( this );
		if ( extra ) {
			extra.push( null );
			options = extra.concat( options );
		}
	}

	if ( node.clonable !== false )
			options.push({ content:"Clone", callback: LGraphCanvas.onMenuNodeClone });
	if ( node.removable !== false )
			options.push( null, { content:"Remove", callback: LGraphCanvas.onMenuNodeRemove });

	if ( node.onGetInputs ) {
		var inputs = node.onGetInputs();
		if ( inputs && inputs.length )
			options[ 0 ].disabled = false;
	}

	if ( node.onGetOutputs ) {
		var outputs = node.onGetOutputs();
		if ( outputs && outputs.length )
			options[ 1 ].disabled = false;
	}

	return options;
};

LGraphCanvas.prototype.processContextualMenu = function( node, event ) {
	var that = this;
	var win = this.getCanvasWindow();

	var menuInfo = null;
	var options = { event: event, callback: innerOptionClicked };

	// check if mouse is in input
	var slot = null;
	if ( node )
		slot = node.getSlotInPosition( event.canvasX, event.canvasY );

	if ( slot ) {
		menuInfo = slot.locked ? [ "Cannot remove" ] : { "Remove Slot": slot };
		options.title = slot.input ? slot.input.type : slot.output.type;
		if ( slot.input && slot.input.type == LiteGraph.EXECUTE )
			options.title = "Event";
	} else
		menuInfo = node ? this.getNodeMenuOptions( node ) : this.getCanvasMenuOptions();


	// show menu
	if ( !menuInfo )
		return;

	var menu = LiteGraph.createContextualMenu( menuInfo, options, win );

	function innerOptionClicked( v, e ) {
		if ( !v )
			return;

		if ( v == slot ) {
			if ( v.input )
				node.removeInput( slot.slot );
			else if ( v.output )
				node.removeOutput( slot.slot );
			return;
		}

		if ( v.callback )
			return v.callback.call( that, node, e, menu, that, event );
	}
};






// API *************************************************
// function roundRect(ctx, x, y, width, height, radius, radiusLow) {
CanvasRenderingContext2D.prototype.roundRect = function( x, y, width, height, radius, radiusLow ) {
	if ( radius === undefined ) {
		radius = 5;
	}

	if ( radiusLow === undefined )
	 radiusLow  = radius;

	this.moveTo( x + radius, y );
	this.lineTo( x + width - radius, y );
	this.quadraticCurveTo( x + width, y, x + width, y + radius );

	this.lineTo( x + width, y + height - radiusLow );
	this.quadraticCurveTo( x + width, y + height, x + width - radiusLow, y + height );
	this.lineTo( x + radiusLow, y + height );
	this.quadraticCurveTo( x, y + height, x, y + height - radiusLow );
	this.lineTo( x, y + radius );
	this.quadraticCurveTo( x, y, x + radius, y );
};

CanvasRenderingContext2D.prototype.measureTextWidth = CanvasRenderingContext2D.prototype.measureText;
CanvasRenderingContext2D.prototype.measureText = function( text, metrics ) {
	var result = this.measureTextWidth( text );
	if ( metrics )
		this.measureFont( result );
	return result;
};

/*
 * https://github.com/pomax/fontmetrics.js
 *
 * @method measureFont
 * @param metrics {TextMetrics}
 */
CanvasRenderingContext2D.prototype.measureFont = function( metrics ) {
	var font = this.font;

	if ( !CanvasRenderingContext2D.fontHeightCache )
		CanvasRenderingContext2D.fontHeightCache = {};

	var result = CanvasRenderingContext2D.fontHeightCache[ font ];

	if ( !result ) {
		var canvas = document.createElement("canvas");
		var w = canvas.width;
				var h = canvas.height;
				var baseline = h / 2;

		var ctx = canvas.getContext("2d");
		ctx.fillRect( 0, 0, w, h );
		ctx.textBaseline = "alphabetic";
		ctx.fillStyle = "white";
		ctx.font = font;
		ctx.fillText("Hg", 0, baseline );
		var pixels = ctx.getImageData( 0, 0, w, h ).data;
		var i = 0;
				var w4 = w * 4;
				var l = pixels.length;

		while ( i < l && pixels[ i ] === 0 )
			i += 4;
		var ascent = baseline - i / w4;

		i = l - 4;
		while ( i > 0 && pixels[ i ] === 0 )
			i -= 4;
		var descent = i / w4 - baseline;

		w = metrics.width;
		h = ascent + descent;

		result = {
			"height": h,
			"ascent": ascent,
			"descent": descent,
			"size": [ w, h ]
		};
		CanvasRenderingContext2D.fontHeightCache[ font ] = result;
	}

	for ( var i in result )
		metrics[ i ] = result[ i ];

	return metrics;
};

function compareObjects( a, b ) {
	for ( var i in a )
		if ( a[ i ] != b[ i ] )
			return false;
	return true;
}

function distance( a, b ) {
	return Math.sqrt( (b[ 0 ] - a[ 0 ]) * (b[ 0 ] - a[ 0 ]) + (b[ 1 ] - a[ 1 ]) * (b[ 1 ] - a[ 1 ]) );
}

function colorToString( c ) {
	return "rgba(" + Math.round( c[ 0 ] * 255 ).toFixed() + "," + Math.round( c[ 1 ] * 255 ).toFixed() + "," + Math.round( c[ 2 ] * 255 ).toFixed() + "," + (c.length == 4 ? c[ 3 ].toFixed( 2 ) : "1.0") + ")";
}

function isInsideRectangle( x, y, left, top, width, height ) {
	if ( left < x && (left + width) > x &&
		top < y && (top + height) > y )
		return true;
	return false;
}

function detectCorner( x, y, left, top, width, height, size ) {
	if ( isInsideRectangle( x, y, left, top, size, size ) )
		return 1;
	else if ( isInsideRectangle( x, y, left + width - size, top, size, size ) )
		return 2;
	else if ( isInsideRectangle( x, y, left + width - size, top + height - size, size, size ) )
		return 3;
	else if ( isInsideRectangle( x, y, left, top + height - size, size, size ) )
		return 4;
	return 0;
}

// [minx,miny,maxx,maxy]
function growBounding( bounding, x, y ) {
	if ( x < bounding[ 0 ] )
		bounding[ 0 ] = x;
	else if ( x > bounding[ 2 ] )
		bounding[ 2 ] = x;

	if ( y < bounding[ 1 ] )
		bounding[ 1 ] = y;
	else if ( y > bounding[ 3 ] )
		bounding[ 3 ] = y;
}

// point inside boundin box
function isInsideBounding( p, bb ) {
	if ( p[ 0 ] < bb[ 0 ][ 0 ] ||
		p[ 1 ] < bb[ 0 ][ 1 ] ||
		p[ 0 ] > bb[ 1 ][ 0 ] ||
		p[ 1 ] > bb[ 1 ][ 1 ] )
		return false;
	return true;
}

// boundings overlap, format: [start,end]
function overlapBounding( a, b ) {
	if ( a[ 0 ] > b[ 2 ] ||
		a[ 1 ] > b[ 3 ] ||
		a[ 2 ] < b[ 0 ] ||
		a[ 3 ] < b[ 1 ] )
		return false;
	return true;
}

// boundings overlap, format: [start,end]
function containsBounding( a, b ) {
	if ( a[ 0 ] < b[ 0 ] &&
		a[ 1 ] < b[ 1 ] &&
		a[ 2 ] > b[ 2 ] &&
		a[ 3 ] > b[ 3 ] )
		return true;
	return false;
}

CanvasRenderingContext2D.prototype.executablePort = function( x, y, width, height, arrow ) {
	if ( width === undefined ) width = 8;

	if ( height === undefined ) height = 10;

	if ( arrow === undefined ) arrow = width / 2;

	var left = x - 4;
	var bottom = y - 5;

	this.moveTo( left, bottom );
	this.lineTo( left + width - arrow, bottom );
	this.lineTo( left + width, bottom + height / 2 );
	this.lineTo( left + width - arrow, bottom + height );
	this.lineTo( left, bottom + height );
	this.lineTo( left, bottom );
};

CanvasRenderingContext2D.prototype.dataPort = function( x, y, radius ) {
	if ( radius == undefined ) radius = 4;

	this.arc( x, y, radius, 0, Math.PI * 2 );
};


// Convert a hex value to its decimal value - the inputted hex must be in the
//	format of a hex triplet - the kind we use for HTML colours. The function
//	will return an array with three values.
function hex2num( hex ) {
	if ( hex.charAt( 0 ) == "#") hex = hex.slice( 1 ); // Remove the '#' char - if there is one.
	hex = hex.toUpperCase();
	var hexAlphabets = "0123456789ABCDEF";
	var value = new Array( 3 );
	var k = 0;
	var int1, int2;
	for ( var i = 0; i < 6; i += 2 ) {
		int1 = hexAlphabets.indexOf( hex.charAt( i ) );
		int2 = hexAlphabets.indexOf( hex.charAt( i + 1 ) );
		value[ k ] = (int1 * 16) + int2;
		k++;
	}
	return (value);
}
// Give a array with three values as the argument and the function will return
//	the corresponding hex triplet.
function num2hex( triplet ) {
	var hexAlphabets = "0123456789ABCDEF";
	var hex = "#";
	var int1, int2;
	for ( var i = 0; i < 3; i++ ) {
		int1 = triplet[ i ] / 16;
		int2 = triplet[ i ] % 16;

		hex += hexAlphabets.charAt( int1 ) + hexAlphabets.charAt( int2 );
	}
	return (hex);
}

function isEmpty( object ) {
	return Object.keys( object ).length === 0 && object.constructor === Object;
}

/* LiteGraph GUI elements *************************************/

LiteGraph.createContextualMenu = function( values, options, refWindow ) {
	options = options || {};
	this.options = options;

	// allows to create graph canvas in separate window
	refWindow = refWindow || window;

		if ( !options.from )
				LiteGraph.closeAllContextualMenus( refWindow );
		else {
				// closing submenus
				var menus = document.querySelectorAll(".graphcontextualmenu");
				for ( var key in menus ) {
						if ( menus[ key ].previousSibling == options.from )
								menus[ key ].closeMenu();
				}
		}

	var root = refWindow.document.createElement("div");
	root.className = "graphcontextualmenu graphmenubar-panel";
	this.root = root;
	var style = root.style;

	style.minWidth = "100px";
	style.minHeight = "20px";

	style.position = "fixed";
	style.top = "100px";
	style.left = "100px";
	style.color = "#AAF";
	style.padding = "2px";
	style.borderBottom = "2px solid #AAF";
	style.backgroundColor = "#444";

	// title
	if ( options.title ) {
		var element = document.createElement("div");
		element.className = "graphcontextualmenu-title";
		element.innerHTML = options.title;
		root.appendChild( element );
	}

	// avoid a context menu in a context menu
	root.addEventListener("contextmenu", function( e ) { e.preventDefault(); return false; });

	for ( var i in values ) {
		var item = values[ i ];
		var element = refWindow.document.createElement("div");
		element.className = "graphmenu-entry";

		if ( item == null ) {
			element.className += " separator";
			root.appendChild( element );
			continue;
		}

		if ( item.isMenu )
			element.className += " submenu";

		if ( item.disabled )
			element.className += " disabled";

		if ( item.className )
			element.className += " " + item.className;

		element.style.cursor = "pointer";
		element.dataset.value = typeof(item) == "string" ? item : item.value;
		element.data = item;
		if ( typeof(item) == "string")
			element.innerHTML = values.constructor == Array ? values[ i ] : i;
		else
			element.innerHTML = item.content ? item.content : i;

		element.addEventListener("click", onClick );
		root.appendChild( element );
	}

	root.addEventListener("mouseover", function( e ) {
		this.mouseInside = true;
	});

	root.addEventListener("mouseout", function( e ) {
		// console.log("OUT!");
		// check if mouse leave a inner element
		var aux = e.relatedTarget || e.toElement;
		while ( aux != this && aux != refWindow.document )
			aux = aux.parentNode;

		if ( aux == this )
			return;
		this.mouseInside = false;
		if ( !this.blockClose )
			this.closeMenu();
	});

	// insert before checking position
	refWindow.document.body.appendChild( root );

	var rootRect = root.getClientRects()[ 0 ];

	// link menus
	if ( options.from ) {
		options.from.blockClose = true;
	}

	var left = options.left || 0;
	var top = options.top || 0;
	if ( options.event ) {
		left = (options.event.pageX - 10);
		top = (options.event.pageY - 10);
		if ( options.left )
			left = options.left;

		var rect = refWindow.document.body.getClientRects()[ 0 ];

		if ( options.from ) {
			var parentRect = options.from.getClientRects()[ 0 ];
			left = parentRect.left + parentRect.width;
		}


		if ( left > (rect.width - rootRect.width - 10) )
			left = (rect.width - rootRect.width - 10);
		if ( top > (rect.height - rootRect.height - 10) )
			top = (rect.height - rootRect.height - 10);
	}

	root.style.left = left + "px";
	root.style.top = top  + "px";

	function onClick( e ) {
		var value = this.dataset.value;
		var close = true;
		if ( options.callback ) {
			var ret = options.callback.call( root, this.data, e );
			if ( ret !== undefined ) close = ret;
		}

		if ( close )
			LiteGraph.closeAllContextualMenus( refWindow );
			// root.closeMenu();
	}

	root.closeMenu = function() {
		if ( options.from ) {
			options.from.blockClose = false;
			if ( !options.from.mouseInside )
				options.from.closeMenu();
		}
		if ( this.parentNode )
			refWindow.document.body.removeChild( this );
	};

	return root;
};

LiteGraph.closeAllContextualMenus = function( refWindow ) {
	refWindow = refWindow || window;

	var elements = refWindow.document.querySelectorAll(".graphcontextualmenu");
	if ( !elements.length ) return;

	var result = [];
	for ( var i = 0; i < elements.length; i++ )
		result.push( elements[ i ] );

	for ( var i in result )
		if ( result[ i ].parentNode )
			result[ i ].parentNode.removeChild( result[ i ] );
};

LiteGraph.extendClass = function( target, origin ) {
	for ( var i in origin ) // copy class properties
	{
		if ( target.hasOwnProperty( i ) )
			continue;
		target[ i ] = origin[ i ];
	}

	if ( origin.prototype ) // copy prototype properties
		for ( var i in origin.prototype ) // only enumerables
		{
			if ( !origin.prototype.hasOwnProperty( i ) )
				continue;

			if ( target.prototype.hasOwnProperty( i ) ) // avoid overwritting existing ones
				continue;

			// copy getters
			if ( origin.prototype.__lookupGetter__( i ) )
				target.prototype.__defineGetter__( i, origin.prototype.__lookupGetter__( i ) );
			else
				target.prototype[ i ] = origin.prototype[ i ];

			// and setters
			if ( origin.prototype.__lookupSetter__( i ) )
				target.prototype.__defineSetter__( i, origin.prototype.__lookupSetter__( i ) );
		}
};

/*
LiteGraph.createNodetypeWrapper = function( classObject ) {
	// create Nodetype object
}
// LiteGraph.registerNodeType("scene/global", LGraphGlobal );
*/

if ( !window.requestAnimationFrame ) {
	window.requestAnimationFrame = window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame    ||
			(function( callback ) {
			window.setTimeout( callback, 1000 / 60 );
			});
}


