import Phaser from 'phaser';
import { COLORS, VISUAL_CONFIG, ParticleType } from '../utils/Constants.ts';
import { Vector2 } from '../utils/Types.ts';

export interface ParticleConfig {
  texture: string;
  position: Vector2;
  scale?: { start: number; end: number };
  speed?: { min: number; max: number };
  lifespan?: number;
  quantity?: number;
  alpha?: { start: number; end: number };
  tint?: number[];
  blendMode?: string;
  gravityY?: number;
  emitZone?: any;
  follow?: Phaser.GameObjects.GameObject;
}

export class ParticleSystem {
  private scene: Phaser.Scene;
  private activeEmitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // Key Collection Sparkle Effect
  public createKeySparkle(position: Vector2, keyColor: number): void {
    const particles = this.scene.add.particles(position.x, position.y, 'particles', {
      scale: { start: 0.3, end: 0 },
      speed: { min: 30, max: 80 },
      lifespan: 600,
      quantity: 12,
      alpha: { start: 1, end: 0 },
      tint: [keyColor, COLORS.WHITE],
      blendMode: 'ADD',
      emitZone: {
        type: 'edge',
        source: new Phaser.Geom.Circle(0, 0, 8),
        quantity: 12
      }
    });

    // Self-destruct after animation
    this.scene.time.delayedCall(1000, () => {
      particles.destroy();
    });
  }

  // Door Opening Burst Effect
  public createDoorBurst(position: Vector2, doorColor: number): void {
    // Main burst
    const mainBurst = this.scene.add.particles(position.x, position.y, 'particles', {
      scale: { start: 0.5, end: 0.1 },
      speed: { min: 100, max: 200 },
      lifespan: 800,
      quantity: 20,
      alpha: { start: 1, end: 0 },
      tint: [doorColor, COLORS.WHITE],
      blendMode: 'ADD'
    });

    // Secondary wave
    this.scene.time.delayedCall(200, () => {
      const secondWave = this.scene.add.particles(position.x, position.y, 'particles', {
        scale: { start: 0.2, end: 0 },
        speed: { min: 50, max: 120 },
        lifespan: 600,
        quantity: 15,
        alpha: { start: 0.8, end: 0 },
        tint: doorColor,
        blendMode: 'NORMAL'
      });

      this.scene.time.delayedCall(800, () => {
        secondWave.destroy();
      });
    });

    // Screen shake effect
    this.scene.cameras.main.shake(200, 0.01);

    // Clean up main burst
    this.scene.time.delayedCall(1200, () => {
      mainBurst.destroy();
    });
  }

