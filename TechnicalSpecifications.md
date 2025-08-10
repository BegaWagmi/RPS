# RockPaperScissors - Technical Specifications
**Version 1.0** | **Date: 2024** | **Target: Production-Ready Implementation**

---

## 🛠️ 1. TECHNOLOGY STACK

### Core Framework Choice: **Phaser.js 3.70+**

**Rationale:**
- Mature WebGL/Canvas 2D rendering engine
- Excellent performance for 2D games
- Built-in physics, animation, and input systems
- Strong community support and documentation
- Easy deployment to web browsers
- TypeScript support for better code quality

### Frontend Stack
```typescript
Core Engine:     Phaser.js 3.70.0
Language:        TypeScript 5.0+
Build Tool:      Vite 4.0+
Package Manager: npm 9.0+
UI Framework:    Native Phaser UI + HTML overlays
State Management: Redux Toolkit 1.9+
WebSocket Client: Socket.io-client 4.7+
```

### Backend Stack
```typescript
Runtime:         Node.js 18+ LTS
Framework:       Express.js 4.18+
WebSocket:       Socket.io 4.7+
Database:        Redis 7.0+ (game state), PostgreSQL 15+ (persistent data)
Authentication:  JWT tokens
Hosting:         Docker containers
Load Balancer:   nginx
```

### Development Tools
```typescript
Code Quality:    ESLint + Prettier
Testing:         Jest + Playwright
CI/CD:          GitHub Actions
Monitoring:      Winston logging + PM2
Analytics:       Custom telemetry system
```

---

## 📁 2. FILE STRUCTURE

### Frontend Architecture
```
/client/
├── src/
│   ├── core/                    # Core game engine
│   │   ├── Game.ts              # Main game class
│   │   ├── SceneManager.ts      # Scene management
│   │   └── InputManager.ts      # Input handling
│   ├── scenes/                  # Game scenes
│   │   ├── BootScene.ts         # Asset loading
│   │   ├── MenuScene.ts         # Main menu
│   │   ├── GameScene.ts         # Main gameplay
│   │   └── BattleScene.ts       # RPS mini-game
│   ├── entities/                # Game objects
│   │   ├── Player.ts            # Player entity
│   │   ├── Maze.ts              # Maze system
│   │   ├── Door.ts              # Door mechanics
│   │   └── Key.ts               # Key objects
│   ├── systems/                 # Game systems
│   │   ├── NetworkSystem.ts     # Multiplayer sync
│   │   ├── CollisionSystem.ts   # Collision detection
│   │   ├── UISystem.ts          # User interface
│   │   └── AudioSystem.ts       # Sound management
│   ├── utils/                   # Utilities
│   │   ├── Constants.ts         # Game constants
│   │   ├── Types.ts             # TypeScript interfaces
│   │   └── Helpers.ts           # Helper functions
│   └── assets/                  # Game assets
│       ├── images/              # Sprites and textures
│       ├── audio/               # Sound effects and music
│       └── data/                # JSON configurations
├── public/
│   ├── index.html               # Entry point
│   └── manifest.json            # PWA manifest
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### Backend Architecture
```
/server/
├── src/
│   ├── core/                    # Core server logic
│   │   ├── Server.ts            # Express server setup
│   │   ├── SocketManager.ts     # WebSocket handling
│   │   └── GameLoop.ts          # Authoritative game loop
│   ├── game/                    # Game logic
│   │   ├── GameRoom.ts          # Room management
│   │   ├── GameState.ts         # State synchronization
│   │   ├── Player.ts            # Server-side player
│   │   └── Validation.ts        # Input validation
│   ├── systems/                 # Server systems
│   │   ├── Matchmaking.ts       # Player matching
│   │   ├── Authentication.ts    # Auth handling
│   │   ├── AntiCheat.ts         # Cheat detection
│   │   └── Analytics.ts         # Data collection
│   ├── database/                # Database layer
│   │   ├── Redis.ts             # Redis connection
│   │   ├── PostgreSQL.ts        # PostgreSQL connection
│   │   └── Models.ts            # Data models
│   └── utils/                   # Server utilities
│       ├── Logger.ts            # Logging system
│       ├── Config.ts            # Configuration
│       └── Helpers.ts           # Helper functions
├── package.json
├── tsconfig.json
├── Dockerfile
└── docker-compose.yml
```

---

## ⚙️ 3. GAME LOOP ARCHITECTURE

### Client-Side Game Loop (60 FPS)
```typescript
class GameLoop {
    private lastTime: number = 0;
    private accumulator: number = 0;
    private readonly FIXED_TIMESTEP = 1000 / 60; // 16.67ms

