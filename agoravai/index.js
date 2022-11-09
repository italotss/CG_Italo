"use strict";

var vs = `#version 300 es

in vec4 a_position;
//in vec4 a_color;
in vec3 a_normal; 

uniform vec3 u_lightWorldPosition;
uniform vec3 u_viewWorldPosition;


uniform mat4 u_world;
uniform mat4 u_worldViewProjection;
uniform mat4 u_worldInverseTranspose;


out vec3 v_normal;
out vec3 v_surfaceToLight;
out vec3 v_surfaceToView;

void main() {
  
  gl_Position = u_worldViewProjection * a_position;

  v_normal = mat3(u_worldInverseTranspose) * a_normal;

  vec3 surfaceWorldPosition = (u_world * a_position).xyz;

  v_surfaceToLight = u_lightWorldPosition - surfaceWorldPosition;
  v_surfaceToView = u_viewWorldPosition - surfaceWorldPosition;
}
`;

var fs = `#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_surfaceToLight;
in vec3 v_surfaceToView;

//uniform vec4 u_colorMult;
//uniform vec4 u_colorOffset;

uniform vec4 u_color;
uniform float u_shininess;


out vec4 outColor;

void main() {

  // because v_normal is a varying it's interpolated
  // so it will not be a unit vector. Normalizing it
  // will make it a unit vector again

  vec3 normal = normalize(v_normal);
  vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
  vec3 surfaceToViewDirection = normalize(v_surfaceToView);
  vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewDirection);

 
  // compute the light by taking the dot product
  // of the normal to the light's reverse direction

  float light = dot(normal, surfaceToLightDirection);
  float specular = 0.0;
  if (light > 0.0) {
    specular = pow(dot(normal, halfVector), u_shininess);
  }
 
  outColor = u_color;
 
  // Lets multiply just the color portion (not the alpha)
  // by the light

  outColor.rgb *= light;
  outColor.rgb += specular;
}
`;

var TRS = function() {
  this.translation = [0, 0, 0];
  this.rotation = [0, 0, 0];
  this.scale = [1, 1, 1];
};

TRS.prototype.getMatrix = function(dst) {
  dst = dst || new Float32Array(16);
  var t = this.translation;
  var r = this.rotation;
  var s = this.scale;

  // compute a matrix from translation, rotation, and scale
  m4.translation(t[0], t[1], t[2], dst);
  m4.xRotate(dst, r[0], dst);
  m4.yRotate(dst, r[1], dst);
  m4.zRotate(dst, r[2], dst);
  m4.scale(dst, s[0], s[1], s[2], dst);
  return dst;
};

var Node = function(source) {
  this.children = [];
  this.localMatrix = m4.identity();
  this.worldMatrix = m4.identity();
  this.source = source;
};

Node.prototype.setParent = function(parent) {
  // remove us from our parent
  if (this.parent) {
    var ndx = this.parent.children.indexOf(this);
    if (ndx >= 0) {
      this.parent.children.splice(ndx, 1);
    }
  }

  // Add us to our new parent
  if (parent) {
    parent.children.push(this);
  }
  this.parent = parent;
};

Node.prototype.updateWorldMatrix = function(matrix) {

  var source = this.source;
  if (source) {
    source.getMatrix(this.localMatrix);
  }

  if (matrix) {
    // a matrix was passed in so do the math
    m4.multiply(matrix, this.localMatrix, this.worldMatrix);
  } else {
    // no matrix was passed in so just copy.
    m4.copy(this.localMatrix, this.worldMatrix);
  }

  // now process all the children
  var worldMatrix = this.worldMatrix;
  this.children.forEach(function(child) {
    child.updateWorldMatrix(worldMatrix);
  });
};



