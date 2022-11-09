//menu

var ui = new dat.gui.GUI();

var trans = {
    
    tx: 0,
    ty: 0,
    tz: 0,
    rx: 0,
    ry: 0,
    rz: 0,
    sx: 1,
    sy: 1,
    sz: 1,

    ['Create vertice']: function() {
        criaVertice(0);
      },
    
}


var movimento_objeto = ui.addFolder("Movimento")
movimento_objeto.add(trans, "tx", -10,10)
movimento_objeto.add(trans, "ty", -10,10)
movimento_objeto.add(trans, "tz", -10,10)

var movimento_objeto = ui.addFolder("Rotação")
movimento_objeto.add(trans, "rx", -10,10)
movimento_objeto.add(trans, "ry", -10,10)
movimento_objeto.add(trans, "rz", -10,10)

var movimento_objeto = ui.addFolder("Escala")
movimento_objeto.add(trans, "sx", -10,10)
movimento_objeto.add(trans, "sy", -10,10)
movimento_objeto.add(trans, "sz", -10,10)

var movimento_objeto = ui.addFolder("Vertices")
ui.add(trans, 'Create vertice');

