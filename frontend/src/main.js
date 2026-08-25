import './style.css'
import { io } from 'socket.io-client'
import QRCode from 'qrcode'

const app = document.querySelector('#app')
let socket = null
let myRole = null // 'tv' or 'mobile'
let activeConcept = 1 // 1, 2 or 3

// Inicializar la App
function initApp() {
  const urlParams = new URLSearchParams(window.location.search)
  const roleParam = urlParams.get('role')
  
  if (roleParam === 'tv') {
    setupRole('tv')
  } else if (roleParam === 'mobile') {
    setupRole('mobile')
  } else {
    renderRoleSelection()
  }
}

// 1. VISTA: Selección de Rol
function renderRoleSelection() {
  app.innerHTML = `
    <div class="selection-container animate-fadeIn">
      <h1>Expo UNLu: Experiencias Interactivas</h1>
      <p style="color: var(--color-text-muted); font-size: 1.2rem; text-align: center; max-width: 600px;">
        Elegí cómo querés usar esta pantalla. Para el stand, necesitás una TV (Visualización) y uno o más Celulares (Controladores).
      </p>
      
      <div class="cards-wrapper">
        <!-- Modo TV -->
        <div class="glass-panel role-card tv-card" id="btn-tv">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          <h2>Modo Pantalla (TV)</h2>
          <p style="color: var(--color-text-muted);">Muestra los efectos visuales y gráficos en la pantalla grande del stand.</p>
          <button class="btn-premium">Iniciar como TV</button>
        </div>

        <!-- Modo Celular -->
        <div class="glass-panel role-card mobile-card" id="btn-mobile">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-sim)" stroke-width="2">
            <rect x="5" y="2" width="14" height="20" rx="2"/>
            <line x1="12" y1="18" x2="12" y2="18"/>
          </svg>
          <h2>Modo Control (Celular)</h2>
          <p style="color: var(--color-text-muted);">Interactuá, programá y jugá. Escaneá para tomar el control.</p>
          <button class="btn-premium" style="background: var(--gradient-sim)">Iniciar como Control</button>
        </div>
      </div>
    </div>
  `

  document.getElementById('btn-tv').addEventListener('click', () => setupRole('tv'))
  document.getElementById('btn-mobile').addEventListener('click', () => setupRole('mobile'))
}

// 2. CONFIGURAR ROL Y SOCKET
function setupRole(role) {
  myRole = role
  const serverUrl = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:3000`
  
  app.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
      <h2 style="margin-bottom: 1rem;">Conectando al servidor...</h2>
      <div style="color: var(--color-text-muted);">${serverUrl}</div>
    </div>
  `

  try {
    socket = io(serverUrl)
    
    if (myRole === 'tv') {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'r' || e.key === 'R') {
          socket.emit('reset_session')
        }
      })
    }

    socket.on('connect', () => {
      console.log('Conectado al servidor WebSocket')
      socket.emit('register', myRole)
      
      if (myRole === 'tv') {
        renderTVDashboard()
      } else {
        renderMobileDashboard()
      }
    })

    socket.on('connect_error', (err) => {
      console.error('Error de conexión:', err)
      app.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; text-align: center; padding: 2rem;">
          <h2 style="color: var(--color-accent-ia); margin-bottom: 1rem;">Error de Conexión</h2>
          <p>No se pudo conectar al servidor en <strong>${serverUrl}</strong>.</p>
          <p style="color: var(--color-text-muted); margin-top: 1rem; max-width: 500px;">
            Asegurate de que el backend esté corriendo y de estar conectado a internet o la misma red.
          </p>
          <button class="btn-premium" style="margin-top: 2rem;" onclick="location.reload()">Reintentar</button>
        </div>
      `
    })

    // Escuchar cambios de concepto
    socket.on('concept_changed', (conceptId) => {
      activeConcept = conceptId
      if (myRole === 'tv') {
        renderTVConcept(conceptId)
      } else {
        updateMobileConceptUI(conceptId)
      }
    })

    // Escuchar reset de sesión (Inactividad o botón de pánico)
    socket.on('session_reset', () => {
      console.log('La sesión fue reseteada.')
      activeConcept = 1
      if (myRole === 'tv') {
        renderTVDashboard()
      } else {
        renderMobileDashboard()
      }
    })

  } catch (error) {
    console.error(error)
  }
}

// --- VISTAS DEL MODO TV ---
function renderTVDashboard() {
  app.innerHTML = `
    <div style="display: flex; flex-direction: column; height: 100vh; padding: 2rem;">
      <header style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-glass); padding-bottom: 1rem;">
        <h1 style="font-size: 2rem;">📺 EXPO UNLu (Pantalla principal)</h1>
        <div id="tv-status-badge" class="glass-panel" style="padding: 0.5rem 1rem; font-size: 0.9rem; color: var(--color-primary);">
          ● ESPERANDO CONTROLADOR
        </div>
      </header>
      
      <div style="flex: 1; display: flex; gap: 1.5rem; overflow: hidden;">
        <main id="tv-content" style="flex: 1; display: flex; align-items: center; justify-content: center; position: relative;">
          <!-- Panel de Emparejamiento por QR -->
          <div id="qr-pairing-panel" class="glass-panel animate-fadeIn" style="padding: 3rem; text-align: center; max-width: 600px; display: flex; flex-direction: column; align-items: center; gap: 2rem;">
            <h2>Escaneá el QR para tomar el control</h2>
            <p style="color: var(--color-text-muted);">
              Apuntá con la cámara de tu celular para conectarte.
            </p>
            
            <div style="background: white; padding: 1.5rem; border-radius: 20px; box-shadow: var(--shadow-neon);">
              <canvas id="qr-canvas"></canvas>
            </div>
            
            <div id="pairing-url" style="color: var(--color-secondary); font-family: monospace; font-size: 1.2rem; word-break: break-all;">
              Cargando dirección...
            </div>
          </div>
        </main>

        <!-- Sidebar Ranking -->
        <aside id="ranking-sidebar" class="glass-panel" style="width: 280px; padding: 1rem; display: flex; flex-direction: column; overflow-y: auto; border-radius: 16px; gap: 1rem;">
          <div>
            <h3 style="font-size: 1rem; margin-bottom: 0.5rem; color: #ff007f; text-align: center;">🐿️ Ardilla Runner</h3>
            <div id="ranking-runner" style="display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.8rem;">
              <p style="color: var(--color-text-muted); text-align: center; font-size: 0.75rem;">Sin puntajes aún</p>
            </div>
          </div>
          <div style="border-top: 1px solid var(--border-glass); padding-top: 0.8rem;">
            <h3 style="font-size: 1rem; margin-bottom: 0.5rem; color: var(--color-primary); text-align: center;">🌰 Laberinto</h3>
            <div id="ranking-maze" style="display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.8rem;">
              <p style="color: var(--color-text-muted); text-align: center; font-size: 0.75rem;">Sin puntajes aún</p>
            </div>
          </div>
        </aside>
      </div>
      </main>
    </div>
  `

  // Generar URL móvil basada en el origen actual de la ventana
  const mobileUrl = `${window.location.origin}/?role=mobile`;
  const urlDisplay = document.getElementById('pairing-url');
  if (urlDisplay) urlDisplay.innerText = mobileUrl;
  
  const canvas = document.getElementById('qr-canvas');
  if (canvas) {
    QRCode.toCanvas(canvas, mobileUrl, { width: 250, margin: 1 }, function (error) {
      if (error) console.error(error);
      console.log('Código QR generado con éxito!');
    });
  }

  // Escuchar cuando el usuario se conecta con su nombre
  socket.off('user_joined')
  socket.on('user_joined', (data) => {
    // Actualizar UI de TV
    const badge = document.getElementById('tv-status-badge')
    if (badge) {
      badge.style.color = 'var(--color-accent-sim)'
      badge.innerText = `● CONTROLADO POR: ${data.name.toUpperCase()}`
    }

    // Mostrar animación de bienvenida
    const content = document.getElementById('tv-content')
    if (content) {
      content.innerHTML = `
        <div class="animate-fadeIn" style="text-align: center;">
          <h1 style="font-size: 4rem; margin-bottom: 1rem;">¡Hola, ${data.name}! 👋</h1>
          <p style="font-size: 1.5rem; color: var(--color-text-muted);">Tomando el control de la pantalla...</p>
        </div>
      `
      
      // Pasar al juego en 3 segundos
      setTimeout(() => {
        renderTVConcept(activeConcept)
      }, 3000)
    }
  })

  // Escuchar actualizaciones del ranking
  socket.off('ranking_update')
  socket.on('ranking_update', (data) => {
    try { localStorage.setItem('expo_ranking', JSON.stringify(data)) } catch(e) {}
    renderRankingList('ranking-runner', data.runner || [])
    renderRankingList('ranking-maze', data.maze || [])
  })

  // Cargar ranking guardado desde localStorage
  try {
    const saved = JSON.parse(localStorage.getItem('expo_ranking'))
    if (saved) {
      renderRankingList('ranking-runner', saved.runner || [])
      renderRankingList('ranking-maze', saved.maze || [])
    }
  } catch(e) {}
}

function renderRankingList(containerId, entries) {
  const list = document.getElementById(containerId)
  if (!list || !entries.length) return
  const medals = ['🥇', '🥈', '🥉']
  list.innerHTML = entries.map((entry, i) => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.3rem 0.5rem; background: rgba(255,255,255,${i < 3 ? '0.08' : '0.03'}); border-radius: 8px;">
      <div style="display: flex; align-items: center; gap: 0.3rem; min-width: 0;">
        <span style="font-size: 0.85rem;">${medals[i] || (i + 1) + '.'}</span>
        <div style="min-width: 0;">
          <div style="font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.8rem;">${entry.name}</div>
          <div style="font-size: 0.65rem; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${entry.school}</div>
        </div>
      </div>
      <div style="font-weight: bold; color: var(--color-primary); white-space: nowrap; margin-left: 0.3rem; font-size: 0.85rem;">${entry.score}</div>
    </div>
  `).join('')
}

