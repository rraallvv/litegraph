//basic nodes
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


//Number constant
function BasicNumber()
{
	this.addOutput("value","number");
	this.addProperty( "value", 1.0 );
	this.editable = { property:"value", type:"number" };
}

BasicNumber.title = "Number";
BasicNumber.desc = "Number value";

BasicNumber.prototype.setValue = function(v)
{
	if( typeof(v) == "string") v = parseFloat(v);
	this.properties["value"] = v;
	this.setDirtyCanvas(true);
};

BasicNumber.prototype.onExecute = function()
{
	this.setOutputData(0, parseFloat( this.properties["value"] ) );
}

BasicNumber.prototype.onDrawBackground = function(ctx)
{
	//show the current value
	this.outputs[0].label = this.properties["value"].toFixed(3);
}

BasicNumber.prototype.onWidget = function(e,widget)
{
	if(widget.name == "value")
		this.setValue(widget.value);
}

LiteGraph.registerNodeType("basic/number", BasicNumber);


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
	this.size = [60,20];
	this.addProperty( "msg", "" );
	this.addInput("log", LiteGraph.EXECUTE);
	this.addInput("msg",0);
}

Console.title = "Console";
Console.desc = "Show value inside the console";

Console.prototype.onExecute = function()
{
	var msg = this.getInputData(1);
	if(msg !== undefined)
		this.properties.msg = msg;
	else
		msg = this.properties.msg;
	console.log(msg);
}

Console.prototype.onGetInputs = function()
{
	return [["log",LiteGraph.EXECUTE],["warn",LiteGraph.EXECUTE],["error",LiteGraph.EXECUTE]];
}

LiteGraph.registerNodeType("basic/console", Console );


//Branch the execution branch depending on a condition value
function Branch()
{
	this.size = [60,20];
	this.addInput("if", LiteGraph.EXECUTE);
	this.addProperty("condition", false, "boolean");
	this.addInput("condition","boolean");
	this.addOutput("true", LiteGraph.EXECUTE);
	this.addOutput("false", LiteGraph.EXECUTE);
}

Branch.title = "Branch";
Branch.desc = "Choose a diferent execution brach depending on the value in condition";

Branch.prototype.onExecute = function()
{
	var condition = this.getInputData(1);
	if(condition !== undefined)
		this.properties.condition = condition;
	else
		condition = this.properties.condition;
	if(condition)
		this.trigger("true");
	else
		this.trigger("false");
}

LiteGraph.registerNodeType("basic/branch", Branch );


//String constant
function BasicString()
{
	this.addOutput("value","string");
	this.addProperty( "value", "" );
	this.editable = { property:"value", type:"string" };
}

BasicString.title = "String";
BasicString.desc = "String value";

BasicString.prototype.setValue = function(v)
{
	if( typeof(v) != "string") v = v.toString();
	this.properties["value"] = v;
	this.setDirtyCanvas(true);
};

BasicString.prototype.onExecute = function()
{
	this.setOutputData(0, this.properties["value"] );
}

BasicString.prototype.onDrawBackground = function(ctx)
{
	var text = this.properties["value"];

	ctx.font = LGraphCanvas.inner_text_font;

	var width = ctx.measureText(text).width;

	if(width > this.size[0] - 20)
		for(var i = 1; i < text.length; i++)
		{
			var short_text = text.slice(0, -i) + "...";
			width = ctx.measureText(short_text).width;
			if(width <= this.size[0] - 20)
			{
				text = short_text;
				break;
			}
		}

	//show the current value
	this.outputs[0].label = text;
}

BasicString.prototype.onWidget = function(e,widget)
{
	if(widget.name == "value")
		this.setValue(widget.value);
}

LiteGraph.registerNodeType("basic/string", BasicString);


//Boolean constant
function BasicBoolean()
{
	this.addOutput("value","boolean");
	this.addProperty( "value", true );
	this.editable = { property:"value", type:"boolean" };
}

BasicBoolean.title = "Boolean";
BasicBoolean.desc = "Boolean value";

BasicBoolean.prototype.setValue = function(v)
{
	if( typeof(v) != "boolean") v = v === true;
	this.properties["value"] = v;
	this.setDirtyCanvas(true);
};

BasicBoolean.prototype.onExecute = function()
{
	this.setOutputData(0, this.properties["value"] );
}

BasicBoolean.prototype.onDrawBackground = function(ctx)
{
	//show the current value
	this.outputs[0].label = this.properties["value"].toString();
}

BasicBoolean.prototype.onWidget = function(e,widget)
{
	if(widget.name == "value")
		this.setValue(widget.value);
}

LiteGraph.registerNodeType("basic/boolean", BasicBoolean);


//Property getter
function GetProperty( title )
{
	this.title = title;

	this.addOutput("value", null, {label:""});

	this.properties = { name: this.title, type: null };

	var that = this;

	Object.defineProperty( this.properties, "name", {
		get: function() {
			return that.title;
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
			that.title = v;
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
	this.addInput("value", null, {label:""});

	this.properties = {name: this.title, type: null };

	var that = this;

	Object.defineProperty(this.properties, "name", {
		get: function() {
			return that.title;
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
			that.title = v;
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
}

LiteGraph.registerNodeType("graph/setProperty", SetProperty);


})();
