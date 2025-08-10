// Game Configuration Constants
export const GAME_CONFIG = {
  WIDTH: 1024,
  HEIGHT: 688,       // Game area height (768 - 80 for status/debug bars)
  TILE_SIZE: 32,
  FPS: 60,
  PHYSICS_FPS: 60,
  BACKGROUND_COLOR: 0x1a1a2e,
  DEBUG: false,
  
  // Maze configuration
  MAZE_WIDTH: 32,    // 32 tiles * 32px = 1024px (full width)
  MAZE_HEIGHT: 21,   // 21 tiles * 32px = 672px (fits well in 688px game area)
  STATUS_BAR_HEIGHT: 50,  // Top status bar
  DEBUG_BAR_HEIGHT: 30    // Bottom debug bar (reduced)
} as const;

// Networking Constants
export const NETWORK_CONFIG = {
  SERVER_URL: 'ws://localhost:3001',
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000,
  PING_INTERVAL: 5000,
  TIMEOUT: 10000,
  MAX_PREDICTION_FRAMES: 60
} as const;

// Gameplay Constants
export const GAMEPLAY_CONFIG = {
  MAX_PLAYERS: 6,
  MIN_PLAYERS: 2,
  MAX_KEYS_PER_PLAYER: 3,
  BATTLE_PROXIMITY_RANGE: 2.0, // tiles
  BATTLE_PROXIMITY_TIME: 3000, // ms
  BATTLE_COUNTDOWN_TIME: 3000, // ms
  BATTLE_SELECTION_TIME: 5000, // ms
  BATTLE_COOLDOWN_TIME: 10000, // ms
  MOVEMENT_SPEED: 128, // pixels per second
  SPAWN_PROTECTION_TIME: 5000, // ms
  MATCH_DURATION: 300000 // 5 minutes in ms
} as const;

// Visual Constants
export const VISUAL_CONFIG = {
  PLAYER_SIZE: 28,
  KEY_SIZE: 24,
  DOOR_SIZE: 32,
  PARTICLE_COUNT: 20,
  GLOW_INTENSITY: 0.3,
  ANIMATION_SPEED: 8,
  UI_FADE_TIME: 300,
  CAMERA_FOLLOW_SPEED: 0.1,
  ZOOM_LEVEL: 1.0
} as const;

// Audio Constants
export const AUDIO_CONFIG = {
  MASTER_VOLUME: 0.7,
  SFX_VOLUME: 0.8,
  MUSIC_VOLUME: 0.5,
  FADE_TIME: 1000
} as const;

// Color Palette
export const COLORS = {
  PRIMARY: 0x1a1a2e,
  SECONDARY: 0x16213e,
  ACCENT_CYAN: 0x00f5ff,
  ACCENT_ORANGE: 0xff6b35,
  ACCENT_PINK: 0xff006e,
  WHITE: 0xf0f0f0,
  GRAY: 0x333333,
  BLACK: 0x000000,
  
  // Player Colors
  PLAYER_COLORS: [
    0x00f5ff, // Cyan
    0xff6b35, // Orange
    0xff006e, // Pink
    0x00ff87, // Green
    0xffaa00, // Yellow
    0x8000ff  // Purple
  ],
  
  // RPS Symbol Colors
  ROCK_COLOR: 0x8b4513,
  PAPER_COLOR: 0xffffff,
  SCISSORS_COLOR: 0xc0c0c0
} as const;

// Game Enums
export enum GamePhase {
  WAITING = 'waiting',
  STARTING = 'starting',
  PLAYING = 'playing',
  ENDING = 'ending',
  FINISHED = 'finished'
}

export enum PlayerStatus {
  ALIVE = 'alive',
  ELIMINATED = 'eliminated',
  DISCONNECTED = 'disconnected',
  SPECTATING = 'spectating'
}

export enum KeyType {
  ROCK = 'rock',
  PAPER = 'paper',
  SCISSORS = 'scissors'
}

export enum DoorType {
  SINGLE = 'single',
  DOUBLE = 'double',
  TRIPLE = 'triple'
}

export enum BattleState {
  NONE = 'none',
  PROXIMITY = 'proximity',
  COUNTDOWN = 'countdown',
  SELECTION = 'selection',
  RESOLUTION = 'resolution',
  COMPLETE = 'complete'
}

