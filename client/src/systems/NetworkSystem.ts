import { io, Socket } from 'socket.io-client';
import { 
  NETWORK_CONFIG, 
  MessageType, 
  GAMEPLAY_CONFIG,
  DEBUG_CONFIG 
} from '../utils/Constants.ts';
import { 
  NetworkMessage, 
  GameStateMessage, 
  PlayerInputMessage,
  BattleChoiceMessage,
  ErrorMessage,
  InputState,
  GameState,
  PlayerData,
  Vector2
} from '../utils/Types.ts';
import { v4 as uuidv4 } from 'uuid';

export class NetworkSystem extends Phaser.Events.EventEmitter {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private lastPingTime: number = 0;
  private ping: number = 0;
  
  // Client-side prediction
  private clientTick: number = 0;
  private serverTick: number = 0;
  private inputBuffer: PlayerInputMessage[] = [];
  private stateBuffer: GameState[] = [];
  private reconciliationThreshold: number = 0.1; // seconds
  
  // Connection state
  private playerId: string = '';
  private roomId: string = '';
  private playerName: string = '';

  constructor() {
    super();
    this.setupEventHandlers();
  }

  // Connection Management
  public async connect(playerName: string = 'Player'): Promise<boolean> {
    try {
      console.log('🔌 Connecting to server...');
      
      this.playerName = playerName;
      this.playerId = uuidv4();
      
      if (DEBUG_CONFIG.MOCK_MULTIPLAYER) {
        return this.setupMockConnection();
      }
      
      this.socket = io(NETWORK_CONFIG.SERVER_URL, {
        timeout: NETWORK_CONFIG.TIMEOUT,
        reconnectionAttempts: NETWORK_CONFIG.RECONNECT_ATTEMPTS,
        reconnectionDelay: NETWORK_CONFIG.RECONNECT_DELAY,
        transports: ['websocket']
      });
      
      this.setupSocketEvents();
      
      return new Promise((resolve) => {
        this.socket!.on('connect', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log('✅ Connected to server');
          
          // Send authentication
          this.send({
            type: MessageType.CONNECT,
            timestamp: Date.now(),
            data: {
              playerId: this.playerId,
              playerName: this.playerName
            }
          });
          
          resolve(true);
        });
        
        this.socket!.on('connect_error', (error) => {
          console.error('❌ Connection error:', error);
          resolve(false);
        });
      });
      
    } catch (error) {
      console.error('❌ Failed to connect:', error);
      return false;
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.emit('disconnected');
    console.log('🔌 Disconnected from server');
  }

  // Game Actions
  public async joinQueue(): Promise<boolean> {
    if (!this.isConnected) {
      console.warn('⚠️ Cannot join queue - not connected');
      return false;
    }

    this.send({
      type: MessageType.JOIN_QUEUE,
      timestamp: Date.now(),
      data: {
        gameMode: 'standard'
      }
    });

    return true;
  }

  public async leaveQueue(): Promise<void> {
    if (!this.isConnected) return;

    this.send({
      type: MessageType.LEAVE_QUEUE,
      timestamp: Date.now()
    });
  }

  public async joinRoom(roomId: string): Promise<boolean> {
    if (!this.isConnected) return false;

    this.roomId = roomId;
    this.send({
      type: MessageType.JOIN_ROOM,
      timestamp: Date.now(),
      data: { roomId }
    });

    return true;
  }

  // Input Handling with Client-Side Prediction
  public sendPlayerInput(input: InputState): void {
    if (!this.isConnected || !this.roomId) return;

    this.clientTick++;
    
    const inputMessage: PlayerInputMessage = {
      type: MessageType.PLAYER_INPUT,
      timestamp: Date.now(),
      data: {
        tick: this.clientTick,
        input: {
          ...input,
          timestamp: Date.now()
        }
      }
    };

    // Store input for reconciliation
    this.inputBuffer.push(inputMessage);
    
    // Trim buffer to prevent memory leaks
    if (this.inputBuffer.length > NETWORK_CONFIG.MAX_PREDICTION_FRAMES) {
      this.inputBuffer.shift();
    }

    this.send(inputMessage);

    if (DEBUG_CONFIG.LOG_NETWORK_MESSAGES) {
      console.log('📤 Sent input:', inputMessage);
    }
  }

