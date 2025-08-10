import { DEBUG_CONFIG } from './Constants.ts';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  drawCalls: number;
  objectCount: number;
  networkLatency: number;
  audioLatency: number;
  timestamp: number;
}

export interface OptimizationSettings {
  enableParticlePooling: boolean;
  enableAudioPooling: boolean;
  maxParticleCount: number;
  maxSoundEffects: number;
  enableLOD: boolean; // Level of Detail
  cullingDistance: number;
  targetFPS: number;
}

export class PerformanceMonitor {
  private scene: Phaser.Scene;
  private metrics: PerformanceMetrics;
  private frameTimeHistory: number[] = [];
  private historySize: number = 60; // 1 second at 60fps
  private lastTime: number = 0;
  private isMonitoring: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.metrics = {
      fps: 0,
      frameTime: 0,
      memoryUsage: 0,
      drawCalls: 0,
      objectCount: 0,
      networkLatency: 0,
      audioLatency: 0,
      timestamp: 0
    };
  }

  public startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.lastTime = performance.now();
    
    // Update metrics every frame
    this.scene.events.on('postupdate', this.updateMetrics, this);
    
    console.log('📊 Performance monitoring started');
  }

  public stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    this.scene.events.off('postupdate', this.updateMetrics, this);
    
    console.log('📊 Performance monitoring stopped');
  }

  private updateMetrics(): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Update frame time history
    this.frameTimeHistory.push(deltaTime);
    if (this.frameTimeHistory.length > this.historySize) {
      this.frameTimeHistory.shift();
    }

    // Calculate FPS
    const averageFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    this.metrics.fps = 1000 / averageFrameTime;
    this.metrics.frameTime = averageFrameTime;

    // Update memory usage (if available)
    if ((performance as any).memory) {
      this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }

    // Count game objects
    this.metrics.objectCount = this.countSceneObjects();
    this.metrics.timestamp = currentTime;

    // Log performance warnings
    this.checkPerformanceWarnings();
  }

  private countSceneObjects(): number {
    let count = 0;
    this.scene.children.list.forEach(child => {
      count++;
      // Count nested objects
      if (child instanceof Phaser.GameObjects.Container) {
        count += child.list.length;
      }
    });
    return count;
  }

  private checkPerformanceWarnings(): void {
    if (!DEBUG_CONFIG.LOG_GAME_EVENTS) return;

    // Low FPS warning
    if (this.metrics.fps < 30) {
      console.warn(`⚠️ Low FPS detected: ${this.metrics.fps.toFixed(1)}`);
    }

    // High memory usage warning
    if (this.metrics.memoryUsage > 100) {
      console.warn(`⚠️ High memory usage: ${this.metrics.memoryUsage.toFixed(1)}MB`);
    }

    // Too many objects warning
    if (this.metrics.objectCount > 1000) {
      console.warn(`⚠️ High object count: ${this.metrics.objectCount}`);
    }
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getAverageFPS(): number {
    return this.metrics.fps;
  }

  public getFrameTime(): number {
    return this.metrics.frameTime;
  }

  public destroy(): void {
    this.stopMonitoring();
    this.frameTimeHistory = [];
  }
}