function renderTVConcept(conceptId) {
  const container = document.getElementById('tv-content')
  if (!container) return

  if (conceptId === 1) {
    container.innerHTML = `
      <div class="animate-fadeIn" style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 2rem;">
        <h2 style="font-size: 2.5rem; margin-bottom: 1rem;">Concepto 1: Programá la TV <span style="font-size: 1.5rem; color: var(--color-primary);">[Programación]</span></h2>
        <p style="color: var(--color-primary); font-size: 1.2rem; max-width: 800px;">¿Qué es la programación? Es darle instrucciones precisas a la computadora para que haga cosas increíbles. ¡Enviá comandos desde tu celular para ver cómo cambia la pantalla en tiempo real!</p>
        <div id="particle-canvas-container" style="width: 100%; height: 60%; margin-top: 2rem; position: relative; border-radius: 20px; overflow: hidden; background: rgba(0,0,0,0.5);">
          <!-- Canvas para las partículas interactivas -->
          <canvas id="tv-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
        </div>
      </div>
    `
    initConcept1TV()
  } else if (conceptId === 2) {
    container.innerHTML = `
      <div class="animate-fadeIn" style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <h2 style="font-size: 2.5rem; margin-bottom: 1rem; color: var(--color-accent-ia);">Concepto 2: Entrená tu IA <span style="font-size: 1.5rem;">[Inteligencia Artificial]</span></h2>
        <p style="color: var(--color-accent-ia); font-size: 1.2rem; max-width: 800px; text-align: center;">La Inteligencia Artificial (IA) aprende a tomar decisiones usando los datos que le damos. Respondé las preguntas en tu celular para ver cómo la IA analiza tu perfil basándose en tus elecciones.</p>
        <div id="ia-visualizer" style="width: 100%; max-width: 800px; padding: 2rem; margin-top: 2rem;" class="glass-panel">
          <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
            <span>Preguntas Respondidas: <span id="ia-data-count">0</span>/15</span>
            <span>Estado: <span id="ia-status" style="color: var(--color-accent-ia);">ENTRENANDO...</span></span>
          </div>
          <div style="background: rgba(255,255,255,0.05); height: 10px; border-radius: 5px; overflow: hidden;">
            <div id="ia-progress-bar" style="width: 0%; height: 100%; background: var(--gradient-ia); transition: width 0.3s;"></div>
          </div>
          <div id="ia-calculation" style="margin-top: 1.5rem; padding: 1rem; background: rgba(0,0,0,0.4); border-radius: 8px; font-family: monospace; font-size: 1.1rem; color: #00f2fe; min-height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
            <div style="color: var(--color-text-muted);">Esperando datos de entrada...</div>
          </div>
          <div id="neural-net-view" style="height: 250px; margin-top: 1rem; display: flex; align-items: center; justify-content: center; position: relative;">
             <canvas id="ia-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
             <div id="ia-result-overlay" style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(9, 10, 15, 0.9); flex-direction: column; justify-content: center; align-items: center; border-radius: 10px; z-index: 20;">
               <h3 style="font-size: 2rem; color: var(--color-accent-ia);">¡Perfil Analizado!</h3>
               <h2 id="ia-profile-name" style="font-size: 3rem; margin-top: 1rem; color: #00f2fe; text-shadow: 0 0 20px rgba(0,242,254,0.6); text-align: center;">SÚPER TECH</h2>
               <p id="ia-profile-desc" style="color: var(--color-text-main); margin-top: 1rem; font-size: 1.2rem; text-align: center; max-width: 80%;">¡Tenés un potencial enorme en tecnología!</p>
             </div>
          </div>
        </div>
      </div>
    `
    initConcept2TV()
  } else if (conceptId === 3) {
    container.innerHTML = `
      <div class="animate-fadeIn" style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 2rem;">
        <h2 style="font-size: 2.5rem; margin-bottom: 1rem; color: var(--color-accent-sim);">Concepto 3: Simulador del Mundo <span style="font-size: 1.5rem;">[Física Computacional]</span></h2>
        <p style="color: var(--color-accent-sim); font-size: 1.2rem; max-width: 800px;">La física computacional nos permite simular las leyes del universo virtualmente. ¡Cambiá las variables como la gravedad y la velocidad desde tu celular para ver cómo reaccionan las partículas!</p>
        <div style="width: 100%; height: 60%; margin-top: 2rem; background: rgba(0,0,0,0.5); border-radius: 20px; overflow: hidden;">
          <canvas id="sim-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
        </div>
      </div>
    `
    initConcept3TV()
  } else if (conceptId === 4) {
    container.innerHTML = `
      <div class="animate-fadeIn" style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <h2 style="font-size: 2.5rem; margin-bottom: 1rem; color: #ff007f;">Concepto 4: Ardilla Runner 🐿️ <span style="font-size: 1.5rem; color: #ff007f;">[Desarrollo de Videojuegos]</span></h2>
        <p style="color: var(--color-text-muted); font-size: 1.2rem; max-width: 800px; text-align: center;">El desarrollo de videojuegos une código, matemáticas y arte para crear experiencias interactivas y divertidas. ¡Pulsá SALTAR en tu celular para esquivar los obstáculos y sumar puntos!</p>
        <div id="game-score" style="font-size: 1.5rem; color: #fff; margin-top: 1rem;">Puntaje: 0</div>
        <div style="width: 100%; max-width: 800px; height: 300px; margin-top: 1.5rem; background: rgba(0,0,0,0.6); border-radius: 20px; overflow: hidden; border: 2px solid var(--border-glass); position: relative;">
          <canvas id="runner-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
          <div id="game-over-overlay" style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); flex-direction: column; justify-content: center; align-items: center;">
            <h3 style="color: #ff0055; font-size: 3rem;">GAME OVER</h3>
            <p style="color: #fff; margin-top: 1rem; font-size: 1.2rem;">Presioná SALTAR en el celular para reiniciar.</p>
          </div>
        </div>
      </div>
    `
    initConcept4TV()
  } else if (conceptId === 5) {
    container.innerHTML = `
      <div class="animate-fadeIn" style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden;">
        <div style="display: flex; gap: 1.5rem; align-items: center; margin-bottom: 0.5rem;">
          <h2 style="font-size: 2rem; color: var(--color-primary); margin: 0;">Laberinto de la Ardilla 🐿️ <span style="font-size: 1.2rem; color: var(--color-primary);">[Algoritmos]</span></h2>
          <div id="maze-timer" style="font-size: 2rem; font-weight: bold; color: #00ff87; min-width: 70px; text-align: center;">60s</div>
        </div>
        <p style="color: var(--color-text-muted); font-size: 1rem; margin-bottom: 0.5rem; max-width: 800px; text-align: center;">Un algoritmo es una serie de pasos lógicos para resolver un problema, como buscar la salida en un laberinto. ¡Usá los controles para guiar a la ardilla hasta la nuez 🌰 antes de que el tiempo termine!</p>
        
        <div style="width: min(65vh, 100%); aspect-ratio: 1; background: rgba(0,0,0,0.85); border-radius: 16px; overflow: hidden; border: 2px solid var(--border-glass); position: relative;">
          <canvas id="maze-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
          <div id="maze-victory-overlay" style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); flex-direction: column; justify-content: center; align-items: center; z-index: 10;">
            <h3 id="maze-end-title" style="color: #00ff87; font-size: 3rem;">¡VICTORIA! 🎉</h3>
            <p id="maze-end-text" style="color: #fff; margin-top: 1rem; font-size: 1.2rem;">¡La ardilla encontró su comida!</p>
          </div>
        </div>
      </div>
    `
    initConcept5TV()
  }
}

