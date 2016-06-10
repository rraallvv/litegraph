(function() {


//Demo component
function DemoComponent() {
	//BasicNumber
	this.addOutput("value","number");
	this.addProperty( "value", 1.0 );
	this.editable = { property:"value", type:"number" };

	//Watch
	this.addInput("value",0,{label:""});
	this.addOutput("value",0,{label:""});
	this.addProperty( "value", "" );

	//Console
	this.addProperty( "msg", "" );
	this.addInput("log", LiteGraph.EXECUTE);
	this.addInput("msg",0);

	//BasicString
	this.addOutput("value","string");
	this.addProperty( "value", "" );
	this.editable = { property:"value", type:"string" };

	//BasicBoolean
	this.addOutput("value","boolean");
	this.addProperty( "value", true );
	this.editable = { property:"value", type:"boolean" };

	//Wrapper
	var functionName = undefined;
	var functionArguments = undefined;
	var functionReturn = undefined;

	this.addInput("call", LiteGraph.EXECUTE);
	this.addOutput("completed", LiteGraph.EXECUTE);

	var that = this;

	this.properties = {};

	Object.defineProperty( this.properties, "name", {
		get: function() {
			return functionName;
		},
		set: function(v) {
			if (v == "")
				return;
			if (functionName == v)
				return;
			that.title = v;

			//find a function with the given name
			var path = v.split(".");
			var functionObject = window[path.shift()];
			while (path.length > 0)
				functionObject = functionObject[path.shift()];
			that._functionObject = functionObject;

			functionName = v;
		},
		enumerable: true
	});

	Object.defineProperty( this.properties, "arguments", {
		get: function() {
			return functionArguments;
		},
		set: function(v) {
			if (v == "")
				return;
			if (functionArguments == v)
				return;

			for (var i = 1, l = that.inputs.length; i < l; i++)
				that.removeInput(i);

			if (v != undefined) {
				var strings = v.split(",");
				if (typeof(strings) === "string")
					that.addInput(strings);
				else
					for (var i = 0, l = strings.length; i < l; i++)
						that.addInput(strings[i]);
			}

			functionArguments = v;
		},
		enumerable: true
	});


	Object.defineProperty( this.properties, "return", {
		get: function() {
			return functionReturn;
		},
		set: function(v) {
			if (v == "")
				return;
			if (functionReturn == v)
				return;

			if (that.outputs.length == 2)
				that.removeOutput(1);

			if (v != undefined)
				that.addOutput(v);

			functionReturn = v;
		},
		enumerable: true
	});

	this.properties.name = "console.log";
	this.properties.arguments = "msg";
	this.properties.return = undefined;
}

DemoComponent.title = "Demo Component";
DemoComponent.desc = "The description goes here";

DemoComponent.prototype.onGetInputs = function() {
	//Console
	return [["log",LiteGraph.EXECUTE],["warn",LiteGraph.EXECUTE],["error",LiteGraph.EXECUTE]];
};

DemoComponent.prototype.setValue = function(v) {
	//BasicNumber
	if ( typeof(v) == "string") v = parseFloat(v);
	this.properties["value"] = v;
	this.setDirtyCanvas(true);

	//BasicString
	if ( typeof(v) != "string") v = v.toString();
	this.properties["value"] = v;
	this.setDirtyCanvas(true);

	//BasicBoolean
	if ( typeof(v) != "boolean") v = v === true;
	this.properties["value"] = v;
	this.setDirtyCanvas(true);
};

DemoComponent.prototype.onExecute = function() {
	//BasicNumber
	this.setOutputData(0, parseFloat( this.properties["value"] ) );

	//Watch
	this.properties.value = this.getInputData(0);
	this.setOutputData(0, this.properties.value);

	//Console
	var msg = this.getInputData(1);
	if (msg !== undefined)
		this.properties.msg = msg;
	else
		msg = this.properties.msg;
	console.log(msg);

	//BasicString
	this.setOutputData(0, this.properties["value"] );

	//BasicBoolean
	this.setOutputData(0, this.properties["value"] );

	//Wraper
	//collect the arguments
	var functionArguments = [];
	for (var i = 1, l = this.inputs.length; i < l; i++)
		functionArguments.push(this.getInputData(i));

	//call the wrapped function
	var functionObject = this._functionObject;
	if (functionObject) {
		var result = functionObject.apply(functionObject, functionArguments);
		if (this.outputs.length == 2) //set output to the result
			this.setOutputData(1, result);
	}

	//continue with the control flow
	this.trigger("completed");
}

DemoComponent.prototype.onDrawBackground = function(ctx) {
	//BasicNumber
	this.outputs[0].label = this.properties["value"].toFixed(3);

	//Watch
	if (this.inputs[0] && this.properties["value"] != null) {
		if (this.properties["value"].constructor === Number )
			this.inputs[0].label = this.properties["value"].toFixed(3);
		else
		{
			var str = this.properties["value"];
			if (str && str.length) //convert typed to array
				str = Array.prototype.slice.call(str).join(",");
			this.inputs[0].label = str;
		}
	}


	//BasicString
	var text = this.properties["value"];

	ctx.font = LGraphCanvas.innerTextFont;

	var width = ctx.measureText(text).width;

	if (width > this.size[0] - 20)
		for (var i = 1; i < text.length; i++) {
			var shortText = text.slice(0, -i) + "...";
			width = ctx.measureText(shortText).width;
			if (width <= this.size[0] - 20) {
				text = shortText;
				break;
			}
		}

	this.outputs[0].label = text;

	//BasicBoolean
	this.outputs[0].label = this.properties["value"].toString();
}

DemoComponent.prototype.onWidget = function(e,widget) {
	//BasicNumber
	if (widget.name == "value")
		this.setValue(widget.value);

	//BasicString
	if (widget.name == "value")
		this.setValue(widget.value);

	//BasicBoolean
	if (widget.name == "value")
		this.setValue(widget.value);
}

LiteGraph.registerNodeType("demo/component", DemoComponent);






//For loop
function ForLoop() {
	this.addInput("for", LiteGraph.EXECUTE);
	this.addInput("first index", "number");
	this.addInput("last index", "number");
	this.addOutput("loop body", LiteGraph.EXECUTE);
	this.addOutput("index", "number");
	this.addOutput("completed", LiteGraph.EXECUTE);
}

ForLoop.title = "For loop";
ForLoop.desc = "Loop from the first to the last index";

ForLoop.prototype.onExecute = function() {
	var firstIndex = this.getInputData(1);
	var lastIndex = this.getInputData(2);

	for (var i = firstIndex; i <= lastIndex; i++) {
		this.setOutputData(1, i);
		this.trigger("loop body");
	}

	this.trigger("completed");
}

LiteGraph.registerNodeType("basic/forLoop", ForLoop );


//For loop with break
function ForLoopWithBreak() {
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

ForLoopWithBreak.prototype.onExecute = function(action) {
	if (action == "break" && this.looping) {
		this.looping = false;
		return;
	}

	this.looping = true;

	var firstIndex = this.getInputData(1);
	var lastIndex = this.getInputData(2);

	for (var i = firstIndex; i <= lastIndex; i++) {
		this.setOutputData(1, i);
		this.trigger("loop body");
		if (!this.looping) return;
	}

	this.trigger("completed");
}

LiteGraph.registerNodeType("basic/forLoopWithBreak", ForLoopWithBreak );



})();