    update(currentTime: number): void {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        this.accumulator += deltaTime;

        // Fixed timestep for physics
        while (this.accumulator >= this.FIXED_TIMESTEP) {
            this.fixedUpdate(this.FIXED_TIMESTEP);
            this.accumulator -= this.FIXED_TIMESTEP;
        }

        // Variable timestep for rendering
        this.render(deltaTime);
    }

    private fixedUpdate(deltaTime: number): void {
        // Input processing
        InputManager.processInput();
        
        // Local prediction
        PlayerController.predictMovement(deltaTime);
        
        // Collision detection
        CollisionSystem.checkCollisions();
        
        // Network reconciliation
        NetworkSystem.reconcileServerState();
    }

    private render(deltaTime: number): void {
        // Interpolation for smooth visuals
        EntityRenderer.interpolatePositions(deltaTime);
        
        // UI updates
        UISystem.updateInterface();
        
        // Effect rendering
        ParticleSystem.render();
    }
}
```

### Server-Side Game Loop (60 Hz)
```typescript
class AuthoritativeGameLoop {
    private rooms: Map<string, GameRoom> = new Map();
    private readonly TICK_RATE = 1000 / 60; // 16.67ms

    start(): void {
        setInterval(() => {
            this.tick();
        }, this.TICK_RATE);
    }

    private tick(): void {
        for (const room of this.rooms.values()) {
            // Process player inputs
            room.processInputBuffer();
            
            // Update game state
            room.updatePhysics();
            room.checkCollisions();
            room.validateActions();
            
            // Handle game events
            room.processKeyCollections();
            room.processDoorInteractions();
            room.processBattleStates();
            
            // Broadcast state to clients
            room.broadcastGameState();
        }
    }
}
```

---

## 🌐 4. NETWORKING LOGIC

### Client-Server Communication Protocol

**Connection Flow:**
```typescript
// 1. Initial Connection
client.connect() → [Auth Token] → server.authenticate()

// 2. Matchmaking
client.emit('join_queue', { gameMode: 'standard' })
server.emit('match_found', { roomId, players: [...] })

// 3. Game State Sync
server.emit('game_state', {
    tick: number,
    players: PlayerState[],
    maze: MazeState,
    timestamp: number
})

// 4. Input Commands
client.emit('player_input', {
    tick: number,
    input: InputState,
    timestamp: number
})
```

### Message Types & Frequencies

**High Frequency (60Hz):**
- Player movement inputs
- Position updates
- Collision events

**Medium Frequency (30Hz):**
- UI state changes
- Door interactions
- Key collections

**Low Frequency (10Hz):**
- Player list updates
- Room state changes
- Chat messages

**Event-Based:**
- Battle initiation/resolution
- Player elimination
- Game end conditions

### Client-Side Prediction & Lag Compensation

```typescript
class NetworkSystem {
    private inputBuffer: InputCommand[] = [];
    private stateBuffer: GameState[] = [];
    
    // Client-side prediction
    predictMovement(input: InputState): void {
        // Store input for server reconciliation
        this.inputBuffer.push({
            tick: this.clientTick,
            input,
            timestamp: Date.now()
        });
        
        // Apply input immediately for responsiveness
        this.applyInput(input);
    }
    
