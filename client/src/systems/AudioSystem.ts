import Phaser from 'phaser';
import { AUDIO_CONFIG, SoundEffect } from '../utils/Constants.ts';
import { Vector2 } from '../utils/Types.ts';

export interface AudioConfig {
  volume: number;
  loop: boolean;
  delay?: number;
  rate?: number;
  fadeIn?: number;
  fadeOut?: number;
}

export interface SpatialAudioConfig extends AudioConfig {
  position: Vector2;
  maxDistance: number;
  rolloffFactor: number;
  listenerPosition: Vector2;
}

export class AudioSystem {
  private scene: Phaser.Scene;
  private masterVolume: number = AUDIO_CONFIG.MASTER_VOLUME;
  private sfxVolume: number = AUDIO_CONFIG.SFX_VOLUME;
  private musicVolume: number = AUDIO_CONFIG.MUSIC_VOLUME;
  
  // Audio instances
  private currentMusic: Phaser.Sound.BaseSound | null = null;
  private soundEffects: Map<string, Phaser.Sound.BaseSound> = new Map();
  private activeSounds: Set<Phaser.Sound.BaseSound> = new Set();
  
  // Audio pools for performance
  private soundPools: Map<string, Phaser.Sound.BaseSound[]> = new Map();
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.loadAudioAssets();
  }

  private loadAudioAssets(): void {
    // In a real implementation, these would be actual audio files
    // For now, we'll create placeholder audio configurations
    
    // Generate beep sounds programmatically using Web Audio API
    this.generateBeepSound('ui_click', 800, 0.1);
    this.generateBeepSound('ui_hover', 600, 0.05);
    this.generateBeepSound('key_collect', 1000, 0.2);
    this.generateBeepSound('door_open', 400, 0.3);
    this.generateBeepSound('door_locked', 200, 0.2);
    this.generateBeepSound('battle_start', 300, 0.5);
    this.generateBeepSound('battle_countdown', 500, 0.1);
    this.generateBeepSound('battle_win', 800, 0.4);
    this.generateBeepSound('battle_lose', 200, 0.6);
    this.generateBeepSound('player_eliminate', 150, 0.8);
    this.generateBeepSound('step', 300, 0.05);
    
    console.log('🔊 Audio system initialized with generated sounds');
  }

  private generateBeepSound(key: string, frequency: number, duration: number): void {
    try {
      // Create oscillator-based sound
      const oscillator = this.scene.sound.add(key, {
        mute: false,
        volume: this.sfxVolume,
        loop: false,
        rate: frequency / 440 // Use rate to control frequency relative to A4 (440Hz)
      });

      // Store in our effects map
      this.soundEffects.set(key, oscillator);
      
      console.log(`🎵 Generated sound: ${key}`);
    } catch (error) {
      console.warn(`⚠️ Could not generate sound: ${key}`, error);
    }
  }

  // Music Management
  public playMusic(key: string, config?: Partial<AudioConfig>): void {
    // Stop current music
    this.stopMusic();

    const settings = {
      volume: this.musicVolume,
      loop: true,
      ...config
    };

    try {
      this.currentMusic = this.scene.sound.add(key, settings);
      this.currentMusic.play();
      
      // Fade in if specified
      if (settings.fadeIn) {
        this.currentMusic.setVolume(0);
        this.scene.tweens.add({
          targets: this.currentMusic,
          volume: settings.volume,
          duration: settings.fadeIn
        });
      }

      console.log(`🎵 Playing music: ${key}`);
    } catch (error) {
      console.warn(`🔇 Could not play music: ${key}`, error);
    }
  }

  public stopMusic(fadeOut?: number): void {
    if (!this.currentMusic) return;

    if (fadeOut) {
      this.scene.tweens.add({
        targets: this.currentMusic,
        volume: 0,
        duration: fadeOut,
        onComplete: () => {
          this.currentMusic?.stop();
          this.currentMusic = null;
        }
      });
    } else {
      this.currentMusic.stop();
      this.currentMusic = null;
    }
  }

  public pauseMusic(): void {
    if (this.currentMusic && this.currentMusic.isPlaying) {
      this.currentMusic.pause();
    }
  }

  public resumeMusic(): void {
    if (this.currentMusic && this.currentMusic.isPaused) {
      this.currentMusic.resume();
    }
  }

  // Sound Effects
  public playSFX(effect: SoundEffect, config?: Partial<AudioConfig>): void {
    const settings = {
      volume: this.sfxVolume,
      loop: false,
      ...config
    };

    try {
      const sound = this.scene.sound.add(effect, settings);
      sound.play();
      this.activeSounds.add(sound);

      // Auto-cleanup when sound finishes
      sound.once('complete', () => {
        this.activeSounds.delete(sound);
        sound.destroy();
      });

      console.log(`🔊 Playing SFX: ${effect}`);
    } catch (error) {
      // Fallback to generated beep
      this.playBeep(effect);
    }
  }

  private playBeep(effect: SoundEffect): void {
    const sound = this.soundEffects.get(effect);
    if (sound) {
      sound.play();
    }
  }

  // Spatial Audio
  public playSpatialSFX(
    effect: SoundEffect, 
    position: Vector2, 
    listenerPosition: Vector2,
    config?: Partial<SpatialAudioConfig>
  ): void {
    const settings = {
      volume: this.sfxVolume,
      loop: false,
      maxDistance: 300,
      rolloffFactor: 1,
      ...config
    };

    // Calculate distance-based volume
    const distance = this.calculateDistance(position, listenerPosition);
    const spatialVolume = this.calculateSpatialVolume(distance, settings.maxDistance, settings.rolloffFactor);
    
    if (spatialVolume > 0.01) { // Only play if audible
      this.playSFX(effect, {
        ...settings,
        volume: settings.volume * spatialVolume
      });
    }
  }

  private calculateDistance(pos1: Vector2, pos2: Vector2): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateSpatialVolume(distance: number, maxDistance: number, rolloffFactor: number): number {
    if (distance >= maxDistance) return 0;
    return Math.pow(1 - (distance / maxDistance), rolloffFactor);
  }

  // Game Event Audio
  public playKeyCollected(keyType: string, position?: Vector2, listenerPosition?: Vector2): void {
    if (position && listenerPosition) {
      this.playSpatialSFX(SoundEffect.KEY_COLLECT, position, listenerPosition);
    } else {
      this.playSFX(SoundEffect.KEY_COLLECT, { rate: this.getKeyPitch(keyType) });
    }
  }

  public playDoorOpened(doorType: string, position?: Vector2, listenerPosition?: Vector2): void {
    if (position && listenerPosition) {
      this.playSpatialSFX(SoundEffect.DOOR_OPEN, position, listenerPosition);
    } else {
      this.playSFX(SoundEffect.DOOR_OPEN, { rate: this.getDoorPitch(doorType) });
    }
  }

  public playDoorLocked(position?: Vector2, listenerPosition?: Vector2): void {
    if (position && listenerPosition) {
      this.playSpatialSFX(SoundEffect.DOOR_LOCKED, position, listenerPosition);
    } else {
      this.playSFX(SoundEffect.DOOR_LOCKED);
    }
  }

  public playBattleStart(): void {
    this.playSFX(SoundEffect.BATTLE_START, { volume: this.sfxVolume * 1.2 });
  }

  public playBattleCountdown(): void {
    this.playSFX(SoundEffect.BATTLE_COUNTDOWN);
  }

  public playBattleWin(): void {
    this.playSFX(SoundEffect.BATTLE_WIN, { 
      volume: this.sfxVolume * 1.3,
      rate: 1.2 
    });
  }

  public playBattleLose(): void {
    this.playSFX(SoundEffect.BATTLE_LOSE, { 
      volume: this.sfxVolume * 1.1,
      rate: 0.8 
    });
  }

  public playPlayerEliminated(): void {
    this.playSFX(SoundEffect.PLAYER_ELIMINATE, { 
      volume: this.sfxVolume * 1.5,
      rate: 0.6 
    });
  }

  public playFootstep(position?: Vector2, listenerPosition?: Vector2): void {
    if (position && listenerPosition) {
      this.playSpatialSFX(SoundEffect.STEP, position, listenerPosition, { 
        volume: this.sfxVolume * 0.3,
        maxDistance: 100 
      });
    } else {
      this.playSFX(SoundEffect.STEP, { 
        volume: this.sfxVolume * 0.3,
        rate: 0.8 + Math.random() * 0.4 // Vary pitch for realism
      });
    }
  }

  public playUIClick(): void {
    this.playSFX(SoundEffect.UI_CLICK, { volume: this.sfxVolume * 0.7 });
  }

  public playUIHover(): void {
    this.playSFX(SoundEffect.UI_HOVER, { volume: this.sfxVolume * 0.5 });
  }

  // Utility methods
  private getKeyPitch(keyType: string): number {
    switch (keyType) {
      case 'rock': return 0.8;
      case 'paper': return 1.0;
      case 'scissors': return 1.2;
      default: return 1.0;
    }
  }

  private getDoorPitch(doorType: string): number {
    switch (doorType) {
      case 'rock': return 0.7;
      case 'paper': return 1.0;
      case 'scissors': return 1.3;
      default: return 1.0;
    }
  }

  // Volume Controls
  public setMasterVolume(volume: number): void {
    this.masterVolume = Phaser.Math.Clamp(volume, 0, 1);
    this.updateAllVolumes();
  }

  public setSFXVolume(volume: number): void {
    this.sfxVolume = Phaser.Math.Clamp(volume, 0, 1);
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Phaser.Math.Clamp(volume, 0, 1);
    if (this.currentMusic) {
      this.currentMusic.setVolume(this.musicVolume * this.masterVolume);
    }
  }

  private updateAllVolumes(): void {
    // Update current music
    if (this.currentMusic) {
      this.currentMusic.setVolume(this.musicVolume * this.masterVolume);
    }

    // Update active sounds
    this.activeSounds.forEach(sound => {
      const originalVolume = sound.volume / this.masterVolume;
      sound.setVolume(originalVolume * this.masterVolume);
    });
  }

  // Audio Context Management
  public pauseAll(): void {
    this.pauseMusic();
    this.activeSounds.forEach(sound => {
      if (sound.isPlaying) {
        sound.pause();
      }
    });
  }

  public resumeAll(): void {
    this.resumeMusic();
    this.activeSounds.forEach(sound => {
      if (sound.isPaused) {
        sound.resume();
      }
    });
  }

  public stopAll(): void {
    this.stopMusic();
    this.activeSounds.forEach(sound => {
      sound.stop();
    });
    this.activeSounds.clear();
  }

  // Dynamic Music System
  public crossfadeMusic(newKey: string, duration: number = 1000): void {
    const oldMusic = this.currentMusic;
    
    // Start new music at 0 volume
    this.playMusic(newKey, { volume: 0 });
    
    if (this.currentMusic) {
      // Fade in new music
      this.scene.tweens.add({
        targets: this.currentMusic,
        volume: this.musicVolume * this.masterVolume,
        duration: duration
      });
    }
    
    // Fade out old music
    if (oldMusic) {
      this.scene.tweens.add({
        targets: oldMusic,
        volume: 0,
        duration: duration,
        onComplete: () => {
          oldMusic.stop();
        }
      });
    }
  }

  // Audio Analysis (for future rhythm features)
  public getAnalyserData(): Uint8Array | null {
    if (!this.currentMusic || !this.scene.sound.context) {
      return null;
    }

    // This would require additional setup for real-time audio analysis
    // For now, return null as it's beyond the scope of this prototype
    return null;
  }

  // Cleanup
  public destroy(): void {
    this.stopAll();
    
    this.soundEffects.forEach(sound => {
      sound.destroy();
    });
    this.soundEffects.clear();
    this.activeSounds.clear();
    
    console.log('🔇 Audio system destroyed');
  }

  // Getters
  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public getSFXVolume(): number {
    return this.sfxVolume;
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public isPlayingMusic(): boolean {
    return this.currentMusic !== null && this.currentMusic.isPlaying;
  }

  public getCurrentMusicKey(): string | null {
    return this.currentMusic?.key || null;
  }
}