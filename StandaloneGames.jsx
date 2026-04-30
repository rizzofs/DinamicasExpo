import React, { useEffect, useRef, useState } from 'react';

/**
 * 🐿️ Componente Ardilla Runner para React
 * @param {function} onSaveScore - Callback opcional para guardar puntajes (ej. en Supabase). Recibe (nombreJuego, puntaje).
 */
export const SquirrelRunner = ({ onSaveScore }) => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Tamaño fijo del canvas
    canvas.width = 800;
    canvas.height = 300;

    let localIsGameOver = false;
    let localScore = 0;
    let spawnTimer = 0;
    let gameSpeed = 5;
    const obstacleEmojis = ['📚', '💻', '🎒', '🔬', '🎓', '🍕'];
    let obstacles = [];
    let clouds = [];

    const squirrel = {
      x: 50,
      y: canvas.height - 60,
      width: 40,
      height: 40,
      velocityY: 0,
      isJumping: false,
      gravity: 0.6,
      jumpStrength: -12
    };

    // Inicializar Nubes (Parallax)
    for (let i = 0; i < 5; i++) {
      clouds.push({
        x: Math.random() * canvas.width,
        y: Math.random() * (canvas.height - 150) + 20,
        size: Math.random() * 20 + 20,
        speed: Math.random() * 0.8 + 0.3
      });
    }

    function spawnObstacle() {
      const randomEmoji = obstacleEmojis[Math.floor(Math.random() * obstacleEmojis.length)];
      obstacles.push({
        x: canvas.width,
        y: canvas.height - 50,
        width: 30,
        height: 40,
        emoji: randomEmoji
      });
    }

    function checkCollision(rect1, rect2) {
      return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
      );
    }

    function resetGame() {
      localIsGameOver = false;
      setIsGameOver(false);
      localScore = 0;
      setScore(0);
      obstacles = [];
      squirrel.y = canvas.height - 60;
      squirrel.velocityY = 0;
      squirrel.isJumping = false;
      gameSpeed = 5;
      animateRunner();
    }

    let animationFrameId;

    function animateRunner() {
      if (localIsGameOver) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Dibujar Nubes (Fondo)
      clouds.forEach(cloud => {
        cloud.x -= cloud.speed;
        if (cloud.x + cloud.size < 0) {
          cloud.x = canvas.width;
          cloud.y = Math.random() * (canvas.height - 150) + 20;
        }
        ctx.font = `${cloud.size}px Arial`;
        ctx.fillText('☁️', cloud.x, cloud.y);
      });

      // 2. Dibujar Suelo
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height - 20);
      ctx.lineTo(canvas.width, canvas.height - 20);
      ctx.stroke();

      // 3. Física de la Ardilla
      if (squirrel.isJumping) {
        squirrel.velocityY += squirrel.gravity;
        squirrel.y += squirrel.velocityY;

        if (squirrel.y >= canvas.height - 60) {
          squirrel.y = canvas.height - 60;
          squirrel.isJumping = false;
        }
      }

      // Dibujar Ardilla
      ctx.save();
      ctx.scale(-1, 1);
      ctx.font = '35px Arial';
      ctx.fillText('🐿️', -squirrel.x - 35, squirrel.y + 25);
      ctx.restore();

      // 4. Obstáculos
      spawnTimer++;
      if (spawnTimer > Math.max(60, 120 - localScore / 10)) {
        spawnTimer = 0;
        spawnObstacle();
      }

      obstacles.forEach((obs, index) => {
        obs.x -= gameSpeed;
        ctx.font = '30px Arial';
        ctx.fillText(obs.emoji || '📚', obs.x, obs.y + 25);

        if (checkCollision(squirrel, obs)) {
          localIsGameOver = true;
          setIsGameOver(true);
          if (onSaveScore) onSaveScore('Ardilla Runner', localScore);
        }

        if (obs.x + obs.width < 0) {
          obstacles.splice(index, 1);
          localScore += 10;
          setScore(localScore);
          gameSpeed += 0.2;
        }
      });

      animationFrameId = requestAnimationFrame(animateRunner);
    }

    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (localIsGameOver) {
          resetGame();
        } else if (!squirrel.isJumping) {
          squirrel.isJumping = true;
          squirrel.velocityY = squirrel.jumpStrength;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    resetGame();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animationFrameId);
    };
  }, [onSaveScore]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0d1117', padding: '20px', borderRadius: '12px', color: '#fff', fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: '5px' }}>🐿️ Ardilla Runner [Videojuegos]</h2>
      <p style={{ color: '#aaa', marginTop: '0', marginBottom: '15px', textAlign: 'center', maxWidth: '600px' }}>El desarrollo de videojuegos une código y arte para crear experiencias divertidas. ¡Pulsá ESPACIO o Flecha Arriba para saltar!</p>
      <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Puntaje: {score}</div>
      <div style={{ position: 'relative', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} />
        {isGameOver && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <h3 style={{ color: '#ff0055', fontSize: '3rem', margin: 0 }}>GAME OVER</h3>
            <p style={{ color: '#fff', marginTop: '10px' }}>Presioná ESPACIO o Flecha Arriba para reiniciar.</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 🗺️ Componente Laberinto de la Ardilla para React
 */
export const SquirrelMaze = ({ onSaveScore }) => {
  const canvasRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameState, setGameState] = useState('playing'); // playing, won, lost

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width = 600;
    canvas.height = 600;

    const mazeCols = 15;
    const mazeRows = 15;
    const cellSize = canvas.width / mazeCols;

    let mazeMap = [];
    let localTimeLeft = 60;
    let localGameState = 'playing';

    // Generar Laberinto
    for (let r = 0; r < mazeRows; r++) {
      mazeMap[r] = [];
      for (let c = 0; c < mazeCols; c++) {
        mazeMap[r][c] = 1;
      }
    }

    function carve(row, col) {
      mazeMap[row][col] = 0;
      const dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]];
      for (let i = dirs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
      }
      for (const [dr, dc] of dirs) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (newRow > 0 && newRow < mazeRows - 1 && newCol > 0 && newCol < mazeCols - 1 && mazeMap[newRow][newCol] === 1) {
          mazeMap[row + dr / 2][col + dc / 2] = 0;
          carve(newRow, newCol);
        }
      }
    }

    carve(1, 1);

    const openCells = [];
    for (let r = 1; r < mazeRows - 1; r++) {
      for (let c = 1; c < mazeCols - 1; c++) {
        if (mazeMap[r][c] === 0) {
          const dist = Math.abs(r - 1) + Math.abs(c - 1);
          if (dist >= 10) openCells.push({ x: c, y: r });
        }
      }
    }

    const nutPos = openCells[Math.floor(Math.random() * openCells.length)] || { x: mazeCols - 2, y: mazeRows - 2 };
    let squirrelPos = { x: 1, y: 1 };
    const FOG_RADIUS = 3;

    function drawMaze() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let r = 0; r < mazeRows; r++) {
        for (let c = 0; c < mazeCols; c++) {
          const x = c * cellSize;
          const y = r * cellSize;
          const dist = Math.abs(squirrelPos.x - c) + Math.abs(squirrelPos.y - r);
          const isVisible = dist <= FOG_RADIUS;

          if (!isVisible) {
            ctx.fillStyle = 'rgba(5, 5, 20, 0.95)';
            ctx.fillRect(x, y, cellSize, cellSize);
            continue;
          }

          const fogAlpha = Math.max(0, 1 - (dist / (FOG_RADIUS + 1)));

          if (mazeMap[r][c] === 1) {
            ctx.fillStyle = `rgba(0, 242, 254, ${0.7 * fogAlpha})`;
            ctx.strokeStyle = `rgba(0, 242, 254, ${fogAlpha})`;
            ctx.lineWidth = 1.5;
            ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
            ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
          } else {
            ctx.fillStyle = `rgba(10, 10, 30, ${0.8 * fogAlpha})`;
            ctx.fillRect(x, y, cellSize, cellSize);
          }
        }
      }

      // Nuez
      const nutDist = Math.abs(squirrelPos.x - nutPos.x) + Math.abs(squirrelPos.y - nutPos.y);
      if (nutDist <= FOG_RADIUS) {
        ctx.font = `${cellSize * 0.65}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌰', nutPos.x * cellSize + cellSize / 2, nutPos.y * cellSize + cellSize / 2);
      }

      // Ardilla
      ctx.font = `${cellSize * 0.65}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🐿️', squirrelPos.x * cellSize + cellSize / 2, squirrelPos.y * cellSize + cellSize / 2);
    }

    drawMaze();

    // Temporizador
    const timerInterval = setInterval(() => {
      if (localGameState !== 'playing') {
        clearInterval(timerInterval);
        return;
      }
      localTimeLeft--;
      setTimeLeft(localTimeLeft);

      if (localTimeLeft <= 0) {
        clearInterval(timerInterval);
        localGameState = 'lost';
        setGameState('lost');
      }
    }, 1000);

    const handleKeyDown = (e) => {
      if (localGameState !== 'playing') return;

      let nextX = squirrelPos.x;
      let nextY = squirrelPos.y;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); nextY--; }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); nextY++; }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); nextX--; }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); nextX++; }

      if (nextX >= 0 && nextX < mazeCols && nextY >= 0 && nextY < mazeRows) {
        if (mazeMap[nextY][nextX] === 0) {
          squirrelPos.x = nextX;
          squirrelPos.y = nextY;
          drawMaze();

          if (squirrelPos.x === nutPos.x && squirrelPos.y === nutPos.y) {
            localGameState = 'won';
            setGameState('won');
            clearInterval(timerInterval);
            if (onSaveScore) onSaveScore('Laberinto', localTimeLeft);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(timerInterval);
    };
  }, [onSaveScore]);

  const restartGame = () => {
    setGameState('playing');
    setTimeLeft(60);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0d1117', padding: '20px', borderRadius: '12px', color: '#fff', fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: '5px' }}>🗺️ Laberinto de la Ardilla [Algoritmos]</h2>
      <p style={{ color: '#aaa', marginTop: '0', marginBottom: '15px', textAlign: 'center', maxWidth: '600px' }}>Un algoritmo es una serie de pasos para resolver un problema. Usá las flechas o WASD para guiar a la ardilla hacia su meta.</p>
      <div style={{ fontSize: '1.5rem', marginBottom: '10px', color: timeLeft <= 10 ? '#ff0055' : '#00ff87' }}>
        Tiempo: {timeLeft}s
      </div>
      <div style={{ position: 'relative', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ display: 'block', background: 'rgba(0,0,0,0.85)' }} />
        {gameState !== 'playing' && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <h3 style={{ color: gameState === 'won' ? '#00ff87' : '#ff0055', fontSize: '3rem', margin: 0 }}>
              {gameState === 'won' ? '¡VICTORIA! 🎉' : '¡TIEMPO! ⏰'}
            </h3>
            <p style={{ color: '#fff', marginTop: '10px' }}>
              {gameState === 'won' ? `Llegaste con ${timeLeft}s restantes.` : 'No pudiste llegar a la nuez.'}
            </p>
            <button 
              onClick={restartGame}
              style={{ marginTop: '20px', padding: '10px 20px', fontSize: '1.2rem', background: '#00f2fe', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Jugar de Nuevo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
