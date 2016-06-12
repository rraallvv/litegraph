/* eslint-disable */

var graph = null;
var graphcanvas = null;

$(window).load(function() {

	var id = null;
	if ($.getUrlVar("id") != null)
		id = parseInt($.getUrlVar("id"));
	else if (self.document.location.hash)
		id = parseInt( self.document.location.hash.substr(1) );

	$("#settingsButton").click( function() { $("#settings-panel").toggle(); });
	$("#addnodeButton").click( function() { onShowNodes() });
	$("#deletenodeButton").click( function() { onDeleteNode() });
	$("#clonenodeButton").click( function() { onCloneNode() });

	$("#playnodeButton").click( function() {
		if(graph.status == LGraph.STATUS_STOPPED)
		{
			$(this).html("<img src='imgs/icon-stop.png'/> Stop");
			graph.start(1);
		}
		else
		{
			$(this).html("<img src='imgs/icon-play.png'/> Play");
			graph.stop();
		}
	});

	$("#playstepnodeButton").click( function() {
		graph.runStep(1);
		graphcanvas.draw(true,true);
	});

	$("#playfastnodeButton").click( function() {
		graph.runStep(5000);
		graphcanvas.draw(true,true);
	});

	$("#collapsenodeButton").click( function() {
		/*
		for(var i in graphcanvas.nodesSelected)
			graphcanvas.nodesSelected[i].collapse();
		*/
		if(	graphcanvas.nodeInPanel )
			graphcanvas.nodeInPanel.collapse();

		graphcanvas.draw();
	});

	$("#pinnodeButton").click( function() {
		if(	graphcanvas.nodeInPanel )
			graphcanvas.nodeInPanel.pin();
	});

	$("#sendtobacknodeButton").click( function() {
		if(	graphcanvas.nodeInPanel )
			graphcanvas.sendToBack( graphcanvas.nodeInPanel );
		graphcanvas.draw(true);
	});



	$("#confirm-createnodeButton").click(function() {
		var element = $(".node-type.selected")[0];
		var name = element.data;
		var n = LiteGraph.createNode(name);
		graph.add(n);
		n.pos = graphcanvas.convertOffsetToCanvas([30,30]);
		graphcanvas.draw(true,true);
		$("#modal-blocking-box").hide();
		$("#nodes-browser").hide();
	});

	$("#cancel-createnodeButton").click(function() {
		$("#modal-blocking-box").hide();
		$("#nodes-browser").hide();
	});

	$("#close-areaButton").click(function() {
		$("#modal-blocking-box").hide();
		$("#data-visor").hide();
	});

	$("#confirm-loadsessionButton").click(function() {
		var element = $(".session-item.selected")[0];
		var info = element.data;

		var str = localStorage.getItem("graphSession_" + info.id );
		graph.stop();
		graph.unserialize(str);

		graphcanvas.draw(true,true);
		$("#modal-blocking-box").hide();
		$("#sessions-browser").hide();
	});

	$("#cancel-loadsessionButton").click(function() {
		$("#modal-blocking-box").hide();
		$("#sessions-browser").hide();
	});

	$("#livemodeButton").click( function() {
		graphcanvas.switchLiveMode(true);
		graphcanvas.draw();
		var url = graphcanvas.liveMode ? "imgs/gaussBgMedium.jpg" : "imgs/gaussBg.jpg";
		$("#livemodeButton").html(!graphcanvas.liveMode ? "<img src='imgs/icon-record.png'/> Live" : "<img src='imgs/icon-gear.png'/> Edit" );
		// $("canvas").css("background-image","url('"+url+"')");
	});

	$("#newsessionButton").click( function() {
		$("#main-area").hide();
		graph.clear();
		graphcanvas.draw();
		$("#main-area").show();
	});

	$("#savesessionButton").click( function() {
		onSaveSession();
	});

	$("#loadsessionButton").click( function() {
		onLoadSession();
	});

	$("#cancelsession-dialogButton").click(function()
	{
		$("#modal-blocking-box").hide();
		$("#savesession-dialog").hide();
	});

	$("#savesession-dialogButton").click(function()
	{
		var name = $("#session-name-input").val();
		var desc = $("#session-description-input").val();

		saveSession(name,desc);

		$("#modal-blocking-box").hide();
		$("#savesession-dialog").hide();

	});

	$("#closepanelButton").click(function()
	{
		graphcanvas.showNodePanel(null);
	});

	$("#maximizeButton").click(function()
	{
		if($("#main").width() != window.innerWidth)
		{
			$("#main").width( (window.innerWidth).toString() + "px");
			$("#main").height( (window.innerHeight - 40).toString() + "px");
			graphcanvas.resizeCanvas(window.innerWidth,window.innerHeight - 100);
		}
		else
		{
			$("#main").width("800px");
			$("#main").height("660px");
			graphcanvas.resizeCanvas(800,600);
		}
	});

	$("#resetscaleButton").click(function()
	{
		graph.config.canvasScale = 1.0;
		graphcanvas.draw(true,true);
	});

	$("#resetposButton").click(function()
	{
		graph.config.canvasOffset = [0,0];
		graphcanvas.draw(true,true);
	});

	$(".nodecolorbutton").click(function()
	{
		if(	graphcanvas.nodeInPanel )
		{
			graphcanvas.nodeInPanel.color = this.getAttribute("data-color");
			graphcanvas.nodeInPanel.bgcolor = this.getAttribute("data-bgcolor");
		}
		graphcanvas.draw(true,true);
	});


	if ("onhashchange" in window) // does the browser support the hashchange event?
	{
		window.onhashchange = function () {
			var h = window.location.hash.substr(1);
			// action
			return false;
		}
	}

	LiteGraph.nodeImagesPath = "../nodes_data/";
	graph = new LGraph();
	graphcanvas = new LGraphCanvas("graphcanvas",graph);
	graphcanvas.backgroundImage = "imgs/grid.png";

	graph.onAfterExecute = function() { graphcanvas.draw(true) };
	demo();

	graph.onPlayEvent = function()
	{
		$("#playnodeButton").addClass("playing");
		$("#playnodeButton").removeClass("stopped");
	}

	graph.onStopEvent = function()
	{
		$("#playnodeButton").addClass("stopped");
		$("#playnodeButton").removeClass("playing");
	}

	graphcanvas.draw();

	// update load counter
	setInterval(function() {
		$("#cpuload .fgload").width( (2*graph.elapsedTime) * 90);
		if(graph.status == LGraph.STATUS_RUNNING)
			$("#gpuload .fgload").width( (graphcanvas.renderTime*10) * 90);
		else
			$("#gpuload .fgload").width( 4 );
	},200);

	// LiteGraph.run(100);
});


