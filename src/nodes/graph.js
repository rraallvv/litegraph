//graph nodes
(function(){


//Subgraph: a node that contains a graph
function Subgraph()
{
	var that = this;
	this.size = [120,60];

	//create inner graph
	this.subgraph = new LGraph();
	this.subgraph._subgraph_node = this;
	this.subgraph._is_subgraph = true;

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

Subgraph.prototype.configure = function(o)
{
	LGraphNode.prototype.configure.call(this, o);
	//this.subgraph.configure(o.graph);
}

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

Subgraph.prototype.serialize = function()
{
	var data = LGraphNode.prototype.serialize.call(this);
	data.subgraph = this.subgraph.serialize();
	return data;
}

Subgraph.prototype.clone = function()
{
	var node = LiteGraph.createNode(this.type, this.title);
	var data = this.serialize();
	delete data["id"];
	delete data["inputs"];
	delete data["outputs"];
	node.configure(data);
	return node;
}

Subgraph.prototype.invalidateConnectedLinks = function(slot)
{
	LGraphNode.prototype.invalidateConnectedLinks.call(this, slot);
}

LiteGraph.registerNodeType("graph/subgraph", Subgraph );


//Input for a subgraph
function GlobalInput( title )
{
	//random name to avoid problems with other outputs when added
	var input_name = title || "input_" + (Math.random()*1000).toFixed();

	this.addOutput(input_name, null, {label:""});

	this.properties = { name: input_name, type: null };

	var that = this;

	Object.defineProperty( this.properties, "name", {
		get: function() {
			return input_name;
		},
		set: function(v) {
			if(v == "")
				return;

			var info = that.getOutputInfo(0);
			if(info.name == v)
				return;
			info.name = v;
			that.title = v;
			if(that.graph)
				that.graph.renameGlobalInput(input_name, v);
			input_name = v;
		},
		enumerable: true
	});

	Object.defineProperty( this.properties, "type", {
		get: function() { return that.outputs[0].type; },
		set: function(v) {
			that.outputs[0].type = v;
			if(that.graph)
				that.graph.changeGlobalInputType(input_name, that.outputs[0].type);
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
	var	data = this.graph.global_inputs[name];
	if(!data) return;

	//put through output
	this.setOutputData(0,data.value);
}

LiteGraph.registerNodeType("graph/input", GlobalInput);


//Output for a subgraph
function GlobalOutput( title )
{
	//random name to avoid problems with other outputs when added
	var output_name = title || "output_" + (Math.random()*1000).toFixed();

	this.addInput(output_name, null, {label:""});

	this.properties = {name: output_name, type: null };

	var that = this;

	Object.defineProperty(this.properties, "name", {
		get: function() {
			return output_name;
		},
		set: function(v) {
			if(v == "")
				return;

			var info = that.getInputInfo(0);
			if(info.name == v)
				return;
			info.name = v;
			that.title = v;
			if(that.graph)
				that.graph.renameGlobalOutput(output_name, v);
			output_name = v;
		},
		enumerable: true
	});

	Object.defineProperty(this.properties, "type", {
		get: function() { return that.inputs[0].type; },
		set: function(v) {
			that.inputs[0].type = v;
			if(that.graph)
				that.graph.changeGlobalInputType( output_name, that.inputs[0].type );
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


//Property getter
function GetProperty( title )
{
	this.title = title;

	this.addOutput("value", null);

	this.properties = { name: this.title, type: null };

	var that = this;

	Object.defineProperty( this.properties, "name", {
		get: function() {
			return that.properties[name];
		},
		set: function(v) {
			if(v == "")
				return;
			if(that.graph.properties[v] === undefined)
				return;

			var info = that.getOutputInfo(0);
			if(info.name == v)
				return;
			info.name = v;
			that.properties[name] = v;
		},
		enumerable: true
	});

	Object.defineProperty( this.properties, "type", {
		get: function() { return that.outputs[0].type; },
		enumerable: true
	});
}

GetProperty.title = "Get Property";
GetProperty.desc = "Property getter";

GetProperty.prototype.onExecute = function()
{
	var name = this.properties.name;

	//read from graph properties
	var	value = this.graph.properties[name];
	if(value === undefined) return;

	//put through output
	this.setOutputData(0,value);
}

LiteGraph.registerNodeType("graph/getProperty", GetProperty);


//Property setter
function SetProperty( title )
{
	this.title = title;

	this.addInput("set", LiteGraph.EXECUTE, {label:""});
	this.addInput("value", null);
	this.addOutput("completed", LiteGraph.EXECUTE, {label:""});

	this.properties = {name: this.title, type: null };

	var that = this;

	Object.defineProperty(this.properties, "name", {
		get: function() {
			return that.properties[name];
		},
		set: function(v) {
			if(v == "")
				return;
			if(that.graph.properties[v] === undefined)
				return;

			var info = that.getInputInfo(1);
			if(info.name == v)
				return;
			info.name = v;
			that.properties[name] = v;
		},
		enumerable: true
	});

	Object.defineProperty(this.properties, "type", {
		get: function() { return that.inputs[1].type; },
		enumerable: true
	});
}

SetProperty.title = "Set Property";
SetProperty.desc = "Property setter";

SetProperty.prototype.onExecute = function()
{
	var name = this.properties.name;
	this.graph.properties[name] = this.getInputData(1);
	this.graph.updatePropety(name);
	this.trigger("completed");
}

LiteGraph.registerNodeType("graph/setProperty", SetProperty);


//Comment: a node that encloses other nodes and have a comment message for title
function Comment( title )
{
	this.title = title;
	this.flags = {
		background: true
	};
	this.overlapping_nodes = [];
	this.is_dragging = false;
	this.bgcolor = "rgba(128,128,128,0.1)";
}

Comment.title = "Comment";
Comment.desc = "Comment enclosing other nodes";

Comment.prototype.onAdded = function()
{
	this.graph.sendActionToCanvas("sendToBack",[this]);
}

Comment.prototype.onMouseDown = function(e)
{
	var bounding = this.getBounding();

	this.is_dragging = true;
	this.last_p = [e.canvasX,e.canvasY];

	for(var i = 0, l = this.graph._nodes.length; i < l; i++)
	{
		var node = this.graph._nodes[i];
		if(!Object.is(this,node) && containsBounding(bounding, node.getBounding()))
			this.overlapping_nodes.push(node);
	}
}

Comment.prototype.onMouseMove = function(e,delta)
{
	if(this.is_dragging && this.overlapping_nodes)
	{
		for(var i = 0, l = this.overlapping_nodes.length; i < l; i++)
		{
			var node = this.overlapping_nodes[i];
			node.pos = [node.pos[0] + delta[0], node.pos[1] + delta[1]];
		}
	}

	this.last_p = [e.canvasX,e.canvasY];
}

Comment.prototype.onMouseUp = function(e)
{
	this.overlapping_nodes = [];
	this.is_dragging = false;
}

LiteGraph.registerNodeType("graph/comment", Comment);


})();
