window.requestAnimFrame = (function () {
  return window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    function (callback) {
      window.setTimeout(callback, 500 / 60);
    };
})();

//agora vamos configurar suas variáveis básicas para a demonstração
var canvas = document.getElementById('canvas'),
  ctx = canvas.getContext('2d'),
  // dimensões em tela cheia
  cw = window.innerWidth,
  ch = window.innerHeight,
  // coleção de fogos de artifício
  fireworks = [],
  //coleção de partículas
  particles = [],
  //matiz inicial
  hue = 120,
  //ao iniciar fogos de artifício com um clique, muitos são lançados ao mesmo tempo sem um limitador, um lançamento a cada 5 tiques de loop
  limiterTotal = 5,
  limiterTick = 0,
  // isso cronometrará os lançamentos automáticos de fogos de artifício, um lançamento por 80 ticks de loop
  timerTotal = 80,
  timerTick = 0,
  mousedown = false,
  // coordenada do mouse x,
  mx,
  // coordenada do mouse y
  my;

// definir dimensões da tela
canvas.width = cw;
canvas.height = ch;

//agora vamos configurar nossos marcadores de função para toda a demonstração

//obter um número aleatório dentro de um intervalo
function random(min, max) {
  return Math.random() * (max - min) + min;
}

// calcular a distância entre dois pontos
function calculateDistance(p1x, p1y, p2x, p2y) {
  var xDistance = p1x - p2x,
    yDistance = p1y - p2y;
  return Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2));
}

// criar fogo de artifício
function Firework(sx, sy, tx, ty) {
  //coordenadas reais
  this.x = sx;
  this.y = sy;
  // coordenadas iniciais
  this.sx = sx;
  this.sy = sy;
  // coordenadas alvo
  this.tx = tx;
  this.ty = ty;
  // distância do ponto inicial ao alvo
  this.distanceToTarget = calculateDistance(sx, sy, tx, ty);
  this.distanceTraveled = 0;
  // acompanhe as coordenadas anteriores de cada fogo de artifício para criar um efeito de trilha, aumente a contagem de coordenadas para criar trilhas mais proeminentes
  this.coordinates = [];
  this.coordinateCount = 3;
  // preencha a coleção de coordenadas inicial com as coordenadas atuais
  while (this.coordinateCount--) {
    this.coordinates.push([this.x, this.y]);
  }
  this.angle = Math.atan2(ty - sy, tx - sx);
  this.speed = 3;
  this.acceleration = 1.05;
  this.brightness = random(50, 70);
  // raio do indicador de alvo do círculo
  this.targetRadius = 1;
}

//atualizar fogo de artifício
Firework.prototype.update = function (index) {
  // remove last item in coordinates array
  this.coordinates.pop();
  // adicione coordenadas atuais ao início da matriz
  this.coordinates.unshift([this.x, this.y]);

  //circule o raio do indicador de alvo do círculo
  if (this.targetRadius < 8) {
    this.targetRadius += 0.3;
  } else {
    this.targetRadius = 1;
  }

  // acelerar o fogo de artifício
  this.speed *= this.acceleration;

  // obter as velocidades atuais com base no ângulo e na velocidade
  var vx = Math.cos(this.angle) * this.speed,
    vy = Math.sin(this.angle) * this.speed;
  // até onde o fogo de artifício viajou com as velocidades aplicadas?
  this.distanceTraveled = calculateDistance(this.sx, this.sy, this.x + vx, this.y + vy);

  //se a distância percorrida, incluindo velocidades, for maior que a distância inicial até o alvo, então o alvo foi atingido
  if (this.distanceTraveled >= this.distanceToTarget) {
    createParticles(this.tx, this.ty);
    // remover o fogo de artifício, use o índice passado para a função de atualização para determinar qual remover
    fireworks.splice(index, 1);
  } else {
    // meta não atingida, continue viajando
    this.x += vx;
    this.y += vy;
  }
}

// desenhar fogo de artifício
Firework.prototype.draw = function () {
  ctx.beginPath();
  //mova para a última coordenada rastreada no conjunto e desenhe uma linha para os xey atuais
  ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
  ctx.lineTo(this.x, this.y);
  ctx.strokeStyle = 'hsl(' + hue + ', 100%, ' + this.brightness + '%)';
  ctx.stroke();

  ctx.beginPath();
  // desenhe o alvo desse fogo de artifício com um círculo pulsante
  ctx.arc(this.tx, this.ty, this.targetRadius, 0, Math.PI * 2);
  ctx.stroke();
}