    // Server reconciliation
    reconcileState(serverState: GameState): void {
        // Find corresponding client state
        const clientState = this.findStateByTick(serverState.tick);
        
        if (this.isDifferent(clientState, serverState)) {
            // Rollback and replay inputs
            this.rollbackToState(serverState);
            this.replayInputs(serverState.tick);
        }
    }
    
    // Lag compensation for battles
    compensateInput(input: RPSChoice, latency: number): void {
        // Adjust timing based on round-trip latency
        const adjustedTime = input.timestamp - latency / 2;
        this.validateBattleInput(input, adjustedTime);
    }
}
```

---

## 🔐 5. KEY/DOOR RANDOMIZATION ALGORITHMS

### Secure Key Distribution Algorithm
```typescript
class KeyDistributionSystem {
    private seed: string;
    private random: SeededRandom;
    
    constructor(roomId: string, timestamp: number) {
        // Generate deterministic but unpredictable seed
        this.seed = this.generateSeed(roomId, timestamp);
        this.random = new SeededRandom(this.seed);
    }
    
    generateKeyLayout(mazeLayout: MazeData): KeyLayout {
        const keyPositions: KeyPosition[] = [];
        const totalKeys = this.calculateKeyCount(mazeLayout);
        
        // Ensure balanced distribution
        const keyTypes = this.balanceKeyTypes(totalKeys);
        const positions = this.selectRandomPositions(mazeLayout, totalKeys);
        
        for (let i = 0; i < totalKeys; i++) {
            keyPositions.push({
                x: positions[i].x,
                y: positions[i].y,
                type: keyTypes[i],
                id: this.generateKeyId()
            });
        }
        
        return { keys: keyPositions, seed: this.seed };
    }
    
    private balanceKeyTypes(count: number): KeyType[] {
        const types: KeyType[] = [];
        const baseCount = Math.floor(count / 3);
        const remainder = count % 3;
        
        // Distribute evenly with random extras
        for (let i = 0; i < 3; i++) {
            const typeCount = baseCount + (i < remainder ? 1 : 0);
            for (let j = 0; j < typeCount; j++) {
                types.push(['rock', 'paper', 'scissors'][i] as KeyType);
            }
        }
        
        // Shuffle array
        return this.shuffleArray(types);
    }
}
```

### Dynamic Door Symbol System
```typescript
class DoorSystem {
    private doorStates: Map<string, DoorState> = new Map();
    
    initializeDoors(mazeLayout: MazeData): void {
        mazeLayout.doors.forEach(door => {
            const doorState: DoorState = {
                id: door.id,
                position: door.position,
                currentSymbol: this.generateRandomSymbol(),
                requiredKeys: this.getDoorRequirements(door.type),
                lastOpened: 0,
                openCount: 0
            };
            
            this.doorStates.set(door.id, doorState);
        });
    }
    
    processDoorOpening(doorId: string, playerKeys: KeyType[]): DoorResult {
        const door = this.doorStates.get(doorId);
        if (!door) return { success: false, reason: 'door_not_found' };
        
        // Validate key requirements
        if (!this.validateKeyRequirements(door, playerKeys)) {
            return { success: false, reason: 'insufficient_keys' };
        }
        
        // Open door and randomize symbol
        door.lastOpened = Date.now();
        door.openCount++;
        door.currentSymbol = this.generateRandomSymbol();
        
        return {
            success: true,
            newSymbol: door.currentSymbol,
            keysConsumed: this.getConsumedKeys(door, playerKeys)
        };
    }
    
    private generateRandomSymbol(): RPSSymbol {
        const symbols: RPSSymbol[] = ['rock', 'paper', 'scissors'];
        return symbols[Math.floor(Math.random() * symbols.length)];
    }
}
```

---

## 📡 6. PROXIMITY DETECTION SYSTEM

### Efficient Spatial Partitioning
```typescript
class ProximitySystem {
    private spatialGrid: SpatialGrid;
    private readonly BATTLE_RANGE = 2.0; // tiles
    private readonly GRID_SIZE = 4; // optimization
    