// --- VISTAS DEL MODO CELULAR ---
function renderMobileDashboard() {
  // Vista inicial: Pedir Nombre y Colegio
  app.innerHTML = `
    <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100dvh; padding: 2rem 2rem 4rem 2rem;">
      <div class="glass-panel animate-fadeIn" style="padding: 2.5rem; text-align: center; width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 1.2rem;">
        <span style="font-size: 3rem;">🎮</span>
        <h2>Tomá el Control</h2>
        <p style="color: var(--color-text-muted);">Ingresá tus datos para conectarte con la pantalla de la Expo.</p>
        
        <input type="text" id="user-name-input" placeholder="Tu nombre o apodo" style="width: 100%; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-glass); color: #fff; font-family: var(--font-main); font-size: 1.1rem; text-align: center;">
        <input type="text" id="user-school-input" placeholder="Tu colegio" style="width: 100%; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-glass); color: #fff; font-family: var(--font-main); font-size: 1.1rem; text-align: center;">
        
        <button class="btn-premium" id="btn-submit-name" style="width: 100%;">¡EMPEZAR!</button>
      </div>
    </div>
  `

  document.getElementById('btn-submit-name').addEventListener('click', () => {
    const nameInput = document.getElementById('user-name-input').value.trim()
    const schoolInput = document.getElementById('user-school-input').value.trim() || 'Sin colegio'
    if (!nameInput) return alert('Por favor, ingresá un nombre.')

    // Enviar nombre y colegio por socket
    socket.emit('submit_name', { name: nameInput, school: schoolInput })

    // Cargar la UI de Control
    renderMobileControls(nameInput)
  })
}

function renderMobileControls(userName) {
  app.innerHTML = `
    <div style="display: flex; flex-direction: column; height: 100dvh; padding: 1.5rem 1.5rem 4rem 1.5rem;">
      <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <div>
          <h2 style="font-size: 1.2rem;">📱 Control Remoto</h2>
          <span style="font-size: 0.8rem; color: var(--color-primary);">Piloto: ${userName}</span>
        </div>
        <div style="font-size: 0.8rem; padding: 0.3rem 0.6rem; border-radius: 10px; background: rgba(0, 255, 135, 0.2); color: var(--color-accent-sim);">
          Conectado
        </div>
      </header>

      <!-- Selector de Experiencias (Tabs) -->
      <nav style="display: flex; gap: 0.2rem; margin-bottom: 1.5rem;">
        <button class="mobile-tab-btn active" id="tab-1" style="flex: 1; padding: 10px 2px; border-radius: 10px; background: var(--bg-card); border: 1px solid var(--border-glass); color: white; font-weight: 600; font-size: 0.8rem;">Prog.</button>
        <button class="mobile-tab-btn" id="tab-2" style="flex: 1; padding: 10px 2px; border-radius: 10px; background: var(--bg-card); border: 1px solid var(--border-glass); color: white; font-weight: 600; font-size: 0.8rem;">IA</button>
        <button class="mobile-tab-btn" id="tab-3" style="flex: 1; padding: 10px 2px; border-radius: 10px; background: var(--bg-card); border: 1px solid var(--border-glass); color: white; font-weight: 600; font-size: 0.8rem;">Sim.</button>
        <button class="mobile-tab-btn" id="tab-4" style="flex: 1; padding: 10px 2px; border-radius: 10px; background: var(--bg-card); border: 1px solid var(--border-glass); color: white; font-weight: 600; font-size: 0.8rem;">Ardilla</button>
        <button class="mobile-tab-btn" id="tab-5" style="flex: 1; padding: 10px 2px; border-radius: 10px; background: var(--bg-card); border: 1px solid var(--border-glass); color: white; font-weight: 600; font-size: 0.8rem;">Laberinto</button>
      </nav>

      <main id="mobile-content" class="glass-panel" style="flex: 1; padding: 1.5rem; display: flex; flex-direction: column;">
        <!-- Contenido dinámico del control -->
      </main>
    </div>
  `

  // Agregar listeners a las pestañas
  document.getElementById('tab-1').addEventListener('click', () => changeConcept(1))
  document.getElementById('tab-2').addEventListener('click', () => changeConcept(2))
  document.getElementById('tab-3').addEventListener('click', () => changeConcept(3))
  document.getElementById('tab-4').addEventListener('click', () => changeConcept(4))
  document.getElementById('tab-5').addEventListener('click', () => changeConcept(5))

  updateMobileConceptUI(activeConcept)
}

function changeConcept(conceptId) {
  socket.emit('change_concept', conceptId)
}

