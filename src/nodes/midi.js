/* eslint-disable */

(function( global ) {

function MIDIEvent( data ) {
	this.channel = 0;
	this.cmd = 0;

	if ( data ) {
		this.setup( data );
	} else {
		this.data = [ 0, 0, 0 ];
	}
}

MIDIEvent.prototype.setup = function( rawData ) {
	this.data = rawData;

	var midiStatus = rawData[ 0 ];
	this.status = midiStatus;

	var midiCommand = midiStatus & 0xF0;

	if ( midiStatus >= 0xF0 ) {
		this.cmd = midiStatus;
	} else {
		this.cmd = midiCommand;
	}

	if ( this.cmd == MIDIEvent.NOTEON && this.velocity == 0 ) {
		this.cmd = MIDIEvent.NOTEOFF;
	}

	this.cmdStr = MIDIEvent.commands[ this.cmd ] || "";

	if ( midiCommand >= MIDIEvent.NOTEON || midiCommand <= MIDIEvent.NOTEOFF ) {
		this.channel =  midiStatus & 0x0F;
	}
};

Object.defineProperty( MIDIEvent.prototype, "velocity", {
	get: function() {
		if ( this.cmd == MIDIEvent.NOTEON ) {
			return this.data[ 2 ];
		}
		return -1;
	},
	set: function( v ) {
		this.data[ 2 ] = v; //  v / 127;
	},
	enumerable: true
});

MIDIEvent.notes = [ "A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#" ];

// returns HZs
MIDIEvent.prototype.getPitch = function() {
	return Math.pow( 2, (this.data[ 1 ] - 69) / 12 ) * 440;
};

MIDIEvent.computePitch = function( note ) {
	return Math.pow( 2, (note - 69) / 12 ) * 440;
};


// not tested, there is a formula missing here
MIDIEvent.prototype.getPitchBend = function() {
	return this.data[ 1 ] + (this.data[ 2 ] << 7) - 8192;
};

MIDIEvent.computePitchBend = function( v1, v2 ) {
	return v1 + (v2 << 7) - 8192;
};

MIDIEvent.prototype.setCommandFromString = function( str ) {
	this.cmd = MIDIEvent.computeCommandFromString( str );
};

MIDIEvent.computeCommandFromString = function( str ) {
	if ( !str ) {
		return 0;
	}

	if ( str && str.constructor === Number ) {
		return str;
	}

	str = str.toUpperCase();
	switch ( str ) {
		case "NOTE ON":
		case "NOTEON": return MIDIEvent.NOTEON; break;
		case "NOTE OFF":
		case "NOTEOFF": return MIDIEvent.NOTEON; break;
		case "KEY PRESSURE":
		case "KEYPRESSURE": return MIDIEvent.KEYPRESSURE; break;
		case "CONTROLLER CHANGE":
		case "CONTROLLERCHANGE":
		case "CC": return MIDIEvent.CONTROLLERCHANGE; break;
		case "PROGRAM CHANGE":
		case "PROGRAMCHANGE":
		case "PC": return MIDIEvent.PROGRAMCHANGE; break;
		case "CHANNEL PRESSURE":
		case "CHANNELPRESSURE": return MIDIEvent.CHANNELPRESSURE; break;
		case "PITCH BEND":
		case "PITCHBEND": return MIDIEvent.PITCHBEND; break;
		case "TIME TICK":
		case "TIMETICK": return MIDIEvent.TIMETICK; break;
		default: return Number( str ); // asume its a hex code
	}
};

MIDIEvent.toNoteString = function( d ) {
	var note = d - 21;
	var octave = d - 24;
	note = note % 12;
	if ( note < 0 ) {
		note = 12 + note;
	}
	return MIDIEvent.notes[ note ] + Math.floor( octave / 12 + 1 );
};

MIDIEvent.prototype.toString = function() {
	var str = "" + this.channel + ". " ;
	switch ( this.cmd ) {
		case MIDIEvent.NOTEON: str += "NOTEON " + MIDIEvent.toNoteString( this.data[ 1 ] ); break;
		case MIDIEvent.NOTEOFF: str += "NOTEOFF " + MIDIEvent.toNoteString( this.data[ 1 ] ); break;
		case MIDIEvent.CONTROLLERCHANGE: str += "CC " + this.data[ 1 ] + " " + this.data[ 2 ]; break;
		case MIDIEvent.PROGRAMCHANGE: str += "PC " + this.data[ 1 ]; break;
		case MIDIEvent.PITCHBEND: str += "PITCHBEND " + this.getPitchBend(); break;
		case MIDIEvent.KEYPRESSURE: str += "KEYPRESS " + this.data[ 1 ]; break;
	}

	return str;
};

MIDIEvent.prototype.toHexString = function() {
	var str = "";
	for ( var i = 0; i < this.data.length; i++ ) {
		str += this.data[ i ].toString( 16 ) + " ";
	}
};

MIDIEvent.NOTEOFF = 0x80;
MIDIEvent.NOTEON = 0x90;
MIDIEvent.KEYPRESSURE = 0xA0;
MIDIEvent.CONTROLLERCHANGE = 0xB0;
MIDIEvent.PROGRAMCHANGE = 0xC0;
MIDIEvent.CHANNELPRESSURE = 0xD0;
MIDIEvent.PITCHBEND = 0xE0;
MIDIEvent.TIMETICK = 0xF8;

MIDIEvent.commands = {
	0x80: "note off",
	0x90: "note on",
	0xA0: "key pressure",
	0xB0: "controller change",
	0xC0: "program change",
	0xD0: "channel pressure",
	0xE0: "pitch bend",
	0xF0: "system",
	0xF2: "Song pos",
	0xF3: "Song select",
	0xF6: "Tune request",
	0xF8: "time tick",
	0xFA: "Start Song",
	0xFB: "Continue Song",
	0xFC: "Stop Song",
	0xFE: "Sensing",
	0xFF: "Reset"
};

// MIDI wrapper
function MIDIInterface( onReady, onError ) {
	if ( !navigator.requestMIDIAccess ) {
		this.error = "not suppoorted";
		if ( onError ) {
			onError("Not supported");
		} else {
			console.error("MIDI NOT SUPPORTED, enable by chrome://flags");
		}
		return;
	}

	this.onReady = onReady;

	navigator.requestMIDIAccess().then( this.onMIDISuccess.bind( this ), this.onMIDIFailure.bind( this ) );
}

MIDIInterface.MIDIEvent = MIDIEvent;

MIDIInterface.prototype.onMIDISuccess = function( midiAccess ) {
	console.log( "MIDI ready!" );
	console.log( midiAccess );
	this.midi = midiAccess;  // store in the global (in real usage, would probably keep in an object instance)
	this.updatePorts();

	if ( this.onReady ) {
		this.onReady( this );
	}
};

MIDIInterface.prototype.updatePorts = function() {
	var midi = this.midi;
	this.inputPorts = midi.inputs;
	var num = 0;
	for ( var i = 0; i < this.inputPorts.size; ++i ) {
			var input = this.inputPorts.get( i );
			console.log( "Input port [type:'" + input.type + "'] id:'" + input.id +
			"' manufacturer:'" + input.manufacturer + "' name:'" + input.name +
			"' version:'" + input.version + "'" );
			num++;
		}
	this.numInputPorts = num;


	num = 0;
	this.outputPorts = midi.outputs;
	for ( var i = 0; i < this.outputPorts.size; ++i ) {
			var output = this.outputPorts.get( i );
		console.log( "Output port [type:'" + output.type + "'] id:'" + output.id +
			"' manufacturer:'" + output.manufacturer + "' name:'" + output.name +
			"' version:'" + output.version + "'" );
			num++;
		}
	this.numOutputPorts = num;
};

MIDIInterface.prototype.onMIDIFailure = function( msg ) {
	console.error( "Failed to get MIDI access - " + msg );
};

MIDIInterface.prototype.openInputPort = function( port, callback ) {
	var inputPort = this.inputPorts.get( port );
	if ( !inputPort ) {
		return false;
	}

	inputPort.onmidimessage = function( a ) {
		var midiEvent = new MIDIEvent( a.data );
		if ( callback ) {
			callback( a.data, midiEvent );
		}
		if ( MIDIInterface.onMessage ) {
			MIDIInterface.onMessage( a.data, midiEvent );
		}
	};
	console.log("port open: ", inputPort );
	return true;
};

MIDIInterface.parseMsg = function( data ) {

};

MIDIInterface.prototype.sendMIDI = function( port, midiData ) {
	if ( !midiData ) {
		return;
	}

	var outputPort = this.outputPorts.get( port );
	if ( !outputPort ) {
		return;
	}

	if ( midiData.constructor === MIDIEvent ) {
		outputPort.send( midiData.data );
	} else {
		outputPort.send( midiData );
	}
};



function LGMIDIIn() {
	this.addOutput( "onMidi", LiteGraph.EXECUTE );
	this.addOutput( "out", "midi" );
	this.properties = { port: 0 };
	this._lastMidiEvent = null;
	this._currentMidiEvent = null;
}

LGMIDIIn.MIDIInterface = MIDIInterface;

LGMIDIIn.title = "MIDI Input";
LGMIDIIn.desc = "Reads MIDI from a input port";

LGMIDIIn.prototype.onStart = function() {
	var that = this;
	this._midi = new MIDIInterface(function( midi ) {
		// open
		midi.openInputPort( that.properties.port, that.onMIDIEvent.bind( that ) );
	});
};

LGMIDIIn.prototype.onMIDIEvent = function( data, midiEvent ) {
	this._lastMidiEvent = midiEvent;

	this.trigger( "onMidi" );
	if ( midiEvent.cmd == MIDIEvent.NOTEON ) {
		this.trigger( "onNoteon" );
	} else if ( midiEvent.cmd == MIDIEvent.NOTEOFF ) {
		this.trigger( "onNoteoff" );
	} else if ( midiEvent.cmd == MIDIEvent.CONTROLLERCHANGE ) {
		this.trigger( "onCc" );
	} else if ( midiEvent.cmd == MIDIEvent.PROGRAMCHANGE ) {
		this.trigger( "onPc" );
	} else if ( midiEvent.cmd == MIDIEvent.PITCHBEND ) {
		this.trigger( "onPitchbend" );
	}
};

LGMIDIIn.prototype.onExecute = function() {
	if ( this.outputs ) {
		var last = this._lastMidiEvent;
		for ( var i = 0; i < this.outputs.length; ++i ) {
			var output = this.outputs[ i ];
			var v = null;
			switch ( output.name ) {
				case "lastMidi": v = last; break;
				default:
					continue;
			}
			this.setOutputData( i, v );
		}
	}
};

LGMIDIIn.prototype.onGetOutputs = function() {
	return [
		[ "lastMidi", "midi" ],
		[ "onMidi", LiteGraph.EXECUTE ],
		[ "onNoteon", LiteGraph.EXECUTE ],
		[ "onNoteoff", LiteGraph.EXECUTE ],
		[ "onCc", LiteGraph.EXECUTE ],
		[ "onPc", LiteGraph.EXECUTE ],
		[ "onPitchbend", LiteGraph.EXECUTE ]
	];
};

LiteGraph.registerNodeType("midi/input", LGMIDIIn );


function LGMIDIOut() {
	this.addInput( "send", LiteGraph.EXECUTE );
	this.addInput( "midi", "midi" );
	this.properties = { port: 0 };
}

LGMIDIOut.MIDIInterface = MIDIInterface;

LGMIDIOut.title = "MIDI Output";
LGMIDIOut.desc = "Sends MIDI to output channel";

LGMIDIOut.prototype.onStart = function() {
	var that = this;
	this._midi = new MIDIInterface(function( midi ) {
		// ready
	});
};

LGMIDIOut.prototype.onExecute = function( event ) {
	var midiEvent = this.getInputData( 1 );
	console.log( midiEvent );
	if ( !this._midi ) {
		return;
	}
	if ( event == "send") {
		this._midi.sendMIDI( this.port, midiEvent );
	}
};

LGMIDIOut.prototype.onGetInputs = function() {
	return [ [ "send", LiteGraph.EXECUTE ] ];
};

LGMIDIOut.prototype.onGetOutputs = function() {
	return [ [ "onMidi", LiteGraph.EXECUTE ] ];
};

LiteGraph.registerNodeType("midi/output", LGMIDIOut );


function LGMIDIShow() {
	this.addInput( "onMidi", LiteGraph.EXECUTE );
	this.addInput( "midi", "midi" );
	this._str = "";
	this.size = [ 200, 40 ];
}

LGMIDIShow.title = "MIDI Show";
LGMIDIShow.desc = "Shows MIDI in the graph";

LGMIDIShow.prototype.onExecute = function( event ) {
	var midiEvent = this.getInputData( 1 );
	if ( !midiEvent ) {
		return;
	}
	if ( midiEvent.constructor === MIDIEvent ) {
		this._str = midiEvent.toString();
	} else {
		this._str = "???";
	}
};

LGMIDIShow.prototype.onDrawForeground = function( ctx ) {
	if ( !this._str ) {
		return;
	}

	ctx.font = "30px Arial";
	ctx.fillText( this._str, 10, this.size[ 1 ] * 0.8 );
};

LGMIDIShow.prototype.onGetInputs = function() {
	return [ [ "in", LiteGraph.EXECUTE ] ];
};

LGMIDIShow.prototype.onGetOutputs = function() {
	return [ [ "onMidi", LiteGraph.EXECUTE ] ];
};

LiteGraph.registerNodeType("midi/show", LGMIDIShow );



function LGMIDIFilter() {
	this.properties = {
		channel: -1,
		cmd: -1,
		minValue: -1,
		maxValue: -1
	};

	this.addInput( "in", LiteGraph.EXECUTE );
	this.addInput( "midi", "midi" );
	this.addOutput( "onMidi", LiteGraph.EXECUTE );
	this.addOutput( "midi", "midi" );
}

LGMIDIFilter.title = "MIDI Filter";
LGMIDIFilter.desc = "Filters MIDI messages";

LGMIDIFilter.prototype.onExecute = function( event ) {
	var midiEvent = this.getInputData( 1 );

	if ( !midiEvent || midiEvent.constructor !== MIDIEvent ) {
		return;
	}

	if ( this.properties.channel != -1 && midiEvent.channel != this.properties.channel ) {
		return;
	}
	if ( this.properties.cmd != -1 && midiEvent.cmd != this.properties.cmd ) {
		return;
	}
	if ( this.properties.minValue != -1 && midiEvent.data[ 1 ] < this.properties.minValue ) {
		return;
	}
	if ( this.properties.maxValue != -1 && midiEvent.data[ 1 ] > this.properties.maxValue ) {
		return;
	}
	this.setOutputData( 1, midiEvent );
	this.trigger("onMidi");
};

LiteGraph.registerNodeType("midi/filter", LGMIDIFilter );


function LGMIDIEvent() {
	this.properties = {
		channel: 0,
		cmd: "CC",
		value1: 1,
		value2: 1
	};

	this.addInput( "send", LiteGraph.EXECUTE );
	this.addInput( "midi", "midi" );
	this.addInput( "assign", LiteGraph.EXECUTE );
	this.addOutput( "onMidi", LiteGraph.EXECUTE );
}

LGMIDIEvent.title = "MIDIEvent";
LGMIDIEvent.desc = "Create a MIDI Event";

LGMIDIEvent.prototype.onExecute = function( event ) {
	var midiEvent = this.getInputData( 1 );

	if ( event == "assign") {
		this.properties.channel = midiEvent.channel;
		this.properties.cmd = midiEvent.cmd;
		this.properties.value1 = midiEvent.data[ 1 ];
		this.properties.value2 = midiEvent.data[ 2 ];
		return;
	}

	if ( event == "send") {
		var midiEvent = new MIDIEvent();
		midiEvent.channel = this.properties.channel;
		if ( this.properties.cmd && this.properties.cmd.constructor === String ) {
			midiEvent.setCommandFromString( this.properties.cmd );
		} else {
			midiEvent.cmd = this.properties.cmd;
		}
		midiEvent.data[ 0 ] = midiEvent.cmd | midiEvent.channel;
		midiEvent.data[ 1 ] = Number( this.properties.value1 );
		midiEvent.data[ 2 ] = Number( this.properties.value2 );
		this.setOutputData( 1, midiEvent );
		this.trigger("onMidi");
		return;
	}

	var props = this.properties;

	if ( this.outputs ) {
		for ( var i = 0; i < this.outputs.length; ++i ) {
			var output = this.outputs[ i ];
			var v = null;
			switch ( output.name ) {
				case "midi":
					v = new MIDIEvent();
					v.setup([ props.cmd, props.value1, props.value2 ]);
					v.channel = props.channel;
					break;
				case "command": v = props.cmd; break;
				case "note": v = (props.cmd == MIDIEvent.NOTEON || props.cmd == MIDIEvent.NOTEOFF) ? props.value1 : NULL; break;
				case "velocity": v = props.cmd == MIDIEvent.NOTEON ? props.value2 : NULL; break;
				case "pitch": v = props.cmd == MIDIEvent.NOTEON ? MIDIEvent.computePitch( props.value1 ) : null; break;
				case "pitchbend": v = props.cmd == MIDIEvent.PITCHBEND ? MIDIEvent.computePitchBend( props.value1, props.value2 ) : null; break;
				default:
					continue;
			}
			if ( v !== null ) {
				this.setOutputData( i, v );
			}
		}
	}
};

LGMIDIEvent.prototype.onPropertyChanged = function( name, value ) {
	if ( name == "cmd") {
		this.properties.cmd = MIDIEvent.computeCommandFromString( value );
	}
};


LGMIDIEvent.prototype.onGetOutputs = function() {
	return [
		[ "midi", "midi" ],
		[ "onMidi", LiteGraph.EXECUTE ],
		[ "command", "number" ],
		[ "note", "number" ],
		[ "velocity", "number" ],
		[ "pitch", "number" ],
		[ "pitchbend", "number" ]
	];
};


LiteGraph.registerNodeType("midi/event", LGMIDIEvent );




function now() { return window.performance.now(); }







})( window );
