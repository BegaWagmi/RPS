import Phaser from 'phaser';
import { 
  VISUAL_CONFIG, 
  COLORS, 
  GAME_CONFIG 
} from '../utils/Constants.ts';
import { Vector2 } from '../utils/Types.ts';

export enum PowerUpType {
  GHOST_WALK = 'ghost_walk',      // Pass through one door without key
  KEY_SENSE = 'key_sense',        // Reveal all nearby keys
  SHIELD = 'shield',              // Protect against next battle loss
  SPEED_BOOST = 'speed_boost',    // 50% faster movement
  CONFUSION = 'confusion'         // Scramble opponent's RPS input
}

export interface PowerUpConfig {
  type: PowerUpType;
  duration: number;
  effect: any;
  color: number;
  icon: string;
  rarity: number; // 1-5, 5 being rarest
}

export const POWER_UP_CONFIGS: Record<PowerUpType, PowerUpConfig> = {
  [PowerUpType.GHOST_WALK]: {
    type: PowerUpType.GHOST_WALK,
    duration: 30000, // 30 seconds
    effect: { usesRemaining: 1 },
    color: COLORS.ACCENT_CYAN,
    icon: '👻',
    rarity: 3
  },
  [PowerUpType.KEY_SENSE]: {
    type: PowerUpType.KEY_SENSE,
    duration: 15000, // 15 seconds
    effect: { range: 5 * GAME_CONFIG.TILE_SIZE },
    color: COLORS.ACCENT_ORANGE,
    icon: '🔍',
    rarity: 2
  },
  [PowerUpType.SHIELD]: {
    type: PowerUpType.SHIELD,
    duration: 60000, // 60 seconds
    effect: { usesRemaining: 1 },
    color: COLORS.ACCENT_PINK,
    icon: '🛡️',
    rarity: 4
  },
  [PowerUpType.SPEED_BOOST]: {
    type: PowerUpType.SPEED_BOOST,
    duration: 20000, // 20 seconds
    effect: { speedMultiplier: 1.5 },
    color: 0x00ff87, // Green
    icon: '⚡',
    rarity: 2
  },
  [PowerUpType.CONFUSION]: {
    type: PowerUpType.CONFUSION,
    duration: 0, // Instant use
    effect: { confusionDuration: 5000 },
    color: 0x8000ff, // Purple
    icon: '💫',
    rarity: 5
  }
};

