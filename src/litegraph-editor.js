// NOT FINISHED

function LiteEditor( containerId, options ) { // eslint-disable-line no-unused-vars
	// fill container
	var html = "<div class='header'><div class='tools tools-left'></div><div class='tools tools-right'></div></div>";
	html += "<div class='content'><div class='editor-area'><canvas class='graphcanvas' width='1000' height='500' tabindex=10></canvas></div></div>";
	html += "<div class='footer'><div class='tools tools-left'></div><div class='tools tools-right'></div></div>";

	var root = document.createElement("div");
	this.root = root;
	root.className = "litegraph-editor";
	root.innerHTML = html;

	var canvas = root.querySelector(".graphcanvas");

	// create graph
	var graph = this.graph = new LGraph();
	var graphcanvas = this.graphcanvas = new LGraphCanvas( canvas, graph );
	graphcanvas.backgroundImage = "src/imgs/grid.png";
	graph.onAfterExecute = function() { graphcanvas.draw( true ); };

	// add stuff
	this.addToolsButton("loadsessionButton", "Load", litegraph.resolveUrl("imgs/icon-load.png"), this.onLoadButton.bind( this ), ".tools-left" );
	this.addToolsButton("savesessionButton", "Save", litegraph.resolveUrl("imgs/icon-save.png"), this.onSaveButton.bind( this ), ".tools-left" );
	this.addLoadCounter();
	this.addToolsButton("playnodeButton", "Play", litegraph.resolveUrl("imgs/icon-play.png"), this.onPlayButton.bind( this ), ".tools-right" );
	this.addToolsButton("playstepnodeButton", "Step", litegraph.resolveUrl("imgs/icon-playstep.png"), this.onPlayStepButton.bind( this ), ".tools-right" );

	this.addToolsButton("maximizeButton", "", litegraph.resolveUrl("imgs/icon-maximize.png"), this.onFullscreenButton.bind( this ), ".tools-right" );

	// this.addMiniWindow(300,200);

	// append to DOM
	var	parent = litegraph.$[containerId];
	if ( parent ) {
		Polymer.dom( parent ).appendChild( root );
	}

	graphcanvas.resize();
	// graphcanvas.draw(true,true);
}

LiteEditor.prototype.addLoadCounter = function() {
	var meter = document.createElement("div");
	meter.className = "headerpanel loadmeter toolbar-widget";

	var html = "<div class='cpuload'><strong>CPU</strong> <div class='bgload'><div class='fgload'></div></div></div>";
	html += "<div class='gpuload'><strong>GFX</strong> <div class='bgload'><div class='fgload'></div></div></div>";

	meter.innerHTML = html;
	Polymer.dom( this.root.querySelector(".header .tools-left") ).appendChild( meter );
	var self = this;

	setInterval(function() {
		meter.querySelector(".cpuload .fgload").style.width = ((2 * self.graph.elapsedTime) * 90) + "px";
		if ( self.graph.status == LGraph.STATUS_RUNNING ) {
			meter.querySelector(".gpuload .fgload").style.width = ((self.graphcanvas.renderTime * 10) * 90) + "px";
		} else {
			meter.querySelector(".gpuload .fgload").style.width = 4 + "px";
		}
	}, 200 );
};

LiteEditor.prototype.addToolsButton = function( id, name, iconUrl, callback, container ) {
	if ( !container ) {
		container = ".tools";
	}

	var button = this.createButton( name, iconUrl );
	button.id = id;
	button.addEventListener("click", callback );

	Polymer.dom( this.root.querySelector( container ) ).appendChild( button );
};


LiteEditor.prototype.createPanel = function( title, options ) { // eslint-disable-line no-unused-vars

	var root = document.createElement("div");
	root.className = "dialog";
	root.innerHTML = "<div class='dialog-header'><span class='dialog-title'>" + title + "</span></div><div class='dialog-content'></div><div class='dialog-footer'></div>";
	root.header = root.querySelector(".dialog-header");
	root.content = root.querySelector(".dialog-content");
	root.footer = root.querySelector(".dialog-footer");


	return root;
};

