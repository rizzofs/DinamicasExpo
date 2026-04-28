# 🎮 Experiencias Interactivas - Expo UNLu

Este proyecto contiene un conjunto de experiencias interactivas y juegos diseñados para la Expo UNLu. Permite a los visitantes interactuar con una pantalla gigante (TV/Monitor) utilizando sus propios teléfonos móviles como joysticks a través de WebSockets.

---

## 🚀 Cómo Iniciar el Proyecto

Para poner en marcha la plataforma, es necesario ejecutar tanto el **Servidor Backend** como la **Interfaz Frontend**.

> [!IMPORTANT]
> Ambos servidores deben estar corriendo simultáneamente y en la misma red Wi-Fi para que la comunicación entre el celular y la pantalla funcione.

### 1. Iniciar el Backend (Servidor de Control)

El backend gestiona la sincronización en tiempo real mediante WebSockets.

1. Abre una terminal en la carpeta `backend/`.
2. Si es la primera vez, instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el servidor:
   ```bash
   npm run dev
   ```
   *El servidor se ejecutará por defecto en `http://localhost:3000`.*

### 2. Iniciar el Frontend (Pantalla de la Expo y Controles)

El frontend contiene la interfaz principal que se proyecta y el tablero de control del celular.

1. Abre otra terminal independiente en la carpeta `frontend/`.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el entorno de desarrollo:
   ```bash
   npm run dev
   ```
   *Vite levantará la app en `http://localhost:5176`.*

---

## 📺 Modo de Uso en la Expo

1. **Pantalla Principal (HDMI):** Abre un navegador en la PC conectada a la TV y entra a `http://localhost:5176`.
2. **Emparejamiento:** La pantalla mostrará un código QR generado dinámicamente con la IP de la red local.
3. **Control Remoto:** Los visitantes escanean el QR desde su celular. Esto abrirá el tablero móvil donde ingresarán su nombre y escuela para tomar el control.

---

## 🕹️ Experiencias Incluidas

1. **💻 Programá la TV:** Ejecución interactiva de comandos visuales básicos.
2. **🧠 Entrená tu IA:** Demostración de reconocimiento swipe/gesture.
3. **💥 Simulador de Partículas:** Configuración táctil de físicas interactivas en pantalla.
4. **🐿️ Ardilla Runner:** Juego de obstáculos de estilo retro (T-Rex Chrome).
5. **🌰 El Laberinto:** Un mapa 15x15 dinámico con niebla de guerra y temporizador.

---

## 🏆 Rankings y Guardado

* Los puntajes de la **Ardilla Runner** y el **Laberinto** se guardan de forma independiente.
* **Persistencia:** Gracias a `localStorage`, el ranking persistirá en la PC transmisora aunque el servidor se caiga o se refresque accidentalmente la pestaña.

---
*Desarrollado para el Centro de Estudiantes - Codes 2026.*