export class PowerUp extends Phaser.Physics.Arcade.Sprite {
  public readonly powerUpType: PowerUpType;
  public readonly config: PowerUpConfig;
  private glowEffect: Phaser.GameObjects.Graphics;
  private floatTween: Phaser.Tweens.Tween;
  private pulseTween: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, type: PowerUpType) {
    super(scene, x, y, 'particles'); // Using particle texture as placeholder
    
    this.powerUpType = type;
    this.config = POWER_UP_CONFIGS[type];
    
    // Setup visual appearance
    this.setupVisuals();
    
    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Setup physics
    this.setupPhysics();
    
    // Start animations
    this.startAnimations();
    
    console.log(`✨ Created ${type} power-up at (${x}, ${y})`);
  }

  private setupVisuals(): void {
    // Set size and color
    this.setDisplaySize(VISUAL_CONFIG.KEY_SIZE, VISUAL_CONFIG.KEY_SIZE);
    this.setTint(this.config.color);
    
    // Create glow effect
    this.glowEffect = this.scene.add.graphics();
    this.updateGlowEffect();
    
    // Add icon overlay (text-based for now)
    const iconText = this.scene.add.text(this.x, this.y, this.config.icon, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    // Store reference for cleanup
    this.setData('iconText', iconText);
  }

  private setupPhysics(): void {
    if (this.body) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setSize(VISUAL_CONFIG.KEY_SIZE, VISUAL_CONFIG.KEY_SIZE);
      body.setImmovable(true);
    }
  }

  private startAnimations(): void {
    // Floating animation
    this.floatTween = this.scene.tweens.add({
      targets: this,
      y: this.y - 10,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Pulsing glow animation
    this.pulseTween = this.scene.tweens.add({
      targets: this,
      alpha: 0.7,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Rotation animation based on rarity
    this.scene.tweens.add({
      targets: this,
      rotation: Math.PI * 2,
      duration: 3000 / this.config.rarity, // Rarer items spin faster
      repeat: -1,
      ease: 'Linear'
    });
  }

  private updateGlowEffect(): void {
    this.glowEffect.clear();
    
    // Create glowing aura
    this.glowEffect.fillStyle(this.config.color, 0.3);
    this.glowEffect.fillCircle(this.x, this.y, VISUAL_CONFIG.KEY_SIZE + 10);
    
    this.glowEffect.lineStyle(2, this.config.color, 0.8);
    this.glowEffect.strokeCircle(this.x, this.y, VISUAL_CONFIG.KEY_SIZE + 5);
  }

  public collect(): void {
    // Collection animation
    this.scene.tweens.add({
      targets: [this, this.getData('iconText')],
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 300,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.destroy();
      }
    });

    // Particle burst effect
    const particles = this.scene.add.particles(this.x, this.y, 'particles', {
      scale: { start: 0.3, end: 0 },
      speed: { min: 80, max: 150 },
      lifespan: 800,
      quantity: 15,
      tint: this.config.color,
      blendMode: 'ADD'
    });

    // Remove particles after animation
    this.scene.time.delayedCall(1000, () => {
      particles.destroy();
    });
  }

  public update(): void {
    // Update icon text position
    const iconText = this.getData('iconText');
    if (iconText) {
      iconText.setPosition(this.x, this.y);
    }
    
    // Update glow effect position
    this.updateGlowEffect();
  }

  public destroy(): void {
    // Clean up tweens
    if (this.floatTween) {
      this.floatTween.destroy();
    }
    if (this.pulseTween) {
      this.pulseTween.destroy();
    }

    // Clean up graphics
    this.glowEffect?.destroy();
    
    // Clean up icon text
    const iconText = this.getData('iconText');
    if (iconText) {
      iconText.destroy();
    }

    super.destroy();
  }
}

// Power-up manager for spawning and managing power-ups
export class PowerUpManager {
  private scene: Phaser.Scene;
  private powerUps: Set<PowerUp> = new Set();
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private maxPowerUps: number = 3;
  private spawnInterval: number = 30000; // 30 seconds

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public startSpawning(): void {
    this.spawnTimer = this.scene.time.addEvent({
      delay: this.spawnInterval,
      callback: this.spawnRandomPowerUp,
      callbackScope: this,
      loop: true
    });

    // Spawn initial power-up
    this.scene.time.delayedCall(5000, () => {
      this.spawnRandomPowerUp();
    });
  }

  public stopSpawning(): void {
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
      this.spawnTimer = null;
    }
  }

  private spawnRandomPowerUp(): void {
    if (this.powerUps.size >= this.maxPowerUps) {
      return; // Max power-ups reached
    }

    // Get random spawn position
    const position = this.getRandomSpawnPosition();
    if (!position) return;

    // Select random power-up based on rarity
    const powerUpType = this.selectRandomPowerUpType();
    
    // Create power-up
    const powerUp = new PowerUp(this.scene, position.x, position.y, powerUpType);
    this.powerUps.add(powerUp);

    console.log(`✨ Spawned ${powerUpType} power-up`);
  }

  private getRandomSpawnPosition(): Vector2 | null {
    try {
      // Get maze data from scene
      const gameScene = this.scene as any;
      if (!gameScene.maze || !gameScene.maze.layout) {
        console.warn('⚠️ Maze data not available for power-up spawn');
        return null;
      }

      const mazeData = gameScene.maze;
      
      // Find valid floor positions
      const validPositions: Vector2[] = [];
      
      // Ensure layout exists and has proper dimensions
      if (!Array.isArray(mazeData.layout) || !Array.isArray(mazeData.layout[0])) {
        console.warn('⚠️ Invalid maze layout structure');
        return null;
      }

      for (let y = 1; y < mazeData.layout.length - 1; y++) {
        for (let x = 1; x < mazeData.layout[y].length - 1; x++) {
          if (mazeData.layout[y][x] === 2) { // Floor tile
            validPositions.push({
              x: x * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2,
              y: y * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2
            });
          }
        }
      }

      if (validPositions.length === 0) {
        console.warn('⚠️ No valid positions found for power-up spawn');
        return null;
      }

      // Return random valid position
      return validPositions[Math.floor(Math.random() * validPositions.length)];
    } catch (error) {
      console.warn('⚠️ Error finding power-up spawn position:', error);
      return null;
    }
  }

  private selectRandomPowerUpType(): PowerUpType {
    // Create weighted array based on rarity (lower rarity = higher chance)
    const weightedTypes: PowerUpType[] = [];
    
    Object.values(PowerUpType).forEach(type => {
      const config = POWER_UP_CONFIGS[type];
      const weight = 6 - config.rarity; // Invert rarity for weight
      
      for (let i = 0; i < weight; i++) {
        weightedTypes.push(type);
      }
    });

    return weightedTypes[Math.floor(Math.random() * weightedTypes.length)];
  }

  public removePowerUp(powerUp: PowerUp): void {
    this.powerUps.delete(powerUp);
  }

  public update(): void {
    this.powerUps.forEach(powerUp => {
      powerUp.update();
    });
  }

  public getPowerUps(): PowerUp[] {
    return Array.from(this.powerUps);
  }

  public destroy(): void {
    this.stopSpawning();
    
    this.powerUps.forEach(powerUp => {
      powerUp.destroy();
    });
    this.powerUps.clear();
  }
}