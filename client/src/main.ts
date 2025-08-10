import Phaser from 'phaser';
import { GAME_CONFIG, SCENE_KEYS } from './utils/Constants.ts';
import { PerformanceUtils } from './utils/Performance.ts';
import { BootScene } from './scenes/BootScene.ts';
import { MenuScene } from './scenes/MenuScene.ts';
import { GameScene } from './scenes/GameScene.ts';
import { BattleScene } from './scenes/BattleScene.ts';

// Get adaptive settings based on device performance
const devicePerformance = PerformanceUtils.getDevicePerformanceClass();
const adaptiveSettings = PerformanceUtils.getAdaptiveSettings();

console.log(`🔧 Device performance class: ${devicePerformance}`);
console.log('⚙️ Adaptive settings applied:', adaptiveSettings);

// Game Configuration
const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1024,
  height: 688, // 768 - 50 (status bar) - 30 (debug bar)
  parent: 'game-area',
  backgroundColor: GAME_CONFIG.BACKGROUND_COLOR,
  
  // Physics Configuration
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0, x: 0 },
      debug: GAME_CONFIG.DEBUG
    }
  },
  
  // Renderer Configuration
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true
  },
  
  // Scale Configuration
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1024,
    height: 688
  },
  
  // Audio Configuration
  audio: {
    disableWebAudio: false
  },
  
  // Scene Configuration
  scene: [
    BootScene,
    MenuScene,
    GameScene,
    BattleScene
  ],
  
  // DOM Configuration
  dom: {
    createContainer: true
  }
};

// Initialize Game
class GameApplication {
  private game: Phaser.Game;
  private isInitialized: boolean = false;

  constructor() {
    this.initializeGame();
  }

  private initializeGame(): void {
    try {
      console.log('🎮 Initializing RockPaperScissors Game...');
      
      // Create Phaser Game Instance
      this.game = new Phaser.Game(gameConfig);
      
      // Add global event listeners
      this.setupGlobalEvents();
      
      // Initialize performance monitoring
      this.setupPerformanceMonitoring();
      
      this.isInitialized = true;
      console.log('✅ Game initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize game:', error);
      this.showErrorScreen(error as Error);
    }
  }

  private setupGlobalEvents(): void {
    // Window focus/blur events
    window.addEventListener('focus', () => {
      this.game.scene.resume();
    });

    window.addEventListener('blur', () => {
      this.game.scene.pause();
    });

    // Visibility change events
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.game.scene.pause();
      } else {
        this.game.scene.resume();
      }
    });

    // Unload event for cleanup
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // Error handling
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.handleGlobalError(event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.handleGlobalError(event.reason);
    });
  }

  private setupPerformanceMonitoring(): void {
    if (!GAME_CONFIG.DEBUG) return;

    // FPS monitoring
    let lastTime = 0;
    let frameCount = 0;
    let fpsDisplay: HTMLElement | null = null;

    const updateFPS = (currentTime: number) => {
      frameCount++;
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        if (!fpsDisplay) {
          fpsDisplay = this.createFPSDisplay();
        }
        
        fpsDisplay.textContent = `FPS: ${fps}`;
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(updateFPS);
    };

    requestAnimationFrame(updateFPS);
  }

  private createFPSDisplay(): HTMLElement {
    const fpsDisplay = document.createElement('div');
    fpsDisplay.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: #00f5ff;
      padding: 5px 10px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 12px;
      z-index: 1000;
    `;
    document.body.appendChild(fpsDisplay);
    return fpsDisplay;
  }

  private handleGlobalError(error: Error): void {
    // Enhanced error logging
    console.error('🚨 Game error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    
    // Log additional context
    console.log('📝 Game state:', {
      isInitialized: this.isInitialized,
      gameInstance: this.game ? 'exists' : 'null',
      scenes: this.game?.scene?.scenes?.map(s => s.scene.key)
    });
    
    // Send error telemetry (in production)
    if (!GAME_CONFIG.DEBUG) {
      this.sendErrorTelemetry(error);
    }
    
    // Show detailed error message in debug mode
    const errorMessage = GAME_CONFIG.DEBUG 
      ? `Error: ${error.message}\n\nCheck console for details.`
      : 'An unexpected error occurred. Please refresh the page.';
      
    this.showErrorNotification(errorMessage);
  }

  private sendErrorTelemetry(error: Error): void {
    // In production, send error data to analytics service
    const errorData = {
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // Example: send to analytics service
    // analytics.track('game_error', errorData);
  }

  private showErrorNotification(message: string): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #ff006e;
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      z-index: 2000;
      font-family: 'Segoe UI', sans-serif;
      box-shadow: 0 4px 12px rgba(255, 0, 110, 0.3);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  private showErrorScreen(error: Error): void {
    const errorScreen = document.createElement('div');
    errorScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 3000;
      color: #00f5ff;
      font-family: 'Segoe UI', sans-serif;
      text-align: center;
    `;
    
    errorScreen.innerHTML = `
      <h1 style="font-size: 2rem; margin-bottom: 1rem;">⚠️ Game Error</h1>
      <p style="font-size: 1.2rem; margin-bottom: 2rem;">Failed to initialize the game.</p>
      <p style="font-size: 1rem; margin-bottom: 2rem; max-width: 600px; opacity: 0.8;">
        ${error.message}
      </p>
      <button onclick="window.location.reload()" style="
        background: #00f5ff;
        color: #1a1a2e;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-size: 1rem;
        cursor: pointer;
        font-weight: bold;
      ">
        Reload Game
      </button>
    `;
    
    document.body.appendChild(errorScreen);
  }

  private cleanup(): void {
    if (this.isInitialized && this.game) {
      console.log('🧹 Cleaning up game resources...');
      this.game.destroy(true);
    }
  }

  // Public API
  public getGame(): Phaser.Game {
    return this.game;
  }

  public isReady(): boolean {
    return this.isInitialized && this.game !== null;
  }

  public restart(): void {
    this.cleanup();
    setTimeout(() => {
      this.initializeGame();
    }, 100);
  }
}

// Initialize and expose game globally
const gameApp = new GameApplication();

// Export for external access
export default gameApp;

// Global game reference for debugging
if (GAME_CONFIG.DEBUG) {
  (window as any).game = gameApp.getGame();
  (window as any).gameApp = gameApp;
}

// Hide loading screen when game is ready
const hideLoadingScreen = () => {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 500);
  }
};

// Wait for first scene to be ready
gameApp.getGame().events.once('ready', () => {
  console.log('🚀 Game is ready!');
  setTimeout(hideLoadingScreen, 1000); // Small delay for effect
});