//packer version

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
	NODE_WIDTH: 140,
	NODE_MIN_WIDTH: 50,
	NODE_COLLAPSED_RADIUS: 10,
	NODE_COLLAPSED_WIDTH: 80,
	CANVAS_GRID_SIZE: 10,
	NODE_TITLE_COLOR: "#222",
	NODE_DEFAULT_COLOR: "#999",
	NODE_DEFAULT_BGCOLOR: "#444",
	NODE_DEFAULT_BOXCOLOR: "#AEF",
	NODE_DEFAULT_SHAPE: "box",
	MAX_NUMBER_OF_NODES: 1000, //avoid infinite loops
	DEFAULT_POSITION: [100,100],//default node position
	nodeImagesPath: "",

	//enums
	INPUT: 1, 
	OUTPUT: 2, 

	EVENT: -1, //for outputs
	ACTION: -1, //for inputs

	ALWAYS: 0,
	ON_EVENT: 1,
	NEVER: 2,

	proxy: null, //used to redirect calls

	debug: false,
	throwErrors: true,
	registeredNodeTypes: {}, //nodetypes by string
	Nodes: {}, //node types by classname

	/**
	* Register a node class so it can be listed when the user wants to create a new one
	* @method registerNodeType
	* @param {String} type name of the node and path
	* @param {Class} baseClass class containing the structure of a node
	*/

	registerNodeType: function(type, baseClass)
	{
		if(!baseClass.prototype)
			throw("Cannot register a simple object, it must be a class with a prototype");
		baseClass.type = type;

		if(LiteGraph.debug)
			console.log("Node registered: " + type);

		var categories = type.split("/");

		var pos = type.lastIndexOf("/");
		baseClass.category = type.substr(0,pos);
		//info.name = name.substr(pos+1,name.length - pos);

		//extend class
		if(baseClass.prototype) //is a class
			for(var i in LGraphNode.prototype)
				if(!baseClass.prototype[i])
					baseClass.prototype[i] = LGraphNode.prototype[i];

		this.registeredNodeTypes[ type ] = baseClass;
		if(baseClass.constructor.name)
			this.Nodes[ baseClass.constructor.name ] = baseClass;
	},

	/**
	* Adds this method to all nodetypes, existing and to be created
	* (You can add it to LGraphNode.prototype but then existing node types wont have it)
	* @method addNodeMethod
	* @param {Function} func
	*/
	addNodeMethod: function( name, func )
	{
		LGraphNode.prototype[name] = func;
		for(var i in this.registeredNodeTypes)
			this.registeredNodeTypes[i].prototype[name] = func;
	},

	/**
	* Create a node of a given type with a name. The node is not attached to any graph yet.
	* @method createNode
	* @param {String} type full name of the node class. p.e. "math/sin"
	* @param {String} name a name to distinguish from other nodes
	* @param {Object} options to set options
	*/

	createNode: function( type, title, options )
	{
		var baseClass = this.registeredNodeTypes[type];
		if (!baseClass)
		{
			if(LiteGraph.debug)
				console.log("GraphNode type \"" + type + "\" not registered.");
			return null;
		}

		var prototype = baseClass.prototype || baseClass;

		title = title || baseClass.title || type;

		var node = new baseClass( name );

		node.type = type;
		if(!node.title) node.title = title;
		if(!node.properties) node.properties = {};
		if(!node.propertiesInfo) node.propertiesInfo = [];
		if(!node.flags) node.flags = {};
		if(!node.size) node.size = node.computeSize();
		if(!node.pos) node.pos = LiteGraph.DEFAULT_POSITION.concat();
		if(!node.mode) node.mode = LiteGraph.ALWAYS;

		//extra options
		if(options)
		{
			for(var i in options)
				node[i] = options[i];								
		}

		return node;
	},

	/**
	* Returns a registered node type with a given name
	* @method getNodeType
	* @param {String} type full name of the node class. p.e. "math/sin"
	* @return {Class} the node class
	*/

	getNodeType: function(type)
	{
		return this.registeredNodeTypes[type];
	},


	/**
	* Returns a list of node types matching one category
	* @method getNodeType
	* @param {String} category category name
	* @return {Array} array with all the node classes
	*/

	getNodeTypesInCategory: function(category)
	{
		var r = [];
		for(var i in this.registeredNodeTypes)
			if(category == "")
			{
				if (this.registeredNodeTypes[i].category == null)
					r.push(this.registeredNodeTypes[i]);
			}
			else if (this.registeredNodeTypes[i].category == category)
				r.push(this.registeredNodeTypes[i]);

		return r;
	},

	/**
	* Returns a list with all the node type categories
	* @method getNodeTypesCategories
	* @return {Array} array with all the names of the categories 
	*/

	getNodeTypesCategories: function()
	{
		var categories = {"":1};
		for(var i in this.registeredNodeTypes)
			if(this.registeredNodeTypes[i].category && !this.registeredNodeTypes[i].skipList)
				categories[ this.registeredNodeTypes[i].category ] = 1;
		var result = [];
		for(var i in categories)
			result.push(i);
		return result;
	},

	//debug purposes: reloads all the js scripts that matches a wilcard
	reloadNodes: function (folderWildcard)
	{
		var tmp = document.getElementsByTagName("script");
		//weird, this array changes by its own, so we use a copy
		var scriptFiles = [];
		for(var i in tmp)
			scriptFiles.push(tmp[i]);


		var docHeadObj = document.getElementsByTagName("head")[0];
		folderWildcard = document.location.href + folderWildcard;

		for(var i in scriptFiles)
		{
			var src = scriptFiles[i].src;
			if( !src || src.substr(0,folderWildcard.length ) != folderWildcard)
				continue;

			try
			{
				if(LiteGraph.debug)
					console.log("Reloading: " + src);
				var dynamicScript = document.createElement("script");
				dynamicScript.type = "text/javascript";
				dynamicScript.src = src;
				docHeadObj.appendChild(dynamicScript);
				docHeadObj.removeChild(scriptFiles[i]);
			}
			catch (err)
			{
				if(LiteGraph.throwErrors)
					throw err;
				if(LiteGraph.debug)
					console.log("Error while reloading " + src);
			}
		}

		if(LiteGraph.debug)
			console.log("Nodes reloaded");
	},
	
	//separated just to improve if it doesnt work
	cloneObject: function(obj, target)
	{
		if(obj == null) return null;
		var r = JSON.parse( JSON.stringify( obj ) );
		if(!target) return r;

		for(var i in r)
			target[i] = r[i];
		return target;
	},

	isValidConnection: function( typeA, typeB )
	{
		if( !typeA ||  //generic output
			!typeB || //generic input
			typeA == typeA || //same type (is valid for triggers)
			(typeA !== LiteGraph.EVENT && typeB !== LiteGraph.EVENT && typeA.toLowerCase() == typeB.toLowerCase()) ) //same type
			return true;
		return false;
	}
};

if(typeof(performance) != "undefined")
  LiteGraph.getTime = function getTime() { return performance.now(); }
else
  LiteGraph.getTime = function getTime() { return Date.now(); }




 

//*********************************************************************************
// LGraph CLASS                                  
//*********************************************************************************

/**
* LGraph is the class that contain a full graph. We instantiate one and add nodes to it, and then we can run the execution loop.
*
* @class LGraph
* @constructor
*/

function LGraph()
{
	if (LiteGraph.debug)
		console.log("Graph created");
	this.listOfGraphcanvas = null;
	this.clear();
}

//default supported types
LGraph.supportedTypes = ["number","string","boolean"];

//used to know which types of connections support this graph (some graphs do not allow certain types)
LGraph.prototype.getSupportedTypes = function() { return this.supportedTypes || LGraph.supportedTypes; }

LGraph.STATUS_STOPPED = 1;
LGraph.STATUS_RUNNING = 2;

/**
* Removes all nodes from this graph
* @method clear
*/

LGraph.prototype.clear = function()
{
	this.stop();
	this.status = LGraph.STATUS_STOPPED;
	this.lastNodeId = 0;

	//nodes
	this._nodes = [];
	this._nodesById = {};

	//links
	this.lastLinkId = 0;
	this.links = {}; //container with all the links

	//iterations
	this.iteration = 0;

	this.config = {
	};

	//timing
	this.globaltime = 0;
	this.runningtime = 0;
	this.fixedtime =  0;
	this.fixedtimeLapse = 0.01;
	this.elapsedTime = 0.01;
	this.starttime = 0;

	//globals
	this.globalInputs = {};
	this.globalOutputs = {};

	//this.graph = {};
	this.debug = true;

	this.change();

	this.sendActionToCanvas("clear");
}

/**
* Attach Canvas to this graph
* @method attachCanvas
* @param {GraphCanvas} graphCanvas 
*/

LGraph.prototype.attachCanvas = function(graphcanvas)
{
	if(graphcanvas.constructor != LGraphCanvas)
		throw("attachCanvas expects a LGraphCanvas instance");
	if(graphcanvas.graph && graphcanvas.graph != this)
		graphcanvas.graph.detachCanvas( graphcanvas );

	graphcanvas.graph = this;
	if(!this.listOfGraphcanvas)
		this.listOfGraphcanvas = [];
	this.listOfGraphcanvas.push(graphcanvas);
}

/**
* Detach Canvas from this graph
* @method detachCanvas
* @param {GraphCanvas} graphCanvas 
*/

LGraph.prototype.detachCanvas = function(graphcanvas)
{
	if(!this.listOfGraphcanvas)
		return;

	var pos = this.listOfGraphcanvas.indexOf( graphcanvas );
	if(pos == -1)
		return;
	graphcanvas.graph = null;
	this.listOfGraphcanvas.splice(pos,1);
}

/**
* Starts running this graph every interval milliseconds.
* @method start
* @param {number} interval amount of milliseconds between executions, default is 1
*/

LGraph.prototype.start = function(interval)
{
	if(this.status == LGraph.STATUS_RUNNING) return;
	this.status = LGraph.STATUS_RUNNING;

	if(this.onPlayEvent)
		this.onPlayEvent();

	this.sendEventToAllNodes("onStart");

	//launch
	this.starttime = LiteGraph.getTime();
	interval = interval || 1;
	var that = this;	

	this.executionTimerId = setInterval( function() { 
		//execute
		that.runStep(1); 
	},interval);
}

/**
* Stops the execution loop of the graph
* @method stop execution
*/

LGraph.prototype.stop = function()
{
	if(this.status == LGraph.STATUS_STOPPED)
		return;

	this.status = LGraph.STATUS_STOPPED;

	if(this.onStopEvent)
		this.onStopEvent();

	if(this.executionTimerId != null)
		clearInterval(this.executionTimerId);
	this.executionTimerId = null;

	this.sendEventToAllNodes("onStop");
}

/**
* Run N steps (cycles) of the graph
* @method runStep
* @param {number} num number of steps to run, default is 1
*/

LGraph.prototype.runStep = function(num)
{
	num = num || 1;

	var start = LiteGraph.getTime();
	this.globaltime = 0.001 * (start - this.starttime);

	var nodes = this._nodesInOrder ? this._nodesInOrder : this._nodes;
	if(!nodes)
		return;

	try
	{
		//iterations
		for(var i = 0; i < num; i++)
		{
			for( var j = 0, l = nodes.length; j < l; ++j )
			{
				var node = nodes[j];
				if( node.mode == LiteGraph.ALWAYS && node.onExecute )
					node.onExecute();
			}

			this.fixedtime += this.fixedtimeLapse;
			if( this.onExecuteStep )
				this.onExecuteStep();
		}

		if( this.onAfterExecute )
			this.onAfterExecute();
		this.errorsInExecution = false;
	}
	catch (err)
	{
		this.errorsInExecution = true;
		if(LiteGraph.throwErrors)
			throw err;
		if(LiteGraph.debug)
			console.log("Error during execution: " + err);
		this.stop();
	}

	var elapsed = LiteGraph.getTime() - start;
	if (elapsed == 0)
		elapsed = 1;
	this.elapsedTime = 0.001 * elapsed;
	this.globaltime += 0.001 * elapsed;
	this.iteration += 1;
}

/**
* Updates the graph execution order according to relevance of the nodes (nodes with only outputs have more relevance than
* nodes with only inputs.
* @method updateExecutionOrder
*/
	
LGraph.prototype.updateExecutionOrder = function()
{
	this._nodesInOrder = this.computeExecutionOrder();
}

//This is more internal, it computes the order and returns it
LGraph.prototype.computeExecutionOrder = function()
{
	var L = [];
	var S = [];
	var M = {};
	var visitedLinks = {}; //to avoid repeating links
	var remainingLinks = {}; //to a
	
	//search for the nodes without inputs (starting nodes)
	for (var i = 0, l = this._nodes.length; i < l; ++i)
	{
		var n = this._nodes[i];
		M[n.id] = n; //add to pending nodes

		var num = 0; //num of input connections
		if(n.inputs)
			for(var j = 0, l2 = n.inputs.length; j < l2; j++)
				if(n.inputs[j] && n.inputs[j].link != null)
					num += 1;

		if(num == 0) //is a starting node
			S.push(n);
		else //num of input links 
			remainingLinks[n.id] = num;
	}

	while(true)
	{
		if(S.length == 0)
			break;
			
		//get an starting node
		var n = S.shift();
		L.push(n); //add to ordered list
		delete M[n.id]; //remove from the pending nodes
		
		//for every output
		if(n.outputs)
			for(var i = 0; i < n.outputs.length; i++)
			{
				var output = n.outputs[i];
				//not connected
				if(output == null || output.links == null || output.links.length == 0)
					continue;

				//for every connection
				for(var j = 0; j < output.links.length; j++)
				{
					var linkId = output.links[j];
					var link = this.links[linkId];
					if(!link) continue;

					//already visited link (ignore it)
					if(visitedLinks[ link.id ])
						continue;

					var targetNode = this.getNodeById( link.targetId );
					if(targetNode == null)
					{
						visitedLinks[ link.id ] = true;
						continue;
					}

					visitedLinks[link.id] = true; //mark as visited
					remainingLinks[targetNode.id] -= 1; //reduce the number of links remaining
					if (remainingLinks[targetNode.id] == 0)
						S.push(targetNode); //if no more links, then add to Starters array
				}
			}
	}
	
	//the remaining ones (loops)
	for(var i in M)
		L.push( M[i] );
		
	if( L.length != this._nodes.length && LiteGraph.debug )
		console.warn("something went wrong, nodes missing");

	//save order number in the node
	for(var i = 0; i < L.length; ++i)
		L[i].order = i;
	
	return L;
}


/**
* Returns the amount of time the graph has been running in milliseconds
* @method getTime
* @return {number} number of milliseconds the graph has been running
*/

LGraph.prototype.getTime = function()
{
	return this.globaltime;
}

/**
* Returns the amount of time accumulated using the fixedtimeLapse var. This is used in context where the time increments should be constant
* @method getFixedTime
* @return {number} number of milliseconds the graph has been running
*/

LGraph.prototype.getFixedTime = function()
{
	return this.fixedtime;
}

/**
* Returns the amount of time it took to compute the latest iteration. Take into account that this number could be not correct
* if the nodes are using graphical actions
* @method getElapsedTime
* @return {number} number of milliseconds it took the last cycle
*/

LGraph.prototype.getElapsedTime = function()
{
	return this.elapsedTime;
}

/**
* Sends an event to all the nodes, useful to trigger stuff
* @method sendEventToAllNodes
* @param {String} eventname the name of the event (function to be called)
* @param {Array} params parameters in array format
*/

LGraph.prototype.sendEventToAllNodes = function( eventname, params, mode )
{
	mode = mode || LiteGraph.ALWAYS;

	var nodes = this._nodesInOrder ? this._nodesInOrder : this._nodes;
	if(!nodes)
		return;

	for( var j = 0, l = nodes.length; j < l; ++j )
	{
		var node = nodes[j];
		if(node[eventname] && node.mode == mode )
		{
			if(params === undefined)
				node[eventname]();
			else if(params && params.constructor === Array)
				node[eventname].apply( node, params );
			else
				node[eventname](params);
		}
	}
}

LGraph.prototype.sendActionToCanvas = function(action, params)
{
	if(!this.listOfGraphcanvas) 
		return;

	for(var i = 0; i < this.listOfGraphcanvas.length; ++i)
	{
		var c = this.listOfGraphcanvas[i];
		if( c[action] )
			c[action].apply(c, params);
	}
}

/**
* Adds a new node instasnce to this graph
* @method add
* @param {LGraphNode} node the instance of the node
*/

LGraph.prototype.add = function(node, skipComputeOrder)
{
	if(!node || (node.id != -1 && this._nodesById[node.id] != null))
		return; //already added

	if(this._nodes.length >= LiteGraph.MAX_NUMBER_OF_NODES)
		throw("LiteGraph: max number of nodes in a graph reached");

	//give him an id
	if(node.id == null || node.id == -1)
		node.id = this.lastNodeId++;

	node.graph = this;

	this._nodes.push(node);
	this._nodesById[node.id] = node;

	/*
	// rendering stuf... 
	if(node.bgImageUrl)
		node.bgImage = node.loadImage(node.bgImageUrl);
	*/

	if(node.onAdded)
		node.onAdded( this );

	if(this.config.alignToGrid)
		node.alignToGrid();

	if(!skipComputeOrder)
		this.updateExecutionOrder();

	if(this.onNodeAdded)
		this.onNodeAdded(node);


	this.setDirtyCanvas(true);

	this.change();

	return node; //to chain actions
}

/**
* Removes a node from the graph
* @method remove
* @param {LGraphNode} node the instance of the node
*/

LGraph.prototype.remove = function(node)
{
	if(this._nodesById[node.id] == null)
		return; //not found

	if(node.ignoreRemove) 
		return; //cannot be removed

	//disconnect inputs
	if(node.inputs)
		for(var i = 0; i < node.inputs.length; i++)
		{
			var slot = node.inputs[i];
			if(slot.link != null)
				node.disconnectInput(i);
		}

	//disconnect outputs
	if(node.outputs)
		for(var i = 0; i < node.outputs.length; i++)
		{
			var slot = node.outputs[i];
			if(slot.links != null && slot.links.length)
				node.disconnectOutput(i);
		}

	//node.id = -1; //why?

	//callback
	if(node.onRemoved)
		node.onRemoved();

	node.graph = null;

	//remove from canvas render
	if(this.listOfGraphcanvas)
	{
		for(var i = 0; i < this.listOfGraphcanvas.length; ++i)
		{
			var canvas = this.listOfGraphcanvas[i];
			if(canvas.selectedNodes[node.id])
				delete canvas.selectedNodes[node.id];
			if(canvas.nodeDragged == node)
				canvas.nodeDragged = null;
		}
	}

	//remove from containers
	var pos = this._nodes.indexOf(node);
	if(pos != -1)
		this._nodes.splice(pos,1);
	delete this._nodesById[node.id];

	if(this.onNodeRemoved)
		this.onNodeRemoved(node);

	this.setDirtyCanvas(true,true);

	this.change();

	this.updateExecutionOrder();
}

/**
* Returns a node by its id.
* @method getNodeById
* @param {String} id
*/

LGraph.prototype.getNodeById = function(id)
{
	if(id==null) return null;
	return this._nodesById[id];
}

/**
* Returns a list of nodes that matches a class
* @method findNodesByClass
* @param {Class} classObject the class itself (not an string)
* @return {Array} a list with all the nodes of this type
*/

LGraph.prototype.findNodesByClass = function(classObject)
{
	var r = [];
	for(var i = 0, l = this._nodes.length; i < l; ++i)
		if(this._nodes[i].constructor === classObject)
			r.push(this._nodes[i]);
	return r;
}

/**
* Returns a list of nodes that matches a type
* @method findNodesByType
* @param {String} type the name of the node type
* @return {Array} a list with all the nodes of this type
*/

LGraph.prototype.findNodesByType = function(type)
{
	var type = type.toLowerCase();
	var r = [];
	for(var i = 0, l = this._nodes.length; i < l; ++i)
		if(this._nodes[i].type.toLowerCase() == type )
			r.push(this._nodes[i]);
	return r;
}

/**
* Returns a list of nodes that matches a name
* @method findNodesByName
* @param {String} name the name of the node to search
* @return {Array} a list with all the nodes with this name
*/

LGraph.prototype.findNodesByTitle = function(title)
{
	var result = [];
	for(var i = 0, l = this._nodes.length; i < l; ++i)
		if(this._nodes[i].title == title)
			result.push(this._nodes[i]);
	return result;
}

/**
* Returns the top-most node in this position of the canvas
* @method getNodeOnPos
* @param {number} x the x coordinate in canvas space
* @param {number} y the y coordinate in canvas space
* @param {Array} nodesList a list with all the nodes to search from, by default is all the nodes in the graph
* @return {Array} a list with all the nodes that intersect this coordinate
*/

LGraph.prototype.getNodeOnPos = function(x,y, nodesList)
{
	nodesList = nodesList || this._nodes;
	for (var i = nodesList.length - 1; i >= 0; i--)
	{
		var n = nodesList[i];
		if(n.isPointInsideNode( x, y, 2 ))
			return n;
	}
	return null;
}

// ********** GLOBALS *****************

//Tell this graph has a global input of this type
LGraph.prototype.addGlobalInput = function(name, type, value)
{
	this.globalInputs[name] = { name: name, type: type, value: value };

	if(this.onGlobalInputAdded)
		this.onGlobalInputAdded(name, type);

	if(this.onGlobalsChange)
		this.onGlobalsChange();
}

//assign a data to the global input
LGraph.prototype.setGlobalInputData = function(name, data)
{
	var input = this.globalInputs[name];
	if (!input)
		return;
	input.value = data;
}

//assign a data to the global input
LGraph.prototype.getGlobalInputData = function(name)
{
	var input = this.globalInputs[name];
	if (!input)
		return null;
	return input.value;
}

//rename the global input
LGraph.prototype.renameGlobalInput = function(oldName, name)
{
	if(name == oldName)
		return;

	if(!this.globalInputs[oldName])
		return false;

	if(this.globalInputs[name])
	{
		console.error("there is already one input with that name");
		return false;
	}

	this.globalInputs[name] = this.globalInputs[oldName];
	delete this.globalInputs[oldName];

	if(this.onGlobalInputRenamed)
		this.onGlobalInputRenamed(oldName, name);

	if(this.onGlobalsChange)
		this.onGlobalsChange();
}

LGraph.prototype.changeGlobalInputType = function(name, type)
{
	if(!this.globalInputs[name])
		return false;

	if(this.globalInputs[name].type.toLowerCase() == type.toLowerCase() )
		return;

	this.globalInputs[name].type = type;
	if(this.onGlobalInputTypeChanged)
		this.onGlobalInputTypeChanged(name, type);
}

LGraph.prototype.removeGlobalInput = function(name)
{
	if(!this.globalInputs[name])
		return false;

	delete this.globalInputs[name];

	if(this.onGlobalInputRemoved)
		this.onGlobalInputRemoved(name);

	if(this.onGlobalsChange)
		this.onGlobalsChange();
	return true;
}


LGraph.prototype.addGlobalOutput = function(name, type, value)
{
	this.globalOutputs[name] = { name: name, type: type, value: value };

	if(this.onGlobalOutputAdded)
		this.onGlobalOutputAdded(name, type);

	if(this.onGlobalsChange)
		this.onGlobalsChange();
}

//assign a data to the global output
LGraph.prototype.setGlobalOutputData = function(name, value)
{
	var output = this.globalOutputs[ name ];
	if (!output)
		return;
	output.value = value;
}

//assign a data to the global input
LGraph.prototype.getGlobalOutputData = function(name)
{
	var output = this.globalOutputs[name];
	if (!output)
		return null;
	return output.value;
}


//rename the global output
LGraph.prototype.renameGlobalOutput = function(oldName, name)
{
	if(!this.globalOutputs[oldName])
		return false;

	if(this.globalOutputs[name])
	{
		console.error("there is already one output with that name");
		return false;
	}

	this.globalOutputs[name] = this.globalOutputs[oldName];
	delete this.globalOutputs[oldName];

	if(this.onGlobalOutputRenamed)
		this.onGlobalOutputRenamed(oldName, name);

	if(this.onGlobalsChange)
		this.onGlobalsChange();
}

LGraph.prototype.changeGlobalOutputType = function(name, type)
{
	if(!this.globalOutputs[name])
		return false;

	if(this.globalOutputs[name].type.toLowerCase() == type.toLowerCase() )
		return;

	this.globalOutputs[name].type = type;
	if(this.onGlobalOutputTypeChanged)
		this.onGlobalOutputTypeChanged(name, type);
}

LGraph.prototype.removeGlobalOutput = function(name)
{
	if(!this.globalOutputs[name])
		return false;
	delete this.globalOutputs[name];

	if(this.onGlobalOutputRemoved)
		this.onGlobalOutputRemoved(name);

	if(this.onGlobalsChange)
		this.onGlobalsChange();
	return true;
}


/**
* Assigns a value to all the nodes that matches this name. This is used to create global variables of the node that
* can be easily accesed from the outside of the graph
* @method setInputData
* @param {String} name the name of the node
* @param {*} value value to assign to this node
*/

LGraph.prototype.setInputData = function(name,value)
{
	var nodes = this.findNodesByName( name );
	for(var i = 0, l = nodes.length; i < l; ++i)
		nodes[i].setValue(value);
}

/**
* Returns the value of the first node with this name. This is used to access global variables of the graph from the outside
* @method setInputData
* @param {String} name the name of the node
* @return {*} value of the node
*/

LGraph.prototype.getOutputData = function(name)
{
	var n = this.findNodesByName(name);
	if(n.length)
		return m[0].getValue();
	return null;
}

//This feature is not finished yet, is to create graphs where nodes are not executed unless a trigger message is received

LGraph.prototype.triggerInput = function(name,value)
{
	var nodes = this.findNodesByName(name);
	for(var i = 0; i < nodes.length; ++i)
		nodes[i].onTrigger(value);
}

LGraph.prototype.setCallback = function(name,func)
{
	var nodes = this.findNodesByName(name);
	for(var i = 0; i < nodes.length; ++i)
		nodes[i].setTrigger(func);
}


LGraph.prototype.connectionChange = function( node )
{
	this.updateExecutionOrder();
	if( this.onConnectionChange )
		this.onConnectionChange( node );
	this.sendActionToCanvas("onConnectionChange");
}

/**
* returns if the graph is in live mode
* @method isLive
*/

LGraph.prototype.isLive = function()
{
	if(!this.listOfGraphcanvas)
		return false;

	for(var i = 0; i < this.listOfGraphcanvas.length; ++i)
	{
		var c = this.listOfGraphcanvas[i];
		if(c.liveMode)
			return true;
	}
	return false;
}

/* Called when something visually changed */
LGraph.prototype.change = function()
{
	if(LiteGraph.debug)
		console.log("Graph changed");

	this.sendActionToCanvas("setDirty",[true,true]);

	if(this.onChange)
		this.onChange(this);
}

LGraph.prototype.setDirtyCanvas = function(fg,bg)
{
	this.sendActionToCanvas("setDirty",[fg,bg]);
}

//save and recover app state ***************************************
/**
* Creates a Object containing all the info about this graph, it can be serialized
* @method serialize
* @return {Object} value of the node
*/
LGraph.prototype.serialize = function()
{
	var nodesInfo = [];
	for(var i = 0, l = this._nodes.length; i < l; ++i)
		nodesInfo.push( this._nodes[i].serialize() );

	//remove data from links, we dont want to store it
	for(var i in this.links) //links is an OBJECT
	{
		var link = this.links[i];
		link.data = null;
		delete link._lastTime;
	}

	var data = {
//		graph: this.graph,

		iteration: this.iteration,
		frame: this.frame,
		lastNodeId: this.lastNodeId,
		lastLinkId: this.lastLinkId,
		links: LiteGraph.cloneObject( this.links ),

		config: this.config,
		nodes: nodesInfo
	};

	return data;
}


/**
* Configure a graph from a JSON string 
* @method configure
* @param {String} str configure a graph from a JSON string
*/
LGraph.prototype.configure = function(data, keepOld)
{
	if(!keepOld)
		this.clear();

	var nodes = data.nodes;

	//copy all stored fields
	for (var i in data)
		this[i] = data[i];

	var error = false;

	//create nodes
	this._nodes = [];
	for(var i = 0, l = nodes.length; i < l; ++i)
	{
		var nInfo = nodes[i]; //stored info
		var node = LiteGraph.createNode( nInfo.type, nInfo.title );
		if(!node)
		{
			if(LiteGraph.debug)
				console.log("Node not found: " + nInfo.type);
			error = true;
			continue;
		}

		node.id = nInfo.id; //id it or it will create a new id
		this.add(node, true); //add before configure, otherwise configure cannot create links
		node.configure(nInfo);
	}

	this.updateExecutionOrder();
	this.setDirtyCanvas(true,true);
	return error;
}

LGraph.prototype.onNodeTrace = function(node, msg, color)
{
	//TODO
}

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

function LGraphNode(title)
{
	this._ctor();
}

LGraphNode.prototype._ctor = function( title )
{
	this.title = title || "Unnamed";
	this.size = [LiteGraph.NODE_WIDTH,60];
	this.graph = null;

	this._pos = new Float32Array(10,10);

	Object.defineProperty( this, "pos", {
		set: function(v)
		{
			if(!v || !v.length < 2)
				return;
			this._pos[0] = v[0];
			this._pos[1] = v[1];
		},
		get: function()
		{
			return this._pos;
		},
		enumerable: true
	});

	this.id = -1; //not know till not added
	this.type = null;

	//inputs available: array of inputs
	this.inputs = [];
	this.outputs = [];
	this.connections = [];

	//local data
	this.properties = {}; //for the values
	this.propertiesInfo = []; //for the info

	this.data = null; //persistent local data
	this.flags = {
		//skipTitleRender: true,
		//unsafeExecution: false,
	};
}

/**
* configure a node from an object containing the serialized info
* @method configure
*/
LGraphNode.prototype.configure = function(info)
{
	for (var j in info)
	{
		if(j == "console")
			continue;

		if(j == "properties")
		{
			//i dont want to clone properties, I want to reuse the old container
			for(var k in info.properties)
			{
				this.properties[k] = info.properties[k];
				if(this.onPropertyChanged)
					this.onPropertyChanged(k,info.properties[k]);
			}
			continue;
		}

		if(info[j] == null)
			continue;
		else if (typeof(info[j]) == 'object') //object
		{
			if(this[j] && this[j].configure)
				this[j].configure( info[j] );
			else
				this[j] = LiteGraph.cloneObject(info[j], this[j]);
		}
		else //value
			this[j] = info[j];
	}

	if(this.onConnectionsChange)
		this.onConnectionsChange();

	//FOR LEGACY, PLEASE REMOVE ON NEXT VERSION
	for(var i in this.inputs)
	{
		var input = this.inputs[i];
		if(!input.link || !input.link.length )
			continue;
		var link = input.link;
		if(typeof(link) != "object")
			continue;
		input.link = link[0];
		this.graph.links[ link[0] ] = { id: link[0], originId: link[1], originSlot: link[2], targetId: link[3], targetSlot: link[4] };
	}
	for(var i in this.outputs)
	{
		var output = this.outputs[i];
		if(!output.links || output.links.length == 0)
			continue;
		for(var j in output.links)
		{
			var link = output.links[j];
			if(typeof(link) != "object")
				continue;
			output.links[j] = link[0];
		}
	}

}

/**
* serialize the content
* @method serialize
*/

LGraphNode.prototype.serialize = function()
{
	var o = {
		id: this.id,
		title: this.title,
		type: this.type,
		pos: this.pos,
		size: this.size,
		data: this.data,
		flags: LiteGraph.cloneObject(this.flags),
		inputs: this.inputs,
		outputs: this.outputs,
		mode: this.mode
	};

	if(this.properties)
		o.properties = LiteGraph.cloneObject(this.properties);

	if(!o.type)
		o.type = this.constructor.type;

	if(this.color)
		o.color = this.color;
	if(this.bgcolor)
		o.bgcolor = this.bgcolor;
	if(this.boxcolor)
		o.boxcolor = this.boxcolor;
	if(this.shape)
		o.shape = this.shape;

	if(this.onSerialize)
		this.onSerialize(o);

	return o;
}


/* Creates a clone of this node */
LGraphNode.prototype.clone = function()
{
	var node = LiteGraph.createNode(this.type);

	//we clone it because serialize returns shared containers
	var data = LiteGraph.cloneObject( this.serialize() );

	//remove links
	if(data.inputs)
		for(var i in data.inputs)
			data.inputs[i].link = null;
	if(data.outputs)
		for(var i in data.outputs)
			data.outputs[i].links.length = 0;
	delete data["id"];
	//remove links
	node.configure(data);

	return node;
}


/**
* serialize and stringify
* @method toString
*/

LGraphNode.prototype.toString = function()
{
	return JSON.stringify( this.serialize() );
}
//LGraphNode.prototype.unserialize = function(info) {} //this cannot be done from within, must be done in LiteGraph


/**
* get the title string
* @method getTitle
*/

LGraphNode.prototype.getTitle = function()
{
	return this.title || this.constructor.title;
}



// Execution *************************
/**
* sets the output data
* @method setOutputData
* @param {number} slot
* @param {*} data
*/
LGraphNode.prototype.setOutputData = function(slot,data)
{
	if(!this.outputs) 
		return;

	if(slot > -1 && slot < this.outputs.length && this.outputs[slot] && this.outputs[slot].links != null)
	{
		for(var i = 0; i < this.outputs[slot].links.length; i++)
		{
			var linkId = this.outputs[slot].links[i];
			this.graph.links[ linkId ].data = data;
		}
	}
}

/**
* retrieves the input data (data traveling through the connection) from one slot
* @method getInputData
* @param {number} slot
* @return {*} data or if it is not connected returns undefined
*/
LGraphNode.prototype.getInputData = function( slot, forceUpdate )
{
	if(!this.inputs) 
		return; //undefined;

	if(slot >= this.inputs.length || this.inputs[slot].link == null)
		return;

	var linkId = this.inputs[slot].link;
	var link = this.graph.links[ linkId ];

	if(!forceUpdate)
		return link.data;

	var node = this.graph.getNodeById( link.originId );
	if(!node)
		return link.data;

	if(node.updateOutputData)
		node.updateOutputData( link.originSlot );
	else if(node.onExecute)
		node.onExecute();

	return link.data;
}

/**
* tells you if there is a connection in one input slot
* @method isInputConnected
* @param {number} slot
* @return {boolean} 
*/
LGraphNode.prototype.isInputConnected = function(slot)
{
	if(!this.inputs) 
		return false;
	return (slot < this.inputs.length && this.inputs[slot].link != null);
}

/**
* tells you info about an input connection (which node, type, etc)
* @method getInputInfo
* @param {number} slot
* @return {Object} object or null
*/
LGraphNode.prototype.getInputInfo = function(slot)
{
	if(!this.inputs)
		return null;
	if(slot < this.inputs.length)
		return this.inputs[slot];
	return null;
}


/**
* tells you info about an output connection (which node, type, etc)
* @method getOutputInfo
* @param {number} slot
* @return {Object}  object or null
*/
LGraphNode.prototype.getOutputInfo = function(slot)
{
	if(!this.outputs)
		return null;
	if(slot < this.outputs.length)
		return this.outputs[slot];
	return null;
}


/**
* tells you if there is a connection in one output slot
* @method isOutputConnected
* @param {number} slot
* @return {boolean} 
*/
LGraphNode.prototype.isOutputConnected = function(slot)
{
	if(!this.outputs)
		return null;
	return (slot < this.outputs.length && this.outputs[slot].links && this.outputs[slot].links.length);
}

/**
* retrieves all the nodes connected to this output slot
* @method getOutputNodes
* @param {number} slot
* @return {array} 
*/
LGraphNode.prototype.getOutputNodes = function(slot)
{
	if(!this.outputs || this.outputs.length == 0) return null;
	if(slot < this.outputs.length)
	{
		var output = this.outputs[slot];
		var r = [];
		for(var i = 0; i < output.length; i++)
			r.push( this.graph.getNodeById( output.links[i].targetId ));
		return r;
	}
	return null;
}

/**
* Triggers an event in this node, this will trigger any output with the same name
* @method trigger
* @param {String} event name ( "onPlay", ... )
* @param {*} param
*/
LGraphNode.prototype.trigger = function( action, param )
{
	if( !this.outputs || !this.outputs.length )
		return;

	if(this.graph)
		this.graph._lastTriggerTime = LiteGraph.getTime();

	for(var i = 0; i < this.outputs.length; ++i)
	{
		var output = this.outputs[i];
		if(output.type !== LiteGraph.EVENT || output.name != action)
			continue;

		var links = output.links;
		if(links)
			for(var k = 0; k < links.length; ++k)
			{
				var linkInfo = this.graph.links[ links[k] ];
				if(!linkInfo)
					continue;
				var node = this.graph.getNodeById( linkInfo.targetId );
				if(!node)
					continue;

				//used to mark events in graph
				linkInfo._lastTime = LiteGraph.getTime();

				var targetConnection = node.inputs[ linkInfo.targetSlot ];

				if(node.onAction)
					node.onAction( targetConnection.name, param );
				else if(node.mode === LiteGraph.ON_TRIGGER)
				{
					if(node.onExecute)
						node.onExecute(param);
				}
			}
	}
}

/**
* add a new property to this node
* @method addProperty
* @param {string} name
* @param {*} defaultValue
* @param {string} type string defining the output type ("vec3","number",...)
* @param {Object} extraInfo this can be used to have special properties of the property (like values, etc)
*/
LGraphNode.prototype.addProperty = function( name, defaultValue, type, extraInfo )
{
	var o = { name: name, type: type, defaultValue: defaultValue };
	if(extraInfo)
		for(var i in extraInfo)
			o[i] = extraInfo[i];
	if(!this.propertiesInfo)
		this.propertiesInfo = [];
	this.propertiesInfo.push(o);
	if(!this.properties)
		this.properties = {};
	this.properties[ name ] = defaultValue;
	return o;
}


//connections

/**
* add a new output slot to use in this node
* @method addOutput
* @param {string} name
* @param {string} type string defining the output type ("vec3","number",...)
* @param {Object} extraInfo this can be used to have special properties of an output (label, special color, position, etc)
*/
LGraphNode.prototype.addOutput = function(name,type,extraInfo)
{
	var o = { name: name, type: type, links: null };
	if(extraInfo)
		for(var i in extraInfo)
			o[i] = extraInfo[i];

	if(!this.outputs)
		this.outputs = [];
	this.outputs.push(o);
	if(this.onOutputAdded)
		this.onOutputAdded(o);
	this.size = this.computeSize();
	return o;
}

/**
* add a new output slot to use in this node
* @method addOutputs
* @param {Array} array of triplets like [[name,type,extraInfo],[...]]
*/
LGraphNode.prototype.addOutputs = function(array)
{
	for(var i = 0; i < array.length; ++i)
	{
		var info = array[i];
		var o = {name:info[0],type:info[1],link:null};
		if(array[2])
			for(var j in info[2])
				o[j] = info[2][j];

		if(!this.outputs)
			this.outputs = [];
		this.outputs.push(o);
		if(this.onOutputAdded)
			this.onOutputAdded(o);
	}

	this.size = this.computeSize();
}