function updateMobileConceptUI(conceptId) {
  // Actualizar clases de botones
  document.querySelectorAll('.mobile-tab-btn').forEach((btn, idx) => {
    if (idx + 1 === conceptId) {
      btn.style.background = 'var(--gradient-primary)'
      btn.style.borderColor = 'var(--color-primary)'
    } else {
      btn.style.background = 'var(--bg-card)'
      btn.style.borderColor = 'var(--border-glass)'
    }
  })
  const container = document.getElementById('mobile-content')
  if (!container) return

  if (conceptId === 1) {
    container.innerHTML = `
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h3 style="margin-bottom: 1rem; color: var(--color-primary);">Programá la TV <span style="font-size: 0.9rem; color: var(--color-primary); font-weight: normal;">[Programación]</span></h3>
          <p style="color: var(--color-text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">Programar es dar instrucciones paso a paso. Elegí un comando y tocalo para que la pantalla de la Expo lo ejecute.</p>
          
          <div style="display: flex; flex-direction: column; gap: 0.6rem; max-height: 350px; overflow-y: auto; padding-right: 5px;">
            <div class="code-block" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px; border-left: 5px solid var(--color-primary); cursor: pointer;">
              <code>generarParticulas(200);</code>
            </div>
            <div class="code-block" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px; border-left: 5px solid var(--color-secondary); cursor: pointer;">
              <code>cambiarColor("random");</code>
            </div>
            <div class="code-block" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px; border-left: 5px solid var(--color-accent-ia); cursor: pointer;">
              <code>acelerar(3.0);</code>
            </div>
            <div class="code-block" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px; border-left: 5px solid var(--color-accent-sim); cursor: pointer;">
              <code>activarConstelacion();</code>
            </div>
            <div class="code-block" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px; border-left: 5px solid #ffff00; cursor: pointer;">
              <code>explotar();</code>
            </div>
            <div class="code-block" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px; border-left: 5px solid #ff007f; cursor: pointer;">
              <code>cambiarTamaño("gigante");</code>
            </div>
          </div>
        </div>
        
        <button class="btn-premium" id="btn-run-code" style="width: 100%; margin-top: 1rem;">▶ EJECUTAR EN TV</button>
      </div>
    `
    // Eventos de click en bloques (luego implementamos algo más visual)
    let selectedCommand = { type: 'generar', value: 200 }
    
    document.querySelectorAll('.code-block').forEach((block, index) => {
      block.addEventListener('click', () => {
        document.querySelectorAll('.code-block').forEach(b => b.style.background = 'rgba(255,255,255,0.05)')
        block.style.background = 'rgba(0, 242, 254, 0.2)'
        if(index === 0) selectedCommand = { type: 'generar', value: 200 }
        if(index === 1) selectedCommand = { type: 'color', value: 'random' }
        if(index === 2) selectedCommand = { type: 'acelerar', value: 3.0 }
        if(index === 3) selectedCommand = { type: 'constelacion', value: true }
        if(index === 4) selectedCommand = { type: 'explotar', value: true }
        if(index === 5) selectedCommand = { type: 'tamano', value: 'gigante' }
      })
    })

    document.getElementById('btn-run-code').addEventListener('click', () => {
      socket.emit('run_command', selectedCommand)
    })
  } else if (conceptId === 2) {
    container.innerHTML = `
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h3 style="margin-bottom: 0.5rem; color: var(--color-accent-ia);">Entrená tu IA <span style="font-size: 0.9rem; font-weight: normal;">[Inteligencia Artificial]</span></h3>
          <p style="color: var(--color-text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">La IA aprende de la información que recibe. Deslizá para decidir qué datos compartir y descubrí qué deduce sobre vos.</p>
          
          <div id="tinder-card" class="glass-panel" style="width: 100%; aspect-ratio: 1/1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 2rem; border-radius: 20px; position: relative;">
             <span style="font-size: 5rem;">📍</span>
             <h4 style="margin-top: 1rem; text-align: center; font-size: 1.1rem;">Si te pido tu ubicación... ¿aprendo tus rutinas diarias?</h4>
          </div>
        </div>

        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
          <button id="swipe-left" class="btn-premium" style="flex: 1; padding: 10px; font-size: 0.9rem; background: rgba(255,0,0,0.2); border: 1px solid red; color: white;">❌ NO</button>
          <button id="swipe-up" class="btn-premium" style="flex: 1; padding: 10px; font-size: 0.9rem; background: rgba(255,255,0,0.2); border: 1px solid #ffaa00; color: white;">🤔 TAL VEZ</button>
          <button id="swipe-right" class="btn-premium" style="flex: 1; padding: 10px; font-size: 0.9rem; background: rgba(0,255,0,0.2); border: 1px solid green; color: white;">✔ SÍ</button>
        </div>
      </div>
    `
    
    let swipeCount = 0
    let answers = { yes: 0, no: 0, maybe: 0 }
    const cardEl = document.getElementById('tinder-card')
    
    const allQuestions = [
      { i: '📍', t: 'Si te doy mi ubicación... ¿aprendés mis recorridos diarios?' },
      { i: '👍', t: 'Si veo tus "likes"... ¿puedo saber tu ideología política?' },
      { i: '💬', t: 'Si leo tus chats privados... ¿puedo hablar igual que vos?' },
      { i: '💤', t: 'Si monitoreo tu sueño... ¿puedo saber cuándo estás más cansado?' },
      { i: '🎵', t: 'Si escucho tu playlist... ¿puedo adivinar tu estado de ánimo?' },
      { i: '🗣️', t: 'Si grabo tu voz 5 min... ¿puedo hacer llamadas falsas con tu voz?' },
      { i: '🎮', t: 'Si veo cómo jugás... ¿puedo crear un bot que te gane?' },
      { i: '🛒', t: 'Si analizo tu tarjeta... ¿puedo predecir qué vas a comprar?' },
      { i: '📝', t: 'Si leo tus apuntes... ¿puedo escribir ensayos por vos?' },
      { i: '👁️', t: 'Si escaneo tu rostro... ¿puedo saber si estás mintiendo?' },
      { i: '📸', t: 'Si veo tus fotos borradas... ¿aprendo tus secretos?' },
      { i: '🗓️', t: 'Si accedo a tu calendario... ¿puedo saber con quién te juntás?' },
      { i: '❤️', t: 'Si mido tu ritmo cardíaco... ¿puedo saber de quién estás enamorado/a?' },
      { i: '🧬', t: 'Si analizo tu ADN... ¿puedo predecir enfermedades futuras?' },
      { i: '🎓', t: 'Si veo tus notas... ¿puedo decidir si entrás a la universidad?' },
      { i: '🚙', t: 'Si veo cómo manejás... ¿puedo decidir cuánto pagás de seguro?' },
      { i: '🍔', t: 'Si analizo qué comés... ¿puedo sugerirte dietas súper-personalizadas?' },
      { i: '🚪', t: 'Si conectás tu casa inteligente... ¿puedo saber cuándo no estás?' },
      { i: '📺', t: 'Si veo cuánto Netflix consumís... ¿puedo calcular tu nivel de estrés?' },
      { i: '👥', t: 'Si analizo a tus amigos... ¿puedo saber tu nivel económico?' },
      { i: '🎙️', t: 'Si dejo el micrófono abierto... ¿aprendo qué te molesta?' },
      { i: '⌨️', t: 'Si registro cómo tecleás... ¿puedo reconocer quién está usando la PC?' },
      { i: '🔍', t: 'Si leo tu historial de Google... ¿puedo saber tus miedos?' },
      { i: '🐶', t: 'Si veo fotos de tus mascotas... ¿puedo generar videos falsos de ellas?' },
      { i: '💼', t: 'Si analizo tu CV... ¿puedo decidir automáticamente si te contrato?' },
      { i: '🌍', t: 'Si sé a qué países viajaste... ¿puedo adivinar tus ingresos?' },
      { i: '📱', t: 'Si sé qué apps usás... ¿puedo saber tu nivel de procrastinación?' },
      { i: '🏃', t: 'Si rastreo tu actividad física... ¿puedo venderle datos a tu obra social?' },
      { i: '💊', t: 'Si sé qué medicación tomás... ¿puedo mostrarte anuncios de farmacias?' },
      { i: '💰', t: 'Si accedo a tu banco... ¿puedo predecir cuándo te vas a quedar sin plata?' },
      { i: '🎭', t: 'Si analizo qué series abandonás... ¿puedo saber tu nivel de atención?' },
      { i: '🔥', t: 'Si veo con quién hacés "match"... ¿puedo crear a tu pareja ideal en IA?' },
      { i: '✍️', t: 'Si leo tus borradores de mails... ¿puedo saber a quién odiás?' },
      { i: '🕹️', t: 'Si veo tus micropagos en juegos... ¿puedo saber si sos comprador compulsivo?' },
      { i: '🎧', t: 'Si sé qué podcasts escuchás... ¿puedo saber cómo pensás?' },
      { i: '👗', t: 'Si escaneo tu placard virtual... ¿puedo venderte ropa que ni sabías que querías?' },
      { i: '🏫', t: 'Si sé a qué escuela fuiste... ¿puedo deducir tus oportunidades laborales?' },
      { i: '🗳️', t: 'Si veo qué noticias leés... ¿puedo predecir a quién vas a votar?' },
      { i: '👶', t: 'Si analizo fotos de tu infancia... ¿puedo predecir cómo te verás a los 80?' },
      { i: '🚭', t: 'Si sé si fumás... ¿puedo subirte el precio del seguro médico?' },
      { i: '🚗', t: 'Si veo dónde estacionás... ¿puedo saber dónde trabajás?' },
      { i: '🌦️', t: 'Si sé a qué clima estás expuesto... ¿puedo predecir tu estado de ánimo diario?' },
      { i: '📚', t: 'Si sé qué libros dejás por la mitad... ¿puedo saber qué temas te aburren?' },
      { i: '⏳', t: 'Si analizo tu velocidad de reacción... ¿puedo deducir tu edad biológica?' },
      { i: '🎤', t: 'Si te escucho cantar... ¿puedo componer un hit solo para vos?' },
      { i: '🎨', t: 'Si veo qué colores usás más... ¿puedo saber si tenés depresión?' },
      { i: '🧠', t: 'Si uso ondas cerebrales... ¿puedo leer tus pensamientos en texto?' },
      { i: '⌚', t: 'Si uso tu smartwatch... ¿puedo detectar un infarto horas antes?' },
      { i: '✈️', t: 'Si sé tus búsquedas de vuelos... ¿puedo subir el precio cuando quieras comprar?' },
      { i: '🛍️', t: 'Si sé cuánto tiempo mirás una vidriera... ¿puedo saber cuánto querés el producto?' }
    ]

    // Shuffle
    let shuffledQ = [...allQuestions].sort(() => Math.random() - 0.5);
    
    // Set first question
    cardEl.querySelector('span').textContent = shuffledQ[0].i;
    cardEl.querySelector('h4').textContent = shuffledQ[0].t;

    const handleSwipe = (direction) => {
      const answeredText = shuffledQ[swipeCount % shuffledQ.length].t
      
      if (direction === 'right') answers.yes++
      else if (direction === 'left') answers.no++
      else answers.maybe++

      swipeCount++
      socket.emit('swipe_data', { direction, count: swipeCount, text: answeredText })
      
      if (swipeCount >= 15) {
        let pTitle = ''
        let pDesc = ''
        let pColor = ''
        
        if (answers.yes >= 10) {
           pTitle = 'DADOR DE DATOS'
           pDesc = 'Le regalaste tu vida entera a la IA. 🤖 Cuidado con tu privacidad digital.'
           pColor = '#ff007f'
        } else if (answers.no >= 10) {
           pTitle = 'FANTASMA DIGITAL'
           pDesc = 'Nivel máximo de paranoia. 👻 La IA no pudo aprender casi nada de vos.'
           pColor = '#00f2fe'
        } else if (answers.yes > answers.no && answers.yes > answers.maybe) {
           pTitle = 'USUARIO CONFIADO'
           pDesc = 'Cedés bastantes datos a cambio de comodidad tecnológica. ✨'
           pColor = '#00ff87'
        } else if (answers.no > answers.yes && answers.no > answers.maybe) {
           pTitle = 'USUARIO CAUTELOSO'
           pDesc = 'Pensás dos veces antes de regalar tu información. 🔒 Muy bien.'
           pColor = '#ffaa00'
        } else {
           pTitle = 'PERFIL EQUILIBRADO'
           pDesc = 'Sabés exactamente cuándo compartir y cuándo proteger tus datos. ⚖️'
           pColor = '#a0aec0'
        }

        socket.emit('training_complete', { profile: pTitle, desc: pDesc, color: pColor })
        container.innerHTML = `<div style="text-align:center; padding-top: 3rem;">
          <h3 style="color: var(--color-accent-ia);">¡Perfil Analizado!</h3>
          <p style="margin-top:1rem; font-size: 1.1rem; color: var(--color-primary);">Mirá tu resultado en la TV.</p>
        </div>`
      } else {
        const nextQ = shuffledQ[swipeCount % shuffledQ.length]
        cardEl.querySelector('span').textContent = nextQ.i
        cardEl.querySelector('h4').textContent = nextQ.t
      }
    }

    document.getElementById('swipe-left').addEventListener('click', () => handleSwipe('left'))
    document.getElementById('swipe-up').addEventListener('click', () => handleSwipe('up'))
    document.getElementById('swipe-right').addEventListener('click', () => handleSwipe('right'))

  } else if (conceptId === 3) {
    container.innerHTML = `
      <div style="flex: 1; display: flex; flex-direction: column;">
        <h3 style="margin-bottom: 0.5rem; color: var(--color-accent-sim);">El Simulador <span style="font-size: 0.9rem; font-weight: normal;">[Física Computacional]</span></h3>
        <p style="color: var(--color-text-muted); font-size: 0.9rem; margin-bottom: 1rem;">Podemos recrear el mundo con cálculos matemáticos. Ajustá los valores de la física real y mirá su efecto en la TV.</p>
        
        <div style="display: flex; flex-direction: column; gap: 1.2rem; flex: 1; justify-content: center; overflow-y: auto; padding-bottom: 1rem;">
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
              <span>Gravedad</span>
              <span id="val-grav" style="color: var(--color-accent-sim);">1.0</span>
            </div>
            <input type="range" id="slide-grav" min="0" max="5" step="0.1" value="1" style="width: 100%; accent-color: var(--color-accent-sim);">
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
              <span>Velocidad</span>
              <span id="val-vel" style="color: var(--color-accent-sim);">1.0</span>
            </div>
            <input type="range" id="slide-vel" min="0" max="5" step="0.1" value="1" style="width: 100%; accent-color: var(--color-accent-sim);">
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
              <span>Tamaño de Partículas</span>
              <span id="val-size" style="color: var(--color-accent-sim);">8</span>
            </div>
            <input type="range" id="slide-size" min="3" max="30" step="1" value="8" style="width: 100%; accent-color: var(--color-accent-sim);">
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
              <span>Cantidad</span>
              <span id="val-count" style="color: var(--color-accent-sim);">50</span>
            </div>
            <input type="range" id="slide-count" min="10" max="200" step="10" value="50" style="width: 100%; accent-color: var(--color-accent-sim);">
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
              <span>Rebote (Elasticidad)</span>
              <span id="val-bounce" style="color: var(--color-accent-sim);">0.8</span>
            </div>
            <input type="range" id="slide-bounce" min="0.1" max="1.2" step="0.1" value="0.8" style="width: 100%; accent-color: var(--color-accent-sim);">
          </div>
        </div>
      </div>
    `
    const sendVars = () => {
      const g = document.getElementById('slide-grav').value
      const v = document.getElementById('slide-vel').value
      const s = document.getElementById('slide-size').value
      const c = document.getElementById('slide-count').value
      const b = document.getElementById('slide-bounce').value
      
      document.getElementById('val-grav').innerText = g
      document.getElementById('val-vel').innerText = v
      document.getElementById('val-size').innerText = s
      document.getElementById('val-count').innerText = c
      document.getElementById('val-bounce').innerText = b

      socket.emit('update_variables', { 
        gravity: parseFloat(g), 
        speed: parseFloat(v),
        size: parseFloat(s),
        count: parseInt(c),
        bounce: parseFloat(b)
      })
    }

    document.getElementById('slide-grav').addEventListener('input', sendVars)
    document.getElementById('slide-vel').addEventListener('input', sendVars)
    document.getElementById('slide-size').addEventListener('input', sendVars)
    document.getElementById('slide-count').addEventListener('input', sendVars)
    document.getElementById('slide-bounce').addEventListener('input', sendVars)
  } else if (conceptId === 4) {
    container.innerHTML = `
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 2rem;">
        <h3 style="color: var(--color-primary); font-size: 1.5rem;">¡Ardilla Runner! 🐿️ <span style="font-size: 0.9rem; color: var(--color-primary); font-weight: normal;">[Videojuegos]</span></h3>
        <p style="color: var(--color-text-muted); text-align: center; padding: 0 1rem;">Los juegos procesan tus acciones de forma instantánea. Pulsá el botón a tiempo para esquivar obstáculos en la TV.</p>
        
        <button id="btn-jump" class="btn-premium" style="width: 200px; height: 200px; border-radius: 50%; font-size: 2.2rem; background: var(--gradient-primary); box-shadow: 0 0 30px rgba(0, 242, 254, 0.4); border: none; color: white;">
          INICIAR
        </button>
      </div>
    `
    document.getElementById('btn-jump').addEventListener('click', () => {
      const btn = document.getElementById('btn-jump')
      if (btn && btn.innerText === 'INICIAR') {
        btn.innerText = 'SALTAR'
      }
      socket.emit('squirrel_jump')
    })

    socket.off('mobile_game_over')
    socket.on('mobile_game_over', () => {
      const btn = document.getElementById('btn-jump')
      if (btn) btn.innerText = 'INICIAR'
    })
  } else if (conceptId === 5) {
    container.innerHTML = `
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 1rem;">
        <h3 style="color: var(--color-primary); font-size: 1.3rem; margin-bottom: 0.5rem;">Laberinto de la Ardilla 🐿️ <span style="font-size: 0.9rem; color: var(--color-primary); font-weight: normal;">[Algoritmos]</span></h3>
        <p style="color: var(--color-text-muted); text-align: center; font-size: 0.9rem; padding: 0 1rem;">Los algoritmos son caminos para llegar a una meta. Usá las flechas para resolver el laberinto paso a paso.</p>
        
        <!-- D-PAD / Cruzeta Direccional -->
        <div style="display: grid; grid-template-columns: 60px 60px 60px; grid-template-rows: 60px 60px 60px; gap: 10px; justify-content: center; align-items: center;">
          <div></div>
          <button id="maze-up" style="width: 60px; height: 60px; border-radius: 12px; background: var(--gradient-primary); border: none; color: white; font-size: 1.5rem; font-weight: bold; cursor: pointer;">⬆️</button>
          <div></div>
          
          <button id="maze-left" style="width: 60px; height: 60px; border-radius: 12px; background: var(--gradient-primary); border: none; color: white; font-size: 1.5rem; font-weight: bold; cursor: pointer;">⬅️</button>
          <div style="width: 60px; height: 60px; display: flex; justify-content: center; align-items: center; font-size: 1.5rem;">🐿️</div>
          <button id="maze-right" style="width: 60px; height: 60px; border-radius: 12px; background: var(--gradient-primary); border: none; color: white; font-size: 1.5rem; font-weight: bold; cursor: pointer;">➡️</button>
          
          <div></div>
          <button id="maze-down" style="width: 60px; height: 60px; border-radius: 12px; background: var(--gradient-primary); border: none; color: white; font-size: 1.5rem; font-weight: bold; cursor: pointer;">⬇️</button>
          <div></div>
        </div>
        <p style="color: var(--color-text-muted); font-size: 0.8rem; margin-top: 1rem; text-align: center;">¡Apurate! Llegá hasta la nuez 🌰 para sumar puntos al ranking.</p>
      </div>
    `
    const sendMove = (dir) => {
      socket.emit('squirrel_move', { direction: dir })
    }

    document.getElementById('maze-up').addEventListener('click', () => sendMove('up'))
    document.getElementById('maze-down').addEventListener('click', () => sendMove('down'))
    document.getElementById('maze-left').addEventListener('click', () => sendMove('left'))
    document.getElementById('maze-right').addEventListener('click', () => sendMove('right'))
  }
}