    constructor(mazeWidth: number, mazeHeight: number) {
        this.spatialGrid = new SpatialGrid(
            mazeWidth, 
            mazeHeight, 
            this.GRID_SIZE
        );
    }
    
    update(players: Player[]): ProximityEvent[] {
        const events: ProximityEvent[] = [];
        
        // Clear and repopulate spatial grid
        this.spatialGrid.clear();
        players.forEach(player => {
            this.spatialGrid.insert(player);
        });
        
        // Check for proximity between players
        for (const player of players) {
            const nearbyPlayers = this.spatialGrid.queryRadius(
                player.position, 
                this.BATTLE_RANGE
            );
            
            for (const other of nearbyPlayers) {
                if (player.id !== other.id) {
                    const distance = this.calculateDistance(
                        player.position, 
                        other.position
                    );
                    
                    if (distance <= this.BATTLE_RANGE) {
                        events.push(this.createProximityEvent(player, other));
                    }
                }
            }
        }
        
        return events;
    }
    
    private createProximityEvent(p1: Player, p2: Player): ProximityEvent {
        const eventId = this.generateEventId(p1.id, p2.id);
        
        return {
            id: eventId,
            players: [p1.id, p2.id],
            startTime: Date.now(),
            position: this.calculateMidpoint(p1.position, p2.position),
            status: 'initiated'
        };
    }
}
```

### Battle State Machine
```typescript
enum BattleState {
    NONE = 'none',
    PROXIMITY = 'proximity',
    COUNTDOWN = 'countdown',
    SELECTION = 'selection',
    RESOLUTION = 'resolution',
    COMPLETE = 'complete'
}

class BattleStateMachine {
    private state: BattleState = BattleState.NONE;
    private stateStartTime: number = 0;
    private participants: string[] = [];
    private selections: Map<string, RPSChoice> = new Map();
    
    update(deltaTime: number): BattleEvent | null {
        switch (this.state) {
            case BattleState.PROXIMITY:
                return this.updateProximity(deltaTime);
            case BattleState.COUNTDOWN:
                return this.updateCountdown(deltaTime);
            case BattleState.SELECTION:
                return this.updateSelection(deltaTime);
            case BattleState.RESOLUTION:
                return this.updateResolution(deltaTime);
        }
        return null;
    }
    
    private updateProximity(deltaTime: number): BattleEvent | null {
        const elapsed = Date.now() - this.stateStartTime;
        
        if (elapsed >= 3000) { // 3 second proximity requirement
            this.transitionTo(BattleState.COUNTDOWN);
            return { type: 'battle_starting', participants: this.participants };
        }
        
        return null;
    }
    
    private updateCountdown(deltaTime: number): BattleEvent | null {
        const elapsed = Date.now() - this.stateStartTime;
        const remaining = 3000 - elapsed; // 3 second countdown
        
        if (remaining <= 0) {
            this.transitionTo(BattleState.SELECTION);
            return { type: 'battle_active', participants: this.participants };
        }
        
        return { 
            type: 'countdown_update', 
            timeRemaining: remaining,
            participants: this.participants 
        };
    }
}
```

---

## 📊 7. DATA FORMATS

### Player State Structure
```typescript
interface PlayerState {
    id: string;
    username: string;
    position: Vector2;
    velocity: Vector2;
    keys: KeyInventory;
    health: number;
    status: PlayerStatus;
    lastInput: InputState;
    networkStats: NetworkStats;
}

interface KeyInventory {
    items: KeyItem[];
    maxSize: number;
    lastModified: number;
}