/**
* remove an existing output slot
* @method removeOutput
* @param {number} slot
*/
LGraphNode.prototype.removeOutput = function(slot)
{
	this.disconnectOutput(slot);
	this.outputs.splice(slot,1);
	this.size = this.computeSize();
	if(this.onOutputRemoved)
		this.onOutputRemoved(slot);
}

/**
* add a new input slot to use in this node
* @method addInput
* @param {string} name
* @param {string} type string defining the input type ("vec3","number",...), it its a generic one use 0
* @param {Object} extraInfo this can be used to have special properties of an input (label, color, position, etc)
*/
LGraphNode.prototype.addInput = function(name,type,extraInfo)
{
	type = type || 0;
	var o = {name:name,type:type,link:null};
	if(extraInfo)
		for(var i in extraInfo)
			o[i] = extraInfo[i];

	if(!this.inputs)
		this.inputs = [];
	this.inputs.push(o);
	this.size = this.computeSize();
	if(this.onInputAdded)
		this.onInputAdded(o);
	return o;
}

/**
* add several new input slots in this node
* @method addInputs
* @param {Array} array of triplets like [[name,type,extraInfo],[...]]
*/
LGraphNode.prototype.addInputs = function(array)
{
	for(var i = 0; i < array.length; ++i)
	{
		var info = array[i];
		var o = {name:info[0], type:info[1], link:null};
		if(array[2])
			for(var j in info[2])
				o[j] = info[2][j];

		if(!this.inputs)
			this.inputs = [];
		this.inputs.push(o);
		if(this.onInputAdded)
			this.onInputAdded(o);
	}

	this.size = this.computeSize();
}

/**
* remove an existing input slot
* @method removeInput
* @param {number} slot
*/
LGraphNode.prototype.removeInput = function(slot)
{
	this.disconnectInput(slot);
	this.inputs.splice(slot,1);
	this.size = this.computeSize();
	if(this.onInputRemoved)
		this.onInputRemoved(slot);
}

/**
* add an special connection to this node (used for special kinds of graphs)
* @method addConnection
* @param {string} name
* @param {string} type string defining the input type ("vec3","number",...)
* @param {[x,y]} pos position of the connection inside the node
* @param {string} direction if is input or output
*/
LGraphNode.prototype.addConnection = function(name,type,pos,direction)
{
	var o = { 
		name: name,
		type: type,
		pos: pos,
		direction: direction,
		links: null
	};
	this.connections.push( o );
	return o;
}

/**
* computes the size of a node according to its inputs and output slots
* @method computeSize
* @param {number} minHeight
* @return {number} the total size
*/
LGraphNode.prototype.computeSize = function( minHeight, out )
{
	var rows = Math.max( this.inputs ? this.inputs.length : 1, this.outputs ? this.outputs.length : 1);
	var size = out || new Float32Array([0,0]);
	rows = Math.max(rows, 1);
	size[1] = rows * 14 + 6;

	var fontSize = 14;
	var titleWidth = computeTextSize( this.title );
	var inputWidth = 0;
	var outputWidth = 0;

	if(this.inputs)
		for(var i = 0, l = this.inputs.length; i < l; ++i)
		{
			var input = this.inputs[i];
			var text = input.label || input.name || "";
			var textWidth = computeTextSize( text );
			if(inputWidth < textWidth)
				inputWidth = textWidth;
		}

	if(this.outputs)
		for(var i = 0, l = this.outputs.length; i < l; ++i)
		{
			var output = this.outputs[i];
			var text = output.label || output.name || "";
			var textWidth = computeTextSize( text );
			if(outputWidth < textWidth)
				outputWidth = textWidth;
		}

	size[0] = Math.max( inputWidth + outputWidth + 10, titleWidth );
	size[0] = Math.max( size[0], LiteGraph.NODE_WIDTH );

	function computeTextSize( text )
	{
		if(!text)
			return 0;
		return fontSize * text.length * 0.6;
	}

	return size;
}

/**
* returns the bounding of the object, used for rendering purposes
* @method getBounding
* @return {Float32Array[4]} the total size
*/
LGraphNode.prototype.getBounding = function()
{
	return new Float32Array([this.pos[0] - 4, this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT, this.pos[0] + this.size[0] + 4, this.pos[1] + this.size[1] + LGraph.NODE_TITLE_HEIGHT]);
}

/**
* checks if a point is inside the shape of a node
* @method isPointInsideNode
* @param {number} x
* @param {number} y
* @return {boolean} 
*/
LGraphNode.prototype.isPointInsideNode = function(x,y, margin)
{
	margin = margin || 0;

	var marginTop = this.graph && this.graph.isLive() ? 0 : 20;
	if(this.flags.collapsed)
	{
		//if ( distance([x,y], [this.pos[0] + this.size[0]*0.5, this.pos[1] + this.size[1]*0.5]) < LiteGraph.NODE_COLLAPSED_RADIUS)
		if( isInsideRectangle( x, y, this.pos[0] - margin, this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT - margin, LiteGraph.NODE_COLLAPSED_WIDTH + 2 * margin, LiteGraph.NODE_TITLE_HEIGHT + 2 * margin ) )
			return true;
	}
	else if ( (this.pos[0] - 4 - margin) < x && (this.pos[0] + this.size[0] + 4 + margin) > x
		&& (this.pos[1] - marginTop - margin) < y && (this.pos[1] + this.size[1] + margin) > y)
		return true;
	return false;
}

/**
* checks if a point is inside a node slot, and returns info about which slot
* @method getSlotInPosition
* @param {number} x
* @param {number} y
* @return {Object} if found the object contains { input|output: slot object, slot: number, linkPos: [x,y] }
*/
LGraphNode.prototype.getSlotInPosition = function( x, y )
{
	//search for inputs
	if(this.inputs)
		for(var i = 0, l = this.inputs.length; i < l; ++i)
		{
			var input = this.inputs[i];
			var linkPos = this.getConnectionPos( true,i );
			if( isInsideRectangle(x, y, linkPos[0] - 10, linkPos[1] - 5, 20,10) )
				return { input: input, slot: i, linkPos: linkPos, locked: input.locked };
		}

	if(this.outputs)
		for(var i = 0, l = this.outputs.length; i < l; ++i)
		{
			var output = this.outputs[i];
			var linkPos = this.getConnectionPos(false,i);
			if( isInsideRectangle(x, y, linkPos[0] - 10, linkPos[1] - 5, 20,10) )
				return { output: output, slot: i, linkPos: linkPos, locked: output.locked };
		}

	return null;
}

/**
* returns the input slot with a given name (used for dynamic slots), -1 if not found
* @method findInputSlot
* @param {string} name the name of the slot 
* @return {number} the slot (-1 if not found)
*/
LGraphNode.prototype.findInputSlot = function(name)
{
	if(!this.inputs) return -1;
	for(var i = 0, l = this.inputs.length; i < l; ++i)
		if(name == this.inputs[i].name)
			return i;
	return -1;
}

/**
* returns the output slot with a given name (used for dynamic slots), -1 if not found
* @method findOutputSlot
* @param {string} name the name of the slot 
* @return {number} the slot (-1 if not found)
*/
LGraphNode.prototype.findOutputSlot = function(name)
{
	if(!this.outputs) return -1;
	for(var i = 0, l = this.outputs.length; i < l; ++i)
		if(name == this.outputs[i].name)
			return i;
	return -1;
}

/**
* connect this node output to the input of another node
* @method connect
* @param {numberOrString} slot (could be the number of the slot or the string with the name of the slot)
* @param {LGraphNode} node the target node 
* @param {numberOrString} targetSlot the input slot of the target node (could be the number of the slot or the string with the name of the slot, or -1 to connect a trigger)
* @return {boolean} if it was connected succesfully
*/
LGraphNode.prototype.connect = function( slot, node, targetSlot )
{
	targetSlot = targetSlot || 0;

	//seek for the output slot
	if( slot.constructor === String )
	{
		slot = this.findOutputSlot(slot);
		if(slot == -1)
		{
			if(LiteGraph.debug)
				console.log("Connect: Error, no slot of name " + slot);
			return false;
		}
	}
	else if(!this.outputs || slot >= this.outputs.length) 
	{
		if(LiteGraph.debug)
			console.log("Connect: Error, slot number not found");
		return false;
	}

	if(node && node.constructor === Number)
		node = this.graph.getNodeById( node );
	if(!node)
		throw("Node not found");

	//avoid loopback
	if(node == this)
		return false; 
	//if( node.constructor != LGraphNode ) throw ("LGraphNode.connect: node is not of type LGraphNode");

	//you can specify the slot by name
	if(targetSlot.constructor === String)
	{
		targetSlot = node.findInputSlot(targetSlot);
		if(targetSlot == -1)
		{
			if(LiteGraph.debug)
				console.log("Connect: Error, no slot of name " + targetSlot);
			return false;
		}
	}
	else if( targetSlot === LiteGraph.EVENT )
	{
		//search for first slot with event?
		/*
		//create input for trigger
		var input = node.addInput("onTrigger", LiteGraph.EVENT );
		targetSlot = node.inputs.length - 1; //last one is the one created
		node.mode = LiteGraph.ON_TRIGGER;
		*/
		return false;
	}
	else if( !node.inputs || targetSlot >= node.inputs.length ) 
	{
		if(LiteGraph.debug)
			console.log("Connect: Error, slot number not found");
		return false;
	}

	//if there is something already plugged there, disconnect
	if(node.inputs[ targetSlot ].link != null )
		node.disconnectInput( targetSlot );

	//why here??
	this.setDirtyCanvas(false,true);
	this.graph.connectionChange( this );
		
	var output = this.outputs[slot];

	//allows nodes to block connection 
	if(node.onConnectInput)
		if( node.onConnectInput( targetSlot, output.type, output ) === false)
			return false;

	var input = node.inputs[targetSlot];

	if( LiteGraph.isValidConnection( output.type, input.type) )
	{
		var link = { 
			id: this.graph.lastLinkId++, 
			originId: this.id, 
			originSlot: slot, 
			targetId: node.id, 
			targetSlot: targetSlot
		};

		//add to graph links list
		this.graph.links[ link.id ] = link;

		//connect in output
		if( output.links == null )
			output.links = [];
		output.links.push( link.id );
		//connect in input
		node.inputs[targetSlot].link = link.id;

		if(this.onConnectionsChange)
			this.onConnectionsChange( LiteGraph.OUTPUT, slot );
		if(node.onConnectionsChange)
			node.onConnectionsChange( LiteGraph.OUTPUT, targetSlot );
	}

	this.setDirtyCanvas(false,true);
	this.graph.connectionChange( this );

	return true;
}

/**
* disconnect one output to an specific node
* @method disconnectOutput
* @param {numberOrString} slot (could be the number of the slot or the string with the name of the slot)
* @param {LGraphNode} targetNode the target node to which this slot is connected [Optional, if not targetNode is specified all nodes will be disconnected]
* @return {boolean} if it was disconnected succesfully
*/
LGraphNode.prototype.disconnectOutput = function(slot, targetNode)
{
	if( slot.constructor === String )
	{
		slot = this.findOutputSlot(slot);
		if(slot == -1)
		{
			if(LiteGraph.debug)
				console.log("Connect: Error, no slot of name " + slot);
			return false;
		}
	}
	else if(!this.outputs || slot >= this.outputs.length) 
	{
		if(LiteGraph.debug)
			console.log("Connect: Error, slot number not found");
		return false;
	}

	//get output slot
	var output = this.outputs[slot];
	if(!output.links || output.links.length == 0)
		return false;

	//one of the links
	if(targetNode)
	{
		if(targetNode.constructor === Number)
			targetNode = this.graph.getNodeById( targetNode );
		if(!targetNode)
			throw("Target Node not found");

		for(var i = 0, l = output.links.length; i < l; i++)
		{
			var linkId = output.links[i];
			var linkInfo = this.graph.links[ linkId ];

			//is the link we are searching for...
			if( linkInfo.targetId == targetNode.id )
			{
				output.links.splice(i,1); //remove here
				targetNode.inputs[ linkInfo.targetSlot ].link = null; //remove there
				delete this.graph.links[ linkId ]; //remove the link from the links pool
				break;
			}
		}
	}
	else //all the links
	{
		for(var i = 0, l = output.links.length; i < l; i++)
		{
			var linkId = output.links[i];
			var linkInfo = this.graph.links[ linkId ];

			var targetNode = this.graph.getNodeById( linkInfo.targetId );
			if(targetNode)
				targetNode.inputs[ linkInfo.targetSlot ].link = null; //remove other side link
			delete this.graph.links[ linkId ]; //remove the link from the links pool
		}
		output.links = null;
	}

	this.setDirtyCanvas(false,true);
	this.graph.connectionChange( this );
	return true;
}

/**
* disconnect one input
* @method disconnectInput
* @param {numberOrString} slot (could be the number of the slot or the string with the name of the slot)
* @return {boolean} if it was disconnected succesfully
*/
LGraphNode.prototype.disconnectInput = function(slot)
{
	//seek for the output slot
	if( slot.constructor === String )
	{
		slot = this.findInputSlot(slot);
		if(slot == -1)
		{
			if(LiteGraph.debug)
				console.log("Connect: Error, no slot of name " + slot);
			return false;
		}
	}
	else if(!this.inputs || slot >= this.inputs.length) 
	{
		if(LiteGraph.debug)
			console.log("Connect: Error, slot number not found");
		return false;
	}

	var input = this.inputs[slot];
	if(!input)
		return false;

	var linkId = this.inputs[slot].link;
	this.inputs[slot].link = null;

	//remove other side
	var linkInfo = this.graph.links[ linkId ];
	if( linkInfo )
	{
		var node = this.graph.getNodeById( linkInfo.originId );
		if(!node)
			return false;

		var output = node.outputs[ linkInfo.originSlot ];
		if(!output || !output.links || output.links.length == 0) 
			return false;

		//check outputs
		for(var i = 0, l = output.links.length; i < l; i++)
		{
			var linkId = output.links[i];
			var linkInfo = this.graph.links[ linkId ];
			if( linkInfo.targetId == this.id )
			{
				output.links.splice(i,1);
				break;
			}
		}

		if(this.onConnectionsChange)
			this.onConnectionsChange( LiteGraph.OUTPUT );
		if(node.onConnectionsChange)
			node.onConnectionsChange( LiteGraph.INPUT);
	}

	this.setDirtyCanvas(false,true);
	this.graph.connectionChange( this );
	return true;
}

/**
* returns the center of a connection point in canvas coords
* @method getConnectionPos
* @param {boolean} isInput true if if a input slot, false if it is an output
* @param {numberOrString} slot (could be the number of the slot or the string with the name of the slot)
* @return {[x,y]} the position
**/
LGraphNode.prototype.getConnectionPos = function(isInput, slotNumber)
{
	if(this.flags.collapsed)
	{
		if(isInput)
			return [this.pos[0], this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT * 0.5];
		else
			return [this.pos[0] + LiteGraph.NODE_COLLAPSED_WIDTH, this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT * 0.5];
		//return [this.pos[0] + this.size[0] * 0.5, this.pos[1] + this.size[1] * 0.5];
	}

	if(isInput && slotNumber == -1)
	{
		return [this.pos[0] + 10, this.pos[1] + 10];
	}

	if(isInput && this.inputs.length > slotNumber && this.inputs[slotNumber].pos)
		return [this.pos[0] + this.inputs[slotNumber].pos[0],this.pos[1] + this.inputs[slotNumber].pos[1]];
	else if(!isInput && this.outputs.length > slotNumber && this.outputs[slotNumber].pos)
		return [this.pos[0] + this.outputs[slotNumber].pos[0],this.pos[1] + this.outputs[slotNumber].pos[1]];

	if(!isInput) //output
		return [this.pos[0] + this.size[0] + 1, this.pos[1] + 10 + slotNumber * LiteGraph.NODE_SLOT_HEIGHT];
	return [this.pos[0] , this.pos[1] + 10 + slotNumber * LiteGraph.NODE_SLOT_HEIGHT];
}

/* Force align to grid */
LGraphNode.prototype.alignToGrid = function()
{
	this.pos[0] = LiteGraph.CANVAS_GRID_SIZE * Math.round(this.pos[0] / LiteGraph.CANVAS_GRID_SIZE);
	this.pos[1] = LiteGraph.CANVAS_GRID_SIZE * Math.round(this.pos[1] / LiteGraph.CANVAS_GRID_SIZE);
}


/* Console output */
LGraphNode.prototype.trace = function(msg)
{
	if(!this.console)
		this.console = [];
	this.console.push(msg);
	if(this.console.length > LGraphNode.MAX_CONSOLE)
		this.console.shift();

	this.graph.onNodeTrace(this,msg);
}

/* Forces to redraw or the main canvas (LGraphNode) or the bg canvas (links) */
LGraphNode.prototype.setDirtyCanvas = function(dirtyForeground, dirtyBackground)
{
	if(!this.graph)
		return;
	this.graph.sendActionToCanvas("setDirty",[dirtyForeground, dirtyBackground]);
}

LGraphNode.prototype.loadImage = function(url)
{
	var img = new Image();
	img.src = LiteGraph.nodeImagesPath + url;	
	img.ready = false;

	var that = this;
	img.onload = function() { 
		this.ready = true;
		that.setDirtyCanvas(true);
	}
	return img;
}

//safe LGraphNode action execution (not sure if safe)
/*
LGraphNode.prototype.executeAction = function(action)
{
	if(action == "") return false;

	if( action.indexOf(";") != -1 || action.indexOf("}") != -1)
	{
		this.trace("Error: Action contains unsafe characters");
		return false;
	}

	var tokens = action.split("(");
	var funcName = tokens[0];
	if( typeof(this[funcName]) != "function")
	{
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
	catch (err)
	{
		this.trace("Error executing action {" + action + "} :" + err);
		return false;
	}

	return true;
}
*/

/* Allows to get onMouseMove and onMouseUp events even if the mouse is out of focus */
LGraphNode.prototype.captureInput = function(v)
{
	if(!this.graph || !this.graph.listOfGraphcanvas)
		return;

	var list = this.graph.listOfGraphcanvas;

	for(var i = 0; i < list.length; ++i)
	{
		var c = list[i];
		//releasing somebody elses capture?!
		if(!v && c.nodeCapturingInput != this)
			continue;

		//change
		c.nodeCapturingInput = v ? this : null;
	}
}

/**
* Collapse the node to make it smaller on the canvas
* @method collapse
**/
LGraphNode.prototype.collapse = function()
{
	if(!this.flags.collapsed)
		this.flags.collapsed = true;
	else
		this.flags.collapsed = false;
	this.setDirtyCanvas(true,true);
}

/**
* Forces the node to do not move or realign on Z
* @method pin
**/

LGraphNode.prototype.pin = function(v)
{
	if(v === undefined)
		this.flags.pinned = !this.flags.pinned;
	else
		this.flags.pinned = v;
}

LGraphNode.prototype.localToScreen = function(x,y, graphcanvas)
{
	return [(x + this.pos[0]) * graphcanvas.scale + graphcanvas.offset[0],
		(y + this.pos[1]) * graphcanvas.scale + graphcanvas.offset[1]];
}



//*********************************************************************************
// LGraphCanvas: LGraph renderer CLASS                                  
//*********************************************************************************

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
function LGraphCanvas( canvas, graph, options )
{
	options = options || {};

	//if(graph === undefined)
	//	throw ("No graph assigned");

	if(canvas && canvas.constructor === String )
		canvas = document.querySelector( canvas );

	this.maxZoom = 10;
	this.minZoom = 0.1;

	this.titleTextFont = "bold 14px Arial";
	this.innerTextFont = "normal 12px Arial";
	this.defaultLinkColor = "#AAC";

	this.highqualityRender = true;
	this.editorAlpha = 1; //used for transition
	this.pauseRendering = false;
	this.renderShadows = true;
	this.clearBackground = true;

	this.renderOnlySelected = true;
	this.liveMode = false;
	this.showInfo = true;
	this.allowDragcanvas = true;
	this.allowDragnodes = true;

	this.alwaysRenderBackground = false; 
	this.renderConnectionsShadows = false; //too much cpu
	this.renderConnectionsBorder = true;
	this.renderCurvedConnections = true;
	this.renderConnectionArrows = true;

	this.connectionsWidth = 4;

	//link canvas and graph
	if(graph)
		graph.attachCanvas(this);

	this.setCanvas( canvas );
	this.clear();

	if(!options.skipRender)
		this.startRendering();

	this.autoresize = options.autoresize;
}

LGraphCanvas.linkTypeColors = {"-1":"#F85",'number':"#AAC","node":"#DCA"};


/**
* clears all the data inside
*
* @method clear
*/
LGraphCanvas.prototype.clear = function()
{
	this.frame = 0;
	this.lastDrawTime = 0;
	this.renderTime = 0;
	this.fps = 0;

	this.scale = 1;
	this.offset = [0,0];

	this.selectedNodes = {};
	this.nodeDragged = null;
	this.nodeOver = null;
	this.nodeCapturingInput = null;
	this.connectingNode = null;

	this.dirtyCanvas = true;
	this.dirtyBgcanvas = true;
	this.dirtyArea = null;

	this.nodeInPanel = null;

	this.lastMouse = [0,0];
	this.lastMouseclick = 0;

	if(this.onClear)
		this.onClear();
	//this.UIinit();
}

/**
* assigns a graph, you can reasign graphs to the same canvas
*
* @method setGraph
* @param {LGraph} graph
*/
LGraphCanvas.prototype.setGraph = function( graph, skipClear )
{
	if(this.graph == graph)
		return;

	if(!skipClear)
		this.clear();

	if(!graph && this.graph)
	{
		this.graph.detachCanvas(this);
		return;
	}

	/*
	if(this.graph)
		this.graph.canvas = null; //remove old graph link to the canvas
	this.graph = graph;
	if(this.graph)
		this.graph.canvas = this;
	*/
	graph.attachCanvas(this);
	this.setDirty(true,true);
}

/**
* opens a graph contained inside a node in the current graph
*
* @method openSubgraph
* @param {LGraph} graph
*/
LGraphCanvas.prototype.openSubgraph = function(graph)
{
	if(!graph) 
		throw("graph cannot be null");

	if(this.graph == graph)
		throw("graph cannot be the same");

	this.clear();

	if(this.graph)
	{
		if(!this._graphStack)
			this._graphStack = [];
		this._graphStack.push(this.graph);
	}

	graph.attachCanvas(this);
	this.setDirty(true,true);
}

/**
* closes a subgraph contained inside a node 
*
* @method closeSubgraph
* @param {LGraph} assigns a graph
*/
LGraphCanvas.prototype.closeSubgraph = function()
{
	if(!this._graphStack || this._graphStack.length == 0)
		return;
	var graph = this._graphStack.pop();
	graph.attachCanvas(this);
	this.setDirty(true,true);
}

/**
* assigns a canvas
*
* @method setCanvas
* @param {Canvas} assigns a canvas
*/
LGraphCanvas.prototype.setCanvas = function( canvas, skipEvents )
{
	var that = this;

	if(canvas)
	{
		if( canvas.constructor === String )
		{
			canvas = document.getElementById(canvas);
			if(!canvas)
				throw("Error creating LiteGraph canvas: Canvas not found");
		}		
	}

	if(canvas === this.canvas)
		return;

	if(!canvas && this.canvas)
	{
		//maybe detach events from oldCanvas
		if(!skipEvents)
			this.unbindEvents();
	}

	this.canvas = canvas;

	if(!canvas)
		return;

	//this.canvas.tabindex = "1000";
	canvas.className += " lgraphcanvas";
	canvas.data = this;

	//bg canvas: used for non changing stuff
	this.bgcanvas = null;
	if(!this.bgcanvas)
	{
		this.bgcanvas = document.createElement("canvas");
		this.bgcanvas.width = this.canvas.width;
		this.bgcanvas.height = this.canvas.height;
	}

	if(canvas.getContext == null)
	{
		throw("This browser doesnt support Canvas");
	}

	var ctx = this.ctx = canvas.getContext("2d");
	if(ctx == null)
	{
		console.warn("This canvas seems to be WebGL, enabling WebGL renderer");
		this.enableWebGL();
	}

	//input:  (move and up could be unbinded)
	this._mousemoveCallback = this.processMouseMove.bind(this);
	this._mouseupCallback = this.processMouseUp.bind(this);

	if(!skipEvents)
		this.bindEvents();
}

//used in some events to capture them
LGraphCanvas.prototype._doNothing = function doNothing(e) { e.preventDefault(); return false; };
LGraphCanvas.prototype._doReturnTrue = function doNothing(e) { e.preventDefault(); return true; };

LGraphCanvas.prototype.bindEvents = function()
{
	if(	this._eventsBinded )
	{
		console.warn("LGraphCanvas: events already binded");
		return;
	}

	var canvas = this.canvas;

	this._mousedownCallback = this.processMouseDown.bind(this);
	this._mousewheelCallback = this.processMouseWheel.bind(this);

	canvas.addEventListener("mousedown", this._mousedownCallback, true ); //down do not need to store the binded
	canvas.addEventListener("mousemove", this._mousemoveCallback );
	canvas.addEventListener("mousewheel", this._mousewheelCallback, false);

	canvas.addEventListener("contextmenu", this._doNothing );
	canvas.addEventListener("DOMMouseScroll", this._mousewheelCallback, false);

	//touch events
	//if( 'touchstart' in document.documentElement )
	{
		canvas.addEventListener("touchstart", this.touchHandler, true);
		canvas.addEventListener("touchmove", this.touchHandler, true);
		canvas.addEventListener("touchend", this.touchHandler, true);
		canvas.addEventListener("touchcancel", this.touchHandler, true);    
	}

	//Keyboard ******************
	this._keyCallback = this.processKey.bind(this);

	canvas.addEventListener("keydown", this._keyCallback );
	canvas.addEventListener("keyup", this._keyCallback );

	//Droping Stuff over nodes ************************************
	this._ondropCallback = this.processDrop.bind(this);

	canvas.addEventListener("dragover", this._doNothing, false );
	canvas.addEventListener("dragend", this._doNothing, false );
	canvas.addEventListener("drop", this._ondropCallback, false );
	canvas.addEventListener("dragenter", this._doReturnTrue, false );

	this._eventsBinded = true;
}

