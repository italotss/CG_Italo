var cubeFormat = {
  position: [
    1, 1, -1, //0
    1, 1, 1, //1
    1, -1, 1, //2

    1, 1, -1, //0
    1, -1, 1, //2
    1, -1, -1,//3

    -1, 1, 1,//4
    -1, 1, -1,//5
    -1, -1, -1,//6

    -1, 1, 1,//4
    -1, -1, -1,//6
    -1, -1, 1,//7

    -1, 1, 1,//8
    1, 1, 1,//9
    1, 1, -1,//10

    -1, 1, 1,//8
    1, 1, -1,//10
    -1, 1, -1,//11

    -1, -1, -1,//12
    1, -1, -1,//13
    1, -1, 1,//14

    -1, -1, -1,//12
    1, -1, 1,//14
    -1, -1, 1,//15

    1, 1, 1,//16
    -1, 1, 1,//17
    -1, -1, 1,//18

    1, 1, 1,//16
    -1, -1, 1,//18
    1, -1, 1,//19

    -1, 1, -1,//20
    1, 1, -1,//21
    1, -1, -1,//22
    
    -1, 1, -1,//20
    1, -1, -1,//22
    -1, -1, -1,//23
  ],

  indices: [
    0, 1, 2, 3, 4,5 ,6 ,7 ,8, 9, 10, 11, 12, 13, 14, 15, 16 ,17, 18, 
    19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35,
  ],

  normal: [

  ],
}

const calculateNormal = (position, indices) => {
  let pontos = []
  let faces = []
  let resultado
  
  for (let i = 0; i < position.length; i += 3) {
      pontos.push([position[i], position[i+1],position[i+2]])
  }
  
  for (let i = 0; i < indices.length; i += 3) {
      faces.push([indices[i], indices[i+1],indices[i+2]])
  }

  var normalUsadas = {}

  for (let i = 0, j = 0; i < cubeFormat.position.length; i+=3, j++) {
      normalUsadas[j] = []
  }

  normal = faces.map(item => {
      // AB AC
      vetorA1 = [pontos[item[1]][0] - pontos[item[0]][0], pontos[item[1]][1] - pontos[item[0]][1], pontos[item[1]][2] - pontos[item[0]][2]]
      vetorB1 = [pontos[item[2]][0] - pontos[item[0]][0], pontos[item[2]][1] - pontos[item[0]][1], pontos[item[2]][2] - pontos[item[0]][2]]

      // BA BC
      vetorB2 = [pontos[item[0]][0] - pontos[item[1]][0], pontos[item[0]][1] - pontos[item[1]][1], pontos[item[0]][2] - pontos[item[1]][2]]
      vetorA2 = [pontos[item[2]][0] - pontos[item[1]][0], pontos[item[2]][1] - pontos[item[1]][1], pontos[item[2]][2] - pontos[item[1]][2]]

      // CA CB
      vetorA3 = [pontos[item[0]][0] - pontos[item[2]][0], pontos[item[0]][1] - pontos[item[2]][1], pontos[item[0]][2] - pontos[item[2]][2]]
      vetorB3 = [pontos[item[1]][0] - pontos[item[2]][0], pontos[item[1]][1] - pontos[item[2]][1], pontos[item[1]][2] - pontos[item[2]][2]]

      produto = [
          vetorA1[1] * vetorB1[2] - vetorB1[1] * vetorA1[2],
          vetorB1[0] * vetorA1[2] - vetorA1[0] * vetorB1[2],
          vetorA1[0] * vetorB1[1] - vetorB1[0] * vetorA1[1],

          vetorA2[1] * vetorB2[2] - vetorB2[1] * vetorA2[2],
          vetorB2[0] * vetorA2[2] - vetorA2[0] * vetorB2[2],
          vetorA2[0] * vetorB2[1] - vetorB2[0] * vetorA2[1],

          vetorA3[1] * vetorB3[2] - vetorB3[1] * vetorA3[2],
          vetorB3[0] * vetorA3[2] - vetorA3[0] * vetorB3[2],
          vetorA3[0] * vetorB3[1] - vetorB3[0] * vetorA3[1]
      ]

      let distancia = []

      for (let i = 0, j = 0; i < produto.length; i+=3, j++) {
          distancia.push(Math.abs(Math.sqrt(produto[i] * produto[i] + produto[i+1] * produto[i+1] + produto[i+2] * produto[i+2])))

          produto[i] = produto[i] / distancia[j]
          produto[i+1] = produto[i+1] / distancia[j]
          produto[i+2] = produto[i+2] / distancia[j]
      }

      for (let i = 0, j = 0; i < produto.length; i+=3, j++) {
          if (normalUsadas[item[0]].length == 0) {
              normalUsadas[item[0]] = [produto[i], produto[i+1], produto[i+2]]
          } else {
              if (normalUsadas[item[1]].length == 0) {
                  normalUsadas[item[1]] = [produto[i], produto[i+1], produto[i+2]]
              } else {
                  normalUsadas[item[2]] = [produto[i], produto[i+1], produto[i+2]]
              }
          }
      }
 
      return produto
  })

  return normalUsadas
}

let agoraVai = calculateNormal(cubeFormat.position, cubeFormat.indices)

let Deus = []

for (const item in agoraVai) {
  for (let i = 0; i < agoraVai[item].length; i++) {
      Deus.push(agoraVai[item][i])
  }
}
cubeFormat.normal = [...Deus];
//console.log(Deus);


