
LiteGraph.nodeImagesPath = "../nodes_data/";
var editor = new LiteGraph.Editor("main");
window.graphcanvas = editor.graphcanvas;
window.graph = editor.graph;
window.addEventListener("resize", function() { editor.graphcanvas.resize(); });

function trace( a ) // eslint-disable-line no-unused-vars
{
	if ( typeof(console) == "object") {
		console.log( a );
	}
}
