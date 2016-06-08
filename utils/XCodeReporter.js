module.exports = {
	reporter: function (res) {
		var len = res.length;
		var str = "";

		res.forEach(function (r) {
			var file = r.file;
			var err = r.error;
			
			str += file + ":" + err.line + ": error: " + err.reason + "\n";
		});
 
		if (str) {
			process.stderr.write(str);
			process.stdout.write(len + " error" + ((len === 1) ? "" : "s") + "\n");
		}
	}
};