// --- LÓGICA DE CANVAS DE TV (Concepto 1) ---
let particles = []
function initConcept1TV() {
  const canvas = document.getElementById('tv-canvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  
  canvas.width = canvas.parentElement.clientWidth
  canvas.height = canvas.parentElement.clientHeight

  particles = []
  const createParticles = (count, color = 'rgba(0, 242, 254, 0.6)') => {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: Math.random() * 4 + 1,
        color: color
      })
    }
  }

  createParticles(100)

  let speedMultiplier = 1
  let drawLines = false
  let particleSizeOverride = null

  function animate() {
    if (!document.getElementById('tv-canvas')) return // Salir si cambió de vista
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Dibujar líneas de constelación si está activado
    if (drawLines) {
      ctx.lineWidth = 0.5
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.15)'
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 80) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }
    }

    particles.forEach(p => {
      p.x += p.vx * speedMultiplier
      p.y += p.vy * speedMultiplier

      if (p.x < 0 || p.x > canvas.width) p.vx *= -1
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1

      const r = particleSizeOverride || p.radius

      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.fill()
    })

    requestAnimationFrame(animate)
  }
  
  animate()

  // Escuchar comandos del socket
  socket.off('execute_command') // Evitar duplicados
  socket.on('execute_command', (cmd) => {
    if (cmd.type === 'generar') {
      createParticles(cmd.value)
    } else if (cmd.type === 'color') {
      const colors = ['#00f2fe', '#ff007f', '#00ff87', '#ffff00', '#ffffff', '#7928CA']
      const randomColor = colors[Math.floor(Math.random() * colors.length)]
      particles.forEach(p => p.color = randomColor)
    } else if (cmd.type === 'acelerar') {
      speedMultiplier = cmd.value
      setTimeout(() => speedMultiplier = 1, 4000) 
    } else if (cmd.type === 'constelacion') {
      drawLines = true
      setTimeout(() => drawLines = false, 6000) 
    } else if (cmd.type === 'explotar') {
      // Modificar vx y vy para que salgan del centro
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      particles.forEach(p => {
        const angle = Math.atan2(p.y - centerY, p.x - centerX)
        p.vx = Math.cos(angle) * 8
        p.vy = Math.sin(angle) * 8
      })
      setTimeout(() => {
        particles.forEach(p => {
          p.vx = (Math.random() - 0.5) * 2
          p.vy = (Math.random() - 0.5) * 2
        })
      }, 2000)
    } else if (cmd.type === 'tamano') {
      particleSizeOverride = 15
      setTimeout(() => particleSizeOverride = null, 4000)
    }
  })
}