function onShowNodes()
{
	$("#nodes-list").empty();

	for (var i in LiteGraph.registeredNodeTypes)
	{
		var node = LiteGraph.registeredNodeTypes[i];
		var categories = node.category.split("/");

		// create categories and find the propper one
		var root = $("#nodes-list")[0];
		for(var i in categories)
		{
			var result = $(root).find("#node-category_" + categories[i] + " .container");
			if (result.length == 0)
			{
				var element = document.createElement("div");
				element.id = "node-category_" + categories[i];
				element.className = "node-category";
				element.data = categories[i];
				element.innerHTML = "<strong class='title'>"+categories[i]+"</strong>";
				root.appendChild(element);

				$(element).find(".title").click(function(e){
					var element = $("#node-category_" + this.parentNode.data + " .container");
					$(element[0]).toggle();
				});


				var container = document.createElement("div");
				container.className = "container";
				element.appendChild(container);

				root = container;
			}
			else
				root = result[0];
		}

		// create entry
		var type = node.type;
		var element = document.createElement("div");
		element.innerHTML = "<strong>"+node.title+"</strong> " + (node.desc? node.desc : "");
		element.className = "node-type";
		element.id = "node-type-" + node.name;
		element.data = type;
		root.appendChild(element);
	}

	$(".node-type").click( function() {
		$(".node-type.selected").removeClass("selected");
		$(this).addClass("selected");
		$("#confirm-createnodeButton").attr("disabled",false);
	});

	$(".node-type").dblclick( function() {
		$("#confirm-createnodeButton").click();
	});

	$("#confirm-createnodeButton").attr("disabled",true);

	$("#modal-blocking-box").show();
	$("#nodes-browser").show();
}

function onDeleteNode()
{
	if(!graphcanvas.nodeInPanel) return;

	graph.remove( graphcanvas.nodeInPanel );
	graphcanvas.draw();
	$("#node-panel").hide();
	graphcanvas.nodeInPanel = null;
}

function onCloneNode()
{
	if(!graphcanvas.nodeInPanel) return;

	var n = graphcanvas.nodeInPanel.clone();
	n.pos[0] += 10;
	n.pos[1] += 10;

	graph.add(n);
	graphcanvas.draw();
}

function onSaveSession()
{
	if(graph.session.name)
		$("#session-name-input").val(graph.session.name);

	if(graph.session.description)
		$("#session-desc-input").val(graph.session.description);

	$("#modal-blocking-box").show();
	$("#savesession-dialog").show();
	// var str = LiteGraph.serialize();
	// localStorage.setItem("graphSession",str);
}