function criaVertice(triangulo){

    buffer = cubeFormat;

    var auxVertices = [];
    var auxIndices = [];
    var novoTri = [];

    for(let i=0, j=0; i< buffer.indices.length; i+=3, j++) {
        if(j == auxIndices) {
            auxIndices.push(buffer.indices[i]);
            auxIndices.push(buffer.indices[i+1]);
            auxIndices.push(buffer.indices[i+2]);
        }
      }
    for(let i=0, j=0; i < buffer.position.length; i+=3, j++) {

        if(j == auxIndices[0]) {
            auxVertices.push(buffer.position[i]);
            auxVertices.push(buffer.position[i+1]);
            auxVertices.push(buffer.position[i+2]);
        }
  
        if(j == auxIndices[1]) {
            auxVertices.push(buffer.position[i]);
            auxVertices.push(buffer.position[i+1]);
            auxVertices.push(buffer.position[i+2]);
        }
  
        if(j == auxIndices[2]) {
            auxVertices.push(buffer.position[i]);
            auxVertices.push(buffer.position[i+1]);
            auxVertices.push(buffer.position[i+2]);
        }
    }

    pontoMedio = [];

        //x
        pontoMedio.push((auxVertices[0] + auxVertices[3] + auxVertices[6])/3);
        //y
        pontoMedio.push((auxVertices[1] + auxVertices[4] + auxVertices[7])/3);
        //z
        pontoMedio.push((auxVertices[2] + auxVertices[5] + auxVertices[8])/3); 


     //recriar os trianglos

    //deletar o triangulo principal
    //remove dos indices
    for(let i=0, j=0; i< buffer.indices.length; i+=3, j++) {
        if(j == triangulo) {
          buffer.indices.splice(i, 3);
        }
      }
  
      for(let i=0, j=0; i< buffer.indices.length; i+=3, j++) {
        if(j >= triangulo) {
          buffer.indices[i] -= 3;
          buffer.indices[i+1] -= 3;
          buffer.indices[i+2] -= 3;
        }
      }
  
      for(let i=0, j=0; i < buffer.position.length; i+=3, j++) {
        if(j == auxIndices[0]) {
          buffer.position.splice(i, 3);
        }
      }
  
      for(let i=0, j=0; i < buffer.position.length; i+=3, j++) {
  
        if(j == auxIndices[0]) {
          buffer.position.splice(i, 3);
        }
      }
  
      for(let i=0, j=0; i < buffer.position.length; i+=3, j++) {
  
        if(j == auxIndices[0]) {
          buffer.position.splice(i, 3);
        }
      }
  
      //triangulo da esquerda
      //0x
      novoTri.push(auxVertices[0]);
      //0y
      novoTri.push(auxVertices[1]);
      //0z
      novoTri.push(auxVertices[2]);
  
      //4x
      novoTri.push(pontoMedio[0]);
      //4y
      novoTri.push(pontoMedio[1]);
      //4z
      novoTri.push(pontoMedio[2]);
  
      //2x
      novoTri.push(auxVertices[6]);
      //2y
      novoTri.push(auxVertices[7]);
      //2z
      novoTri.push(auxVertices[8]);
  
      //triangulo do meio
      //0x
      novoTri.push(auxVertices[0]);
      //0y
      novoTri.push(auxVertices[1]);
      //0z
      novoTri.push(auxVertices[2]);
  
      //1x
      novoTri.push(auxVertices[3]);
      //1y
      novoTri.push(auxVertices[4]);
      //1z
      novoTri.push(auxVertices[5]);
  
      //4x
      novoTri.push(pontoMedio[0]);
      //4y
      novoTri.push(pontoMedio[1]);
      //4z
      novoTri.push(pontoMedio[2]);
  
      //triangulo direito
      //1x
      novoTri.push(auxVertices[3]);
      //1y
      novoTri.push(auxVertices[4]);
      //1z
      novoTri.push(auxVertices[5]);
  
      //2x
      novoTri.push(auxVertices[6]);
      //2y
      novoTri.push(auxVertices[7]);
      //2z
      novoTri.push(auxVertices[8]);
  
      //4x
      novoTri.push(pontoMedio[0]);
      //4y
      novoTri.push(pontoMedio[1]);
      //4z
      novoTri.push(pontoMedio[2]);
  
      //insere novos vertices
      for(let i=0; i< novoTri.length; i++) {
        buffer.position.push(novoTri[i]);
      }
  
      var temp = buffer.indices.length - 1;
      for(let i=0; i< 3; i++) {
        buffer.indices.push(temp = temp+1);
        buffer.indices.push(temp = temp+1);
        buffer.indices.push(temp = temp+1);
      }
  
      console.log(buffer.indices);
  
      cubeFormat = buffer;
  
      cubeFormat.normal = calculateNormal(cubeFormat.position, cubeFormat.indices);
      cubeBufferInfo = twgl.createBufferInfoFromArrays(gl, cubeFormat);
      cubeVAO = twgl.createVAOFromBufferInfo(gl, programInfo, cubeBufferInfo);
  
      scene.children[uiObj.selectedName].drawInfo.bufferInfo = cubeBufferInfo;
      scene.children[uiObj.selectedName].drawInfo.vertexArray = cubeVAO;
}