  public sendBattleChoice(battleId: string, choice: 'rock' | 'paper' | 'scissors'): void {
    if (!this.isConnected) return;

    this.send({
      type: MessageType.BATTLE_CHOICE,
      timestamp: Date.now(),
      data: {
        battleId,
        choice
      }
    });
  }

  // State Reconciliation
  public reconcileGameState(serverState: Partial<GameState>): void {
    if (!serverState.tick) return;

    this.serverTick = serverState.tick;
    
    // Find corresponding client state
    const correspondingInput = this.inputBuffer.find(
      input => input.data.tick === serverState.tick
    );

    if (correspondingInput) {
      // Check if we need to reconcile
      if (this.needsReconciliation(serverState)) {
        this.performReconciliation(serverState);
      }
    }

    // Store server state for interpolation
    this.stateBuffer.push(serverState as GameState);
    
    // Trim state buffer
    if (this.stateBuffer.length > 10) {
      this.stateBuffer.shift();
    }
  }

  private needsReconciliation(serverState: Partial<GameState>): boolean {
    // Simple position-based reconciliation check
    const serverPlayer = serverState.players?.get(this.playerId);
    if (!serverPlayer) return false;

    // Get local player state from last prediction
    const localState = this.getLocalPlayerState();
    if (!localState) return false;

    // Check position difference
    const distance = this.calculateDistance(
      serverPlayer.position,
      localState.position
    );

    return distance > this.reconciliationThreshold;
  }

  private performReconciliation(serverState: Partial<GameState>): void {
    console.log('🔄 Performing state reconciliation');
    
    // Rollback to server state
    this.emit('reconcile', serverState);
    
    // Replay inputs from reconciliation point
    const reconciliationTick = serverState.tick!;
    const inputsToReplay = this.inputBuffer.filter(
      input => input.data.tick > reconciliationTick
    );

    // Re-apply local inputs
    inputsToReplay.forEach(input => {
      this.emit('replayInput', input.data.input);
    });
  }

  private getLocalPlayerState(): PlayerData | null {
    // This would typically come from the local game state
    // For now, return null as this is handled by the game scene
    return null;
  }

  private calculateDistance(pos1: Vector2, pos2: Vector2): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Network Communication
  private send(message: NetworkMessage): void {
    if (!this.socket || !this.isConnected) {
      console.warn('⚠️ Cannot send message - not connected');
      return;
    }

    this.socket.emit(message.type, message);

    if (DEBUG_CONFIG.LOG_NETWORK_MESSAGES) {
      console.log('📤 Sent:', message.type, message);
    }
  }

