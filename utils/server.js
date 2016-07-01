var http = require("http");
var	url = require("url");
var path = require("path");
var fs = require("fs");

var port = process.argv[2] || 8080;
var root = process.argv[3] || "";

var contentTypesByExtension = {
	'.html': "text/html",
	'.css':	"text/css",
	'.js':	 "text/javascript"
};

http.createServer(function(request, response) {

	var uri = url.parse(request.url).pathname;
	var filename = path.join(process.cwd(), root + "/", uri);

	if (!fs.existsSync(filename)) {
		filename = path.join(process.cwd(), root + "/", "node_modules/", uri);

		if(!fs.existsSync(filename)) {
			console.log("404: " + uri);
			response.writeHead(404, {"Content-Type": "text/plain"});
			response.write("404 Not Found\n");
			response.end();
			return;
		}
	}

	if (fs.statSync(filename).isDirectory()) {
		filename += '/index.html';
	}

	var file = fs.readFileSync(filename, "binary");

	if (!file) {
		console.log("500: " + uri);
		response.writeHead(500, {"Content-Type": "text/plain"});
		response.write(err + "\n");
		response.end();
		return;
	}

	var headers = {};
	var contentType = contentTypesByExtension[path.extname(filename)];
	if (contentType) {
		headers["Content-Type"] = contentType;
	}
	response.writeHead(200, headers);
	response.write(file, "binary");
	response.end();

}).listen(parseInt(port, 10));

console.log("Static file server running at\n	=> http://localhost:" + port + "/\nCTRL + C to shutdown");
