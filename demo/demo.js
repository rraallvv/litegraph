								
function demo()
{
	JSONGraph();
}

function JSONGraph()
{
	graph.configure({
					nodes:[{type:"widget/button",pos:[950,150]},
						   {type:"basic/branch",pos:[1150,150]},
						   {type:"basic/console",pos:[1350,150]},
						   {type:"basic/console",pos:[1350,250]},
						   {type:"basic/number",pos:[100,150],properties:{value:2}},
						   {type:"basic/number",pos:[100,250]},
						   {type:"math/operation",pos:[300,150]},
						   {type:"basic/watch",pos:[500,150],properties:{comment:"Just a comment"}},
						   {type:"graph/subgraph",pos:[500,250],subgraph:{
						   nodes:[{type:"graph/input",title:"Input",pos:[200,150]},
								  {type:"basic/watch",pos:[400,150]},
								  {type:"graph/output",title:"Output",pos:[600,150]}],
						   links:[{origin_id:0,origin_slot:0,target_id:1},
								  {origin_id:1,origin_slot:0,target_id:2}],
						   properties:{anumber:1, aboolean:true}
						   }},
						   {type:"basic/watch",pos:[700,250],properties:{comment:"and another one"}},
						   {type:"graph/getProperty",pos:[1150,250],properties:{name:"astring"}},
						   {type:"widget/button",pos:[950,250]},
						   {type:"basic/string",pos:[950,350],properties:{value:"!!!"}},
						   {type:"graph/setProperty",pos:[1150,300],properties:{name:"astring"}},
						   {type:"graph/comment",pos:[50,100],size:[800,200],properties:{comment:"Comment on network 1", color:"rgba(0,128,0,0.1)"}},
						   {type:"graph/comment",pos:[900,100],size:[600,300],properties:{comment:"Comment on network 2"}},
						   {type:"widget/button",pos:[100,400]},
						   {type:"basic/wrapper",pos:[250,450],properties:{name:"console.log", arguments:"msg"}},
						   {type:"basic/string",pos:[100,500],properties:{value:"the message"}},
						   {type:"widget/button",pos:[400,400]},
						   {type:"basic/wrapper",pos:[550,450],properties:{name:"Math.sin", arguments:"number", return:"sin"}},
						   {type:"basic/number",pos:[400,500],properties:{value:Math.PI/4}},
						   {type:"basic/wrapper",pos:[700,450],properties:{name:"console.log", arguments:"msg"}},
						   {type:"graph/comment",pos:[50,350],size:[800,200],properties:{comment:"Examples with the Wrapper node", color:"rgba(128,0,0,0.1)"}},
						   //For loop
						   {type:"widget/button",pos:[950,500]},
						   {type:"basic/number",pos:[950,550]},
						   {type:"basic/number",pos:[950,600],properties:{value:5}},
						   {type:"basic/forLoop",pos:[1120,500]},
						   {type:"basic/console",pos:[1350,500]},
						   {type:"basic/string",pos:[1200,590],properties:{value:"finished"}},
						   {type:"basic/console",pos:[1350,570]},
						   //For loop with break
						   {type:"widget/button",pos:[950,750]},
						   {type:"basic/number",pos:[950,800]},
						   {type:"basic/number",pos:[950,850],properties:{value:5}},
						   {type:"basic/forLoopWithBreak",pos:[1120,780]},
						   {type:"basic/console",pos:[1750,775]},
						   {type:"basic/string",pos:[1200,900],properties:{value:"finished"}},
						   {type:"basic/console",pos:[1350,850]},
						   {type:"math/condition",pos:[1300,750],properties:{OP:">="}},
						   {type:"basic/number",pos:[1150,725],properties:{value:3}},
						   {type:"basic/branch",pos:[1600,750]},
						   {type:"basic/boolean",pos:[1150,675],properties:{comment:"break"}},
						   {type:"math/logicCompare",pos:[1450,750],properties:{OP:"||"}},
						   {type:"math/logicNot",pos:[1300,675]},
						   {type:"basic/console",pos:[1750,850]},
						   {type:"basic/string",pos:[1600,900],properties:{value:"break"}},
						   {type:"graph/comment",pos:[900,450],size:[1000,500],properties:{comment:"Examples with loops", color:"rgba(0,0,128,0.1)"}}],
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
						   {origin_id:12,origin_slot:0,target_id:13,target_slot:1},
						   {origin_id:16,origin_slot:0,target_id:17},
						   {origin_id:18,origin_slot:0,target_id:17,target_slot:1},
						   {origin_id:19,origin_slot:0,target_id:20},
						   {origin_id:21,origin_slot:0,target_id:20,target_slot:1},
						   {origin_id:20,origin_slot:0,target_id:22},
						   {origin_id:20,origin_slot:1,target_id:22,target_slot:1},
						   //For loop
						   {origin_id:24,origin_slot:0,target_id:27},
						   {origin_id:25,origin_slot:0,target_id:27,target_slot:1},
						   {origin_id:26,origin_slot:0,target_id:27,target_slot:2},
						   {origin_id:27,origin_slot:0,target_id:28},
						   {origin_id:27,origin_slot:1,target_id:28,target_slot:1},
						   {origin_id:27,origin_slot:2,target_id:30},
						   {origin_id:29,origin_slot:0,target_id:30,target_slot:1},
						   //For loop with break
						   {origin_id:31,origin_slot:0,target_id:34},
						   {origin_id:32,origin_slot:0,target_id:34,target_slot:1},
						   {origin_id:33,origin_slot:0,target_id:34,target_slot:2},
						   {origin_id:34,origin_slot:0,target_id:40},
						   {origin_id:34,origin_slot:1,target_id:35,target_slot:1},
						   {origin_id:34,origin_slot:2,target_id:37},
						   {origin_id:36,origin_slot:0,target_id:37,target_slot:1},
						   {origin_id:34,origin_slot:1,target_id:38,target_slot:1},
						   {origin_id:39,origin_slot:0,target_id:38},
						   {origin_id:38,origin_slot:0,target_id:42,target_slot:1},
						   {origin_id:40,origin_slot:0,target_id:35},
						   {origin_id:40,origin_slot:1,target_id:34,target_slot:3},
						   {origin_id:41,origin_slot:0,target_id:43},
						   {origin_id:43,origin_slot:0,target_id:42},
						   {origin_id:40,origin_slot:1,target_id:44},
						   {origin_id:45,origin_slot:0,target_id:44,target_slot:1},
						   {origin_id:42,origin_slot:0,target_id:40,target_slot:1}],
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