LGraphCanvas.prototype.unbindEvents = function()
{
	if(	!this._eventsBinded )
	{
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
}

LGraphCanvas.getFileExtension = function (url)
{
	var question = url.indexOf("?");
	if(question != -1)
		url = url.substr(0,question);
	var point = url.lastIndexOf(".");
	if(point == -1) 
		return "";
	return url.substr(point+1).toLowerCase();
} 

//this file allows to render the canvas using WebGL instead of Canvas2D
//this is useful if you plant to render 3D objects inside your nodes
LGraphCanvas.prototype.enableWebGL = function()
{
	if(typeof(GL) === undefined)
		throw("litegl.js must be included to use a WebGL canvas");
	if(typeof(enableWebGLCanvas) === undefined)
		throw("webglCanvas.js must be included to use this feature");

	this.gl = this.ctx = enableWebGLCanvas(this.canvas);
	this.ctx.webgl = true;
	this.bgcanvas = this.canvas;
	this.bgctx = this.gl;

	/*
	GL.create({ canvas: this.bgcanvas });
	this.bgctx = enableWebGLCanvas( this.bgcanvas );
	window.gl = this.gl;
	*/
}


/*
LGraphCanvas.prototype.UIinit = function()
{
	var that = this;
	$("#node-console input").change(function(e)
	{
		if(e.target.value == "")
			return;

		var node = that.nodeInPanel;
		if(!node)
			return;
			
		node.trace("] " + e.target.value, "#333");
		if(node.onConsoleCommand)
		{
			if(!node.onConsoleCommand(e.target.value))
				node.trace("command not found", "#A33");
		}
		else if (e.target.value == "info")
		{
			node.trace("Special methods:");
			for(var i in node)
			{
				if(typeof(node[i]) == "function" && LGraphNode.prototype[i] == null && i.substr(0,2) != "on" && i[0] != "_")
					node.trace(" + " + i);
			}
		}
		else
		{
			try
			{
				eval("var _foo = function() { return ("+e.target.value+"); }");
				var result = _foo.call(node);
				if(result)
					node.trace(result.toString());
				delete window._foo;
			}
			catch(err)
			{
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
LGraphCanvas.prototype.setDirty = function(fgcanvas,bgcanvas)
{
	if(fgcanvas)
		this.dirtyCanvas = true;
	if(bgcanvas)
		this.dirtyBgcanvas = true;
}

/**
* Used to attach the canvas in a popup
*
* @method getCanvasWindow
* @return {window} returns the window where the canvas is attached (the DOM root node)
*/
LGraphCanvas.prototype.getCanvasWindow = function()
{
	var doc = this.canvas.ownerDocument;
	return doc.defaultView || doc.parentWindow;
}

/**
* starts rendering the content of the canvas when needed
*
* @method startRendering
*/
LGraphCanvas.prototype.startRendering = function()
{
	if(this.isRendering) return; //already rendering

	this.isRendering = true;
	renderFrame.call(this);

	function renderFrame()
	{
		if(!this.pauseRendering)
			this.draw();

		var window = this.getCanvasWindow();
		if(this.isRendering)
			window.requestAnimationFrame( renderFrame.bind(this) );
	}
}

/**
* stops rendering the content of the canvas (to save resources)
*
* @method stopRendering
*/
LGraphCanvas.prototype.stopRendering = function()
{
	this.isRendering = false;
	/*
	if(this.renderingTimerId)
	{
		clearInterval(this.renderingTimerId);
		this.renderingTimerId = null;
	}
	*/
}

/* LiteGraphCanvas input */

LGraphCanvas.prototype.processMouseDown = function(e)
{
	if(!this.graph)
		return;

	this.adjustMouseEvent(e);
	
	var refWindow = this.getCanvasWindow();
	var document = refWindow.document;

	//move mouse move event to the window in case it drags outside of the canvas
	this.canvas.removeEventListener("mousemove", this._mousemoveCallback );
	refWindow.document.addEventListener("mousemove", this._mousemoveCallback, true ); //catch for the entire window
	refWindow.document.addEventListener("mouseup", this._mouseupCallback, true );

	var n = this.graph.getNodeOnPos( e.canvasX, e.canvasY, this.visibleNodes );
	var skipDragging = false;
    
    LiteGraph.closeAllContextualMenus( refWindow );

	if(e.which == 1) //left button mouse
	{
		if(!e.shiftKey) //REFACTOR: integrate with function
		{
            //no node or another node selected
            if (!n || !this.selectedNodes[n.id]) {

                var todeselect = [];
                for (var i in this.selectedNodes)
                    if (this.selectedNodes[i] != n)
                        todeselect.push(this.selectedNodes[i]);
                //two passes to avoid problems modifying the container
                for (var i in todeselect)
                    this.processNodeDeselected(todeselect[i]);
            }
		}
		var clickingCanvasBg = false;

		//when clicked on top of a node
		//and it is not interactive
		if(n) 
		{
			if(!this.liveMode && !n.flags.pinned)
				this.bringToFront(n); //if it wasnt selected?
			var skipAction = false;

			//not dragging mouse to connect two slots
			if(!this.connectingNode && !n.flags.collapsed && !this.liveMode)
			{
				//search for outputs
				if(n.outputs)
					for(var i = 0, l = n.outputs.length; i < l; ++i)
					{
						var output = n.outputs[i];
						var linkPos = n.getConnectionPos(false,i);
						if( isInsideRectangle(e.canvasX, e.canvasY, linkPos[0] - 10, linkPos[1] - 5, 20,10) )
						{
							this.connectingNode = n;
							this.connectingOutput = output;
							this.connectingPos = n.getConnectionPos(false,i);
							this.connectingSlot = i;

							skipAction = true;
							break;
						}
					}

				//search for inputs
				if(n.inputs)
					for(var i = 0, l = n.inputs.length; i < l; ++i)
					{
						var input = n.inputs[i];
						var linkPos = n.getConnectionPos(true,i);
						if( isInsideRectangle(e.canvasX, e.canvasY, linkPos[0] - 10, linkPos[1] - 5, 20,10) )
						{
							if(input.link !== null)
							{
								n.disconnectInput(i);
								this.dirtyBgcanvas = true;
								skipAction = true;
							}
						}
					}

				//Search for corner
				if( !skipAction && isInsideRectangle(e.canvasX, e.canvasY, n.pos[0] + n.size[0] - 5, n.pos[1] + n.size[1] - 5 ,5,5 ))
				{
					this.resizingNode = n;
					this.canvas.style.cursor = "se-resize";
					skipAction = true;
				}
			}

			//Search for corner
			if( !skipAction && isInsideRectangle(e.canvasX, e.canvasY, n.pos[0], n.pos[1] - LiteGraph.NODE_TITLE_HEIGHT ,LiteGraph.NODE_TITLE_HEIGHT, LiteGraph.NODE_TITLE_HEIGHT ))
			{
				n.collapse();
				skipAction = true;
			}

			//it wasnt clicked on the links boxes
			if(!skipAction) 
			{
				var blockDragNode = false;

				//double clicking
				var now = LiteGraph.getTime();
				if ((now - this.lastMouseclick) < 300 && this.selectedNodes[n.id])
				{
					//double click node
					if( n.onDblClick)
						n.onDblClick(e);
					this.processNodeDblClicked(n);
					blockDragNode = true;
				}

				//if do not capture mouse

				if( n.onMouseDown && n.onMouseDown(e, [e.canvasX - n.pos[0], e.canvasY - n.pos[1]] ) )
					blockDragNode = true;
				else if(this.liveMode)
				{
					clickingCanvasBg = true;
					blockDragNode = true;
				}
				
				if(!blockDragNode)
				{
					if(this.allowDragnodes)
						this.nodeDragged = n;

					if(!this.selectedNodes[n.id])
						this.processNodeSelected(n,e);
				}

				this.dirtyCanvas = true;
			}
		}
		else
			clickingCanvasBg = true;

		if(clickingCanvasBg && this.allowDragcanvas)
		{
			this.draggingCanvas = true;
		}
	}
	else if (e.which == 2) //middle button
	{

	}
	else if (e.which == 3) //right button
	{
		this.processContextualMenu(n,e);
	}

	//TODO
	//if(this.nodeSelected != prevSelected)
	//	this.onNodeSelectionChange(this.nodeSelected);

	this.lastMouse[0] = e.localX;
	this.lastMouse[1] = e.localY;
	this.lastMouseclick = LiteGraph.getTime();
	this.canvasMouse = [e.canvasX, e.canvasY];

	/*
	if( (this.dirtyCanvas || this.dirtyBgcanvas) && this.renderingTimerId == null) 
		this.draw();
	*/

	this.graph.change();

	//this is to ensure to defocus(blur) if a text input element is on focus
	if(!refWindow.document.activeElement || (refWindow.document.activeElement.nodeName.toLowerCase() != "input" && refWindow.document.activeElement.nodeName.toLowerCase() != "textarea"))
		e.preventDefault();
	e.stopPropagation();

	if(this.onMouseDown)
		this.onMouseDown(e);

	return false;
}

LGraphCanvas.prototype.processMouseMove = function(e)
{
	if(this.autoresize)
		this.resize();

	if(!this.graph)
		return;

	this.adjustMouseEvent(e);
	var mouse = [e.localX, e.localY];
	var delta = [mouse[0] - this.lastMouse[0], mouse[1] - this.lastMouse[1]];
	this.lastMouse = mouse;
	this.canvasMouse = [e.canvasX, e.canvasY];

	if(this.draggingCanvas)
	{
		this.offset[0] += delta[0] / this.scale;
		this.offset[1] += delta[1] / this.scale;
		this.dirtyCanvas = true;
		this.dirtyBgcanvas = true;
	}
	else
	{
		if(this.connectingNode)
			this.dirtyCanvas = true;

		//get node over
		var n = this.graph.getNodeOnPos(e.canvasX, e.canvasY, this.visibleNodes);

		//remove mouseover flag
		for(var i = 0, l = this.graph._nodes.length; i < l; ++i)
		{
			if(this.graph._nodes[i].mouseOver && n != this.graph._nodes[i])
			{
				//mouse leave
				this.graph._nodes[i].mouseOver = false;
				if(this.nodeOver && this.nodeOver.onMouseLeave)
					this.nodeOver.onMouseLeave(e);
				this.nodeOver = null;
				this.dirtyCanvas = true;
			}
		}

		//mouse over a node
		if(n)
		{
			//this.canvas.style.cursor = "move";
			if(!n.mouseOver)
			{
				//mouse enter
				n.mouseOver = true;
				this.nodeOver = n;
				this.dirtyCanvas = true;

				if(n.onMouseEnter) n.onMouseEnter(e);
			}

			if(n.onMouseMove) n.onMouseMove(e);

			//on top of input
			if(this.connectingNode)
			{
				var pos = this._highlightInput || [0,0]; //to store the output of isOverNodeInput
				
				if( this.isOverNodeBox( n, e.canvasX, e.canvasY ) )
				{
					//mouse on top of the corner box, dont know what to do
				}
				else
				{
					var slot = this.isOverNodeInput( n, e.canvasX, e.canvasY, pos );
					if(slot != -1 && n.inputs[slot])
					{	
						var slotType = n.inputs[slot].type;
						if( LiteGraph.isValidConnection( this.connectingOutput.type, slotType ) )
							this._highlightInput = pos;
					}
					else
						this._highlightInput = null;
				}
			}

			//Search for corner
			if( isInsideRectangle(e.canvasX, e.canvasY, n.pos[0] + n.size[0] - 5, n.pos[1] + n.size[1] - 5 ,5,5 ))
				this.canvas.style.cursor = "se-resize";
			else
				this.canvas.style.cursor = null;
		}
		else
			this.canvas.style.cursor = null;

		if(this.nodeCapturingInput && this.nodeCapturingInput != n && this.nodeCapturingInput.onMouseMove)
		{
			this.nodeCapturingInput.onMouseMove(e);
		}


		if(this.nodeDragged && !this.liveMode)
		{
			/*
			this.nodeDragged.pos[0] += delta[0] / this.scale;
			this.nodeDragged.pos[1] += delta[1] / this.scale;
			this.nodeDragged.pos[0] = Math.round(this.nodeDragged.pos[0]);
			this.nodeDragged.pos[1] = Math.round(this.nodeDragged.pos[1]);
			*/
			
			for(var i in this.selectedNodes)
			{
				var n = this.selectedNodes[i];
				
				n.pos[0] += delta[0] / this.scale;
				n.pos[1] += delta[1] / this.scale;
				//n.pos[0] = Math.round(n.pos[0]);
				//n.pos[1] = Math.round(n.pos[1]);
			}
			
			this.dirtyCanvas = true;
			this.dirtyBgcanvas = true;
		}

		if(this.resizingNode && !this.liveMode)
		{
			this.resizingNode.size[0] += delta[0] / this.scale;
			this.resizingNode.size[1] += delta[1] / this.scale;
			var maxSlots = Math.max( this.resizingNode.inputs ? this.resizingNode.inputs.length : 0, this.resizingNode.outputs ? this.resizingNode.outputs.length : 0);
			if(this.resizingNode.size[1] < maxSlots * LiteGraph.NODE_SLOT_HEIGHT + 4)
				this.resizingNode.size[1] = maxSlots * LiteGraph.NODE_SLOT_HEIGHT + 4;
			if(this.resizingNode.size[0] < LiteGraph.NODE_MIN_WIDTH)
				this.resizingNode.size[0] = LiteGraph.NODE_MIN_WIDTH;

			this.canvas.style.cursor = "se-resize";
			this.dirtyCanvas = true;
			this.dirtyBgcanvas = true;
		}
	}

	/*
	if((this.dirtyCanvas || this.dirtyBgcanvas) && this.renderingTimerId == null) 
		this.draw();
	*/

	e.preventDefault();
	//e.stopPropagation();
	return false;
	//this is not really optimal
	//this.graph.change();
}

LGraphCanvas.prototype.processMouseUp = function(e)
{
	if(!this.graph)
		return;

	var window = this.getCanvasWindow();
	var document = window.document;

	//restore the mousemove event back to the canvas
	document.removeEventListener("mousemove", this._mousemoveCallback, true );
	this.canvas.addEventListener("mousemove", this._mousemoveCallback, true);
	document.removeEventListener("mouseup", this._mouseupCallback, true );

	this.adjustMouseEvent(e);

	if (e.which == 1) //left button
	{
		//dragging a connection
		if(this.connectingNode)
		{
			this.dirtyCanvas = true;
			this.dirtyBgcanvas = true;

			var node = this.graph.getNodeOnPos( e.canvasX, e.canvasY, this.visibleNodes );

			//node below mouse
			if(node)
			{
				if( this.connectingOutput.type == LiteGraph.EVENT && this.isOverNodeBox( node, e.canvasX, e.canvasY ) )
				{
					this.connectingNode.connect( this.connectingSlot, node, LiteGraph.EVENT );
				}
				else
				{
					//slot below mouse? connect
					var slot = this.isOverNodeInput(node, e.canvasX, e.canvasY);
					if(slot != -1)
					{
						this.connectingNode.connect(this.connectingSlot, node, slot);
					}
					else
					{ //not on top of an input
						var input = node.getInputInfo(0);
						//auto connect
						if(this.connectingOutput.type == LiteGraph.EVENT)
							this.connectingNode.connect( this.connectingSlot, node, LiteGraph.EVENT );
						else
							if(input && !input.link && input.type == this.connectingOutput.type) //toLowerCase missing
								this.connectingNode.connect(this.connectingSlot, node, 0);
					}
				}
			}

			this.connectingOutput = null;
			this.connectingPos = null;
			this.connectingNode = null;
			this.connectingSlot = -1;

		}//not dragging connection
		else if(this.resizingNode)
		{
			this.dirtyCanvas = true;
			this.dirtyBgcanvas = true;
			this.resizingNode = null;
		}
		else if(this.nodeDragged) //node being dragged?
		{
			this.dirtyCanvas = true;
			this.dirtyBgcanvas = true;
			this.nodeDragged.pos[0] = Math.round(this.nodeDragged.pos[0]);
			this.nodeDragged.pos[1] = Math.round(this.nodeDragged.pos[1]);
			if(this.graph.config.alignToGrid)
				this.nodeDragged.alignToGrid();
			this.nodeDragged = null;
		}
		else //no node being dragged
		{
			this.dirtyCanvas = true;
			this.draggingCanvas = false;

			if( this.nodeOver && this.nodeOver.onMouseUp )
				this.nodeOver.onMouseUp(e, [e.canvasX - this.nodeOver.pos[0], e.canvasY - this.nodeOver.pos[1]] );
			if( this.nodeCapturingInput && this.nodeCapturingInput.onMouseUp )
				this.nodeCapturingInput.onMouseUp(e, [e.canvasX - this.nodeCapturingInput.pos[0], e.canvasY - this.nodeCapturingInput.pos[1]] );
		}
	}
	else if (e.which == 2) //middle button
	{
		//trace("middle");
		this.dirtyCanvas = true;
		this.draggingCanvas = false;
	}
	else if (e.which == 3) //right button
	{
		//trace("right");
		this.dirtyCanvas = true;
		this.draggingCanvas = false;
	}

	/*
	if((this.dirtyCanvas || this.dirtyBgcanvas) && this.renderingTimerId == null)
		this.draw();
	*/

	this.graph.change();

	e.stopPropagation();
	e.preventDefault();
	return false;
}


LGraphCanvas.prototype.processMouseWheel = function(e) 
{
	if(!this.graph || !this.allowDragcanvas)
		return;

	var delta = (e.wheelDeltaY != null ? e.wheelDeltaY : e.detail * -60);

	this.adjustMouseEvent(e);

	var zoom = this.scale;

	if (delta > 0)
		zoom *= 1.1;
	else if (delta < 0)
		zoom *= 1/(1.1);

	this.setZoom( zoom, [ e.localX, e.localY ] );

	/*
	if(this.renderingTimerId == null)
		this.draw();
	*/

	this.graph.change();

	e.preventDefault();
	return false; // prevent default
}

LGraphCanvas.prototype.isOverNodeBox = function( node, canvasx, canvasy )
{
	var titleHeight = LiteGraph.NODE_TITLE_HEIGHT;
	if( isInsideRectangle( canvasx, canvasy, node.pos[0] + 2, node.pos[1] + 2 - titleHeight, titleHeight - 4,titleHeight - 4) )
		return true;
	return false;
}

LGraphCanvas.prototype.isOverNodeInput = function(node, canvasx, canvasy, slotPos )
{
	if(node.inputs)
		for(var i = 0, l = node.inputs.length; i < l; ++i)
		{
			var input = node.inputs[i];
			var linkPos = node.getConnectionPos(true,i);
			if( isInsideRectangle(canvasx, canvasy, linkPos[0] - 10, linkPos[1] - 5, 20,10) )
			{
				if(slotPos)
				{ 
					slotPos[0] = linkPos[0];
					slotPos[1] = linkPos[1];
				}
				return i;
			}
		}
	return -1;
}

LGraphCanvas.prototype.processKey = function(e) 
{
	if(!this.graph)
		return;

	var blockDefault = false;

	if(e.type == "keydown")
	{
		//select all Control A
		if(e.keyCode == 65 && e.ctrlKey)
		{
			this.selectAllNodes();
			blockDefault = true;
		}

		//delete or backspace
		if(e.keyCode == 46 || e.keyCode == 8)
		{
			this.deleteSelectedNodes();
			blockDefault = true;
		}

		//collapse
		//...

		//TODO
		if(this.selectedNodes) 
			for (var i in this.selectedNodes)
				if(this.selectedNodes[i].onKeyDown)
					this.selectedNodes[i].onKeyDown(e);
	}
	else if( e.type == "keyup" )
	{
		if(this.selectedNodes)
			for (var i in this.selectedNodes)
				if(this.selectedNodes[i].onKeyUp)
					this.selectedNodes[i].onKeyUp(e);
	}

	this.graph.change();

	if(blockDefault)
	{
		e.preventDefault();
		return false;
	}
}

LGraphCanvas.prototype.processDrop = function(e)
{
	e.preventDefault();
	this.adjustMouseEvent(e);

	
	var pos = [e.canvasX,e.canvasY];
	var node = this.graph.getNodeOnPos(pos[0],pos[1]);

	if(!node)
	{
		if(this.onDropItem)
			this.onDropItem( event );
		return;
	}

	if(node.onDropFile)
	{
		var files = e.dataTransfer.files;
		if(files && files.length)
		{
			for(var i=0; i < files.length; i++)
			{
				var file = e.dataTransfer.files[0];
				var filename = file.name;
				var ext = LGraphCanvas.getFileExtension( filename );
				//console.log(file);

				//prepare reader
				var reader = new FileReader();
				reader.onload = function (event) {
					//console.log(event.target);
					var data = event.target.result;
					node.onDropFile( data, filename, file );
				};

				//read data
				var type = file.type.split("/")[0];
				if(type == "text" || type == "")
					reader.readAsText(file);
				else if (type == "image")
					reader.readAsDataURL(file);
				else
					reader.readAsArrayBuffer(file);
			}
		}
	}

	if(node.onDropItem)
	{
		if( node.onDropItem( event ) )
			return true;
	}

	if(this.onDropItem)
		return this.onDropItem( event );

	return false;
}

LGraphCanvas.prototype.processNodeSelected = function(n,e)
{
	n.selected = true;
	if (n.onSelected)
		n.onSelected();
		
	if(e && e.shiftKey) //add to selection
		this.selectedNodes[n.id] = n;
	else
	{
		this.selectedNodes = {};
		this.selectedNodes[ n.id ] = n;
	}
		
	this.dirtyCanvas = true;

	if(this.onNodeSelected)
		this.onNodeSelected(n);

	//if(this.nodeInPanel) this.showNodePanel(n);
}

LGraphCanvas.prototype.processNodeDeselected = function(n)
{
	n.selected = false;
	if(n.onDeselected)
		n.onDeselected();
		
	delete this.selectedNodes[n.id];

	if(this.onNodeDeselected)
		this.onNodeDeselected(n);

	this.dirtyCanvas = true;
}

LGraphCanvas.prototype.processNodeDblClicked = function(n)
{
	if(this.onShowNodePanel)
		this.onShowNodePanel(n);

	if(this.onNodeDblClicked)
		this.onNodeDblClicked(n);

	this.setDirty(true);
}

LGraphCanvas.prototype.selectNode = function(node)
{
	this.deselectAllNodes();

	if(!node)
		return;

	if(!node.selected && node.onSelected)
		node.onSelected();
	node.selected = true;
	this.selectedNodes[ node.id ] = node;
	this.setDirty(true);
}

LGraphCanvas.prototype.selectAllNodes = function()
{
	for(var i = 0; i < this.graph._nodes.length; ++i)
	{
		var n = this.graph._nodes[i];
		if(!n.selected && n.onSelected)
			n.onSelected();
		n.selected = true;
		this.selectedNodes[this.graph._nodes[i].id] = n;
	}

	this.setDirty(true);
}

LGraphCanvas.prototype.deselectAllNodes = function()
{
	for(var i in this.selectedNodes)
	{
		var n = this.selectedNodes;
		if(n.onDeselected)
			n.onDeselected();
		n.selected = false;
	}
	this.selectedNodes = {};
	this.setDirty(true);
}

LGraphCanvas.prototype.deleteSelectedNodes = function()
{
	for(var i in this.selectedNodes)
	{
		var m = this.selectedNodes[i];
		//if(m == this.nodeInPanel) this.showNodePanel(null);
		this.graph.remove(m);
	}
	this.selectedNodes = {};
	this.setDirty(true);
}

LGraphCanvas.prototype.centerOnNode = function(node)
{
	this.offset[0] = -node.pos[0] - node.size[0] * 0.5 + (this.canvas.width * 0.5 / this.scale);
	this.offset[1] = -node.pos[1] - node.size[1] * 0.5 + (this.canvas.height * 0.5 / this.scale);
	this.setDirty(true,true);
}

LGraphCanvas.prototype.adjustMouseEvent = function(e)
{
	var b = this.canvas.getBoundingClientRect();
	e.localX = e.pageX - b.left;
	e.localY = e.pageY - b.top;

	e.canvasX = e.localX / this.scale - this.offset[0];
	e.canvasY = e.localY / this.scale - this.offset[1];
}

LGraphCanvas.prototype.setZoom = function(value, zoomingCenter)
{
	if(!zoomingCenter)
		zoomingCenter = [this.canvas.width * 0.5,this.canvas.height * 0.5];

	var center = this.convertOffsetToCanvas( zoomingCenter );

	this.scale = value;

	if(this.scale > this.maxZoom)
		this.scale = this.maxZoom;
	else if(this.scale < this.minZoom)
		this.scale = this.minZoom;
	
	var newCenter = this.convertOffsetToCanvas( zoomingCenter );
	var deltaOffset = [newCenter[0] - center[0], newCenter[1] - center[1]];

	this.offset[0] += deltaOffset[0];
	this.offset[1] += deltaOffset[1];

	this.dirtyCanvas = true;
	this.dirtyBgcanvas = true;
}

LGraphCanvas.prototype.convertOffsetToCanvas = function(pos)
{
	return [pos[0] / this.scale - this.offset[0], pos[1] / this.scale - this.offset[1]];
}

LGraphCanvas.prototype.convertCanvasToOffset = function(pos)
{
	return [(pos[0] + this.offset[0]) * this.scale, 
		(pos[1] + this.offset[1]) * this.scale ];
}

LGraphCanvas.prototype.convertEventToCanvas = function(e)
{
	var rect = this.canvas.getClientRects()[0];
	return this.convertOffsetToCanvas([e.pageX - rect.left,e.pageY - rect.top]);
}

LGraphCanvas.prototype.bringToFront = function(n)
{
	var i = this.graph._nodes.indexOf(n);
	if(i == -1) return;
	
	this.graph._nodes.splice(i,1);
	this.graph._nodes.push(n);
}

LGraphCanvas.prototype.sendToBack = function(n)
{
	var i = this.graph._nodes.indexOf(n);
	if(i == -1) return;
	
	this.graph._nodes.splice(i,1);
	this.graph._nodes.unshift(n);
}
	
/* Interaction */



/* LGraphCanvas render */

LGraphCanvas.prototype.computeVisibleNodes = function()
{
	var visibleNodes = [];
	for(var i = 0, l = this.graph._nodes.length; i < l; ++i)
	{
		var n = this.graph._nodes[i];

		//skip rendering nodes in live mode
		if(this.liveMode && !n.onDrawBackground && !n.onDrawForeground)
			continue;

		if(!overlapBounding(this.visibleArea, n.getBounding() ))
			continue; //out of the visible area

		visibleNodes.push(n);
	}
	return visibleNodes;
}

LGraphCanvas.prototype.draw = function(forceCanvas, forceBgcanvas)
{
	//fps counting
	var now = LiteGraph.getTime();
	this.renderTime = (now - this.lastDrawTime)*0.001;
	this.lastDrawTime = now;

	if(this.graph)
	{
		var start = [-this.offset[0], -this.offset[1] ];
		var end = [start[0] + this.canvas.width / this.scale, start[1] + this.canvas.height / this.scale];
		this.visibleArea = new Float32Array([start[0],start[1],end[0],end[1]]);
	}

	if(this.dirtyBgcanvas || forceBgcanvas || this.alwaysRenderBackground || (this.graph && this.graph._lastTriggerTime && (now - this.graph._lastTriggerTime) < 1000) )
		this.drawBackCanvas();

	if(this.dirtyCanvas || forceCanvas)
		this.drawFrontCanvas();

	this.fps = this.renderTime ? (1.0 / this.renderTime) : 0;
	this.frame += 1;
}

LGraphCanvas.prototype.drawFrontCanvas = function()
{
	if(!this.ctx)
		this.ctx = this.bgcanvas.getContext("2d");
	var ctx = this.ctx;
	if(!ctx) //maybe is using webgl...
		return;

	if(ctx.start2D)
		ctx.start2D();

	var canvas = this.canvas;

	//reset in case of error
	ctx.restore();
	ctx.setTransform(1, 0, 0, 1, 0, 0);

	//clip dirty area if there is one, otherwise work in full canvas
	if(this.dirtyArea)
	{
		ctx.save();
		ctx.beginPath();
		ctx.rect(this.dirtyArea[0],this.dirtyArea[1],this.dirtyArea[2],this.dirtyArea[3]);
		ctx.clip();
	}

	//clear
	//canvas.width = canvas.width;
	if(this.clearBackground)
		ctx.clearRect(0,0,canvas.width, canvas.height);

	//draw bg canvas
	if(this.bgcanvas == this.canvas)
		this.drawBackCanvas();
	else
		ctx.drawImage(this.bgcanvas,0,0);

	//rendering
	if(this.onRender)
		this.onRender(canvas, ctx);

	//info widget
	if(this.showInfo)
		this.renderInfo(ctx);

	if(this.graph)
	{
		//apply transformations
		ctx.save();
		ctx.scale(this.scale,this.scale);
		ctx.translate(this.offset[0],this.offset[1]);

		//draw nodes
		var drawnNodes = 0;
		var visibleNodes = this.computeVisibleNodes();
		this.visibleNodes = visibleNodes;

		for (var i = 0; i < visibleNodes.length; ++i)
		{
			var node = visibleNodes[i];

			//transform coords system
			ctx.save();
			ctx.translate( node.pos[0], node.pos[1] );

			//Draw
			this.drawNode(node, ctx );
			drawnNodes += 1;

			//Restore
			ctx.restore();
		}
		
		//connections ontop?
		if(this.graph.config.linksOntop)
			if(!this.liveMode)
				this.drawConnections(ctx);

		//current connection
		if(this.connectingPos != null)
		{
			ctx.lineWidth = this.connectionsWidth;
			var linkColor = null;
			switch( this.connectingOutput.type )
			{
				case LiteGraph.EVENT: linkColor = "#F85"; break;
				default:
					linkColor = "#AFA";
			}
			this.renderLink(ctx, this.connectingPos, [this.canvasMouse[0],this.canvasMouse[1]], linkColor );

			ctx.beginPath();

			if( this.connectingOutput.type === LiteGraph.EVENT )
				ctx.rect( (this.connectingPos[0] - 6) + 0.5, (this.connectingPos[1] - 5) + 0.5,14,10);
			else
				ctx.arc( this.connectingPos[0], this.connectingPos[1],4,0,Math.PI*2);

			/*
			if( this.connectingOutput.round)
				ctx.arc( this.connectingPos[0], this.connectingPos[1],4,0,Math.PI*2);
			else
				ctx.rect( this.connectingPos[0], this.connectingPos[1],12,6);
			*/
			ctx.fill();

			ctx.fillStyle = "#ffcc00";
			if(this._highlightInput)
			{
				ctx.beginPath();
				ctx.arc( this._highlightInput[0], this._highlightInput[1],6,0,Math.PI*2);
				ctx.fill();
			}
		}
		ctx.restore();
	}

	if(this.dirtyArea)
	{
		ctx.restore();
		//this.dirtyArea = null;
	}

	if(ctx.finish2D) //this is a function I use in webgl renderer
		ctx.finish2D();

	this.dirtyCanvas = false;
}

LGraphCanvas.prototype.renderInfo = function( ctx, x, y )
{
	x = x || 0;
	y = y || 0;

	ctx.save();
	ctx.translate( x, y );

	ctx.font = "10px Arial";
	ctx.fillStyle = "#888";
	if(this.graph)
	{
		ctx.fillText( "T: " + this.graph.globaltime.toFixed(2)+"s",5,13*1 );
		ctx.fillText( "I: " + this.graph.iteration,5,13*2 );
		ctx.fillText( "F: " + this.frame,5,13*3 );
		ctx.fillText( "FPS:" + this.fps.toFixed(2),5,13*4 );
	}
	else
		ctx.fillText( "No graph selected",5,13*1 );
	ctx.restore();
}

LGraphCanvas.prototype.drawBackCanvas = function()
{
	var canvas = this.bgcanvas;
	if(canvas.width != this.canvas.width ||
		canvas.height != this.canvas.height)
	{
		canvas.width = this.canvas.width;
		canvas.height = this.canvas.height;
	}

	if(!this.bgctx)
		this.bgctx = this.bgcanvas.getContext("2d");
	var ctx = this.bgctx;
	if(ctx.start)
		ctx.start();

	//clear
	if(this.clearBackground)
		ctx.clearRect(0,0,canvas.width, canvas.height);

	//reset in case of error
	ctx.restore();
	ctx.setTransform(1, 0, 0, 1, 0, 0);

	if(this.graph)
	{
		//apply transformations
		ctx.save();
		ctx.scale(this.scale,this.scale);
		ctx.translate(this.offset[0],this.offset[1]);

		//render BG
		if(this.backgroundImage && this.scale > 0.5)
		{
			ctx.globalAlpha = (1.0 - 0.5 / this.scale) * this.editorAlpha;
			ctx.webkitImageSmoothingEnabled = ctx.mozImageSmoothingEnabled = ctx.imageSmoothingEnabled = false;
			if(!this._bgImg || this._bgImg.name != this.backgroundImage)
			{
				this._bgImg = new Image();
				this._bgImg.name = this.backgroundImage; 
				this._bgImg.src = this.backgroundImage;
				var that = this;
				this._bgImg.onload = function() { 
					that.draw(true,true);
				}
			}

			var pattern = null;
			if(this._pattern == null && this._bgImg.width > 0)
			{
				pattern = ctx.createPattern( this._bgImg, 'repeat' );
				this._patternImg = this._bgImg;
				this._pattern = pattern;
			}
			else
				pattern = this._pattern;
			if(pattern)
			{
				ctx.fillStyle = pattern;
				ctx.fillRect(this.visibleArea[0],this.visibleArea[1],this.visibleArea[2]-this.visibleArea[0],this.visibleArea[3]-this.visibleArea[1]);
				ctx.fillStyle = "transparent";
			}

			ctx.globalAlpha = 1.0;
			ctx.webkitImageSmoothingEnabled = ctx.mozImageSmoothingEnabled = ctx.imageSmoothingEnabled = true;
		}

		if(this.onBackgroundRender)
			this.onBackgroundRender(canvas, ctx);

		//DEBUG: show clipping area
		//ctx.fillStyle = "red";
		//ctx.fillRect( this.visibleArea[0] + 10, this.visibleArea[1] + 10, this.visibleArea[2] - this.visibleArea[0] - 20, this.visibleArea[3] - this.visibleArea[1] - 20);

		//bg
		ctx.strokeStyle = "#235";
		ctx.strokeRect(0,0,canvas.width,canvas.height);

		if(this.renderConnectionsShadows)
		{
			ctx.shadowColor = "#000";
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = 6;
		}
		else
			ctx.shadowColor = "rgba(0,0,0,0)";

		//draw connections
		if(!this.liveMode)
			this.drawConnections(ctx);

		ctx.shadowColor = "rgba(0,0,0,0)";

		//restore state
		ctx.restore();
	}

	if(ctx.finish)
		ctx.finish();

	this.dirtyBgcanvas = false;
	this.dirtyCanvas = true; //to force to repaint the front canvas with the bgcanvas 
}

/* Renders the LGraphNode on the canvas */
LGraphCanvas.prototype.drawNode = function(node, ctx )
{
	var glow = false;

	var color = node.color || LiteGraph.NODE_DEFAULT_COLOR;
	//if (this.selected) color = "#88F";

	var renderTitle = true;
	if(node.flags.skipTitleRender || node.graph.isLive())
		renderTitle = false;
	if(node.mouseOver)
		renderTitle = true;

	//shadow and glow
	if (node.mouseOver) glow = true;
	
	if(node.selected)
	{
		/*
		ctx.shadowColor = "#EEEEFF";//glow ? "#AAF" : "#000";
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;
		ctx.shadowBlur = 1;
		*/
	}
	else if(this.renderShadows)
	{
		ctx.shadowColor = "rgba(0,0,0,0.5)";
		ctx.shadowOffsetX = 2;
		ctx.shadowOffsetY = 2;
		ctx.shadowBlur = 3;
	}
	else
		ctx.shadowColor = "transparent";

	//only render if it forces it to do it
	if(this.liveMode)
	{
		if(!node.flags.collapsed)
		{
			ctx.shadowColor = "transparent";
			//if(node.onDrawBackground)
			//	node.onDrawBackground(ctx);
			if(node.onDrawForeground)
				node.onDrawForeground(ctx);
		}

		return;
	}

	//draw in collapsed form
	/*
	if(node.flags.collapsed)
	{
		if(!node.onDrawCollapsed || node.onDrawCollapsed(ctx) == false)
			this.drawNodeCollapsed(node, ctx, color, node.bgcolor);
		return;
	}
	*/

	var editorAlpha = this.editorAlpha;
	ctx.globalAlpha = editorAlpha;

	//clip if required (mask)
	var shape = node.shape || "box";
	var size = new Float32Array(node.size);
	if(node.flags.collapsed)
	{
		size[0] = LiteGraph.NODE_COLLAPSED_WIDTH;
		size[1] = 0;
	}

	//Start clipping
	if(node.flags.clipArea)
	{
		ctx.save();
		if(shape == "box")
		{
			ctx.beginPath();
			ctx.rect(0,0,size[0], size[1]);
		}
		else if (shape == "round")
		{
			ctx.roundRect(0,0,size[0], size[1],10);
		}
		else if (shape == "circle")
		{
			ctx.beginPath();
			ctx.arc(size[0] * 0.5, size[1] * 0.5, size[0] * 0.5, 0, Math.PI*2);
		}
		ctx.clip();
	}

	//draw shape
	this.drawNodeShape(node, ctx, size, color, node.bgcolor, !renderTitle, node.selected );
	ctx.shadowColor = "transparent";

	//connection slots
	ctx.textAlign = "left";
	ctx.font = this.innerTextFont;

	var renderText = this.scale > 0.6;

	var outSlot = this.connectingOutput;

	//render inputs and outputs
	if(!node.flags.collapsed)
	{
		//input connection slots
		if(node.inputs)
			for(var i = 0; i < node.inputs.length; i++)
			{
				var slot = node.inputs[i];

				ctx.globalAlpha = editorAlpha;
				//change opacity of incompatible slots
				if ( this.connectingNode && LiteGraph.isValidConnection( slot.type && outSlot.type ) )
					ctx.globalAlpha = 0.4 * editorAlpha;

				ctx.fillStyle = slot.link != null ? "#7F7" : "#AAA";

				var pos = node.getConnectionPos(true,i);
				pos[0] -= node.pos[0];
				pos[1] -= node.pos[1];

				ctx.beginPath();

				if (slot.type === LiteGraph.EVENT)
					ctx.rect((pos[0] - 6) + 0.5, (pos[1] - 5) + 0.5,14,10);
				else
					ctx.arc(pos[0],pos[1],4,0,Math.PI*2);

				ctx.fill();

				//render name
				if(renderText)
				{
					var text = slot.label != null ? slot.label : slot.name;
					if(text)
					{
						ctx.fillStyle = color; 
						ctx.fillText(text,pos[0] + 10,pos[1] + 5);
					}
				}
			}

		//output connection slots
		if(this.connectingNode)
			ctx.globalAlpha = 0.4 * editorAlpha;

		ctx.lineWidth = 1;

		ctx.textAlign = "right";
		ctx.strokeStyle = "black";
		if(node.outputs)
			for(var i = 0; i < node.outputs.length; i++)
			{
				var slot = node.outputs[i];

				var pos = node.getConnectionPos(false,i);
				pos[0] -= node.pos[0];
				pos[1] -= node.pos[1];

				ctx.fillStyle = slot.links && slot.links.length ? "#7F7" : "#AAA";
				ctx.beginPath();
				//ctx.rect( node.size[0] - 14,i*14,10,10);

				if (slot.type === LiteGraph.EVENT)
					ctx.rect((pos[0] - 6) + 0.5,(pos[1] - 5) + 0.5,14,10);
				else
					ctx.arc( pos[0],pos[1],4,0, Math.PI*2 );

				//trigger
				//if(slot.nodeId != null && slot.slot == -1)
				//	ctx.fillStyle = "#F85";

				//if(slot.links != null && slot.links.length)
				ctx.fill();
				ctx.stroke();

				//render output name
				if(renderText)
				{
					var text = slot.label != null ? slot.label : slot.name;
					if(text)
					{
						ctx.fillStyle = color;
						ctx.fillText(text, pos[0] - 10,pos[1] + 5);
					}
				}
			}

		ctx.textAlign = "left";
		ctx.globalAlpha = 1;

		if(node.onDrawForeground)
			node.onDrawForeground(ctx);
	}//!collapsed

	if(node.flags.clipArea)
		ctx.restore();

	ctx.globalAlpha = 1.0;
}

/* Renders the node shape */
LGraphCanvas.prototype.drawNodeShape = function(node, ctx, size, fgcolor, bgcolor, noTitle, selected )
{
	//bg rect
	ctx.strokeStyle = fgcolor || LiteGraph.NODE_DEFAULT_COLOR;
	ctx.fillStyle = bgcolor || LiteGraph.NODE_DEFAULT_BGCOLOR;

	/* gradient test
	var grad = ctx.createLinearGradient(0,0,0,node.size[1]);
	grad.addColorStop(0, "#AAA");
	grad.addColorStop(0.5, fgcolor || LiteGraph.NODE_DEFAULT_COLOR);
	grad.addColorStop(1, bgcolor || LiteGraph.NODE_DEFAULT_BGCOLOR);
	ctx.fillStyle = grad;
	//*/

	var titleHeight = LiteGraph.NODE_TITLE_HEIGHT;

	//render depending on shape
	var shape = node.shape || "box";
	if(shape == "box")
	{
		ctx.beginPath();
		ctx.rect(0,noTitle ? 0 : -titleHeight, size[0]+1, noTitle ? size[1] : size[1] + titleHeight);
		ctx.fill();
		ctx.shadowColor = "transparent";

		if(selected)
		{
			ctx.strokeStyle = "#CCC";
			ctx.strokeRect(-0.5,noTitle ? -0.5 : -titleHeight + -0.5, size[0]+2, noTitle ? (size[1]+2) : (size[1] + titleHeight+2) - 1);
			ctx.strokeStyle = fgcolor;
		}
	}
	else if (node.shape == "round")
	{
		ctx.roundRect(0,noTitle ? 0 : -titleHeight,size[0], noTitle ? size[1] : size[1] + titleHeight, 10);
		ctx.fill();
	}
	else if (node.shape == "circle")
	{
		ctx.beginPath();
		ctx.arc(size[0] * 0.5, size[1] * 0.5, size[0] * 0.5, 0, Math.PI*2);
		ctx.fill();
	}

	ctx.shadowColor = "transparent";

	//ctx.stroke();

	//image
	if (node.bgImage && node.bgImage.width)
		ctx.drawImage( node.bgImage, (size[0] - node.bgImage.width) * 0.5 , (size[1] - node.bgImage.height) * 0.5);

	if(node.bgImageUrl && !node.bgImage)
		node.bgImage = node.loadImage(node.bgImageUrl);

	if(node.onDrawBackground)
		node.onDrawBackground(ctx);

	//title bg (remember, it is rendered ABOVE the node
	if(!noTitle)
	{
		ctx.fillStyle = fgcolor || LiteGraph.NODE_DEFAULT_COLOR;
		var oldAlpha = ctx.globalAlpha;
		ctx.globalAlpha = 0.5 * oldAlpha;
		if(shape == "box")
		{
			ctx.beginPath();
			ctx.rect(0, -titleHeight, size[0]+1, titleHeight);
			ctx.fill()
			//ctx.stroke();
		}
		else if (shape == "round")
		{
			ctx.roundRect(0,-titleHeight,size[0], titleHeight,10,0);
			//ctx.fillRect(0,8,size[0],NODE_TITLE_HEIGHT - 12);
			ctx.fill();
			//ctx.stroke();
		}

		//title box
		ctx.fillStyle = node.boxcolor || LiteGraph.NODE_DEFAULT_BOXCOLOR;
		ctx.beginPath();
		if (shape == "round")
			ctx.arc(titleHeight *0.5, titleHeight * -0.5, (titleHeight - 6) *0.5,0,Math.PI*2);
		else
			ctx.rect(3,-titleHeight + 3,titleHeight - 6,titleHeight - 6);
		ctx.fill();
		ctx.globalAlpha = oldAlpha;

		//title text
		ctx.font = this.titleTextFont;
		var title = node.getTitle();
		if(title && this.scale > 0.5)
		{
			ctx.fillStyle = LiteGraph.NODE_TITLE_COLOR;
			ctx.fillText( title, 16, 13 - titleHeight );
		}
	}
}

/* Renders the node when collapsed */
LGraphCanvas.prototype.drawNodeCollapsed = function(node, ctx, fgcolor, bgcolor)
{
	//draw default collapsed shape
	ctx.strokeStyle = fgcolor || LiteGraph.NODE_DEFAULT_COLOR;
	ctx.fillStyle = bgcolor || LiteGraph.NODE_DEFAULT_BGCOLOR;

	var collapsedRadius = LiteGraph.NODE_COLLAPSED_RADIUS;

	//circle shape
	var shape = node.shape || "box";
	if(shape == "circle")
	{
		ctx.beginPath();
		ctx.arc(node.size[0] * 0.5, node.size[1] * 0.5, collapsedRadius,0,Math.PI * 2);
		ctx.fill();
		ctx.shadowColor = "rgba(0,0,0,0)";
		ctx.stroke();

		ctx.fillStyle = node.boxcolor || LiteGraph.NODE_DEFAULT_BOXCOLOR;
		ctx.beginPath();
		ctx.arc(node.size[0] * 0.5, node.size[1] * 0.5, collapsedRadius * 0.5,0,Math.PI * 2);
		ctx.fill();
	}
	else if(shape == "round") //rounded box
	{
		ctx.beginPath();
		ctx.roundRect(node.size[0] * 0.5 - collapsedRadius, node.size[1] * 0.5 - collapsedRadius, 2*collapsedRadius,2*collapsedRadius,5);
		ctx.fill();
		ctx.shadowColor = "rgba(0,0,0,0)";
		ctx.stroke();

		ctx.fillStyle = node.boxcolor || LiteGraph.NODE_DEFAULT_BOXCOLOR;
		ctx.beginPath();
		ctx.roundRect(node.size[0] * 0.5 - collapsedRadius*0.5, node.size[1] * 0.5 - collapsedRadius*0.5, collapsedRadius,collapsedRadius,2);
		ctx.fill();
	}
	else //flat box
	{
		ctx.beginPath();
		//ctx.rect(node.size[0] * 0.5 - collapsedRadius, node.size[1] * 0.5 - collapsedRadius, 2*collapsedRadius, 2*collapsedRadius);
		ctx.rect(0, 0, node.size[0], collapsedRadius * 2 );
		ctx.fill();
		ctx.shadowColor = "rgba(0,0,0,0)";
		ctx.stroke();

		ctx.fillStyle = node.boxcolor || LiteGraph.NODE_DEFAULT_BOXCOLOR;
		ctx.beginPath();
		//ctx.rect(node.size[0] * 0.5 - collapsedRadius*0.5, node.size[1] * 0.5 - collapsedRadius*0.5, collapsedRadius,collapsedRadius);
		ctx.rect(collapsedRadius*0.5, collapsedRadius*0.5, collapsedRadius, collapsedRadius);
		ctx.fill();
	}
}

//OPTIMIZE THIS: precatch connections position instead of recomputing them every time
LGraphCanvas.prototype.drawConnections = function(ctx)
{
	var now = LiteGraph.getTime();

	//draw connections
	ctx.lineWidth = this.connectionsWidth;

	ctx.fillStyle = "#AAA";
	ctx.strokeStyle = "#AAA";
	ctx.globalAlpha = this.editorAlpha;
	//for every node
	for (var n = 0, l = this.graph._nodes.length; n < l; ++n)
	{
		var node = this.graph._nodes[n];
		//for every input (we render just inputs because it is easier as every slot can only have one input)
		if(node.inputs && node.inputs.length)
			for(var i = 0; i < node.inputs.length; ++i)
			{
				var input = node.inputs[i];
				if(!input || input.link == null) 
					continue;
				var linkId = input.link;
				var link = this.graph.links[ linkId ];
				if(!link)
					continue;

				var startNode = this.graph.getNodeById( link.originId );
				if(startNode == null) continue;
				var startNodeSlot = link.originSlot;
				var startNodeSlotpos = null;

				if(startNodeSlot == -1)
					startNodeSlotpos = [startNode.pos[0] + 10, startNode.pos[1] + 10];
				else
					startNodeSlotpos = startNode.getConnectionPos(false, startNodeSlot);

				var color = LGraphCanvas.linkTypeColors[ node.inputs[i].type ] || this.defaultLinkColor;

				this.renderLink(ctx, startNodeSlotpos, node.getConnectionPos(true,i), color );

				if(link && link._lastTime && now - link._lastTime < 1000 )
				{
					var f = 2.0 - (now - link._lastTime) * 0.002;
					var color = "rgba(255,255,255, " + f.toFixed(2) + ")";
					this.renderLink( ctx, startNodeSlotpos, node.getConnectionPos(true,i) , color, true, f );
				}
			}
	}
	ctx.globalAlpha = 1;
}

LGraphCanvas.prototype.renderLink = function(ctx,a,b,color, skipBorder, flow )
{
	if(!this.highqualityRender)
	{
		ctx.beginPath();
		ctx.moveTo(a[0],a[1]);
		ctx.lineTo(b[0],b[1]);
		ctx.stroke();
		return;
	}

	var dist = distance(a,b);

	if(this.renderConnectionsBorder && this.scale > 0.6)
		ctx.lineWidth = this.connectionsWidth + 4;

	ctx.beginPath();
	
	if(this.renderCurvedConnections) //splines
	{
		ctx.moveTo(a[0],a[1]);
		ctx.bezierCurveTo(a[0] + dist*0.25, a[1],
							b[0] - dist*0.25 , b[1],
							b[0] ,b[1] );
	}
	else //lines
	{
		ctx.moveTo(a[0]+10,a[1]);
		ctx.lineTo(((a[0]+10) + (b[0]-10))*0.5,a[1]);
		ctx.lineTo(((a[0]+10) + (b[0]-10))*0.5,b[1]);
		ctx.lineTo(b[0]-10,b[1]);
	}

	if(this.renderConnectionsBorder && this.scale > 0.6 && !skipBorder)
	{
		ctx.strokeStyle = "rgba(0,0,0,0.5)";
		ctx.stroke();
	}

	ctx.lineWidth = this.connectionsWidth;
	ctx.fillStyle = ctx.strokeStyle = color;
	ctx.stroke();

	//no symbols
	if(!this.renderConnectionArrows || this.scale < 0.6)
		return;

	//render arrow
	if(this.renderConnectionArrows && this.scale > 0.6)
	{
		var pos = this.computeConnectionPoint(a,b,0.5);
		var pos2 = this.computeConnectionPoint(a,b,0.51);

		//get two points in the bezier curve
		var angle = 0;
		if(this.renderCurvedConnections)
			angle = -Math.atan2( pos2[0] - pos[0], pos2[1] - pos[1]);
		else
			angle = b[1] > a[1] ? 0 : Math.PI;

		ctx.save();
		ctx.translate(pos[0],pos[1]);
		ctx.rotate(angle);
		ctx.beginPath();
		ctx.moveTo(-5,-5);
		ctx.lineTo(0,+5);
		ctx.lineTo(+5,-5);
		ctx.fill();
		ctx.restore();
	}

	if(flow)
	{
		for(var i = 0; i < 5; ++i)
		{
			var f = (LiteGraph.getTime() * 0.001 + (i * 0.2)) % 1;
			var pos = this.computeConnectionPoint(a,b,f);
			ctx.beginPath();
			ctx.arc(pos[0],pos[1],5,0,2*Math.PI);
			ctx.fill();
		}
	}
}

LGraphCanvas.prototype.computeConnectionPoint = function(a,b,t)
{
	var dist = distance(a,b);
	var p0 = a;
	var p1 = [ a[0] + dist*0.25, a[1] ];
	var p2 = [ b[0] - dist*0.25, b[1] ];
	var p3 = b;

	var c1 = (1-t)*(1-t)*(1-t);
	var c2 = 3*((1-t)*(1-t))*t;
	var c3 = 3*(1-t)*(t*t);
	var c4 = t*t*t;

	var x = c1*p0[0] + c2*p1[0] + c3*p2[0] + c4*p3[0];
	var y = c1*p0[1] + c2*p1[1] + c3*p2[1] + c4*p3[1];
	return [x,y];
}

/*
LGraphCanvas.prototype.resizeCanvas = function(width,height)
{
	this.canvas.width = width;
	if(height)
		this.canvas.height = height;

	this.bgcanvas.width = this.canvas.width;
	this.bgcanvas.height = this.canvas.height;
	this.draw(true,true);
}
*/

LGraphCanvas.prototype.resize = function(width, height)
{
	if(!width && !height)
	{
		var parent = this.canvas.parentNode;
		width = parent.offsetWidth;
		height = parent.offsetHeight;
	}

	if(this.canvas.width == width && this.canvas.height == height)
		return;

	this.canvas.width = width;
	this.canvas.height = height;
	this.bgcanvas.width = this.canvas.width;
	this.bgcanvas.height = this.canvas.height;
	this.setDirty(true,true);
}


LGraphCanvas.prototype.switchLiveMode = function(transition)
{
	if(!transition)
	{
		this.liveMode = !this.liveMode;
		this.dirtyCanvas = true;
		this.dirtyBgcanvas = true;
		return;
	}

	var self = this;
	var delta = this.liveMode ? 1.1 : 0.9;
	if(this.liveMode)
	{
		this.liveMode = false;
		this.editorAlpha = 0.1;
	}

	var t = setInterval(function() {
		self.editorAlpha *= delta;
		self.dirtyCanvas = true;
		self.dirtyBgcanvas = true;

		if(delta < 1  && self.editorAlpha < 0.01)
		{
			clearInterval(t);
			if(delta < 1)
				self.liveMode = true;
		}
		if(delta > 1 && self.editorAlpha > 0.99)
		{
			clearInterval(t);
			self.editorAlpha = 1;
		}
	},1);
}

LGraphCanvas.prototype.onNodeSelectionChange = function(node)
{
	return; //disabled
	//if(this.nodeInPanel) this.showNodePanel(node);
}

LGraphCanvas.prototype.touchHandler = function(event)
{
	//alert("foo");
    var touches = event.changedTouches,
        first = touches[0],
        type = "";

         switch(event.type)
    {
        case "touchstart": type = "mousedown"; break;
        case "touchmove":  type="mousemove"; break;        
        case "touchend":   type="mouseup"; break;
        default: return;
    }

             //initMouseEvent(type, canBubble, cancelable, view, clickCount,
    //           screenX, screenY, clientX, clientY, ctrlKey,
    //           altKey, shiftKey, metaKey, button, relatedTarget);

	var window = this.getCanvasWindow();
	var document = window.document;
    
    var simulatedEvent = document.createEvent("MouseEvent");
    simulatedEvent.initMouseEvent(type, true, true, window, 1,
                              first.screenX, first.screenY,
                              first.clientX, first.clientY, false,
                              false, false, false, 0/*left*/, null);
	first.target.dispatchEvent(simulatedEvent);
    event.preventDefault();
}

/* CONTEXT MENU ********************/

LGraphCanvas.onMenuAdd = function(node, e, prevMenu, canvas, firstEvent )
{
	var refWindow = canvas.getCanvasWindow();

	var values = LiteGraph.getNodeTypesCategories();
	var entries = {};
	for(var i in values)
		if(values[i])
			entries[ i ] = { value: values[i], content: values[i]  , isMenu: true };

	var menu = LiteGraph.createContextualMenu(entries, {event: e, callback: innerClicked, from: prevMenu}, refWindow);

	function innerClicked(v, e)
	{
		var category = v.value;
		var nodeTypes = LiteGraph.getNodeTypesInCategory(category);
		var values = [];
		for(var i in nodeTypes)
			values.push( { content: nodeTypes[i].title, value: nodeTypes[i].type });

		LiteGraph.createContextualMenu(values, {event: e, callback: innerCreate, from: menu}, refWindow);
		return false;
	}

	function innerCreate(v, e)
	{
		var node = LiteGraph.createNode( v.value );
		if(node)
		{
			node.pos = canvas.convertEventToCanvas(firstEvent);
			canvas.graph.add( node );
		}
	}

	return false;
}

LGraphCanvas.onMenuCollapseAll = function()
{

}


LGraphCanvas.onMenuNodeEdit = function()
{

}

LGraphCanvas.showMenuNodeInputs = function(node, e, prevMenu)
{
	if(!node)
		return;

	var that = this;
	var refWindow = this.getCanvasWindow();

	var options = node.optionalInputs;
	if(node.onGetInputs)
		options = node.onGetInputs();

	var entries = [];
	if(options)
		for (var i in options)
		{
			var entry = options[i];
			var label = entry[0];
			if(entry[2] && entry[2].label)
				label = entry[2].label;
			entries.push({content: label, value: entry});
		}

	if(this.onMenuNodeInputs)
		entries = this.onMenuNodeInputs( entries );

	if(!entries.length)
		return;

	var menu = LiteGraph.createContextualMenu(entries, {event: e, callback: innerClicked, from: prevMenu}, refWindow);

	function innerClicked(v, e, prev)
	{
		if(!node)
			return;

		if(v.callback)
			v.callback.call(that, node, v, e, prev);

		if(v.value)
			node.addInput(v.value[0],v.value[1], v.value[2]);
	}

	return false;
}

LGraphCanvas.showMenuNodeOutputs = function(node, e, prevMenu)
{
	if(!node)
		return;

	var that = this;
	var refWindow = this.getCanvasWindow();

	var options = node.optionalOutputs;
	if(node.onGetOutputs)
		options = node.onGetOutputs();

	var entries = [];
	if(options)
		for (var i in options)
		{
			var entry = options[i];
			if(!entry) //separator?
			{
				entries.push(null);
				continue;
			}

			if(node.findOutputSlot(entry[0]) != -1)
				continue; //skip the ones already on
			var label = entry[0];
			if(entry[2] && entry[2].label)
				label = entry[2].label;
			var data = {content: label, value: entry};
			if(entry[1] == LiteGraph.EVENT)
				data.className = "event";
			entries.push(data);
		}

	if(this.onMenuNodeOutputs)
		entries = this.onMenuNodeOutputs( entries );

	if(!entries.length)
		return;

	var menu = LiteGraph.createContextualMenu(entries, {event: e, callback: innerClicked, from: prevMenu}, refWindow);

	function innerClicked( v, e, prev )
	{
		if(!node)
			return;

		if(v.callback)
			v.callback.call(that, node, v, e, prev);

		if(!v.value)
			return;

		var value = v.value[1];

		if(value && (value.constructor === Object || value.constructor === Array)) //submenu why?
		{
			var entries = [];
			for(var i in value)
				entries.push({content: i, value: value[i]});
			LiteGraph.createContextualMenu(entries, {event: e, callback: innerClicked, from: prevMenu});		
			return false;
		}
		else
			node.addOutput(v.value[0], v.value[1], v.value[2]);
	}

	return false;
}

LGraphCanvas.onShowMenuNodeProperties = function(node,e, prevMenu)
{
	if(!node || !node.properties)
		return;

	var that = this;
	var refWindow = this.getCanvasWindow();

	var entries = [];
		for (var i in node.properties)
			entries.push({content: "<span class='propertyName'>" + i + "</span>" + "<span class='propertyValue'>" + (node.properties[i] || " ") + "</span>", value: i});
	if(!entries.length)
		return;

	var menu = LiteGraph.createContextualMenu(entries, {event: e, callback: innerClicked, from: prevMenu},refWindow);

	function innerClicked( v, e, prev )
	{
		if(!node)
			return;
		that.showEditPropertyValue( node, v.value, { event: e });
	}

	return false;
}

LGraphCanvas.prototype.showEditPropertyValue = function( node, property, options )
{
	if(!node || node.properties[ property ] === undefined )
		return;

	options = options || {};
	var that = this;

	var dialog = document.createElement("div");
	dialog.className = "graphdialog";
	dialog.innerHTML = "<span class='name'>" + property + "</span><input autofocus type='text' class='value'/><button>OK</button>";
	var input = dialog.querySelector("input");
	input.value = node.properties[ property ] || "";
	input.addEventListener("keydown", function(e){
		if(e.keyCode != 13)
			return;
		inner();
		e.preventDefault();
		e.stopPropagation();
	});

	var rect = this.canvas.getClientRects()[0];
	var offsetx = -20;
	var offsety = -20;
	if(rect)
	{
		offsetx -= rect.left;
		offsety -= rect.top;
	}

	if( options.event )
	{
		dialog.style.left = (options.event.pageX + offsetx) + "px";
		dialog.style.top = (options.event.pageY + offsety)+ "px";
	}
	else
	{
		dialog.style.left = (this.canvas.width * 0.5 + offsetx) + "px";
		dialog.style.top = (this.canvas.height * 0.5 + offsety) + "px";
	}

	var button = dialog.querySelector("button");
	button.addEventListener("click", inner );

	this.canvas.parentNode.appendChild( dialog );


	function inner()
	{
		var value = input.value;
		if(typeof( node.properties[ property ] ) == "number")
			node.properties[ property ] = Number(value);
		else
			node.properties[ property ] = value;
		dialog.parentNode.removeChild( dialog );
		node.setDirtyCanvas(true,true);
	}
}

LGraphCanvas.onMenuNodeCollapse = function(node)
{
	node.flags.collapsed = !node.flags.collapsed;
	node.setDirtyCanvas(true,true);
}

LGraphCanvas.onMenuNodePin = function(node)
{
	node.pin();
}

LGraphCanvas.onMenuNodeMode = function(node, e, prevMenu)
{
	LiteGraph.createContextualMenu(["Always","On Event","Never"], {event: e, callback: innerClicked, from: prevMenu});

	function innerClicked(v)
	{
		if(!node)
			return;
		switch(v)
		{
			case "On Event": node.mode = LiteGraph.ON_EVENT; break;
			case "Never": node.mode = LiteGraph.NEVER; break;
			case "Always": 
			default:
				node.mode = LiteGraph.ALWAYS; break;
		}
	}

	return false;
}

LGraphCanvas.onMenuNodeColors = function(node, e, prevMenu)
{
	var values = [];
	for(var i in LGraphCanvas.nodeColors)
	{
		var color = LGraphCanvas.nodeColors[i];
		var value = {value:i, content:"<span style='display: block; color:"+color.color+"; background-color:"+color.bgcolor+"'>"+i+"</span>"};
		values.push(value);
	}
	LiteGraph.createContextualMenu(values, {event: e, callback: innerClicked, from: prevMenu});

	function innerClicked(v)
	{
		if(!node) return;
		var color = LGraphCanvas.nodeColors[v.value];
		if(color)
		{
			node.color = color.color;
			node.bgcolor = color.bgcolor;
			node.setDirtyCanvas(true);
		}
	}

	return false;
}

LGraphCanvas.onMenuNodeShapes = function(node,e)
{
	LiteGraph.createContextualMenu(["box","round"], {event: e, callback: innerClicked});

	function innerClicked(v)
	{
		if(!node) return;
		node.shape = v;
		node.setDirtyCanvas(true);
	}

	return false;
}

LGraphCanvas.onMenuNodeRemove = function(node)
{
	if(node.removable == false) return;
	node.graph.remove(node);
	node.setDirtyCanvas(true,true);
}

LGraphCanvas.onMenuNodeClone = function(node)
{
	if(node.clonable == false) return;
	var newnode = node.clone();
	if(!newnode) return;
	newnode.pos = [node.pos[0]+5,node.pos[1]+5];
	node.graph.add(newnode);
	node.setDirtyCanvas(true,true);
}

LGraphCanvas.nodeColors = {
	"red": { color:"#FAA", bgcolor:"#A44" },
	"green": { color:"#AFA", bgcolor:"#4A4" },
	"blue": { color:"#AAF", bgcolor:"#44A" },
	"white": { color:"#FFF", bgcolor:"#AAA" }
};

LGraphCanvas.prototype.getCanvasMenuOptions = function()
{
	var options = null;
	if(this.getMenuOptions)
		options = this.getMenuOptions();
	else
	{
		options = [
			{content:"Add Node", isMenu: true, callback: LGraphCanvas.onMenuAdd }
			//{content:"Collapse All", callback: LGraphCanvas.onMenuCollapseAll }
		];

		if(this._graphStack && this._graphStack.length > 0)
			options = [{content:"Close subgraph", callback: this.closeSubgraph.bind(this) },null].concat(options);
	}

	if(this.getExtraMenuOptions)
	{
		var extra = this.getExtraMenuOptions(this,options);
		if(extra)
			options = options.concat( extra );
	}

	return options;
}

LGraphCanvas.prototype.getNodeMenuOptions = function(node)
{
	var options = null;

	if(node.getMenuOptions)
		options = node.getMenuOptions(this);
	else
		options = [
			{content:"Inputs", isMenu: true, disabled:true, callback: LGraphCanvas.showMenuNodeInputs },
			{content:"Outputs", isMenu: true, disabled:true, callback: LGraphCanvas.showMenuNodeOutputs },
			null,
			{content:"Properties", isMenu: true, callback: LGraphCanvas.onShowMenuNodeProperties },
			null,
			{content:"Mode", isMenu: true, callback: LGraphCanvas.onMenuNodeMode },
			{content:"Collapse", callback: LGraphCanvas.onMenuNodeCollapse },
			{content:"Pin", callback: LGraphCanvas.onMenuNodePin },
			{content:"Colors", isMenu: true, callback: LGraphCanvas.onMenuNodeColors },
			{content:"Shapes", isMenu: true, callback: LGraphCanvas.onMenuNodeShapes },
			null
		];

	if(node.getExtraMenuOptions)
	{
		var extra = node.getExtraMenuOptions(this);
		if(extra)
		{
			extra.push(null);
			options = extra.concat( options );
		}
	}

	if( node.clonable !== false )
			options.push({content:"Clone", callback: LGraphCanvas.onMenuNodeClone });
	if( node.removable !== false )
			options.push(null,{content:"Remove", callback: LGraphCanvas.onMenuNodeRemove });

	if(node.onGetInputs)
	{
		var inputs = node.onGetInputs();
		if(inputs && inputs.length)
			options[0].disabled = false;
	}

	if(node.onGetOutputs)
	{
		var outputs = node.onGetOutputs();
		if(outputs && outputs.length )
			options[1].disabled = false;
	}

	return options;
}

LGraphCanvas.prototype.processContextualMenu = function(node, event)
{
	var that = this;
	var win = this.getCanvasWindow();

	var menuInfo = null;
	var options = {event: event, callback: innerOptionClicked};

	//check if mouse is in input
	var slot = null;
	if(node)
		slot = node.getSlotInPosition( event.canvasX, event.canvasY );

	if(slot)
	{
		menuInfo = slot.locked ? [ "Cannot remove" ] : { "Remove Slot": slot };
		options.title = slot.input ? slot.input.type : slot.output.type;
		if(slot.input && slot.input.type == LiteGraph.EVENT)
			options.title = "Event";
	}
	else
		menuInfo = node ? this.getNodeMenuOptions(node) : this.getCanvasMenuOptions();


	//show menu
	if(!menuInfo)
		return;

	var menu = LiteGraph.createContextualMenu( menuInfo, options, win);

	function innerOptionClicked(v,e)
	{
		if(!v)
			return;

		if(v == slot)
		{
			if(v.input)
				node.removeInput( slot.slot );
			else if(v.output)
				node.removeOutput( slot.slot );
			return;
		}

		if(v.callback)
			return v.callback.call(that, node, e, menu, that, event );
	}
}






//API *************************************************
//function roundRect(ctx, x, y, width, height, radius, radiusLow) {
CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius, radiusLow) {
  if ( radius === undefined ) {
    radius = 5;
  }

  if(radiusLow === undefined)
	 radiusLow  = radius;

  this.beginPath();
  this.moveTo(x + radius, y);
  this.lineTo(x + width - radius, y);
  this.quadraticCurveTo(x + width, y, x + width, y + radius);

  this.lineTo(x + width, y + height - radiusLow);
  this.quadraticCurveTo(x + width, y + height, x + width - radiusLow, y + height);
  this.lineTo(x + radiusLow, y + height);
  this.quadraticCurveTo(x, y + height, x, y + height - radiusLow);
  this.lineTo(x, y + radius);
  this.quadraticCurveTo(x, y, x + radius, y);
}

