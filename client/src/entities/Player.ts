import Phaser from 'phaser';
import { 
  GAMEPLAY_CONFIG, 
  VISUAL_CONFIG, 
  COLORS, 
  GAME_CONFIG,
  KeyType,
  PlayerStatus 
} from '../utils/Constants.ts';
import { 
  PlayerData, 
  Vector2, 
  KeyInventory, 
  InputState 
} from '../utils/Types.ts';
import { PowerUpType, PowerUpConfig, POWER_UP_CONFIGS } from './PowerUp.ts';

export class Player extends Phaser.Physics.Arcade.Sprite {
  // Player data
  public readonly playerId: string;
  public playerName: string;
  public playerData: PlayerData;
  
  // Visual elements
  private nameText: Phaser.GameObjects.Text;
  private keyIndicators: Phaser.GameObjects.Container;
  private statusIndicator: Phaser.GameObjects.Graphics;
  private proximityIndicator: Phaser.GameObjects.Graphics;
  
  // Movement and animation
  private movementSpeed: number = GAMEPLAY_CONFIG.MOVEMENT_SPEED;
  private isMoving: boolean = false;
  private facing: 'up' | 'down' | 'left' | 'right' = 'down';
  
  // Network synchronization
  private serverPosition: Vector2 = { x: 0, y: 0 };
  private interpolationTarget: Vector2 = { x: 0, y: 0 };
  private interpolationSpeed: number = 0.15;
  
  // Prediction and reconciliation
  private predictedPosition: Vector2 = { x: 0, y: 0 };
  private isLocalPlayer: boolean = false;
  private lastInputTime: number = 0;
  
  // Special states
  private isInBattle: boolean = false;
  private battleCooldownUntil: number = 0;
  private spawnProtectionUntil: number = 0;
  
