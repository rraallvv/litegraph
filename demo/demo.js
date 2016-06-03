
function demo()
{
	JSONGraph();
}

function JSONGraph()
{
	graph.configure({
					nodes:[{type:"widget/button",pos:[950,200]},
						   {type:"basic/branch",pos:[1150,200]},
						   {type:"basic/console",pos:[1350,200]},
						   {type:"basic/console",pos:[1350,300]},
						   {type:"basic/number",pos:[100,200],properties:{value:2}},
						   {type:"basic/number",pos:[100,300]},
						   {type:"math/operation",pos:[300,200]},
						   {type:"basic/watch",pos:[500,200]},
						   {type:"graph/subgraph",pos:[500,300],subgraph:{
						   nodes:[{type:"graph/input",title:"Input",pos:[200,200]},
								  {type:"basic/watch",pos:[400,200]},
								  {type:"graph/output",title:"Output",pos:[600,200]}],
						   links:[{origin_id:0,origin_slot:0,target_id:1},
								  {origin_id:1,origin_slot:0,target_id:2}],
						   properties:{anumber:1, aboolean:true}
						   }},
						   {type:"basic/watch",pos:[700,300]},
						   {type:"graph/getProperty",pos:[1150,300],properties:{name:"astring"}},
						   {type:"widget/button",pos:[950,300]},
						   {type:"basic/string",pos:[950,400],properties:{value:"!!!"}},
						   {type:"graph/setProperty",pos:[1150,350],properties:{name:"astring"}},
						   {type:"graph/comment",pos:[50,150],size:[800,300],properties:{comment:"Network 1", color:"rgba(0,128,0,0.1)"}},
						   {type:"graph/comment",pos:[900,150],size:[600,300],properties:{comment:"Network 2"}},],
					links:[{origin_id:0,origin_slot:0,target_id:1},
						   {origin_id:1,origin_slot:0,target_id:2},
						   {origin_id:1,origin_slot:1,target_id:3},
						   {origin_id:4,origin_slot:0,target_id:6},
						   {origin_id:5,origin_slot:0,target_id:6,target_slot:1},
						   {origin_id:6,origin_slot:0,target_id:7},
						   {origin_id:6,origin_slot:0,target_id:8},
						   {origin_id:8,origin_slot:0,target_id:9},
						   {origin_id:10,origin_slot:0,target_id:3,target_slot:1},
						   {origin_id:11,origin_slot:0,target_id:13},
						   {origin_id:12,origin_slot:0,target_id:13,target_slot:1}],
					properties:{astring:"the string", aboolean:true}
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
