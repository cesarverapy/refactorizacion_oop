// variables globales
const muro = '#000000'; // color negro para representar los muros u obstáculos
const vacio = '#777777'; // color gris para representar las celdas transitables
const inicioColor = '#00ff00'; // color verde para la celda de inicio
const finColor = '#ff0000'; // color rojo para la celda de destino
const fps = 50; // cuadros por segundo, define la tasa de refresco de la animación

// clase casilla
class Casilla {
  constructor(x, y) {
    this.x = x; // coordenada x de la casilla
    this.y = y; // coordenada y de la casilla
    this.tipo = 0; // tipo de casilla (0: vacía, 1: muro, 2: inicio, 3: fin)
    this.f = 0; // costo total (g + h)
    this.g = 0; // costo desde el inicio hasta esta casilla
    this.h = 0; // heurística (estimación del costo hasta el final)
    this.vecinos = []; // vecinos de la casilla
    this.padre = null; // nodo padre para reconstruir el camino
  }

  // método para agregar los vecinos de la casilla
  addVecinos(escenario, filas, columnas) {
    if (this.x > 0)
      this.vecinos.push(escenario[this.y][this.x - 1]); // agregar vecino izquierdo si no está en el borde izquierdo
    if (this.x < columnas - 1)
      this.vecinos.push(escenario[this.y][this.x + 1]); // agregar vecino derecho si no está en el borde derecho
    if (this.y > 0)
      this.vecinos.push(escenario[this.y - 1][this.x]); // agregar vecino superior si no está en el borde superior
    if (this.y < filas - 1)
      this.vecinos.push(escenario[this.y + 1][this.x]); // agregar vecino inferior si no está en el borde inferior
  }

  // método para dibujar la casilla
  dibuja(ctx, anchoT, altoT) {
    let color;
    switch (this.tipo) {
      case 0: color = vacio; break; // color gris para celdas vacías
      case 1: color = muro; break; // color negro para muros
      case 2: color = inicioColor; break; // color verde para el punto de inicio
      case 3: color = finColor; break; // color rojo para el punto de destino
    }
    ctx.fillStyle = color; // establecer el color de relleno
    ctx.fillRect(this.x * anchoT, this.y * altoT, anchoT, altoT); // dibujar la casilla
  }

  // métodos para dibujar estados especiales
  dibujaOpenSet(ctx, anchoT, altoT) {
    ctx.fillStyle = '#008000'; // color verde para nodos en el openset
    ctx.fillRect(this.x * anchoT, this.y * altoT, anchoT, altoT); // dibujar el rectángulo
  }

  dibujaClosedSet(ctx, anchoT, altoT) {
    ctx.fillStyle = '#800000'; // color rojo oscuro para nodos en el closedset
    ctx.fillRect(this.x * anchoT, this.y * altoT, anchoT, altoT); // dibujar el rectángulo
  }

  dibujaCamino(ctx, anchoT, altoT) {
    ctx.fillStyle = '#00ffff'; // color cian para el camino encontrado
    ctx.fillRect(this.x * anchoT, this.y * altoT, anchoT, altoT); // dibujar el rectángulo
  }
}

// clase mapa
class Mapa {
  constructor(filas, columnas, canvas, ctx) {
    this.filas = filas; // número de filas en el mapa
    this.columnas = columnas; // número de columnas en el mapa
    this.canvas = canvas; // referencia al elemento canvas
    this.ctx = ctx; // contexto 2d del canvas
    this.anchoT = parseInt(canvas.width / columnas); // ancho de cada celda
    this.altoT = parseInt(canvas.height / filas); // alto de cada celda
    this.escenario = this.creaArray2D(filas, columnas); // matriz del escenario
    this.principio = null; // casilla de inicio
    this.fin = null; // casilla de destino
    this.openSet = []; // conjunto de nodos abiertos
    this.closedSet = []; // conjunto de nodos cerrados
    this.camino = []; // camino encontrado
    this.terminado = false; // estado de finalización del algoritmo
    this.modo = 'inicio'; // modo actual (inicio, fin, obstáculo)

    this.inicializaEscenario(); // inicializar el escenario
  }

