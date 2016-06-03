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


})();
