// Works with Litegl.js to create WebGL nodes
if ( typeof(LiteGraph) != "undefined") {

	// Texture Lens *****************************************
	function LGraphFXLens() {
		this.addInput("Texture", "Texture");
		this.addInput("Aberration", "number");
		this.addInput("Distortion", "number");
		this.addInput("Blur", "number");
		this.addOutput("Texture", "Texture");
		this.properties = { aberration:1.0, distortion: 1.0, blur: 1.0, precision: LGraphTexture.DEFAULT };

		if ( !LGraphFXLens._shader )
			LGraphFXLens._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphFXLens.pixelShader );
	}

	LGraphFXLens.title = "Lens";
	LGraphFXLens.desc = "Camera Lens distortion";
	LGraphFXLens.widgetsInfo = {
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphFXLens.prototype.onExecute = function() {
		var tex = this.getInputData( 0 );
		if ( this.properties.precision === LGraphTexture.PASS_THROUGH ) {
			this.setOutputData( 0, tex );
			return;
		}

		if ( !tex ) return;

		this._tex = LGraphTexture.getTargetTexture( tex, this._tex, this.properties.precision );

		// iterations
		var aberration = this.properties.aberration;
		if ( this.isInputConnected( 1 ) ) {
			aberration = this.getInputData( 1 );
			this.properties.aberration = aberration;
		}

		var distortion = this.properties.distortion;
		if ( this.isInputConnected( 2 ) ) {
			distortion = this.getInputData( 2 );
			this.properties.distortion = distortion;
		}

		var blur = this.properties.blur;
		if ( this.isInputConnected( 3 ) ) {
			blur = this.getInputData( 3 );
			this.properties.blur = blur;
		}

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );
		var mesh = Mesh.getScreenQuad();
		var shader = LGraphFXLens._shader;
		var camera = LS.Renderer._currentCamera;

		this._tex.drawTo(function() {
			tex.bind( 0 );
			shader.uniforms({ uTexture:0, uAberration: aberration, uDistortion: distortion, uBlur: blur })
				.draw( mesh );
		});

		this.setOutputData( 0, this._tex );
	};

	LGraphFXLens.pixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform vec2 uCameraPlanes;\n\
			uniform float uAberration;\n\
			uniform float uDistortion;\n\
			uniform float uBlur;\n\
			\n\
			void main() {\n\
				vec2 coord = vCoord;\n\
				float dist = distance(vec2(0.5), coord);\n\
				vec2 distCoord = coord - vec2(0.5);\n\
				float percent = 1.0 + ((0.5 - dist) / 0.5) * uDistortion;\n\
				distCoord *= percent;\n\
				coord = distCoord + vec2(0.5);\n\
				vec4 color = texture2D(uTexture,coord, uBlur * dist);\n\
				color.r = texture2D(uTexture,vec2(0.5) + distCoord * (1.0+0.01*uAberration), uBlur * dist ).r;\n\
				color.b = texture2D(uTexture,vec2(0.5) + distCoord * (1.0-0.01*uAberration), uBlur * dist ).b;\n\
				gl_FragColor = color;\n\
			}\n\
			";
		/*
			float normalizedTunableSigmoid(float xs, float k)\n\
			{\n\
				xs = xs * 2.0 - 1.0;\n\
				float signx = sign(xs);\n\
				float absx = abs(xs);\n\
				return signx * ((-k - 1.0)*absx)/(2.0*(-2.0*k*absx+k-1.0)) + 0.5;\n\
			}\n\
		*/

	LiteGraph.registerNodeType("fx/lens", LGraphFXLens );
	window.LGraphFXLens = LGraphFXLens;

	// *******************************************************

	function LGraphFXBokeh() {
		this.addInput("Texture", "Texture");
		this.addInput("Blurred", "Texture");
		this.addInput("Mask", "Texture");
		this.addInput("Threshold", "number");
		this.addOutput("Texture", "Texture");
		this.properties = { shape: "", size: 10, alpha: 1.0, threshold: 1.0, highPrecision: false };
	}

	LGraphFXBokeh.title = "Bokeh";
	LGraphFXBokeh.desc = "applies an Bokeh effect";

	LGraphFXBokeh.widgetsInfo = { "shape": { widget:"texture" } };

	LGraphFXBokeh.prototype.onExecute = function() {
		var tex = this.getInputData( 0 );
		var blurredTex = this.getInputData( 1 );
		var maskTex = this.getInputData( 2 );
		if ( !tex || !maskTex || !this.properties.shape ) {
			this.setOutputData( 0, tex );
			return;
		}

		if ( !blurredTex )
			blurredTex = tex;

		var shapeTex = LGraphTexture.getTexture( this.properties.shape );
		if ( !shapeTex )
			return;

		var threshold = this.properties.threshold;
		if ( this.isInputConnected( 3 ) ) {
			threshold = this.getInputData( 3 );
			this.properties.threshold = threshold;
		}


		var precision = gl.UNSIGNED_BYTE;
		if ( this.properties.highPrecision )
			precision = gl.halfFloatExt ? gl.HALF_FLOAT_OES : gl.FLOAT;
		if ( !this._tempTexture || this._tempTexture.type != precision ||
			this._tempTexture.width != tex.width || this._tempTexture.height != tex.height )
			this._tempTexture = new GL.Texture( tex.width, tex.height, { type: precision, format: gl.RGBA, filter: gl.LINEAR });

		// iterations
		var size = this.properties.size;

		var firstShader = LGraphFXBokeh._firstShader;
		if ( !firstShader )
			firstShader = LGraphFXBokeh._firstShader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphFXBokeh._firstPixelShader );

		var secondShader = LGraphFXBokeh._secondShader;
		if ( !secondShader )
			secondShader = LGraphFXBokeh._secondShader = new GL.Shader( LGraphFXBokeh._secondVertexShader, LGraphFXBokeh._secondPixelShader );

		var pointsMesh = this._pointsMesh;
		if ( !pointsMesh || pointsMesh._width != tex.width || pointsMesh._height != tex.height || pointsMesh._spacing != 2 )
			pointsMesh = this.createPointsMesh( tex.width, tex.height, 2 );

		var screenMesh = Mesh.getScreenQuad();

		var pointSize = this.properties.size;
		var minLight = this.properties.minLight;
		var alpha = this.properties.alpha;

		gl.disable( gl.DEPTH_TEST );
		gl.disable( gl.BLEND );

		this._tempTexture.drawTo(function() {
			tex.bind( 0 );
			blurredTex.bind( 1 );
			maskTex.bind( 2 );
			firstShader.uniforms({ uTexture:0, uTextureBlur:1, uMask: 2, uTexsize: [ tex.width, tex.height ] })
				.draw( screenMesh );
		});

		this._tempTexture.drawTo(function() {
			// clear because we use blending
			// gl.clearColor(0.0,0.0,0.0,1.0);
			// gl.clear( gl.COLOR_BUFFER_BIT );
			gl.enable( gl.BLEND );
			gl.blendFunc( gl.ONE, gl.ONE );

			tex.bind( 0 );
			shapeTex.bind( 3 );
			secondShader.uniforms({ uTexture:0, uMask: 2, uShape:3, uAlpha: alpha, uThreshold: threshold, uPointSize: pointSize, uItexsize: [ 1.0 / tex.width, 1.0 / tex.height ] })
				.draw( pointsMesh, gl.POINTS );
		});

		this.setOutputData( 0, this._tempTexture );
	};

	LGraphFXBokeh.prototype.createPointsMesh = function( width, height, spacing ) {
		var nwidth = Math.round( width / spacing );
		var nheight = Math.round( height / spacing );

		var vertices = new Float32Array( nwidth * nheight * 2 );

		var ny = -1;
		var dx = 2 / width * spacing;
		var dy = 2 / height * spacing;
		for ( var y = 0; y < nheight; ++y ) {
			var nx = -1;
			for ( var x = 0; x < nwidth; ++x ) {
				var pos = y * nwidth * 2 + x * 2;
				vertices[ pos ] = nx;
				vertices[ pos + 1 ] = ny;
				nx += dx;
			}
			ny += dy;
		}

		this._pointsMesh = GL.Mesh.load({ vertices2D: vertices });
		this._pointsMesh._width = width;
		this._pointsMesh._height = height;
		this._pointsMesh._spacing = spacing;

		return this._pointsMesh;
	};

	/*
	LGraphTextureBokeh._pixelShader = "precision highp float;\n\
			varying vec2 aCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform sampler2D uShape;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D( uTexture, gl_PointCoord );\n\
				color *= vColor * uAlpha;\n\
				gl_FragColor = color;\n\
			}\n";
	*/

	LGraphFXBokeh._firstPixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform sampler2D uTextureBlur;\n\
			uniform sampler2D uMask;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D(uTexture, vCoord);\n\
				vec4 blurredColor = texture2D(uTextureBlur, vCoord);\n\
				float mask = texture2D(uMask, vCoord).x;\n\
				 gl_FragColor = mix(color, blurredColor, mask);\n\
			}\n\
			";

	LGraphFXBokeh._secondVertexShader = "precision highp float;\n\
			attribute vec2 aVertex2D;\n\
			varying vec4 vColor;\n\
			uniform sampler2D uTexture;\n\
			uniform sampler2D uMask;\n\
			uniform vec2 uItexsize;\n\
			uniform float uPointSize;\n\
			uniform float uThreshold;\n\
			void main() {\n\
				vec2 coord = aVertex2D * 0.5 + 0.5;\n\
				vColor = texture2D( uTexture, coord );\n\
				vColor += texture2D( uTexture, coord + vec2(uItexsize.x, 0.0) );\n\
				vColor += texture2D( uTexture, coord + vec2(0.0, uItexsize.y));\n\
				vColor += texture2D( uTexture, coord + uItexsize);\n\
				vColor *= 0.25;\n\
				float mask = texture2D(uMask, coord).x;\n\
				float luminance = length(vColor) * mask;\n\
				/*luminance /= (uPointSize*uPointSize)*0.01 */;\n\
				luminance -= uThreshold;\n\
				if (luminance < 0.0)\n\
				{\n\
					gl_Position.x = -100.0;\n\
					return;\n\
				}\n\
				gl_PointSize = uPointSize;\n\
				gl_Position = vec4(aVertex2D,0.0,1.0);\n\
			}\n\
			";

	LGraphFXBokeh._secondPixelShader = "precision highp float;\n\
			varying vec4 vColor;\n\
			uniform sampler2D uShape;\n\
			uniform float uAlpha;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D( uShape, gl_PointCoord );\n\
				color *= vColor * uAlpha;\n\
				gl_FragColor = color;\n\
			}\n";


	LiteGraph.registerNodeType("fx/bokeh", LGraphFXBokeh );
	window.LGraphFXBokeh = LGraphFXBokeh;

	// ************************************************

	function LGraphFXGeneric() {
		this.addInput("Texture", "Texture");
		this.addInput("value1", "number");
		this.addInput("value2", "number");
		this.addOutput("Texture", "Texture");
		this.properties = { fx: "halftone", value1: 1, value2: 1, precision: LGraphTexture.DEFAULT };
	}

	LGraphFXGeneric.title = "FX";
	LGraphFXGeneric.desc = "applies an FX from a list";

	LGraphFXGeneric.widgetsInfo = {
		"fx": { widget:"combo", values:[ "halftone", "pixelate", "lowpalette", "noise", "gamma" ] },
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};
	LGraphFXGeneric.shaders = {};

	LGraphFXGeneric.prototype.onExecute = function() {
		if ( !this.isOutputConnected( 0 ) )
			return; // saves work

		var tex = this.getInputData( 0 );
		if ( this.properties.precision === LGraphTexture.PASS_THROUGH ) {
			this.setOutputData( 0, tex );
			return;
		}

		if ( !tex )
			return;

		this._tex = LGraphTexture.getTargetTexture( tex, this._tex, this.properties.precision );

		// iterations
		var value1 = this.properties.value1;
		if ( this.isInputConnected( 1 ) ) {
			value1 = this.getInputData( 1 );
			this.properties.value1 = value1;
		}

		var value2 = this.properties.value2;
		if ( this.isInputConnected( 2 ) ) {
			value2 = this.getInputData( 2 );
			this.properties.value2 = value2;
		}

		var fx = this.properties.fx;
		var shader = LGraphFXGeneric.shaders[ fx ];
		if ( !shader ) {
			var pixelShaderCode = LGraphFXGeneric[ "pixelShader_" + fx ];
			if ( !pixelShaderCode )
				return;

			shader = LGraphFXGeneric.shaders[ fx ] = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, pixelShaderCode );
		}


		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );
		var mesh = Mesh.getScreenQuad();
		var camera = LS.Renderer._currentCamera;

		var noise = null;
		if ( fx == "noise")
			noise = LGraphTexture.getNoiseTexture();

		this._tex.drawTo(function() {
			tex.bind( 0 );
			if ( fx == "noise")
				noise.bind( 1 );

			shader.uniforms({ uTexture:0, uNoise:1, uSize: [ tex.width, tex.height ], uRand:[ Math.random(), Math.random() ], uValue1: value1, uValue2: value2, uCameraPlanes: [ LS.Renderer._currentCamera.near, LS.Renderer._currentCamera.far ] })
				.draw( mesh );
		});

		this.setOutputData( 0, this._tex );
	};

	LGraphFXGeneric.pixelShaderHalftone = "precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform vec2 uCameraPlanes;\n\
			uniform vec2 uSize;\n\
			uniform float uValue1;\n\
			uniform float uValue2;\n\
			\n\
			float pattern() {\n\
				float s = sin(uValue1 * 3.1415), c = cos(uValue1 * 3.1415);\n\
				vec2 tex = vCoord * uSize.xy;\n\
				vec2 point = vec2(\n\
					 c * tex.x - s * tex.y ,\n\
					 s * tex.x + c * tex.y \n\
				) * uValue2;\n\
				return (sin(point.x) * sin(point.y)) * 4.0;\n\
			}\n\
			void main() {\n\
				vec4 color = texture2D(uTexture, vCoord);\n\
				float average = (color.r + color.g + color.b) / 3.0;\n\
				gl_FragColor = vec4(vec3(average * 10.0 - 5.0 + pattern()), color.a);\n\
			}\n";

	LGraphFXGeneric.pixelShaderPixelate = "precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform vec2 uCameraPlanes;\n\
			uniform vec2 uSize;\n\
			uniform float uValue1;\n\
			uniform float uValue2;\n\
			\n\
			void main() {\n\
				vec2 coord = vec2( floor(vCoord.x * uValue1) / uValue1, floor(vCoord.y * uValue2) / uValue2 );\n\
				vec4 color = texture2D(uTexture, coord);\n\
				gl_FragColor = color;\n\
			}\n";

	LGraphFXGeneric.pixelShaderLowpalette = "precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform vec2 uCameraPlanes;\n\
			uniform vec2 uSize;\n\
			uniform float uValue1;\n\
			uniform float uValue2;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D(uTexture, vCoord);\n\
				gl_FragColor = floor(color * uValue1) / uValue1;\n\
			}\n";

	LGraphFXGeneric.pixelShaderNoise = "precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform sampler2D uNoise;\n\
			uniform vec2 uSize;\n\
			uniform float uValue1;\n\
			uniform float uValue2;\n\
			uniform vec2 uRand;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D(uTexture, vCoord);\n\
				vec3 noise = texture2D(uNoise, vCoord * vec2(uSize.x / 512.0, uSize.y / 512.0) + uRand).xyz - vec3(0.5);\n\
				gl_FragColor = vec4( color.xyz + noise * uValue1, color.a );\n\
			}\n";

	LGraphFXGeneric.pixelShaderGamma = "precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform float uValue1;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D(uTexture, vCoord);\n\
				float gamma = 1.0 / uValue1;\n\
				gl_FragColor = vec4( pow( color.xyz, vec3(gamma) ), color.a );\n\
			}\n";


	LiteGraph.registerNodeType("fx/generic", LGraphFXGeneric );
	window.LGraphFXGeneric = LGraphFXGeneric;


	// Vigneting ************************************

	function LGraphFXVigneting() {
		this.addInput("Tex.", "Texture");
		this.addInput("intensity", "number");

		this.addOutput("Texture", "Texture");
		this.properties = { intensity: 1, invert: false, precision: LGraphTexture.DEFAULT };

		if ( !LGraphFXVigneting._shader )
			LGraphFXVigneting._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphFXVigneting.pixelShader );
	}

	LGraphFXVigneting.title = "Vigneting";
	LGraphFXVigneting.desc = "Vigneting";

	LGraphFXVigneting.widgetsInfo = {
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphFXVigneting.prototype.onExecute = function() {
		var tex = this.getInputData( 0 );

		if ( this.properties.precision === LGraphTexture.PASS_THROUGH ) {
			this.setOutputData( 0, tex );
			return;
		}

		if ( !tex ) return;

		this._tex = LGraphTexture.getTargetTexture( tex, this._tex, this.properties.precision );

		var intensity = this.properties.intensity;
		if ( this.isInputConnected( 1 ) ) {
			intensity = this.getInputData( 1 );
			this.properties.intensity = intensity;
		}

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphFXVigneting._shader;
		var invert = this.properties.invert;

		this._tex.drawTo(function() {
			tex.bind( 0 );
			shader.uniforms({ uTexture:0, uIntensity: intensity, uIsize:[ 1 / tex.width, 1 / tex.height ], uInvert: invert ? 1 : 0 }).draw( mesh );
		});

		this.setOutputData( 0, this._tex );
	};

	LGraphFXVigneting.pixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform float uIntensity;\n\
			uniform int uInvert;\n\
			\n\
			void main() {\n\
				float luminance = 1.0 - length( vCoord - vec2(0.5) ) * 1.414;\n\
				vec4 color = texture2D(uTexture, vCoord);\n\
				if (uInvert == 1)\n\
					luminance = 1.0 - luminance;\n\
				luminance = mix(1.0, luminance, uIntensity);\n\
				 gl_FragColor = vec4( luminance * color.xyz, color.a);\n\
			}\n\
			";

	LiteGraph.registerNodeType("fx/vigneting", LGraphFXVigneting );
	window.LGraphFXVigneting = LGraphFXVigneting;
}