// --- LÓGICA DE CANVAS DE TV (Concepto 3) ---
function initConcept3TV() {
  const canvas = document.getElementById('sim-canvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  
  canvas.width = canvas.parentElement.clientWidth
  canvas.height = canvas.parentElement.clientHeight

  let pCount = 50
  let simParticles = []
  let particleColor = '#ffaa00' // Nuevo Color: Naranja Neón
  let pSize = 8
  let bounciness = -0.8
  let gravity = 0
  let speed = 1

  const createSimParticles = (count) => {
    simParticles = []
    for (let i = 0; i < count; i++) {
      simParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * (canvas.height - 50),
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        radius: pSize,
        color: particleColor
      })
    }
  }

  createSimParticles(pCount)

  function animateSim() {
    if (!document.getElementById('sim-canvas')) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    simParticles.forEach(p => {
      // 1. Aplicar velocidad a posición (escalado por speed)
      p.x += p.vx * speed
      p.y += p.vy * speed

      // 2. Aplicar gravedad a la velocidad
      p.vy += gravity * 0.15 // Ajuste de fuerza para mejorar la simulación

      // 3. Rebotes robustos con elasticidad variable
      const bounce = Math.abs(bounciness)
      
      if (p.x < p.radius) { 
        p.x = p.radius; 
        p.vx = Math.abs(p.vx) * bounce; 
      }
      if (p.x > canvas.width - p.radius) { 
        p.x = canvas.width - p.radius; 
        p.vx = -Math.abs(p.vx) * bounce; 
      }
      if (p.y < p.radius) { 
        p.y = p.radius; 
        p.vy = Math.abs(p.vy) * bounce; 
      }
      if (p.y > canvas.height - p.radius) { 
        p.y = canvas.height - p.radius; 
        p.vy = -Math.abs(p.vy) * bounce;
        p.vx *= 0.99; // Fricción en el suelo
      }

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.shadowBlur = 10
      ctx.shadowColor = p.color
      ctx.fill()
      ctx.shadowBlur = 0 // Reset shadow
    })

    requestAnimationFrame(animateSim)
  }
  
  animateSim()

  socket.off('variables_updated')
  socket.on('variables_updated', (vars) => {
    gravity = vars.gravity
    speed = vars.speed
    
    if (vars.size) {
      pSize = vars.size
      simParticles.forEach(p => p.radius = pSize)
    }
    
    if (vars.bounce) {
      bounciness = -vars.bounce
    }

    if (vars.count && vars.count !== pCount) {
      pCount = vars.count
      createSimParticles(pCount)
    }
  })
}

