import { GamePhase, PlayerStatus, KeyType, DoorType, BattleState, MessageType } from './Constants.ts';

// Basic Data Types
export interface Vector2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

// Player Related Types
export interface PlayerData {
  id: string;
  username: string;
  color: number;
  position: Vector2;
  velocity: Vector2;
  keys: KeyInventory;
  status: PlayerStatus;
  spawnTime: number;
  lastBattleTime: number;
  stats: PlayerStats;
}

export interface KeyInventory {
  items: KeyItem[];
  maxSize: number;
  lastModified: number;
}

export interface KeyItem {
  id: string;
  type: KeyType;
  acquiredAt: number;
  position?: Vector2; // For world keys
}

export interface PlayerStats {
  keysCollected: number;
  doorsOpened: number;
  battlesWon: number;
  battlesLost: number;
  survivedTime: number;
  distanceTraveled: number;
}

// Game State Types
export interface GameState {
  roomId: string;
  tick: number;
  timestamp: number;
  phase: GamePhase;
  players: Map<string, PlayerData>;
  maze: MazeData;
  doors: Map<string, DoorData>;
  keys: Map<string, KeyItem>;
  battles: Map<string, BattleData>;
  events: GameEvent[];
  timeRemaining: number;
}

export interface MazeData {
  id: string;
  width: number;
  height: number;
  layout: TileType[][];
  spawnPoints: Vector2[];
  keySpawns: Vector2[];
  doorPositions: Vector2[];
  exitPosition: Vector2;
  theme: string;
}

export enum TileType {
  EMPTY = 0,
  WALL = 1,
  FLOOR = 2,
  SPAWN = 3,
  KEY_SPAWN = 4,
  DOOR = 5,
  EXIT = 6
}

export interface DoorData {
  id: string;
  position: Vector2;
  type: DoorType;
  symbol: KeyType;
  isOpen: boolean;
  requirements: KeyType[];
  lastOpened: number;
  openCount: number;
}

// Battle System Types
export interface BattleData {
  id: string;
  participants: string[];
  state: BattleState;
  startTime: number;
  position: Vector2;
  choices: Map<string, KeyType>;
  winner?: string;
  loser?: string;
  keyTransfers: KeyTransfer[];
}

export interface KeyTransfer {
  fromPlayer: string;
  toPlayer: string;
  keyId: string;
  keyType: KeyType;
}

export interface BattleResult {
  battleId: string;
  winner: string;
  loser: string;
  choices: Record<string, KeyType>;
  keyTransfers: KeyTransfer[];
  eliminatedPlayer?: string;
}

// Input System Types
export interface InputState {
  movement: Vector2;
  actions: Set<string>;
  timestamp: number;
}

export interface InputCommand {
  tick: number;
  playerId: string;
  input: InputState;
  timestamp: number;
}

// Network Types
export interface NetworkMessage {
  type: MessageType;
  timestamp: number;
  data?: any;
}

export interface GameStateMessage extends NetworkMessage {
  type: MessageType.GAME_STATE;
  data: {
    tick: number;
    deltaState: Partial<GameState>;
    events: GameEvent[];
  };
}

export interface PlayerInputMessage extends NetworkMessage {
  type: MessageType.PLAYER_INPUT;
  data: {
    tick: number;
    input: InputState;
  };
}

export interface BattleChoiceMessage extends NetworkMessage {
  type: MessageType.BATTLE_CHOICE;
  data: {
    battleId: string;
    choice: KeyType;
  };
}

export interface MatchFoundMessage extends NetworkMessage {
  type: MessageType.MATCH_FOUND;
  data: {
    roomId: string;
    players: PlayerData[];
    maze: MazeData;
  };
}

export interface ErrorMessage extends NetworkMessage {
  type: MessageType.ERROR;
  data: {
    code: string;
    message: string;
    details?: any;
  };
}

// Event System Types
export enum GameEventType {
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  PLAYER_MOVED = 'player_moved',
  KEY_COLLECTED = 'key_collected',
  DOOR_OPENED = 'door_opened',
  DOOR_FAILED = 'door_failed',
  BATTLE_STARTED = 'battle_started',
  BATTLE_CHOICE_MADE = 'battle_choice_made',
  BATTLE_RESOLVED = 'battle_resolved',
  PLAYER_ELIMINATED = 'player_eliminated',
  GAME_WON = 'game_won',
  GAME_ENDED = 'game_ended'
}

