module.exports = function (results) {
	var results = results || [];
	var errors = 0;
	var warnings = 0;
	var tooMany = false;
	var summary = '';

	results.some(function (current) {
		current.messages.some(function (msg) {
			summary += current.filePath + ':' + msg.line + ':' + msg.column + ': ';

			if (msg.severity === 1) {
				summary += 'warning';
				warning++;
			}
			else if (msg.severity === 2) {
				summary += 'error';
				errors++;
			}

			summary += ': ' + msg.message + '\n';

			if (errors === 20)
				tooMany = true;
			return tooMany;
		});
		return tooMany;
	});

	if (errors > 0 || warnings > 0) {
		if (tooMany)
			summary += 'fatal error: too many errors emitted, stopping now\n';

		if (warnings > 0) {
			summary += warnings +' warning';
			if (warnings > 1) {
				summary += 's';
			}
		}
		if (errors > 0 && warnings > 0) {
			summary += ' and ';
		}
		if (errors > 0) {
			summary += errors +' error';
			if (errors > 1) {
				summary += 's';
			}
		}

		return summary + ' generated.';
	}
};