  // Power-up system
  private activePowerUps: Map<PowerUpType, { config: PowerUpConfig; expiresAt: number; effect: any }> = new Map();
  private powerUpIndicators: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number, playerData: PlayerData, isLocal: boolean = false) {
    super(scene, x, y, 'player');
    
    this.playerId = playerData.id;
    this.playerName = playerData.username;
    this.playerData = playerData;
    this.isLocalPlayer = isLocal;
    
    // Add to scene first
    scene.add.existing(this);
    scene.physics.add.existing(this);
    // Ensure player renders above tilemap and doors
    this.setDepth(20);
    
    // Setup visuals
    this.setupVisuals();
    this.bringUIToFront();
    
    // Setup physics after sprite is added to scene
    this.setupPhysics();
    
    // Setup animations
    this.setupAnimations();
    
    // Initial update
    this.updateFromData(playerData);
    
    console.log(`👤 Created player: ${this.playerName} (${this.playerId}) ${isLocal ? '[LOCAL]' : ''}`);
  }

  private setupPhysics(): void {
    // Set physics body size
    this.setSize(VISUAL_CONFIG.PLAYER_SIZE, VISUAL_CONFIG.PLAYER_SIZE);
    this.setDisplaySize(VISUAL_CONFIG.PLAYER_SIZE, VISUAL_CONFIG.PLAYER_SIZE);
    
    // Physics properties
    if (this.body) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setCollideWorldBounds(true);
      body.setDrag(400); // Smooth stopping
      body.setMaxVelocity(this.movementSpeed, this.movementSpeed);
    }
  }

  private setupVisuals(): void {
    // Player color based on player data
    this.setTint(this.playerData.color);
    
    // Name text above player
    this.nameText = this.scene.add.text(this.x, this.y - 25, this.playerName, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    
    // Key inventory indicators
    this.keyIndicators = this.scene.add.container(this.x, this.y + 25);
    this.updateKeyIndicators();
    
    // Status indicator (health, protection, etc.)
    this.statusIndicator = this.scene.add.graphics();
    this.updateStatusIndicator();
    
    // Proximity indicator for battles
    this.proximityIndicator = this.scene.add.graphics();
    this.proximityIndicator.setVisible(false);
    
    // Power-up indicators
    this.powerUpIndicators = this.scene.add.container(this.x, this.y - 40);
    this.updatePowerUpIndicators();
  }

  private setupAnimations(): void {
    // Set initial animation
    this.play('player_idle');
  }

  // Movement and Input
  public handleInput(input: InputState): void {
    if (!this.isLocalPlayer) return;
    
    const currentTime = Date.now();
    this.lastInputTime = currentTime;
    
    // Apply movement immediately for local player (client-side prediction)
    this.applyMovement(input.movement, this.scene.game.loop.delta / 1000);
    
    // Store predicted position
    this.predictedPosition = { x: this.x, y: this.y };
  }

  private applyMovement(movement: Vector2, deltaTime: number): void {
    if (!this.body) return;
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // Calculate velocity
    const velocity = {
      x: movement.x * this.movementSpeed,
      y: movement.y * this.movementSpeed
    };
    
    // Apply velocity
    body.setVelocity(velocity.x, velocity.y);
    
    // Update movement state
    this.isMoving = velocity.x !== 0 || velocity.y !== 0;
    
    // Update facing direction
    if (Math.abs(velocity.x) > Math.abs(velocity.y)) {
      this.facing = velocity.x > 0 ? 'right' : 'left';
    } else if (velocity.y !== 0) {
      this.facing = velocity.y > 0 ? 'down' : 'up';
    }
    
    // Update animation
    if (this.isMoving) {
      this.play('player_walk', true);
    } else {
      this.play('player_idle', true);
    }
    
    // Flip sprite based on direction
    this.setFlipX(this.facing === 'left');
  }

  // Network Synchronization
  public updateFromServer(serverData: PlayerData): void {
    if (this.isLocalPlayer) {
      // For local player, only update non-position data to avoid conflicts
      this.updateNonPositionData(serverData);
      
      // Check for reconciliation need
      const distance = this.calculateDistance(
        { x: this.x, y: this.y },
        serverData.position
      );
      
      // If position difference is significant, reconcile
      if (distance > 16) { // Threshold in pixels
        console.log('🔄 Reconciling local player position');
        this.reconcilePosition(serverData.position);
      }
    } else {
      // For remote players, update everything including position
      this.updateFromData(serverData);
      this.setupInterpolation(serverData.position);
    }
  }

  private updateFromData(data: PlayerData): void {
    this.playerData = { ...this.playerData, ...data };
    
    // Update visual state
    this.updateKeyIndicators();
    this.updateStatusIndicator();
    
    // Update position for non-local players
    if (!this.isLocalPlayer) {
      this.setPosition(data.position.x, data.position.y);
    }
  }

  private updateNonPositionData(data: PlayerData): void {
    // Update inventory
    if (data.keys) {
      this.playerData.keys = data.keys;
      this.updateKeyIndicators();
    }
    
    // Update status
    if (data.status) {
      this.playerData.status = data.status;
      this.updateStatusIndicator();
    }
    
    // Update stats
    if (data.stats) {
      this.playerData.stats = data.stats;
    }
  }

  private setupInterpolation(targetPosition: Vector2): void {
    this.interpolationTarget = { ...targetPosition };
    
    // Start interpolation if not already close
    const distance = this.calculateDistance(
      { x: this.x, y: this.y },
      targetPosition
    );
    
    if (distance > 2) {
      this.scene.tweens.killTweensOf(this);
      this.scene.tweens.add({
        targets: this,
        x: targetPosition.x,
        y: targetPosition.y,
        duration: 100, // Quick interpolation
        ease: 'Linear'
      });
    }
  }

  private reconcilePosition(serverPosition: Vector2): void {
    // Smoothly move to server position
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      x: serverPosition.x,
      y: serverPosition.y,
      duration: 200,
      ease: 'Quad.easeOut'
    });
  }

  // Visual Updates
  private updateKeyIndicators(): void {
    this.keyIndicators.removeAll(true);
    
    const keys = this.playerData.keys.items;
    const startX = -(keys.length * 16) / 2; // Increased spacing for emojis
    
    keys.forEach((key, index) => {
      // Add emoji text for each key type
      const emoji = this.getKeyEmoji(key.type);
      const keyIcon = this.scene.add.text(
        startX + index * 16, 
        0,
        emoji,
        {
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif'
        }
      ).setOrigin(0.5);

      // Add glow effect based on key type
      const glow = this.scene.add.circle(
        startX + index * 16,
        0,
        8,
        this.getKeyColor(key.type),
        0.3
      );

      this.keyIndicators.add([glow, keyIcon]);
    });
    
    // Update container position
    this.keyIndicators.setPosition(this.x, this.y + 25);
  }

  private getKeyEmoji(keyType: KeyType): string {
    switch (keyType) {
      case KeyType.ROCK: return '🪨';
      case KeyType.PAPER: return '📄';
      case KeyType.SCISSORS: return '✂️';
      default: return '❓';
    }
  }

  private getKeyColor(keyType: KeyType): number {
    switch (keyType) {
      case KeyType.ROCK: return COLORS.ROCK_COLOR;
      case KeyType.PAPER: return COLORS.PAPER_COLOR;
      case KeyType.SCISSORS: return COLORS.SCISSORS_COLOR;
      default: return COLORS.WHITE;
    }
  }

  private updateStatusIndicator(): void {
    this.statusIndicator.clear();
    
    const currentTime = Date.now();
    
    // Spawn protection
    if (currentTime < this.spawnProtectionUntil) {
      this.statusIndicator.lineStyle(2, COLORS.ACCENT_CYAN, 0.8);
      this.statusIndicator.strokeCircle(this.x, this.y, VISUAL_CONFIG.PLAYER_SIZE + 5);
    }
    
    // Battle cooldown
    if (currentTime < this.battleCooldownUntil) {
      this.statusIndicator.lineStyle(2, COLORS.ACCENT_ORANGE, 0.6);
      this.statusIndicator.strokeCircle(this.x, this.y, VISUAL_CONFIG.PLAYER_SIZE + 8);
    }
    
    // Eliminated state
    if (this.playerData.status === PlayerStatus.ELIMINATED) {
      this.setAlpha(0.3);
      this.statusIndicator.lineStyle(3, COLORS.ACCENT_PINK);
      this.statusIndicator.strokeCircle(this.x, this.y, VISUAL_CONFIG.PLAYER_SIZE + 3);
    } else {
      this.setAlpha(1.0);
    }
  }

  // Battle System
  public showProximityWarning(show: boolean): void {
    this.proximityIndicator.setVisible(show);
    
    if (show) {
      this.proximityIndicator.clear();
      this.proximityIndicator.lineStyle(3, COLORS.ACCENT_PINK, 0.7);
      this.proximityIndicator.strokeCircle(
        this.x, 
        this.y, 
        GAMEPLAY_CONFIG.BATTLE_PROXIMITY_RANGE * GAME_CONFIG.TILE_SIZE
      );
      
      // Pulsing effect
      this.scene.tweens.add({
        targets: this.proximityIndicator,
        alpha: 0.3,
        duration: 500,
        yoyo: true,
        repeat: -1
      });
    } else {
      this.scene.tweens.killTweensOf(this.proximityIndicator);
      this.proximityIndicator.setAlpha(1);
    }
  }

  public enterBattle(): void {
    this.isInBattle = true;
    this.showProximityWarning(false);
    
    // Visual feedback for battle state
    this.setTint(0xff6b35); // Orange tint
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 200,
      yoyo: true
    });
  }

  public exitBattle(won: boolean): void {
    this.isInBattle = false;
    this.battleCooldownUntil = Date.now() + GAMEPLAY_CONFIG.BATTLE_COOLDOWN_TIME;
    
    // Reset visual state
    this.setTint(this.playerData.color);
    this.setScale(1);
    
    // Victory/defeat feedback
    if (won) {
      this.scene.tweens.add({
        targets: this,
        y: this.y - 10,
        duration: 300,
        yoyo: true,
        ease: 'Back.easeOut'
      });
    }
  }

  // Key Management
  public addKey(keyType: KeyType): void {
    if (this.playerData.keys.items.length >= GAMEPLAY_CONFIG.MAX_KEYS_PER_PLAYER) {
      // Remove oldest key if at capacity
      this.playerData.keys.items.shift();
    }
    
    this.playerData.keys.items.push({
      id: `key_${Date.now()}`,
      type: keyType,
      acquiredAt: Date.now()
    });
    
    this.updateKeyIndicators();
    
    // Visual feedback
    this.scene.tweens.add({
      targets: this.keyIndicators,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true
    });
  }

  public removeKey(keyType: KeyType): boolean {
    const keyIndex = this.playerData.keys.items.findIndex(key => key.type === keyType);
    
    if (keyIndex !== -1) {
      this.playerData.keys.items.splice(keyIndex, 1);
      this.updateKeyIndicators();
      return true;
    }
    
    return false;
  }

  public hasKey(keyType: KeyType): boolean {
    return this.playerData.keys.items.some(key => key.type === keyType);
  }

  // Utility Methods
  private calculateDistance(pos1: Vector2, pos2: Vector2): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public getDistanceTo(other: Player): number {
    return this.calculateDistance(
      { x: this.x, y: this.y },
      { x: other.x, y: other.y }
    );
  }

  public isInProximityOf(other: Player): boolean {
    const distance = this.getDistanceTo(other);
    return distance <= (GAMEPLAY_CONFIG.BATTLE_PROXIMITY_RANGE * GAME_CONFIG.TILE_SIZE);
  }

  // Phaser Update Loop
  public update(time: number, delta: number): void {
    // Update UI element positions
    this.nameText.setPosition(this.x, this.y - 25);
    this.keyIndicators.setPosition(this.x, this.y + 25);
    this.powerUpIndicators.setPosition(this.x, this.y - 40);
    this.updateStatusIndicator();
    
    // Update proximity indicator position
    if (this.proximityIndicator.visible) {
      this.proximityIndicator.setPosition(this.x, this.y);
    }
    
    // Update power-ups (check for expiration)
    this.updatePowerUps();
  }

  // Cleanup
  public destroy(fromScene?: boolean): void {
    try {
      // Clean up UI elements
      this.nameText?.destroy();
      this.keyIndicators?.destroy();
      this.powerUpIndicators?.destroy();
      this.statusIndicator?.destroy();
      this.proximityIndicator?.destroy();
      
      // Only try to kill tweens if the scene is still active
      if (!fromScene && this.scene && this.scene.tweens) {
        this.scene.tweens.killTweensOf(this);
        this.scene.tweens.killTweensOf(this.keyIndicators);
        this.scene.tweens.killTweensOf(this.powerUpIndicators);
        this.scene.tweens.killTweensOf(this.proximityIndicator);
      }
    } catch (error) {
      console.warn('⚠️ Non-critical cleanup error:', error);
    }
    
    super.destroy();
  }

  // Rendering helpers
  public bringUIToFront(): void {
    // Ensure all auxiliary visuals render above tile layers and doors
    const uiDepth = Math.max(this.depth + 1, 21);
    this.nameText?.setDepth(uiDepth);
    this.keyIndicators?.setDepth(uiDepth);
    this.powerUpIndicators?.setDepth(uiDepth);
    this.statusIndicator?.setDepth(uiDepth);
    this.proximityIndicator?.setDepth(uiDepth);
  }

  // Getters
  public getPlayerData(): PlayerData {
    return this.playerData;
  }

  public isLocal(): boolean {
    return this.isLocalPlayer;
  }

  public getKeyCount(): number {
    return this.playerData.keys.items.length;
  }

  public getKeys(): KeyType[] {
    return this.playerData.keys.items.map(key => key.type);
  }

  // Power-Up System
  public addPowerUp(powerUpType: PowerUpType): void {
    const config = POWER_UP_CONFIGS[powerUpType];
    const expiresAt = config.duration > 0 ? Date.now() + config.duration : 0;
    
    this.activePowerUps.set(powerUpType, {
      config,
      expiresAt,
      effect: { ...config.effect }
    });
    
    this.updatePowerUpIndicators();
    this.applyPowerUpEffect(powerUpType);
    
    console.log(`⚡ ${this.playerName} gained ${powerUpType} power-up`);
  }

  public removePowerUp(powerUpType: PowerUpType): void {
    if (this.activePowerUps.has(powerUpType)) {
      this.activePowerUps.delete(powerUpType);
      this.updatePowerUpIndicators();
      this.removePowerUpEffect(powerUpType);
      
      console.log(`⚡ ${this.playerName} lost ${powerUpType} power-up`);
    }
  }

  public hasPowerUp(powerUpType: PowerUpType): boolean {
    return this.activePowerUps.has(powerUpType);
  }

  public usePowerUp(powerUpType: PowerUpType): boolean {
    const powerUp = this.activePowerUps.get(powerUpType);
    if (!powerUp) return false;

    switch (powerUpType) {
      case PowerUpType.GHOST_WALK:
        if (powerUp.effect.usesRemaining > 0) {
          powerUp.effect.usesRemaining--;
          if (powerUp.effect.usesRemaining <= 0) {
            this.removePowerUp(powerUpType);
          }
          return true;
        }
        break;
      
      case PowerUpType.SHIELD:
        if (powerUp.effect.usesRemaining > 0) {
          powerUp.effect.usesRemaining--;
          if (powerUp.effect.usesRemaining <= 0) {
            this.removePowerUp(powerUpType);
          }
          return true;
        }
        break;
      
      case PowerUpType.CONFUSION:
        // Instant use power-up
        this.removePowerUp(powerUpType);
        return true;
    }

    return false;
  }

  private applyPowerUpEffect(powerUpType: PowerUpType): void {
    switch (powerUpType) {
      case PowerUpType.SPEED_BOOST:
        const powerUp = this.activePowerUps.get(powerUpType);
        if (powerUp) {
          this.movementSpeed = GAMEPLAY_CONFIG.MOVEMENT_SPEED * powerUp.effect.speedMultiplier;
          
          // Visual effect for speed boost
          this.setTint(0x00ff87); // Green tint
          this.scene.tweens.add({
            targets: this,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 200,
            yoyo: true,
            repeat: 3
          });
        }
        break;
      
      case PowerUpType.KEY_SENSE:
        // Visual effect for key sense
        this.setTint(0xff6b35); // Orange tint
        break;
      
      case PowerUpType.SHIELD:
        // Visual effect for shield
        this.statusIndicator.lineStyle(3, COLORS.ACCENT_PINK, 1.0);
        this.statusIndicator.strokeCircle(this.x, this.y, VISUAL_CONFIG.PLAYER_SIZE + 12);
        break;
    }
  }

  private removePowerUpEffect(powerUpType: PowerUpType): void {
    switch (powerUpType) {
      case PowerUpType.SPEED_BOOST:
        this.movementSpeed = GAMEPLAY_CONFIG.MOVEMENT_SPEED;
        this.setTint(this.playerData.color); // Reset tint
        break;
      
      case PowerUpType.KEY_SENSE:
        this.setTint(this.playerData.color); // Reset tint
        break;
    }
  }

  private updatePowerUpIndicators(): void {
    this.powerUpIndicators.removeAll(true);
    
    const powerUps = Array.from(this.activePowerUps.entries());
    const startX = -(powerUps.length * 12) / 2;
    
    powerUps.forEach(([type, data], index) => {
      const icon = this.scene.add.text(
        startX + index * 12, 
        0, 
        data.config.icon, 
        {
          fontSize: '10px',
          fontFamily: 'Arial, sans-serif'
        }
      ).setOrigin(0.5);
      
      // Add background circle
      const bg = this.scene.add.circle(
        startX + index * 12, 
        0, 
        8, 
        data.config.color, 
        0.8
      );
      
      this.powerUpIndicators.add([bg, icon]);
    });
    
    // Update container position
    this.powerUpIndicators.setPosition(this.x, this.y - 40);
  }

  private updatePowerUps(): void {
    const currentTime = Date.now();
    const expiredPowerUps: PowerUpType[] = [];
    
    this.activePowerUps.forEach((data, type) => {
      if (data.expiresAt > 0 && currentTime >= data.expiresAt) {
        expiredPowerUps.push(type);
      }
    });
    
    expiredPowerUps.forEach(type => {
      this.removePowerUp(type);
    });
  }

  // Enhanced door interaction with Ghost Walk
  public canPassThroughDoor(doorType: KeyType): boolean {
    // Check if player has the required key
    if (this.hasKey(doorType)) {
      return true;
    }
    
    // Check if player has Ghost Walk power-up
    if (this.hasPowerUp(PowerUpType.GHOST_WALK)) {
      return this.usePowerUp(PowerUpType.GHOST_WALK);
    }
    
    return false;
  }

  // Check if player can pass through portal door (requires multiple keys)
  public canPassThroughPortalDoor(requirements: KeyType[]): boolean {
    // Check if player has all required keys
    const hasAllKeys = requirements.every(keyType => this.hasKey(keyType));
    
    if (hasAllKeys) {
      return true;
    }
    
    // Check if player has Ghost Walk power-up
    if (this.hasPowerUp(PowerUpType.GHOST_WALK)) {
      return this.usePowerUp(PowerUpType.GHOST_WALK);
    }
    
    return false;
  }

  // Enhanced battle protection with Shield
  public hasShieldProtection(): boolean {
    return this.hasPowerUp(PowerUpType.SHIELD);
  }

  public useShieldProtection(): boolean {
    return this.usePowerUp(PowerUpType.SHIELD);
  }

  // Get movement speed (affected by power-ups)
  public getMovementSpeed(): number {
    return this.movementSpeed;
  }

  // Get all active power-ups
  public getActivePowerUps(): PowerUpType[] {
    return Array.from(this.activePowerUps.keys());
  }
}