# 🎵 JamRoom - Frontend

<div align="center">
  <p><strong>Plataforma colaborativa de streaming de música en tiempo real</strong></p>
  <p>Crea salas, comparte música y sincroniza la reproducción con amigos en tiempo real</p>
</div>

---

## 📋 Tabla de Contenidos

- [Descripción](#-descripción)
- [Características](#-características)
- [Stack Tecnológico](#-stack-tecnológico)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Desarrollo](#-desarrollo)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Testing](#-testing)
- [Despliegue](#-despliegue)
- [Arquitectura](#-arquitectura)
- [Contribuir](#-contribuir)
- [Licencia](#-licencia)

---

## 🎯 Descripción

**JamRoom** es una aplicación web moderna que permite a los usuarios crear y unirse a salas de música colaborativas en tiempo real. Los usuarios pueden:

- Crear salas públicas o privadas (por invitación)
- Agregar canciones a una cola compartida desde Audius
- Escuchar música sincronizada con todos los participantes de la sala
- Chatear en tiempo real con otros miembros
- Comunicarse por voz usando LiveKit
- Gestionar permisos y roles (host, moderador, oyente)

Este proyecto es el **frontend** de JamRoom, construido con Next.js 16 y React 19, con una arquitectura moderna basada en hooks y context API.

---

## ✨ Características

### 🎪 Gestión de Salas
- **Crear salas** personalizadas (públicas o privadas)
- **Unirse a salas públicas** desde el lobby
- **Invitaciones privadas** con enlace único
- **Confirmación de entrada** para salas privadas

### 🎵 Reproducción de Música
- **Cola compartida** sincronizada en tiempo real
- **Integración con Audius** para búsqueda y streaming de música
- **Controles de reproducción** (play, pause, skip, previous)
- **Sincronización automática** entre todos los participantes
- **Visualización del track actual** con portada y metadata

### 👥 Sistema de Participantes
- **Roles diferenciados**: Host, Moderador, Oyente
- **Gestión de permisos** por el host
- **Lista de participantes** en tiempo real
- **Expulsión y gestión de miembros**

### 💬 Chat en Tiempo Real
- **Chat por sala** con Socket.IO
- **Mensajes sincronizados** instantáneamente
- **Historial de mensajes**

### 🎤 Chat de Voz (Beta)
- **Integración con LiveKit** para comunicación de voz
- **Controles de micrófono y audio**
- **Mute/unmute** individual
- **Indicadores de estado de conexión**

### 🔐 Autenticación
- **Sistema de registro e inicio de sesión**
- **JWT tokens** para autenticación
- **Persistencia de sesión**
- **Protección de rutas**

---

## 🛠 Stack Tecnológico

### Core
- **[Next.js 16](https://nextjs.org/)** - Framework React con App Router
- **[React 19](https://react.dev/)** - Biblioteca de UI
- **[TypeScript 5](https://www.typescriptlang.org/)** - Tipado estático

### Styling
- **[Tailwind CSS 3](https://tailwindcss.com/)** - Framework CSS utility-first
- **[Lucide React](https://lucide.dev/)** - Iconos SVG

### Comunicación en Tiempo Real
- **[Socket.IO Client](https://socket.io/)** - WebSockets para sincronización
- **[LiveKit Client](https://livekit.io/)** - WebRTC para chat de voz

### Música
- **[Audius API](https://audius.co/)** - Plataforma de streaming descentralizada

### Testing
- **[Jest 30](https://jestjs.io/)** - Framework de testing
- **[Testing Library](https://testing-library.com/)** - Utilidades para testing de React
- **[ts-jest](https://github.com/kulshekhar/ts-jest)** - Preset de Jest para TypeScript

### Code Quality
- **[ESLint 9](https://eslint.org/)** - Linter de JavaScript/TypeScript
- **[SonarCloud](https://sonarcloud.io/)** - Análisis de calidad de código

---

## 📦 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** >= 20.x
- **npm** >= 10.x (o **yarn**, **pnpm**, **bun**)
- **Git**

---

## 🚀 Instalación

1. **Clonar el repositorio**

```bash
git clone https://github.com/JamRoomOrganization/jamroom-front.git
cd jamroom-front
```

2. **Instalar dependencias**

```bash
npm install
```

---

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```bash
# API Gateway - URL base de los servicios backend
NEXT_PUBLIC_API_BASE_URL=https://jamroom-api-gateway-production.up.railway.app

# Queue Service - Servicio de gestión de colas
QUEUE_SERVICE_URL=https://jamroom-queue-service-production.up.railway.app/api

# Sync Service - Servicio de sincronización en tiempo real
NEXT_PUBLIC_SYNC_SERVICE_URL=https://jamroom-api-gateway-production.up.railway.app

# Audius - Integración con la plataforma de música
NEXT_PUBLIC_AUDIUS_API_URL=https://discoveryprovider.audius.co
NEXT_PUBLIC_AUDIUS_STREAM_URL=https://creatornode.audius.co

# Voice Service - Servicio de chat de voz
NEXT_PUBLIC_VOICE_SERVICE_URL=https://jamroom-api-gateway-production.up.railway.app/chat

# Feature Flags - Habilitar/deshabilitar funcionalidades
NEXT_PUBLIC_ENABLE_VOICE=true
NEXT_PUBLIC_ENABLE_VOICE_MEDIA=true
NEXT_PUBLIC_ENABLE_VOICE_LIVEKIT=true

# Debug - Habilitar logs de depuración
NEXT_PUBLIC_VOICE_DEBUG=true
```

### Configuración Local

Para desarrollo local, puedes configurar URLs locales:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_SYNC_SERVICE_URL=http://localhost:3001
NEXT_PUBLIC_VOICE_SERVICE_URL=http://localhost:3001/chat
```

---

## 💻 Desarrollo

### Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

### Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo con hot-reload |
| `npm run build` | Construye la aplicación para producción |
| `npm run start` | Inicia el servidor de producción |
| `npm run lint` | Ejecuta ESLint para verificar el código |
| `npm run test` | Ejecuta los tests con Jest |
| `npm run test:ci` | Ejecuta tests en modo CI con cobertura |

### Hot Reload

Next.js cuenta con Fast Refresh, que preserva el estado de React mientras editas archivos. Los cambios se reflejan instantáneamente sin necesidad de refrescar el navegador.

---

## 📂 Estructura del Proyecto

```
jamroom-front/
├── public/                    # Archivos estáticos
│   ├── favicon.ico
│   └── *.svg
├── src/
│   ├── app/                   # App Router de Next.js
│   │   ├── login/            # Página de inicio de sesión
│   │   ├── register/         # Página de registro
│   │   ├── create/           # Página de creación de sala
│   │   ├── room/[id]/        # Página de sala dinámica
│   │   ├── confirm/          # Confirmación de entrada
│   │   ├── layout.tsx        # Layout principal
│   │   ├── page.tsx          # Página de inicio (lobby)
│   │   ├── providers.tsx     # Providers globales
│   │   └── globals.css       # Estilos globales
│   ├── components/           # Componentes de React
│   │   ├── Header.tsx        # Cabecera de la app
│   │   ├── PlayerNow.tsx     # Reproductor de música
│   │   ├── QueueList.tsx     # Lista de cola
│   │   ├── ChatPanel.tsx     # Panel de chat
│   │   ├── ParticipantsList.tsx  # Lista de participantes
│   │   ├── VoiceControls.tsx # Controles de voz
│   │   ├── AddSongDialog.tsx # Diálogo para agregar canciones
│   │   ├── InviteDialog.tsx  # Diálogo de invitación
│   │   ├── RoomCard.tsx      # Tarjeta de sala
│   │   ├── ToastProvider.tsx # Sistema de notificaciones
│   │   ├── home/             # Componentes de home
│   │   └── create-room/      # Componentes de creación
│   ├── context/              # React Context
│   │   └── AuthContext.tsx   # Contexto de autenticación
│   ├── hooks/                # Custom React Hooks
│   │   ├── useRoom.tsx       # Hook principal de sala
│   │   ├── useRoomActions.tsx    # Acciones de sala
│   │   ├── useRoomMembers.tsx    # Gestión de miembros
│   │   ├── useRoomQueue.tsx      # Gestión de cola
│   │   ├── useRoomPlaybackControls.tsx  # Controles de reproducción
│   │   ├── useVoiceChat.tsx      # Chat de voz (Socket.IO)
│   │   ├── useVoiceMedia.tsx     # Media de voz (WebRTC)
│   │   ├── useLiveKitVoiceClient.tsx  # Cliente LiveKit
│   │   └── useToast.tsx          # Sistema de notificaciones
│   ├── lib/                  # Utilidades y clientes
│   │   ├── api.ts            # Cliente HTTP (fetch)
│   │   ├── auth.ts           # Utilidades de autenticación
│   │   └── audiusClient.ts   # Cliente de Audius
│   ├── types/                # Definiciones de tipos
│   │   └── index.ts          # Tipos globales
│   ├── utils/                # Funciones de utilidad
│   └── mocks/                # Mocks para testing
├── .github/                  # GitHub Actions y configuración
├── .vscode/                  # Configuración de VSCode
├── coverage/                 # Reportes de cobertura (generado)
├── .next/                    # Build de Next.js (generado)
├── node_modules/             # Dependencias (generado)
├── .env.local                # Variables de entorno (no versionado)
├── .gitignore                # Archivos ignorados por Git
├── eslint.config.mjs         # Configuración de ESLint
├── jest.config.js            # Configuración de Jest
├── jest.setup.ts             # Setup de Jest
├── next.config.ts            # Configuración de Next.js
├── package.json              # Dependencias y scripts
├── postcss.config.js         # Configuración de PostCSS
├── sonar-project.properties  # Configuración de SonarCloud
├── tailwind.config.js        # Configuración de Tailwind
├── tsconfig.json             # Configuración de TypeScript
├── LICENSE                   # Licencia MIT
└── README.md                 # Este archivo
```

### Convenciones de Código

- **Componentes**: PascalCase (e.g., `PlayerNow.tsx`)
- **Hooks**: camelCase con prefijo `use` (e.g., `useRoom.tsx`)
- **Utilidades**: camelCase (e.g., `api.ts`)
- **Tipos**: PascalCase (e.g., `Track`, `Participant`)
- **Archivos de test**: `*.test.tsx` o `*.spec.tsx`

---

## 🧪 Testing

### Ejecutar Tests

```bash
# Ejecutar todos los tests
npm run test

# Ejecutar tests en modo watch
npm run test -- --watch

# Ejecutar tests con cobertura
npm run test:ci
```

### Estructura de Tests

- Los tests están ubicados junto a sus componentes/hooks correspondientes
- Se utiliza **Jest** como test runner
- **Testing Library** para tests de componentes React
- **ts-jest** para soporte de TypeScript

### Cobertura de Código

La cobertura de código se genera automáticamente en `coverage/`:

- `coverage/lcov-report/index.html` - Reporte HTML navegable
- `coverage/lcov.info` - Formato LCOV para CI/CD

**Exclusiones de cobertura:**
- Tests (`**/*.test.*`, `**/*.spec.*`)
- Mocks (`**/mocks/**`)
- Tipos (`**/types/**`)
- Layouts principales (`src/app/layout.tsx`, `src/app/page.tsx`)

---

## 🚢 Despliegue

### Build de Producción

```bash
npm run build
```

Esto genera una build optimizada en `.next/`

### Iniciar en Producción

```bash
npm run start
```

### Plataformas Recomendadas

- **[Vercel](https://vercel.com/)** - Despliegue automático desde GitHub (recomendado)
- **[Railway](https://railway.app/)** - Actual plataforma de backend
- **[Netlify](https://www.netlify.com/)** - Alternativa con CI/CD
- **[AWS Amplify](https://aws.amazon.com/amplify/)** - Para infraestructura AWS

### Variables de Entorno en Producción

Asegúrate de configurar todas las variables de entorno `NEXT_PUBLIC_*` en tu plataforma de despliegue.

---

## 🏗 Arquitectura

### Patrones de Diseño

1. **Custom Hooks**: Lógica reutilizable encapsulada en hooks
   - `useRoom`: Estado principal de la sala
   - `useRoomActions`: Acciones de sala (crear, eliminar, invitar)
   - `useRoomQueue`: Gestión de la cola de reproducción
   - `useVoiceChat`: Comunicación de voz en tiempo real

2. **Context API**: Estado global compartido
   - `AuthContext`: Autenticación y usuario actual

3. **Compound Components**: Componentes compuestos para UI flexible
   - `CreateRoomForm` + `CreateRoomSidebarInfo`
   - `HomeHero` + `RoomsSection`

4. **Component Composition**: Composición sobre herencia
   - `RoomLoadingState`, `RoomErrorState` como estados separados

### Flujo de Datos

```
Usuario → Componente → Hook → API/Socket → Backend
                ↓                           ↓
            Estado Local              Base de Datos
                ↓
         Re-render (React)
```

### Comunicación en Tiempo Real

1. **Socket.IO** para sincronización de estado:
   - Cola de reproducción
   - Chat de texto
   - Lista de participantes
   - Estado de reproducción

2. **LiveKit** para comunicación de voz:
   - Conexión WebRTC
   - Gestión de tracks de audio
   - Estado de micrófono

### Integración con Audius

```
Usuario busca → audiusClient.searchTracks()
                      ↓
              Audius Discovery API
                      ↓
              Lista de resultados
                      ↓
Usuario selecciona → agregar a cola
                      ↓
              audiusClient.getStreamUrl()
                      ↓
              Audius Creator Node
                      ↓
              URL de streaming
                      ↓
              Reproducción en navegador
```

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Para contribuir:

1. **Fork** el repositorio
2. **Crea** una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. **Abre** un Pull Request

### Guidelines

- Sigue las convenciones de código existentes
- Escribe tests para nuevas funcionalidades
- Actualiza la documentación si es necesario
- Asegúrate de que todos los tests pasen (`npm run test`)
- Verifica que no haya errores de linting (`npm run lint`)

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

```
MIT License

Copyright (c) 2025 JamRoomOrganization

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

## 🔗 Enlaces Relacionados

- **[Backend API Gateway](https://github.com/JamRoomOrganization/jamroom-api-gateway)** - API Gateway del proyecto
- **[Documentación de Next.js](https://nextjs.org/docs)** - Framework principal
- **[Documentación de Audius](https://docs.audius.org/)** - Integración de música
- **[Documentación de LiveKit](https://docs.livekit.io/)** - Chat de voz
- **[Documentación de Socket.IO](https://socket.io/docs/v4/)** - Tiempo real

---

<div align="center">
  <p>Hecho con ❤️ por el equipo de JamRoom</p>
  <p>
    <a href="https://github.com/JamRoomOrganization/jamroom-front/issues">Reportar Bug</a>
    ·
    <a href="https://github.com/JamRoomOrganization/jamroom-front/issues">Solicitar Feature</a>
  </p>
</div>
