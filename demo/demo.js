
function demo() { // eslint-disable-line no-unused-vars
	JSONGraph();
}

function JSONGraph() {
	graph.configure({ // eslint-disable-line no-undef
		nodes:[
			{ type:"widget/button", pos:[ 950, 150 ] },
			{ type:"basic/branch", pos:[ 1150, 150 ] },
			{ type:"basic/console", pos:[ 1350, 150 ] },
			{ type:"basic/console", pos:[ 1350, 250 ] },
			{ type:"basic/number", pos:[ 100, 150 ], properties:{ value:2 } },
			{ type:"basic/number", pos:[ 100, 250 ] },
			{ type:"math/operation", pos:[ 300, 150 ] },
			{ type:"basic/watch", pos:[ 500, 150 ], properties:{ comment:"Just a comment" } },
			{ type:"graph/subgraph",
				pos:[ 500, 250 ],
				subgraph:{
					nodes:[
						{ type:"graph/input", title:"Input", pos:[ 200, 150 ] },
						{ type:"basic/watch", pos:[ 400, 150 ] },
						{ type:"graph/output", title:"Output", pos:[ 600, 150 ] }
					],
					links:[
						[ 0, 1 ],
						[ 1, 2 ]
					],
					properties:{ anumber:1, aboolean:true }
				}
			},
			{ type:"basic/watch", pos:[ 700, 250 ], properties:{ comment:"and another one" } },
			{ type:"graph/getProperty", pos:[ 1150, 250 ], properties:{ name:"astring" } },
			{ type:"widget/button", pos:[ 950, 250 ] },
			{ type:"basic/string", pos:[ 950, 350 ], properties:{ value:"!!!" } },
			{ type:"graph/setProperty", pos:[ 1150, 300 ], properties:{ name:"astring" } },
			{ type:"graph/comment", pos:[ 50, 100 ], size:[ 800, 200 ], properties:{ comment:"Comment on network 1", color:"rgba(0,256,0,1)" } },
			{ type:"graph/comment", pos:[ 900, 100 ], size:[ 600, 300 ], properties:{ comment:"Comment on network 2" } },
			{ type:"widget/button", pos:[ 100, 400 ] },
			{ type:"basic/wrapper", pos:[ 250, 450 ], properties:{ name:"console.log", arguments:"msg" } },
			{ type:"basic/string", pos:[ 100, 500 ], properties:{ value:"the message" } },
			{ type:"widget/button", pos:[ 400, 400 ] },
			{ type:"basic/wrapper", pos:[ 550, 450 ], properties:{ name:"Math.sin", arguments:"number", return:"sin" } },
			{ type:"basic/number", pos:[ 400, 500 ], properties:{ value:Math.PI / 4 } },
			{ type:"basic/wrapper", pos:[ 700, 450 ], properties:{ name:"console.log", arguments:"msg" } },
			{ type:"graph/comment", pos:[ 50, 350 ], size:[ 800, 200 ], properties:{ comment:"Examples with the Wrapper node", color:"rgba(256,0,0,1)" } },
			// For loop
			{ type:"widget/button", pos:[ 950, 500 ] },
			{ type:"basic/number", pos:[ 950, 550 ] },
			{ type:"basic/number", pos:[ 950, 600 ], properties:{ value:5 } },
			{ type:"basic/forLoop", pos:[ 1120, 500 ] },
			{ type:"basic/console", pos:[ 1350, 500 ] },
			{ type:"basic/string", pos:[ 1200, 590 ], properties:{ value:"finished" } },
			{ type:"basic/console", pos:[ 1350, 570 ] },
			// For loop with break
			{ type:"widget/button", pos:[ 950, 750 ] },
			{ type:"basic/number", pos:[ 950, 800 ] },
			{ type:"basic/number", pos:[ 950, 850 ], properties:{ value:5 } },
			{ type:"basic/forLoopWithBreak", pos:[ 1120, 780 ] },
			{ type:"basic/console", pos:[ 1750, 775 ] },
			{ type:"basic/string", pos:[ 1200, 900 ], properties:{ value:"finished" } },
			{ type:"basic/console", pos:[ 1350, 850 ] },
			{ type:"math/condition", pos:[ 1300, 750 ], properties:{ OP:">=" } },
			{ type:"basic/number", pos:[ 1150, 725 ], properties:{ value:3 } },
			{ type:"basic/branch", pos:[ 1600, 750 ] },
			{ type:"basic/boolean", pos:[ 1150, 675 ], properties:{ comment:"break" } },
			{ type:"math/logicCompare", pos:[ 1450, 750 ], properties:{ OP:"||" } },
			{ type:"math/logicNot", pos:[ 1300, 675 ] },
			{ type:"basic/console", pos:[ 1750, 850 ] },
			{ type:"basic/string", pos:[ 1600, 900 ], properties:{ value:"break" } },
			{ type:"graph/comment", pos:[ 900, 450 ], size:[ 1000, 500 ], properties:{ comment:"Examples with loops", color:"rgba(0,0,256,1)" } }
		],
		links:[
			[ 0, 1 ],
			[ 1, 2 ],
			[ 1.1, 3 ],
			[ 4, 6 ],
			[ 5, 6.1 ],
			[ 6, 7 ],
			[ 6, 8 ],
			[ 8, 9 ],
			[ 10, 3.1 ],
			[ 11, 13 ],
			[ 12, 13.1 ],
			[ 16, 17 ],
			[ 18, 17.1 ],
			[ 19, 20 ],
			[ 21, 20.1 ],
			[ 20, 22 ],
			[ 20.1, 22.1 ],
			// For loop
			[ 24, 27 ],
			[ 25, 27.1 ],
			[ 26, 27.2 ],
			[ 27, 28 ],
			[ 27.1, 28.1 ],
			[ 27.2, 30 ],
			[ 29, 30.1 ],
			// For loop with break
			[ 31, 34 ],
			[ 32, 34.1 ],
			[ 33, 34.2 ],
			[ 34, 40 ],
			[ 34.1, 35.1 ],
			[ 34.2, 37 ],
			[ 36, 37.1 ],
			[ 34.1, 38.1 ],
			[ 39, 38 ],
			[ 38, 42.1 ],
			[ 40, 35 ],
			[ 40.1, 34.3 ],
			[ 41, 43 ],
			[ 43, 42 ],
			[ 40.1, 44 ],
			[ 45, 44.1 ],
			[ 42, 40.1 ]
		],
		properties:{ astring:"the string", aboolean:true }
	});
}