function compareObjects(a,b)
{
	for(var i in a)
		if(a[i] != b[i])
			return false;
	return true;
}

function distance(a,b)
{
	return Math.sqrt( (b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1]) );
}

function colorToString(c)
{
	return "rgba(" + Math.round(c[0] * 255).toFixed() + "," + Math.round(c[1] * 255).toFixed() + "," + Math.round(c[2] * 255).toFixed() + "," + (c.length == 4 ? c[3].toFixed(2) : "1.0") + ")";
}

function isInsideRectangle(x,y, left, top, width, height)
{
	if (left < x && (left + width) > x &&
		top < y && (top + height) > y)
		return true;	
	return false;
}

//[minx,miny,maxx,maxy]
function growBounding(bounding, x,y)
{
	if(x < bounding[0])
		bounding[0] = x;
	else if(x > bounding[2])
		bounding[2] = x;

	if(y < bounding[1])
		bounding[1] = y;
	else if(y > bounding[3])
		bounding[3] = y;
}

//point inside boundin box
function isInsideBounding(p,bb)
{
	if (p[0] < bb[0][0] || 
		p[1] < bb[0][1] || 
		p[0] > bb[1][0] || 
		p[1] > bb[1][1])
		return false;
	return true;
}

//boundings overlap, format: [start,end]
function overlapBounding(a,b)
{
	if ( a[0] > b[2] ||
		a[1] > b[3] ||
		a[2] < b[0] ||
		a[3] < b[1])
		return false;
	return true;
}

//Convert a hex value to its decimal value - the inputted hex must be in the
//	format of a hex triplet - the kind we use for HTML colours. The function
//	will return an array with three values.
function hex2num(hex) {
	if(hex.charAt(0) == "#") hex = hex.slice(1); //Remove the '#' char - if there is one.
	hex = hex.toUpperCase();
	var hexAlphabets = "0123456789ABCDEF";
	var value = new Array(3);
	var k = 0;
	var int1,int2;
	for(var i=0;i<6;i+=2) {
		int1 = hexAlphabets.indexOf(hex.charAt(i));
		int2 = hexAlphabets.indexOf(hex.charAt(i+1)); 
		value[k] = (int1 * 16) + int2;
		k++;
	}
	return(value);
}
//Give a array with three values as the argument and the function will return
//	the corresponding hex triplet.
function num2hex(triplet) {
	var hexAlphabets = "0123456789ABCDEF";
	var hex = "#";
	var int1,int2;
	for(var i=0;i<3;i++) {
		int1 = triplet[i] / 16;
		int2 = triplet[i] % 16;

		hex += hexAlphabets.charAt(int1) + hexAlphabets.charAt(int2); 
	}
	return(hex);
}

/* LiteGraph GUI elements *************************************/