  // Socket Event Handlers
  private setupSocketEvents(): void {
    if (!this.socket) return;

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.emit('disconnected');
      console.log('🔌 Disconnected from server');
    });

    this.socket.on('reconnect', () => {
      this.isConnected = true;
      this.emit('reconnected');
      console.log('🔌 Reconnected to server');
    });

    this.socket.on('reconnect_attempt', (attempt: number) => {
      console.log(`🔄 Reconnection attempt ${attempt}/${NETWORK_CONFIG.RECONNECT_ATTEMPTS}`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect to server');
      this.emit('connectionFailed');
    });

    // Game message handlers
    this.socket.on(MessageType.MATCH_FOUND, (data: any) => {
      console.log('🎮 Match found:', data);
      this.roomId = data.roomId;
      this.emit('matchFound', data);
    });

    this.socket.on(MessageType.GAME_STATE, (data: any) => {
      this.handleGameStateUpdate(data);
    });

    this.socket.on(MessageType.BATTLE_STARTED, (data: any) => {
      this.emit('battleStarted', data);
    });

    this.socket.on(MessageType.BATTLE_RESULT, (data: any) => {
      this.emit('battleResult', data);
    });

    this.socket.on(MessageType.PLAYER_ELIMINATED, (data: any) => {
      this.emit('playerEliminated', data);
    });

    this.socket.on(MessageType.GAME_ENDED, (data: any) => {
      this.emit('gameEnded', data);
    });

    this.socket.on(MessageType.ERROR, (data: any) => {
      this.handleError(data);
    });

    // Ping handling
    this.socket.on(MessageType.PONG, () => {
      this.ping = Date.now() - this.lastPingTime;
      this.emit('pingUpdate', this.ping);
    });
  }

  private handleGameStateUpdate(data: any): void {
    if (DEBUG_CONFIG.LOG_NETWORK_MESSAGES) {
      console.log('📥 Game state update:', data);
    }

    // Perform reconciliation if needed
    if (data.deltaState) {
      this.reconcileGameState(data.deltaState);
    }

    this.emit('gameStateUpdate', data);
  }

  private handleError(errorData: any): void {
    console.error('🚨 Server error:', errorData);
    this.emit('error', errorData);
  }

  // Mock Connection for Development
  private setupMockConnection(): boolean {
    console.log('🤖 Setting up mock connection for development');
    
    this.isConnected = true;
    this.playerId = 'mock-player-' + Date.now();
    
    // Simulate connection success
    setTimeout(() => {
      this.emit('connected');
    }, 100);

    // Mock match found after 2 seconds
    setTimeout(() => {
      this.emit('matchFound', {
        roomId: 'mock-room-123',
        players: [
          {
            id: this.playerId,
            username: this.playerName,
            color: 0x00f5ff,
            position: { x: 64, y: 64 },
            velocity: { x: 0, y: 0 },
            keys: { items: [], maxSize: 3, lastModified: 0 },
            status: 'alive',
            spawnTime: Date.now(),
            lastBattleTime: 0,
            stats: {
              keysCollected: 0,
              doorsOpened: 0,
              battlesWon: 0,
              battlesLost: 0,
              survivedTime: 0,
              distanceTraveled: 0
            }
          }
        ],
        maze: {
          id: 'mock-maze',
          width: 20,
          height: 15,
          layout: [],
          spawnPoints: [{ x: 2, y: 2 }],
          keySpawns: [{ x: 5, y: 5 }],
          doorPositions: [{ x: 8, y: 8 }],
          exitPosition: { x: 18, y: 13 },
          theme: 'cyber'
        }
      });
    }, 2000);

    return true;
  }

  // Network Quality Monitoring
  public startPingMonitoring(): void {
    if (!this.isConnected) return;

    const pingInterval = setInterval(() => {
      if (!this.isConnected) {
        clearInterval(pingInterval);
        return;
      }

      this.lastPingTime = Date.now();
      this.send({
        type: MessageType.PING,
        timestamp: this.lastPingTime
      });
    }, NETWORK_CONFIG.PING_INTERVAL);
  }

  // Event Handlers Setup
  private setupEventHandlers(): void {
    this.on('error', (error) => {
      console.error('NetworkSystem error:', error);
    });
  }

  // Getters
  public getPlayerId(): string {
    return this.playerId;
  }

  public getRoomId(): string {
    return this.roomId;
  }

  public isSocketConnected(): boolean {
    return this.isConnected;
  }

  public getPing(): number {
    return this.ping;
  }

  public getClientTick(): number {
    return this.clientTick;
  }

  public getServerTick(): number {
    return this.serverTick;
  }

  // Cleanup
  public destroy(): void {
    this.disconnect();
    this.removeAllListeners();
    this.inputBuffer = [];
    this.stateBuffer = [];
  }
}