# litegraph.js

Litegraph.js is a library that allows to create modular graphs on the web, similar to PureData.

Graphs can be used to create workflows, image processing, audio, or any kind of network of modules interacting with each other.

Some of the main features:

*   Automatic sorting of modules according to basic rules.
*   Dynamic number of input/outputs per module.
*   Persistence, graphs can be serialized in a JSON.
*   Optimized render in a HTML5 Canvas (supports hundres of modules on the screen).
*   Allows to run the graphs without the need of the canvas (standalone mode).
*   Simple API. It is very easy to create new modules.
*   Edit and Live mode, (in live mode only modules with widgets are rendered.
*   Contextual menu in the editor.

## Usage

Include the library

```HTML
<script type="text/javascript" src="../src/litegraph.js"></script>
```

Create a graph

```JavaScript
var graph = new LGraph();
```

Create a canvas renderer

```JavaScript
var canvas = new LGraphCanvas("#mycanvas");
```

Add some nodes to the graph

```JavaScript
var nodeConst = LiteGraph.createNode("basic/const");
nodeConst.pos = [200,200];
graph.add(nodeConst);
nodeConst.setValue(4.5);

var nodeWatch = LiteGraph.createNode("basic/watch");
nodeWatch.pos = [700,200];
graph.add(nodeWatch);
```

Connect them

```JavaScript
nodeConst.connect(0, nodeWatch, 0 );
```

Run the graph

```JavaScript
graph.start();
```
