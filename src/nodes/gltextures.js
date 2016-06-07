//Works with Litegl.js to create WebGL nodes
if(typeof(LiteGraph) != "undefined")
{
	function LGraphTexture()
	{
		this.addOutput("Texture","Texture");
		this.properties = { name:"", filter: true };
		this.size = [LGraphTexture.imagePreviewSize, LGraphTexture.imagePreviewSize];
	}

	LGraphTexture.title = "Texture";
	LGraphTexture.desc = "Texture";
	LGraphTexture.widgetsInfo = {"name": { widget:"texture"}, "filter": { widget:"checkbox"} };

	//REPLACE THIS TO INTEGRATE WITH YOUR FRAMEWORK
	LGraphTexture.loadTextureCallback = null; //function in charge of loading textures when not present in the container
	LGraphTexture.imagePreviewSize = 256;

	//flags to choose output texture type
	LGraphTexture.PASS_THROUGH = 1; //do not apply FX
	LGraphTexture.COPY = 2;			//create new texture with the same properties as the origin texture
	LGraphTexture.LOW = 3;			//create new texture with low precision (byte)
	LGraphTexture.HIGH = 4;			//create new texture with high precision (half-float)
	LGraphTexture.REUSE = 5;		//reuse input texture
	LGraphTexture.DEFAULT = 2;

	LGraphTexture.MODE_VALUES = {
		"pass through": LGraphTexture.PASS_THROUGH,
		"copy": LGraphTexture.COPY,
		"low": LGraphTexture.LOW,
		"high": LGraphTexture.HIGH,
		"reuse": LGraphTexture.REUSE,
		"default": LGraphTexture.DEFAULT
	};

	//returns the container where all the loaded textures are stored (overwrite if you have a Resources Manager)
	LGraphTexture.getTexturesContainer = function()
	{
		return gl.textures;
	}

	//process the loading of a texture (overwrite it if you have a Resources Manager)
	LGraphTexture.loadTexture = function(name, options)
	{
		options = options || {};
		var url = name;
		if(url.substr(0,7) == "http://")
		{
			if(LiteGraph.proxy) //proxy external files
				url = LiteGraph.proxy + url.substr(7);
		}

		var container = LGraphTexture.getTexturesContainer();
		var tex = container[ name ] = GL.Texture.fromURL(url, options);
		return tex;
	}

	LGraphTexture.getTexture = function(name)
	{
		var container = this.getTexturesContainer();

		if(!container)
			throw("Cannot load texture, container of textures not found");

		var tex = container[ name ];
		if(!tex && name && name[0] != ":")
		{
			this.loadTexture(name);
			return null;
		}

		return tex;
	}

	//used to compute the appropiate output texture
	LGraphTexture.getTargetTexture = function( origin, target, mode )
	{
		if(!origin)
			throw("LGraphTexture.getTargetTexture expects a reference texture");

		var texType = null;

		switch(mode)
		{
			case LGraphTexture.LOW: texType = gl.UNSIGNED_BYTE; break;
			case LGraphTexture.HIGH: texType = gl.HIGH_PRECISION_FORMAT; break;
			case LGraphTexture.REUSE: return origin; break;
			case LGraphTexture.COPY: 
			default: texType = origin ? origin.type : gl.UNSIGNED_BYTE; break;
		}

		if(!target || target.width != origin.width || target.height != origin.height || target.type != texType )
			target = new GL.Texture( origin.width, origin.height, { type: texType, format: gl.RGBA, filter: gl.LINEAR });

		return target;
	}

	LGraphTexture.getNoiseTexture = function()
	{
		if(this._noiseTexture)
			return this._noiseTexture;

		var noise = new Uint8Array(512*512*4);
		for(var i = 0; i < 512*512*4; ++i)
			noise[i] = Math.random() * 255;

		var texture = GL.Texture.fromMemory(512,512,noise,{ format: gl.RGBA, wrap: gl.REPEAT, filter: gl.NEAREST });
		this._noiseTexture = texture;
		return texture;
	}

	LGraphTexture.prototype.onDropFile = function(data, filename, file)
	{
		if(!data)
		{
			this._dropTexture = null;
			this.properties.name = "";
		}
		else
		{
			var texture = null;
			if( typeof(data) == "string" )
				texture = GL.Texture.fromURL( data );
			else if( filename.toLowerCase().indexOf(".dds") != -1 )
				texture = GL.Texture.fromDDSInMemory(data);
			else
			{
				var blob = new Blob([file]);
				var url = URL.createObjectURL(blob);
				texture = GL.Texture.fromURL( url );
			}

			this._dropTexture = texture;
			this.properties.name = filename;
		}
	}

	LGraphTexture.prototype.getExtraMenuOptions = function(graphcanvas)
	{
		var that = this;
		if(!this._dropTexture)
			return;
		return [ {content:"Clear", callback: 
			function() { 
				that._dropTexture = null;
				that.properties.name = "";
			}
		}];
	}

	LGraphTexture.prototype.onExecute = function()
	{
		var tex = null;
		if(this.isOutputConnected(1))
			tex = this.getInputData(0);		

		if(!tex && this._dropTexture)
			tex = this._dropTexture;

		if(!tex && this.properties.name)
			tex = LGraphTexture.getTexture( this.properties.name );

		if(!tex) 
			return;

		this._lastTex = tex;

		if(this.properties.filter === false)
			tex.setParameter( gl.TEXTURE_MAG_FILTER, gl.NEAREST );
		else 
			tex.setParameter( gl.TEXTURE_MAG_FILTER, gl.LINEAR );

		this.setOutputData(0, tex);

		for(var i = 1; i < this.outputs.length; i++)
		{
			var output = this.outputs[i];
			if(!output)
				continue;
			var v = null;
			if(output.name == "width")
				v = tex.width;
			else if(output.name == "height")
				v = tex.height;
			else if(output.name == "aspect")
				v = tex.width / tex.height;
			this.setOutputData(i, v);
		}
	}

	LGraphTexture.prototype.onResourceRenamed = function(oldName,newName)
	{
		if(this.properties.name == oldName)
			this.properties.name = newName;
	}

	LGraphTexture.prototype.onDrawBackground = function(ctx)
	{
		if( this.flags.collapsed || this.size[1] <= 20 )
			return;

		if( this._dropTexture && ctx.webgl )
		{
			ctx.drawImage( this._dropTexture, 0,0,this.size[0],this.size[1]);
			//this._dropTexture.renderQuad(this.pos[0],this.pos[1],this.size[0],this.size[1]);
			return;
		}


		//Different texture? then get it from the GPU
		if(this._lastPreviewTex != this._lastTex)
		{
			if(ctx.webgl)
			{
				this._canvas = this._lastTex;
			}
			else
			{
				var texCanvas = LGraphTexture.generateLowResTexturePreview(this._lastTex);
				if(!texCanvas) 
					return;

				this._lastPreviewTex = this._lastTex;
				this._canvas = cloneCanvas(texCanvas);
			}
		}

		if(!this._canvas)
			return;

		//render to graph canvas
		ctx.save();
		if(!ctx.webgl) //reverse image
		{
			ctx.translate(0,this.size[1]);
			ctx.scale(1,-1);
		}
		ctx.drawImage(this._canvas,0,0,this.size[0],this.size[1]);
		ctx.restore();
	}


	//very slow, used at your own risk
	LGraphTexture.generateLowResTexturePreview = function(tex)
	{
		if(!tex)
			return null;

		var size = LGraphTexture.imagePreviewSize;
		var tempTex = tex;

		if(tex.format == gl.DEPTH_COMPONENT)
			return null; //cannot generate from depth

		//Generate low-level version in the GPU to speed up
		if(tex.width > size || tex.height > size)
		{
			tempTex = this._previewTempTex;
			if(!this._previewTempTex)
			{
				tempTex = new GL.Texture(size,size, { minFilter: gl.NEAREST });
				this._previewTempTex = tempTex;
			}

			//copy
			tex.copyTo(tempTex);
			tex = tempTex;
		}

		//create intermediate canvas with lowquality version
		var texCanvas = this._previewCanvas;
		if(!texCanvas)
		{
			texCanvas = createCanvas(size,size);
			this._previewCanvas = texCanvas;
		}

		if(tempTex)
			tempTex.toCanvas(texCanvas);
		return texCanvas;
	}

	LGraphTexture.prototype.onGetInputs = function()
	{
		return [["in","Texture"]];
	}


	LGraphTexture.prototype.onGetOutputs = function()
	{
		return [["width","number"],["height","number"],["aspect","number"]];
	}

	LiteGraph.registerNodeType("texture/texture", LGraphTexture );

	//**************************
	function LGraphTexturePreview()
	{
		this.addInput("Texture","Texture");
		this.properties = { flipY: false };
		this.size = [LGraphTexture.imagePreviewSize, LGraphTexture.imagePreviewSize];
	}

	LGraphTexturePreview.title = "Preview";
	LGraphTexturePreview.desc = "Show a texture in the graph canvas";

	LGraphTexturePreview.prototype.onDrawBackground = function(ctx)
	{
		if(this.flags.collapsed)
			return;

		var tex = this.getInputData(0);
		if(!tex) return;

		var texCanvas = null;
		
		if(!tex.handle && ctx.webgl)
			texCanvas = tex;
		else
			texCanvas = LGraphTexture.generateLowResTexturePreview(tex);

		//render to graph canvas
		ctx.save();
		if(this.properties.flipY)
		{
			ctx.translate(0,this.size[1]);
			ctx.scale(1,-1);
		}
		ctx.drawImage(texCanvas,0,0,this.size[0],this.size[1]);
		ctx.restore();
	}

	LiteGraph.registerNodeType("texture/preview", LGraphTexturePreview );

	//**************************************

	function LGraphTextureSave()
	{
		this.addInput("Texture","Texture");
		this.addOutput("","Texture");
		this.properties = {name:""};
	}

	LGraphTextureSave.title = "Save";
	LGraphTextureSave.desc = "Save a texture in the repository";

	LGraphTextureSave.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex) return;

		if(this.properties.name)
		{
			var container = LGraphTexture.getTexturesContainer();
			container[ this.properties.name ] = tex;
		}

		this.setOutputData(0, tex);
	}

	LiteGraph.registerNodeType("texture/save", LGraphTextureSave );

	//****************************************************

	function LGraphTextureOperation()
	{
		this.addInput("Texture","Texture");
		this.addInput("TextureB","Texture");
		this.addInput("value","number");
		this.addOutput("Texture","Texture");
		this.help = "<p>pixelcode must be vec3</p>\
			<p>uvcode must be vec2, is optional</p>\
			<p><strong>uv:</strong> tex. coords</p><p><strong>color:</strong> texture</p><p><strong>colorB:</strong> textureB</p><p><strong>time:</strong> scene time</p><p><strong>value:</strong> input value</p>";

		this.properties = {value:1, uvcode:"", pixelcode:"color + colorB * value", precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureOperation.widgetsInfo = {
		"uvcode": { widget:"textarea", height: 100 }, 
		"pixelcode": { widget:"textarea", height: 100 },
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureOperation.title = "Operation";
	LGraphTextureOperation.desc = "Texture shader operation";

	LGraphTextureOperation.prototype.getExtraMenuOptions = function(graphcanvas)
	{
		var that = this;
		var txt = !that.properties.show ? "Show Texture" : "Hide Texture";
		return [ {content: txt, callback: 
			function() { 
				that.properties.show = !that.properties.show;
			}
		}];
	}

	LGraphTextureOperation.prototype.onDrawBackground = function(ctx)
	{
		if(this.flags.collapsed || this.size[1] <= 20 || !this.properties.show)
			return;

		if(!this._tex)
			return;

		//only works if using a webgl renderer
		if(this._tex.gl != ctx)
			return;

		//render to graph canvas
		ctx.save();
		ctx.drawImage(this._tex, 0, 0, this.size[0], this.size[1]);
		ctx.restore();
	}

	LGraphTextureOperation.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);

		if(!this.isOutputConnected(0))
			return; //saves work

		if(this.properties.precision === LGraphTexture.PASS_THROUGH)
		{
			this.setOutputData(0, tex);
			return;
		}

		var texB = this.getInputData(1);

		if(!this.properties.uvcode && !this.properties.pixelcode)
			return;

		var width = 512;
		var height = 512;
		var type = gl.UNSIGNED_BYTE;
		if(tex)
		{
			width = tex.width;
			height = tex.height;
			type = tex.type;
		}
		else if (texB)
		{
			width = texB.width;
			height = texB.height;
			type = texB.type;
		}

		if(!tex && !this._tex )
			this._tex = new GL.Texture( width, height, { type: this.precision === LGraphTexture.LOW ? gl.UNSIGNED_BYTE : gl.HIGH_PRECISION_FORMAT, format: gl.RGBA, filter: gl.LINEAR });
		else
			this._tex = LGraphTexture.getTargetTexture( tex || this._tex, this._tex, this.properties.precision );

		/*
		if(this.properties.lowPrecision)
			type = gl.UNSIGNED_BYTE;

		if(!this._tex || this._tex.width != width || this._tex.height != height || this._tex.type != type )
			this._tex = new GL.Texture( width, height, { type: type, format: gl.RGBA, filter: gl.LINEAR });
		*/

		var uvcode = "";
		if(this.properties.uvcode)
		{
			uvcode = "uv = " + this.properties.uvcode;
			if(this.properties.uvcode.indexOf(";") != -1) //there are line breaks, means multiline code
				uvcode = this.properties.uvcode;
		}
		
		var pixelcode = "";
		if(this.properties.pixelcode)
		{
			pixelcode = "result = " + this.properties.pixelcode;
			if(this.properties.pixelcode.indexOf(";") != -1) //there are line breaks, means multiline code
				pixelcode = this.properties.pixelcode;
		}

		var shader = this._shader;

		if(!shader || this._shaderCode != (uvcode + "|" + pixelcode) )
		{
			try
			{
				this._shader = new GL.Shader(Shader.SCREEN_VERTEX_SHADER, LGraphTextureOperation.pixelShader, { UV_CODE: uvcode, PIXEL_CODE: pixelcode });
				this.boxcolor = "#00FF00";
			}
			catch (err)
			{
				console.log("Error compiling shader: ", err);
				this.boxcolor = "#FF0000";
				return;
			}
			this._shaderCode = (uvcode + "|" + pixelcode);
			shader = this._shader;
		}

		if(!shader)
		{
			this.boxcolor = "red";
			return;
		}
		else
			this.boxcolor = "green";

		var value = this.getInputData(2);
		if(value != null)
			this.properties.value = value;
		else
			value = parseFloat( this.properties.value );

		var time = this.graph.getTime();

		this._tex.drawTo(function() {
			gl.disable( gl.DEPTH_TEST );
			gl.disable( gl.CULL_FACE );
			gl.disable( gl.BLEND );
			if(tex)	tex.bind(0);
			if(texB) texB.bind(1);
			var mesh = Mesh.getScreenQuad();
			shader.uniforms({uTexture:0, uTextureB:1, value: value, texSize:[width,height], time: time}).draw(mesh);
		});

		this.setOutputData(0, this._tex);
	}

	LGraphTextureOperation.pixelShader = "precision highp float;\n\
			\n\
			uniform sampler2D uTexture;\n\
			uniform sampler2D uTextureB;\n\
			varying vec2 vCoord;\n\
			uniform vec2 texSize;\n\
			uniform float time;\n\
			uniform float value;\n\
			\n\
			void main() {\n\
				vec2 uv = vCoord;\n\
				UV_CODE;\n\
				vec3 color = texture2D(uTexture, uv).rgb;\n\
				vec3 colorB = texture2D(uTextureB, uv).rgb;\n\
				vec3 result = color;\n\
				float alpha = 1.0;\n\
				PIXEL_CODE;\n\
				gl_FragColor = vec4(result, alpha);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/operation", LGraphTextureOperation );

	//****************************************************

	function LGraphTextureShader()
	{
		this.addOutput("Texture","Texture");
		this.properties = {code:"", width: 512, height: 512};

		this.properties.code = "\nvoid main() {\n  vec2 uv = coord;\n  vec3 color = vec3(0.0);\n//your code here\n\ngl_FragColor = vec4(color, 1.0);\n}\n";
	}

	LGraphTextureShader.title = "Shader";
	LGraphTextureShader.desc = "Texture shader";
	LGraphTextureShader.widgetsInfo = {
		"code": { type:"code" },
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureShader.prototype.onExecute = function()
	{
		if(!this.isOutputConnected(0))
			return; //saves work

		//replug 
		if(this._shaderCode != this.properties.code)
		{
			this._shaderCode = this.properties.code;
			this._shader = new GL.Shader(Shader.SCREEN_VERTEX_SHADER, LGraphTextureShader.pixelShader + this.properties.code );
			if(!this._shader) {
				this.boxcolor = "red";
				return;
			}
			else
				this.boxcolor = "green";
			/*
			var uniforms = this._shader.uniformLocations;
			//disconnect inputs
			if(this.inputs)
				for(var i = 0; i < this.inputs.length; i++)
				{
					var slot = this.inputs[i];
					if(slot.links)
						this.disconnectInput(i);
				}

			for(var i = 0; i < uniforms.length; i++)
			{
				var type = "number";
				if( this._shader.isSampler[i] )
					type = "texture";
				else
				{
					var v = gl.getUniform(this._shader.program, i);
					type = typeof(v);
					if(type == "object" && v.length)
					{
						switch(v.length)
						{
							case 1: type = "number"; break;
							case 2: type = "vec2"; break;
							case 3: type = "vec3"; break;
							case 4: type = "vec4"; break;
							case 9: type = "mat3"; break;
							case 16: type = "mat4"; break;
							default: continue;
						}
					}
				}
				this.addInput(i,type);
			}
			*/
		}

		if(!this._tex || this._tex.width != this.properties.width || this._tex.height != this.properties.height )
			this._tex = new GL.Texture( this.properties.width, this.properties.height, { format: gl.RGBA, filter: gl.LINEAR });
		var tex = this._tex;
		var shader = this._shader;
		var time = this.graph.getTime();
		tex.drawTo(function()	{
			shader.uniforms({texSize: [tex.width, tex.height], time: time}).draw( Mesh.getScreenQuad() );
		});

		this.setOutputData(0, this._tex);
	}

	LGraphTextureShader.pixelShader = "precision highp float;\n\
			\n\
			varying vec2 vCoord;\n\
			uniform float time;\n\
			";

	LiteGraph.registerNodeType("texture/shader", LGraphTextureShader );

	// Texture Scale Offset

	function LGraphTextureScaleOffset()
	{
		this.addInput("in","Texture");
		this.addInput("scale","vec2");
		this.addInput("offset","vec2");
		this.addOutput("out","Texture");
		this.properties = { offset: vec2.fromValues(0,0), scale: vec2.fromValues(1,1), precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureScaleOffset.widgetsInfo = {
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureScaleOffset.title = "Scale/Offset";
	LGraphTextureScaleOffset.desc = "Applies an scaling and offseting";

	LGraphTextureScaleOffset.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);

		if(!this.isOutputConnected(0) || !tex)
			return; //saves work

		if(this.properties.precision === LGraphTexture.PASS_THROUGH)
		{
			this.setOutputData(0, tex);
			return;
		}

		var width = tex.width;
		var height = tex.height;
		var type = this.precision === LGraphTexture.LOW ? gl.UNSIGNED_BYTE : gl.HIGH_PRECISION_FORMAT;
		if (this.precision === LGraphTexture.DEFAULT)
			type = tex.type;

		if(!this._tex || this._tex.width != width || this._tex.height != height || this._tex.type != type )
			this._tex = new GL.Texture( width, height, { type: type, format: gl.RGBA, filter: gl.LINEAR });

		var shader = this._shader;

		if(!shader)
			shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureScaleOffset.pixelShader );

		var scale = this.getInputData(1);
		if(scale)
		{
			this.properties.scale[0] = scale[0];
			this.properties.scale[1] = scale[1];
		}
		else
			scale = this.properties.scale;

		var offset = this.getInputData(2);
		if(offset)
		{
			this.properties.offset[0] = offset[0];
			this.properties.offset[1] = offset[1];
		}
		else
			offset = this.properties.offset;

		this._tex.drawTo(function() {
			gl.disable( gl.DEPTH_TEST );
			gl.disable( gl.CULL_FACE );
			gl.disable( gl.BLEND );
			tex.bind(0);
			var mesh = Mesh.getScreenQuad();
			shader.uniforms({uTexture:0, uScale: scale, uOffset: offset}).draw( mesh );
		});

		this.setOutputData( 0, this._tex );
	}

	LGraphTextureScaleOffset.pixelShader = "precision highp float;\n\
			\n\
			uniform sampler2D uTexture;\n\
			uniform sampler2D uTextureB;\n\
			varying vec2 vCoord;\n\
			uniform vec2 uScale;\n\
			uniform vec2 uOffset;\n\
			\n\
			void main() {\n\
				vec2 uv = vCoord;\n\
				uv = uv / uScale - uOffset;\n\
				gl_FragColor = texture2D(uTexture, uv);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/scaleOffset", LGraphTextureScaleOffset );



	// Warp (distort a texture) *************************

	function LGraphTextureWarp()
	{
		this.addInput("in","Texture");
		this.addInput("warp","Texture");
		this.addInput("factor","number");
		this.addOutput("out","Texture");
		this.properties = { factor: 0.01, precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureWarp.widgetsInfo = {
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureWarp.title = "Warp";
	LGraphTextureWarp.desc = "Texture warp operation";

	LGraphTextureWarp.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);

		if(!this.isOutputConnected(0))
			return; //saves work

		if(this.properties.precision === LGraphTexture.PASS_THROUGH)
		{
			this.setOutputData(0, tex);
			return;
		}

		var texB = this.getInputData(1);

		var width = 512;
		var height = 512;
		var type = gl.UNSIGNED_BYTE;
		if(tex)
		{
			width = tex.width;
			height = tex.height;
			type = tex.type;
		}
		else if (texB)
		{
			width = texB.width;
			height = texB.height;
			type = texB.type;
		}

		if(!tex && !this._tex )
			this._tex = new GL.Texture( width, height, { type: this.precision === LGraphTexture.LOW ? gl.UNSIGNED_BYTE : gl.HIGH_PRECISION_FORMAT, format: gl.RGBA, filter: gl.LINEAR });
		else
			this._tex = LGraphTexture.getTargetTexture( tex || this._tex, this._tex, this.properties.precision );

		var shader = this._shader;

		if(!shader)
			shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureWarp.pixelShader );

		var factor = this.getInputData(2);
		if(factor != null)
			this.properties.factor = factor;
		else
			factor = parseFloat( this.properties.factor );

		this._tex.drawTo(function() {
			gl.disable( gl.DEPTH_TEST );
			gl.disable( gl.CULL_FACE );
			gl.disable( gl.BLEND );
			if(tex)	tex.bind(0);
			if(texB) texB.bind(1);
			var mesh = Mesh.getScreenQuad();
			shader.uniforms({uTexture:0, uTextureB:1, uFactor: factor }).draw( mesh );
		});

		this.setOutputData(0, this._tex);
	}

	LGraphTextureWarp.pixelShader = "precision highp float;\n\
			\n\
			uniform sampler2D uTexture;\n\
			uniform sampler2D uTextureB;\n\
			varying vec2 vCoord;\n\
			uniform float uFactor;\n\
			\n\
			void main() {\n\
				vec2 uv = vCoord;\n\
				uv += texture2D(uTextureB, uv).rg * uFactor;\n\
				gl_FragColor = texture2D(uTexture, uv);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/warp", LGraphTextureWarp );

	//****************************************************

	// Texture to Viewport *****************************************
	function LGraphTextureToViewport()
	{
		this.addInput("Texture","Texture");
		this.properties = { additive: false, antialiasing: false, disableAlpha: false, gamma: 1.0 };
		this.size[0] = 130;
	}

	LGraphTextureToViewport.title = "to Viewport";
	LGraphTextureToViewport.desc = "Texture to viewport";

	LGraphTextureToViewport.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex) 
			return;

		if(this.properties.disableAlpha)
			gl.disable( gl.BLEND );
		else
		{
			gl.enable( gl.BLEND );
			if(this.properties.additive)
				gl.blendFunc( gl.SRC_ALPHA, gl.ONE );
			else
				gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
		}

		gl.disable( gl.DEPTH_TEST );
		var gamma = this.properties.gamma || 1.0;
		if( this.isInputConnected(1) )
			gamma = this.getInputData(1);


		if(this.properties.antialiasing)
		{
			if(!LGraphTextureToViewport._shader)
				LGraphTextureToViewport._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureToViewport.aaPixelShader );

			var viewport = gl.getViewport(); //gl.getParameter(gl.VIEWPORT);
			var mesh = Mesh.getScreenQuad();
			tex.bind(0);
			LGraphTextureToViewport._shader.uniforms({uTexture:0, uViewportSize:[tex.width,tex.height], uIgamma: 1 / gamma,  inverseVP: [1/tex.width,1/tex.height] }).draw(mesh);
		}
		else
		{
			if(gamma != 1.0)
			{
				if(!LGraphTextureToViewport._gammaShader)
					LGraphTextureToViewport._gammaShader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureToViewport.gammaPixelShader );
				tex.toViewport(LGraphTextureToViewport._gammaShader, { uTexture:0, uIgamma: 1 / gamma });
			}
			else
				tex.toViewport();
		}
	}

	LGraphTextureToViewport.prototype.onGetInputs = function()
	{
		return [["gamma","number"]];
	}

	LGraphTextureToViewport.aaPixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform vec2 uViewportSize;\n\
			uniform vec2 inverseVP;\n\
			uniform float uIgamma;\n\
			#define FXAA_REDUCE_MIN   (1.0/ 128.0)\n\
			#define FXAA_REDUCE_MUL   (1.0 / 8.0)\n\
			#define FXAA_SPAN_MAX     8.0\n\
			\n\
			/* from mitsuhiko/webgl-meincraft based on the code on geeks3d.com */\n\
			vec4 applyFXAA(sampler2D tex, vec2 fragCoord)\n\
			{\n\
				vec4 color = vec4(0.0);\n\
				/*vec2 inverseVP = vec2(1.0 / uViewportSize.x, 1.0 / uViewportSize.y);*/\n\
				vec3 rgbNW = texture2D(tex, (fragCoord + vec2(-1.0, -1.0)) * inverseVP).xyz;\n\
				vec3 rgbNE = texture2D(tex, (fragCoord + vec2(1.0, -1.0)) * inverseVP).xyz;\n\
				vec3 rgbSW = texture2D(tex, (fragCoord + vec2(-1.0, 1.0)) * inverseVP).xyz;\n\
				vec3 rgbSE = texture2D(tex, (fragCoord + vec2(1.0, 1.0)) * inverseVP).xyz;\n\
				vec3 rgbM  = texture2D(tex, fragCoord  * inverseVP).xyz;\n\
				vec3 luma = vec3(0.299, 0.587, 0.114);\n\
				float lumaNW = dot(rgbNW, luma);\n\
				float lumaNE = dot(rgbNE, luma);\n\
				float lumaSW = dot(rgbSW, luma);\n\
				float lumaSE = dot(rgbSE, luma);\n\
				float lumaM  = dot(rgbM,  luma);\n\
				float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));\n\
				float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));\n\
				\n\
				vec2 dir;\n\
				dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));\n\
				dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));\n\
				\n\
				float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);\n\
				\n\
				float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);\n\
				dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX), max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX), dir * rcpDirMin)) * inverseVP;\n\
				\n\
				vec3 rgbA = 0.5 * (texture2D(tex, fragCoord * inverseVP + dir * (1.0 / 3.0 - 0.5)).xyz + \n\
					texture2D(tex, fragCoord * inverseVP + dir * (2.0 / 3.0 - 0.5)).xyz);\n\
				vec3 rgbB = rgbA * 0.5 + 0.25 * (texture2D(tex, fragCoord * inverseVP + dir * -0.5).xyz + \n\
					texture2D(tex, fragCoord * inverseVP + dir * 0.5).xyz);\n\
				\n\
				//return vec4(rgbA,1.0);\n\
				float lumaB = dot(rgbB, luma);\n\
				if ((lumaB < lumaMin) || (lumaB > lumaMax))\n\
					color = vec4(rgbA, 1.0);\n\
				else\n\
					color = vec4(rgbB, 1.0);\n\
				if(uIgamma != 1.0)\n\
					color.xyz = pow( color.xyz, vec3(uIgamma) );\n\
				return color;\n\
			}\n\
			\n\
			void main() {\n\
			   gl_FragColor = applyFXAA( uTexture, vCoord * uViewportSize) ;\n\
			}\n\
			";

	LGraphTextureToViewport.gammaPixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform float uIgamma;\n\
			void main() {\n\
				vec4 color = texture2D( uTexture, vCoord);\n\
				color.xyz = pow(color.xyz, vec3(uIgamma) );\n\
			   gl_FragColor = color;\n\
			}\n\
			";


	LiteGraph.registerNodeType("texture/toViewport", LGraphTextureToViewport );


	// Texture Copy *****************************************
	function LGraphTextureCopy()
	{
		this.addInput("Texture","Texture");
		this.addOutput("","Texture");
		this.properties = { size: 0, generateMipmaps: false, precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureCopy.title = "Copy";
	LGraphTextureCopy.desc = "Copy Texture";
	LGraphTextureCopy.widgetsInfo = { 
		size: { widget:"combo", values:[0,32,64,128,256,512,1024,2048]},
		precision: { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureCopy.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex && !this._tempTexture)
			return;

		if(!this.isOutputConnected(0))
			return; //saves work

		//copy the texture
		if(tex)
		{
			var width = tex.width;
			var height = tex.height;

			if(this.properties.size != 0)
			{
				width = this.properties.size;
				height = this.properties.size;
			}

			var temp = this._tempTexture;

			var type = tex.type;
			if(this.properties.precision === LGraphTexture.LOW)
				type = gl.UNSIGNED_BYTE;
			else if(this.properties.precision === LGraphTexture.HIGH)
				type = gl.HIGH_PRECISION_FORMAT;

			if(!temp || temp.width != width || temp.height != height || temp.type != type )
			{
				var minFilter = gl.LINEAR;
				if( this.properties.generateMipmaps && isPowerOfTwo(width) && isPowerOfTwo(height) )
					minFilter = gl.LINEAR_MIPMAP_LINEAR;
				this._tempTexture = new GL.Texture( width, height, { type: type, format: gl.RGBA, minFilter: minFilter, magFilter: gl.LINEAR });
			}
			tex.copyTo(this._tempTexture);

			if(this.properties.generateMipmaps)
			{
				this._tempTexture.bind(0);
				gl.generateMipmap(this._tempTexture.textureType);
				this._tempTexture.unbind(0);
			}
		}


		this.setOutputData(0,this._tempTexture);
	}

	LiteGraph.registerNodeType("texture/copy", LGraphTextureCopy );


	// Texture Copy *****************************************
	function LGraphTextureAverage()
	{
		this.addInput("Texture","Texture");
		this.addOutput("","Texture");
		this.properties = { lowPrecision: false };
	}

	LGraphTextureAverage.title = "Average";
	LGraphTextureAverage.desc = "Compute the total average of a texture and stores it as a 1x1 pixel texture";

	LGraphTextureAverage.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex)
			return;

		if(!this.isOutputConnected(0))
			return; //saves work

		if(!LGraphTextureAverage._shader)
		{
			LGraphTextureAverage._shader = new GL.Shader(Shader.SCREEN_VERTEX_SHADER, LGraphTextureAverage.pixelShader);
			var samples = new Float32Array(32);
			for(var i = 0; i < 32; ++i)	
				samples[i] = Math.random();
			LGraphTextureAverage._shader.uniforms({uSamplesA: samples.subarray(0,16), uSamplesB: samples.subarray(16,32) });
		}

		var temp = this._tempTexture;
		var type = this.properties.lowPrecision ? gl.UNSIGNED_BYTE : tex.type;
		if(!temp || temp.type != type )
			this._tempTexture = new GL.Texture( 1, 1, { type: type, format: gl.RGBA, filter: gl.NEAREST });

		var shader = LGraphTextureAverage._shader;
		this._tempTexture.drawTo(function(){
			tex.toViewport(shader,{uTexture:0});
		});

		this.setOutputData(0,this._tempTexture);
	}

	LGraphTextureAverage.pixelShader = "precision highp float;\n\
			precision highp float;\n\
			uniform mat4 uSamplesA;\n\
			uniform mat4 uSamplesB;\n\
			uniform sampler2D uTexture;\n\
			varying vec2 vCoord;\n\
			\n\
			void main() {\n\
				vec4 color = vec4(0.0);\n\
				for(int i = 0; i < 4; ++i)\n\
					for(int j = 0; j < 4; ++j)\n\
					{\n\
						color += texture2D(uTexture, vec2( uSamplesA[i][j], uSamplesB[i][j] ) );\n\
						color += texture2D(uTexture, vec2( 1.0 - uSamplesA[i][j], uSamplesB[i][j] ) );\n\
					}\n\
			   gl_FragColor = color * 0.03125;\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/average", LGraphTextureAverage );

	// Image To Texture *****************************************
	function LGraphImageToTexture()
	{
		this.addInput("Image","image");
		this.addOutput("","Texture");
		this.properties = {};
	}

	LGraphImageToTexture.title = "Image to Texture";
	LGraphImageToTexture.desc = "Uploads an image to the GPU";
	//LGraphImageToTexture.widgetsInfo = { size: { widget:"combo", values:[0,32,64,128,256,512,1024,2048]} };

	LGraphImageToTexture.prototype.onExecute = function()
	{
		var img = this.getInputData(0);
		if(!img)
			return;

		var width = img.videoWidth || img.width;
		var height = img.videoHeight || img.height;

		//this is in case we are using a webgl canvas already, no need to reupload it
		if(img.gltexture)
		{
			this.setOutputData(0,img.gltexture);
			return;
		}


		var temp = this._tempTexture;
		if(!temp || temp.width != width || temp.height != height )
			this._tempTexture = new GL.Texture( width, height, { format: gl.RGBA, filter: gl.LINEAR });

		try
		{
			this._tempTexture.uploadImage(img);
		}
		catch(err)
		{
			console.error("image comes from an unsafe location, cannot be uploaded to webgl");
			return;
		}

		this.setOutputData(0,this._tempTexture);
	}

	LiteGraph.registerNodeType("texture/imageToTexture", LGraphImageToTexture );


	// Texture LUT *****************************************
	function LGraphTextureLUT()
	{
		this.addInput("Texture","Texture");
		this.addInput("LUT","Texture");
		this.addInput("Intensity","number");
		this.addOutput("","Texture");
		this.properties = { intensity: 1, precision: LGraphTexture.DEFAULT, texture: null };

		if(!LGraphTextureLUT._shader)
			LGraphTextureLUT._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureLUT.pixelShader );
	}

	LGraphTextureLUT.widgetsInfo = { 
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureLUT.title = "LUT";
	LGraphTextureLUT.desc = "Apply LUT to Texture";
	LGraphTextureLUT.widgetsInfo = {"texture": { widget:"texture"} };

	LGraphTextureLUT.prototype.onExecute = function()
	{
		if(!this.isOutputConnected(0))
			return; //saves work

		var tex = this.getInputData(0);

		if(this.properties.precision === LGraphTexture.PASS_THROUGH )
		{
			this.setOutputData(0,tex);
			return;
		}

		if(!tex) return;

		var lutTex = this.getInputData(1);

		if(!lutTex)
			lutTex = LGraphTexture.getTexture( this.properties.texture );

		if(!lutTex)
		{
			this.setOutputData(0,tex);
			return;
		}

		lutTex.bind(0);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
		gl.bindTexture(gl.TEXTURE_2D, null);

		var intensity = this.properties.intensity;
		if( this.isInputConnected(2) )
			this.properties.intensity = intensity = this.getInputData(2);

		this._tex = LGraphTexture.getTargetTexture( tex, this._tex, this.properties.precision );

		//var mesh = Mesh.getScreenQuad();

		this._tex.drawTo(function() {
			lutTex.bind(1);
			tex.toViewport( LGraphTextureLUT._shader, {uTexture:0, uTextureB:1, uAmount: intensity} );
		});

		this.setOutputData(0,this._tex);
	}

	LGraphTextureLUT.pixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform sampler2D uTextureB;\n\
			uniform float uAmount;\n\
			\n\
			void main() {\n\
				 lowp vec4 textureColor = clamp( texture2D(uTexture, vCoord), vec4(0.0), vec4(1.0) );\n\
				 mediump float blueColor = textureColor.b * 63.0;\n\
				 mediump vec2 quad1;\n\
				 quad1.y = floor(floor(blueColor) / 8.0);\n\
				 quad1.x = floor(blueColor) - (quad1.y * 8.0);\n\
				 mediump vec2 quad2;\n\
				 quad2.y = floor(ceil(blueColor) / 8.0);\n\
				 quad2.x = ceil(blueColor) - (quad2.y * 8.0);\n\
				 highp vec2 texPos1;\n\
				 texPos1.x = (quad1.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.r);\n\
				 texPos1.y = 1.0 - ((quad1.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.g));\n\
				 highp vec2 texPos2;\n\
				 texPos2.x = (quad2.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.r);\n\
				 texPos2.y = 1.0 - ((quad2.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.g));\n\
				 lowp vec4 newColor1 = texture2D(uTextureB, texPos1);\n\
				 lowp vec4 newColor2 = texture2D(uTextureB, texPos2);\n\
				 lowp vec4 newColor = mix(newColor1, newColor2, fract(blueColor));\n\
				 gl_FragColor = vec4( mix( textureColor.rgb, newColor.rgb, uAmount), textureColor.w);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/LUT", LGraphTextureLUT );

	// Texture Channels *****************************************
	function LGraphTextureChannels()
	{
		this.addInput("Texture","Texture");

		this.addOutput("R","Texture");
		this.addOutput("G","Texture");
		this.addOutput("B","Texture");
		this.addOutput("A","Texture");

		this.properties = {};
		if(!LGraphTextureChannels._shader)
			LGraphTextureChannels._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureChannels.pixelShader );
	}

	LGraphTextureChannels.title = "Texture to Channels";
	LGraphTextureChannels.desc = "Split texture channels";

	LGraphTextureChannels.prototype.onExecute = function()
	{
		var texA = this.getInputData(0);
		if(!texA) return;

		if(!this._channels)
			this._channels = Array(4);

		var connections = 0;
		for(var i = 0; i < 4; i++)
		{
			if(this.isOutputConnected(i))
			{
				if(!this._channels[i] || this._channels[i].width != texA.width || this._channels[i].height != texA.height || this._channels[i].type != texA.type)
					this._channels[i] = new GL.Texture( texA.width, texA.height, { type: texA.type, format: gl.RGBA, filter: gl.LINEAR });
				connections++;
			}
			else
				this._channels[i] = null;
		}

		if(!connections)
			return;

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphTextureChannels._shader;
		var masks = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];

		for(var i = 0; i < 4; i++)
		{
			if(!this._channels[i])
				continue;

			this._channels[i].drawTo( function() {
				texA.bind(0);
				shader.uniforms({uTexture:0, uMask: masks[i]}).draw(mesh);
			});
			this.setOutputData(i, this._channels[i]);
		}
	}

	LGraphTextureChannels.pixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform vec4 uMask;\n\
			\n\
			void main() {\n\
			   gl_FragColor = vec4( vec3( length( texture2D(uTexture, vCoord) * uMask )), 1.0 );\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/textureChannels", LGraphTextureChannels );


	// Texture Channels to Texture *****************************************
	function LGraphChannelsTexture()
	{
		this.addInput("R","Texture");
		this.addInput("G","Texture");
		this.addInput("B","Texture");
		this.addInput("A","Texture");

		this.addOutput("Texture","Texture");

		this.properties = {};
		if(!LGraphChannelsTexture._shader)
			LGraphChannelsTexture._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphChannelsTexture.pixelShader );
	}

	LGraphChannelsTexture.title = "Channels to Texture";
	LGraphChannelsTexture.desc = "Split texture channels";

	LGraphChannelsTexture.prototype.onExecute = function()
	{
		var tex = [ this.getInputData(0),
				this.getInputData(1),
				this.getInputData(2),
				this.getInputData(3) ];

		if(!tex[0] || !tex[1] || !tex[2] || !tex[3]) 
			return;

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphChannelsTexture._shader;

		this._tex = LGraphTexture.getTargetTexture( tex[0], this._tex );

		this._tex.drawTo( function() {
			tex[0].bind(0);
			tex[1].bind(1);
			tex[2].bind(2);
			tex[3].bind(3);
			shader.uniforms({uTextureR:0, uTextureG:1, uTextureB:2, uTextureA:3 }).draw(mesh);
		});
		this.setOutputData(0, this._tex);
	}

	LGraphChannelsTexture.pixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTextureR;\n\
			uniform sampler2D uTextureG;\n\
			uniform sampler2D uTextureB;\n\
			uniform sampler2D uTextureA;\n\
			\n\
			void main() {\n\
			   gl_FragColor = vec4( \
						texture2D(uTextureR, vCoord).r,\
						texture2D(uTextureG, vCoord).r,\
						texture2D(uTextureB, vCoord).r,\
						texture2D(uTextureA, vCoord).r);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/channelsTexture", LGraphChannelsTexture );

	// Texture Channels to Texture *****************************************
	function LGraphTextureGradient()
	{
		this.addInput("A","color");
		this.addInput("B","color");
		this.addOutput("Texture","Texture");

		this.properties = { angle: 0, scale: 1, A:[0,0,0], B:[1,1,1], textureSize:32 };
		if(!LGraphTextureGradient._shader)
			LGraphTextureGradient._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureGradient.pixelShader );

		this._uniforms = { uAngle: 0, uColorA: vec3.create(), uColorB: vec3.create()};
	}

	LGraphTextureGradient.title = "Gradient";
	LGraphTextureGradient.desc = "Generates a gradient";
	LGraphTextureGradient["@A"] = { type:"color" };
	LGraphTextureGradient["@B"] = { type:"color" };
	LGraphTextureGradient["@textureSize"] = { type:"enum", values:[32,64,128,256,512] };

	LGraphTextureGradient.prototype.onExecute = function()
	{
		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = GL.Mesh.getScreenQuad();
		var shader = LGraphTextureGradient._shader;

		var A = this.getInputData(0);
		if(!A)
			A = this.properties.A;
		var B = this.getInputData(1);
		if(!B)
			B = this.properties.B;

		//angle and scale
		for(var i = 2; i < this.inputs.length; i++)
		{
			var input = this.inputs[i];
			var v = this.getInputData(i);
			if(v === undefined)
				continue;
			this.properties[ input.name ] = v;
		}

		var uniforms = this._uniforms;
		this._uniforms.uAngle = this.properties.angle * DEG2RAD;
		this._uniforms.uScale = this.properties.scale;
		vec3.copy( uniforms.uColorA, A );
		vec3.copy( uniforms.uColorB, B );

		var size = parseInt( this.properties.textureSize );
		if(!this._tex || this._tex.width != size )
			this._tex = new GL.Texture( size, size, { format: gl.RGB, filter: gl.LINEAR });

		this._tex.drawTo( function() {
			shader.uniforms(uniforms).draw(mesh);
		});
		this.setOutputData(0, this._tex);
	}

	LGraphTextureGradient.prototype.onGetInputs = function()
	{
		return [["angle","number"],["scale","number"]];
	}

	LGraphTextureGradient.pixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform float uAngle;\n\
			uniform float uScale;\n\
			uniform vec3 uColorA;\n\
			uniform vec3 uColorB;\n\
			\n\
			vec2 rotate(vec2 v, float angle)\n\
			{\n\
				vec2 result;\n\
				float _cos = cos(angle);\n\
				float _sin = sin(angle);\n\
				result.x = v.x * _cos - v.y * _sin;\n\
				result.y = v.x * _sin + v.y * _cos;\n\
				return result;\n\
			}\n\
			void main() {\n\
				float f = (rotate(uScale * (vCoord - vec2(0.5)), uAngle) + vec2(0.5)).x;\n\
				vec3 color = mix(uColorA,uColorB,clamp(f,0.0,1.0));\n\
			   gl_FragColor = vec4(color,1.0);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/gradient", LGraphTextureGradient );

	// Texture Mix *****************************************
	function LGraphTextureMix()
	{
		this.addInput("A","Texture");
		this.addInput("B","Texture");
		this.addInput("Mixer","Texture");

		this.addOutput("Texture","Texture");
		this.properties = { precision: LGraphTexture.DEFAULT };

		if(!LGraphTextureMix._shader)
			LGraphTextureMix._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureMix.pixelShader );
	}

	LGraphTextureMix.title = "Mix";
	LGraphTextureMix.desc = "Generates a texture mixing two textures";

	LGraphTextureMix.widgetsInfo = { 
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureMix.prototype.onExecute = function()
	{
		var texA = this.getInputData(0);

		if(!this.isOutputConnected(0))
			return; //saves work
		
		if(this.properties.precision === LGraphTexture.PASS_THROUGH )
		{
			this.setOutputData(0,texA);
			return;
		}

		var texB = this.getInputData(1);
		var texMix = this.getInputData(2);
		if(!texA || !texB || !texMix) return;

		this._tex = LGraphTexture.getTargetTexture( texA, this._tex, this.properties.precision );

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphTextureMix._shader;

		this._tex.drawTo( function() {
			texA.bind(0);
			texB.bind(1);
			texMix.bind(2);
			shader.uniforms({uTextureA:0,uTextureB:1,uTextureMix:2}).draw(mesh);
		});

		this.setOutputData(0, this._tex);
	}

	LGraphTextureMix.pixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTextureA;\n\
			uniform sampler2D uTextureB;\n\
			uniform sampler2D uTextureMix;\n\
			\n\
			void main() {\n\
			   gl_FragColor = mix( texture2D(uTextureA, vCoord), texture2D(uTextureB, vCoord), texture2D(uTextureMix, vCoord) );\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/mix", LGraphTextureMix );

	// Texture Edges detection *****************************************
	function LGraphTextureEdges()
	{
		this.addInput("Tex.","Texture");

		this.addOutput("Edges","Texture");
		this.properties = { invert: true, factor: 1, precision: LGraphTexture.DEFAULT };

		if(!LGraphTextureEdges._shader)
			LGraphTextureEdges._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureEdges.pixelShader );
	}

	LGraphTextureEdges.title = "Edges";
	LGraphTextureEdges.desc = "Detects edges";

	LGraphTextureEdges.widgetsInfo = { 
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureEdges.prototype.onExecute = function()
	{
		if(!this.isOutputConnected(0))
			return; //saves work

		var tex = this.getInputData(0);

		if(this.properties.precision === LGraphTexture.PASS_THROUGH )
		{
			this.setOutputData(0,tex);
			return;
		}		

		if(!tex) return;

		this._tex = LGraphTexture.getTargetTexture( tex, this._tex, this.properties.precision );

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphTextureEdges._shader;
		var invert = this.properties.invert;
		var factor = this.properties.factor;

		this._tex.drawTo( function() {
			tex.bind(0);
			shader.uniforms({uTexture:0, uIsize:[1/tex.width,1/tex.height], uFactor: factor, uInvert: invert ? 1 : 0}).draw(mesh);
		});

		this.setOutputData(0, this._tex);
	}

	LGraphTextureEdges.pixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform vec2 uIsize;\n\
			uniform int uInvert;\n\
			uniform float uFactor;\n\
			\n\
			void main() {\n\
				vec4 center = texture2D(uTexture, vCoord);\n\
				vec4 up = texture2D(uTexture, vCoord + uIsize * vec2(0.0,1.0) );\n\
				vec4 down = texture2D(uTexture, vCoord + uIsize * vec2(0.0,-1.0) );\n\
				vec4 left = texture2D(uTexture, vCoord + uIsize * vec2(1.0,0.0) );\n\
				vec4 right = texture2D(uTexture, vCoord + uIsize * vec2(-1.0,0.0) );\n\
				vec4 diff = abs(center - up) + abs(center - down) + abs(center - left) + abs(center - right);\n\
				diff *= uFactor;\n\
				if(uInvert == 1)\n\
					diff.xyz = vec3(1.0) - diff.xyz;\n\
			   gl_FragColor = vec4( diff.xyz, center.a );\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/edges", LGraphTextureEdges );

	// Texture Depth *****************************************
	function LGraphTextureDepthRange()
	{
		this.addInput("Texture","Texture");
		this.addInput("Distance","number");
		this.addInput("Range","number");
		this.addOutput("Texture","Texture");
		this.properties = { distance:100, range: 50, highPrecision: false };

		if(!LGraphTextureDepthRange._shader)
			LGraphTextureDepthRange._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureDepthRange.pixelShader );
	}

	LGraphTextureDepthRange.title = "Depth Range";
	LGraphTextureDepthRange.desc = "Generates a texture with a depth range";

	LGraphTextureDepthRange.prototype.onExecute = function()
	{
		if(!this.isOutputConnected(0))
			return; //saves work

		var tex = this.getInputData(0);
		if(!tex) return;

		var precision = gl.UNSIGNED_BYTE;
		if(this.properties.highPrecision)
			precision = gl.halfFloatExt ? gl.HALF_FLOAT_OES : gl.FLOAT;			

		if(!this._tempTexture || this._tempTexture.type != precision ||
			this._tempTexture.width != tex.width || this._tempTexture.height != tex.height)
			this._tempTexture = new GL.Texture( tex.width, tex.height, { type: precision, format: gl.RGBA, filter: gl.LINEAR });

		//iterations
		var distance = this.properties.distance;
		if( this.isInputConnected(1) )
		{
			distance = this.getInputData(1);
			this.properties.distance = distance;
		}

		var range = this.properties.range;
		if( this.isInputConnected(2) )
		{
			range = this.getInputData(2);
			this.properties.range = range;
		}

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );
		var mesh = Mesh.getScreenQuad();
		var shader = LGraphTextureDepthRange._shader;

		//TODO: this asumes we have LiteScene, change it
		var camera = LS.Renderer._currentCamera;
		var planes = [LS.Renderer._currentCamera.near, LS.Renderer._currentCamera.far];

		this._tempTexture.drawTo( function() {
			tex.bind(0);
			shader.uniforms({uTexture:0, uDistance: distance, uRange: range, uCameraPlanes: planes })
				.draw(mesh);
		});

		this.setOutputData(0, this._tempTexture);
	}

	LGraphTextureDepthRange.pixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform vec2 uCameraPlanes;\n\
			uniform float uDistance;\n\
			uniform float uRange;\n\
			\n\
			float LinearDepth()\n\
			{\n\
				float n = uCameraPlanes.x;\n\
				float f = uCameraPlanes.y;\n\
				return (2.0 * n) / (f + n - texture2D(uTexture, vCoord).x * (f - n));\n\
			}\n\
			\n\
			void main() {\n\
				float diff = abs(LinearDepth() * uCameraPlanes.y - uDistance);\n\
				float dof = 1.0;\n\
				if(diff <= uRange)\n\
					dof = diff / uRange;\n\
			   gl_FragColor = vec4(dof);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/depthRange", LGraphTextureDepthRange );

	// Texture Blur *****************************************
	function LGraphTextureBlur()
	{
		this.addInput("Texture","Texture");
		this.addInput("Iterations","number");
		this.addInput("Intensity","number");
		this.addOutput("Blurred","Texture");
		this.properties = { intensity: 1, iterations: 1, preserveAspect: false, scale:[1,1] };

		if(!LGraphTextureBlur._shader)
			LGraphTextureBlur._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureBlur.pixelShader );
	}

	LGraphTextureBlur.title = "Blur";
	LGraphTextureBlur.desc = "Blur a texture";

	LGraphTextureBlur.maxIterations = 20;

	LGraphTextureBlur.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex)
			return;

		if(!this.isOutputConnected(0))
			return; //saves work

		var temp = this._tempTexture;

		if(!temp || temp.width != tex.width || temp.height != tex.height || temp.type != tex.type )
		{
			//we need two textures to do the blurring
			this._tempTexture = new GL.Texture( tex.width, tex.height, { type: tex.type, format: gl.RGBA, filter: gl.LINEAR });
			this._finalTexture = new GL.Texture( tex.width, tex.height, { type: tex.type, format: gl.RGBA, filter: gl.LINEAR });
		}

		//iterations
		var iterations = this.properties.iterations;
		if( this.isInputConnected(1) )
		{
			iterations = this.getInputData(1);
			this.properties.iterations = iterations;
		}
		iterations = Math.min( Math.floor(iterations), LGraphTextureBlur.maxIterations );
		if(iterations == 0) //skip blurring
		{
			this.setOutputData(0, tex);
			return;
		}

		var intensity = this.properties.intensity;
		if( this.isInputConnected(2) )
		{
			intensity = this.getInputData(2);
			this.properties.intensity = intensity;
		}

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );
		var mesh = Mesh.getScreenQuad();
		var shader = LGraphTextureBlur._shader;
		var scale = this.properties.scale || [1,1];

		//blur sometimes needs an aspect correction
		var aspect = LiteGraph.cameraAspect;
		if(!aspect && window.gl !== undefined)
			aspect = gl.canvas.height / gl.canvas.width;
		if(!aspect)
			aspect = 1;

		//iterate
		var startTexture = tex;
		aspect = this.properties.preserveAspect ? aspect : 1;
		for(var i = 0; i < iterations; ++i)
		{
			this._tempTexture.drawTo( function() {
				startTexture.bind(0);
				shader.uniforms({uTexture:0, uIntensity: 1, uOffset: [0, 1/startTexture.height * scale[1] ] })
					.draw(mesh);
			});

			this._tempTexture.bind(0);
			this._finalTexture.drawTo( function() {
				shader.uniforms({uTexture:0, uIntensity: intensity, uOffset: [aspect/startTexture.width * scale[0], 0] })
					.draw(mesh);
			});
			startTexture = this._finalTexture;
		}
		
		this.setOutputData(0, this._finalTexture);
	}

	LGraphTextureBlur.pixelShader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 vCoord;\n\
			uniform sampler2D uTexture;\n\
			uniform vec2 uOffset;\n\
			uniform float uIntensity;\n\
			void main() {\n\
			   vec4 sum = vec4(0.0);\n\
			   vec4 center = texture2D(uTexture, vCoord);\n\
			   sum += texture2D(uTexture, vCoord + uOffset * -4.0) * 0.05/0.98;\n\
			   sum += texture2D(uTexture, vCoord + uOffset * -3.0) * 0.09/0.98;\n\
			   sum += texture2D(uTexture, vCoord + uOffset * -2.0) * 0.12/0.98;\n\
			   sum += texture2D(uTexture, vCoord + uOffset * -1.0) * 0.15/0.98;\n\
			   sum += center * 0.16/0.98;\n\
			   sum += texture2D(uTexture, vCoord + uOffset * 4.0) * 0.05/0.98;\n\
			   sum += texture2D(uTexture, vCoord + uOffset * 3.0) * 0.09/0.98;\n\
			   sum += texture2D(uTexture, vCoord + uOffset * 2.0) * 0.12/0.98;\n\
			   sum += texture2D(uTexture, vCoord + uOffset * 1.0) * 0.15/0.98;\n\
			   gl_FragColor = uIntensity * sum;\n\
			   /*gl_FragColor.a = center.a*/;\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/blur", LGraphTextureBlur );

	// Texture Webcam *****************************************
	function LGraphTextureWebcam()
	{
		this.addOutput("Webcam","Texture");
		this.properties = { textureName: "" };
	}

	LGraphTextureWebcam.title = "Webcam";
	LGraphTextureWebcam.desc = "Webcam texture";


	LGraphTextureWebcam.prototype.openStream = function()
	{
		//Vendor prefixes hell
		navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
		window.URL = window.URL || window.webkitURL;

		if (!navigator.getUserMedia) {
		  //console.log('getUserMedia() is not supported in your browser, use chrome and enable WebRTC from about://flags');
		  return;
		}

		this._waitingConfirmation = true;

		// Not showing vendor prefixes.
		navigator.getUserMedia({video: true}, this.streamReady.bind(this), onFailSoHard);		

		var that = this;
		function onFailSoHard(e) {
			trace('Webcam rejected', e);
			that._webcamStream = false;
			that.boxColor = "red";
		};
	}

	LGraphTextureWebcam.prototype.streamReady = function(localMediaStream)
	{
		this._webcamStream = localMediaStream;
		//this._waitingConfirmation = false;

	    var video = this._video;
		if(!video)
		{
			video = document.createElement("video");
			video.autoplay = true;
		    video.src = window.URL.createObjectURL( localMediaStream );
			this._video = video;
			//document.body.appendChild( video ); //debug
			//when video info is loaded (size and so)
			video.onloadedmetadata = function(e) {
				// Ready to go. Do some stuff.
				console.log(e);
			};
		}
	}

	LGraphTextureWebcam.prototype.onRemoved = function()
	{
		if(this._webcamStream)
		{
			this._webcamStream.stop();
			this._webcamStream = null;
			this._video = null;
		}
	}

	LGraphTextureWebcam.prototype.onDrawBackground = function(ctx)
	{
		if(this.flags.collapsed || this.size[1] <= 20)
			return;

		if(!this._video)
			return;

		//render to graph canvas
		ctx.save();
		if(!ctx.webgl) //reverse image
		{
			ctx.translate(0,this.size[1]);
			ctx.scale(1,-1);
			ctx.drawImage(this._video, 0, 0, this.size[0], this.size[1]);
		}
		else
		{
			if(this._tempTexture)
				ctx.drawImage(this._tempTexture, 0, 0, this.size[0], this.size[1]);
		}
		ctx.restore();
	}

	LGraphTextureWebcam.prototype.onExecute = function()
	{
		if(this._webcamStream == null && !this._waitingConfirmation)
			this.openStream();

		if(!this._video || !this._video.videoWidth)
			return;

		var width = this._video.videoWidth;
		var height = this._video.videoHeight;

		var temp = this._tempTexture;
		if(!temp || temp.width != width || temp.height != height )
			this._tempTexture = new GL.Texture( width, height, { format: gl.RGB, filter: gl.LINEAR });

		this._tempTexture.uploadImage( this._video );
		
		if(this.properties.textureName)
		{
			var container = LGraphTexture.getTexturesContainer();
			container[ this.properties.textureName ] = this._tempTexture;
		}

		this.setOutputData(0,this._tempTexture);
	}

	LiteGraph.registerNodeType("texture/webcam", LGraphTextureWebcam );


	//Cubemap reader
	function LGraphCubemap()
	{
		this.addOutput("Cubemap","Cubemap");
		this.properties = {name:""};
		this.size = [LGraphTexture.imagePreviewSize, LGraphTexture.imagePreviewSize];
	}

	LGraphCubemap.prototype.onDropFile = function(data, filename, file)
	{
		if(!data)
		{
			this._dropTexture = null;
			this.properties.name = "";
		}
		else
		{
			if( typeof(data) == "string" )
				this._dropTexture = GL.Texture.fromURL(data);
			else
				this._dropTexture = GL.Texture.fromDDSInMemory(data);
			this.properties.name = filename;
		}
	}

	LGraphCubemap.prototype.onExecute = function()
	{
		if(this._dropTexture)
		{
			this.setOutputData(0, this._dropTexture);
			return;
		}

		if(!this.properties.name)
			return;

		var tex = LGraphTexture.getTexture( this.properties.name );
		if(!tex) 
			return;

		this._lastTex = tex;
		this.setOutputData(0, tex);
	}

	LGraphCubemap.prototype.onDrawBackground = function(ctx)
	{
		if( this.flags.collapsed || this.size[1] <= 20)
			return;

		if(!ctx.webgl)
			return;

		var cubeMesh = gl.meshes["cube"];
		if(!cubeMesh)
			cubeMesh = gl.meshes["cube"] = GL.Mesh.cube({size:1});

		//var view = mat4.lookAt( mat4.create(), [0,0
	}

	LiteGraph.registerNodeType("texture/cubemap", LGraphCubemap );

} //litegl.js defined