export enum InputAction {
  MOVE_UP = 'move_up',
  MOVE_DOWN = 'move_down',
  MOVE_LEFT = 'move_left',
  MOVE_RIGHT = 'move_right',
  INTERACT = 'interact',
  BATTLE_ROCK = 'battle_rock',
  BATTLE_PAPER = 'battle_paper',
  BATTLE_SCISSORS = 'battle_scissors'
}

export enum SoundEffect {
  STEP = 'step',
  KEY_COLLECT = 'key_collect',
  DOOR_OPEN = 'door_open',
  DOOR_LOCKED = 'door_locked',
  BATTLE_START = 'battle_start',
  BATTLE_COUNTDOWN = 'battle_countdown',
  BATTLE_SELECT = 'battle_select',
  BATTLE_WIN = 'battle_win',
  BATTLE_LOSE = 'battle_lose',
  PLAYER_ELIMINATE = 'player_eliminate',
  GAME_WIN = 'game_win',
  UI_CLICK = 'ui_click',
  UI_HOVER = 'ui_hover'
}

export enum ParticleType {
  KEY_SPARKLE = 'key_sparkle',
  DOOR_BURST = 'door_burst',
  BATTLE_CLASH = 'battle_clash',
  ELIMINATION = 'elimination',
  VICTORY = 'victory'
}

// Scene Keys
export const SCENE_KEYS = {
  BOOT: 'BootScene',
  MENU: 'MenuScene',
  GAME: 'GameScene',
  BATTLE: 'BattleScene',
  UI: 'UIScene'
} as const;

// Asset Keys
export const ASSET_KEYS = {
  // Images
  PLAYER: 'player',
  MAZE_TILES: 'maze_tiles',
  KEYS: 'keys',
  DOORS: 'doors',
  UI_ELEMENTS: 'ui_elements',
  PARTICLES: 'particles',
  
  // Audio
  BGM_MENU: 'bgm_menu',
  BGM_GAME: 'bgm_game',
  BGM_BATTLE: 'bgm_battle',
  
  // Data
  MAZE_LAYOUTS: 'maze_layouts',
  AUDIO_CONFIG: 'audio_config'
} as const;

// RPS Game Logic
export const RPS_RULES = {
  [KeyType.ROCK]: KeyType.SCISSORS,
  [KeyType.PAPER]: KeyType.ROCK,
  [KeyType.SCISSORS]: KeyType.PAPER
} as const;

// Network Message Types
export enum MessageType {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  PING = 'ping',
  PONG = 'pong',
  
  // Matchmaking
  JOIN_QUEUE = 'join_queue',
  LEAVE_QUEUE = 'leave_queue',
  MATCH_FOUND = 'match_found',
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  
  // Game State
  GAME_STATE = 'game_state',
  PLAYER_INPUT = 'player_input',
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  
  // Game Events
  KEY_COLLECTED = 'key_collected',
  DOOR_OPENED = 'door_opened',
  BATTLE_STARTED = 'battle_started',
  BATTLE_CHOICE = 'battle_choice',
  BATTLE_RESULT = 'battle_result',
  PLAYER_ELIMINATED = 'player_eliminated',
  GAME_ENDED = 'game_ended',
  
  // Errors
  ERROR = 'error',
  VALIDATION_ERROR = 'validation_error'
}

// Error Codes
export enum ErrorCode {
  INVALID_INPUT = 'invalid_input',
  PLAYER_NOT_FOUND = 'player_not_found',
  ROOM_FULL = 'room_full',
  ROOM_NOT_FOUND = 'room_not_found',
  GAME_ALREADY_STARTED = 'game_already_started',
  INSUFFICIENT_KEYS = 'insufficient_keys',
  BATTLE_NOT_ACTIVE = 'battle_not_active',
  COOLDOWN_ACTIVE = 'cooldown_active',
  NETWORK_ERROR = 'network_error',
  SERVER_ERROR = 'server_error'
}

// Debug Configuration - ENABLED FOR PROTOTYPE TESTING
export const DEBUG_CONFIG = {
  SHOW_FPS: true,
  SHOW_COLLISION_BOXES: false,
  SHOW_GRID: false,
  SHOW_PROXIMITY_RADIUS: false,
  LOG_NETWORK_MESSAGES: true,
  LOG_GAME_EVENTS: true,
  MOCK_MULTIPLAYER: true // ENABLED for standalone testing
} as const;