function multiConnection() { // eslint-disable-line no-unused-vars


	var nodeButton = LiteGraph.createNode("widget/button");
	nodeButton.pos = [ 1000, 200 ];
	graph.add( nodeButton ); // eslint-disable-line no-undef

	var nodeButton2 = LiteGraph.createNode("widget/button");
	nodeButton2.pos = [ 1000, 300 ];
	graph.add( nodeButton2 ); // eslint-disable-line no-undef

	var nodeConsole = LiteGraph.createNode("basic/console");
	nodeConsole.pos = [ 1200, 200 ];
	graph.add( nodeConsole ); // eslint-disable-line no-undef

	var nodeConsole2 = LiteGraph.createNode("basic/console");
	nodeConsole2.pos = [ 1200, 300 ];
	graph.add( nodeConsole2 ); // eslint-disable-line no-undef

	var nodeConstA = LiteGraph.createNode("basic/const");
	nodeConstA.pos = [ 200, 200 ];
	graph.add( nodeConstA ); // eslint-disable-line no-undef
	nodeConstA.setValue( 4.5 );

	var nodeConstB = LiteGraph.createNode("basic/const");
	nodeConstB.pos = [ 200, 300 ];
	graph.add( nodeConstB ); // eslint-disable-line no-undef
	nodeConstB.setValue( 10 );

	var nodeMath = LiteGraph.createNode("math/operation");
	nodeMath.pos = [ 400, 200 ];
	graph.add( nodeMath ); // eslint-disable-line no-undef

	var nodeWatch = LiteGraph.createNode("basic/watch");
	nodeWatch.pos = [ 700, 200 ];
	graph.add( nodeWatch ); // eslint-disable-line no-undef

	var nodeWatch2 = LiteGraph.createNode("basic/watch");
	nodeWatch2.pos = [ 700, 300 ];
	graph.add( nodeWatch2 ); // eslint-disable-line no-undef

	nodeButton.connect( 0, nodeConsole );
	nodeButton2.connect( 0, nodeConsole );
	nodeConstA.connect( 0, nodeMath, 0 );
	nodeConstB.connect( 0, nodeMath, 1 );
	nodeMath.connect( 0, nodeWatch, 0 );
	nodeMath.connect( 0, nodeWatch2, 0 );
}

function sortTest() { // eslint-disable-line no-unused-vars
	var rand = LiteGraph.createNode("math/rand", null, { pos: [ 10, 100 ] });
	graph.add( rand ); // eslint-disable-line no-undef

	var nodes = [];
	var i;
	for ( i = 4; i >= 1; i-- ) {
		var n = LiteGraph.createNode("basic/watch", null, { pos: [ i * 120, 100 ] });
		graph.add( n ); // eslint-disable-line no-undef
		nodes[ i - 1 ] = n;
	}

	rand.connect( 0, nodes[ 0 ], 0 );

	for ( i = 0; i < nodes.length - 1; i++ ) {
		nodes[ i ].connect( 0, nodes[ i + 1 ], 0 );
	}
}

function benchmark() { // eslint-disable-line no-unused-vars
	var numNodes = 500;
	var consts = [];
	var i;
	var n;

	for ( i = 0; i < numNodes; i++ ) {
		n = LiteGraph.createNode("math/rand", null, { pos: [ (2000 * Math.random()) | 0, (2000 * Math.random()) | 0 ] });
		graph.add( n ); // eslint-disable-line no-undef
		consts.push( n );
	}

	var watches = [];
	for ( i = 0; i < numNodes; i++ ) {
		n = LiteGraph.createNode("basic/watch", null, { pos: [ (2000 * Math.random()) | 0, (2000 * Math.random()) | 0 ] });
		graph.add( n ); // eslint-disable-line no-undef
		watches.push( n );
	}

	for ( i = 0; i < numNodes; i++ ) {
		consts[ (Math.random() * consts.length) | 0 ].connect( 0, watches[ (Math.random() * watches.length) | 0 ], 0 );
	}
}
