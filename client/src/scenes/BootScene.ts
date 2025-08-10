import Phaser from 'phaser';
import { SCENE_KEYS, ASSET_KEYS, COLORS, SoundEffect } from '../utils/Constants.ts';

export class BootScene extends Phaser.Scene {
  private loadingBar!: Phaser.GameObjects.Graphics;
  private loadingProgress: number = 0;

  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  preload(): void {
    console.log('🚀 BootScene: Starting asset loading...');
    
    // Create loading graphics
    this.createLoadingBar();
    
    // Setup loading event listeners
    this.setupLoadingEvents();
    
    // Load placeholder assets (for prototype)
    this.loadPlaceholderAssets();
    
    // Load game data
    this.loadGameData();
  }

  create(): void {
    console.log('✅ BootScene: Assets loaded, creating placeholder graphics...');
    
    // Create textures using Phaser's texture manager
    this.createPhaserTextures();
    
    // Create default animations
    this.createAnimations();
    
    // Setup audio system
    this.setupAudio();
    
    // Initialize global game systems
    this.initializeGameSystems();
    
    // Transition to menu scene
    this.time.delayedCall(1000, () => {
      this.scene.start(SCENE_KEYS.MENU);
    });
  }

  private createLoadingBar(): void {
    const { width, height } = this.cameras.main;
    
    // Background
    this.add.rectangle(width / 2, height / 2, width, height, COLORS.PRIMARY);
    
    // Title text
    this.add.text(width / 2, height / 2 - 100, 'CONVERGENCE TRIALS', {
      fontSize: '32px',
      color: '#00f5ff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Loading text
    this.add.text(width / 2, height / 2 + 50, 'Loading...', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    // Loading bar background
    const barWidth = 400;
    const barHeight = 8;
    const barX = width / 2 - barWidth / 2;
    const barY = height / 2 + 100;
    
    this.add.rectangle(barX + barWidth / 2, barY + barHeight / 2, barWidth, barHeight, COLORS.GRAY)
      .setOrigin(0.5);
    
    // Loading bar fill
    this.loadingBar = this.add.graphics();
    this.updateLoadingBar(0);
  }

  private updateLoadingBar(progress: number): void {
    this.loadingProgress = progress;
    const { width, height } = this.cameras.main;
    const barWidth = 400;
    const barHeight = 8;
    const barX = width / 2 - barWidth / 2;
    const barY = height / 2 + 100;
    
    this.loadingBar.clear();
    this.loadingBar.fillStyle(COLORS.ACCENT_CYAN);
    this.loadingBar.fillRect(barX, barY, barWidth * progress, barHeight);
    
    // Add glow effect
    this.loadingBar.lineStyle(2, COLORS.ACCENT_CYAN, 0.3);
    this.loadingBar.strokeRect(barX, barY, barWidth * progress, barHeight);
  }

  private setupLoadingEvents(): void {
    this.load.on('progress', (progress: number) => {
      this.updateLoadingBar(progress);
      
      // Update HTML loading bar if still visible
      const htmlProgress = document.querySelector('.loading-progress') as HTMLElement;
      if (htmlProgress) {
        htmlProgress.style.width = `${progress * 100}%`;
      }
    });

    this.load.on('fileprogress', (file: Phaser.Loader.File) => {
      console.log('Loading:', file.key);
    });

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.error('Failed to load:', file.key, file.url);
    });

    this.load.on('complete', () => {
      console.log('✅ All assets loaded successfully');
    });
  }

  private loadPlaceholderAssets(): void {
    // Generate placeholder graphics programmatically
    this.createPlaceholderGraphics();
    
    // Load audio placeholders with empty audio files
    const emptyAudio = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    
    // Load music placeholders
    this.load.audio(ASSET_KEYS.BGM_MENU, emptyAudio);
    this.load.audio(ASSET_KEYS.BGM_GAME, emptyAudio);
    this.load.audio(ASSET_KEYS.BGM_BATTLE, emptyAudio);
    
    // Load sound effect placeholders
    Object.values(SoundEffect).forEach(effect => {
      this.load.audio(effect, emptyAudio);
    });
    
    console.log('🎵 Loading audio placeholders...');
  }

  private createPlaceholderGraphics(): void {
    // Skip loading graphics here - create them in the create() method instead
    console.log('📝 Placeholder graphics will be created after scene initialization');
  }

  private createPhaserTextures(): void {
    console.log('🎨 Starting texture generation...');
    
    try {
      // Create player texture
    this.textures.generate(ASSET_KEYS.PLAYER, { 
      data: ['..........', '.XXXXXXXX.', '.X......X.', '.X.XXXX.X.', '.X.X..X.X.', '.X.X..X.X.', '.X.XXXX.X.', '.X......X.', '.XXXXXXXX.', '..........'], 
      pixelWidth: 3, 
      pixelHeight: 3 
    });
    
    // Create key textures
    this.textures.generate('key_rock', { 
      data: ['....X....', '...XXX...', '..XXXXX..', '.XXXXXXX.', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..', '...XXX...', '....X....'], 
      pixelWidth: 3, 
      pixelHeight: 3 
    });
    
    this.textures.generate('key_paper', { 
      data: ['XXXXXXXXX', 'X.......X', 'X.......X', 'X.......X', 'X.......X', 'X.......X', 'X.......X', 'X.......X', 'XXXXXXXXX'], 
      pixelWidth: 3, 
      pixelHeight: 3 
    });
    
    this.textures.generate('key_scissors', { 
      data: ['X.......X', '.X.....X.', '..X...X..', '...X.X...', '....X....', '...X.X...', '..X...X..', '.X.....X.', 'X.......X'], 
      pixelWidth: 3, 
      pixelHeight: 3 
    });
    
    // Create door textures
    this.textures.generate('door_rock', { 
      data: ['XXXXXXXXX', 'X.......X', 'X..XXX..X', 'X.XXXXX.X', 'X.XXXXX.X', 'X.XXXXX.X', 'X..XXX..X', 'X.......X', 'XXXXXXXXX'], 
      pixelWidth: 4, 
      pixelHeight: 4 
    });
    
    this.textures.generate('door_paper', { 
      data: ['XXXXXXXXX', 'X.......X', 'X.......X', 'X.......X', 'X.......X', 'X.......X', 'X.......X', 'X.......X', 'XXXXXXXXX'], 
      pixelWidth: 4, 
      pixelHeight: 4 
    });
    
    this.textures.generate('door_scissors', { 
      data: ['XXXXXXXXX', 'XX.....XX', 'X.X...X.X', 'X..X.X..X', 'X...X...X', 'X..X.X..X', 'X.X...X.X', 'XX.....XX', 'XXXXXXXXX'], 
      pixelWidth: 4, 
      pixelHeight: 4 
    });
    
    // Create individual tile textures for reference
    this.textures.generate('tile_floor', { 
      data: ['........', '.XXXXXX.', '.X....X.', '.X....X.', '.X....X.', '.X....X.', '.XXXXXX.', '........'], 
      pixelWidth: 4, 
      pixelHeight: 4 
    });
    
    this.textures.generate('tile_wall', { 
      data: ['XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX'], 
      pixelWidth: 4, 
      pixelHeight: 4 
    });

    // Create a combined tileset that matches TileType enum indices
    this.createMazeTileset();
    
    // Create particle texture
    this.textures.generate(ASSET_KEYS.PARTICLES, { 
      data: ['..XX..', '.XXXX.', 'XXXXXX', 'XXXXXX', '.XXXX.', '..XX..'], 
      pixelWidth: 2, 
      pixelHeight: 2 
    });
    
    console.log('✅ Placeholder textures created successfully');
    } catch (error) {
      console.error('❌ Error creating textures:', error);
      throw error;
    }
  }

  /**
   * Create a combined tileset that matches TileType enum indices
   */
  private createMazeTileset(): void {
    const tileSize = 32;
    const tilesPerRow = 8; // Enough for all TileType values
    const canvas = document.createElement('canvas');
    canvas.width = tileSize * tilesPerRow;
    canvas.height = tileSize;
    
    const ctx = canvas.getContext('2d')!;
    
    // Define colors for different tile types
    const tileColors = {
      empty: '#00000000',      // Transparent (index 0 - EMPTY)
      wall: '#4a4a4a',         // Dark gray (index 1 - WALL)
      floor: '#2a2a3a',        // Dark blue-gray (index 2 - FLOOR)  
      spawn: '#2a2a3a',        // Use floor color for legacy SPAWN index (3)
      // keySpawn: '#f5a623',     // Orange (index 4 - KEY_SPAWN) - K blocks removed
      door: '#8b4513',         // Brown (index 5 - DOOR)
      exit: '#2a2a3a'          // Use floor color for legacy EXIT index (6)
    };

    // Draw each tile type at its corresponding index
    this.drawTile(ctx, 0, tileSize, tileColors.empty, '');     // EMPTY
    this.drawTile(ctx, 1, tileSize, tileColors.wall, ''); // WALL
    this.drawTile(ctx, 2, tileSize, tileColors.floor, '');    // FLOOR
    this.drawTile(ctx, 3, tileSize, tileColors.spawn, '');    // SPAWN (hidden)
    // this.drawTile(ctx, 4, tileSize, tileColors.keySpawn, 'K'); // KEY_SPAWN - K blocks removed
    this.drawTile(ctx, 5, tileSize, tileColors.door, 'D');    // DOOR
    this.drawTile(ctx, 6, tileSize, tileColors.exit, '');     // EXIT (hidden)

    // Create texture from canvas
    this.textures.addCanvas('maze_tileset', canvas);
    console.log('🎨 Created maze tileset with proper tile indices');
  }

  /**
   * Draw a single tile in the tileset
   */
  private drawTile(ctx: CanvasRenderingContext2D, index: number, tileSize: number, color: string, symbol: string): void {
    const x = index * tileSize;
    
    // Fill background
    if (color !== '#00000000') {
      ctx.fillStyle = color;
      ctx.fillRect(x, 0, tileSize, tileSize);
      
      // Add subtle border for non-empty tiles
      if (index !== 0 && index !== 2) { // Skip empty and floor
        ctx.strokeStyle = '#ffffff20';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, 0.5, tileSize - 1, tileSize - 1);
      }
      
      // Add symbol if specified
      if (symbol) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.floor(tileSize * 0.6)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, x + tileSize / 2, tileSize / 2);
      }
    }
  }

  private generatePlayerTexture(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 32;
    canvas.height = 32;
    
    // Draw player as a simple circle
    ctx.fillStyle = '#00f5ff';
    ctx.beginPath();
    ctx.arc(16, 16, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Add inner circle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(16, 16, 6, 0, Math.PI * 2);
    ctx.fill();
    
    return canvas.toDataURL();
  }

  private generateKeyTexture(color: number): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 24;
    canvas.height = 24;
    
    // Convert color from hex to CSS
    const cssColor = `#${color.toString(16).padStart(6, '0')}`;
    
    // Draw key as a diamond shape
    ctx.fillStyle = cssColor;
    ctx.beginPath();
    ctx.moveTo(12, 2);
    ctx.lineTo(22, 12);
    ctx.lineTo(12, 22);
    ctx.lineTo(2, 12);
    ctx.closePath();
    ctx.fill();
    
    // Add glow effect
    ctx.strokeStyle = cssColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    return canvas.toDataURL();
  }

  private generateDoorTexture(color: number): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 32;
    canvas.height = 32;
    
    const cssColor = `#${color.toString(16).padStart(6, '0')}`;
    
    // Draw door as a rectangle with symbol
    ctx.fillStyle = '#333333';
    ctx.fillRect(4, 4, 24, 24);
    
    // Draw symbol
    ctx.fillStyle = cssColor;
    ctx.fillRect(8, 8, 16, 16);
    
    // Add border
    ctx.strokeStyle = cssColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 24, 24);
    
    return canvas.toDataURL();
  }

  private generateTileTexture(color: number): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 32;
    canvas.height = 32;
    
    const cssColor = `#${color.toString(16).padStart(6, '0')}`;
    
    // Fill with base color
    ctx.fillStyle = cssColor;
    ctx.fillRect(0, 0, 32, 32);
    
    // Add subtle pattern
    ctx.fillStyle = `#${(color + 0x111111).toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillRect(16, 16, 16, 16);
    
    return canvas.toDataURL();
  }

  private generateParticleTexture(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 8;
    canvas.height = 8;
    
    // Create a small glowing particle
    const gradient = ctx.createRadialGradient(4, 4, 0, 4, 4, 4);
    gradient.addColorStop(0, '#00f5ff');
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 8, 8);
    
    return canvas.toDataURL();
  }

  private loadGameData(): void {
    // Load maze layouts (placeholder data for now)
    const mazeLayouts = {
      spiral: {
        id: 'spiral',
        width: 32,
        height: 21,
        layout: this.generateSampleMaze(32, 21),
        spawnPoints: [
          { x: 1, y: 1 },
          { x: 30, y: 1 },
          { x: 1, y: 19 },
          { x: 30, y: 19 }
        ],
        keySpawns: [], // K blocks removed from map
        doorPositions: [
          { x: 8, y: 3 },
          { x: 20, y: 7 },
          { x: 12, y: 17 }
        ],
        exitPosition: { x: 30, y: 10 },
        theme: 'cyber'
      }
    };
    
    // Store maze data in cache
    this.cache.json.add(ASSET_KEYS.MAZE_LAYOUTS, mazeLayouts);
  }

  private generateSampleMaze(width: number, height: number): number[][] {
    // Generate a simple maze pattern
    const maze: number[][] = [];
    
    for (let y = 0; y < height; y++) {
      maze[y] = [];
      for (let x = 0; x < width; x++) {
        // Border walls
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          maze[y][x] = 1; // Wall
        }
        // Interior pattern
        else if ((x % 3 === 0 && y % 3 === 0) || (x % 5 === 0 && y % 2 === 0)) {
          maze[y][x] = 1; // Wall
        }
        else {
          maze[y][x] = 2; // Floor
        }
      }
    }
    
    return maze;
  }

  private createAnimations(): void {
    // Player movement animations (placeholder)
    this.anims.create({
      key: 'player_idle',
      frames: [{ key: ASSET_KEYS.PLAYER, frame: 0 }],
      frameRate: 1,
      repeat: -1
    });

    this.anims.create({
      key: 'player_walk',
      frames: [{ key: ASSET_KEYS.PLAYER, frame: 0 }],
      frameRate: 8,
      repeat: -1
    });

    // Key collection animation
    this.anims.create({
      key: 'key_idle',
      frames: [
        { key: 'key_rock', frame: 0 },
        { key: 'key_paper', frame: 0 },
        { key: 'key_scissors', frame: 0 }
      ],
      frameRate: 2,
      repeat: -1
    });
  }

  private setupAudio(): void {
    // Initialize audio system with default settings
    if (this.sound) {
      this.sound.volume = 0.7;
    }
    
    console.log('🔊 Audio system initialized');
  }

  private initializeGameSystems(): void {
    // Initialize global game registries
    this.registry.set('playerData', null);
    this.registry.set('gameState', null);
    this.registry.set('networkManager', null);
    this.registry.set('settings', {
      masterVolume: 0.7,
      sfxVolume: 0.8,
      musicVolume: 0.5,
      showFPS: false
    });
    
    console.log('⚙️ Game systems initialized');
  }
}