function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  var canvas = document.querySelector("#canvas");
  var gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }

  // Tell the twgl to match position with a_position, n
  // normal with a_normal etc..
  twgl.setAttributePrefix("a_");

  var cubeBufferInfo = twgl.createBufferInfoFromArrays(gl, cubeFormat);

  // setup GLSL program
  var programInfo = twgl.createProgramInfo(gl, [vs, fs]);

  var cubeVAO = twgl.createVAOFromBufferInfo(gl, programInfo, cubeBufferInfo);

  function degToRad(d) {
    return d * Math.PI / 180;
  }

  var fieldOfViewRadians = degToRad(60);

  var objectsToDraw = [];
  var objects = [];
  var nodeInfosByName = {};

  // Let's make all the nodes
  var blockGuyNodeDescriptions =
    {
      name: "point between feet",
      draw: false,
      children: [
         {
          name: "cubo0",
          translation: [0, 0, 0],
          children: [],
        },
        {
          name: "cubo1",
          translation: [-3, 0, 0],
          children: [],
        },
        
      ],
    };

  function makeNode(nodeDescription) {
    var trs  = new TRS();
    var node = new Node(trs);
    nodeInfosByName[nodeDescription.name] = {
      trs: trs,
      node: node,
    };
    trs.translation = nodeDescription.translation || trs.translation;
    if (nodeDescription.draw !== false) {
      node.drawInfo = {
        uniforms: {
          //u_colorOffset: [0, 0.8, 0.6, 0],
          //u_colorMult: [0.4, 0.4, 0.4, 1],
          u_color: [0.2, 1, 0.2, 1],

        },
        programInfo: programInfo,
        bufferInfo: cubeBufferInfo,
        vertexArray: cubeVAO,
      };
      objectsToDraw.push(node.drawInfo);
      objects.push(node);
    }
    makeNodes(nodeDescription.children).forEach(function(child) {
      child.setParent(node);
    });
    return node;
  }

  function makeNodes(nodeDescriptions) {
    return nodeDescriptions ? nodeDescriptions.map(makeNode) : [];
  }


  var scene = makeNode(blockGuyNodeDescriptions);

  requestAnimationFrame(drawScene);

  // Draw the scene.
  function drawScene(time) {
    time *= 0.001;

    twgl.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    // Compute the projection matrix
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var projectionMatrix =
        m4.perspective(fieldOfViewRadians, aspect, 1, 200);

    // Compute the camera's matrix using look at.
    var cameraPosition = [0, 0, 10];
    var target = [0, 0, 0];
    var up = [0, 1, 0];
    var cameraMatrix = m4.lookAt(cameraPosition, target, up);

    // Make a view matrix from the camera matrix.
    var viewMatrix = m4.inverse(cameraMatrix);

    var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

    //variaveis pra animação
    //var speed = 5;
    //var time = time * speed;
    
    //Transforma o cubo
    nodeInfosByName['cubo0'].trs.translation = [trans.tx, trans.ty, trans.tz]
    nodeInfosByName['cubo0'].trs.rotation = [trans.rx, trans.ry, trans.rz]
    nodeInfosByName['cubo0'].trs.scale = [trans.sx, trans.sy, trans.sz]
    //nodeInfosByName['cubo0'].trs.rotation[1] = time;
    nodeInfosByName['cubo1'].trs.rotation[1] = time;

    var fRotationRadians = degToRad(trans.ry);

    // Update all world matrices in the scene graph
    scene.updateWorldMatrix();

    // Compute all the matrices for rendering
    objects.forEach(function(object) {
        object.drawInfo.uniforms.u_worldViewProjection = m4.multiply(viewProjectionMatrix, object.worldMatrix);
        object.drawInfo.uniforms.u_worldInverseTranspose = m4.transpose(m4.inverse(object.worldMatrix));
        object.drawInfo.uniforms.u_lightWorldPosition = [0,0,5];
        object.drawInfo.uniforms.u_world = m4.multiply(object.worldMatrix, m4.yRotation(fRotationRadians));
        object.drawInfo.uniforms.u_viewWorldPosition = cameraPosition;
        object.drawInfo.uniforms.u_shininess = 400
    });

    // ------ Draw the objects --------
    console.log(objectsToDraw)
    twgl.drawObjectList(gl, objectsToDraw);


    requestAnimationFrame(drawScene);
  }
}

main();