  // método para crear una matriz 2d
  creaArray2D(filas, columnas) {
    const array = new Array(filas); // crear un array de tamaño filas
    for (let i = 0; i < filas; i++) {
      array[i] = new Array(columnas); // crear un array de tamaño columnas en cada fila
    }
    return array;
  }

  // método para inicializar el escenario
  inicializaEscenario() {
    for (let i = 0; i < this.filas; i++) {
      for (let j = 0; j < this.columnas; j++) {
        this.escenario[i][j] = new Casilla(j, i); // crear una nueva casilla en cada posición
      }
    }
    for (let i = 0; i < this.filas; i++) {
      for (let j = 0; j < this.columnas; j++) {
        this.escenario[i][j].addVecinos(this.escenario, this.filas, this.columnas); // agregar vecinos a cada casilla
      }
    }
  }

  // método para agregar o quitar obstáculos
  agregarObstaculo(x, y) {
    if (this.escenario[y][x].tipo === 0) {
      this.escenario[y][x].tipo = 1; // cambiar a muro
    } else if (this.escenario[y][x].tipo === 1) {
      this.escenario[y][x].tipo = 0; // cambiar a vacío
    }
  }

  // método para dibujar el escenario
  dibujaEscenario() {
    for (let i = 0; i < this.filas; i++) {
      for (let j = 0; j < this.columnas; j++) {
        this.escenario[i][j].dibuja(this.ctx, this.anchoT, this.altoT); // dibujar cada casilla
      }
    }

    // dibujar nodos en openset
    this.openSet.forEach(casilla => casilla.dibujaOpenSet(this.ctx, this.anchoT, this.altoT));
    // dibujar nodos en closedset
    this.closedSet.forEach(casilla => casilla.dibujaClosedSet(this.ctx, this.anchoT, this.altoT));
    // dibujar camino encontrado
    this.camino.forEach(casilla => casilla.dibujaCamino(this.ctx, this.anchoT, this.altoT));
  }

  // método para establecer el punto de inicio, fin o agregar obstáculos
  establecerPunto(x, y) {
    const casilla = this.escenario[y][x]; // obtener la casilla seleccionada
    if (this.modo === 'inicio') {
      if (this.principio) {
        this.principio.tipo = 0; // resetear la casilla anterior
      }
      this.principio = casilla; // establecer la nueva casilla de inicio
      this.principio.tipo = 2; // marcarla como tipo inicio
    } else if (this.modo === 'fin') {
      if (this.fin) {
        this.fin.tipo = 0; // resetear la casilla anterior
      }
      this.fin = casilla; // establecer la nueva casilla de fin
      this.fin.tipo = 3; // marcarla como tipo fin
    } else if (this.modo === 'obstaculo') {
      this.agregarObstaculo(x, y); // agregar o quitar un obstáculo
    }
    this.dibujaEscenario(); // redibujar el escenario
  }

  // método para iniciar el algoritmo
  iniciarAlgoritmo() {
    if (this.principio && this.fin) {
      this.openSet.push(this.principio); // agregar el punto de inicio al openset
      setInterval(() => this.calculadora.algoritmo(), 1000 / fps); // iniciar el bucle principal
    } else {
      alert("primero debe configurar el inicio y el fin"); // advertir al usuario
    }
  }
}

// clase calculadoraderutas
class CalculadoraDeRutas {
  constructor(mapa) {
    this.mapa = mapa; // referencia al mapa
  }

