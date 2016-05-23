
function demo()
{
	JSONGraph();
}

function JSONGraph()
{
	graph.configure({
					nodes:[{type:"widget/button",pos:[1000,200]},
						   {type:"widget/button",pos:[1000,300]},
						   {type:"basic/console",pos:[1200,200]},
						   {type:"basic/console",pos:[1200,300]},
						   {type:"basic/const",pos:[200,200]},
						   {type:"basic/const",pos:[200,300]},
						   {type:"math/operation",pos:[400,200]},
						   {type:"basic/watch",pos:[700,200]},
						   {type:"basic/watch",pos:[700,300]},
						   {type:"graph/subgraph",pos:[700,400],subgraph:{
						   nodes:[{type:"graph/input",pos:[200,200]},
								  {type:"basic/watch",pos:[400,200]},
								  {type:"graph/output",pos:[600,200]}],
						   links:[{origin_id:0,origin_slot:0,target_id:1},
								  {origin_id:1,origin_slot:0,target_id:2}]
						   }}],
					links:[{origin_id:0,origin_slot:0,target_id:2},
						   {origin_id:1,origin_slot:0,target_id:2},
						   {origin_id:4,origin_slot:0,target_id:6},
						   {origin_id:5,origin_slot:0,target_id:6,target_slot:1},
						   {origin_id:6,origin_slot:0,target_id:7},
						   {origin_id:6,origin_slot:0,target_id:8},
						   {origin_id:6,origin_slot:0,target_id:9}]
	});
}

function multiConnection()
{


	var node_button = LiteGraph.createNode("widget/button");
	node_button.pos = [1000,200];
	graph.add(node_button);

	var node_button2 = LiteGraph.createNode("widget/button");
	node_button2.pos = [1000,300];
	graph.add(node_button2);
	
	var node_console = LiteGraph.createNode("basic/console");
	node_console.pos = [1200,200];
	graph.add(node_console);
	
	var node_console2 = LiteGraph.createNode("basic/console");
	node_console2.pos = [1200,300];
	graph.add(node_console2);
	
	var node_const_A = LiteGraph.createNode("basic/const");
	node_const_A.pos = [200,200];
	graph.add(node_const_A);
	node_const_A.setValue(4.5);

	var node_const_B = LiteGraph.createNode("basic/const");
	node_const_B.pos = [200,300];
	graph.add(node_const_B);
	node_const_B.setValue(10);

	var node_math = LiteGraph.createNode("math/operation");
	node_math.pos = [400,200];
	graph.add(node_math);

	var node_watch = LiteGraph.createNode("basic/watch");
	node_watch.pos = [700,200];
	graph.add(node_watch);

	var node_watch2 = LiteGraph.createNode("basic/watch");
	node_watch2.pos = [700,300];
	graph.add(node_watch2);

	node_button.connect(0, node_console );
	node_button2.connect(0, node_console );
	node_const_A.connect(0,node_math,0 );
	node_const_B.connect(0,node_math,1 );
	node_math.connect(0,node_watch,0 );
	node_math.connect(0,node_watch2,0 );
}

function sortTest()
{
	var rand = LiteGraph.createNode("math/rand",null, {pos: [10,100] });
	graph.add(rand);

	var nodes = [];
	for(var i = 4; i >= 1; i--)
	{
		var n = LiteGraph.createNode("basic/watch",null, {pos: [i * 120,100] });
		graph.add(n);
		nodes[i-1] = n;
	}

	rand.connect(0, nodes[0], 0);

	for(var i = 0; i < nodes.length - 1; i++)
		nodes[i].connect(0,nodes[i+1], 0);
}

function benchmark()
{
	var num_nodes = 500;
	var consts = [];
	for(var i = 0; i < num_nodes; i++)
	{
		var n = LiteGraph.createNode("math/rand",null, {pos: [(2000 * Math.random())|0, (2000 * Math.random())|0] });
		graph.add(n);
		consts.push(n);
	}

	var watches = [];
	for(var i = 0; i < num_nodes; i++)
	{
		var n = LiteGraph.createNode("basic/watch",null, {pos: [(2000 * Math.random())|0, (2000 * Math.random())|0] });
		graph.add(n);
		watches.push(n);
	}

	for(var i = 0; i < num_nodes; i++)
		consts[ (Math.random() * consts.length)|0 ].connect(0, watches[ (Math.random() * watches.length)|0 ], 0 );
}