  // Battle Clash Effect
  public createBattleClash(position: Vector2): void {
    // Central explosion
    const explosion = this.scene.add.particles(position.x, position.y, 'particles', {
      scale: { start: 0.8, end: 0 },
      speed: { min: 150, max: 300 },
      lifespan: 500,
      quantity: 25,
      alpha: { start: 1, end: 0 },
      tint: [COLORS.ACCENT_PINK, COLORS.ACCENT_ORANGE, COLORS.ACCENT_CYAN],
      blendMode: 'ADD'
    });

    // Ring of sparks
    const sparks = this.scene.add.particles(position.x, position.y, 'particles', {
      scale: { start: 0.3, end: 0.1 },
      speed: { min: 80, max: 150 },
      lifespan: 800,
      quantity: 30,
      alpha: { start: 1, end: 0 },
      tint: COLORS.WHITE,
      blendMode: 'ADD',
      emitZone: {
        type: 'edge',
        source: new Phaser.Geom.Circle(0, 0, 20),
        quantity: 30
      }
    });

    // Screen flash
    const flash = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      COLORS.WHITE,
      0.3
    );
    flash.setScrollFactor(0);
    flash.setDepth(1000);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy()
    });

    // Clean up particles
    this.scene.time.delayedCall(1000, () => {
      explosion.destroy();
      sparks.destroy();
    });
  }

  // Victory Celebration Effect
  public createVictoryCelebration(position: Vector2): void {
    // Golden confetti burst
    const confetti = this.scene.add.particles(position.x, position.y, 'particles', {
      scale: { start: 0.4, end: 0.1 },
      speed: { min: 100, max: 250 },
      lifespan: 2000,
      quantity: 50,
      alpha: { start: 1, end: 0 },
      tint: [0xFFD700, 0xFFA500, 0xFFFF00], // Gold colors
      blendMode: 'ADD',
      gravityY: 200
    });

    // Spiraling stars
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 200, () => {
        const star = this.scene.add.particles(position.x, position.y, 'particles', {
          scale: { start: 0.6, end: 0 },
          speed: { min: 80, max: 120 },
          lifespan: 1500,
          quantity: 8,
          alpha: { start: 1, end: 0 },
          tint: [COLORS.ACCENT_CYAN, COLORS.WHITE],
          blendMode: 'ADD',
          emitZone: {
            type: 'edge',
            source: new Phaser.Geom.Circle(0, 0, 40 + i * 20),
            quantity: 8
          }
        });

        this.scene.time.delayedCall(2000, () => {
          star.destroy();
        });
      });
    }

    // Clean up main confetti
    this.scene.time.delayedCall(3000, () => {
      confetti.destroy();
    });
  }

  // Player Elimination Effect
  public createEliminationEffect(position: Vector2, playerColor: number): void {
    // Dissolve effect
    const dissolve = this.scene.add.particles(position.x, position.y, 'particles', {
      scale: { start: 0.3, end: 0 },
      speed: { min: 20, max: 60 },
      lifespan: 1500,
      quantity: 25,
      alpha: { start: 0.8, end: 0 },
      tint: [playerColor, COLORS.GRAY],
      blendMode: 'NORMAL',
      gravityY: -50
    });

    // Spirit release effect
    this.scene.time.delayedCall(500, () => {
      const spirit = this.scene.add.particles(position.x, position.y, 'particles', {
        scale: { start: 0.5, end: 0.1 },
        speed: { min: 40, max: 80 },
        lifespan: 2000,
        quantity: 15,
        alpha: { start: 0.6, end: 0 },
        tint: COLORS.WHITE,
        blendMode: 'ADD',
        gravityY: -100
      });

      this.scene.time.delayedCall(2500, () => {
        spirit.destroy();
      });
    });

    // Clean up
    this.scene.time.delayedCall(2000, () => {
      dissolve.destroy();
    });
  }

  // Power-up Collection Effect
  public createPowerUpCollection(position: Vector2, powerUpColor: number): void {
    // Energy absorption
    const absorption = this.scene.add.particles(position.x, position.y, 'particles', {
      scale: { start: 0.4, end: 0.1 },
      speed: { min: 60, max: 120 },
      lifespan: 600,
      quantity: 20,
      alpha: { start: 1, end: 0 },
      tint: [powerUpColor, COLORS.WHITE],
      blendMode: 'ADD',
      emitZone: {
        type: 'edge',
        source: new Phaser.Geom.Circle(0, 0, 30),
        quantity: 20
      }
    });

    // Swirling energy
    const swirl = this.scene.add.particles(position.x, position.y, 'particles', {
      scale: { start: 0.2, end: 0 },
      speed: { min: 40, max: 80 },
      lifespan: 800,
      quantity: 15,
      alpha: { start: 0.8, end: 0 },
      tint: powerUpColor,
      blendMode: 'ADD'
    });

    // Clean up
    this.scene.time.delayedCall(1000, () => {
      absorption.destroy();
      swirl.destroy();
    });
  }

  // Proximity Warning Effect
  public createProximityWarning(position: Vector2): string {
    const id = `proximity_${Date.now()}`;
    
    const warning = this.scene.add.particles(position.x, position.y, 'particles', {
      scale: { start: 0.2, end: 0.4 },
      speed: { min: 10, max: 30 },
      lifespan: 1000,
      quantity: 2,
      alpha: { start: 0.8, end: 0.2 },
      tint: COLORS.ACCENT_PINK,
      blendMode: 'ADD',
      emitZone: {
        type: 'edge',
        source: new Phaser.Geom.Circle(0, 0, 50),
        quantity: 2
      }
    });

    this.activeEmitters.set(id, warning);
    return id;
  }

  public stopProximityWarning(id: string): void {
    const emitter = this.activeEmitters.get(id);
    if (emitter) {
      emitter.destroy();
      this.activeEmitters.delete(id);
    }
  }

  // Ambient maze atmosphere
  public createAmbientParticles(): void {
    const { width, height } = this.scene.cameras.main;
    
    // Floating dust particles
    const dust = this.scene.add.particles(0, 0, 'particles', {
      x: { min: 0, max: width },
      y: { min: 0, max: height },
      scale: { start: 0.05, end: 0.1 },
      speed: { min: 5, max: 15 },
      lifespan: 10000,
      quantity: 1,
      alpha: { start: 0.1, end: 0 },
      tint: [COLORS.ACCENT_CYAN, COLORS.WHITE],
      blendMode: 'ADD'
    });

    dust.setScrollFactor(0.3); // Parallax effect
    this.activeEmitters.set('ambient', dust);
  }

  // Screen transition effects
  public createSceneTransition(type: 'fadeIn' | 'fadeOut' | 'wipe'): Promise<void> {
    return new Promise((resolve) => {
      const { width, height } = this.scene.cameras.main;
      
      switch (type) {
        case 'fadeIn':
          const fadeOverlay = this.scene.add.rectangle(
            width / 2, height / 2, width, height, COLORS.BLACK
          );
          fadeOverlay.setScrollFactor(0);
          fadeOverlay.setDepth(2000);
          
          this.scene.tweens.add({
            targets: fadeOverlay,
            alpha: 0,
            duration: 1000,
            onComplete: () => {
              fadeOverlay.destroy();
              resolve();
            }
          });
          break;
          
        case 'fadeOut':
          const fadeOut = this.scene.add.rectangle(
            width / 2, height / 2, width, height, COLORS.BLACK, 0
          );
          fadeOut.setScrollFactor(0);
          fadeOut.setDepth(2000);
          
          this.scene.tweens.add({
            targets: fadeOut,
            alpha: 1,
            duration: 1000,
            onComplete: () => resolve()
          });
          break;
          
        case 'wipe':
          // Particle wipe effect
          const wipe = this.scene.add.particles(0, height / 2, 'particles', {
            x: { min: -50, max: width + 50 },
            y: { min: 0, max: height },
            scale: { start: 1, end: 1 },
            speed: { min: 200, max: 400 },
            lifespan: 2000,
            quantity: 10,
            alpha: { start: 1, end: 0 },
            tint: COLORS.ACCENT_CYAN,
            blendMode: 'ADD'
          });
          
          wipe.setScrollFactor(0);
          
          this.scene.time.delayedCall(1500, () => {
            wipe.destroy();
            resolve();
          });
          break;
      }
    });
  }

  // Clean up all effects
  public destroy(): void {
    this.activeEmitters.forEach(emitter => {
      emitter.destroy();
    });
    this.activeEmitters.clear();
  }

  // Update active effects
  public update(): void {
    // Remove any destroyed emitters
    this.activeEmitters.forEach((emitter, id) => {
      if (!emitter.active) {
        this.activeEmitters.delete(id);
      }
    });
  }
}