interface KeyItem {
    id: string;
    type: 'rock' | 'paper' | 'scissors';
    acquiredAt: number;
    hidden: boolean;
}
```

### Game State Schema
```typescript
interface GameState {
    roomId: string;
    tick: number;
    timestamp: number;
    phase: GamePhase;
    players: Map<string, PlayerState>;
    maze: MazeState;
    doors: Map<string, DoorState>;
    keys: Map<string, KeyState>;
    battles: Map<string, BattleState>;
    events: GameEvent[];
}

interface MazeState {
    layout: TileType[][];
    width: number;
    height: number;
    theme: string;
    checksum: string;
}

interface DoorState {
    id: string;
    position: Vector2;
    symbol: RPSSymbol;
    isOpen: boolean;
    requirements: KeyRequirement[];
    lastOpened: number;
}
```

### Network Message Formats
```typescript
// Client → Server Messages
interface PlayerInputMessage {
    type: 'player_input';
    tick: number;
    timestamp: number;
    input: {
        movement: Vector2;
        action: ActionType;
        target?: string;
    };
}

interface BattleChoiceMessage {
    type: 'battle_choice';
    battleId: string;
    choice: 'rock' | 'paper' | 'scissors';
    timestamp: number;
}

// Server → Client Messages
interface GameStateMessage {
    type: 'game_state';
    tick: number;
    timestamp: number;
    deltaState: Partial<GameState>; // Only changed data
    events: GameEvent[];
}

interface BattleResultMessage {
    type: 'battle_result';
    battleId: string;
    winner: string;
    loser: string;
    choices: Map<string, RPSChoice>;
    keyTransfers: KeyTransfer[];
}
```

---

## 🔧 8. SUGGESTED LIBRARIES

### Client-Side Dependencies
```json
{
  "dependencies": {
    "phaser": "^3.70.0",
    "socket.io-client": "^4.7.2",
    "@reduxjs/toolkit": "^1.9.5",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "howler": "^2.2.3",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^4.4.0",
    "@types/node": "^20.0.0",
    "eslint": "^8.45.0",
    "prettier": "^3.0.0",
    "jest": "^29.6.0",
    "playwright": "^1.36.0"
  }
}
```

### Server-Side Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "redis": "^4.6.7",
    "pg": "^8.11.1",
    "jsonwebtoken": "^9.0.1",
    "bcrypt": "^5.1.0",
    "winston": "^3.10.0",
    "helmet": "^7.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "nodemon": "^3.0.1",
    "@types/express": "^4.17.17",
    "@types/node": "^20.0.0",
    "jest": "^29.6.0",
    "supertest": "^6.3.3"
  }
}
```

### Specialized Libraries

**Networking:**
- `socket.io` - Real-time bidirectional communication
- `compression` - WebSocket message compression
- `rate-limiter-flexible` - DDoS protection

**Input Handling:**
- Native Phaser input system
- `keyboardjs` - Advanced key combinations
- `gamecontroller.js` - Gamepad support

**Asset Loading:**
- Native Phaser loader
- `workbox` - Progressive Web App caching
- `sharp` - Server-side image optimization

**Performance:**
- `stats.js` - FPS monitoring
- `web-vitals` - Performance metrics
- `lighthouse` - Automated auditing

---

## ✅ Phase 3 Summary

**Completed:**
- ✅ Technology stack selection (Phaser.js + Node.js)
- ✅ Comprehensive file structure for client/server
- ✅ Game loop architecture with client prediction
- ✅ Networking protocol with lag compensation
- ✅ Key/door randomization algorithms
- ✅ Proximity detection with spatial partitioning
- ✅ Complete data format specifications
- ✅ Library recommendations with versions

**Key Technical Features:**
- **Client-side prediction** for responsive gameplay
- **Authoritative server** for cheat prevention
- **Spatial partitioning** for efficient collision detection
- **Deterministic randomization** for fair gameplay
- **Battle state machine** for complex interactions
- **Delta compression** for bandwidth optimization

**Next Phase:** Prototype implementation with clean, commented PhaserJS code including all core systems and basic multiplayer functionality.