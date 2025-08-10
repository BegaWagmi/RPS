# 🎮 RockPaperScissors - Convergence Trials

A strategic multiplayer browser game combining maze navigation, resource management, and Rock Paper Scissors battles. Navigate hidden-key mazes, collect RPS keys, unlock doors, and battle other players to reach the final three-key door and win!

## 🎯 Game Overview

**Convergence Trials** is a 2D multiplayer browser game where players:
- Navigate procedurally-generated mazes
- Collect hidden Rock, Paper, and Scissors keys
- Unlock doors using the right key combinations  
- Battle other players in proximity-triggered RPS mini-games
- Race to reach the final three-key door to win

### Key Features
- **Hidden Information Design**: Keys and door symbols are concealed until revealed
- **Anti-Bot Mechanics**: Dynamic elements prevent automated solutions
- **Client-Side Prediction**: Responsive 60 FPS gameplay with lag compensation
- **Strategic Depth**: Key management, timing, and psychological warfare
- **Beautiful UI**: Cyber-mystical theme with smooth animations

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ LTS
- npm 9+
- Modern web browser with WebGL support

### Installation & Setup

1. **Clone and Install Dependencies**
```bash
cd client
npm install
```

2. **Start Development Server**
```bash
npm run dev
```

3. **Open Game**
- Open browser to `http://localhost:3000`
- Game runs in **MOCK MODE** by default (no server needed for testing)

### Build for Production
```bash
# Full production build with optimizations
npm run optimize

# Or step by step:
npm run type-check    # TypeScript validation
npm run lint         # Code quality check
npm run build:prod   # Production build
npm run preview:prod # Preview production build
```

## 🎮 How to Play

### Basic Controls
- **Movement**: WASD keys or Arrow keys
- **Interact**: Spacebar (for doors)
- **RPS Battles**: Mouse clicks or number keys (1=Rock, 2=Paper, 3=Scissors)
- **Pause/Menu**: ESC key

### Game Flow
1. **Start**: Each player spawns with 1 random hidden key
2. **Explore**: Navigate maze to find more keys (max 3 at a time)
3. **Unlock**: Use keys to open doors (Rock > Scissors > Paper > Rock)
4. **Battle**: Stay near other players for 3 seconds to trigger RPS battle
5. **Win**: Reach the final door requiring Rock + Paper + Scissors keys

### Battle System
- **Proximity Trigger**: Players within 2 tiles for 3 seconds
- **RPS Mini-Game**: Standard Rock Paper Scissors rules
- **Stakes**: 
  - Winner with 1 key → Loser eliminated
  - Winner with 2-3 keys → Winner steals random key
- **Cooldown**: 10-second battle cooldown prevents spam

## 🏗️ Architecture

### Frontend Stack
- **Engine**: Phaser.js 3.70+ (WebGL/Canvas 2D)
- **Language**: TypeScript 5.0+
- **Build**: Vite 4.0+
- **State**: Redux Toolkit
- **Network**: Socket.io-client

### Key Systems
- **NetworkSystem**: WebSocket communication with client prediction
- **Player Entity**: Movement, inventory, network sync, visual effects
- **GameScene**: Main gameplay with physics, collisions, UI
- **BattleScene**: RPS mini-game overlay
- **MenuScene**: Matchmaking and game navigation

### Technical Features
- **Client-Side Prediction**: Immediate input response
- **Server Reconciliation**: Rollback and replay for consistency
- **Spatial Partitioning**: Efficient proximity detection
- **Asset Generation**: Procedural placeholder graphics
- **Mock Multiplayer**: Standalone testing without server

## 📁 Project Structure

