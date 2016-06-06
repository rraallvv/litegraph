//basic nodes
(function(){


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


//Branch the execution path depending on the condition value
function Branch()
{
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


//Function wrapper
function Wrapper()
{
	var function_name = undefined;
	var function_arguments = undefined;
	var function_return = undefined;

	this.addInput("call", LiteGraph.EXECUTE);
	this.addOutput("completed", LiteGraph.EXECUTE);

	var that = this;

	this.properties = {};

	Object.defineProperty( this.properties, "name", {
		get: function() {
			return function_name;
		},
		set: function(v) {
			if(v == "")
				return;
			if(function_name == v)
				return;
			that.title = v;

			//find a function with the given name
			var path = v.split(".");
			var function_object = window[path.shift()];
			while(path.length > 0)
				function_object = function_object[path.shift()];
			that._function_object = function_object;

			function_name = v;
		},
		enumerable: true
	});

	Object.defineProperty( this.properties, "arguments", {
		get: function() {
			return function_arguments;
		},
		set: function(v) {
			if(v == "")
				return;
			if(function_arguments == v)
				return;

			for(var i = 1, l = that.inputs.length; i < l; i++)
				that.removeInput(i);

			if(v != undefined)
			{
				var strings = v.split(",");
				if(typeof(strings) === "string")
					that.addInput(strings);
				else
					for(var i = 0, l = strings.length; i < l; i++)
						that.addInput(strings[i]);
			}

			function_arguments = v;
		},
		enumerable: true
	});


	Object.defineProperty( this.properties, "return", {
		get: function() {
			return function_return;
		},
		set: function(v) {
			if(v == "")
				return;
			if(function_return == v)
				return;

			if(that.outputs.length == 2)
				that.removeOutput(1);

			if(v != undefined)
				that.addOutput(v);

			function_return = v;
		},
		enumerable: true
	});

	this.properties.name = "console.log";
	this.properties.arguments = "msg";
	this.properties.return = undefined;
}

Wrapper.title = "Wrapper";
Wrapper.desc = "Function wrapper";

Wrapper.prototype.onExecute = function()
{
	//collect the arguments
	var function_arguments = [];
	for(var i = 1, l = this.inputs.length; i < l; i++)
		function_arguments.push(this.getInputData(i));

	//call the wrapped function
	var function_object = this._function_object;
	if(function_object)
	{
		var result = function_object.apply(function_object, function_arguments);
		if(this.outputs.length == 2) //set output to the result
			this.setOutputData(1, result);
	}

	//continue with the control flow
	this.trigger("completed");
}

LiteGraph.registerNodeType("basic/wrapper", Wrapper);


//For loop
function ForLoop()
{
	this.addInput("for", LiteGraph.EXECUTE);
	this.addInput("first index", "number");
	this.addInput("last index", "number");
	this.addOutput("loop body", LiteGraph.EXECUTE);
	this.addOutput("index", "number");
	this.addOutput("completed", LiteGraph.EXECUTE);
}

ForLoop.title = "For loop";
ForLoop.desc = "Loop from the first to the last index";

ForLoop.prototype.onExecute = function()
{
	var first_index = this.getInputData(1);
	var last_index = this.getInputData(2);

	for(var i = first_index; i <= last_index; i++)
	{
		this.setOutputData(1, i);
		this.trigger("loop body");
	}

	this.trigger("completed");
}

LiteGraph.registerNodeType("basic/forLoop", ForLoop );


//For loop with break
function ForLoopWithBreak()
{
	this.addInput("for", LiteGraph.EXECUTE);
	this.addInput("first index", "number");
	this.addInput("last index", "number");
	this.addInput("break", LiteGraph.EXECUTE);
	this.addOutput("loop body", LiteGraph.EXECUTE);
	this.addOutput("index", "number");
	this.addOutput("completed", LiteGraph.EXECUTE);
}

ForLoopWithBreak.title = "For loop with break";
ForLoopWithBreak.desc = "Loop from the first to the last index, interrupted if break is triggered";

ForLoopWithBreak.prototype.onExecute = function(action)
{
	if(action == "break" && this.looping)
	{
		this.looping = false;
		return;
	}

	this.looping = true;

	var first_index = this.getInputData(1);
	var last_index = this.getInputData(2);

	for(var i = first_index; i <= last_index; i++)
	{
		this.setOutputData(1, i);
		this.trigger("loop body");
		if(!this.looping) return;
	}

	this.trigger("completed");
}

LiteGraph.registerNodeType("basic/forLoopWithBreak", ForLoopWithBreak );



})();