function initConcept2TV() {
  const canvas = document.getElementById('ia-canvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')

  canvas.width = canvas.parentElement.clientWidth
  canvas.height = canvas.parentElement.clientHeight

  const layers = [4, 6, 6, 3]; // 4 inputs, two hidden of 6, 3 outputs (SI, TAL VEZ, NO)
  let nodes = [];
  let links = [];

  // Configurar Nodos
  const layerWidth = canvas.width / (layers.length + 1);
  layers.forEach((nodeCount, layerIndex) => {
    const layerX = layerWidth * (layerIndex + 1);
    const spacing = canvas.height / (nodeCount + 1);
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        id: `${layerIndex}-${i}`,
        x: layerX,
        y: spacing * (i + 1),
        layer: layerIndex,
        value: 0,
        targetValue: 0
      });
    }
  });

  // Configurar Conexiones
  for (let i = 0; i < layers.length - 1; i++) {
    const currentLayerNodes = nodes.filter(n => n.layer === i);
    const nextLayerNodes = nodes.filter(n => n.layer === i + 1);
    
    currentLayerNodes.forEach(n1 => {
      nextLayerNodes.forEach(n2 => {
        links.push({
          source: n1,
          target: n2,
          activePulse: 0
        });
      });
    });
  }

  function animateNetwork() {
    if (!document.getElementById('ia-canvas')) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Dibujar conexiones
    links.forEach(link => {
      ctx.beginPath();
      ctx.moveTo(link.source.x, link.source.y);
      ctx.lineTo(link.target.x, link.target.y);
      
      if (link.activePulse > 0.05) {
        ctx.strokeStyle = `rgba(0, 242, 254, ${link.activePulse})`;
        ctx.lineWidth = 1 + link.activePulse * 3;
        link.activePulse *= 0.9; // Decaimiento suave
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
      }
      ctx.stroke();
    });

    // Dibujar nodos
    nodes.forEach(node => {
      node.value += (node.targetValue - node.value) * 0.1;
      node.targetValue *= 0.95; // Apagar lentamente

      ctx.beginPath();
      ctx.arc(node.x, node.y, 6 + node.value * 6, 0, Math.PI * 2);
      ctx.fillStyle = node.value > 0.1 ? '#00f2fe' : '#151922';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = node.value > 0.1 ? '#fff' : 'rgba(0, 242, 254, 0.5)';
      ctx.stroke();
      
      if (node.value > 0.1) {
        ctx.shadowBlur = 15 * node.value;
        ctx.shadowColor = '#00f2fe';
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    requestAnimationFrame(animateNetwork)
  }

  animateNetwork()

  socket.off('process_swipe')
  socket.on('process_swipe', (data) => {
    const countEl = document.getElementById('ia-data-count')
    const progressEl = document.getElementById('ia-progress-bar')
    if (countEl && progressEl) {
      countEl.innerText = data.count
      progressEl.style.width = `${(data.count / 15) * 100}%`
    }

    const calcEl = document.getElementById('ia-calculation')
    if (calcEl && data.text) {
      const isYes = data.direction === 'right'
      const isNo = data.direction === 'left'
      let answerLabel = '🤔 TAL VEZ'
      let inputVal = 0.5
      let color = '#ffaa00'
      
      if (isYes) { answerLabel = '✔ SÍ'; inputVal = 1.0; color = '#00ff87'; }
      if (isNo) { answerLabel = '❌ NO'; inputVal = 0.0; color = '#ff0055'; }
      
      const w1 = (Math.random() * 0.8 + 0.1).toFixed(2)
      const w2 = (Math.random() * 0.5 - 0.2).toFixed(2)
      const b = (Math.random() * 0.3 - 0.15).toFixed(2)
      
      const z = (inputVal * parseFloat(w1) + parseFloat(w2) + parseFloat(b)).toFixed(2)
      const act = (1 / (1 + Math.exp(-z))).toFixed(2) // Sigmoid function
      
      calcEl.innerHTML = `
        <div style="font-size: 0.9rem; color: var(--color-text-main); margin-bottom: 0.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">
          Dato: <span style="color: var(--color-text-muted);">"${data.text}"</span> -> <strong style="color: ${color};">${answerLabel}</strong>
        </div>
        <div style="font-size: 1.2rem; color: var(--color-primary); margin: 0.3rem 0;">
          f(x) = Sigmoid( ${inputVal}×${w1} + ${w2} + ${b} ) = ${act}
        </div>
        <div style="font-size: 0.85rem; color: var(--color-accent-ia); margin-top: 0.2rem;">
           ${isYes ? 'Peso actualizado. Dato asimilado en la red.' : (isNo ? 'Dato filtrado. Ajustando sesgo (bias)...' : 'Incertidumbre detectada. Redirigiendo a capas ocultas.')}
        </div>
      `
      
      calcEl.style.animation = 'none';
      calcEl.offsetHeight; 
      calcEl.style.animation = 'pulse 0.5s ease';
    }

    // Disparar animación en la red
    // Capa de entrada (Layer 0)
    nodes.filter(n => n.layer === 0).forEach(n => n.targetValue = Math.random() * 0.5 + 0.5);
    
    // Propagación capa por capa
    [1, 2, 3].forEach(layerIdx => {
      setTimeout(() => {
        nodes.filter(n => n.layer === layerIdx).forEach((n, i) => {
           if (layerIdx === 3) {
             // Capa de salida: iluminar según respuesta
             if (data.direction === 'right' && i === 0) n.targetValue = 1;      // SÍ (Arriba)
             else if (data.direction === 'up' && i === 1) n.targetValue = 1;    // TAL VEZ (Medio)
             else if (data.direction === 'left' && i === 2) n.targetValue = 1;  // NO (Abajo)
           } else {
             n.targetValue = Math.random(); // Capas ocultas random
           }
        });
        
        // Iluminar links que van hacia esta capa
        links.filter(l => l.target.layer === layerIdx).forEach(l => {
          if (Math.random() > 0.4 || layerIdx === 3) {
            l.activePulse = 1.0;
          }
        });
      }, layerIdx * 150);
    });
  })

  socket.off('show_results')
  socket.on('show_results', (results) => {
    const overlay = document.getElementById('ia-result-overlay')
    const status = document.getElementById('ia-status')
    
    if (overlay) {
      const nameEl = document.getElementById('ia-profile-name')
      const descEl = document.getElementById('ia-profile-desc')
      
      if (nameEl) {
        nameEl.innerText = results.profile || 'SÚPER TECH'
        nameEl.style.color = results.color || '#00f2fe'
        nameEl.style.textShadow = `0 0 20px ${results.color || '#00f2fe'}`
      }
      if (descEl) {
        descEl.innerText = results.desc || '¡Tenés un potencial enorme en tecnología!'
      }
      
      overlay.style.display = 'flex'
      overlay.style.animation = 'fadeIn 0.5s ease forwards'
      if (status) status.innerText = '¡COMPLETO!'
    }
  })
}

function initConcept4TV() {
  const canvas = document.getElementById('runner-canvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')

  // Ajustar tamaño del canvas rígidamente
  canvas.width = canvas.parentElement.clientWidth || 800
  canvas.height = canvas.parentElement.clientHeight || 300
  if (canvas.height < 100) canvas.height = 300

  let isGameOver = false
  let hasStarted = false
  let score = 0
  
  // Datos de la Ardilla
  const squirrel = {
    x: 50,
    y: canvas.height - 60,
    width: 40,
    height: 40,
    velocityY: 0,
    isJumping: false,
    gravity: 0.6,
    jumpStrength: -12
  }

  // Funciones de Sonido Arcade (Web Audio API)
  function playScoreSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(600, audioCtx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.08)
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08)
      
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      oscillator.start()
      oscillator.stop(audioCtx.currentTime + 0.08)
    } catch(e) { console.error(e) }
  }

  function playGameOverSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      
      oscillator.type = 'sawtooth'
      oscillator.frequency.setValueAtTime(300, audioCtx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.3)
      
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3)
      
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      oscillator.start()
      oscillator.stop(audioCtx.currentTime + 0.3)
    } catch(e) { console.error(e) }
  }

  // Datos de los obstáculos (Múltiples opciones)
  let obstacles = []
  let spawnTimer = 0
  let gameSpeed = 5
  const obstacleEmojis = ['📚', '💻', '🎒', '🔬', '🎓', '🍕']

  // Datos de las Nubes (Parallax)
  let clouds = []

  function spawnObstacle() {
    const randomEmoji = obstacleEmojis[Math.floor(Math.random() * obstacleEmojis.length)]
    obstacles.push({
      x: canvas.width,
      y: canvas.height - 50,
      width: 30,
      height: 40,
      emoji: randomEmoji
    })
  }

  function checkCollision(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    )
  }

  function resetGame() {
    isGameOver = false
    hasStarted = false
    score = 0
    obstacles = []
    
    // Inicializar nubes si no están creadas
    if (clouds.length === 0) {
      for (let i = 0; i < 5; i++) {
        clouds.push({
          x: Math.random() * canvas.width,
          y: Math.random() * (canvas.height - 150) + 20,
          size: Math.random() * 20 + 20,
          speed: Math.random() * 0.8 + 0.3
        })
      }
    }

    squirrel.y = canvas.height - 60
    if (squirrel.y < 0) squirrel.y = 240
    squirrel.velocityY = 0
    squirrel.isJumping = false
    gameSpeed = 5
    document.getElementById('game-over-overlay').style.display = 'none'
    document.getElementById('game-score').innerText = `Puntaje: ${score}`
    animateRunner()
  }

  function animateRunner() {
    if (isGameOver || !document.getElementById('runner-canvas')) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 0. Dibujar Nubes (Parallax)
    clouds.forEach(cloud => {
      cloud.x -= cloud.speed
      if (cloud.x + cloud.size < 0) {
        cloud.x = canvas.width
        cloud.y = Math.random() * (canvas.height - 150) + 20
      }
      ctx.font = `${cloud.size}px Arial`
      ctx.fillText('☁️', cloud.x, cloud.y)
    })

    // 1. Dibujar el Suelo
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, canvas.height - 20)
    ctx.lineTo(canvas.width, canvas.height - 20)
    ctx.stroke()

    // 2. Física de la Ardilla
    if (squirrel.isJumping) {
      squirrel.velocityY += squirrel.gravity
      squirrel.y += squirrel.velocityY

      if (squirrel.y >= canvas.height - 60) {
        squirrel.y = canvas.height - 60
        squirrel.isJumping = false
      }
    }

    // Dibujar Ardilla (Emoji 🐿️ invertido para que mire a los obstáculos)
    ctx.save()
    ctx.scale(-1, 1)
    ctx.font = '35px Arial'
    ctx.fillText('🐿️', -squirrel.x - 35, squirrel.y + 25)
    ctx.restore()

    if (!hasStarted) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#00f2fe'
      ctx.font = 'bold 24px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('PRESIONÁ "INICIAR" EN TU CELULAR', canvas.width / 2, canvas.height / 2)
      requestAnimationFrame(animateRunner)
      return
    }

    // 3. Gestionar Obstáculos
    spawnTimer++
    if (spawnTimer > Math.max(60, 120 - score / 10)) {
      spawnTimer = 0
      spawnObstacle()
    }

    obstacles.forEach((obs, index) => {
      obs.x -= gameSpeed
      
      // Dibujar Obstáculo (Emoji variable)
      ctx.font = '30px Arial'
      ctx.fillText(obs.emoji || '📚', obs.x, obs.y + 25)

      // Comprobar Colisión
      if (checkCollision(squirrel, obs)) {
        isGameOver = true
        playGameOverSound()
        document.getElementById('game-over-overlay').style.display = 'flex'
        socket.emit('game_over')
        if (score > 0) socket.emit('submit_score', { game: 'Ardilla Runner', score })
      }

      // Eliminar obstáculos que se salieron de la pantalla
      if (obs.x + obs.width < 0) {
        obstacles.splice(index, 1)
        score += 10
        playScoreSound()
        document.getElementById('game-score').innerText = `Puntaje: ${score}`
        gameSpeed += 0.2 // Acelerar el juego
      }
    })

    requestAnimationFrame(animateRunner)
  }

  resetGame()

  // Handler para el salto
  socket.off('squirrel_jump')
  socket.on('squirrel_jump', () => {
    if (isGameOver) {
      resetGame()
      hasStarted = true
    } else if (!hasStarted) {
      hasStarted = true
    } else if (!squirrel.isJumping) {
      squirrel.isJumping = true
      squirrel.velocityY = squirrel.jumpStrength
    }
  })
}