function saveSession(name,desc)
{
	desc = desc || "";

	graph.session.name = name;
	graph.session.description = desc;
	if(!graph.session.id)
		graph.session.id = new Date().getTime();

	var str = graph.serializeSession();
	localStorage.setItem("graphSession_" + graph.session.id,str);

	var sessionsStr = localStorage.getItem("nodeSessions");
	var sessions = [];

	if(sessionsStr)
		sessions = JSON.parse(sessionsStr);

	var pos = -1;
	for(var i = 0; i < sessions.length; i++)
		if( sessions[i].id == graph.session.id && sessions[i].name == name)
		{
			pos = i;
			break;
		}

	if(pos != -1)
	{
		// already on the list
	}
	else
	{
		var currentSession = {name:name, desc:desc, id:graph.session.id};
		sessions.unshift(currentSession);
		localStorage.setItem("graphSessions", JSON.stringify(sessions));
	}
}

function onLoadSession()
{
	$("#sessions-browser-list").empty();

	$("#modal-blocking-box").show();
	$("#sessions-browser").show();

	var sessionsStr = localStorage.getItem("graphSessions");
	var sessions = [];

	if(sessionsStr)
		sessions = JSON.parse(sessionsStr);

	for(var i in sessions)
	{
		var element = document.createElement("div");
		element.className = "session-item";
		element.data = sessions[i];
		$(element).html("<strong>"+sessions[i].name+"</strong><span>"+sessions[i].desc+"</span><span class='deleteSession'>x</span>");
		$("#sessions-browser-list").append(element);
	}

	$(".session-item").click( function() {
		$(".session-item.selected").removeClass("selected");
		$(this).addClass("selected");
		$("#confirm-loadsessionButton").attr("disabled",false);
	});

	$(".session-item").dblclick( function() {
		$("#confirm-loadsessionButton").click();
	});

	$(".deleteSession").click(function(e) {
		var root =  $(this).parent();
		var info = root[0].data;

		var sessionsStr = localStorage.getItem("graphSessions");
		var sessions = [];
		if(sessionsStr)
			sessions = JSON.parse(sessionsStr);
		var pos = -1;
		for(var i = 0; i < sessions.length; i++)
			if( sessions[i].id == info.id )
			{
				pos = i;
				break;
			}

		if(pos != -1)
		{
			sessions.splice(pos,1);
			localStorage.setItem("graphSessions", JSON.stringify(sessions));
		}

		root.remove();
	});

	$("#confirm-loadsessionButton").attr("disabled",true);

	/*
	LiteGraph.stop();
	var str = localStorage.getItem("graphSession");
	LiteGraph.unserialize(str);
	LiteGraph.draw();
	*/
}

function onShagraph()
{

}

function showImage(data)
{
	var img = new Image();
	img.src = data;
	$("#data-visor .content").empty();
	$("#data-visor .content").append(img);
	$("#modal-blocking-box").show();
	$("#data-visor").show();
}

function showElement(data)
{
	setTimeout(function(){
		$("#data-visor .content").empty();
		$("#data-visor .content").append(data);
		$("#modal-blocking-box").show();
		$("#data-visor").show();
	},100);
}


// ********* SEEDED RANDOM ******************************
function RandomNumberGenerator(seed)
{
	if (typeof(seed) == 'undefined')
	{
		var d = new Date();
		this.seed = 2345678901 + (d.getSeconds() * 0xFFFFFF) + (d.getMinutes() * 0xFFFF);
	}
	else
		this.seed = seed;

	this.A = 48271;
	this.M = 2147483647;
	this.Q = this.M / this.A;
	this.R = this.M % this.A;
	this.oneOverM = 1.0 / this.M;
	this.next = nextRandomNumber;
	return this;
}

function nextRandomNumber(){
	var hi = this.seed / this.Q;
	var lo = this.seed % this.Q;
	var test = this.A * lo - this.R * hi;
	if(test > 0){
		this.seed = test;
	} else {
		this.seed = test + this.M;
	}
	return (this.seed * this.oneOverM);
}

var RAND_GEN = RandomNumberGenerator(0);

function RandomSeed(s) { RAND_GEN = RandomNumberGenerator(s); };

function myrand(Min, Max){
	return Math.round((Max-Min) * RAND_GEN.next() + Min);
}

function myrandom() { return myrand(0,100000) / 100000; }

// @format (hex|rgb|null) : Format to return, default is integer
function randomColor(format)
{
 var rint = Math.round(0xffffff * myrandom());
 switch(format)
 {
	case 'hex':
	 return ('#0' + rint.toString(16)).replace(/^#0([0-9a-f]{6})$/i, '#$1');
	break;

	case 'rgb':
	 return 'rgb(' + (rint >> 16) + ',' + (rint >> 8 & 255) + ',' + (rint & 255) + ')';
	break;

	default:
	 return rint;
	break;
 }
}

$.extend({
	getUrlVars: function(){
		var vars = [], hash;
		var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
		for(var i = 0; i < hashes.length; i++)
		{
			hash = hashes[i].split('=');
			vars.push(hash[0]);
			vars[hash[0]] = hash[1];
		}
		return vars;
	},
	getUrlVar: function(name){
		return $.getUrlVars()[name];
	}
});

function trace(a)
{
	if(typeof(console) == "object")
		console.log(a);
}