LiteEditor.prototype.createButton = function( name, iconUrl ) {
	var button = document.createElement("button");
	if ( iconUrl ) {
		button.innerHTML = "<img src='" + iconUrl + "'/> ";
	}
	button.innerHTML += name;
	return button;
};

LiteEditor.prototype.onLoadButton = function() {
	var panel = this.createPanel("Load session");
	var close = this.createButton("Close");
	close.style.float = "right";
	close.addEventListener("click", function() { Polymer.dom( panel.parentNode ).removeChild( panel ); });
	Polymer.dom( this.root ).appendChild( panel );
	panel.content.innerHTML = "test";
	Polymer.dom( panel.header ).appendChild( close );
};

LiteEditor.prototype.onSaveButton = function() {
	var object = this.graph.serialize();
	var string = JSON.stringify( object, null, "\t");
/*
	var formatted = "";
	var level = 0;
	for (var i = 0, l = string.length; i < l; i++) {
		var c = string[i];
		if (c == "{" || c == "[" || c == "(") {
			formatted += c;
			level++;
			if (level < 2) {
				formatted += "\n";
				for (var j = 0; j < level; j++)
					formatted += "\t";
			}
		}
		else if (c == "}" || c == "]" || c == ")") {
			level--;
			formatted += c;
		}
		else if (c == ",") {
			formatted += c;
			if (level == 2) {
				formatted += "\n";
				for (var j = 0; j < level; j++)
					formatted += "\t";
			}
		}
		else
			formatted += c;
	}
*/
	var dataURI = "data:text/json;charset=utf-8," + encodeURIComponent( string );
	window.open( dataURI );
};

LiteEditor.prototype.onPlayButton = function() {
	var graph = this.graph;
	var button = this.root.querySelector("#playnodeButton");

	if ( graph.status == LGraph.STATUS_STOPPED ) {
		button.innerHTML = "<img src='src/imgs/icon-stop.png'/> Stop";
		graph.start( 1 );
	} else {
		button.innerHTML = "<img src='src/imgs/icon-play.png'/> Play";
		graph.stop();
	}
};

LiteEditor.prototype.onPlayStepButton = function() {
	var graph = this.graph;
	graph.runStep( 1 );
	this.graphcanvas.draw( true, true );
};

LiteEditor.prototype.goFullscreen = function() {
	if ( this.root.requestFullscreen ) {
		this.root.requestFullscreen( Element.ALLOW_KEYBOARD_INPUT );
	} else if ( this.root.mozRequestFullscreen ) {
		this.root.requestFullscreen( Element.ALLOW_KEYBOARD_INPUT );
	} else if ( this.root.webkitRequestFullscreen ) {
		this.root.webkitRequestFullscreen( Element.ALLOW_KEYBOARD_INPUT );
	} else {
		throw("Fullscreen not supported");
	}

	var self = this;
	setTimeout(function() {
		self.graphcanvas.resize();
	}, 100 );
};

LiteEditor.prototype.onFullscreenButton = function() {
	this.goFullscreen();
};

LiteEditor.prototype.onMaximizeButton = function() {
	this.maximize();
};

LiteEditor.prototype.addMiniWindow = function( w, h ) {
	var miniwindow = document.createElement("div");
	miniwindow.className = "litegraph miniwindow";
	miniwindow.innerHTML = "<canvas class='graphcanvas' width='" + w + "' height='" + h + "' tabindex=10></canvas>";
	var canvas = miniwindow.querySelector("canvas");

	var graphcanvas = new LGraphCanvas( canvas, this.graph );
	graphcanvas.backgroundImage = "src/imgs/grid.png";
	graphcanvas.scale = 0.5;

	miniwindow.style.position = "absolute";
	miniwindow.style.top = "4px";
	miniwindow.style.right = "4px";

	var closeButton = document.createElement("div");
	closeButton.className = "corner-button";
	closeButton.innerHTML = "X";
	closeButton.addEventListener("click", function( e ) { // eslint-disable-line no-unused-vars
		graphcanvas.setGraph( null );
		Polymer.dom( miniwindow.parentNode ).removeChild( miniwindow );
	});
	Polymer.dom( this.root.querySelector(".content") ).appendChild( miniwindow );
	Polymer.dom( miniwindow ).appendChild( closeButton );
};

LiteGraph.Editor = LiteEditor;