LiteGraph.createContextualMenu = function(values,options, refWindow)
{
	options = options || {};
	this.options = options;

	//allows to create graph canvas in separate window
	refWindow = refWindow || window;

    if (!options.from)
        LiteGraph.closeAllContextualMenus( refWindow );
    else {
        //closing submenus
        var menus = document.querySelectorAll(".graphcontextualmenu");
        for (var key in menus) {
            if (menus[key].previousSibling == options.from)
                menus[key].closeMenu();
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

	//title
	if(options.title)
	{
		var element = document.createElement("div");
		element.className = "graphcontextualmenu-title";
		element.innerHTML = options.title;
		root.appendChild(element);
	}

	//avoid a context menu in a context menu
	root.addEventListener("contextmenu", function(e) { e.preventDefault(); return false; });

	for(var i in values)
	{
		var item = values[i];
		var element = refWindow.document.createElement("div");
		element.className = "graphmenu-entry";

		if(item == null)
		{
			element.className += " separator";
			root.appendChild(element);
			continue;
		}

		if(item.isMenu)
			element.className += " submenu";

		if(item.disabled)
			element.className += " disabled";

		if(item.className)
			element.className += " " + item.className;

		element.style.cursor = "pointer";
		element.dataset["value"] = typeof(item) == "string" ? item : item.value;
		element.data = item;
		if(typeof(item) == "string")
			element.innerHTML = values.constructor == Array ? values[i] : i;
		else
			element.innerHTML = item.content ? item.content : i;

		element.addEventListener("click", onClick );
		root.appendChild(element);
	}

	root.addEventListener("mouseover", function(e) {
		this.mouseInside = true;
	});

	root.addEventListener("mouseout", function(e) {
		//console.log("OUT!");
		//check if mouse leave a inner element
		var aux = e.relatedTarget || e.toElement;
		while(aux != this && aux != refWindow.document)
			aux = aux.parentNode;

		if(aux == this)
			return;
		this.mouseInside = false;
		if(!this.blockClose)
			this.closeMenu();
	});

	//insert before checking position
	refWindow.document.body.appendChild(root);

	var rootRect = root.getClientRects()[0];

	//link menus
	if(options.from)
	{
		options.from.blockClose = true;
	}

	var left = options.left || 0;
	var top = options.top || 0;
	if(options.event)
	{
		left = (options.event.pageX - 10);
		top = (options.event.pageY - 10);
		if(options.left)
			left = options.left;

		var rect = refWindow.document.body.getClientRects()[0];

		if(options.from)
		{
			var parentRect = options.from.getClientRects()[0];
			left = parentRect.left + parentRect.width;
		}

		
		if(left > (rect.width - rootRect.width - 10))
			left = (rect.width - rootRect.width - 10);
		if(top > (rect.height - rootRect.height - 10))
			top = (rect.height - rootRect.height - 10);
	}

	root.style.left = left + "px";
	root.style.top = top  + "px";

	function onClick(e) {
		var value = this.dataset["value"];
		var close = true;
		if(options.callback)
		{
			var ret = options.callback.call(root, this.data, e );
			if( ret !== undefined ) close = ret;
		}

		if(close)
			LiteGraph.closeAllContextualMenus( refWindow );
			//root.closeMenu();
	}

	root.closeMenu = function()
	{
		if(options.from)
		{
			options.from.blockClose = false;
			if(!options.from.mouseInside)
				options.from.closeMenu();
		}
		if(this.parentNode)
			refWindow.document.body.removeChild(this);
	};

	return root;
}

LiteGraph.closeAllContextualMenus = function( refWindow )
{
	refWindow = refWindow || window;

	var elements = refWindow.document.querySelectorAll(".graphcontextualmenu");
	if(!elements.length) return;

	var result = [];
	for(var i = 0; i < elements.length; i++)
		result.push(elements[i]);

	for(var i in result)
		if(result[i].parentNode)
			result[i].parentNode.removeChild( result[i] );
}

LiteGraph.extendClass = function ( target, origin )
{
	for(var i in origin) //copy class properties
	{
		if(target.hasOwnProperty(i))
			continue;
		target[i] = origin[i];
	}

	if(origin.prototype) //copy prototype properties
		for(var i in origin.prototype) //only enumerables
		{
			if(!origin.prototype.hasOwnProperty(i)) 
				continue;

			if(target.prototype.hasOwnProperty(i)) //avoid overwritting existing ones
				continue;

			//copy getters 
			if(origin.prototype.__lookupGetter__(i))
				target.prototype.__defineGetter__(i, origin.prototype.__lookupGetter__(i));
			else 
				target.prototype[i] = origin.prototype[i];

			//and setters
			if(origin.prototype.__lookupSetter__(i))
				target.prototype.__defineSetter__(i, origin.prototype.__lookupSetter__(i));
		}
} 

/*
LiteGraph.createNodetypeWrapper = function( classObject )
{
	//create Nodetype object
}
//LiteGraph.registerNodeType("scene/global", LGraphGlobal );
*/

if( !window["requestAnimationFrame"] )
{
	window.requestAnimationFrame = window.webkitRequestAnimationFrame ||
		  window.mozRequestAnimationFrame    ||
		  (function( callback ){
			window.setTimeout(callback, 1000 / 60);
		  });
}



//basic nodes
(function(){


//Subgraph: a node that contains a graph
function Subgraph()
{
	var that = this;
	this.size = [120,60];

	//create inner graph
	this.subgraph = new LGraph();
	this.subgraph._subgraphNode = this;
	this.subgraph._isSubgraph = true;

	this.subgraph.onGlobalInputAdded = this.onSubgraphNewGlobalInput.bind(this);
	this.subgraph.onGlobalInputRenamed = this.onSubgraphRenamedGlobalInput.bind(this);
	this.subgraph.onGlobalInputTypeChanged = this.onSubgraphTypeChangeGlobalInput.bind(this);

	this.subgraph.onGlobalOutputAdded = this.onSubgraphNewGlobalOutput.bind(this);
	this.subgraph.onGlobalOutputRenamed = this.onSubgraphRenamedGlobalOutput.bind(this);
	this.subgraph.onGlobalOutputTypeChanged = this.onSubgraphTypeChangeGlobalOutput.bind(this);
	

	this.bgcolor = "#940";
}

Subgraph.title = "Subgraph";
Subgraph.desc = "Graph inside a node";

Subgraph.prototype.onSubgraphNewGlobalInput = function(name, type)
{
	//add input to the node
	this.addInput(name, type);
}

Subgraph.prototype.onSubgraphRenamedGlobalInput = function(oldname, name)
{
	var slot = this.findInputSlot( oldname );
	if(slot == -1)
		return;
	var info = this.getInputInfo(slot);
	info.name = name;
}

Subgraph.prototype.onSubgraphTypeChangeGlobalInput = function(name, type)
{
	var slot = this.findInputSlot( name );
	if(slot == -1)
		return;
	var info = this.getInputInfo(slot);
	info.type = type;
}


Subgraph.prototype.onSubgraphNewGlobalOutput = function(name, type)
{
	//add output to the node
	this.addOutput(name, type);
}


Subgraph.prototype.onSubgraphRenamedGlobalOutput = function(oldname, name)
{
	var slot = this.findOutputSlot( oldname );
	if(slot == -1)
		return;
	var info = this.getOutputInfo(slot);
	info.name = name;
}

Subgraph.prototype.onSubgraphTypeChangeGlobalOutput = function(name, type)
{
	var slot = this.findOutputSlot( name );
	if(slot == -1)
		return;
	var info = this.getOutputInfo(slot);
	info.type = type;
}


Subgraph.prototype.getExtraMenuOptions = function(graphcanvas)
{
	var that = this;
	return [ {content:"Open", callback: 
		function() { 
			graphcanvas.openSubgraph( that.subgraph );
		}
	}];
}

Subgraph.prototype.onExecute = function()
{
	//send inputs to subgraph global inputs
	if(this.inputs)
		for(var i = 0; i < this.inputs.length; i++)
		{
			var input = this.inputs[i];
			var value = this.getInputData(i);
			this.subgraph.setGlobalInputData( input.name, value );
		}

	//execute
	this.subgraph.runStep();

	//send subgraph global outputs to outputs
	if(this.outputs)
		for(var i = 0; i < this.outputs.length; i++)
		{
			var output = this.outputs[i];
			var value = this.subgraph.getGlobalOutputData( output.name );
			this.setOutputData(i, value);
		}
}

Subgraph.prototype.configure = function(o)
{
	LGraphNode.prototype.configure.call(this, o);
	//this.subgraph.configure(o.graph);
}

Subgraph.prototype.serialize = function()
{
	var data = LGraphNode.prototype.serialize.call(this);
	data.subgraph = this.subgraph.serialize();
	return data;
}

Subgraph.prototype.clone = function()
{
	var node = LiteGraph.createNode(this.type);
	var data = this.serialize();
	delete data["id"];
	delete data["inputs"];
	delete data["outputs"];
	node.configure(data);
	return node;
}


LiteGraph.registerNodeType("graph/subgraph", Subgraph );


//Input for a subgraph
function GlobalInput()
{

	//random name to avoid problems with other outputs when added
	var inputName = "input_" + (Math.random()*1000).toFixed();

	this.addOutput(inputName, null );

	this.properties = { name: inputName, type: null };

	var that = this;

	Object.defineProperty( this.properties, "name", {
		get: function() { 
			return inputName;
		},
		set: function(v) {
			if(v == "")
				return;

			var info = that.getOutputInfo(0);
			if(info.name == v)
				return;
			info.name = v;
			if(that.graph)
				that.graph.renameGlobalInput(inputName, v);
			inputName = v;
		},
		enumerable: true
	});

	Object.defineProperty( this.properties, "type", {
		get: function() { return that.outputs[0].type; },
		set: function(v) { 
			that.outputs[0].type = v; 
			if(that.graph)
				that.graph.changeGlobalInputType(inputName, that.outputs[0].type);
		},
		enumerable: true
	});
}

GlobalInput.title = "Input";
GlobalInput.desc = "Input of the graph";

//When added to graph tell the graph this is a new global input
GlobalInput.prototype.onAdded = function()
{
	this.graph.addGlobalInput( this.properties.name, this.properties.type );
}

GlobalInput.prototype.onExecute = function()
{
	var name = this.properties.name;

	//read from global input
	var	data = this.graph.globalInputs[name];
	if(!data) return;

	//put through output
	this.setOutputData(0,data.value);
}

LiteGraph.registerNodeType("graph/input", GlobalInput);



//Output for a subgraph
function GlobalOutput()
{
	//random name to avoid problems with other outputs when added
	var outputName = "output_" + (Math.random()*1000).toFixed();

	this.addInput(outputName, null);

	this.properties = {name: outputName, type: null };

	var that = this;

	Object.defineProperty(this.properties, "name", {
		get: function() { 
			return outputName;
		},
		set: function(v) {
			if(v == "")
				return;

			var info = that.getInputInfo(0);
			if(info.name == v)
				return;
			info.name = v;
			if(that.graph)
				that.graph.renameGlobalOutput(outputName, v);
			outputName = v;
		},
		enumerable: true
	});

	Object.defineProperty(this.properties, "type", {
		get: function() { return that.inputs[0].type; },
		set: function(v) { 
			that.inputs[0].type = v;
			if(that.graph)
				that.graph.changeGlobalInputType( outputName, that.inputs[0].type );
		},
		enumerable: true
	});
}

GlobalOutput.title = "Ouput";
GlobalOutput.desc = "Output of the graph";

GlobalOutput.prototype.onAdded = function()
{
	var name = this.graph.addGlobalOutput( this.properties.name, this.properties.type );
}

GlobalOutput.prototype.onExecute = function()
{
	this.graph.setGlobalOutputData( this.properties.name, this.getInputData(0) );
}

LiteGraph.registerNodeType("graph/output", GlobalOutput);



//Constant
function Constant()
{
	this.addOutput("value","number");
	this.addProperty( "value", 1.0 );
	this.editable = { property:"value", type:"number" };
}

Constant.title = "Const";
Constant.desc = "Constant value";


Constant.prototype.setValue = function(v)
{
	if( typeof(v) == "string") v = parseFloat(v);
	this.properties["value"] = v;
	this.setDirtyCanvas(true);
};

Constant.prototype.onExecute = function()
{
	this.setOutputData(0, parseFloat( this.properties["value"] ) );
}

Constant.prototype.onDrawBackground = function(ctx)
{
	//show the current value
	this.outputs[0].label = this.properties["value"].toFixed(3);
}

Constant.prototype.onWidget = function(e,widget)
{
	if(widget.name == "value")
		this.setValue(widget.value);
}

LiteGraph.registerNodeType("basic/const", Constant);


//Watch a value in the editor
function Watch()
{
	this.size = [60,20];
	this.addInput("value",0,{label:""});
	this.addOutput("value",0,{label:""});
	this.addProperty( "value", "" );
}

Watch.title = "Watch";
Watch.desc = "Show value of input";

Watch.prototype.onExecute = function()
{
	this.properties.value = this.getInputData(0);
	this.setOutputData(0, this.properties.value);
}

Watch.prototype.onDrawBackground = function(ctx)
{
	//show the current value
	if(this.inputs[0] && this.properties["value"] != null)	
	{
		if (this.properties["value"].constructor === Number )
			this.inputs[0].label = this.properties["value"].toFixed(3);
		else
		{
			var str = this.properties["value"];
			if(str && str.length) //convert typed to array
				str = Array.prototype.slice.call(str).join(",");
			this.inputs[0].label = str;
		}
	}
}

LiteGraph.registerNodeType("basic/watch", Watch);


//Show value inside the debug console
function Console()
{
	this.mode = LiteGraph.ON_EVENT;
	this.size = [60,20];
	this.addProperty( "msg", "" );
	this.addInput("log", LiteGraph.EVENT);
	this.addInput("msg",0);
}

Console.title = "Console";
Console.desc = "Show value inside the console";

Console.prototype.onAction = function(action, param)
{
	if(action == "log")
		console.log( param );
	else if(action == "warn")
		console.warn( param );
	else if(action == "error")
		console.error( param );
}

Console.prototype.onExecute = function()
{
	var msg = this.getInputData(0);
	if(msg !== null)
		this.properties.msg = msg;
	console.log(msg);
}

Console.prototype.onGetInputs = function()
{
	return [["log",LiteGraph.ACTION],["warn",LiteGraph.ACTION],["error",LiteGraph.ACTION]];
}

LiteGraph.registerNodeType("basic/console", Console );


})();
//widgets
(function(){

	/* Button ****************/

	function WidgetButton()
	{
		this.addOutput( "clicked", LiteGraph.EVENT );
		this.addProperty( "text","" );
		this.addProperty( "font","40px Arial" );
		this.addProperty( "message", "" );
		this.size = [64,84];
	}

	WidgetButton.title = "Button";
	WidgetButton.desc = "Triggers an event";

	WidgetButton.prototype.onDrawForeground = function(ctx)
	{
		if(this.flags.collapsed)
			return;

		//ctx.font = "40px Arial";
		//ctx.textAlign = "center";
		ctx.fillStyle = "black";
		ctx.fillRect(1,1,this.size[0] - 3, this.size[1] - 3);
		ctx.fillStyle = "#AAF";
		ctx.fillRect(0,0,this.size[0] - 3, this.size[1] - 3);
		ctx.fillStyle = this.clicked ? "white" : (this.mouseOver ? "#668" : "#334");
		ctx.fillRect(1,1,this.size[0] - 4, this.size[1] - 4);

		if( this.properties.text || this.properties.text === 0 )
		{
			ctx.textAlign = "center";
			ctx.fillStyle = this.clicked ? "black" : "white";
			if( this.properties.font )
				ctx.font = this.properties.font;
			ctx.fillText(this.properties.text, this.size[0] * 0.5, this.size[1] * 0.85 );
			ctx.textAlign = "left";
		}
	}

	WidgetButton.prototype.onMouseDown = function(e, localPos)
	{
		if(localPos[0] > 1 && localPos[1] > 1 && localPos[0] < (this.size[0] - 2) && localPos[1] < (this.size[1] - 2) )
		{
			this.clicked = true;
			this.trigger( "clicked", this.properties.message );
			return true;
		}
	}

	WidgetButton.prototype.onMouseUp = function(e)
	{
		this.clicked = false;
	}


	LiteGraph.registerNodeType("widget/button", WidgetButton );

	/* Knob ****************/

	function WidgetKnob()
	{
		this.addOutput("",'number');
		this.size = [64,84];
		this.properties = {min:0,max:1,value:0.5,wcolor:"#7AF",size:50};
	}

	WidgetKnob.title = "Knob";
	WidgetKnob.desc = "Circular controller";
	WidgetKnob.widgets = [{name:"increase",text:"+",type:"minibutton"},{name:"decrease",text:"-",type:"minibutton"}];


	WidgetKnob.prototype.onAdded = function()
	{
		this.value = (this.properties["value"] - this.properties["min"]) / (this.properties["max"] - this.properties["min"]);

		this.imgbg = this.loadImage("imgs/knobBg.png");
		this.imgfg = this.loadImage("imgs/knobFg.png");
	}

	WidgetKnob.prototype.onDrawImageKnob = function(ctx)
	{
		if(!this.imgfg || !this.imgfg.width) return;

		var d = this.imgbg.width*0.5;
		var scale = this.size[0] / this.imgfg.width;

		ctx.save();
			ctx.translate(0,20);
			ctx.scale(scale,scale);
			ctx.drawImage(this.imgbg,0,0);
			//ctx.drawImage(this.imgfg,0,20);

			ctx.translate(d,d);
			ctx.rotate(this.value * (Math.PI*2) * 6/8 + Math.PI * 10/8);
			//ctx.rotate(this.value * (Math.PI*2));
			ctx.translate(-d,-d);
			ctx.drawImage(this.imgfg,0,0);

		ctx.restore();

		if(this.title)
		{
			ctx.font = "bold 16px Criticized,Tahoma";
			ctx.fillStyle="rgba(100,100,100,0.8)";
			ctx.textAlign = "center";
			ctx.fillText(this.title.toUpperCase(), this.size[0] * 0.5, 18 );
			ctx.textAlign = "left";
		}
	}

	WidgetKnob.prototype.onDrawVectorKnob = function(ctx)
	{
		if(!this.imgfg || !this.imgfg.width) return;

		//circle around
		ctx.lineWidth = 1;
		ctx.strokeStyle= this.mouseOver ? "#FFF" : "#AAA";
		ctx.fillStyle="#000";
		ctx.beginPath();
		ctx.arc(this.size[0] * 0.5,this.size[1] * 0.5 + 10,this.properties.size * 0.5,0,Math.PI*2,true);
		ctx.stroke();

		if(this.value > 0)
		{
			ctx.strokeStyle=this.properties["wcolor"];
			ctx.lineWidth = (this.properties.size * 0.2);
			ctx.beginPath();
			ctx.arc(this.size[0] * 0.5,this.size[1] * 0.5 + 10,this.properties.size * 0.35,Math.PI * -0.5 + Math.PI*2 * this.value,Math.PI * -0.5,true);
			ctx.stroke();
			ctx.lineWidth = 1;
		}

		ctx.font = (this.properties.size * 0.2) + "px Arial";
		ctx.fillStyle="#AAA";
		ctx.textAlign = "center";

		var str = this.properties["value"];
		if(typeof(str) == 'number')
			str = str.toFixed(2);

		ctx.fillText(str,this.size[0] * 0.5,this.size[1]*0.65);
		ctx.textAlign = "left";
	}

	WidgetKnob.prototype.onDrawForeground = function(ctx)
	{
		this.onDrawImageKnob(ctx);
	}

	WidgetKnob.prototype.onExecute = function()
	{
		this.setOutputData(0, this.properties["value"] );

		this.boxcolor = colorToString([this.value,this.value,this.value]);
	}

	WidgetKnob.prototype.onMouseDown = function(e)
	{
		if(!this.imgfg || !this.imgfg.width) return;

		//this.center = [this.imgbg.width * 0.5, this.imgbg.height * 0.5 + 20];
		//this.radius = this.imgbg.width * 0.5;
		this.center = [this.size[0] * 0.5, this.size[1] * 0.5 + 20];
		this.radius = this.size[0] * 0.5;

		if(e.canvasY - this.pos[1] < 20 || distance([e.canvasX,e.canvasY],[this.pos[0] + this.center[0],this.pos[1] + this.center[1]]) > this.radius)
			return false;

		this.oldmouse = [ e.canvasX - this.pos[0], e.canvasY - this.pos[1] ];
		this.captureInput(true);

		/*
		var tmp = this.localToScreenSpace(0,0);
		this.trace(tmp[0] + "," + tmp[1]); */
		return true;
	}

	WidgetKnob.prototype.onMouseMove = function(e)
	{
		if(!this.oldmouse) return;

		var m = [ e.canvasX - this.pos[0], e.canvasY - this.pos[1] ];

		var v = this.value;
		v -= (m[1] - this.oldmouse[1]) * 0.01;
		if(v > 1.0) v = 1.0;
		else if(v < 0.0) v = 0.0;

		this.value = v;
		this.properties["value"] = this.properties["min"] + (this.properties["max"] - this.properties["min"]) * this.value;

		this.oldmouse = m;
		this.setDirtyCanvas(true);
	}

	WidgetKnob.prototype.onMouseUp = function(e)
	{
		if(this.oldmouse)
		{
			this.oldmouse = null;
			this.captureInput(false);
		}
	}

	WidgetKnob.prototype.onMouseLeave = function(e)
	{
		//this.oldmouse = null;
	}
	
	WidgetKnob.prototype.onWidget = function(e,widget)
	{
		if(widget.name=="increase")
			this.onPropertyChange("size", this.properties.size + 10);
		else if(widget.name=="decrease")
			this.onPropertyChange("size", this.properties.size - 10);
	}

	WidgetKnob.prototype.onPropertyChange = function(name,value)
	{
		if(name=="wcolor")
			this.properties[name] = value;
		else if(name=="size")
		{
			value = parseInt(value);
			this.properties[name] = value;
			this.size = [value+4,value+24];
			this.setDirtyCanvas(true,true);
		}
		else if(name=="min" || name=="max" || name=="value")
		{
			this.properties[name] = parseFloat(value);
		}
		else
			return false;
		return true;
	}

	LiteGraph.registerNodeType("widget/knob", WidgetKnob);

	//Widget H SLIDER
	function WidgetHSlider()
	{
		this.size = [160,26];
		this.addOutput("",'number');
		this.properties = {wcolor:"#7AF",min:0,max:1,value:0.5};
	}

	WidgetHSlider.title = "H.Slider";
	WidgetHSlider.desc = "Linear slider controller";

	WidgetHSlider.prototype.onInit = function()
	{
		this.value = 0.5;
		this.imgfg = this.loadImage("imgs/sliderFg.png");
	}

	WidgetHSlider.prototype.onDrawVectorial = function(ctx)
	{
		if(!this.imgfg || !this.imgfg.width) return;

		//border
		ctx.lineWidth = 1;
		ctx.strokeStyle= this.mouseOver ? "#FFF" : "#AAA";
		ctx.fillStyle="#000";
		ctx.beginPath();
		ctx.rect(2,0,this.size[0]-4,20);
		ctx.stroke();

		ctx.fillStyle=this.properties["wcolor"];
		ctx.beginPath();
		ctx.rect(2+(this.size[0]-4-20)*this.value,0, 20,20);
		ctx.fill();
	}

	WidgetHSlider.prototype.onDrawImage = function(ctx)
	{
		if(!this.imgfg || !this.imgfg.width) 
			return;

		//border
		ctx.lineWidth = 1;
		ctx.fillStyle="#000";
		ctx.fillRect(2,9,this.size[0]-4,2);

		ctx.strokeStyle= "#333";
		ctx.beginPath();
		ctx.moveTo(2,9);
		ctx.lineTo(this.size[0]-4,9);
		ctx.stroke();

		ctx.strokeStyle= "#AAA";
		ctx.beginPath();
		ctx.moveTo(2,11);
		ctx.lineTo(this.size[0]-4,11);
		ctx.stroke();

		ctx.drawImage(this.imgfg, 2+(this.size[0]-4)*this.value - this.imgfg.width*0.5,-this.imgfg.height*0.5 + 10);
	},

	WidgetHSlider.prototype.onDrawForeground = function(ctx)
	{
		this.onDrawImage(ctx);
	}

	WidgetHSlider.prototype.onExecute = function()
	{
		this.properties["value"] = this.properties["min"] + (this.properties["max"] - this.properties["min"]) * this.value;
		this.setOutputData(0, this.properties["value"] );
		this.boxcolor = colorToString([this.value,this.value,this.value]);
	}

	WidgetHSlider.prototype.onMouseDown = function(e)
	{
		if(e.canvasY - this.pos[1] < 0)
			return false;

		this.oldmouse = [ e.canvasX - this.pos[0], e.canvasY - this.pos[1] ];
		this.captureInput(true);
		return true;
	}

	WidgetHSlider.prototype.onMouseMove = function(e)
	{
		if(!this.oldmouse) return;

		var m = [ e.canvasX - this.pos[0], e.canvasY - this.pos[1] ];

		var v = this.value;
		var delta = (m[0] - this.oldmouse[0]);
		v += delta / this.size[0];
		if(v > 1.0) v = 1.0;
		else if(v < 0.0) v = 0.0;

		this.value = v;

		this.oldmouse = m;
		this.setDirtyCanvas(true);
	}

	WidgetHSlider.prototype.onMouseUp = function(e)
	{
		this.oldmouse = null;
		this.captureInput(false);
	}

	WidgetHSlider.prototype.onMouseLeave = function(e)
	{
		//this.oldmouse = null;
	}

	WidgetHSlider.prototype.onPropertyChange = function(name,value)
	{
		if(name=="wcolor")
			this.properties[name] = value;
		else
			return false;
		return true;
	}

	LiteGraph.registerNodeType("widget/hslider", WidgetHSlider );


	function WidgetProgress()
	{
		this.size = [160,26];
		this.addInput("",'number');
		this.properties = {min:0,max:1,value:0,wcolor:"#AAF"};
	}

	WidgetProgress.title = "Progress";
	WidgetProgress.desc = "Shows data in linear progress";

	WidgetProgress.prototype.onExecute = function()
	{
		var v = this.getInputData(0);
		if( v != undefined )
			this.properties["value"] = v;
	}

	WidgetProgress.prototype.onDrawForeground = function(ctx)
	{
		//border
		ctx.lineWidth = 1;
		ctx.fillStyle=this.properties.wcolor;
		var v = (this.properties.value - this.properties.min) / (this.properties.max - this.properties.min);
		v = Math.min(1,v);
		v = Math.max(0,v);
		ctx.fillRect(2,2,(this.size[0]-4)*v,this.size[1]-4);
	}

	LiteGraph.registerNodeType("widget/progress", WidgetProgress);


	/*
	LiteGraph.registerNodeType("widget/kpad",{
		title: "KPad",
		desc: "bidimensional slider",
		size: [200,200],
		outputs: [["x",'number'],["y",'number']],
		properties:{x:0,y:0,borderColor:"#333",bgcolorTop:"#444",bgcolorBottom:"#000",shadowSize:1, borderRadius:2},

		createGradient: function(ctx)
		{
			this.lineargradient = ctx.createLinearGradient(0,0,0,this.size[1]);  
			this.lineargradient.addColorStop(0,this.properties["bgcolorTop"]);  
			this.lineargradient.addColorStop(1,this.properties["bgcolorBottom"]);
		},

		onDrawBackground: function(ctx)
		{
			if(!this.lineargradient)
				this.createGradient(ctx);

			ctx.lineWidth = 1;
			ctx.strokeStyle = this.properties["borderColor"];
			//ctx.fillStyle = "#ebebeb";
			ctx.fillStyle = this.lineargradient;

			ctx.shadowColor = "#000";
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = this.properties["shadowSize"];
			ctx.roundRect(0,0,this.size[0],this.size[1],this.properties["shadowSize"]);
			ctx.fill();
			ctx.shadowColor = "rgba(0,0,0,0)";
			ctx.stroke();

			ctx.fillStyle = "#A00";
			ctx.fillRect(this.size[0] * this.properties["x"] - 5, this.size[1] * this.properties["y"] - 5,10,10);
		},

		onWidget: function(e,widget)
		{
			if(widget.name == "update")
			{
				this.lineargradient = null;
				this.setDirtyCanvas(true);
			}
		},

		onExecute: function()
		{
			this.setOutputData(0, this.properties["x"] );
			this.setOutputData(1, this.properties["y"] );
		},

		onMouseDown: function(e)
		{
			if(e.canvasY - this.pos[1] < 0)
				return false;

			this.oldmouse = [ e.canvasX - this.pos[0], e.canvasY - this.pos[1] ];
			this.captureInput(true);
			return true;
		},

		onMouseMove: function(e)
		{
			if(!this.oldmouse) return;

			var m = [ e.canvasX - this.pos[0], e.canvasY - this.pos[1] ];
			
			this.properties.x = m[0] / this.size[0];
			this.properties.y = m[1] / this.size[1];

			if(this.properties.x > 1.0) this.properties.x = 1.0;
			else if(this.properties.x < 0.0) this.properties.x = 0.0;

			if(this.properties.y > 1.0) this.properties.y = 1.0;
			else if(this.properties.y < 0.0) this.properties.y = 0.0;

			this.oldmouse = m;
			this.setDirtyCanvas(true);
		},

		onMouseUp: function(e)
		{
			if(this.oldmouse)
			{
				this.oldmouse = null;
				this.captureInput(false);
			}
		},

		onMouseLeave: function(e)
		{
			//this.oldmouse = null;
		}
	});



	LiteGraph.registerNodeType("widget/button", {
		title: "Button",
		desc: "A send command button",

		widgets: [{name:"test",text:"Test Button",type:"button"}],
		size: [100,40],
		properties:{text:"clickme",command:"",color:"#7AF",bgcolorTop:"#f0f0f0",bgcolorBottom:"#e0e0e0",fontsize:"16"},
		outputs:[["M","module"]],

		createGradient: function(ctx)
		{
			this.lineargradient = ctx.createLinearGradient(0,0,0,this.size[1]);  
			this.lineargradient.addColorStop(0,this.properties["bgcolorTop"]);  
			this.lineargradient.addColorStop(1,this.properties["bgcolorBottom"]);
		},

		drawVectorShape: function(ctx)
		{
			ctx.fillStyle = this.mouseOver ? this.properties["color"] : "#AAA";

			if(this.clicking) 
				ctx.fillStyle = "#FFF";

			ctx.strokeStyle = "#AAA";
			ctx.roundRect(5,5,this.size[0] - 10,this.size[1] - 10,4);
			ctx.stroke();

			if(this.mouseOver)
				ctx.fill();

			//ctx.fillRect(5,20,this.size[0] - 10,this.size[1] - 30);

			ctx.fillStyle = this.mouseOver ? "#000" : "#AAA";
			ctx.font = "bold " + this.properties["fontsize"] + "px Criticized,Tahoma";
			ctx.textAlign = "center";
			ctx.fillText(this.properties["text"],this.size[0]*0.5,this.size[1]*0.5 + 0.5*parseInt(this.properties["fontsize"]));
			ctx.textAlign = "left";
		},

		drawBevelShape: function(ctx)
		{
			ctx.shadowColor = "#000";
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = this.properties["shadowSize"];

			if(!this.lineargradient)
				this.createGradient(ctx);

			ctx.fillStyle = this.mouseOver ? this.properties["color"] : this.lineargradient;
			if(this.clicking) 
				ctx.fillStyle = "#444";

			ctx.strokeStyle = "#FFF";
			ctx.roundRect(5,5,this.size[0] - 10,this.size[1] - 10,4);
			ctx.fill();
			ctx.shadowColor = "rgba(0,0,0,0)";
			ctx.stroke();

			ctx.fillStyle = this.mouseOver ? "#000" : "#444";
			ctx.font = "bold " + this.properties["fontsize"] + "px Century Gothic";
			ctx.textAlign = "center";
			ctx.fillText(this.properties["text"],this.size[0]*0.5,this.size[1]*0.5 + 0.40*parseInt(this.properties["fontsize"]));
			ctx.textAlign = "left";
		},

		onDrawForeground: function(ctx)
		{
			this.drawBevelShape(ctx);
		},

		clickButton: function()
		{
			var module = this.getOutputModule(0);
			if(this.properties["command"] && this.properties["command"] != "")
			{
				if (! module.executeAction(this.properties["command"]) )
					this.trace("Error executing action in other module");
			}
			else if(module && module.onTrigger)
			{
				module.onTrigger();  
			}
		},

		onMouseDown: function(e)
		{
			if(e.canvasY - this.pos[1] < 2)
				return false;
			this.clickButton();
			this.clicking = true;
			return true;
		},

		onMouseUp: function(e)
		{
			this.clicking = false;
		},

		onExecute: function()
		{
		},

		onWidget: function(e,widget)
		{
			if(widget.name == "test")
			{
				this.clickButton();
			}
		},

		onPropertyChange: function(name,value)
		{
			this.properties[name] = value;
			return true;
		}
	});
	*/


	function WidgetText()
	{
		this.addInputs("",0);
		this.properties = { value:"...",font:"Arial", fontsize:18, color:"#AAA", align:"left", glowSize:0, decimals:1 };
	}

	WidgetText.title = "Text";
	WidgetText.desc = "Shows the input value";
	WidgetText.widgets = [{name:"resize",text:"Resize box",type:"button"},{name:"ledText",text:"LED",type:"minibutton"},{name:"normalText",text:"Normal",type:"minibutton"}];

	WidgetText.prototype.onDrawForeground = function(ctx)
	{
		//ctx.fillStyle="#000";
		//ctx.fillRect(0,0,100,60);
		ctx.fillStyle = this.properties["color"];
		var v = this.properties["value"];

		if(this.properties["glowSize"])
		{
			ctx.shadowColor = this.properties["color"];
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = this.properties["glowSize"];
		}
		else
			ctx.shadowColor = "transparent";

		var fontsize = this.properties["fontsize"];

		ctx.textAlign = this.properties["align"];
		ctx.font = fontsize.toString() + "px " + this.properties["font"];
		this.str = typeof(v) == 'number' ? v.toFixed(this.properties["decimals"]) : v;

		if( typeof(this.str) == 'string')
		{
			var lines = this.str.split("\\n");
			for(var i in lines)
				ctx.fillText(lines[i],this.properties["align"] == "left" ? 15 : this.size[0] - 15, fontsize * -0.15 + fontsize * (parseInt(i)+1) );
		}

		ctx.shadowColor = "transparent";
		this.lastCtx = ctx;
		ctx.textAlign = "left";
	}

	WidgetText.prototype.onExecute = function()
	{
		var v = this.getInputData(0);
		if(v != null)
			this.properties["value"] = v;
		else
			this.properties["value"] = "";
		this.setDirtyCanvas(true);
	}

	WidgetText.prototype.resize = function()
	{
		if(!this.lastCtx) return;

		var lines = this.str.split("\\n");
		this.lastCtx.font = this.properties["fontsize"] + "px " + this.properties["font"];
		var max = 0;
		for(var i in lines)
		{
			var w = this.lastCtx.measureText(lines[i]).width;
			if(max < w) max = w;
		}
		this.size[0] = max + 20;
		this.size[1] = 4 + lines.length * this.properties["fontsize"];

		this.setDirtyCanvas(true);
	}

	WidgetText.prototype.onWidget = function(e,widget)
	{
		if(widget.name == "resize")
			this.resize();
		else if (widget.name == "ledText")
		{
			this.properties["font"] = "Digital";
			this.properties["glowSize"] = 4;
			this.setDirtyCanvas(true);
		}
		else if (widget.name == "normalText")
		{
			this.properties["font"] = "Arial";
			this.setDirtyCanvas(true);
		}
	}

	WidgetText.prototype.onPropertyChange = function(name,value)
	{
		this.properties[name] = value;
		this.str = typeof(value) == 'number' ? value.toFixed(3) : value;
		//this.resize();
		return true;
	}

	LiteGraph.registerNodeType("widget/text", WidgetText );


	function WidgetPanel()
	{
		this.size = [200,100];
		this.properties = {borderColor:"#ffffff",bgcolorTop:"#f0f0f0",bgcolorBottom:"#e0e0e0",shadowSize:2, borderRadius:3};
	}

	WidgetPanel.title =  "Panel";
	WidgetPanel.desc = "Non interactive panel";
	WidgetPanel.widgets = [{name:"update",text:"Update",type:"button"}];


	WidgetPanel.prototype.createGradient = function(ctx)
	{
		if(this.properties["bgcolorTop"] == "" || this.properties["bgcolorBottom"] == "")
		{
			this.lineargradient = 0;
			return;
		}

		this.lineargradient = ctx.createLinearGradient(0,0,0,this.size[1]);  
		this.lineargradient.addColorStop(0,this.properties["bgcolorTop"]);  
		this.lineargradient.addColorStop(1,this.properties["bgcolorBottom"]);
	}

	WidgetPanel.prototype.onDrawForeground = function(ctx)
	{
		if(this.lineargradient == null)
			this.createGradient(ctx);

		if(!this.lineargradient)
			return;

		ctx.lineWidth = 1;
		ctx.strokeStyle = this.properties["borderColor"];
		//ctx.fillStyle = "#ebebeb";
		ctx.fillStyle = this.lineargradient;

		if(this.properties["shadowSize"])
		{
			ctx.shadowColor = "#000";
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = this.properties["shadowSize"];
		}
		else
			ctx.shadowColor = "transparent";

		ctx.roundRect(0,0,this.size[0]-1,this.size[1]-1,this.properties["shadowSize"]);
		ctx.fill();
		ctx.shadowColor = "transparent";
		ctx.stroke();
	}

	WidgetPanel.prototype.onWidget = function(e,widget)
	{
		if(widget.name == "update")
		{
			this.lineargradient = null;
			this.setDirtyCanvas(true);
		}
	}

	LiteGraph.registerNodeType("widget/panel", WidgetPanel );

})();
(function(){

function GamepadInput()
{
	this.addOutput("leftX_axis","number");
	this.addOutput("leftY_axis","number");
	this.properties = {};
}

GamepadInput.title = "Gamepad";
GamepadInput.desc = "gets the input of the gamepad";

GamepadInput.prototype.onExecute = function()
{
	//get gamepad
	var gamepad = this.getGamepad();

	if(this.outputs)
	{
		for(var i = 0; i < this.outputs.length; i++)
		{
			var output = this.outputs[i];
			var v = null;

			if(gamepad)
			{
				switch( output.name )
				{
					case "leftAxis": v = [ gamepad.xbox.axes["lx"], gamepad.xbox.axes["ly"]]; break;
					case "rightAxis": v = [ gamepad.xbox.axes["rx"], gamepad.xbox.axes["ry"]]; break;
					case "leftX_axis": v = gamepad.xbox.axes["lx"]; break;
					case "leftY_axis": v = gamepad.xbox.axes["ly"]; break;
					case "rightX_axis": v = gamepad.xbox.axes["rx"]; break;
					case "rightY_axis": v = gamepad.xbox.axes["ry"]; break;
					case "triggerLeft": v = gamepad.xbox.axes["ltrigger"]; break;
					case "triggerRight": v = gamepad.xbox.axes["rtrigger"]; break;
					case "aButton": v = gamepad.xbox.buttons["a"] ? 1 : 0; break;
					case "bButton": v = gamepad.xbox.buttons["b"] ? 1 : 0; break;
					case "xButton": v = gamepad.xbox.buttons["x"] ? 1 : 0; break;
					case "yButton": v = gamepad.xbox.buttons["y"] ? 1 : 0; break;
					case "lbButton": v = gamepad.xbox.buttons["lb"] ? 1 : 0; break;
					case "rbButton": v = gamepad.xbox.buttons["rb"] ? 1 : 0; break;
					case "lsButton": v = gamepad.xbox.buttons["ls"] ? 1 : 0; break;
					case "rsButton": v = gamepad.xbox.buttons["rs"] ? 1 : 0; break;
					case "startButton": v = gamepad.xbox.buttons["start"] ? 1 : 0; break;
					case "backButton": v = gamepad.xbox.buttons["back"] ? 1 : 0; break;
					default: break;
				}
			}
			else
			{
				//if no gamepad is connected, output 0
				switch( output.name )
				{
					case "leftAxis":
					case "rightAxis":
						v = [0,0];
						break;
					default:
						v = 0;
				}
			}
			this.setOutputData(i,v);
		}
	}
}

GamepadInput.prototype.getGamepad = function()
{
	var getGamepads = navigator.getGamepads || navigator.webkitGetGamepads || navigator.mozGetGamepads; 
	if(!getGamepads)
		return null;
	var gamepads = getGamepads.call(navigator);
	var gamepad = null;

	for(var i = 0; i < 4; i++)
	{
		if (gamepads[i])
		{
			gamepad = gamepads[i];

			//xbox controller mapping
			var xbox = this.xboxMapping;
			if(!xbox)
				xbox = this.xboxMapping = { axes:[], buttons:{}, hat: ""};

			xbox.axes["lx"] = gamepad.axes[0];
			xbox.axes["ly"] = gamepad.axes[1];
			xbox.axes["rx"] = gamepad.axes[2];
			xbox.axes["ry"] = gamepad.axes[3];
			xbox.axes["ltrigger"] = gamepad.buttons[6].value;
			xbox.axes["rtrigger"] = gamepad.buttons[7].value;

			for(var i = 0; i < gamepad.buttons.length; i++)
			{
				//mapping of XBOX
				switch(i) //I use a switch to ensure that a player with another gamepad could play
				{
					case 0: xbox.buttons["a"] = gamepad.buttons[i].pressed; break;
					case 1: xbox.buttons["b"] = gamepad.buttons[i].pressed; break;
					case 2: xbox.buttons["x"] = gamepad.buttons[i].pressed; break;
					case 3: xbox.buttons["y"] = gamepad.buttons[i].pressed; break;
					case 4: xbox.buttons["lb"] = gamepad.buttons[i].pressed; break;
					case 5: xbox.buttons["rb"] = gamepad.buttons[i].pressed; break;
					case 6: xbox.buttons["lt"] = gamepad.buttons[i].pressed; break;
					case 7: xbox.buttons["rt"] = gamepad.buttons[i].pressed; break;
					case 8: xbox.buttons["back"] = gamepad.buttons[i].pressed; break;
					case 9: xbox.buttons["start"] = gamepad.buttons[i].pressed; break;
					case 10: xbox.buttons["ls"] = gamepad.buttons[i].pressed; break;
					case 11: xbox.buttons["rs"] = gamepad.buttons[i].pressed; break;
					case 12: if( gamepad.buttons[i].pressed) xbox.hat += "up"; break;
					case 13: if( gamepad.buttons[i].pressed) xbox.hat += "down"; break;
					case 14: if( gamepad.buttons[i].pressed) xbox.hat += "left"; break;
					case 15: if( gamepad.buttons[i].pressed) xbox.hat += "right"; break;
					case 16: xbox.buttons["home"] = gamepad.buttons[i].pressed; break;
					default:
				}
			}
			gamepad.xbox = xbox;
			return gamepad;
		}	
	}
}

GamepadInput.prototype.onDrawBackground = function(ctx)
{
	//render
}

GamepadInput.prototype.onGetOutputs = function() {
	return [
		["leftAxis","vec2"],
		["rightAxis","vec2"],
		["leftX_axis","number"],
		["leftY_axis","number"],
		["rightX_axis","number"],
		["rightY_axis","number"],
		["triggerLeft","number"],
		["triggerRight","number"],
		["aButton","number"],
		["bButton","number"],
		["xButton","number"],
		["yButton","number"],
		["lbButton","number"],
		["rbButton","number"],
		["lsButton","number"],
		["rsButton","number"],
		["start","number"],
		["back","number"]
	];
}

LiteGraph.registerNodeType("input/gamepad", GamepadInput );

})();
(function(){

//Converter
function Converter()
{
	this.addInput("in","*");
	this.size = [60,20];
}

Converter.title = "Converter";
Converter.desc = "type A to type B";

Converter.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null)
		return;

	if(this.outputs)
		for(var i = 0; i < this.outputs.length; i++)
		{
			var output = this.outputs[i];
			if(!output.links || !output.links.length)
				continue;

			var result = null;
			switch( output.name )
			{
				case "number": result = v.length ? v[0] : parseFloat(v); break;
				case "vec2": 
				case "vec3": 
				case "vec4": 
					var result = null;
					var count = 1;
					switch(output.name)
					{
						case "vec2": count = 2; break;
						case "vec3": count = 3; break;
						case "vec4": count = 4; break;
					}

					var result = new Float32Array( count );
					if( v.length )
					{
						for(var j = 0; j < v.length && j < result.length; j++)
							result[j] = v[j];
					}
					else
						result[0] = parseFloat(v);
					break;
			}
			this.setOutputData(i, result);
		}
}

Converter.prototype.onGetOutputs = function() {
	return [["number","number"],["vec2","vec2"],["vec3","vec3"],["vec4","vec4"]];
}

LiteGraph.registerNodeType("math/converter", Converter );


//Bypass
function Bypass()
{
	this.addInput("in");
	this.addOutput("out");
	this.size = [60,20];
}

Bypass.title = "Bypass";
Bypass.desc = "removes the type";

Bypass.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	this.setOutputData(0, v);
}

LiteGraph.registerNodeType("math/bypass", Bypass );



function MathRange()
{
	this.addInput("in","number",{locked:true});
	this.addOutput("out","number",{locked:true});

	this.addProperty( "in", 0 );
	this.addProperty( "inMin", 0 );
	this.addProperty( "inMax", 1 );
	this.addProperty( "outMin", 0 );
	this.addProperty( "outMax", 1 );
}

MathRange.title = "Range";
MathRange.desc = "Convert a number from one range to another";

MathRange.prototype.onExecute = function()
{
	if(this.inputs)
		for(var i = 0; i < this.inputs.length; i++)
		{
			var input = this.inputs[i];
			var v = this.getInputData(i);
			if(v === undefined)
				continue;
			this.properties[ input.name ] = v;
		}

	var v = this.properties["in"];
	if(v === undefined || v === null || v.constructor !== Number)
		v = 0;

	var inMin = this.properties.inMin;
	var inMax = this.properties.inMax;
	var outMin = this.properties.outMin;
	var outMax = this.properties.outMax;

	this._lastV = ((v - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
	this.setOutputData(0, this._lastV );
}

MathRange.prototype.onDrawBackground = function(ctx)
{
	//show the current value
	if(this._lastV)
		this.outputs[0].label = this._lastV.toFixed(3);
	else
		this.outputs[0].label = "?";
}

MathRange.prototype.onGetInputs = function() {
	return [["inMin","number"],["inMax","number"],["outMin","number"],["outMax","number"]];
}

LiteGraph.registerNodeType("math/range", MathRange);



function MathRand()
{
	this.addOutput("value","number");
	this.addProperty( "min", 0 );
	this.addProperty( "max", 1 );
	this.size = [60,20];
}

MathRand.title = "Rand";
MathRand.desc = "Random number";

MathRand.prototype.onExecute = function()
{
	if(this.inputs)
		for(var i = 0; i < this.inputs.length; i++)
		{
			var input = this.inputs[i];
			var v = this.getInputData(i);
			if(v === undefined)
				continue;
			this.properties[input.name] = v;
		}

	var min = this.properties.min;
	var max = this.properties.max;
	this._lastV = Math.random() * (max-min) + min;
	this.setOutputData(0, this._lastV );
}

MathRand.prototype.onDrawBackground = function(ctx)
{
	//show the current value
	if(this._lastV)
		this.outputs[0].label = this._lastV.toFixed(3);
	else
		this.outputs[0].label = "?";
}

MathRand.prototype.onGetInputs = function() {
	return [["min","number"],["max","number"]];
}

LiteGraph.registerNodeType("math/rand", MathRand);

//Math clamp
function MathClamp()
{
	this.addInput("in","number");
	this.addOutput("out","number");
	this.size = [60,20];
	this.addProperty( "min", 0 );
	this.addProperty( "max", 1 );
}

MathClamp.title = "Clamp";
MathClamp.desc = "Clamp number between min and max";
MathClamp.filter = "shader";

MathClamp.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null) return;
	v = Math.max(this.properties.min,v);
	v = Math.min(this.properties.max,v);
	this.setOutputData(0, v );
}

MathClamp.prototype.getCode = function(lang)
{
	var code = "";
	if(this.isInputConnected(0))
		code += "clamp({{0}}," + this.properties.min + "," + this.properties.max + ")";
	return code;
}

LiteGraph.registerNodeType("math/clamp", MathClamp );


//Math ABS
function MathAbs()
{
	this.addInput("in","number");
	this.addOutput("out","number");
	this.size = [60,20];
}

MathAbs.title = "Abs";
MathAbs.desc = "Absolute";

MathAbs.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null) return;
	this.setOutputData(0, Math.abs(v) );
}

LiteGraph.registerNodeType("math/abs", MathAbs);


//Math Floor
function MathFloor()
{
	this.addInput("in","number");
	this.addOutput("out","number");
	this.size = [60,20];
}

MathFloor.title = "Floor";
MathFloor.desc = "Floor number to remove fractional part";

MathFloor.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null) return;
	this.setOutputData(0, Math.floor(v) );
}

LiteGraph.registerNodeType("math/floor", MathFloor );


//Math frac
function MathFrac()
{
	this.addInput("in","number");
	this.addOutput("out","number");
	this.size = [60,20];
}

MathFrac.title = "Frac";
MathFrac.desc = "Returns fractional part";

MathFrac.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null) 
		return;
	this.setOutputData(0, v%1 );
}

LiteGraph.registerNodeType("math/frac",MathFrac);


//Math Floor
function MathSmoothStep()
{
	this.addInput("in","number");
	this.addOutput("out","number");
	this.size = [60,20];
	this.properties = { A: 0, B: 1 };
}

MathSmoothStep.title = "Smoothstep";
MathSmoothStep.desc = "Smoothstep";

MathSmoothStep.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v === undefined)
		return;

	var edge0 = this.properties.A;
	var edge1 = this.properties.B;

    // Scale, bias and saturate x to 0..1 range
    v = Math.clamp((v - edge0)/(edge1 - edge0), 0.0, 1.0); 
    // Evaluate polynomial
    v = v*v*(3 - 2*v);

	this.setOutputData(0, v );
}

LiteGraph.registerNodeType("math/smoothstep", MathSmoothStep );

//Math scale
function MathScale()
{
	this.addInput("in","number",{label:""});
	this.addOutput("out","number",{label:""});
	this.size = [60,20];
	this.addProperty( "factor", 1 );
}

MathScale.title = "Scale";
MathScale.desc = "v * factor";

MathScale.prototype.onExecute = function()
{
	var value = this.getInputData(0);
	if(value != null)
		this.setOutputData(0, value * this.properties.factor );
}

LiteGraph.registerNodeType("math/scale", MathScale );


//Math operation
function MathOperation()
{
	this.addInput("A","number");
	this.addInput("B","number");
	this.addOutput("=","number");
	this.addProperty( "A", 1 );
	this.addProperty( "B", 1 );
	this.addProperty( "OP", "+", "string", { values: MathOperation.values } );
}

MathOperation.values = ["+","-","*","/","%","^"];

MathOperation.title = "Operation";
MathOperation.desc = "Easy math operators";
MathOperation["@OP"] = { type:"enum", title: "operation", values: MathOperation.values };


MathOperation.prototype.setValue = function(v)
{
	if( typeof(v) == "string") v = parseFloat(v);
	this.properties["value"] = v;
}

MathOperation.prototype.onExecute = function()
{
	var A = this.getInputData(0);
	var B = this.getInputData(1);
	if(A!=null)
		this.properties["A"] = A;
	else
		A = this.properties["A"];

	if(B!=null)
		this.properties["B"] = B;
	else
		B = this.properties["B"];

	var result = 0;
	switch(this.properties.OP)
	{
		case '+': result = A+B; break;
		case '-': result = A-B; break;
		case 'x': 
		case 'X': 
		case '*': result = A*B; break;
		case '/': result = A/B; break;
		case '%': result = A%B; break;
		case '^': result = Math.pow(A,B); break;
		default:
			console.warn("Unknown operation: " + this.properties.OP);
	}
	this.setOutputData(0, result );
}

MathOperation.prototype.onDrawBackground = function(ctx)
{
	if(this.flags.collapsed)
		return;

	ctx.font = "40px Arial";
	ctx.fillStyle = "black";
	ctx.textAlign = "center";
	ctx.fillText(this.properties.OP, this.size[0] * 0.5, this.size[1] * 0.5 + LiteGraph.NODE_TITLE_HEIGHT );
	ctx.textAlign = "left";
}

LiteGraph.registerNodeType("math/operation", MathOperation );
 

//Math compare
function MathCompare()
{
	this.addInput( "A","number" );
	this.addInput( "B","number" );
	this.addOutput("A==B","boolean");
	this.addOutput("A!=B","boolean");
	this.addProperty( "A", 0 );
	this.addProperty( "B", 0 );
}

MathCompare.title = "Compare";
MathCompare.desc = "compares between two values";

MathCompare.prototype.onExecute = function()
{
	var A = this.getInputData(0);
	var B = this.getInputData(1);
	if(A !== undefined)
		this.properties["A"] = A;
	else
		A = this.properties["A"];

	if(B !== undefined)
		this.properties["B"] = B;
	else
		B = this.properties["B"];

	for(var i = 0, l = this.outputs.length; i < l; ++i)
	{
		var output = this.outputs[i];
		if(!output.links || !output.links.length)
			continue;
		switch( output.name )
		{
			case "A==B": value = A==B; break;
			case "A!=B": value = A!=B; break;
			case "A>B": value = A>B; break;
			case "A<B": value = A<B; break;
			case "A<=B": value = A<=B; break;
			case "A>=B": value = A>=B; break;
		}
		this.setOutputData(i, value );
	}
};

MathCompare.prototype.onGetOutputs = function()
{
	return [["A==B","boolean"],["A!=B","boolean"],["A>B","boolean"],["A<B","boolean"],["A>=B","boolean"],["A<=B","boolean"]];
}

LiteGraph.registerNodeType("math/compare",MathCompare);

function MathCondition()
{
	this.addInput("A","number");
	this.addInput("B","number");
	this.addOutput("out","boolean");
	this.addProperty( "A", 1 );
	this.addProperty( "B", 1 );
	this.addProperty( "OP", ">", "string", { values: MathCondition.values } );

	this.size = [60,40];
}

MathCondition.values = [">","<","==","!=","<=",">="];
MathCondition["@OP"] = { type:"enum", title: "operation", values: MathCondition.values };

MathCondition.title = "Condition";
MathCondition.desc = "evaluates condition between A and B";

MathCondition.prototype.onExecute = function()
{
	var A = this.getInputData(0);
	if(A === undefined)
		A = this.properties.A;
	else
		this.properties.A = A;

	var B = this.getInputData(1);
	if(B === undefined)
		B = this.properties.B;
	else
		this.properties.B = B;
		
	var result = true;
	switch(this.properties.OP)
	{
		case ">": result = A>B; break;
		case "<": result = A<B; break;
		case "==": result = A==B; break;
		case "!=": result = A!=B; break;
		case "<=": result = A<=B; break;
		case ">=": result = A>=B; break;
	}

	this.setOutputData(0, result );
}

LiteGraph.registerNodeType("math/condition", MathCondition);


function MathAccumulate()
{
	this.addInput("inc","number");
	this.addOutput("total","number");
	this.addProperty( "increment", 1 );
	this.addProperty( "value", 0 );
}

MathAccumulate.title = "Accumulate";
MathAccumulate.desc = "Increments a value every time";

MathAccumulate.prototype.onExecute = function()
{
	var inc = this.getInputData(0);
	if(inc !== null)
		this.properties.value += inc;
	else
		this.properties.value += this.properties.increment;
	this.setOutputData(0, this.properties.value );
}

LiteGraph.registerNodeType("math/accumulate", MathAccumulate);

//Math Trigonometry
function MathTrigonometry()
{
	this.addInput("v","number");
	this.addOutput("sin","number");

	this.addProperty( "amplitude", 1 );
	this.addProperty( "offset", 0 );
	this.bgImageUrl = "nodes/imgs/icon-sin.png";
}

MathTrigonometry.title = "Trigonometry";
MathTrigonometry.desc = "Sin Cos Tan";
MathTrigonometry.filter = "shader";

MathTrigonometry.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	var amplitude = this.properties["amplitude"];
	var slot = this.findInputSlot("amplitude");
	if(slot != -1)
		amplitude = this.getInputData(slot);
	var offset = this.properties["offset"];
	slot = this.findInputSlot("offset");
	if(slot != -1)
		offset = this.getInputData(slot);

	for(var i = 0, l = this.outputs.length; i < l; ++i)
	{
		var output = this.outputs[i];
		switch( output.name )
		{
			case "sin": value = Math.sin(v); break;
			case "cos": value = Math.cos(v); break;
			case "tan": value = Math.tan(v); break;
			case "asin": value = Math.asin(v); break;
			case "acos": value = Math.acos(v); break;
			case "atan": value = Math.atan(v); break;
		}
		this.setOutputData(i, amplitude * value + offset);
	}
}

MathTrigonometry.prototype.onGetInputs = function()
{
	return [["v","number"],["amplitude","number"],["offset","number"]];
}


MathTrigonometry.prototype.onGetOutputs = function()
{
	return [["sin","number"],["cos","number"],["tan","number"],["asin","number"],["acos","number"],["atan","number"]];
}


LiteGraph.registerNodeType("math/trigonometry", MathTrigonometry );



//math library for safe math operations without eval
if(window.math)
{
	function MathFormula()
	{
		this.addInputs("x","number");
		this.addInputs("y","number");
		this.addOutputs("","number");
		this.properties = {x:1.0, y:1.0, formula:"x+y"};
	}

	MathFormula.title = "Formula";
	MathFormula.desc = "Compute safe formula";
		
	MathFormula.prototype.onExecute = function()
	{
		var x = this.getInputData(0);
		var y = this.getInputData(1);
		if(x != null)
			this.properties["x"] = x;
		else
			x = this.properties["x"];

		if(y!=null)
			this.properties["y"] = y;
		else
			y = this.properties["y"];

		var f = this.properties["formula"];
		var value = math.eval(f,{x:x,y:y,T: this.graph.globaltime });
		this.setOutputData(0, value );
	}

	MathFormula.prototype.onDrawBackground = function()
	{
		var f = this.properties["formula"];
		this.outputs[0].label = f;
	}

	MathFormula.prototype.onGetOutputs = function()
	{
		return [["A-B","number"],["A*B","number"],["A/B","number"]];
	}

	LiteGraph.registerNodeType("math/formula", MathFormula );
}


function Math3DVec2ToXYZ()
{
	this.addInput("vec2","vec2");
	this.addOutput("x","number");
	this.addOutput("y","number");
}

Math3DVec2ToXYZ.title = "Vec2->XY";
Math3DVec2ToXYZ.desc = "vector 2 to components";

Math3DVec2ToXYZ.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null) return;

	this.setOutputData( 0, v[0] );
	this.setOutputData( 1, v[1] );
}

LiteGraph.registerNodeType("math3d/vec2-to-xyz", Math3DVec2ToXYZ );


function Math3DXYToVec2()
{
	this.addInputs([["x","number"],["y","number"]]);
	this.addOutput("vec2","vec2");
	this.properties = {x:0, y:0};
	this._data = new Float32Array(2);
}