// criar partícula
function Particle(x, y) {
  this.x = x;
  this.y = y;
  // rastreie as coordenadas passadas de cada partícula para criar um efeito de trilha, aumente a contagem de coordenadas para criar trilhas mais proeminentes
  this.coordinates = [];
  this.coordinateCount = 5;
  while (this.coordinateCount--) {
    this.coordinates.push([this.x, this.y]);
  }
  // defina um ângulo aleatório em todas as direções possíveis, em radianos
  this.angle = random(0, Math.PI * 2);
  this.speed = random(1, 10);
  // a fricção desacelera a partícula
  this.friction = 0.95;
  // gravidade será aplicada e puxe a partícula para baixo
  this.gravity = 1;
  // defina o matiz como um número aleatório + -20 da variável geral do matiz
  this.hue = random(hue - 20, hue + 20);
  this.brightness = random(50, 80);
  this.alpha = 1;
  // definir a rapidez com que a partícula desaparece
  this.decay = random(0.015, 0.03);
}

// atualizar partícula
Particle.prototype.update = function (index) {
  // remover o último item na matriz de coordenadas
  this.coordinates.pop();
  //adicione coordenadas atuais ao início da matriz
  this.coordinates.unshift([this.x, this.y]);
  // abrandar a partícula
  this.speed *= this.friction;
  // aplicar velocidade
  this.x += Math.cos(this.angle) * this.speed;
  this.y += Math.sin(this.angle) * this.speed + this.gravity;
  // esmaecer a partícula
  this.alpha -= this.decay;

  //remova a partícula quando o alfa estiver baixo o suficiente, com base no índice passado
  if (this.alpha <= this.decay) {
    particles.splice(index, 1);
  }
}

// desenhar partícula
Particle.prototype.draw = function () {
  ctx.beginPath();
  //mova para as últimas coordenadas rastreadas no conjunto e desenhe uma linha para os xey atuais
  ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
  ctx.lineTo(this.x, this.y);
  ctx.strokeStyle = 'hsla(' + this.hue + ', 100%, ' + this.brightness + '%, ' + this.alpha + ')';
  ctx.stroke();
}

// criar grupo de partículas / explosão
function createParticles(x, y) {
  // aumentar a contagem de partículas para uma explosão maior, cuidado com o desempenho da tela atingido com o aumento de partículas através
  var particleCount = 30;
  while (particleCount--) {
    particles.push(new Particle(x, y));
  }
}

// loop de demonstração principal
function loop() {
  // essa função será executada infinitamente com requestAnimationFrame
  requestAnimFrame(loop);

  // aumentar o tom para obter fogos de artifício coloridos diferentes ao longo do tempo
  hue += 0.5;

  // normalmente, clearRect () seria usado para limpar a tela
  // queremos criar um efeito à direita
  // definir a operação composta como saída de destino nos permitirá limpar a tela com uma opacidade específica, em vez de limpá-la totalmente
  ctx.globalCompositeOperation = 'destination-out';
  // diminua a propriedade alfa para criar trilhas mais proeminentes
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, cw, ch);
  // altera a operação composta de volta ao nosso modo principal
  // o isqueiro cria pontos de destaque brilhantes quando os fogos de artifício e as partículas se sobrepõem
  ctx.globalCompositeOperation = 'lighter';

  // faça um loop sobre cada fogo de artifício, desenhe-o, atualize-o
  var i = fireworks.length;
  while (i--) {
    fireworks[i].draw();
    fireworks[i].update(i);
  }

  // faça um loop sobre cada partícula, desenhe-a, atualize-a
  var i = particles.length;
  while (i--) {
    particles[i].draw();
    particles[i].update(i);
  }

  //iniciar fogos de artifício automaticamente para coordenadas aleatórias, quando o mouse não estiver pressionado
  if (timerTick >= timerTotal) {
    if (!mousedown) {
      // inicia o fogo de artifício na parte inferior central da tela e, em seguida, defina as coordenadas aleatórias do alvo, as coordenadas aleatórias y serão definidas dentro do intervalo da metade superior da tela
      fireworks.push(new Firework(cw / 2, ch, random(0, cw), random(0, ch / 2)));
      timerTick = 0;
    }
  } else {
    timerTick++;
  }

  // limitar a taxa na qual os fogos de artifício são lançados quando o mouse está pressionado
  if (limiterTick >= limiterTotal) {
    if (mousedown) {
      // inicie o fogo de artifício na parte inferior central da tela e defina as coordenadas atuais do mouse como o alvo
      fireworks.push(new Firework(cw / 5, ch, mx, my));
      limiterTick = 0;
    }
  } else {
    limiterTick++;
  }
}

// ligações de eventos do mouse
// atualiza as coordenadas do mouse no mousemove
canvas.addEventListener('mousemove', function (e) {
  mx = e.pageX - canvas.offsetLeft;
  my = e.pageY - canvas.offsetTop;
});

// alternar o estado do mouse e impedir que a tela seja selecionada
canvas.addEventListener('mousedown', function (e) {
  e.preventDefault();
  mousedown = true;
});

canvas.addEventListener('mouseup', function (e) {
  e.preventDefault();
  mousedown = false;
});

// Uma vez que a janela carrega, estamos prontos para alguns fogos de artifício!
window.onload = loop;
