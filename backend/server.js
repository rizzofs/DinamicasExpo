import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import os from 'os';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

let gameState = {
  activeConcept: 1,
  tvConnected: false,
  currentUser: null,
  currentSchool: null
};

// Rankings separados (persisten mientras el servidor esté activo)
let rankingRunner = [];
let rankingMaze = [];

// Temporizador de inactividad
let inactivityTimer = null;

function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  
  inactivityTimer = setTimeout(() => {
    if (gameState.currentUser) {
      console.log('Inactividad detectada (30s). Reseteando sesión...');
      gameState.currentUser = null;
      gameState.currentSchool = null;
      gameState.activeConcept = 1;
      io.emit('session_reset');
    }
  }, 30000); // 30 segundos
}

io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  // Interceptar todos los eventos para resetear el temporizador de inactividad
  socket.use((packet, next) => {
    const eventName = packet[0];
    if (eventName !== 'register' && eventName !== 'reset_session') {
      resetInactivityTimer();
    }
    next();
  });

  // Tecla de pánico para resetear sesión
  socket.on('reset_session', () => {
    console.log('Sesión reseteada por administrador/tecla de pánico.');
    gameState.currentUser = null;
    gameState.currentSchool = null;
    gameState.activeConcept = 1;
    if (inactivityTimer) clearTimeout(inactivityTimer);
    io.emit('session_reset');
  });

  // Registro de rol
  socket.on('register', (role) => {
    if (role === 'tv') {
      socket.join('tv_room');
      gameState.tvConnected = true;
      console.log(`TV registrada: ${socket.id}`);
      io.emit('status_update', gameState);
      // Enviar rankings actuales a la TV recién conectada
      socket.emit('ranking_update', {
        runner: rankingRunner.slice(0, 10),
        maze: rankingMaze.slice(0, 10)
      });
    } else if (role === 'mobile') {
      socket.join('mobile_room');
      console.log(`Celular registrado: ${socket.id}`);
      // Al conectarse un celular, le enviamos el estado actual
      socket.emit('init_state', gameState);
    }
  });

  // El celular envía su nombre y colegio
  socket.on('submit_name', (data) => {
    gameState.currentUser = data.name;
    gameState.currentSchool = data.school || 'Sin colegio';
    console.log(`Usuario: ${data.name} | Colegio: ${data.school}`);
    io.to('tv_room').emit('user_joined', { name: data.name, school: data.school });
  });

  // Guardar puntaje en el ranking correspondiente
  socket.on('submit_score', (data) => {
    const entry = {
      name: data.name || gameState.currentUser || 'Anónimo',
      school: data.school || gameState.currentSchool || 'Sin colegio',
      score: data.score,
      time: new Date().toLocaleTimeString()
    };

    if (data.game === 'Laberinto') {
      rankingMaze.push(entry);
      rankingMaze.sort((a, b) => b.score - a.score);
    } else {
      rankingRunner.push(entry);
      rankingRunner.sort((a, b) => b.score - a.score);
    }

    io.to('tv_room').emit('ranking_update', {
      runner: rankingRunner.slice(0, 10),
      maze: rankingMaze.slice(0, 10)
    });
    console.log(`Ranking ${data.game} actualizado`);
  });

  // Cambio de concepto activo (desde el celular o panel de control)
  socket.on('change_concept', (conceptId) => {
    gameState.activeConcept = conceptId;
    io.emit('concept_changed', conceptId);
    console.log(`Concepto cambiado a: ${conceptId}`);
  });

  // --- EVENTOS CONCEPTO 1: Programá la TV ---
  socket.on('run_command', (commandData) => {
    console.log('Comando recibido:', commandData);
    // Retransmitir a la TV
    io.to('tv_room').emit('execute_command', commandData);
  });

  // --- EVENTOS CONCEPTO 2: Entrená tu IA ---
  socket.on('swipe_data', (swipeData) => {
    console.log('Swipe recibido:', swipeData);
    io.to('tv_room').emit('process_swipe', swipeData);
  });

  socket.on('training_complete', (results) => {
    io.to('tv_room').emit('show_results', results);
  });

  // --- EVENTOS CONCEPTO 3: El Simulador ---
  socket.on('update_variables', (variables) => {
    io.to('tv_room').emit('variables_updated', variables);
  });

  // --- EVENTOS CONCEPTO 4: Ardilla Runner ---
  socket.on('squirrel_jump', () => {
    io.to('tv_room').emit('squirrel_jump');
  });

  socket.on('game_over', () => {
    io.to('mobile_room').emit('mobile_game_over');
  });

  // --- EVENTOS CONCEPTO 5: Laberinto ---
  socket.on('squirrel_move', (data) => {
    io.to('tv_room').emit('squirrel_move', data);
  });

  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
    // Podríamos verificar si la TV se desconectó, pero simplificamos
  });
});

app.get('/api/ip', (req, res) => {
  const interfaces = os.networkInterfaces();
  let localIp = 'localhost';
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Filtrar por IPv4 y que no sea interna (localhost)
      if (iface.family === 'IPv4' && !iface.internal) {
        localIp = iface.address;
        break;
      }
    }
    if (localIp !== 'localhost') break;
  }
  
  res.json({ ip: localIp });
});

app.get('/', (req, res) => {
  res.send('DinamicaExpo Backend Server Running');
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