Math3DXYToVec2.title = "XY->Vec2";
Math3DXYToVec2.desc = "components to vector2";

Math3DXYToVec2.prototype.onExecute = function()
{
	var x = this.getInputData(0);
	if(x == null) x = this.properties.x;
	var y = this.getInputData(1);
	if(y == null) y = this.properties.y;

	var data = this._data;
	data[0] = x;
	data[1] = y;

	this.setOutputData( 0, data );
}

LiteGraph.registerNodeType("math3d/xy-to-vec2", Math3DXYToVec2 );




function Math3DVec3ToXYZ()
{
	this.addInput("vec3","vec3");
	this.addOutput("x","number");
	this.addOutput("y","number");
	this.addOutput("z","number");
}

Math3DVec3ToXYZ.title = "Vec3->XYZ";
Math3DVec3ToXYZ.desc = "vector 3 to components";

Math3DVec3ToXYZ.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null) return;

	this.setOutputData( 0, v[0] );
	this.setOutputData( 1, v[1] );
	this.setOutputData( 2, v[2] );
}

LiteGraph.registerNodeType("math3d/vec3-to-xyz", Math3DVec3ToXYZ );


function Math3DXYZToVec3()
{
	this.addInputs([["x","number"],["y","number"],["z","number"]]);
	this.addOutput("vec3","vec3");
	this.properties = {x:0, y:0, z:0};
	this._data = new Float32Array(3);
}

Math3DXYZToVec3.title = "XYZ->Vec3";
Math3DXYZToVec3.desc = "components to vector3";

Math3DXYZToVec3.prototype.onExecute = function()
{
	var x = this.getInputData(0);
	if(x == null) x = this.properties.x;
	var y = this.getInputData(1);
	if(y == null) y = this.properties.y;
	var z = this.getInputData(2);
	if(z == null) z = this.properties.z;

	var data = this._data;
	data[0] = x;
	data[1] = y;
	data[2] = z;

	this.setOutputData( 0, data );
}

LiteGraph.registerNodeType("math3d/xyz-to-vec3", Math3DXYZToVec3 );



function Math3DVec4ToXYZW()
{
	this.addInput("vec4","vec4");
	this.addOutput("x","number");
	this.addOutput("y","number");
	this.addOutput("z","number");
	this.addOutput("w","number");
}

Math3DVec4ToXYZW.title = "Vec4->XYZW";
Math3DVec4ToXYZW.desc = "vector 4 to components";

Math3DVec4ToXYZW.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null) return;

	this.setOutputData( 0, v[0] );
	this.setOutputData( 1, v[1] );
	this.setOutputData( 2, v[2] );
	this.setOutputData( 3, v[3] );
}

LiteGraph.registerNodeType("math3d/vec4-to-xyzw", Math3DVec4ToXYZW );


function Math3DXYZWToVec4()
{
	this.addInputs([["x","number"],["y","number"],["z","number"],["w","number"]]);
	this.addOutput("vec4","vec4");
	this.properties = {x:0, y:0, z:0, w:0};
	this._data = new Float32Array(4);
}

Math3DXYZWToVec4.title = "XYZW->Vec4";
Math3DXYZWToVec4.desc = "components to vector4";

Math3DXYZWToVec4.prototype.onExecute = function()
{
	var x = this.getInputData(0);
	if(x == null) x = this.properties.x;
	var y = this.getInputData(1);
	if(y == null) y = this.properties.y;
	var z = this.getInputData(2);
	if(z == null) z = this.properties.z;
	var w = this.getInputData(3);
	if(w == null) w = this.properties.w;

	var data = this._data;
	data[0] = x;
	data[1] = y;
	data[2] = z;
	data[3] = w;

	this.setOutputData( 0, data );
}

LiteGraph.registerNodeType("math3d/xyzw-to-vec4", Math3DXYZWToVec4 );




//if glMatrix is installed...
if(window.glMatrix) 
{


	function Math3DRotation()
	{
		this.addInputs([["degrees","number"],["axis","vec3"]]);
		this.addOutput("quat","quat");
		this.properties = { angle:90.0, axis: vec3.fromValues(0,1,0) };
	}

	Math3DRotation.title = "Rotation";
	Math3DRotation.desc = "quaternion rotation";

	Math3DRotation.prototype.onExecute = function()
	{
		var angle = this.getInputData(0);
		if(angle == null) angle = this.properties.angle;
		var axis = this.getInputData(1);
		if(axis == null) axis = this.properties.axis;

		var R = quat.setAxisAngle(quat.create(), axis, angle * 0.0174532925 );
		this.setOutputData( 0, R );
	}


	LiteGraph.registerNodeType("math3d/rotation", Math3DRotation );
	

	//Math3D rotate vec3
	function Math3DRotateVec3()
	{
		this.addInputs([["vec3","vec3"],["quat","quat"]]);
		this.addOutput("result","vec3");
		this.properties = { vec: [0,0,1] };
	}

	Math3DRotateVec3.title = "Rot. Vec3";
	Math3DRotateVec3.desc = "rotate a point";

	Math3DRotateVec3.prototype.onExecute = function()
	{
		var vec = this.getInputData(0);
		if(vec == null) vec = this.properties.vec;
		var quat = this.getInputData(1);
		if(quat == null)
			this.setOutputData(vec);
		else
			this.setOutputData( 0, vec3.transformQuat( vec3.create(), vec, quat ) );
	}

	LiteGraph.registerNodeType("math3d/rotateVec3", Math3DRotateVec3);



	function Math3DMultQuat()
	{
		this.addInputs( [["A","quat"],["B","quat"]] );
		this.addOutput( "A*B","quat" );
	}

	Math3DMultQuat.title = "Mult. Quat";
	Math3DMultQuat.desc = "rotate quaternion";

	Math3DMultQuat.prototype.onExecute = function()
	{
		var A = this.getInputData(0);
		if(A == null) return;
		var B = this.getInputData(1);
		if(B == null) return;

		var R = quat.multiply(quat.create(), A,B);
		this.setOutputData( 0, R );
	}

	LiteGraph.registerNodeType("math3d/mult-quat", Math3DMultQuat );

} //glMatrix

})();
function Selector()
{
	this.addInput("sel","boolean");
	this.addOutput("value","number");
	this.properties = { A:0, B:1 };
	this.size = [60,20];
}

Selector.title = "Selector";
Selector.desc = "outputs A if selector is true, B if selector is false";

Selector.prototype.onExecute = function()
{
	var cond = this.getInputData(0);
	if(cond === undefined)
		return;

	for(var i = 1; i < this.inputs.length; i++)
	{
		var input = this.inputs[i];
		var v = this.getInputData(i);
		if(v === undefined)
			continue;
		this.properties[input.name] = v;
	}

	var A = this.properties.A;
	var B = this.properties.B;
	this.setOutputData(0, cond ? A : B );
}

Selector.prototype.onGetInputs = function() {
	return [["A",0],["B",0]];
}

LiteGraph.registerNodeType("logic/selector", Selector);