function initConcept5TV() {
  const canvas = document.getElementById('maze-canvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')

  canvas.width = 600
  canvas.height = 600

  // --- Generador de Laberinto (Recursive Backtracking) ---
  const mazeCols = 15
  const mazeRows = 15
  const cellSize = canvas.width / mazeCols

  // Inicializar grilla llena de paredes
  let mazeMap = []
  for (let r = 0; r < mazeRows; r++) {
    mazeMap[r] = []
    for (let c = 0; c < mazeCols; c++) {
      mazeMap[r][c] = 1
    }
  }

  // Recursive backtracking para generar laberinto
  function carve(row, col) {
    mazeMap[row][col] = 0
    const dirs = [
      [0, -2], [0, 2], [-2, 0], [2, 0]
    ]
    // Mezclar direcciones aleatoriamente
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]]
    }

    for (const [dr, dc] of dirs) {
      const newRow = row + dr
      const newCol = col + dc
      if (newRow > 0 && newRow < mazeRows - 1 && newCol > 0 && newCol < mazeCols - 1 && mazeMap[newRow][newCol] === 1) {
        // Abrir la pared intermedia
        mazeMap[row + dr / 2][col + dc / 2] = 0
        carve(newRow, newCol)
      }
    }
  }

  carve(1, 1)

  // Buscar una posición aleatoria para la nuez (lejos del inicio)
  const openCells = []
  for (let r = 1; r < mazeRows - 1; r++) {
    for (let c = 1; c < mazeCols - 1; c++) {
      if (mazeMap[r][c] === 0) {
        const dist = Math.abs(r - 1) + Math.abs(c - 1)
        if (dist >= 10) openCells.push({ x: c, y: r })
      }
    }
  }
  // Fallback si no hay celdas lo suficientemente lejos
  if (openCells.length === 0) {
    for (let r = 1; r < mazeRows - 1; r++) {
      for (let c = 1; c < mazeCols - 1; c++) {
        if (mazeMap[r][c] === 0 && !(r === 1 && c === 1)) openCells.push({ x: c, y: r })
      }
    }
  }
  const nutPos = openCells[Math.floor(Math.random() * openCells.length)] || { x: mazeCols - 2, y: mazeRows - 2 }

  let squirrelPos = { x: 1, y: 1 }
  let isWon = false
  let isGameOver = false
  const FOG_RADIUS = 3

  // --- Timer de 60 segundos ---
  let timeLeft = 60
  const timerEl = document.getElementById('maze-timer')
  
  const timerInterval = setInterval(() => {
    if (isWon || isGameOver || !document.getElementById('maze-canvas')) {
      clearInterval(timerInterval)
      return
    }
    timeLeft--
    if (timerEl) {
      timerEl.innerText = `${timeLeft}s`
      if (timeLeft <= 10) timerEl.style.color = '#ff0055'
      else if (timeLeft <= 20) timerEl.style.color = '#ffaa00'
    }
    if (timeLeft <= 0) {
      clearInterval(timerInterval)
      isGameOver = true
      const overlay = document.getElementById('maze-victory-overlay')
      const title = document.getElementById('maze-end-title')
      const text = document.getElementById('maze-end-text')
      if (overlay) {
        if (title) { title.style.color = '#ff0055'; title.innerText = '¡TIEMPO! ⏰' }
        if (text) text.innerText = 'La ardilla no llegó a la nuez...'
        overlay.style.display = 'flex'
      }
      // Sonido de derrota
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = audioCtx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(300, audioCtx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.4)
        const gain = audioCtx.createGain()
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4)
        osc.connect(gain); gain.connect(audioCtx.destination)
        osc.start(); osc.stop(audioCtx.currentTime + 0.4)
      } catch(e) {}
    }
  }, 1000)

  // --- Dibujar Laberinto con Niebla de Guerra ---
  function drawMaze() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (let r = 0; r < mazeRows; r++) {
      for (let c = 0; c < mazeCols; c++) {
        const x = c * cellSize
        const y = r * cellSize

        // Calcular distancia a la ardilla
        const dist = Math.abs(squirrelPos.x - c) + Math.abs(squirrelPos.y - r)
        const isVisible = dist <= FOG_RADIUS

        if (!isVisible) {
          // Niebla oscura
          ctx.fillStyle = 'rgba(5, 5, 20, 0.95)'
          ctx.fillRect(x, y, cellSize, cellSize)
          continue
        }

        // Factor de opacidad según distancia (más lejos = más oscuro)
        const fogAlpha = Math.max(0, 1 - (dist / (FOG_RADIUS + 1)))

        if (mazeMap[r][c] === 1) {
          // Pared Neón
          ctx.fillStyle = `rgba(0, 242, 254, ${0.7 * fogAlpha})`
          ctx.strokeStyle = `rgba(0, 242, 254, ${fogAlpha})`
          ctx.lineWidth = 1.5
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
          ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
        } else {
          // Camino
          ctx.fillStyle = `rgba(10, 10, 30, ${0.8 * fogAlpha})`
          ctx.fillRect(x, y, cellSize, cellSize)
        }
      }
    }

    // Dibujar Nuez 🌰 (solo si visible)
    const nutDist = Math.abs(squirrelPos.x - nutPos.x) + Math.abs(squirrelPos.y - nutPos.y)
    if (nutDist <= FOG_RADIUS) {
      const nutX = nutPos.x * cellSize + cellSize / 2
      const nutY = nutPos.y * cellSize + cellSize / 2
      ctx.font = `${cellSize * 0.65}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('🌰', nutX, nutY)
    }

    // Dibujar Ardilla 🐿️ (siempre visible, con brillo)
    const sqX = squirrelPos.x * cellSize + cellSize / 2
    const sqY = squirrelPos.y * cellSize + cellSize / 2
    ctx.shadowBlur = 15
    ctx.shadowColor = '#00f2fe'
    ctx.font = `${cellSize * 0.65}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🐿️', sqX, sqY)
    ctx.shadowBlur = 0
  }

  drawMaze()

  socket.off('squirrel_move')
  socket.on('squirrel_move', (data) => {
    if (isWon || isGameOver) return

    let nextX = squirrelPos.x
    let nextY = squirrelPos.y

    if (data.direction === 'up') nextY--
    if (data.direction === 'down') nextY++
    if (data.direction === 'left') nextX--
    if (data.direction === 'right') nextX++

    if (nextX >= 0 && nextX < mazeCols && nextY >= 0 && nextY < mazeRows) {
      if (mazeMap[nextY][nextX] === 0) {
        squirrelPos.x = nextX
        squirrelPos.y = nextY
        drawMaze()

        // Comprobar victoria
        if (squirrelPos.x === nutPos.x && squirrelPos.y === nutPos.y) {
          isWon = true
          clearInterval(timerInterval)
          
          // Mostrar overlay con el tiempo restante
          const overlay = document.getElementById('maze-victory-overlay')
          const title = document.getElementById('maze-end-title')
          const text = document.getElementById('maze-end-text')
          if (overlay) overlay.style.display = 'flex'
          if (title) title.innerText = '¡VICTORIA! 🎉'
          if (text) text.innerText = `¡Llegaste con ${timeLeft}s restantes!`
          
          // Enviar puntaje al ranking (tiempo restante = puntaje)
          socket.emit('submit_score', { game: 'Laberinto', score: timeLeft })
          
          // Sonido de victoria
          try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
            const osc = audioCtx.createOscillator()
            osc.frequency.setValueAtTime(500, audioCtx.currentTime)
            osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15)
            const gain = audioCtx.createGain()
            gain.gain.setValueAtTime(0.12, audioCtx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2)
            osc.connect(gain); gain.connect(audioCtx.destination)
            osc.start(); osc.stop(audioCtx.currentTime + 0.2)
            setTimeout(() => {
              const osc2 = audioCtx.createOscillator()
              osc2.frequency.setValueAtTime(800, audioCtx.currentTime)
              osc2.frequency.exponentialRampToValueAtTime(1500, audioCtx.currentTime + 0.15)
              const g2 = audioCtx.createGain()
              g2.gain.setValueAtTime(0.12, audioCtx.currentTime)
              osc2.connect(g2); g2.connect(audioCtx.destination)
              osc2.start(); osc2.stop(audioCtx.currentTime + 0.2)
            }, 150)
          } catch(e) {}
        }
      }
    }
  })
}

// Arrancar
initApp()