export class PerformanceOptimizer {
  private scene: Phaser.Scene;
  private settings: OptimizationSettings;
  private objectPools: Map<string, any[]> = new Map();
  private cullableObjects: Set<Phaser.GameObjects.GameObject> = new Set();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.settings = {
      enableParticlePooling: true,
      enableAudioPooling: true,
      maxParticleCount: 500,
      maxSoundEffects: 10,
      enableLOD: true,
      cullingDistance: 1000,
      targetFPS: 60
    };
  }

  // Object Pooling
  public getPooledObject<T>(poolName: string, createFn: () => T): T {
    if (!this.settings.enableParticlePooling && poolName.includes('particle')) {
      return createFn();
    }

    let pool = this.objectPools.get(poolName);
    if (!pool) {
      pool = [];
      this.objectPools.set(poolName, pool);
    }

    if (pool.length > 0) {
      return pool.pop() as T;
    }

    return createFn();
  }

  public returnPooledObject(poolName: string, obj: any): void {
    const pool = this.objectPools.get(poolName);
    if (pool && pool.length < 50) { // Limit pool size
      // Reset object state before returning to pool
      if (obj.setActive) obj.setActive(false);
      if (obj.setVisible) obj.setVisible(false);
      if (obj.setPosition) obj.setPosition(0, 0);
      
      pool.push(obj);
    } else {
      // Destroy if pool is full
      if (obj.destroy) obj.destroy();
    }
  }

  // Culling System
  public registerCullableObject(obj: Phaser.GameObjects.GameObject): void {
    if (this.settings.enableLOD) {
      this.cullableObjects.add(obj);
    }
  }

  public unregisterCullableObject(obj: Phaser.GameObjects.GameObject): void {
    this.cullableObjects.delete(obj);
  }

  public updateCulling(cameraPosition: { x: number; y: number }): void {
    if (!this.settings.enableLOD) return;

    this.cullableObjects.forEach(obj => {
      const distance = Phaser.Math.Distance.Between(
        cameraPosition.x, cameraPosition.y,
        obj.x, obj.y
      );

      const shouldBeVisible = distance <= this.settings.cullingDistance;
      
      if (obj.visible !== shouldBeVisible) {
        obj.setVisible(shouldBeVisible);
        if (obj.body) {
          obj.body.enable = shouldBeVisible;
        }
      }
    });
  }

  // Memory Management
  public forceGarbageCollection(): void {
    // Clear unused pools
    this.objectPools.forEach((pool, name) => {
      if (pool.length > 20) {
        const excess = pool.splice(20);
        excess.forEach(obj => {
          if (obj.destroy) obj.destroy();
        });
      }
    });

    // Manual garbage collection hint (if available)
    if ((window as any).gc) {
      (window as any).gc();
    }
  }

  // Texture Management
  public optimizeTextures(): void {
    // Remove unused textures from cache
    const textureManager = this.scene.textures;
    const unusedTextures: string[] = [];

    textureManager.list.forEach((texture, key) => {
      if (key !== '__DEFAULT' && key !== '__MISSING' && !this.isTextureInUse(key)) {
        unusedTextures.push(key);
      }
    });

    unusedTextures.forEach(key => {
      textureManager.remove(key);
    });

    if (unusedTextures.length > 0) {
      console.log(`🗑️ Removed ${unusedTextures.length} unused textures`);
    }
  }

  private isTextureInUse(textureKey: string): boolean {
    // Check if any game objects are using this texture
    return this.scene.children.list.some(child => {
      if (child instanceof Phaser.GameObjects.Image || 
          child instanceof Phaser.GameObjects.Sprite) {
        return child.texture.key === textureKey;
      }
      return false;
    });
  }

  // Frame Rate Optimization
  public adaptiveQuality(): void {
    const currentFPS = this.scene.game.loop.actualFps;
    const targetFPS = this.settings.targetFPS;

    if (currentFPS < targetFPS * 0.8) {
      // Reduce quality
      this.reduceQuality();
    } else if (currentFPS > targetFPS * 0.95) {
      // Increase quality
      this.increaseQuality();
    }
  }

  private reduceQuality(): void {
    // Reduce particle count
    if (this.settings.maxParticleCount > 100) {
      this.settings.maxParticleCount *= 0.8;
    }

    // Reduce audio effects
    if (this.settings.maxSoundEffects > 3) {
      this.settings.maxSoundEffects--;
    }

    // Increase culling distance
    this.settings.cullingDistance *= 0.9;

    console.log('📉 Reducing quality for better performance');
  }

  private increaseQuality(): void {
    // Increase particle count
    if (this.settings.maxParticleCount < 1000) {
      this.settings.maxParticleCount *= 1.1;
    }

    // Increase audio effects
    if (this.settings.maxSoundEffects < 15) {
      this.settings.maxSoundEffects++;
    }

    // Decrease culling distance
    this.settings.cullingDistance *= 1.1;

    console.log('📈 Increasing quality');
  }

  // Network Optimization
  public optimizeNetworkUpdates(): void {
    // This would be implemented with the actual network system
    // For now, just log the optimization attempt
    console.log('🌐 Network update optimization applied');
  }

  // Settings
  public updateSettings(newSettings: Partial<OptimizationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  public getSettings(): OptimizationSettings {
    return { ...this.settings };
  }

  public destroy(): void {
    // Clean up all pools
    this.objectPools.forEach(pool => {
      pool.forEach(obj => {
        if (obj.destroy) obj.destroy();
      });
    });
    this.objectPools.clear();
    this.cullableObjects.clear();
  }
}

// Utility functions for performance optimization
export class PerformanceUtils {
  // Throttle function execution
  static throttle<T extends (...args: any[]) => any>(
    func: T, 
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }

  // Debounce function execution
  static debounce<T extends (...args: any[]) => any>(
    func: T, 
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  // RAF-based animation optimization
  static requestAnimationFrame(callback: () => void): void {
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(callback);
    } else {
      setTimeout(callback, 16); // ~60fps fallback
    }
  }

  // Memory usage checker
  static getMemoryUsage(): number {
    if ((performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  // Device performance classification
  static getDevicePerformanceClass(): 'low' | 'medium' | 'high' {
    const navigator = window.navigator;
    
    // Check for hardware concurrency (CPU cores)
    const cores = (navigator as any).hardwareConcurrency || 1;
    
    // Check for device memory (if available)
    const memory = (navigator as any).deviceMemory || 1;
    
    // Classify based on available metrics
    if (cores >= 8 && memory >= 8) {
      return 'high';
    } else if (cores >= 4 && memory >= 4) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  // Adaptive settings based on device
  static getAdaptiveSettings(): Partial<OptimizationSettings> {
    const performanceClass = this.getDevicePerformanceClass();
    
    switch (performanceClass) {
      case 'high':
        return {
          maxParticleCount: 1000,
          maxSoundEffects: 15,
          cullingDistance: 1500,
          targetFPS: 60
        };
      case 'medium':
        return {
          maxParticleCount: 500,
          maxSoundEffects: 10,
          cullingDistance: 1000,
          targetFPS: 45
        };
      case 'low':
        return {
          maxParticleCount: 200,
          maxSoundEffects: 5,
          cullingDistance: 500,
          targetFPS: 30
        };
    }
  }
}