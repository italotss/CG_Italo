"use strict";

var vs = `#version 300 es

in vec4 a_position;
in vec3 a_normal;

uniform mat4 u_matrix;
uniform mat4 u_world;
uniform mat4 u_worldInverseTranspose;
uniform vec3 u_lightWorldPosition;
uniform vec3 u_lightWorldPosition2;
uniform vec3 u_viewWorldPosition;


out vec3 v_normal;

//duplicados surface to light e view
out vec3 v_surfaceToLight;
out vec3 v_surfaceToView;

out vec3 v_surfaceToLight2;
out vec3 v_surfaceToView2;


void main() {
  // Multiply the position by the matrix.
  gl_Position = u_matrix * a_position;

  // Pass the color to the fragment shader.
  v_normal = mat3(u_worldInverseTranspose) * a_normal;

  vec3 surfaceWorldPosition = (u_world * a_position).xyz;

  v_surfaceToLight = u_lightWorldPosition - surfaceWorldPosition;
  v_surfaceToView = u_viewWorldPosition - surfaceWorldPosition;
  v_surfaceToLight2 = u_lightWorldPosition2 - surfaceWorldPosition;
  v_surfaceToView2 = u_viewWorldPosition - surfaceWorldPosition;
}
`;

var fs = `#version 300 es
precision highp float;

// Passed in from the vertex shader.
in vec3 v_normal;
in vec3 v_surfaceToLight;
in vec3 v_surfaceToView;
in vec3 v_surfaceToLight2;
in vec3 v_surfaceToView2;

uniform vec4 u_color;
uniform float u_shininess;

uniform vec3 u_lightColor;
uniform vec3 u_specularColor;
uniform vec3 u_lightColor2;
uniform vec3 u_specularColor2;

out vec4 outColor;

void main() {
  vec3 normal = normalize(v_normal);

  vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
  vec3 surfaceToViewDirection = normalize(v_surfaceToView);

  vec3 surfaceToLightDirection2 = normalize(v_surfaceToLight2);
  vec3 surfaceToViewDirection2 = normalize(v_surfaceToView2);

  vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewDirection);
  vec3 halfVector2 = normalize(surfaceToLightDirection2 + surfaceToViewDirection2);

  float light = dot(normal, surfaceToLightDirection);
  float light2 = dot(normal, surfaceToLightDirection2);

  float specular = 0.0;
  float specular2 = 0.0;

  vec3 color;
  vec3 color2;

  vec3 spec;
  vec3 spec2;

  specular = pow(dot(normal, halfVector), u_shininess);
  specular2 = pow(dot(normal, halfVector2), u_shininess);

  if (light > 0.0) {
    color = light * u_lightColor;
    spec = specular * u_specularColor;
  }
  if (light2 > 0.0) {
    color2 = light2 * u_lightColor2;
    spec2 = specular2 * u_specularColor2;
  }

  outColor = u_color;

  outColor.rgb *= (color + color2);
  outColor.rgb += (spec + spec2);
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

//variaveis globais
var dirX = 1;
var dirY = 1;
var speedFactor = 6;
var angulo = 1.6;

var quicou = 0;
var colidiu = 0;
var flag = 0;
var VENCEU = 0;

var posicaoAnterior = [2];
var blockGuyNodeDescriptions = {};
var objectsToDraw = [];
var objects = [];
var nodeInfosByName = {};
var programInfo;
var cubeVAO;
var cubeBufferInfo;
var scene;

var musica = new Audio ("musicas/shooting_stars.mp3");
var omg = new Audio("musicas/ohMyGod.mp3");
var bounce = new Audio("musicas/bounce.mp3");
musica.volume = 0.4;
bounce.volume = 0.3;
omg.volume = 0.8;

const playerMovement = event => {
  if (event.code === 'ArrowRight') {
    musica.play();
    if (nodeInfosByName["p1"].trs.translation[0] < 13)
    nodeInfosByName["p1"].trs.translation[0] += 1
  }
  else if (event.code === 'ArrowLeft') {
    musica.play();
    if (nodeInfosByName["p1"].trs.translation[0] > 6)
      nodeInfosByName["p1"].trs.translation[0] -= 1
  }

}

function main() {


  var then = 0;
  var deltaTime;
  var animationTime = 0;

  const keyboardListener = document.querySelector('body')
  keyboardListener.addEventListener('keydown', playerMovement, false)

  var cubo = twgl.primitives.createCubeVertices(0.5);

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


  cubeBufferInfo = twgl.createBufferInfoFromArrays(gl,cubo)

  // setup GLSL program
  programInfo = twgl.createProgramInfo(gl, [vs, fs]);

  cubeVAO = twgl.createVAOFromBufferInfo(gl, programInfo, cubeBufferInfo);
 

  function degToRad(d) {
    return d * Math.PI / 180;
  }

  var fieldOfViewRadians = degToRad(60);

  // Let's make all the nodes
  blockGuyNodeDescriptions = {

  name: "cena",
  draw: false,
  translation: [0,0,0],
  children: [{

      name: "bola",
      draw: true,
      translation: [10,1.5,0],
      children: [],
  },
  {
      name: "player",
      draw: false,
      translation:[0,0,0],

      children: [{

        name:"p1",
        draw: true,
        translation: [10,1,0],
        children:[],
      }],
  },
  {
    name: "mapa",
    draw: false,
    translation:[0,0,0],

    children: [{
      
      name:"leftWall",
      draw: true,
      translation: [4.5,8.6,0.2],
      scale: [4,40,10],
      children:[],
    },
    {

      name:"rightWall",
      draw: true,
      translation: [15.3,8.6,0.2],
      scale: [4,40.3,10],
      children:[],
    },
    {

      name:"highWall",
      draw: true,
      translation: [9.9,18.8,0.2],
      scale: [25.6,1,10],
      children:[],
    }
  ],
},
  
  {
      name: "blocos",
      draw: false,
      children: [],
  },

]
};
criarBlocos();

scene = makeNode(blockGuyNodeDescriptions);

requestAnimationFrame(drawScene);
console.log(nodeInfosByName);
console.log(blockGuyNodeDescriptions);


// Draw the scene.
function drawScene(now) {
  now *= 0.001;
  deltaTime = now - then;
  animationTime += deltaTime;
  colidiu = 0;

  twgl.resizeCanvasToDisplaySize(gl.canvas);

  // Tell WebGL how to convert from clip space to pixels
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  // Compute the projection matrix
  var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  var projectionMatrix =  m4.perspective(fieldOfViewRadians, aspect, 1, 200);

  // Compute the camera's matrix using look at.
  var cameraPosition = [10, 10, 20];
  var target = [10, 10, 0];
  var up = [0, 1, 0];
  var cameraMatrix = m4.lookAt(cameraPosition, target, up);

  // Make a view matrix from the camera matrix.
  var viewMatrix = m4.inverse(cameraMatrix);

  var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

  var fRotationRadians = degToRad(0);

  //adjust = Math.abs(Math.sin(animationTime * speed));


  //escalona o player
  nodeInfosByName["p1"].trs.scale[0] = 4;
  nodeInfosByName["p1"].trs.scale[1] = 1;


  //simula as paredes do jogo
  if(nodeInfosByName["bola"].trs.translation[0] > 14.1)
    dirX = 0;
  
  else if(nodeInfosByName["bola"].trs.translation[0] < 6)
    dirX = 1;
  
  if(nodeInfosByName["bola"].trs.translation[1] > 18)
    dirY = 0;
  

  // movimenta a bola
  if(dirX)
    nodeInfosByName["bola"].trs.translation[0] +=  deltaTime * speedFactor;
  else
    nodeInfosByName["bola"].trs.translation[0] -=  deltaTime * speedFactor;
  
  if(dirY)
    nodeInfosByName["bola"].trs.translation[1] +=  deltaTime * speedFactor * angulo;
  else
    nodeInfosByName["bola"].trs.translation[1] -=  deltaTime * speedFactor * angulo;


  // verifica colisao apenas blocos
  if(nodeInfosByName["bola"].trs.translation[1] > 11){
    for(const nodos in nodeInfosByName){
      if(nodeInfosByName[nodos].trs.translation[1] < 50){
        if(nodos != "cena"
        && nodos != "blocos"
        && nodos != "player"
        && nodos != "bola"
        && nodos != "leftWall"
        && nodos != "rightWall"
        && nodos != "highWall")
          if(collision(nodeInfosByName["bola"], nodeInfosByName[nodos]) === 1){
            bounce.pause();
            bounce.currentTime = 0;
            bounce.play();
            VENCEU++;
            console.log(VENCEU);
            break;

          };
        }
    }
  }
  else if(nodeInfosByName["bola"].trs.translation[1] < 3){
    playerCollision(nodeInfosByName["bola"], nodeInfosByName["p1"]);
    bounce.pause();
    bounce.currentTime = 0;
    bounce.play();
  }

  posicaoAnterior[0] = nodeInfosByName["bola"].trs.translation[0];
  posicaoAnterior[1] = nodeInfosByName["bola"].trs.translation[1];

  // Update all world matrices in the scene graph
  scene.updateWorldMatrix();

  // Compute all the matrices for rendering
  objects.forEach(function(object) {

    object.drawInfo.uniforms.u_lightColor = [0, 0.8, 1];
    object.drawInfo.uniforms.u_specularColor = [0, 0.8, 1];
    object.drawInfo.uniforms.u_matrix = m4.multiply(viewProjectionMatrix, object.worldMatrix);

    //luz normal
    object.drawInfo.uniforms.u_lightWorldPosition = [8, 30, 10];

    //luz especular
    object.drawInfo.uniforms.u_lightColor2 = [0, 0.7, 0.2];
    object.drawInfo.uniforms.u_specularColor2 = [0, 0.7, 0.2]; 
    object.drawInfo.uniforms.u_lightWorldPosition2 = [
      nodeInfosByName["bola"].trs.translation[0],
      nodeInfosByName["bola"].trs.translation[1],
      nodeInfosByName["bola"].trs.translation[2]+3
    ] 

    object.drawInfo.uniforms.u_world = m4.multiply(object.worldMatrix, m4.yRotation(fRotationRadians));

    object.drawInfo.uniforms.u_worldInverseTranspose = m4.transpose(m4.inverse(object.worldMatrix));
    
    object.drawInfo.uniforms.u_viewWorldPosition = cameraPosition;

    object.drawInfo.uniforms.u_shininess = 200;

    object.drawInfo.uniforms.u_color= [0.8, 0.8, 0.8, 1];

    });

  
    if(nodeInfosByName["bola"].trs.translation[1] < -2 && VENCEU < 40){
  
      omg.play();
      if(!flag){
        alert("Voce perdeu, tudo bem");
        flag = 1;
      }
      window.location.reload();
    }


    //rotação de vitoria

    if(VENCEU >= 40){
      nodeInfosByName["cena"].trs.rotation[0] += deltaTime;
      nodeInfosByName["cena"].trs.rotation[1] += deltaTime;
      nodeInfosByName["cena"].trs.rotation[2] += deltaTime;
    }
  // ------ Draw the objects --------
  then = now;
  twgl.drawObjectList(gl, objectsToDraw);
  requestAnimationFrame(drawScene);
}
}

main();

function makeNode(nodeDescription) {
  var trs  = new TRS();
  var node = new Node(trs);
  nodeInfosByName[nodeDescription.name] = {
    trs: trs,
    node: node,
  };

  trs.translation = nodeDescription.translation || trs.translation;
  trs.scale = nodeDescription.scale || trs.scale;

  if (nodeDescription.draw !== false) {
    node.drawInfo = {
      uniforms: {
        u_colorOffset: [0, 0, 0.6, 0],
        u_colorMult: [0.4, 0.4, 0.4, 1],
      },
      programInfo: programInfo,

      //bufferInfo: sphereBufferInfo,
      //vertexArray: sphereVAO,

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

function playerCollision(bola, alvo){
  if(bola.trs.translation[1] >= alvo.trs.translation[1] - 0.5
    && bola.trs.translation[1] <= alvo.trs.translation[1] + 0.5
    && bola.trs.translation[0] >= alvo.trs.translation[0] - 1.25
    && bola.trs.translation[0] <= alvo.trs.translation[0] + 1.25)
    {
      if (posicaoAnterior[0] <= alvo.trs.translation[0] - 1.25 && quicou === 0){
        dirX = 0;
        quicou = 1;
        colidiu = 1;
        console.log("bati pela esquerda");
        }
      else if(posicaoAnterior[0] >= alvo.trs.translation[0] + 1.25 && quicou === 0){
        dirX = 1;
        quicou = 1;
        colidiu = 1;
        console.log("bati pela direita");
      }
      else if(posicaoAnterior[1] >= alvo.trs.translation[1] + 0.5 && quicou === 0){
        dirY = 1;
        quicou = 1;
        colidiu = 1;
        console.log("bati por cima");
        }
      
      quicou = 0;
  }

}

function collision(bola, alvo){
  if(bola.trs.translation[1] >= alvo.trs.translation[1] - 0.75
  && bola.trs.translation[1] <= alvo.trs.translation[1] + 0.75
  && bola.trs.translation[0] >= alvo.trs.translation[0] - 0.75
  && bola.trs.translation[0] <= alvo.trs.translation[0] + 0.75)
  {

  if(posicaoAnterior[1] <= alvo.trs.translation[1] - 0.75 && quicou === 0){
    dirY = 0;
    quicou = 1;
    colidiu = 1;
    console.log("bati por baixo");
    }
  else if(posicaoAnterior[1] >= alvo.trs.translation[1] + 0.75 && quicou === 0){
    dirY = 1;
    quicou = 1;
    colidiu = 1;
    console.log("bati por cima");
    }
  else if (posicaoAnterior[0] <= alvo.trs.translation[0] - 0.75 && quicou === 0){
    dirX = 0;
    quicou = 1;
    colidiu = 1;
    console.log("bati pela esquerda");
    }
  else if(posicaoAnterior[0] >= alvo.trs.translation[0] + 0.75 && quicou === 0){
    dirX = 1;
    quicou = 1;
    colidiu = 1;
    console.log("bati pela direita");
  }

  if(alvo.trs.translation[1] > 2)
    alvo.trs.translation = [200,200,200];   

  quicou = 0;
  return colidiu;
}
}

function criarBlocos(){
  for(let i = 0; i < 40; i++){
    criaBloco(i);
  }
 console.log(blockGuyNodeDescriptions)
}

function criaBloco(i){

  if(i < 8){
    var block = {
      name:`b${i}`,
          draw: true,
          translation: [i+6,18,0],
          children:[],
          scale: [1.9,1.8,0.2],  
    }
  }
  else if(i>=8 && i <16)
  {
    var block = {
      name:`b${i}`,
          draw: true,
          translation: [i-2,17,0],
          children:[],
          scale: [1.9,1.8,0.2],
    }
  }
  else if(i>=16 && i <24){
    var block = {
      name:`b${i}`,
          draw: true,
          translation: [i-10,16,0],
          children:[],
          scale: [1.9,1.8,0.2],
    }
  }
  else if(i>=24 && i <32){
    var block = {
      name:`b${i}`,
          draw: true,
          translation: [i-18,15,0],
          children:[],
          scale: [1.9,1.8,0.2],
    }
  }
  else if(i>=32 && i <40){
    var block = {
      name:`b${i}`,
          draw: true,
          translation: [i-26,14,0],
          children:[],
          scale: [1.9,1.8,0.2],
    }
  }

  blockGuyNodeDescriptions.children[2].children.push(block)
}