```
/client/
├── src/
│   ├── core/           # Core game systems
│   ├── scenes/         # Phaser scenes (Boot, Menu, Game, Battle)
│   ├── entities/       # Game objects (Player)
│   ├── systems/        # Game systems (Network)
│   ├── utils/          # Constants, types, helpers
│   └── assets/         # Generated at runtime
├── public/             # Static assets
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 🎨 Visual Design

### Color Palette
- **Primary**: Deep blues (#1a1a2e, #16213e)
- **Accents**: Cyan (#00f5ff), Orange (#ff6b35), Pink (#ff006e)
- **Symbols**: 
  - Rock: Brown (#8b4513)
  - Paper: White (#ffffff) 
  - Scissors: Silver (#c0c0c0)

### Art Style
- Minimalist geometric shapes
- Subtle neon glow effects
- Smooth animations and transitions
- Cyber-mystical theme

## 🔧 Development

### Available Scripts
```bash
# Development
npm run dev          # Start development server
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode

# Code Quality
npm run type-check   # TypeScript type checking
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
npm run format       # Format code with Prettier
npm run quality      # Run all quality checks

# Production
npm run build        # Basic build
npm run build:prod   # Optimized production build
npm run preview      # Preview build
npm run optimize     # Full optimization pipeline
npm run clean        # Clean build artifacts
```

### Debug Features
- **FPS Counter**: Shows performance metrics
- **Network Logging**: Logs all network messages
- **Mock Mode**: Simulates multiplayer without server
- **Console Logging**: Detailed game event logging

### Configuration
Edit `/src/utils/Constants.ts` to modify:
- Game balance (movement speed, battle timings)
- Visual settings (colors, animations)
- Debug options (FPS display, logging)
- Network settings (server URL, tick rates)

## 🌐 Multiplayer (Future)

The game is designed for authoritative server architecture:
- **Server**: Node.js + Express + Socket.io
- **Database**: Redis (game state) + PostgreSQL (persistence)
- **Security**: JWT authentication, input validation
- **Scalability**: Docker containers with load balancing

Current implementation includes mock multiplayer for standalone testing.

## 🎯 Game Design Philosophy

### Core Principles
1. **Hidden Information**: Prevents automated solutions
2. **Meaningful Choices**: Every decision has strategic weight
3. **Skill + Luck Balance**: RPS provides uncertainty within strategy
4. **Anti-Griefing**: Cooldowns and protections prevent harassment
5. **Accessibility**: Simple controls, clear visual feedback

### Balance Considerations
- **Key Scarcity**: Limited inventory forces tough decisions
- **Dynamic Doors**: Symbols change to prevent exploitation
- **Battle Stakes**: Graduated penalties maintain engagement
- **Time Pressure**: Optional match duration limits camping

## 🚦 Current Status

**PHASE 5 COMPLETE** - Production-ready game with:

### ✅ **Core Gameplay**
- Complete maze navigation with physics
- Hidden Rock Paper Scissors key collection
- Strategic door unlocking mechanics
- Proximity-triggered RPS battles
- Anti-bot design with dynamic elements

### ✅ **Advanced Features**
- **Power-Up System**: Ghost Walk, Key Sense, Shield, Speed Boost, Confusion
- **Enhanced Animations**: Particle effects, screen shakes, celebrations
- **Immersive Audio**: Spatial sound effects, dynamic music, UI feedback
- **Performance Optimization**: Device-adaptive settings, object pooling, culling

### ✅ **Technical Excellence**
- Client-side prediction with server reconciliation
- TypeScript with full type safety
- Modular architecture with clean separation
- Production build optimization
- Code quality tools (ESLint, Prettier)
- Performance monitoring and adaptive quality

### ✅ **Polish & Production**
- Beautiful cyber-mystical visual theme
- Smooth 60 FPS gameplay with optimizations
- Professional UI/UX with accessibility
- Error handling and graceful degradation
- Build system with chunking and minification

## 📜 License

This project is created as a game development prototype. See individual files for specific licensing.

## 🤝 Contributing

This is a demonstration project. For educational purposes, feel free to:
- Study the architecture
- Modify game balance
- Add new features
- Optimize performance

---

**Built with ❤️ using Phaser.js, TypeScript, and modern web technologies**
