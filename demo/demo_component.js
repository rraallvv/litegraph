(function() {


//Demo component
function DemoComponent() {
	//BasicBoolean
	this.addOutput("value","boolean");
	this.addProperty( "value", true );

	//BasicNumber
	this.addOutput("value","number");
	this.addProperty( "value", 1.0 );

	//BasicString
	this.addOutput("value","string");
	this.addProperty( "value", "" );

	//Watch
	this.addInput("value",0,{label:""});
	this.addOutput("value",0,{label:""});
	this.addProperty( "value", "" );

	//Console
	this.addProperty( "msg", "" );
	this.addInput("log", LiteGraph.EXECUTE);
	this.addInput("msg",0);

	//Wrapper
	var functionName = undefined;
	var functionArguments = undefined;
	var functionReturn = undefined;

	this.addInput("call", LiteGraph.EXECUTE);
	this.addOutput("completed", LiteGraph.EXECUTE);

	this.addProperty("name", "", "string", {
		get: function() {
			return functionName;
		},
		set: function(v) {
			if (v == "")
				return;
			if (functionName == v)
				return;
			this.title = v;

			//find a function with the given name
			var path = v.split(".");
			var functionObject = window[path.shift()];
			while (path.length > 0)
				functionObject = functionObject[path.shift()];
			this._functionObject = functionObject;

			functionName = v;
		}
	});

	this.addProperty("arguments", "", "string", {
		get: function() {
			return functionArguments;
		},
		set: function(v) {
			if (v == "")
				return;
			if (functionArguments == v)
				return;

			for (var i = 1, l = this.inputs.length; i < l; i++)
				this.removeInput(i);

			if (v != undefined) {
				var strings = v.split(",");
				if (typeof(strings) === "string")
					this.addInput(strings);
				else
					for (var i = 0, l = strings.length; i < l; i++)
						this.addInput(strings[i]);
			}

			functionArguments = v;
		}
	});

	this.addProperty("return", "", "string", {
		get: function() {
			return functionReturn;
		},
		set: function(v) {
			if (v == "")
				return;
			if (functionReturn == v)
				return;

			if (this.outputs.length == 2)
				this.removeOutput(1);

			if (v != undefined)
				this.addOutput(v);

			functionReturn = v;
		}
	});

	this.properties.name = "console.log";
	this.properties.arguments = "msg";
	this.properties.return = undefined;

	//ForLoop
	this.addInput("for", LiteGraph.EXECUTE);
	this.addInput("first index", "number");
	this.addInput("last index", "number");
	this.addOutput("loop body", LiteGraph.EXECUTE);
	this.addOutput("index", "number");
	this.addOutput("completed", LiteGraph.EXECUTE);

	//ForLoopWithBreak
	this.addInput("for", LiteGraph.EXECUTE);
	this.addInput("first index", "number");
	this.addInput("last index", "number");
	this.addInput("break", LiteGraph.EXECUTE);
	this.addOutput("loop body", LiteGraph.EXECUTE);
	this.addOutput("index", "number");
	this.addOutput("completed", LiteGraph.EXECUTE);
}

DemoComponent.title = "Demo Component";
DemoComponent.desc = "The description goes here";

DemoComponent.prototype.onGetInputs = function() {
	//Console
	return [["log",LiteGraph.EXECUTE],["warn",LiteGraph.EXECUTE],["error",LiteGraph.EXECUTE]];
};

DemoComponent.prototype.setValue = function(v) {
	//BasicBoolean
	if ( typeof(v) != "boolean")
		v = v === true;
	this.properties["value"] = v;
	this.setDirtyCanvas(true);

	//BasicNumber
	if ( typeof(v) == "string")
		v = parseFloat(v);
	this.properties["value"] = v;
	this.setDirtyCanvas(true);

	//BasicString
	if ( typeof(v) != "string")
		v = v.toString();
	this.properties["value"] = v;
	this.setDirtyCanvas(true);
};

DemoComponent.prototype.onExecute = function() {
	//BasicBoolean
	this.setOutputData(0, this.properties["value"] );

	//BasicNumber
	this.setOutputData(0, parseFloat( this.properties["value"] ) );

	//BasicString
	this.setOutputData(0, this.properties["value"] );

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

	//ForLoop
	var firstIndex = this.getInputData(1);
	var lastIndex = this.getInputData(2);

	for (var i = firstIndex; i <= lastIndex; i++) {
		this.setOutputData(1, i);
		this.trigger("loop body");
	}

	this.trigger("completed");

	//ForLoopWithBreak
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

DemoComponent.prototype.onDrawBackground = function(ctx) {
	//BasicBoolean
	this.outputs[0].label = this.properties["value"].toString();

	//BasicNumber
	this.outputs[0].label = this.properties["value"].toFixed(3);

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
}

DemoComponent.prototype.onWidget = function(e,widget) {
	//BasicBoolean
	//BasicNumber
	//BasicString
	if (widget.name == "value")
		this.setValue(widget.value);
}

LiteGraph.registerNodeType("demo/component", DemoComponent);


})();