export interface GameEvent {
  id: string;
  type: GameEventType;
  timestamp: number;
  data: any;
  playerId?: string;
}

// UI Types
export interface MenuState {
  currentMenu: 'main' | 'join' | 'create' | 'settings' | 'tutorial';
  isLoading: boolean;
  error?: string;
}

export interface GameUIState {
  showInventory: boolean;
  showMinimap: boolean;
  showSettings: boolean;
  battleOverlay?: BattleUIData;
  notifications: Notification[];
}

export interface BattleUIData {
  battleId: string;
  opponent: string;
  state: BattleState;
  timeRemaining: number;
  selectedChoice?: KeyType;
  opponentChoice?: KeyType;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  duration: number;
  timestamp: number;
}

// Asset Types
export interface AssetManifest {
  images: AssetEntry[];
  audio: AssetEntry[];
  data: AssetEntry[];
}

export interface AssetEntry {
  key: string;
  url: string;
  type: 'image' | 'audio' | 'json' | 'text';
  preload: boolean;
}

// Animation Types
export interface AnimationConfig {
  key: string;
  frames: AnimationFrame[];
  frameRate: number;
  repeat: number;
  yoyo?: boolean;
}

export interface AnimationFrame {
  texture: string;
  frame: string | number;
  duration?: number;
}

// Particle System Types
export interface ParticleConfig {
  texture: string;
  emitZone?: {
    type: 'edge' | 'random';
    source: Rect | Vector2;
  };
  scale: {
    start: number;
    end: number;
  };
  speed: {
    min: number;
    max: number;
  };
  lifespan: number;
  quantity: number;
  alpha: {
    start: number;
    end: number;
  };
  tint?: number[];
}

// Audio Types
export interface AudioConfig {
  key: string;
  volume: number;
  loop: boolean;
  fadeIn?: number;
  fadeOut?: number;
}

export interface SpatialAudioConfig extends AudioConfig {
  position: Vector2;
  maxDistance: number;
  rolloffFactor: number;
}

// Performance Monitoring Types
export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  textureMemory: number;
  networkLatency: number;
  packetLoss: number;
  lastUpdated: number;
}

export interface DebugInfo {
  performance: PerformanceMetrics;
  gameState: {
    playerCount: number;
    activeKeys: number;
    activeBattles: number;
    currentTick: number;
  };
  network: {
    connected: boolean;
    ping: number;
    packetsIn: number;
    packetsOut: number;
  };
}

// Collision Detection Types
export interface CollisionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'player' | 'wall' | 'door' | 'key' | 'trigger';
  entity?: any;
}

export interface CollisionResult {
  collided: boolean;
  overlap: Vector2;
  normal: Vector2;
  entities: any[];
}

// Spatial Partitioning Types
export interface SpatialGrid {
  cellSize: number;
  width: number;
  height: number;
  cells: Map<string, Set<any>>;
}

export interface QueryResult {
  entities: any[];
  cellsChecked: number;
}

// Save/Load Types
export interface SaveData {
  version: string;
  timestamp: number;
  settings: GameSettings;
  playerData: {
    username: string;
    gamesPlayed: number;
    gamesWon: number;
    totalPlayTime: number;
    achievements: string[];
  };
}

export interface GameSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  fullscreen: boolean;
  vsync: boolean;
  showFPS: boolean;
  keybindings: Record<string, string>;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type EventHandler<T = any> = (data: T) => void;

export type AsyncEventHandler<T = any> = (data: T) => Promise<void>;

export interface EventSubscription {
  unsubscribe(): void;
}

// Type Guards
export function isPlayerData(obj: any): obj is PlayerData {
  return obj && typeof obj.id === 'string' && typeof obj.username === 'string';
}

export function isGameEvent(obj: any): obj is GameEvent {
  return obj && typeof obj.id === 'string' && typeof obj.type === 'string';
}

export function isNetworkMessage(obj: any): obj is NetworkMessage {
  return obj && typeof obj.type === 'string' && typeof obj.timestamp === 'number';
}

export function isBattleData(obj: any): obj is BattleData {
  return obj && typeof obj.id === 'string' && Array.isArray(obj.participants);
}