(function(){




function GraphicsImage()
{
	this.inputs = [];
	this.addOutput("frame","image");
	this.properties = {"url":""};
}

GraphicsImage.title = "Image";
GraphicsImage.desc = "Image loader";
GraphicsImage.widgets = [{name:"load",text:"Load",type:"button"}];


GraphicsImage.prototype.onAdded = function()
{
	if(this.properties["url"] != "" && this.img == null)
	{
		this.loadImage(this.properties["url"]);
	}
}

GraphicsImage.prototype.onDrawBackground = function(ctx)
{
	if(this.img && this.size[0] > 5 && this.size[1] > 5)
		ctx.drawImage(this.img, 0,0,this.size[0],this.size[1]);
}


GraphicsImage.prototype.onExecute = function()
{
	if(!this.img)
		this.boxcolor = "#000";
	if(this.img && this.img.width)
		this.setOutputData(0,this.img);
	else
		this.setOutputData(0,null);
	if(this.img && this.img.dirty)
		this.img.dirty = false;
}

GraphicsImage.prototype.onPropertyChange = function(name,value)
{
	this.properties[name] = value;
	if (name == "url" && value != "")
		this.loadImage(value);

	return true;
}

GraphicsImage.prototype.onDropFile = function(file, filename)
{
	var img = new Image();
	img.src = file;
	this.img = img;
}

GraphicsImage.prototype.loadImage = function(url)
{
	if(url == "")
	{
		this.img = null;
		return;
	}

	this.img = document.createElement("img");

	var url = name;
	if(url.substr(0,7) == "http://")
	{
		if(LiteGraph.proxy) //proxy external files
			url = LiteGraph.proxy + url.substr(7);
	}

	this.img.src = url;
	this.boxcolor = "#F95";
	var that = this;
	this.img.onload = function()
	{
		that.trace("Image loaded, size: " + that.img.width + "x" + that.img.height );
		this.dirty = true;
		that.boxcolor = "#9F9";
		that.setDirtyCanvas(true);
	}
}

GraphicsImage.prototype.onWidget = function(e,widget)
{
	if(widget.name == "load")
	{
		this.loadImage(this.properties["url"]);
	}
}

LiteGraph.registerNodeType("graphics/image", GraphicsImage);



function ColorPalette()
{
	this.addInput("f","number");
	this.addOutput("Color","color");
	this.properties = {colorA:"#444444",colorB:"#44AAFF",colorC:"#44FFAA",colorD:"#FFFFFF"};

}

ColorPalette.title = "Palette";
ColorPalette.desc = "Generates a color";

ColorPalette.prototype.onExecute = function()
{
	var c = [];

	if (this.properties.colorA != null)
		c.push( hex2num( this.properties.colorA ) );
	if (this.properties.colorB != null)
		c.push( hex2num( this.properties.colorB ) );
	if (this.properties.colorC != null)
		c.push( hex2num( this.properties.colorC ) );
	if (this.properties.colorD != null)
		c.push( hex2num( this.properties.colorD ) );

	var f = this.getInputData(0);
	if(f == null) f = 0.5;
	if (f > 1.0)
		f = 1.0;
	else if (f < 0.0)
		f = 0.0;

	if(c.length == 0)
		return;

	var result = [0,0,0];
	if(f == 0)
		result = c[0];
	else if(f == 1)
		result = c[ c.length - 1];
	else
	{
		var pos = (c.length - 1)* f;
		var c1 = c[ Math.floor(pos) ];
		var c2 = c[ Math.floor(pos)+1 ];
		var t = pos - Math.floor(pos);
		result[0] = c1[0] * (1-t) + c2[0] * (t);
		result[1] = c1[1] * (1-t) + c2[1] * (t);
		result[2] = c1[2] * (1-t) + c2[2] * (t);
	}

	/*
	c[0] = 1.0 - Math.abs( Math.sin( 0.1 * reModular.getTime() * Math.PI) );
	c[1] = Math.abs( Math.sin( 0.07 * reModular.getTime() * Math.PI) );
	c[2] = Math.abs( Math.sin( 0.01 * reModular.getTime() * Math.PI) );
	*/

	for(var i in result)
		result[i] /= 255;
	
	this.boxcolor = colorToString(result);
	this.setOutputData(0, result);
}


LiteGraph.registerNodeType("color/palette", ColorPalette );


function ImageFrame()
{
	this.addInput("","image");
	this.size = [200,200];
}

ImageFrame.title = "Frame";
ImageFrame.desc = "Frame viewerew";
ImageFrame.widgets = [{name:"resize",text:"Resize box",type:"button"},{name:"view",text:"View Image",type:"button"}];


ImageFrame.prototype.onDrawBackground = function(ctx)
{
	if(this.frame)
		ctx.drawImage(this.frame, 0,0,this.size[0],this.size[1]);
}

ImageFrame.prototype.onExecute = function()
{
	this.frame = this.getInputData(0);
	this.setDirtyCanvas(true);
}

ImageFrame.prototype.onWidget = function(e,widget)
{
	if(widget.name == "resize" && this.frame)
	{
		var width = this.frame.width;
		var height = this.frame.height;

		if(!width && this.frame.videoWidth != null )
		{
			width = this.frame.videoWidth;
			height = this.frame.videoHeight;
		}

		if(width && height)
			this.size = [width, height];
		this.setDirtyCanvas(true,true);
	}
	else if(widget.name == "view")
		this.show();
}

ImageFrame.prototype.show = function()
{
	//var str = this.canvas.toDataURL("image/png");
	if(showElement && this.frame)
		showElement(this.frame);
}


LiteGraph.registerNodeType("graphics/frame", ImageFrame );



/*
LiteGraph.registerNodeType("visualization/graph", {
		desc: "Shows a graph of the inputs",

		inputs: [["",0],["",0],["",0],["",0]],
		size: [200,200],
		properties: {min:-1,max:1,bgColor:"#000"},
		onDrawBackground: function(ctx)
		{
			var colors = ["#FFF","#FAA","#AFA","#AAF"];

			if(this.properties.bgColor != null && this.properties.bgColor != "")
			{
				ctx.fillStyle="#000";
				ctx.fillRect(2,2,this.size[0] - 4, this.size[1]-4);
			}

			if(this.data)
			{
				var min = this.properties["min"];
				var max = this.properties["max"];

				for(var i in this.data)
				{
					var data = this.data[i];
					if(!data) continue;

					if(this.getInputInfo(i) == null) continue;

					ctx.strokeStyle = colors[i];
					ctx.beginPath();

					var d = data.length / this.size[0];
					for(var j = 0; j < data.length; j += d)
					{
						var value = data[ Math.floor(j) ];
						value = (value - min) / (max - min);
						if (value > 1.0) value = 1.0;
						else if(value < 0) value = 0;

						if(j == 0)
							ctx.moveTo( j / d, (this.size[1] - 5) - (this.size[1] - 10) * value);
						else
							ctx.lineTo( j / d, (this.size[1] - 5) - (this.size[1] - 10) * value);
					}

					ctx.stroke();
				}
			}

			//ctx.restore();
		},

		onExecute: function()
		{
			if(!this.data) this.data = [];

			for(var i in this.inputs)
			{
				var value = this.getInputData(i);

				if(typeof(value) == "number")
				{
					value = value ? value : 0;
					if(!this.data[i])
						this.data[i] = [];
					this.data[i].push(value);

					if(this.data[i].length > (this.size[1] - 4))
						this.data[i] = this.data[i].slice(1,this.data[i].length);
				}
				else
					this.data[i] = value;
			}

			if(this.data.length)
				this.setDirtyCanvas(true);
		}
	});
*/

function ImageFade()
{
	this.addInputs([["img1","image"],["img2","image"],["fade","number"]]);
	this.addInput("","image");
	this.properties = {fade:0.5,width:512,height:512};
}

ImageFade.title = "Image fade";
ImageFade.desc = "Fades between images";
ImageFade.widgets = [{name:"resizeA",text:"Resize to A",type:"button"},{name:"resizeB",text:"Resize to B",type:"button"}];

ImageFade.prototype.onAdded = function()
{
	this.createCanvas();
	var ctx = this.canvas.getContext("2d");
	ctx.fillStyle = "#000";
	ctx.fillRect(0,0,this.properties["width"],this.properties["height"]);
}

ImageFade.prototype.createCanvas = function()
{
	this.canvas = document.createElement("canvas");
	this.canvas.width = this.properties["width"];
	this.canvas.height = this.properties["height"];
}

ImageFade.prototype.onExecute = function()
{
	var ctx = this.canvas.getContext("2d");
	this.canvas.width = this.canvas.width;

	var A = this.getInputData(0);
	if (A != null)
	{
		ctx.drawImage(A,0,0,this.canvas.width, this.canvas.height);
	}

	var fade = this.getInputData(2);
	if(fade == null)
		fade = this.properties["fade"];
	else
		this.properties["fade"] = fade;

	ctx.globalAlpha = fade;
	var B = this.getInputData(1);
	if (B != null)
	{
		ctx.drawImage(B,0,0,this.canvas.width, this.canvas.height);
	}
	ctx.globalAlpha = 1.0;

	this.setOutputData(0,this.canvas);
	this.setDirtyCanvas(true);
}

LiteGraph.registerNodeType("graphics/imagefade", ImageFade);



function ImageCrop()
{
	this.addInput("","image");
	this.addOutputs("","image");
	this.properties = {width:256,height:256,x:0,y:0,scale:1.0 };
	this.size = [50,20];
}

ImageCrop.title = "Crop";
ImageCrop.desc = "Crop Image";

ImageCrop.prototype.onAdded = function()
{
	this.createCanvas();
}

ImageCrop.prototype.createCanvas = function()
{
	this.canvas = document.createElement("canvas");
	this.canvas.width = this.properties["width"];
	this.canvas.height = this.properties["height"];
}

ImageCrop.prototype.onExecute = function()
{
	var input = this.getInputData(0);
	if(!input) return;

	if(input.width)
	{
		var ctx = this.canvas.getContext("2d");

		ctx.drawImage(input, -this.properties["x"],-this.properties["y"], input.width * this.properties["scale"], input.height * this.properties["scale"]);
		this.setOutputData(0,this.canvas);
	}
	else
		this.setOutputData(0,null);
}

ImageCrop.prototype.onPropertyChange = function(name,value)
{
	this.properties[name] = value;

	if(name == "scale")
	{
		this.properties[name] = parseFloat(value);
		if(this.properties[name] == 0)
		{
			this.trace("Error in scale");
			this.properties[name] = 1.0;
		}
	}
	else
		this.properties[name] = parseInt(value);

	this.createCanvas();

	return true;
}

LiteGraph.registerNodeType("graphics/cropImage", ImageFade );


function ImageVideo()
{
	this.addInput("t","number");
	this.addOutputs([["frame","image"],["t","number"],["d","number"]]);
	this.properties = {"url":""};
}

ImageVideo.title = "Video";
ImageVideo.desc = "Video playback";
ImageVideo.widgets = [{name:"play",text:"PLAY",type:"minibutton"},{name:"stop",text:"STOP",type:"minibutton"},{name:"demo",text:"Demo video",type:"button"},{name:"mute",text:"Mute video",type:"button"}];

ImageVideo.prototype.onExecute = function()
{
	if(!this.properties.url)
		return;

	if(this.properties.url != this._videoUrl)
		this.loadVideo(this.properties.url);

	if(!this._video || this._video.width == 0)
		return;

	var t = this.getInputData(0);
	if(t && t >= 0 && t <= 1.0)
	{
		this._video.currentTime = t * this._video.duration;
		this._video.pause();
	}

	this._video.dirty = true;
	this.setOutputData(0,this._video);
	this.setOutputData(1,this._video.currentTime);
	this.setOutputData(2,this._video.duration);
	this.setDirtyCanvas(true);
}

ImageVideo.prototype.onStart = function()
{
	this.play();
}

ImageVideo.prototype.onStop = function()
{
	this.stop();
}

ImageVideo.prototype.loadVideo = function(url)
{
	this._videoUrl = url;

	this._video = document.createElement("video");
	this._video.src = url;
	this._video.type = "type=video/mp4";

	this._video.muted = true;
	this._video.autoplay = true;

	var that = this;
	this._video.addEventListener("loadedmetadata",function(e) {
		//onload
		that.trace("Duration: " + this.duration + " seconds");
		that.trace("Size: " + this.videoWidth + "," + this.videoHeight);
		that.setDirtyCanvas(true);
		this.width = this.videoWidth;
		this.height = this.videoHeight;
	});
	this._video.addEventListener("progress",function(e) {
		//onload
		//that.trace("loading...");
	});
	this._video.addEventListener("error",function(e) {
		console.log("Error loading video: " + this.src);
		that.trace("Error loading video: " + this.src);
		if (this.error) {
		 switch (this.error.code) {
		   case this.error.MEDIA_ERR_ABORTED:
			  that.trace("You stopped the video.");
			  break;
		   case this.error.MEDIA_ERR_NETWORK:
			  that.trace("Network error - please try again later.");
			  break;
		   case this.error.MEDIA_ERR_DECODE:
			  that.trace("Video is broken..");
			  break;
		   case this.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
			  that.trace("Sorry, your browser can't play this video.");
			  break;
		 }
		}
	});

	this._video.addEventListener("ended",function(e) {
		that.trace("Ended.");
		this.play(); //loop
	});

	//document.body.appendChild(this.video);
}

ImageVideo.prototype.onPropertyChange = function(name,value)
{
	this.properties[name] = value;
	if (name == "url" && value != "")
		this.loadVideo(value);

	return true;
}

ImageVideo.prototype.play = function()
{
	if(this._video)
		this._video.play();
}

ImageVideo.prototype.playPause = function()
{
	if(!this._video)
		return;
	if(this._video.paused)
		this.play();
	else
		this.pause();
}

ImageVideo.prototype.stop = function()
{
	if(!this._video)
		return;
	this._video.pause();
	this._video.currentTime = 0;
}

ImageVideo.prototype.pause = function()
{
	if(!this._video)
		return;
	this.trace("Video paused");
	this._video.pause();
}

ImageVideo.prototype.onWidget = function(e,widget)
{
	/*
	if(widget.name == "demo")
	{
		this.loadVideo();
	}
	else if(widget.name == "play")
	{
		if(this._video)
			this.playPause();
	}
	if(widget.name == "stop")
	{
		this.stop();
	}
	else if(widget.name == "mute")
	{
		if(this._video)
			this._video.muted = !this._video.muted;
	}
	*/
}

LiteGraph.registerNodeType("graphics/video", ImageVideo );


// Texture Webcam *****************************************
function ImageWebcam()
{
	this.addOutput("Webcam","image");
	this.properties = {};
}

ImageWebcam.title = "Webcam";
ImageWebcam.desc = "Webcam image";


ImageWebcam.prototype.openStream = function()
{
	//Vendor prefixes hell
	navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
	window.URL = window.URL || window.webkitURL;

	if (!navigator.getUserMedia) {
	  //console.log('getUserMedia() is not supported in your browser, use chrome and enable WebRTC from about://flags');
	  return;
	}

	this._waitingConfirmation = true;

	// Not showing vendor prefixes.
	navigator.getUserMedia({video: true}, this.streamReady.bind(this), onFailSoHard);		

	var that = this;
	function onFailSoHard(e) {
		console.log('Webcam rejected', e);
		that._webcamStream = false;
		that.boxColor = "red";
	};
}

ImageWebcam.prototype.onRemoved = function()
{
	if(this._webcamStream)
	{
		this._webcamStream.stop();
		this._webcamStream = null;
		this._video = null;
	}
}

ImageWebcam.prototype.streamReady = function(localMediaStream)
{
	this._webcamStream = localMediaStream;
	//this._waitingConfirmation = false;

	var video = this._video;
	if(!video)
	{
		video = document.createElement("video");
		video.autoplay = true;
		video.src = window.URL.createObjectURL(localMediaStream);
		this._video = video;
		//document.body.appendChild( video ); //debug
		//when video info is loaded (size and so)
		video.onloadedmetadata = function(e) {
			// Ready to go. Do some stuff.
			console.log(e);
		};
	}
},

ImageWebcam.prototype.onExecute = function()
{
	if(this._webcamStream == null && !this._waitingConfirmation)
		this.openStream();

	if(!this._video || !this._video.videoWidth) return;

	this._video.width = this._video.videoWidth;
	this._video.height = this._video.videoHeight;
	this.setOutputData(0, this._video);
}

ImageWebcam.prototype.getExtraMenuOptions = function(graphcanvas)
{
	var that = this;
	var txt = !that.properties.show ? "Show Frame" : "Hide Frame";
	return [ {content: txt, callback: 
		function() { 
			that.properties.show = !that.properties.show;
		}
	}];
}

ImageWebcam.prototype.onDrawBackground = function(ctx)
{
	if(this.flags.collapsed || this.size[1] <= 20 || !this.properties.show)
		return;

	if(!this._video)
		return;

	//render to graph canvas
	ctx.save();
	ctx.drawImage(this._video, 0, 0, this.size[0], this.size[1]);
	ctx.restore();
}

LiteGraph.registerNodeType("graphics/webcam", ImageWebcam );


})();
//Works with Litegl.js to create WebGL nodes
if(typeof(LiteGraph) != "undefined")
{
	function LGraphTexture()
	{
		this.addOutput("Texture","Texture");
		this.properties = { name:"", filter: true };
		this.size = [LGraphTexture.imagePreviewSize, LGraphTexture.imagePreviewSize];
	}

	LGraphTexture.title = "Texture";
	LGraphTexture.desc = "Texture";
	LGraphTexture.widgetsInfo = {"name": { widget:"texture"}, "filter": { widget:"checkbox"} };

	//REPLACE THIS TO INTEGRATE WITH YOUR FRAMEWORK
	LGraphTexture.loadTextureCallback = null; //function in charge of loading textures when not present in the container
	LGraphTexture.imagePreviewSize = 256;

	//flags to choose output texture type
	LGraphTexture.PASS_THROUGH = 1; //do not apply FX
	LGraphTexture.COPY = 2;			//create new texture with the same properties as the origin texture
	LGraphTexture.LOW = 3;			//create new texture with low precision (byte)
	LGraphTexture.HIGH = 4;			//create new texture with high precision (half-float)
	LGraphTexture.REUSE = 5;		//reuse input texture
	LGraphTexture.DEFAULT = 2;

	LGraphTexture.MODE_VALUES = {
		"pass through": LGraphTexture.PASS_THROUGH,
		"copy": LGraphTexture.COPY,
		"low": LGraphTexture.LOW,
		"high": LGraphTexture.HIGH,
		"reuse": LGraphTexture.REUSE,
		"default": LGraphTexture.DEFAULT
	};

	//returns the container where all the loaded textures are stored (overwrite if you have a Resources Manager)
	LGraphTexture.getTexturesContainer = function()
	{
		return gl.textures;
	}

	//process the loading of a texture (overwrite it if you have a Resources Manager)
	LGraphTexture.loadTexture = function(name, options)
	{
		options = options || {};
		var url = name;
		if(url.substr(0,7) == "http://")
		{
			if(LiteGraph.proxy) //proxy external files
				url = LiteGraph.proxy + url.substr(7);
		}

		var container = LGraphTexture.getTexturesContainer();
		var tex = container[ name ] = GL.Texture.fromURL(url, options);
		return tex;
	}

	LGraphTexture.getTexture = function(name)
	{
		var container = this.getTexturesContainer();

		if(!container)
			throw("Cannot load texture, container of textures not found");

		var tex = container[ name ];
		if(!tex && name && name[0] != ":")
		{
			this.loadTexture(name);
			return null;
		}

		return tex;
	}

	//used to compute the appropiate output texture
	LGraphTexture.getTargetTexture = function( origin, target, mode )
	{
		if(!origin)
			throw("LGraphTexture.getTargetTexture expects a reference texture");

		var texType = null;

		switch(mode)
		{
			case LGraphTexture.LOW: texType = gl.UNSIGNED_BYTE; break;
			case LGraphTexture.HIGH: texType = gl.HIGH_PRECISION_FORMAT; break;
			case LGraphTexture.REUSE: return origin; break;
			case LGraphTexture.COPY: 
			default: texType = origin ? origin.type : gl.UNSIGNED_BYTE; break;
		}

		if(!target || target.width != origin.width || target.height != origin.height || target.type != texType )
			target = new GL.Texture( origin.width, origin.height, { type: texType, format: gl.RGBA, filter: gl.LINEAR });

		return target;
	}

	LGraphTexture.getNoiseTexture = function()
	{
		if(this._noiseTexture)
			return this._noiseTexture;

		var noise = new Uint8Array(512*512*4);
		for(var i = 0; i < 512*512*4; ++i)
			noise[i] = Math.random() * 255;

		var texture = GL.Texture.fromMemory(512,512,noise,{ format: gl.RGBA, wrap: gl.REPEAT, filter: gl.NEAREST });
		this._noiseTexture = texture;
		return texture;
	}

	LGraphTexture.prototype.onDropFile = function(data, filename, file)
	{
		if(!data)
		{
			this._dropTexture = null;
			this.properties.name = "";
		}
		else
		{
			var texture = null;
			if( typeof(data) == "string" )
				texture = GL.Texture.fromURL( data );
			else if( filename.toLowerCase().indexOf(".dds") != -1 )
				texture = GL.Texture.fromDDSInMemory(data);
			else
			{
				var blob = new Blob([file]);
				var url = URL.createObjectURL(blob);
				texture = GL.Texture.fromURL( url );
			}

			this._dropTexture = texture;
			this.properties.name = filename;
		}
	}

	LGraphTexture.prototype.getExtraMenuOptions = function(graphcanvas)
	{
		var that = this;
		if(!this._dropTexture)
			return;
		return [ {content:"Clear", callback: 
			function() { 
				that._dropTexture = null;
				that.properties.name = "";
			}
		}];
	}

	LGraphTexture.prototype.onExecute = function()
	{
		var tex = null;
		if(this.isOutputConnected(1))
			tex = this.getInputData(0);		

		if(!tex && this._dropTexture)
			tex = this._dropTexture;

		if(!tex && this.properties.name)
			tex = LGraphTexture.getTexture( this.properties.name );

		if(!tex) 
			return;

		this._lastTex = tex;

		if(this.properties.filter === false)
			tex.setParameter( gl.TEXTURE_MAG_FILTER, gl.NEAREST );
		else 
			tex.setParameter( gl.TEXTURE_MAG_FILTER, gl.LINEAR );

		this.setOutputData(0, tex);

		for(var i = 1; i < this.outputs.length; i++)
		{
			var output = this.outputs[i];
			if(!output)
				continue;
			var v = null;
			if(output.name == "width")
				v = tex.width;
			else if(output.name == "height")
				v = tex.height;
			else if(output.name == "aspect")
				v = tex.width / tex.height;
			this.setOutputData(i, v);
		}
	}

	LGraphTexture.prototype.onResourceRenamed = function(oldName,newName)
	{
		if(this.properties.name == oldName)
			this.properties.name = newName;
	}

	LGraphTexture.prototype.onDrawBackground = function(ctx)
	{
		if( this.flags.collapsed || this.size[1] <= 20 )
			return;

		if( this._dropTexture && ctx.webgl )
		{
			ctx.drawImage( this._dropTexture, 0,0,this.size[0],this.size[1]);
			//this._dropTexture.renderQuad(this.pos[0],this.pos[1],this.size[0],this.size[1]);
			return;
		}


		//Different texture? then get it from the GPU
		if(this._lastPreviewTex != this._lastTex)
		{
			if(ctx.webgl)
			{
				this._canvas = this._lastTex;
			}
			else
			{
				var texCanvas = LGraphTexture.generateLowResTexturePreview(this._lastTex);
				if(!texCanvas) 
					return;

				this._lastPreviewTex = this._lastTex;
				this._canvas = cloneCanvas(texCanvas);
			}
		}

		if(!this._canvas)
			return;

		//render to graph canvas
		ctx.save();
		if(!ctx.webgl) //reverse image
		{
			ctx.translate(0,this.size[1]);
			ctx.scale(1,-1);
		}
		ctx.drawImage(this._canvas,0,0,this.size[0],this.size[1]);
		ctx.restore();
	}


	//very slow, used at your own risk
	LGraphTexture.generateLowResTexturePreview = function(tex)
	{
		if(!tex)
			return null;

		var size = LGraphTexture.imagePreviewSize;
		var tempTex = tex;

		if(tex.format == gl.DEPTH_COMPONENT)
			return null; //cannot generate from depth

		//Generate low-level version in the GPU to speed up
		if(tex.width > size || tex.height > size)
		{
			tempTex = this._previewTempTex;
			if(!this._previewTempTex)
			{
				tempTex = new GL.Texture(size,size, { minFilter: gl.NEAREST });
				this._previewTempTex = tempTex;
			}

			//copy
			tex.copyTo(tempTex);
			tex = tempTex;
		}

		//create intermediate canvas with lowquality version
		var texCanvas = this._previewCanvas;
		if(!texCanvas)
		{
			texCanvas = createCanvas(size,size);
			this._previewCanvas = texCanvas;
		}

		if(tempTex)
			tempTex.toCanvas(texCanvas);
		return texCanvas;
	}

	LGraphTexture.prototype.onGetInputs = function()
	{
		return [["in","Texture"]];
	}


	LGraphTexture.prototype.onGetOutputs = function()
	{
		return [["width","number"],["height","number"],["aspect","number"]];
	}

	LiteGraph.registerNodeType("texture/texture", LGraphTexture );

	//**************************
	function LGraphTexturePreview()
	{
		this.addInput("Texture","Texture");
		this.properties = { flipY: false };
		this.size = [LGraphTexture.imagePreviewSize, LGraphTexture.imagePreviewSize];
	}

	LGraphTexturePreview.title = "Preview";
	LGraphTexturePreview.desc = "Show a texture in the graph canvas";

	LGraphTexturePreview.prototype.onDrawBackground = function(ctx)
	{
		if(this.flags.collapsed)
			return;

		if(!ctx.webgl)
			return; //not working well

		var tex = this.getInputData(0);
		if(!tex) return;

		var texCanvas = null;
		
		if(!tex.handle && ctx.webgl)
			texCanvas = tex;
		else
			texCanvas = LGraphTexture.generateLowResTexturePreview(tex);

		//render to graph canvas
		ctx.save();
		if(this.properties.flipY)
		{
			ctx.translate(0,this.size[1]);
			ctx.scale(1,-1);
		}
		ctx.drawImage(texCanvas,0,0,this.size[0],this.size[1]);
		ctx.restore();
	}

	LiteGraph.registerNodeType("texture/preview", LGraphTexturePreview );

	//**************************************

	function LGraphTextureSave()
	{
		this.addInput("Texture","Texture");
		this.addOutput("","Texture");
		this.properties = {name:""};
	}

	LGraphTextureSave.title = "Save";
	LGraphTextureSave.desc = "Save a texture in the repository";

	LGraphTextureSave.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex) return;

		if(this.properties.name)
		{
			var container = LGraphTexture.getTexturesContainer();
			container[ this.properties.name ] = tex;
		}

		this.setOutputData(0, tex);
	}

	LiteGraph.registerNodeType("texture/save", LGraphTextureSave );

	//****************************************************

	function LGraphTextureOperation()
	{
		this.addInput("Texture","Texture");
		this.addInput("TextureB","Texture");
		this.addInput("value","number");
		this.addOutput("Texture","Texture");
		this.help = "<p>pixelcode must be vec3</p>\
			<p>uvcode must be vec2, is optional</p>\
			<p><strong>uv:</strong> tex. coords</p><p><strong>color:</strong> texture</p><p><strong>colorB:</strong> textureB</p><p><strong>time:</strong> scene time</p><p><strong>value:</strong> input value</p>";

		this.properties = {value:1, uvcode:"", pixelcode:"color + colorB * value", precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureOperation.widgetsInfo = {
		"uvcode": { widget:"textarea", height: 100 }, 
		"pixelcode": { widget:"textarea", height: 100 },
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureOperation.title = "Operation";
	LGraphTextureOperation.desc = "Texture shader operation";

	LGraphTextureOperation.prototype.getExtraMenuOptions = function(graphcanvas)
	{
		var that = this;
		var txt = !that.properties.show ? "Show Texture" : "Hide Texture";
		return [ {content: txt, callback: 
			function() { 
				that.properties.show = !that.properties.show;
			}
		}];
	}

	LGraphTextureOperation.prototype.onDrawBackground = function(ctx)
	{
		if(this.flags.collapsed || this.size[1] <= 20 || !this.properties.show)
			return;

		if(!this._tex)
			return;

		//only works if using a webgl renderer
		if(this._tex.gl != ctx)
			return;

		//render to graph canvas
		ctx.save();
		ctx.drawImage(this._tex, 0, 0, this.size[0], this.size[1]);
		ctx.restore();
	}

	LGraphTextureOperation.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);

		if(!this.isOutputConnected(0))
			return; //saves work

		if(this.properties.precision === LGraphTexture.PASS_THROUGH)
		{
			this.setOutputData(0, tex);
			return;
		}

		var texB = this.getInputData(1);

		if(!this.properties.uvcode && !this.properties.pixelcode)
			return;

		var width = 512;
		var height = 512;
		var type = gl.UNSIGNED_BYTE;
		if(tex)
		{
			width = tex.width;
			height = tex.height;
			type = tex.type;
		}
		else if (texB)
		{
			width = texB.width;
			height = texB.height;
			type = texB.type;
		}

		if(!tex && !this._tex )
			this._tex = new GL.Texture( width, height, { type: this.precision === LGraphTexture.LOW ? gl.UNSIGNED_BYTE : gl.HIGH_PRECISION_FORMAT, format: gl.RGBA, filter: gl.LINEAR });
		else
			this._tex = LGraphTexture.getTargetTexture( tex || this._tex, this._tex, this.properties.precision );

		/*
		if(this.properties.lowPrecision)
			type = gl.UNSIGNED_BYTE;

		if(!this._tex || this._tex.width != width || this._tex.height != height || this._tex.type != type )
			this._tex = new GL.Texture( width, height, { type: type, format: gl.RGBA, filter: gl.LINEAR });
		*/

		var uvcode = "";
		if(this.properties.uvcode)
		{
			uvcode = "uv = " + this.properties.uvcode;
			if(this.properties.uvcode.indexOf(";") != -1) //there are line breaks, means multiline code
				uvcode = this.properties.uvcode;
		}
		
		var pixelcode = "";
		if(this.properties.pixelcode)
		{
			pixelcode = "result = " + this.properties.pixelcode;
			if(this.properties.pixelcode.indexOf(";") != -1) //there are line breaks, means multiline code
				pixelcode = this.properties.pixelcode;
		}

		var shader = this._shader;

		if(!shader || this._shaderCode != (uvcode + "|" + pixelcode) )
		{
			try
			{
				this._shader = new GL.Shader(Shader.SCREEN_VERTEX_SHADER, LGraphTextureOperation.pixelShader, { UV_CODE: uvcode, PIXEL_CODE: pixelcode });
				this.boxcolor = "#00FF00";
			}
			catch (err)
			{
				console.log("Error compiling shader: ", err);
				this.boxcolor = "#FF0000";
				return;
			}
			this._shaderCode = (uvcode + "|" + pixelcode);
			shader = this._shader;
		}

		if(!shader)
		{
			this.boxcolor = "red";
			return;
		}
		else
			this.boxcolor = "green";

		var value = this.getInputData(2);
		if(value != null)
			this.properties.value = value;
		else
			value = parseFloat( this.properties.value );

		var time = this.graph.getTime();

		this._tex.drawTo(function() {
			gl.disable( gl.DEPTH_TEST );
			gl.disable( gl.CULL_FACE );
			gl.disable( gl.BLEND );
			if(tex)	tex.bind(0);
			if(texB) texB.bind(1);
			var mesh = Mesh.getScreenQuad();
			shader.uniforms({uTexture:0, uTextureB:1, value: value, texSize:[width,height], time: time}).draw(mesh);
		});

		this.setOutputData(0, this._tex);
	}

	LGraphTextureOperation.pixelShader = "precision highp float;\n\
			\n\
			uniform sampler2D uTexture;\n\
			uniform sampler2D uTextureB;\n\
			varying vec2 vCoord;\n\
			uniform vec2 texSize;\n\
			uniform float time;\n\
			uniform float value;\n\
			\n\
			void main() {\n\
				vec2 uv = vCoord;\n\
				UV_CODE;\n\
				vec3 color = texture2D(uTexture, uv).rgb;\n\
				vec3 colorB = texture2D(uTextureB, uv).rgb;\n\
				vec3 result = color;\n\
				float alpha = 1.0;\n\
				PIXEL_CODE;\n\
				gl_FragColor = vec4(result, alpha);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/operation", LGraphTextureOperation );

	//****************************************************

	function LGraphTextureShader()
	{
		this.addOutput("Texture","Texture");
		this.properties = {code:"", width: 512, height: 512};

		this.properties.code = "\nvoid main() {\n  vec2 uv = coord;\n  vec3 color = vec3(0.0);\n//your code here\n\ngl_FragColor = vec4(color, 1.0);\n}\n";
	}

	LGraphTextureShader.title = "Shader";
	LGraphTextureShader.desc = "Texture shader";
	LGraphTextureShader.widgetsInfo = {
		"code": { type:"code" },
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureShader.prototype.onExecute = function()
	{
		if(!this.isOutputConnected(0))
			return; //saves work

		//replug 
		if(this._shaderCode != this.properties.code)
		{
			this._shaderCode = this.properties.code;
			this._shader = new GL.Shader(Shader.SCREEN_VERTEX_SHADER, LGraphTextureShader.pixelShader + this.properties.code );
			if(!this._shader) {
				this.boxcolor = "red";
				return;
			}
			else
				this.boxcolor = "green";
			/*
			var uniforms = this._shader.uniformLocations;
			//disconnect inputs
			if(this.inputs)
				for(var i = 0; i < this.inputs.length; i++)
				{
					var slot = this.inputs[i];
					if(slot.link != null)
						this.disconnectInput(i);
				}

			for(var i = 0; i < uniforms.length; i++)
			{
				var type = "number";
				if( this._shader.isSampler[i] )
					type = "texture";
				else
				{
					var v = gl.getUniform(this._shader.program, i);
					type = typeof(v);
					if(type == "object" && v.length)
					{
						switch(v.length)
						{
							case 1: type = "number"; break;
							case 2: type = "vec2"; break;
							case 3: type = "vec3"; break;
							case 4: type = "vec4"; break;
							case 9: type = "mat3"; break;
							case 16: type = "mat4"; break;
							default: continue;
						}
					}
				}
				this.addInput(i,type);
			}
			*/
		}

		if(!this._tex || this._tex.width != this.properties.width || this._tex.height != this.properties.height )
			this._tex = new GL.Texture( this.properties.width, this.properties.height, { format: gl.RGBA, filter: gl.LINEAR });
		var tex = this._tex;
		var shader = this._shader;
		var time = this.graph.getTime();
		tex.drawTo(function()	{
			shader.uniforms({texSize: [tex.width, tex.height], time: time}).draw( Mesh.getScreenQuad() );
		});

		this.setOutputData(0, this._tex);
	}

	LGraphTextureShader.pixelShader = "precision highp float;\n\
			\n\
			varying vec2 vCoord;\n\
			uniform float time;\n\
			";

	LiteGraph.registerNodeType("texture/shader", LGraphTextureShader );

	// Texture Scale Offset

	function LGraphTextureScaleOffset()
	{
		this.addInput("in","Texture");
		this.addInput("scale","vec2");
		this.addInput("offset","vec2");
		this.addOutput("out","Texture");
		this.properties = { offset: vec2.fromValues(0,0), scale: vec2.fromValues(1,1), precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureScaleOffset.widgetsInfo = {
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureScaleOffset.title = "Scale/Offset";
	LGraphTextureScaleOffset.desc = "Applies an scaling and offseting";

	LGraphTextureScaleOffset.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);

		if(!this.isOutputConnected(0) || !tex)
			return; //saves work

		if(this.properties.precision === LGraphTexture.PASS_THROUGH)
		{
			this.setOutputData(0, tex);
			return;
		}

		var width = tex.width;
		var height = tex.height;
		var type = this.precision === LGraphTexture.LOW ? gl.UNSIGNED_BYTE : gl.HIGH_PRECISION_FORMAT;
		if (this.precision === LGraphTexture.DEFAULT)
			type = tex.type;

		if(!this._tex || this._tex.width != width || this._tex.height != height || this._tex.type != type )
			this._tex = new GL.Texture( width, height, { type: type, format: gl.RGBA, filter: gl.LINEAR });

		var shader = this._shader;

		if(!shader)
			shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureScaleOffset.pixelShader );

		var scale = this.getInputData(1);
		if(scale)
		{
			this.properties.scale[0] = scale[0];
			this.properties.scale[1] = scale[1];
		}
		else
			scale = this.properties.scale;

		var offset = this.getInputData(2);
		if(offset)
		{
			this.properties.offset[0] = offset[0];
			this.properties.offset[1] = offset[1];
		}
		else
			offset = this.properties.offset;

		this._tex.drawTo(function() {
			gl.disable( gl.DEPTH_TEST );
			gl.disable( gl.CULL_FACE );
			gl.disable( gl.BLEND );
			tex.bind(0);
			var mesh = Mesh.getScreenQuad();
			shader.uniforms({uTexture:0, uScale: scale, uOffset: offset}).draw( mesh );
		});

		this.setOutputData( 0, this._tex );
	}

	LGraphTextureScaleOffset.pixelShader = "precision highp float;\n\
			\n\
			uniform sampler2D uTexture;\n\
			uniform sampler2D uTextureB;\n\
			varying vec2 vCoord;\n\
			uniform vec2 uScale;\n\
			uniform vec2 uOffset;\n\
			\n\
			void main() {\n\
				vec2 uv = vCoord;\n\
				uv = uv / uScale - uOffset;\n\
				gl_FragColor = texture2D(uTexture, uv);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/scaleOffset", LGraphTextureScaleOffset );



	// Warp (distort a texture) *************************

	function LGraphTextureWarp()
	{
		this.addInput("in","Texture");
		this.addInput("warp","Texture");
		this.addInput("factor","number");
		this.addOutput("out","Texture");
		this.properties = { factor: 0.01, precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureWarp.widgetsInfo = {
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureWarp.title = "Warp";
	LGraphTextureWarp.desc = "Texture warp operation";

	LGraphTextureWarp.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);

		if(!this.isOutputConnected(0))
			return; //saves work

		if(this.properties.precision === LGraphTexture.PASS_THROUGH)
		{
			this.setOutputData(0, tex);
			return;
		}

		var texB = this.getInputData(1);

		var width = 512;
		var height = 512;
		var type = gl.UNSIGNED_BYTE;
		if(tex)
		{
			width = tex.width;
			height = tex.height;
			type = tex.type;
		}
		else if (texB)
		{
			width = texB.width;
			height = texB.height;
			type = texB.type;
		}

		if(!tex && !this._tex )
			this._tex = new GL.Texture( width, height, { type: this.precision === LGraphTexture.LOW ? gl.UNSIGNED_BYTE : gl.HIGH_PRECISION_FORMAT, format: gl.RGBA, filter: gl.LINEAR });
		else
			this._tex = LGraphTexture.getTargetTexture( tex || this._tex, this._tex, this.properties.precision );

		var shader = this._shader;

		if(!shader)
			shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureWarp.pixelShader );

		var factor = this.getInputData(2);
		if(factor != null)
			this.properties.factor = factor;
		else
			factor = parseFloat( this.properties.factor );

		this._tex.drawTo(function() {
			gl.disable( gl.DEPTH_TEST );
			gl.disable( gl.CULL_FACE );
			gl.disable( gl.BLEND );
			if(tex)	tex.bind(0);
			if(texB) texB.bind(1);
			var mesh = Mesh.getScreenQuad();
			shader.uniforms({uTexture:0, uTextureB:1, uFactor: factor }).draw( mesh );
		});

		this.setOutputData(0, this._tex);
	}

	LGraphTextureWarp.pixelShader = "precision highp float;\n\
			\n\
			uniform sampler2D uTexture;\n\
			uniform sampler2D uTextureB;\n\
			varying vec2 vCoord;\n\
			uniform float uFactor;\n\
			\n\
			void main() {\n\
				vec2 uv = vCoord;\n\
				uv += texture2D(uTextureB, uv).rg * uFactor;\n\
				gl_FragColor = texture2D(uTexture, uv);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/warp", LGraphTextureWarp );

	//****************************************************

	// Texture to Viewport *****************************************
	function LGraphTextureToViewport()
	{
		this.addInput("Texture","Texture");
		this.properties = { additive: false, antialiasing: false, filter: true, disableAlpha: false, gamma: 1.0 };
		this.size[0] = 130;
	}

	LGraphTextureToViewport.title = "to Viewport";
	LGraphTextureToViewport.desc = "Texture to viewport";

	LGraphTextureToViewport.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex) 
			return;

		if(this.properties.disableAlpha)
			gl.disable( gl.BLEND );
		else
		{
			gl.enable( gl.BLEND );
			if(this.properties.additive)
				gl.blendFunc( gl.SRC_ALPHA, gl.ONE );
			else
				gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
		}

		gl.disable( gl.DEPTH_TEST );
		var gamma = this.properties.gamma || 1.0;
		if( this.isInputConnected(1) )
			gamma = this.getInputData(1);

		tex.setParameter( gl.TEXTURE_MAG_FILTER, this.properties.filter ? gl.LINEAR : gl.NEAREST );

		if(this.properties.antialiasing)
		{
			if(!LGraphTextureToViewport._shader)
				LGraphTextureToViewport._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureToViewport.aaPixelShader );

			var viewport = gl.getViewport(); //gl.getParameter(gl.VIEWPORT);
			var mesh = Mesh.getScreenQuad();
			tex.bind(0);
			LGraphTextureToViewport._shader.uniforms({uTexture:0, uViewportSize:[tex.width,tex.height], uIgamma: 1 / gamma,  inverseVP: [1/tex.width,1/tex.height] }).draw(mesh);
		}
		else
		{
			if(gamma != 1.0)
			{
				if(!LGraphTextureToViewport._gammaShader)
					LGraphTextureToViewport._gammaShader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureToViewport.gammaPixelShader );
				tex.toViewport(LGraphTextureToViewport._gammaShader, { uTexture:0, uIgamma: 1 / gamma });
			}
			else
				tex.toViewport();
		}
	}

	LGraphTextureToViewport.prototype.onGetInputs = function()
	{
		return [["gamma","number"]];
	}

	LGraphTextureToViewport.aaPixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform vec2 uViewportSize;\n\
			uniform vec2 inverseVP;\n\
			uniform float uIgamma;\n\
			#define FXAA_REDUCE_MIN   (1.0/ 128.0)\n\
			#define FXAA_REDUCE_MUL   (1.0 / 8.0)\n\
			#define FXAA_SPAN_MAX     8.0\n\
			\n\
			/* from mitsuhiko/webgl-meincraft based on the code on geeks3d.com */\n\
			vec4 applyFXAA(sampler2D tex, vec2 fragCoord)\n\
			{\n\
				vec4 color = vec4(0.0);\n\
				/*vec2 inverseVP = vec2(1.0 / uViewportSize.x, 1.0 / uViewportSize.y);*/\n\
				vec3 rgbNW = texture2D(tex, (fragCoord + vec2(-1.0, -1.0)) * inverseVP).xyz;\n\
				vec3 rgbNE = texture2D(tex, (fragCoord + vec2(1.0, -1.0)) * inverseVP).xyz;\n\
				vec3 rgbSW = texture2D(tex, (fragCoord + vec2(-1.0, 1.0)) * inverseVP).xyz;\n\
				vec3 rgbSE = texture2D(tex, (fragCoord + vec2(1.0, 1.0)) * inverseVP).xyz;\n\
				vec3 rgbM  = texture2D(tex, fragCoord  * inverseVP).xyz;\n\
				vec3 luma = vec3(0.299, 0.587, 0.114);\n\
				float lumaNW = dot(rgbNW, luma);\n\
				float lumaNE = dot(rgbNE, luma);\n\
				float lumaSW = dot(rgbSW, luma);\n\
				float lumaSE = dot(rgbSE, luma);\n\
				float lumaM  = dot(rgbM,  luma);\n\
				float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));\n\
				float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));\n\
				\n\
				vec2 dir;\n\
				dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));\n\
				dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));\n\
				\n\
				float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);\n\
				\n\
				float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);\n\
				dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX), max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX), dir * rcpDirMin)) * inverseVP;\n\
				\n\
				vec3 rgbA = 0.5 * (texture2D(tex, fragCoord * inverseVP + dir * (1.0 / 3.0 - 0.5)).xyz + \n\
					texture2D(tex, fragCoord * inverseVP + dir * (2.0 / 3.0 - 0.5)).xyz);\n\
				vec3 rgbB = rgbA * 0.5 + 0.25 * (texture2D(tex, fragCoord * inverseVP + dir * -0.5).xyz + \n\
					texture2D(tex, fragCoord * inverseVP + dir * 0.5).xyz);\n\
				\n\
				//return vec4(rgbA,1.0);\n\
				float lumaB = dot(rgbB, luma);\n\
				if ((lumaB < lumaMin) || (lumaB > lumaMax))\n\
					color = vec4(rgbA, 1.0);\n\
				else\n\
					color = vec4(rgbB, 1.0);\n\
				if(uIgamma != 1.0)\n\
					color.xyz = pow( color.xyz, vec3(uIgamma) );\n\
				return color;\n\
			}\n\
			\n\
			void main() {\n\
			   gl_FragColor = applyFXAA( uTexture, vCoord * uViewportSize) ;\n\
			}\n\
			";

	LGraphTextureToViewport.gammaPixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform float uIgamma;\n\
			void main() {\n\
				vec4 color = texture2D( uTexture, vCoord);\n\
				color.xyz = pow(color.xyz, vec3(uIgamma) );\n\
			   gl_FragColor = color;\n\
			}\n\
			";


	LiteGraph.registerNodeType("texture/toviewport", LGraphTextureToViewport );


	// Texture Copy *****************************************
	function LGraphTextureCopy()
	{
		this.addInput("Texture","Texture");
		this.addOutput("","Texture");
		this.properties = { size: 0, generateMipmaps: false, precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureCopy.title = "Copy";
	LGraphTextureCopy.desc = "Copy Texture";
	LGraphTextureCopy.widgetsInfo = { 
		size: { widget:"combo", values:[0,32,64,128,256,512,1024,2048]},
		precision: { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureCopy.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex && !this._tempTexture)
			return;

		if(!this.isOutputConnected(0))
			return; //saves work

		//copy the texture
		if(tex)
		{
			var width = tex.width;
			var height = tex.height;

			if(this.properties.size != 0)
			{
				width = this.properties.size;
				height = this.properties.size;
			}

			var temp = this._tempTexture;

			var type = tex.type;
			if(this.properties.precision === LGraphTexture.LOW)
				type = gl.UNSIGNED_BYTE;
			else if(this.properties.precision === LGraphTexture.HIGH)
				type = gl.HIGH_PRECISION_FORMAT;

			if(!temp || temp.width != width || temp.height != height || temp.type != type )
			{
				var minFilter = gl.LINEAR;
				if( this.properties.generateMipmaps && isPowerOfTwo(width) && isPowerOfTwo(height) )
					minFilter = gl.LINEAR_MIPMAP_LINEAR;
				this._tempTexture = new GL.Texture( width, height, { type: type, format: gl.RGBA, minFilter: minFilter, magFilter: gl.LINEAR });
			}
			tex.copyTo(this._tempTexture);

			if(this.properties.generateMipmaps)
			{
				this._tempTexture.bind(0);
				gl.generateMipmap(this._tempTexture.textureType);
				this._tempTexture.unbind(0);
			}
		}


		this.setOutputData(0,this._tempTexture);
	}

	LiteGraph.registerNodeType("texture/copy", LGraphTextureCopy );


	// Texture Copy *****************************************
	function LGraphTextureAverage()
	{
		this.addInput("Texture","Texture");
		this.addOutput("","Texture");
		this.properties = { lowPrecision: false };
	}

	LGraphTextureAverage.title = "Average";
	LGraphTextureAverage.desc = "Compute the total average of a texture and stores it as a 1x1 pixel texture";

	LGraphTextureAverage.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex)
			return;

		if(!this.isOutputConnected(0))
			return; //saves work

		if(!LGraphTextureAverage._shader)
		{
			LGraphTextureAverage._shader = new GL.Shader(Shader.SCREEN_VERTEX_SHADER, LGraphTextureAverage.pixelShader);
			var samples = new Float32Array(32);
			for(var i = 0; i < 32; ++i)	
				samples[i] = Math.random();
			LGraphTextureAverage._shader.uniforms({uSamplesA: samples.subarray(0,16), uSamplesB: samples.subarray(16,32) });
		}

		var temp = this._tempTexture;
		var type = this.properties.lowPrecision ? gl.UNSIGNED_BYTE : tex.type;
		if(!temp || temp.type != type )
			this._tempTexture = new GL.Texture( 1, 1, { type: type, format: gl.RGBA, filter: gl.NEAREST });

		var shader = LGraphTextureAverage._shader;
		this._tempTexture.drawTo(function(){
			tex.toViewport(shader,{uTexture:0});
		});

		this.setOutputData(0,this._tempTexture);
	}

	LGraphTextureAverage.pixelShader = "precision highp float;\n\
			precision highp float;\n\
			uniform mat4 uSamplesA;\n\
			uniform mat4 uSamplesB;\n\
			uniform sampler2D uTexture;\n\
			varying vec2 vCoord;\n\
			\n\
			void main() {\n\
				vec4 color = vec4(0.0);\n\
				for(int i = 0; i < 4; ++i)\n\
					for(int j = 0; j < 4; ++j)\n\
					{\n\
						color += texture2D(uTexture, vec2( uSamplesA[i][j], uSamplesB[i][j] ) );\n\
						color += texture2D(uTexture, vec2( 1.0 - uSamplesA[i][j], uSamplesB[i][j] ) );\n\
					}\n\
			   gl_FragColor = color * 0.03125;\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/average", LGraphTextureAverage );

	// Image To Texture *****************************************
	function LGraphImageToTexture()
	{
		this.addInput("Image","image");
		this.addOutput("","Texture");
		this.properties = {};
	}

	LGraphImageToTexture.title = "Image to Texture";
	LGraphImageToTexture.desc = "Uploads an image to the GPU";
	//LGraphImageToTexture.widgetsInfo = { size: { widget:"combo", values:[0,32,64,128,256,512,1024,2048]} };

	LGraphImageToTexture.prototype.onExecute = function()
	{
		var img = this.getInputData(0);
		if(!img)
			return;

		var width = img.videoWidth || img.width;
		var height = img.videoHeight || img.height;

		//this is in case we are using a webgl canvas already, no need to reupload it
		if(img.gltexture)
		{
			this.setOutputData(0,img.gltexture);
			return;
		}


		var temp = this._tempTexture;
		if(!temp || temp.width != width || temp.height != height )
			this._tempTexture = new GL.Texture( width, height, { format: gl.RGBA, filter: gl.LINEAR });

		try
		{
			this._tempTexture.uploadImage(img);
		}
		catch(err)
		{
			console.error("image comes from an unsafe location, cannot be uploaded to webgl");
			return;
		}

		this.setOutputData(0,this._tempTexture);
	}

	LiteGraph.registerNodeType("texture/imageToTexture", LGraphImageToTexture );


	// Texture LUT *****************************************
	function LGraphTextureLUT()
	{
		this.addInput("Texture","Texture");
		this.addInput("LUT","Texture");
		this.addInput("Intensity","number");
		this.addOutput("","Texture");
		this.properties = { intensity: 1, precision: LGraphTexture.DEFAULT, texture: null };

		if(!LGraphTextureLUT._shader)
			LGraphTextureLUT._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureLUT.pixelShader );
	}

	LGraphTextureLUT.widgetsInfo = { 
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureLUT.title = "LUT";
	LGraphTextureLUT.desc = "Apply LUT to Texture";
	LGraphTextureLUT.widgetsInfo = {"texture": { widget:"texture"} };

	LGraphTextureLUT.prototype.onExecute = function()
	{
		if(!this.isOutputConnected(0))
			return; //saves work

		var tex = this.getInputData(0);

		if(this.properties.precision === LGraphTexture.PASS_THROUGH )
		{
			this.setOutputData(0,tex);
			return;
		}

		if(!tex) return;

		var lutTex = this.getInputData(1);

		if(!lutTex)
			lutTex = LGraphTexture.getTexture( this.properties.texture );

		if(!lutTex)
		{
			this.setOutputData(0,tex);
			return;
		}

		lutTex.bind(0);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
		gl.bindTexture(gl.TEXTURE_2D, null);

		var intensity = this.properties.intensity;
		if( this.isInputConnected(2) )
			this.properties.intensity = intensity = this.getInputData(2);

		this._tex = LGraphTexture.getTargetTexture( tex, this._tex, this.properties.precision );

		//var mesh = Mesh.getScreenQuad();

		this._tex.drawTo(function() {
			lutTex.bind(1);
			tex.toViewport( LGraphTextureLUT._shader, {uTexture:0, uTextureB:1, uAmount: intensity} );
		});

		this.setOutputData(0,this._tex);
	}

	LGraphTextureLUT.pixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform sampler2D uTextureB;\n\
			uniform float uAmount;\n\
			\n\
			void main() {\n\
				 lowp vec4 textureColor = clamp( texture2D(uTexture, vCoord), vec4(0.0), vec4(1.0) );\n\
				 mediump float blueColor = textureColor.b * 63.0;\n\
				 mediump vec2 quad1;\n\
				 quad1.y = floor(floor(blueColor) / 8.0);\n\
				 quad1.x = floor(blueColor) - (quad1.y * 8.0);\n\
				 mediump vec2 quad2;\n\
				 quad2.y = floor(ceil(blueColor) / 8.0);\n\
				 quad2.x = ceil(blueColor) - (quad2.y * 8.0);\n\
				 highp vec2 texPos1;\n\
				 texPos1.x = (quad1.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.r);\n\
				 texPos1.y = 1.0 - ((quad1.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.g));\n\
				 highp vec2 texPos2;\n\
				 texPos2.x = (quad2.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.r);\n\
				 texPos2.y = 1.0 - ((quad2.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.g));\n\
				 lowp vec4 newColor1 = texture2D(uTextureB, texPos1);\n\
				 lowp vec4 newColor2 = texture2D(uTextureB, texPos2);\n\
				 lowp vec4 newColor = mix(newColor1, newColor2, fract(blueColor));\n\
				 gl_FragColor = vec4( mix( textureColor.rgb, newColor.rgb, uAmount), textureColor.w);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/LUT", LGraphTextureLUT );

	// Texture Channels *****************************************
	function LGraphTextureChannels()
	{
		this.addInput("Texture","Texture");

		this.addOutput("R","Texture");
		this.addOutput("G","Texture");
		this.addOutput("B","Texture");
		this.addOutput("A","Texture");

		this.properties = {};
		if(!LGraphTextureChannels._shader)
			LGraphTextureChannels._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureChannels.pixelShader );
	}

	LGraphTextureChannels.title = "Texture to Channels";
	LGraphTextureChannels.desc = "Split texture channels";

	LGraphTextureChannels.prototype.onExecute = function()
	{
		var texA = this.getInputData(0);
		if(!texA) return;

		if(!this._channels)
			this._channels = Array(4);

		var connections = 0;
		for(var i = 0; i < 4; i++)
		{
			if(this.isOutputConnected(i))
			{
				if(!this._channels[i] || this._channels[i].width != texA.width || this._channels[i].height != texA.height || this._channels[i].type != texA.type)
					this._channels[i] = new GL.Texture( texA.width, texA.height, { type: texA.type, format: gl.RGBA, filter: gl.LINEAR });
				connections++;
			}
			else
				this._channels[i] = null;
		}

		if(!connections)
			return;

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphTextureChannels._shader;
		var masks = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];

		for(var i = 0; i < 4; i++)
		{
			if(!this._channels[i])
				continue;

			this._channels[i].drawTo( function() {
				texA.bind(0);
				shader.uniforms({uTexture:0, uMask: masks[i]}).draw(mesh);
			});
			this.setOutputData(i, this._channels[i]);
		}
	}

	LGraphTextureChannels.pixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform vec4 uMask;\n\
			\n\
			void main() {\n\
			   gl_FragColor = vec4( vec3( length( texture2D(uTexture, vCoord) * uMask )), 1.0 );\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/textureChannels", LGraphTextureChannels );


	// Texture Channels to Texture *****************************************
	function LGraphChannelsTexture()
	{
		this.addInput("R","Texture");
		this.addInput("G","Texture");
		this.addInput("B","Texture");
		this.addInput("A","Texture");

		this.addOutput("Texture","Texture");

		this.properties = {};
		if(!LGraphChannelsTexture._shader)
			LGraphChannelsTexture._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphChannelsTexture.pixelShader );
	}

	LGraphChannelsTexture.title = "Channels to Texture";
	LGraphChannelsTexture.desc = "Split texture channels";

	LGraphChannelsTexture.prototype.onExecute = function()
	{
		var tex = [ this.getInputData(0),
				this.getInputData(1),
				this.getInputData(2),
				this.getInputData(3) ];

		if(!tex[0] || !tex[1] || !tex[2] || !tex[3]) 
			return;

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphChannelsTexture._shader;

		this._tex = LGraphTexture.getTargetTexture( tex[0], this._tex );

		this._tex.drawTo( function() {
			tex[0].bind(0);
			tex[1].bind(1);
			tex[2].bind(2);
			tex[3].bind(3);
			shader.uniforms({uTextureR:0, uTextureG:1, uTextureB:2, uTextureA:3 }).draw(mesh);
		});
		this.setOutputData(0, this._tex);
	}

	LGraphChannelsTexture.pixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTextureR;\n\
			uniform sampler2D uTextureG;\n\
			uniform sampler2D uTextureB;\n\
			uniform sampler2D uTextureA;\n\
			\n\
			void main() {\n\
			   gl_FragColor = vec4( \
						texture2D(uTextureR, vCoord).r,\
						texture2D(uTextureG, vCoord).r,\
						texture2D(uTextureB, vCoord).r,\
						texture2D(uTextureA, vCoord).r);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/channelsTexture", LGraphChannelsTexture );

	// Texture Channels to Texture *****************************************
	function LGraphTextureGradient()
	{
		this.addInput("A","color");
		this.addInput("B","color");
		this.addOutput("Texture","Texture");

		this.properties = { angle: 0, scale: 1, A:[0,0,0], B:[1,1,1], textureSize:32 };
		if(!LGraphTextureGradient._shader)
			LGraphTextureGradient._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureGradient.pixelShader );

		this._uniforms = { uAngle: 0, uColorA: vec3.create(), uColorB: vec3.create()};
	}

	LGraphTextureGradient.title = "Gradient";
	LGraphTextureGradient.desc = "Generates a gradient";
	LGraphTextureGradient["@A"] = { type:"color" };
	LGraphTextureGradient["@B"] = { type:"color" };
	LGraphTextureGradient["@textureSize"] = { type:"enum", values:[32,64,128,256,512] };

	LGraphTextureGradient.prototype.onExecute = function()
	{
		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = GL.Mesh.getScreenQuad();
		var shader = LGraphTextureGradient._shader;

		var A = this.getInputData(0);
		if(!A)
			A = this.properties.A;
		var B = this.getInputData(1);
		if(!B)
			B = this.properties.B;

		//angle and scale
		for(var i = 2; i < this.inputs.length; i++)
		{
			var input = this.inputs[i];
			var v = this.getInputData(i);
			if(v === undefined)
				continue;
			this.properties[ input.name ] = v;
		}

		var uniforms = this._uniforms;
		this._uniforms.uAngle = this.properties.angle * DEG2RAD;
		this._uniforms.uScale = this.properties.scale;
		vec3.copy( uniforms.uColorA, A );
		vec3.copy( uniforms.uColorB, B );

		var size = parseInt( this.properties.textureSize );
		if(!this._tex || this._tex.width != size )
			this._tex = new GL.Texture( size, size, { format: gl.RGB, filter: gl.LINEAR });

		this._tex.drawTo( function() {
			shader.uniforms(uniforms).draw(mesh);
		});
		this.setOutputData(0, this._tex);
	}

	LGraphTextureGradient.prototype.onGetInputs = function()
	{
		return [["angle","number"],["scale","number"]];
	}

	LGraphTextureGradient.pixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform float uAngle;\n\
			uniform float uScale;\n\
			uniform vec3 uColorA;\n\
			uniform vec3 uColorB;\n\
			\n\
			vec2 rotate(vec2 v, float angle)\n\
			{\n\
				vec2 result;\n\
				float _cos = cos(angle);\n\
				float _sin = sin(angle);\n\
				result.x = v.x * _cos - v.y * _sin;\n\
				result.y = v.x * _sin + v.y * _cos;\n\
				return result;\n\
			}\n\
			void main() {\n\
				float f = (rotate(uScale * (vCoord - vec2(0.5)), uAngle) + vec2(0.5)).x;\n\
				vec3 color = mix(uColorA,uColorB,clamp(f,0.0,1.0));\n\
			   gl_FragColor = vec4(color,1.0);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/gradient", LGraphTextureGradient );

	// Texture Mix *****************************************
	function LGraphTextureMix()
	{
		this.addInput("A","Texture");
		this.addInput("B","Texture");
		this.addInput("Mixer","Texture");

		this.addOutput("Texture","Texture");
		this.properties = { precision: LGraphTexture.DEFAULT };

		if(!LGraphTextureMix._shader)
			LGraphTextureMix._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureMix.pixelShader );
	}

	LGraphTextureMix.title = "Mix";
	LGraphTextureMix.desc = "Generates a texture mixing two textures";

	LGraphTextureMix.widgetsInfo = { 
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureMix.prototype.onExecute = function()
	{
		var texA = this.getInputData(0);

		if(!this.isOutputConnected(0))
			return; //saves work
		
		if(this.properties.precision === LGraphTexture.PASS_THROUGH )
		{
			this.setOutputData(0,texA);
			return;
		}

		var texB = this.getInputData(1);
		var texMix = this.getInputData(2);
		if(!texA || !texB || !texMix) return;

		this._tex = LGraphTexture.getTargetTexture( texA, this._tex, this.properties.precision );

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphTextureMix._shader;

		this._tex.drawTo( function() {
			texA.bind(0);
			texB.bind(1);
			texMix.bind(2);
			shader.uniforms({uTextureA:0,uTextureB:1,uTextureMix:2}).draw(mesh);
		});

		this.setOutputData(0, this._tex);
	}

	LGraphTextureMix.pixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTextureA;\n\
			uniform sampler2D uTextureB;\n\
			uniform sampler2D uTextureMix;\n\
			\n\
			void main() {\n\
			   gl_FragColor = mix( texture2D(uTextureA, vCoord), texture2D(uTextureB, vCoord), texture2D(uTextureMix, vCoord) );\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/mix", LGraphTextureMix );

	// Texture Edges detection *****************************************
	function LGraphTextureEdges()
	{
		this.addInput("Tex.","Texture");

		this.addOutput("Edges","Texture");
		this.properties = { invert: true, factor: 1, precision: LGraphTexture.DEFAULT };

		if(!LGraphTextureEdges._shader)
			LGraphTextureEdges._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureEdges.pixelShader );
	}

	LGraphTextureEdges.title = "Edges";
	LGraphTextureEdges.desc = "Detects edges";

	LGraphTextureEdges.widgetsInfo = { 
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureEdges.prototype.onExecute = function()
	{
		if(!this.isOutputConnected(0))
			return; //saves work

		var tex = this.getInputData(0);

		if(this.properties.precision === LGraphTexture.PASS_THROUGH )
		{
			this.setOutputData(0,tex);
			return;
		}		

		if(!tex) return;

		this._tex = LGraphTexture.getTargetTexture( tex, this._tex, this.properties.precision );

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphTextureEdges._shader;
		var invert = this.properties.invert;
		var factor = this.properties.factor;

		this._tex.drawTo( function() {
			tex.bind(0);
			shader.uniforms({uTexture:0, uIsize:[1/tex.width,1/tex.height], uFactor: factor, uInvert: invert ? 1 : 0}).draw(mesh);
		});

		this.setOutputData(0, this._tex);
	}

	LGraphTextureEdges.pixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform vec2 uIsize;\n\
			uniform int uInvert;\n\
			uniform float uFactor;\n\
			\n\
			void main() {\n\
				vec4 center = texture2D(uTexture, vCoord);\n\
				vec4 up = texture2D(uTexture, vCoord + uIsize * vec2(0.0,1.0) );\n\
				vec4 down = texture2D(uTexture, vCoord + uIsize * vec2(0.0,-1.0) );\n\
				vec4 left = texture2D(uTexture, vCoord + uIsize * vec2(1.0,0.0) );\n\
				vec4 right = texture2D(uTexture, vCoord + uIsize * vec2(-1.0,0.0) );\n\
				vec4 diff = abs(center - up) + abs(center - down) + abs(center - left) + abs(center - right);\n\
				diff *= uFactor;\n\
				if(uInvert == 1)\n\
					diff.xyz = vec3(1.0) - diff.xyz;\n\
			   gl_FragColor = vec4( diff.xyz, center.a );\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/edges", LGraphTextureEdges );

	// Texture Depth *****************************************
	function LGraphTextureDepthRange()
	{
		this.addInput("Texture","Texture");
		this.addInput("Distance","number");
		this.addInput("Range","number");
		this.addOutput("Texture","Texture");
		this.properties = { distance:100, range: 50, highPrecision: false };

		if(!LGraphTextureDepthRange._shader)
			LGraphTextureDepthRange._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureDepthRange.pixelShader );
	}

	LGraphTextureDepthRange.title = "Depth Range";
	LGraphTextureDepthRange.desc = "Generates a texture with a depth range";

	LGraphTextureDepthRange.prototype.onExecute = function()
	{
		if(!this.isOutputConnected(0))
			return; //saves work

		var tex = this.getInputData(0);
		if(!tex) return;

		var precision = gl.UNSIGNED_BYTE;
		if(this.properties.highPrecision)
			precision = gl.halfFloatExt ? gl.HALF_FLOAT_OES : gl.FLOAT;			

		if(!this._tempTexture || this._tempTexture.type != precision ||
			this._tempTexture.width != tex.width || this._tempTexture.height != tex.height)
			this._tempTexture = new GL.Texture( tex.width, tex.height, { type: precision, format: gl.RGBA, filter: gl.LINEAR });

		//iterations
		var distance = this.properties.distance;
		if( this.isInputConnected(1) )
		{
			distance = this.getInputData(1);
			this.properties.distance = distance;
		}

		var range = this.properties.range;
		if( this.isInputConnected(2) )
		{
			range = this.getInputData(2);
			this.properties.range = range;
		}

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );
		var mesh = Mesh.getScreenQuad();
		var shader = LGraphTextureDepthRange._shader;

		//TODO: this asumes we have LiteScene, change it
		var camera = LS.Renderer._currentCamera;
		var planes = [LS.Renderer._currentCamera.near, LS.Renderer._currentCamera.far];

		this._tempTexture.drawTo( function() {
			tex.bind(0);
			shader.uniforms({uTexture:0, uDistance: distance, uRange: range, uCameraPlanes: planes })
				.draw(mesh);
		});

		this.setOutputData(0, this._tempTexture);
	}

	LGraphTextureDepthRange.pixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform vec2 uCameraPlanes;\n\
			uniform float uDistance;\n\
			uniform float uRange;\n\
			\n\
			float LinearDepth()\n\
			{\n\
				float n = uCameraPlanes.x;\n\
				float f = uCameraPlanes.y;\n\
				return (2.0 * n) / (f + n - texture2D(uTexture, vCoord).x * (f - n));\n\
			}\n\
			\n\
			void main() {\n\
				float diff = abs(LinearDepth() * uCameraPlanes.y - uDistance);\n\
				float dof = 1.0;\n\
				if(diff <= uRange)\n\
					dof = diff / uRange;\n\
			   gl_FragColor = vec4(dof);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/depthRange", LGraphTextureDepthRange );

	// Texture Blur *****************************************
	function LGraphTextureBlur()
	{
		this.addInput("Texture","Texture");
		this.addInput("Iterations","number");
		this.addInput("Intensity","number");
		this.addOutput("Blurred","Texture");
		this.properties = { intensity: 1, iterations: 1, preserveAspect: false, scale:[1,1] };

		if(!LGraphTextureBlur._shader)
			LGraphTextureBlur._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureBlur.pixelShader );
	}

	LGraphTextureBlur.title = "Blur";
	LGraphTextureBlur.desc = "Blur a texture";

	LGraphTextureBlur.maxIterations = 20;

	LGraphTextureBlur.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex)
			return;

		if(!this.isOutputConnected(0))
			return; //saves work

		var temp = this._tempTexture;

		if(!temp || temp.width != tex.width || temp.height != tex.height || temp.type != tex.type )
		{
			//we need two textures to do the blurring
			this._tempTexture = new GL.Texture( tex.width, tex.height, { type: tex.type, format: gl.RGBA, filter: gl.LINEAR });
			this._finalTexture = new GL.Texture( tex.width, tex.height, { type: tex.type, format: gl.RGBA, filter: gl.LINEAR });
		}

		//iterations
		var iterations = this.properties.iterations;
		if( this.isInputConnected(1) )
		{
			iterations = this.getInputData(1);
			this.properties.iterations = iterations;
		}
		iterations = Math.min( Math.floor(iterations), LGraphTextureBlur.maxIterations );
		if(iterations == 0) //skip blurring
		{
			this.setOutputData(0, tex);
			return;
		}

		var intensity = this.properties.intensity;
		if( this.isInputConnected(2) )
		{
			intensity = this.getInputData(2);
			this.properties.intensity = intensity;
		}

		//blur sometimes needs an aspect correction
		var aspect = LiteGraph.cameraAspect;
		if(!aspect && window.gl !== undefined)
			aspect = gl.canvas.height / gl.canvas.width;
		if(!aspect)
			aspect = 1;
		aspect = this.properties.preserveAspect ? aspect : 1;

		var startTexture = tex;
		var scale = this.properties.scale || [1,1];
		var origin = startTexture;
		for(var i = 0; i < iterations; ++i)
		{
			origin.applyBlur( aspect * scale[0] * i, scale[1] * i, intensity, this._tempTexture, this._finalTexture );
			origin = this._finalTexture;
		}

		this.setOutputData(0, this._finalTexture);
	}

	LGraphTextureBlur.pixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform vec2 uOffset;\n\
			uniform float uIntensity;\n\
			void main() {\n\
			   vec4 sum = vec4(0.0);\n\
			   vec4 center = texture2D(uTexture, vCoord);\n\
			   sum += texture2D(uTexture, vCoord + uOffset * -4.0) * 0.05/0.98;\n\
			   sum += texture2D(uTexture, vCoord + uOffset * -3.0) * 0.09/0.98;\n\
			   sum += texture2D(uTexture, vCoord + uOffset * -2.0) * 0.12/0.98;\n\
			   sum += texture2D(uTexture, vCoord + uOffset * -1.0) * 0.15/0.98;\n\
			   sum += center * 0.16/0.98;\n\
			   sum += texture2D(uTexture, vCoord + uOffset * 4.0) * 0.05/0.98;\n\
			   sum += texture2D(uTexture, vCoord + uOffset * 3.0) * 0.09/0.98;\n\
			   sum += texture2D(uTexture, vCoord + uOffset * 2.0) * 0.12/0.98;\n\
			   sum += texture2D(uTexture, vCoord + uOffset * 1.0) * 0.15/0.98;\n\
			   gl_FragColor = uIntensity * sum;\n\
			   /*gl_FragColor.a = center.a*/;\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/blur", LGraphTextureBlur );

	// Texture Webcam *****************************************
	function LGraphTextureWebcam()
	{
		this.addOutput("Webcam","Texture");
		this.properties = { textureName: "" };
	}

	LGraphTextureWebcam.title = "Webcam";
	LGraphTextureWebcam.desc = "Webcam texture";


	LGraphTextureWebcam.prototype.openStream = function()
	{
		//Vendor prefixes hell
		navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
		window.URL = window.URL || window.webkitURL;

		if (!navigator.getUserMedia) {
		  //console.log('getUserMedia() is not supported in your browser, use chrome and enable WebRTC from about://flags');
		  return;
		}

		this._waitingConfirmation = true;

		// Not showing vendor prefixes.
		navigator.getUserMedia({video: true}, this.streamReady.bind(this), onFailSoHard);		

		var that = this;
		function onFailSoHard(e) {
			trace('Webcam rejected', e);
			that._webcamStream = false;
			that.boxColor = "red";
		};
	}

	LGraphTextureWebcam.prototype.streamReady = function(localMediaStream)
	{
		this._webcamStream = localMediaStream;
		//this._waitingConfirmation = false;

	    var video = this._video;
		if(!video)
		{
			video = document.createElement("video");
			video.autoplay = true;
		    video.src = window.URL.createObjectURL( localMediaStream );
			this._video = video;
			//document.body.appendChild( video ); //debug
			//when video info is loaded (size and so)
			video.onloadedmetadata = function(e) {
				// Ready to go. Do some stuff.
				console.log(e);
			};
		}
	}

	LGraphTextureWebcam.prototype.onRemoved = function()
	{
		if(this._webcamStream)
		{
			this._webcamStream.stop();
			this._webcamStream = null;
			this._video = null;
		}
	}

	LGraphTextureWebcam.prototype.onDrawBackground = function(ctx)
	{
		if(this.flags.collapsed || this.size[1] <= 20)
			return;

		if(!this._video)
			return;

		//render to graph canvas
		ctx.save();
		if(!ctx.webgl) //reverse image
		{
			ctx.translate(0,this.size[1]);
			ctx.scale(1,-1);
			ctx.drawImage(this._video, 0, 0, this.size[0], this.size[1]);
		}
		else
		{
			if(this._tempTexture)
				ctx.drawImage(this._tempTexture, 0, 0, this.size[0], this.size[1]);
		}
		ctx.restore();
	}

	LGraphTextureWebcam.prototype.onExecute = function()
	{
		if(this._webcamStream == null && !this._waitingConfirmation)
			this.openStream();

		if(!this._video || !this._video.videoWidth)
			return;

		var width = this._video.videoWidth;
		var height = this._video.videoHeight;

		var temp = this._tempTexture;
		if(!temp || temp.width != width || temp.height != height )
			this._tempTexture = new GL.Texture( width, height, { format: gl.RGB, filter: gl.LINEAR });

		this._tempTexture.uploadImage( this._video );
		
		if(this.properties.textureName)
		{
			var container = LGraphTexture.getTexturesContainer();
			container[ this.properties.textureName ] = this._tempTexture;
		}

		this.setOutputData(0,this._tempTexture);
	}

	LiteGraph.registerNodeType("texture/webcam", LGraphTextureWebcam );


	//Cubemap reader
	function LGraphCubemap()
	{
		this.addOutput("Cubemap","Cubemap");
		this.properties = {name:""};
		this.size = [LGraphTexture.imagePreviewSize, LGraphTexture.imagePreviewSize];
	}

	LGraphCubemap.prototype.onDropFile = function(data, filename, file)
	{
		if(!data)
		{
			this._dropTexture = null;
			this.properties.name = "";
		}
		else
		{
			if( typeof(data) == "string" )
				this._dropTexture = GL.Texture.fromURL(data);
			else
				this._dropTexture = GL.Texture.fromDDSInMemory(data);
			this.properties.name = filename;
		}
	}

	LGraphCubemap.prototype.onExecute = function()
	{
		if(this._dropTexture)
		{
			this.setOutputData(0, this._dropTexture);
			return;
		}

		if(!this.properties.name)
			return;

		var tex = LGraphTexture.getTexture( this.properties.name );
		if(!tex) 
			return;

		this._lastTex = tex;
		this.setOutputData(0, tex);
	}

	LGraphCubemap.prototype.onDrawBackground = function(ctx)
	{
		if( this.flags.collapsed || this.size[1] <= 20)
			return;

		if(!ctx.webgl)
			return;

		var cubeMesh = gl.meshes["cube"];
		if(!cubeMesh)
			cubeMesh = gl.meshes["cube"] = GL.Mesh.cube({size:1});

		//var view = mat4.lookAt( mat4.create(), [0,0
	}

	LiteGraph.registerNodeType("texture/cubemap", LGraphCubemap );

} //litegl.js defined
//Works with Litegl.js to create WebGL nodes
if(typeof(LiteGraph) != "undefined")
{
	
	// Texture Lens *****************************************
	function LGraphFXLens()
	{
		this.addInput("Texture","Texture");
		this.addInput("Aberration","number");
		this.addInput("Distortion","number");
		this.addInput("Blur","number");
		this.addOutput("Texture","Texture");
		this.properties = { aberration:1.0, distortion: 1.0, blur: 1.0, precision: LGraphTexture.DEFAULT };

		if(!LGraphFXLens._shader)
			LGraphFXLens._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphFXLens.pixelShader );
	}

	LGraphFXLens.title = "Lens";
	LGraphFXLens.desc = "Camera Lens distortion";
	LGraphFXLens.widgetsInfo = {
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphFXLens.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(this.properties.precision === LGraphTexture.PASS_THROUGH )
		{
			this.setOutputData(0,tex);
			return;
		}		

		if(!tex) return;

		this._tex = LGraphTexture.getTargetTexture( tex, this._tex, this.properties.precision );

		//iterations
		var aberration = this.properties.aberration;
		if( this.isInputConnected(1) )
		{
			aberration = this.getInputData(1);
			this.properties.aberration = aberration;
		}

		var distortion = this.properties.distortion;
		if( this.isInputConnected(2) )
		{
			distortion = this.getInputData(2);
			this.properties.distortion = distortion;
		}

		var blur = this.properties.blur;
		if( this.isInputConnected(3) )
		{
			blur = this.getInputData(3);
			this.properties.blur = blur;
		}

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );
		var mesh = Mesh.getScreenQuad();
		var shader = LGraphFXLens._shader;
		var camera = LS.Renderer._currentCamera;

		this._tex.drawTo( function() {
			tex.bind(0);
			shader.uniforms({uTexture:0, uAberration: aberration, uDistortion: distortion, uBlur: blur })
				.draw(mesh);
		});

		this.setOutputData(0, this._tex);
	}

	LGraphFXLens.pixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform vec2 uCameraPlanes;\n\
			uniform float uAberration;\n\
			uniform float uDistortion;\n\
			uniform float uBlur;\n\
			\n\
			void main() {\n\
				vec2 coord = vCoord;\n\
				float dist = distance(vec2(0.5), coord);\n\
				vec2 distCoord = coord - vec2(0.5);\n\
				float percent = 1.0 + ((0.5 - dist) / 0.5) * uDistortion;\n\
				distCoord *= percent;\n\
				coord = distCoord + vec2(0.5);\n\
				vec4 color = texture2D(uTexture,coord, uBlur * dist);\n\
				color.r = texture2D(uTexture,vec2(0.5) + distCoord * (1.0+0.01*uAberration), uBlur * dist ).r;\n\
				color.b = texture2D(uTexture,vec2(0.5) + distCoord * (1.0-0.01*uAberration), uBlur * dist ).b;\n\
				gl_FragColor = color;\n\
			}\n\
			";
		/*
			float normalizedTunableSigmoid(float xs, float k)\n\
			{\n\
				xs = xs * 2.0 - 1.0;\n\
				float signx = sign(xs);\n\
				float absx = abs(xs);\n\
				return signx * ((-k - 1.0)*absx)/(2.0*(-2.0*k*absx+k-1.0)) + 0.5;\n\
			}\n\
		*/

	LiteGraph.registerNodeType("fx/lens", LGraphFXLens );
	window.LGraphFXLens = LGraphFXLens;

	//*******************************************************

	function LGraphFXBokeh()
	{
		this.addInput("Texture","Texture");
		this.addInput("Blurred","Texture");
		this.addInput("Mask","Texture");
		this.addInput("Threshold","number");
		this.addOutput("Texture","Texture");
		this.properties = { shape: "", size: 10, alpha: 1.0, threshold: 1.0, highPrecision: false };
	}

	LGraphFXBokeh.title = "Bokeh";
	LGraphFXBokeh.desc = "applies an Bokeh effect";

	LGraphFXBokeh.widgetsInfo = {"shape": { widget:"texture" }};

	LGraphFXBokeh.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		var blurredTex = this.getInputData(1);
		var maskTex = this.getInputData(2);
		if(!tex || !maskTex || !this.properties.shape) 
		{
			this.setOutputData(0, tex);
			return;
		}

		if(!blurredTex)
			blurredTex = tex;

		var shapeTex = LGraphTexture.getTexture( this.properties.shape );
		if(!shapeTex)
			return;

		var threshold = this.properties.threshold;
		if( this.isInputConnected(3) )
		{
			threshold = this.getInputData(3);
			this.properties.threshold = threshold;
		}


		var precision = gl.UNSIGNED_BYTE;
		if(this.properties.highPrecision)
			precision = gl.halfFloatExt ? gl.HALF_FLOAT_OES : gl.FLOAT;			
		if(!this._tempTexture || this._tempTexture.type != precision ||
			this._tempTexture.width != tex.width || this._tempTexture.height != tex.height)
			this._tempTexture = new GL.Texture( tex.width, tex.height, { type: precision, format: gl.RGBA, filter: gl.LINEAR });

		//iterations
		var size = this.properties.size;

		var firstShader = LGraphFXBokeh._firstShader;
		if(!firstShader)
			firstShader = LGraphFXBokeh._firstShader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphFXBokeh._firstPixelShader );

		var secondShader = LGraphFXBokeh._secondShader;
		if(!secondShader)
			secondShader = LGraphFXBokeh._secondShader = new GL.Shader( LGraphFXBokeh._secondVertexShader, LGraphFXBokeh._secondPixelShader );

		var pointsMesh = this._pointsMesh;
		if(!pointsMesh || pointsMesh._width != tex.width || pointsMesh._height != tex.height || pointsMesh._spacing != 2)
			pointsMesh = this.createPointsMesh( tex.width, tex.height, 2 );

		var screenMesh = Mesh.getScreenQuad();

		var pointSize = this.properties.size;
		var minLight = this.properties.minLight;
		var alpha = this.properties.alpha;

		gl.disable( gl.DEPTH_TEST );
		gl.disable( gl.BLEND );

		this._tempTexture.drawTo( function() {
			tex.bind(0);
			blurredTex.bind(1);
			maskTex.bind(2);
			firstShader.uniforms({uTexture:0, uTextureBlur:1, uMask: 2, uTexsize: [tex.width, tex.height] })
				.draw(screenMesh);
		});

		this._tempTexture.drawTo( function() {
			//clear because we use blending
			//gl.clearColor(0.0,0.0,0.0,1.0);
			//gl.clear( gl.COLOR_BUFFER_BIT );
			gl.enable( gl.BLEND );
			gl.blendFunc( gl.ONE, gl.ONE );

			tex.bind(0);
			shapeTex.bind(3);
			secondShader.uniforms({uTexture:0, uMask: 2, uShape:3, uAlpha: alpha, uThreshold: threshold, uPointSize: pointSize, uItexsize: [1.0/tex.width, 1.0/tex.height] })
				.draw(pointsMesh, gl.POINTS);
		});

		this.setOutputData(0, this._tempTexture);
	}

	LGraphFXBokeh.prototype.createPointsMesh = function(width, height, spacing)
	{
		var nwidth = Math.round(width / spacing);
		var nheight = Math.round(height / spacing);

		var vertices = new Float32Array(nwidth * nheight * 2);

		var ny = -1;
		var dx = 2/width * spacing;
		var dy = 2/height * spacing;
		for(var y = 0; y < nheight; ++y )
		{
			var nx = -1;
			for(var x = 0; x < nwidth; ++x )
			{
				var pos = y*nwidth*2 + x*2;
				vertices[pos] = nx;
				vertices[pos+1] = ny;
				nx += dx;
			}
			ny += dy;
		}

		this._pointsMesh = GL.Mesh.load({vertices2D: vertices});
		this._pointsMesh._width = width;
		this._pointsMesh._height = height;
		this._pointsMesh._spacing = spacing;

		return this._pointsMesh;
	}

	/*
	LGraphTextureBokeh._pixelShader = "precision highp float;\n\
			varying vec2 aCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform sampler2D uShape;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D( uTexture, gl_PointCoord );\n\
				color *= vColor * uAlpha;\n\
				gl_FragColor = color;\n\
			}\n";
	*/

	LGraphFXBokeh._firstPixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform sampler2D uTextureBlur;\n\
			uniform sampler2D uMask;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D(uTexture, vCoord);\n\
				vec4 blurredColor = texture2D(uTextureBlur, vCoord);\n\
				float mask = texture2D(uMask, vCoord).x;\n\
			   gl_FragColor = mix(color, blurredColor, mask);\n\
			}\n\
			";

	LGraphFXBokeh._secondVertexShader = "precision highp float;\n\
			attribute vec2 aVertex2D;\n\
			varying vec4 vColor;\n\
			uniform sampler2D uTexture;\n\
			uniform sampler2D uMask;\n\
			uniform vec2 uItexsize;\n\
			uniform float uPointSize;\n\
			uniform float uThreshold;\n\
			void main() {\n\
				vec2 coord = aVertex2D * 0.5 + 0.5;\n\
				vColor = texture2D( uTexture, coord );\n\
				vColor += texture2D( uTexture, coord + vec2(uItexsize.x, 0.0) );\n\
				vColor += texture2D( uTexture, coord + vec2(0.0, uItexsize.y));\n\
				vColor += texture2D( uTexture, coord + uItexsize);\n\
				vColor *= 0.25;\n\
				float mask = texture2D(uMask, coord).x;\n\
				float luminance = length(vColor) * mask;\n\
				/*luminance /= (uPointSize*uPointSize)*0.01 */;\n\
				luminance -= uThreshold;\n\
				if(luminance < 0.0)\n\
				{\n\
					gl_Position.x = -100.0;\n\
					return;\n\
				}\n\
				gl_PointSize = uPointSize;\n\
				gl_Position = vec4(aVertex2D,0.0,1.0);\n\
			}\n\
			";

	LGraphFXBokeh._secondPixelShader = "precision highp float;\n\
			varying vec4 vColor;\n\
			uniform sampler2D uShape;\n\
			uniform float uAlpha;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D( uShape, gl_PointCoord );\n\
				color *= vColor * uAlpha;\n\
				gl_FragColor = color;\n\
			}\n";


	LiteGraph.registerNodeType("fx/bokeh", LGraphFXBokeh );
	window.LGraphFXBokeh = LGraphFXBokeh;

	//************************************************

	function LGraphFXGeneric()
	{
		this.addInput("Texture","Texture");
		this.addInput("value1","number");
		this.addInput("value2","number");
		this.addOutput("Texture","Texture");
		this.properties = { fx: "halftone", value1: 1, value2: 1, precision: LGraphTexture.DEFAULT };
	}

	LGraphFXGeneric.title = "FX";
	LGraphFXGeneric.desc = "applies an FX from a list";

	LGraphFXGeneric.widgetsInfo = {
		"fx": { widget:"combo", values:["halftone","pixelate","lowpalette","noise","gamma"] },
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};
	LGraphFXGeneric.shaders = {};

	LGraphFXGeneric.prototype.onExecute = function()
	{
		if(!this.isOutputConnected(0))
			return; //saves work

		var tex = this.getInputData(0);
		if(this.properties.precision === LGraphTexture.PASS_THROUGH )
		{
			this.setOutputData(0,tex);
			return;
		}		

		if(!tex)
			return;

		this._tex = LGraphTexture.getTargetTexture( tex, this._tex, this.properties.precision );

		//iterations
		var value1 = this.properties.value1;
		if( this.isInputConnected(1) )
		{
			value1 = this.getInputData(1);
			this.properties.value1 = value1;
		}

		var value2 = this.properties.value2;
		if( this.isInputConnected(2) )
		{
			value2 = this.getInputData(2);
			this.properties.value2 = value2;
		}
	
		var fx = this.properties.fx;
		var shader = LGraphFXGeneric.shaders[ fx ];
		if(!shader)
		{
			var pixelShaderCode = LGraphFXGeneric["pixelShader_" + fx ];
			if(!pixelShaderCode)
				return;

			shader = LGraphFXGeneric.shaders[ fx ] = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, pixelShaderCode );
		}


		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );
		var mesh = Mesh.getScreenQuad();
		var camera = LS.Renderer._currentCamera;

		var noise = null;
		if(fx == "noise")
			noise = LGraphTexture.getNoiseTexture();

		this._tex.drawTo( function() {
			tex.bind(0);
			if(fx == "noise")
				noise.bind(1);

			shader.uniforms({uTexture:0, uNoise:1, uSize: [tex.width, tex.height], uRand:[ Math.random(), Math.random() ], uValue1: value1, uValue2: value2, uCameraPlanes: [LS.Renderer._currentCamera.near, LS.Renderer._currentCamera.far] })
				.draw(mesh);
		});

		this.setOutputData(0, this._tex);
	}

	LGraphFXGeneric.pixelShaderHalftone = "precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform vec2 uCameraPlanes;\n\
			uniform vec2 uSize;\n\
			uniform float uValue1;\n\
			uniform float uValue2;\n\
			\n\
			float pattern() {\n\
				float s = sin(uValue1 * 3.1415), c = cos(uValue1 * 3.1415);\n\
				vec2 tex = vCoord * uSize.xy;\n\
				vec2 point = vec2(\n\
				   c * tex.x - s * tex.y ,\n\
				   s * tex.x + c * tex.y \n\
				) * uValue2;\n\
				return (sin(point.x) * sin(point.y)) * 4.0;\n\
			}\n\
			void main() {\n\
				vec4 color = texture2D(uTexture, vCoord);\n\
				float average = (color.r + color.g + color.b) / 3.0;\n\
				gl_FragColor = vec4(vec3(average * 10.0 - 5.0 + pattern()), color.a);\n\
			}\n";

	LGraphFXGeneric.pixelShaderPixelate = "precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform vec2 uCameraPlanes;\n\
			uniform vec2 uSize;\n\
			uniform float uValue1;\n\
			uniform float uValue2;\n\
			\n\
			void main() {\n\
				vec2 coord = vec2( floor(vCoord.x * uValue1) / uValue1, floor(vCoord.y * uValue2) / uValue2 );\n\
				vec4 color = texture2D(uTexture, coord);\n\
				gl_FragColor = color;\n\
			}\n";

	LGraphFXGeneric.pixelShaderLowpalette = "precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform vec2 uCameraPlanes;\n\
			uniform vec2 uSize;\n\
			uniform float uValue1;\n\
			uniform float uValue2;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D(uTexture, vCoord);\n\
				gl_FragColor = floor(color * uValue1) / uValue1;\n\
			}\n";

	LGraphFXGeneric.pixelShaderNoise = "precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform sampler2D uNoise;\n\
			uniform vec2 uSize;\n\
			uniform float uValue1;\n\
			uniform float uValue2;\n\
			uniform vec2 uRand;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D(uTexture, vCoord);\n\
				vec3 noise = texture2D(uNoise, vCoord * vec2(uSize.x / 512.0, uSize.y / 512.0) + uRand).xyz - vec3(0.5);\n\
				gl_FragColor = vec4( color.xyz + noise * uValue1, color.a );\n\
			}\n";

	LGraphFXGeneric.pixelShaderGamma = "precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform float uValue1;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D(uTexture, vCoord);\n\
				float gamma = 1.0 / uValue1;\n\
				gl_FragColor = vec4( pow( color.xyz, vec3(gamma) ), color.a );\n\
			}\n";


	LiteGraph.registerNodeType("fx/generic", LGraphFXGeneric );
	window.LGraphFXGeneric = LGraphFXGeneric;


	// Vigneting ************************************

	function LGraphFXVigneting()
	{
		this.addInput("Tex.","Texture");
		this.addInput("intensity","number");

		this.addOutput("Texture","Texture");
		this.properties = { intensity: 1, invert: false, precision: LGraphTexture.DEFAULT };

		if(!LGraphFXVigneting._shader)
			LGraphFXVigneting._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphFXVigneting.pixelShader );
	}

	LGraphFXVigneting.title = "Vigneting";
	LGraphFXVigneting.desc = "Vigneting";

	LGraphFXVigneting.widgetsInfo = { 
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphFXVigneting.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);

		if(this.properties.precision === LGraphTexture.PASS_THROUGH )
		{
			this.setOutputData(0,tex);
			return;
		}		

		if(!tex) return;

		this._tex = LGraphTexture.getTargetTexture( tex, this._tex, this.properties.precision );

		var intensity = this.properties.intensity;
		if( this.isInputConnected(1) )
		{
			intensity = this.getInputData(1);
			this.properties.intensity = intensity;
		}

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphFXVigneting._shader;
		var invert = this.properties.invert;

		this._tex.drawTo( function() {
			tex.bind(0);
			shader.uniforms({uTexture:0, uIntensity: intensity, uIsize:[1/tex.width,1/tex.height], uInvert: invert ? 1 : 0}).draw(mesh);
		});

		this.setOutputData(0, this._tex);
	}

	LGraphFXVigneting.pixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform float uIntensity;\n\
			uniform int uInvert;\n\
			\n\
			void main() {\n\
				float luminance = 1.0 - length( vCoord - vec2(0.5) ) * 1.414;\n\
				vec4 color = texture2D(uTexture, vCoord);\n\
				if(uInvert == 1)\n\
					luminance = 1.0 - luminance;\n\
				luminance = mix(1.0, luminance, uIntensity);\n\
			   gl_FragColor = vec4( luminance * color.xyz, color.a);\n\
			}\n\
			";

	LiteGraph.registerNodeType("fx/vigneting", LGraphFXVigneting );
	window.LGraphFXVigneting = LGraphFXVigneting;
}
(function( global )
{

function MIDIEvent( data )
{
	this.channel = 0;
	this.cmd = 0;

	if(data)
		this.setup(data)
	else
		this.data = [0,0,0];
}

MIDIEvent.prototype.setup = function( rawData )
{
	this.data = rawData;

	var midiStatus = rawData[0];
	this.status = midiStatus;

	var midiCommand = midiStatus & 0xF0;

	if(midiStatus >= 0xF0)
		this.cmd = midiStatus;
	else
		this.cmd = midiCommand;

	if(this.cmd == MIDIEvent.NOTEON && this.velocity == 0)
		this.cmd = MIDIEvent.NOTEOFF;

	this.cmdStr = MIDIEvent.commands[ this.cmd ] || "";

	if ( midiCommand >= MIDIEvent.NOTEON || midiCommand <= MIDIEvent.NOTEOFF ) {
		this.channel =  midiStatus & 0x0F;
	}
}

Object.defineProperty( MIDIEvent.prototype, "velocity", {
	get: function() {
		if(this.cmd == MIDIEvent.NOTEON)
			return this.data[2];
		return -1;
	},
	set: function(v) {
		this.data[2] = v; //  v / 127;
	},
	enumerable: true
});

MIDIEvent.notes = ["A","A#","B","C","C#","D","D#","E","F","F#","G","G#"];

//returns HZs
MIDIEvent.prototype.getPitch = function()
{
	return Math.pow(2, (this.data[1] - 69) / 12 ) * 440;
}

MIDIEvent.computePitch = function( note )
{
	return Math.pow(2, (note - 69) / 12 ) * 440;
}


//not tested, there is a formula missing here
MIDIEvent.prototype.getPitchBend = function()
{
	return this.data[1] + (this.data[2] << 7) - 8192;
}

MIDIEvent.computePitchBend = function(v1,v2)
{
	return v1 + (v2 << 7) - 8192;
}

MIDIEvent.prototype.setCommandFromString = function( str )
{
	this.cmd = MIDIEvent.computeCommandFromString(str);
}

MIDIEvent.computeCommandFromString = function( str )
{
	if(!str)
		return 0;

	if(str && str.constructor === Number)
		return str;

	str = str.toUpperCase();
	switch( str )
	{
		case "NOTE ON":
		case "NOTEON": return MIDIEvent.NOTEON; break;
		case "NOTE OFF":
		case "NOTEOFF": return MIDIEvent.NOTEON; break;
		case "KEY PRESSURE": 
		case "KEYPRESSURE": return MIDIEvent.KEYPRESSURE; break;
		case "CONTROLLER CHANGE": 
		case "CONTROLLERCHANGE": 
		case "CC": return MIDIEvent.CONTROLLERCHANGE; break;
		case "PROGRAM CHANGE":
		case "PROGRAMCHANGE":
		case "PC": return MIDIEvent.PROGRAMCHANGE; break;
		case "CHANNEL PRESSURE":
		case "CHANNELPRESSURE": return MIDIEvent.CHANNELPRESSURE; break;
		case "PITCH BEND":
		case "PITCHBEND": return MIDIEvent.PITCHBEND; break;
		case "TIME TICK":
		case "TIMETICK": return MIDIEvent.TIMETICK; break;
		default: return Number(str); //asume its a hex code
	}
}

MIDIEvent.toNoteString = function(d)
{
	var note = d - 21;
	var octave = d - 24;
	note = note % 12;
	if(note < 0)
		note = 12 + note;
	return MIDIEvent.notes[ note ] + Math.floor(octave / 12 + 1);
}

MIDIEvent.prototype.toString = function()
{
	var str = "" + this.channel + ". " ;
	switch( this.cmd )
	{
		case MIDIEvent.NOTEON: str += "NOTEON " + MIDIEvent.toNoteString( this.data[1] ); break;
		case MIDIEvent.NOTEOFF: str += "NOTEOFF " + MIDIEvent.toNoteString( this.data[1] ); break;
		case MIDIEvent.CONTROLLERCHANGE: str += "CC " + this.data[1] + " " + this.data[2]; break;
		case MIDIEvent.PROGRAMCHANGE: str += "PC " + this.data[1]; break;
		case MIDIEvent.PITCHBEND: str += "PITCHBEND " + this.getPitchBend(); break;
		case MIDIEvent.KEYPRESSURE: str += "KEYPRESS " + this.data[1]; break;
	}

	return str;
}

MIDIEvent.prototype.toHexString = function()
{
	var str = "";
	for(var i = 0; i < this.data.length; i++)
		str += this.data[i].toString(16) + " ";
}

MIDIEvent.NOTEOFF = 0x80;
MIDIEvent.NOTEON = 0x90;
MIDIEvent.KEYPRESSURE = 0xA0;
MIDIEvent.CONTROLLERCHANGE = 0xB0;
MIDIEvent.PROGRAMCHANGE = 0xC0;
MIDIEvent.CHANNELPRESSURE = 0xD0;
MIDIEvent.PITCHBEND = 0xE0;
MIDIEvent.TIMETICK = 0xF8;

MIDIEvent.commands = {
	0x80: "note off",
	0x90: "note on",
	0xA0: "key pressure",
	0xB0: "controller change",
	0xC0: "program change",
	0xD0: "channel pressure",
	0xE0: "pitch bend",
	0xF0: "system",
	0xF2: "Song pos",
	0xF3: "Song select",
	0xF6: "Tune request",
	0xF8: "time tick",
	0xFA: "Start Song",
	0xFB: "Continue Song",
	0xFC: "Stop Song",
	0xFE: "Sensing",
	0xFF: "Reset"
}

//MIDI wrapper
function MIDIInterface( onReady, onError )
{
	if(!navigator.requestMIDIAccess)
	{
		this.error = "not suppoorted";
		if(onError)
			onError("Not supported");
		else
			console.error("MIDI NOT SUPPORTED, enable by chrome://flags");
		return;
	}

	this.onReady = onReady;

	navigator.requestMIDIAccess().then( this.onMIDISuccess.bind(this), this.onMIDIFailure.bind(this) );
}

MIDIInterface.MIDIEvent = MIDIEvent;

MIDIInterface.prototype.onMIDISuccess = function(midiAccess)
{
	console.log( "MIDI ready!" );
	console.log( midiAccess );
	this.midi = midiAccess;  // store in the global (in real usage, would probably keep in an object instance)
	this.updatePorts();

	if (this.onReady)
		this.onReady(this);
}

MIDIInterface.prototype.updatePorts = function()
{
	var midi = this.midi;
	this.inputPorts = midi.inputs;
	var num = 0;
	for (var i = 0; i < this.inputPorts.size; ++i) {
		  var input = this.inputPorts.get(i);
			console.log( "Input port [type:'" + input.type + "'] id:'" + input.id +
		  "' manufacturer:'" + input.manufacturer + "' name:'" + input.name +
		  "' version:'" + input.version + "'" );
			num++;
	  }
	this.numInputPorts = num;


	num = 0;
	this.outputPorts = midi.outputs;
	for (var i = 0; i < this.outputPorts.size; ++i) {
		  var output = this.outputPorts.get(i);
		console.log( "Output port [type:'" + output.type + "'] id:'" + output.id +
		  "' manufacturer:'" + output.manufacturer + "' name:'" + output.name +
		  "' version:'" + output.version + "'" );
			num++;
	  }
	this.numOutputPorts = num;
}

MIDIInterface.prototype.onMIDIFailure = function(msg)
{
	console.error( "Failed to get MIDI access - " + msg );
}

MIDIInterface.prototype.openInputPort = function( port, callback)
{
	var inputPort = this.inputPorts.get( port );
	if(!inputPort)
		return false;

	inputPort.onmidimessage = function(a) {
		var midiEvent = new MIDIEvent(a.data);
		if(callback)
			callback(a.data, midiEvent );
		if(MIDIInterface.onMessage)
			MIDIInterface.onMessage( a.data, midiEvent );
	}
	console.log("port open: ", inputPort);
	return true;
}

MIDIInterface.parseMsg = function(data)
{

}

MIDIInterface.prototype.sendMIDI = function( port, midiData )
{
	if( !midiData )
		return;

	var outputPort = this.outputPorts.get(port);
	if(!outputPort)
		return;

	if( midiData.constructor === MIDIEvent)
		outputPort.send( midiData.data ); 
	else
		outputPort.send( midiData ); 
}



function LGMIDIIn()
{
	this.addOutput( "onMidi", LiteGraph.EVENT );
	this.addOutput( "out", "midi" );
	this.properties = {port: 0};
	this._lastMidiEvent = null;
	this._currentMidiEvent = null;
}

LGMIDIIn.MIDIInterface = MIDIInterface;

LGMIDIIn.title = "MIDI Input";
LGMIDIIn.desc = "Reads MIDI from a input port";

LGMIDIIn.prototype.onStart = function()
{
	var that = this;
	this._midi = new MIDIInterface( function( midi ){
		//open
		midi.openInputPort( that.properties.port, that.onMIDIEvent.bind(that) );
	});
}

LGMIDIIn.prototype.onMIDIEvent = function( data, midiEvent )
{
	this._lastMidiEvent = midiEvent;

	this.trigger( "onMidi", midiEvent );
	if(midiEvent.cmd == MIDIEvent.NOTEON)
		this.trigger( "onNoteon", midiEvent );
	else if(midiEvent.cmd == MIDIEvent.NOTEOFF)
		this.trigger( "onNoteoff", midiEvent );
	else if(midiEvent.cmd == MIDIEvent.CONTROLLERCHANGE)
		this.trigger( "onCc", midiEvent );
	else if(midiEvent.cmd == MIDIEvent.PROGRAMCHANGE)
		this.trigger( "onPc", midiEvent );
	else if(midiEvent.cmd == MIDIEvent.PITCHBEND)
		this.trigger( "onPitchbend", midiEvent );
}

LGMIDIIn.prototype.onExecute = function()
{
	if(this.outputs)
	{
		var last = this._lastMidiEvent;
		for(var i = 0; i < this.outputs.length; ++i)
		{
			var output = this.outputs[i];
			var v = null;
			switch (output.name)
			{
				case "lastMidi": v = last; break;
				default:
					continue;
			}
			this.setOutputData( i, v );
		}
	}
}

LGMIDIIn.prototype.onGetOutputs = function() {
	return [
		["lastMidi","midi"],
		["onMidi",LiteGraph.EVENT],
		["onNoteon",LiteGraph.EVENT],
		["onNoteoff",LiteGraph.EVENT],
		["onCc",LiteGraph.EVENT],
		["onPc",LiteGraph.EVENT],
		["onPitchbend",LiteGraph.EVENT]
	];
}

LiteGraph.registerNodeType("midi/input", LGMIDIIn);


function LGMIDIOut()
{
	this.addInput( "send", LiteGraph.EVENT );
	this.properties = {port: 0};
}

LGMIDIOut.MIDIInterface = MIDIInterface;

LGMIDIOut.title = "MIDI Output";
LGMIDIOut.desc = "Sends MIDI to output channel";

LGMIDIOut.prototype.onStart = function()
{
	var that = this;
	this._midi = new MIDIInterface( function( midi ){
		//ready
	});
}

LGMIDIOut.prototype.onAction = function(event, midiEvent )
{
	console.log(midiEvent);
	if(!this._midi)
		return;
	if(event == "send")
		this._midi.sendMIDI( this.port, midiEvent );
	this.trigger("midi",midiEvent);
}

LGMIDIOut.prototype.onGetInputs = function() {
	return [["send",LiteGraph.ACTION]];
}

LGMIDIOut.prototype.onGetOutputs = function() {
	return [["onMidi",LiteGraph.EVENT]];
}

LiteGraph.registerNodeType("midi/output", LGMIDIOut);


function LGMIDIShow()
{
	this.addInput( "onMidi", LiteGraph.EVENT );
	this._str = "";
	this.size = [200,40]
}

LGMIDIShow.title = "MIDI Show";
LGMIDIShow.desc = "Shows MIDI in the graph";

LGMIDIShow.prototype.onAction = function(event, midiEvent )
{
	if(!midiEvent)
		return;
	if(midiEvent.constructor === MIDIEvent)
		this._str = midiEvent.toString();
	else
		this._str = "???";
}

LGMIDIShow.prototype.onDrawForeground = function( ctx )
{
	if( !this._str )
		return;

	ctx.font = "30px Arial";
	ctx.fillText( this._str, 10, this.size[1] * 0.8 );
}

LGMIDIShow.prototype.onGetInputs = function() {
	return [["in",LiteGraph.ACTION]];
}

LGMIDIShow.prototype.onGetOutputs = function() {
	return [["onMidi",LiteGraph.EVENT]];
}

LiteGraph.registerNodeType("midi/show", LGMIDIShow);



function LGMIDIFilter()
{
	this.properties = {
		channel: -1,
		cmd: -1,
		minValue: -1,
		maxValue: -1
	};

	this.addInput( "in", LiteGraph.EVENT );
	this.addOutput( "onMidi", LiteGraph.EVENT );
}

LGMIDIFilter.title = "MIDI Filter";
LGMIDIFilter.desc = "Filters MIDI messages";

LGMIDIFilter.prototype.onAction = function(event, midiEvent )
{
	if(!midiEvent || midiEvent.constructor !== MIDIEvent)
		return;

	if( this.properties.channel != -1 && midiEvent.channel != this.properties.channel)
		return;
	if(this.properties.cmd != -1 && midiEvent.cmd != this.properties.cmd)
		return;
	if(this.properties.minValue != -1 && midiEvent.data[1] < this.properties.minValue)
		return;
	if(this.properties.maxValue != -1 && midiEvent.data[1] > this.properties.maxValue)
		return;
	this.trigger("onMidi",midiEvent);
}

LiteGraph.registerNodeType("midi/filter", LGMIDIFilter);


function LGMIDIEvent()
{
	this.properties = {
		channel: 0,
		cmd: "CC",
		value1: 1,
		value2: 1
	};

	this.addInput( "send", LiteGraph.EVENT );
	this.addInput( "assign", LiteGraph.EVENT );
	this.addOutput( "onMidi", LiteGraph.EVENT );
}

LGMIDIEvent.title = "MIDIEvent";
LGMIDIEvent.desc = "Create a MIDI Event";

LGMIDIEvent.prototype.onAction = function( event, midiEvent )
{
	if(event == "assign")
	{
		this.properties.channel = midiEvent.channel;
		this.properties.cmd = midiEvent.cmd;
		this.properties.value1 = midiEvent.data[1];
		this.properties.value2 = midiEvent.data[2];
		return;
	}

	//send
	var midiEvent = new MIDIEvent();
	midiEvent.channel = this.properties.channel;
	if(this.properties.cmd && this.properties.cmd.constructor === String)
		midiEvent.setCommandFromString( this.properties.cmd );
	else
		midiEvent.cmd = this.properties.cmd;
	midiEvent.data[0] = midiEvent.cmd | midiEvent.channel;
	midiEvent.data[1] = Number(this.properties.value1);
	midiEvent.data[2] = Number(this.properties.value2);
	this.trigger("onMidi",midiEvent);
}

LGMIDIEvent.prototype.onExecute = function()
{
	var props = this.properties;

	if(this.outputs)
	{
		for(var i = 0; i < this.outputs.length; ++i)
		{
			var output = this.outputs[i];
			var v = null;
			switch (output.name)
			{
				case "midi": 
					v = new MIDIEvent(); 
					v.setup([ props.cmd, props.value1, props.value2 ]);
					v.channel = props.channel;
					break;
				case "command": v = props.cmd; break;
				case "note": v = (props.cmd == MIDIEvent.NOTEON || props.cmd == MIDIEvent.NOTEOFF) ? props.value1 : NULL; break;
				case "velocity": v = props.cmd == MIDIEvent.NOTEON ? props.value2 : NULL; break;
				case "pitch": v = props.cmd == MIDIEvent.NOTEON ? MIDIEvent.computePitch( props.value1 ) : null; break;
				case "pitchbend": v = props.cmd == MIDIEvent.PITCHBEND ? MIDIEvent.computePitchBend( props.value1, props.value2 ) : null; break;
				default:
					continue;
			}
			if(v !== null)
				this.setOutputData( i, v );
		}
	}
}

LGMIDIEvent.prototype.onPropertyChanged = function(name,value)
{
	if(name == "cmd")
		this.properties.cmd = MIDIEvent.computeCommandFromString( value );
}


LGMIDIEvent.prototype.onGetOutputs = function() {
	return [
		["midi","midi"],
		["onMidi",LiteGraph.EVENT],
		["command","number"],
		["note","number"],
		["velocity","number"],
		["pitch","number"],
		["pitchbend","number"]
	];
}


LiteGraph.registerNodeType("midi/event", LGMIDIEvent);




function now() { return window.performance.now() }







})( window );