  // método heurístico para estimar la distancia entre dos nodos
  heuristica(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); // distancia manhattan
  }

  // método para eliminar un elemento de un array
  borraDelArray(array, elemento) {
    for (let i = array.length - 1; i >= 0; i--) {
      if (array[i] === elemento) {
        array.splice(i, 1); // eliminar el elemento del array
      }
    }
  }

  // método principal del algoritmo a*
  algoritmo() {
    if (!this.mapa.terminado) {
      if (this.mapa.openSet.length > 0) {
        let ganador = 0; // índice del nodo con menor costo

        for (let i = 0; i < this.mapa.openSet.length; i++) {
          if (this.mapa.openSet[i].f < this.mapa.openSet[ganador].f) {
            ganador = i; // encontrar el nodo con el menor costo f
          }
        }

        const actual = this.mapa.openSet[ganador]; // nodo actual a evaluar

        if (actual === this.mapa.fin) {
          let temporal = actual;
          this.mapa.camino.push(temporal); // agregar el nodo final al camino
          while (temporal.padre != null) {
            temporal = temporal.padre;
            this.mapa.camino.push(temporal); // reconstruir el camino
          }
          this.mapa.terminado = true; // marcar como terminado
        } else {
          this.borraDelArray(this.mapa.openSet, actual); // eliminar el nodo actual del openset
          this.mapa.closedSet.push(actual); // agregar el nodo actual al closedset

          const vecinos = actual.vecinos; // obtener los vecinos del nodo actual
          for (let i = 0; i < vecinos.length; i++) {
            const vecino = vecinos[i];

            if (!this.mapa.closedSet.includes(vecino) && vecino.tipo !== 1) {
              const tempG = actual.g + 1; // calcular el nuevo costo g

              if (this.mapa.openSet.includes(vecino)) {
                if (tempG < vecino.g) {
                  vecino.g = tempG; // actualizar el costo g si es menor
                }
              } else {
                vecino.g = tempG;
                this.mapa.openSet.push(vecino); // agregar el vecino al openset
              }

              vecino.h = this.heuristica(vecino, this.mapa.fin); // calcular la heurística h
              vecino.f = vecino.g + vecino.h; // calcular el costo total f
              vecino.padre = actual; // establecer el nodo padre
            }
          }
        }
      } else {
        this.mapa.terminado = true; // marcar como terminado si no hay más nodos en openset
      }
      this.mapa.dibujaEscenario(); // redibujar el escenario
    }
  }
}

// variables globales
let canvas, ctx, mapa;

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('canvas'); // obtener el elemento canvas
  ctx = canvas.getContext('2d'); // obtener el contexto 2d del canvas
  mapa = new Mapa(25, 25, canvas, ctx); // crear el mapa con 25 filas y 25 columnas
  const calculadora = new CalculadoraDeRutas(mapa); // crear la calculadora de rutas
  mapa.calculadora = calculadora; // asignar la calculadora al mapa

  canvas.addEventListener('click', function (event) {
    const rect = canvas.getBoundingClientRect(); // obtener el rectángulo del canvas
    const x = event.clientX - rect.left; // calcular la coordenada x del clic
    const y = event.clientY - rect.top; // calcular la coordenada y del clic
    const casillaX = Math.floor(x / mapa.anchoT); // calcular la columna de la casilla
    const casillaY = Math.floor(y / mapa.altoT); // calcular la fila de la casilla
    mapa.establecerPunto(casillaX, casillaY); // establecer el punto seleccionado

    if (mapa.principio && mapa.fin) {
      document.getElementById('start').disabled = false; // habilitar el botón de inicio
    }
  });

  document.getElementById('set-start').addEventListener('click', () => {
    mapa.modo = 'inicio'; // cambiar el modo a inicio
  });

  document.getElementById('set-end').addEventListener('click', () => {
    mapa.modo = 'fin'; // cambiar el modo a fin
  });

  document.getElementById('set-obstacle').addEventListener('click', () => {
    mapa.modo = 'obstaculo'; // cambiar el modo a obstáculo
  });

  document.getElementById('start').addEventListener('click', () => {
    mapa.iniciarAlgoritmo(); // iniciar el algoritmo
  });

  mapa.dibujaEscenario(); // dibujar el escenario inicial
});
