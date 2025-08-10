import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, DEBUG_CONFIG } from '../utils/Constants.ts';
import { NetworkSystem } from '../systems/NetworkSystem.ts';
import { AudioSystem } from '../systems/AudioSystem.ts';

export class MenuScene extends Phaser.Scene {
  private networkSystem!: NetworkSystem;
  private audioSystem!: AudioSystem;
  private menuState: 'main' | 'connecting' | 'matchmaking' | 'settings' = 'main';
  private currentMenu: Phaser.GameObjects.Container | null = null;
  private playerName: string = 'Player';

  constructor() {
    super({ key: SCENE_KEYS.MENU });
  }

  create(): void {
    console.log('🎮 MenuScene: Creating main menu...');
    
    try {
    
    // Setup background
    this.createBackground();
    
    // Initialize audio system
    this.audioSystem = new AudioSystem(this);
    
    // Initialize network system
    this.setupNetworkSystem();
    
    // Create main menu
    this.showMainMenu();
    
    // Setup input
    this.setupInput();
    
    // Start background music
    this.startBackgroundMusic();
    } catch (error) {
      console.error('❌ Error in MenuScene creation:', error);
      throw error;
    }
  }

  private createBackground(): void {
    const { width, height } = this.cameras.main;
    
    // Gradient background
    const bg = this.add.rectangle(width / 2, height / 2, width, height, COLORS.PRIMARY);
    
    // Add animated particles for ambiance
    const particles = this.add.particles(0, 0, 'particles', {
      x: { min: 0, max: width },
      y: { min: 0, max: height },
      scale: { start: 0.1, end: 0.3 },
      alpha: { start: 0.2, end: 0 },
      speed: { min: 10, max: 30 },
      lifespan: 8000,
      quantity: 2,
      tint: [COLORS.ACCENT_CYAN, COLORS.ACCENT_ORANGE, COLORS.ACCENT_PINK]
    });
    
    // Title
    const title = this.add.text(width / 2, height / 4, 'CONVERGENCE TRIALS', {
      fontSize: '48px',
      color: '#00f5ff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Add glow effect to title
    title.setStroke('#ffffff', 2);
    title.setShadow(0, 0, '#00f5ff', 10, false, true);
    
    // Subtitle
    this.add.text(width / 2, height / 4 + 60, 'Strategic Maze • Rock Paper Scissors • Multiplayer', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      alpha: 0.8
    }).setOrigin(0.5);
  }

  private setupNetworkSystem(): void {
    this.networkSystem = new NetworkSystem();
    this.registry.set('networkManager', this.networkSystem);
    
    // Setup network event listeners
    this.networkSystem.on('connected', () => {
      console.log('✅ Connected to server');
      this.showMainMenu();
    });
    
    this.networkSystem.on('disconnected', () => {
      console.log('🔌 Disconnected from server');
      this.showConnectionError('Disconnected from server');
    });
    
    this.networkSystem.on('matchFound', (data: any) => {
      console.log('🎮 Match found, starting game...');
      this.registry.set('matchData', data);
      this.scene.start(SCENE_KEYS.GAME, data);
    });
    
    this.networkSystem.on('error', (error: any) => {
      console.error('🚨 Network error:', error);
      this.showError(error.message || 'Network error occurred');
    });
  }

  private showMainMenu(): void {
    this.menuState = 'main';
    this.clearCurrentMenu();
    
    const { width, height } = this.cameras.main;
    const menu = this.add.container(width / 2, height / 2 + 100);
    
    // Player name input
    const nameBackground = this.add.rectangle(0, -100, 300, 50, COLORS.GRAY, 0.8);
    nameBackground.setStrokeStyle(2, COLORS.ACCENT_CYAN);
    
    const nameLabel = this.add.text(0, -130, 'Player Name:', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    const nameText = this.add.text(0, -100, this.playerName, {
      fontSize: '18px',
      color: '#00f5ff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    // Make name editable
    nameBackground.setInteractive({ useHandCursor: true });
    nameBackground.on('pointerdown', () => {
      this.promptPlayerName();
    });
    
    // Quick Match button
    const quickMatchBtn = this.createMenuButton(0, -20, 'QUICK MATCH', () => {
      this.startQuickMatch();
    });
    
    // Create Room button
    const createRoomBtn = this.createMenuButton(0, 40, 'CREATE ROOM', () => {
      this.showRoomCreation();
    });
    
    // Join Room button
    const joinRoomBtn = this.createMenuButton(0, 100, 'JOIN ROOM', () => {
      this.showRoomJoining();
    });
    
    // Settings button
    const settingsBtn = this.createMenuButton(0, 160, 'SETTINGS', () => {
      this.showSettings();
    });
    
    // Tutorial button
    const tutorialBtn = this.createMenuButton(0, 220, 'TUTORIAL', () => {
      this.showTutorial();
    });
    
    menu.add([
      nameBackground, nameLabel, nameText,
      quickMatchBtn, createRoomBtn, joinRoomBtn,
      settingsBtn, tutorialBtn
    ]);
    
    this.currentMenu = menu;
    
    // Debug options
    if (DEBUG_CONFIG.MOCK_MULTIPLAYER) {
      const debugText = this.add.text(width - 10, height - 10, 'DEBUG MODE', {
        fontSize: '12px',
        color: '#ff006e',
        fontFamily: 'monospace'
      }).setOrigin(1);
    }
  }

  private createMenuButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    
    const bg = this.add.rectangle(0, 0, 250, 40, COLORS.SECONDARY);
    bg.setStrokeStyle(2, COLORS.ACCENT_CYAN, 0.5);
    
    const label = this.add.text(0, 0, text, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    container.add([bg, label]);
    container.setSize(250, 40);
    container.setInteractive({ useHandCursor: true });
    
    // Hover effects
    container.on('pointerover', () => {
      bg.setFillStyle(COLORS.ACCENT_CYAN, 0.2);
      label.setColor('#00f5ff');
      this.audioSystem.playUIHover();
      this.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100
      });
    });
    
    container.on('pointerout', () => {
      bg.setFillStyle(COLORS.SECONDARY);
      label.setColor('#ffffff');
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 100
      });
    });
    
    container.on('pointerdown', () => {
      this.audioSystem.playUIClick();
      this.tweens.add({
        targets: container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
        onComplete: callback
      });
    });
    
    return container;
  }

  private async startQuickMatch(): Promise<void> {
    this.menuState = 'connecting';
    this.showConnectingScreen();
    
    try {
      const connected = await this.networkSystem.connect(this.playerName);
      
      if (connected) {
        this.menuState = 'matchmaking';
        this.showMatchmakingScreen();
        await this.networkSystem.joinQueue();
      } else {
        this.showConnectionError('Failed to connect to server');
      }
    } catch (error) {
      console.error('Connection error:', error);
      this.showConnectionError('Connection failed');
    }
  }

  private showConnectingScreen(): void {
    this.clearCurrentMenu();
    
    const { width, height } = this.cameras.main;
    const menu = this.add.container(width / 2, height / 2);
    
    const text = this.add.text(0, 0, 'Connecting to server...', {
      fontSize: '24px',
      color: '#00f5ff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    // Loading spinner
    const spinner = this.add.graphics();
    spinner.lineStyle(4, COLORS.ACCENT_CYAN);
    spinner.strokeCircle(0, 60, 20);
    
    this.tweens.add({
      targets: spinner,
      rotation: Math.PI * 2,
      duration: 1000,
      repeat: -1
    });
    
    menu.add([text, spinner]);
    this.currentMenu = menu;
  }

  private showMatchmakingScreen(): void {
    this.clearCurrentMenu();
    
    const { width, height } = this.cameras.main;
    const menu = this.add.container(width / 2, height / 2);
    
    const text = this.add.text(0, -30, 'Finding match...', {
      fontSize: '24px',
      color: '#00f5ff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    const subtext = this.add.text(0, 10, 'Searching for other players', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      alpha: 0.8
    }).setOrigin(0.5);
    
    // Cancel button
    const cancelBtn = this.createMenuButton(0, 80, 'CANCEL', async () => {
      await this.networkSystem.leaveQueue();
      this.networkSystem.disconnect();
      this.showMainMenu();
    });
    
    menu.add([text, subtext, cancelBtn]);
    this.currentMenu = menu;
  }

  private showRoomCreation(): void {
    this.clearCurrentMenu();
    
    const { width, height } = this.cameras.main;
    const menu = this.add.container(width / 2, height / 2);
    
    const title = this.add.text(0, -100, 'Create Room', {
      fontSize: '28px',
      color: '#00f5ff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    // Room settings would go here
    const comingSoon = this.add.text(0, 0, 'Coming Soon!', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      alpha: 0.6
    }).setOrigin(0.5);
    
    const backBtn = this.createMenuButton(0, 100, 'BACK', () => {
      this.showMainMenu();
    });
    
    menu.add([title, comingSoon, backBtn]);
    this.currentMenu = menu;
  }

  private showRoomJoining(): void {
    this.clearCurrentMenu();
    
    const { width, height } = this.cameras.main;
    const menu = this.add.container(width / 2, height / 2);
    
    const title = this.add.text(0, -100, 'Join Room', {
      fontSize: '28px',
      color: '#00f5ff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    // Room ID input would go here
    const comingSoon = this.add.text(0, 0, 'Coming Soon!', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      alpha: 0.6
    }).setOrigin(0.5);
    
    const backBtn = this.createMenuButton(0, 100, 'BACK', () => {
      this.showMainMenu();
    });
    
    menu.add([title, comingSoon, backBtn]);
    this.currentMenu = menu;
  }

  private showSettings(): void {
    this.clearCurrentMenu();
    
    const { width, height } = this.cameras.main;
    const menu = this.add.container(width / 2, height / 2);
    
    const title = this.add.text(0, -150, 'Settings', {
      fontSize: '28px',
      color: '#00f5ff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    // Volume settings
    const volumeLabel = this.add.text(0, -80, 'Master Volume: 70%', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    // Mock setting toggles
    const fpsToggle = this.add.text(0, -40, '☐ Show FPS', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    const fullscreenToggle = this.add.text(0, 0, '☐ Fullscreen', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    const backBtn = this.createMenuButton(0, 100, 'BACK', () => {
      this.showMainMenu();
    });
    
    menu.add([title, volumeLabel, fpsToggle, fullscreenToggle, backBtn]);
    this.currentMenu = menu;
  }

  private showTutorial(): void {
    this.clearCurrentMenu();
    
    const { width, height } = this.cameras.main;
    const menu = this.add.container(width / 2, height / 2);
    
    const title = this.add.text(0, -150, 'How to Play', {
      fontSize: '28px',
      color: '#00f5ff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    const instructions = [
      '• Navigate the maze with WASD or arrow keys',
      '• Collect hidden Rock, Paper, Scissors keys',
      '• Unlock doors using the right key combination',
      '• Battle other players in Rock Paper Scissors',
      '• Reach the final three-key door to win!'
    ];
    
    instructions.forEach((instruction, index) => {
      this.add.text(0, -80 + index * 25, instruction, {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif'
      }).setOrigin(0.5);
    });
    
    const backBtn = this.createMenuButton(0, 120, 'BACK', () => {
      this.showMainMenu();
    });
    
    menu.add([title, backBtn]);
    this.currentMenu = menu;
  }

  private showConnectionError(message: string): void {
    this.menuState = 'main';
    this.showMainMenu();
    this.showError(message);
  }

  private showError(message: string): void {
    const { width, height } = this.cameras.main;
    
    const errorContainer = this.add.container(width / 2, 100);
    
    const bg = this.add.rectangle(0, 0, 400, 60, COLORS.ACCENT_PINK, 0.9);
    bg.setStrokeStyle(2, COLORS.ACCENT_PINK);
    
    const text = this.add.text(0, 0, message, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      wordWrap: { width: 350 }
    }).setOrigin(0.5);
    
    errorContainer.add([bg, text]);
    
    // Auto-hide after 5 seconds
    this.time.delayedCall(5000, () => {
      errorContainer.destroy();
    });
  }

  private promptPlayerName(): void {
    const name = prompt('Enter your player name:', this.playerName);
    if (name && name.trim().length > 0) {
      this.playerName = name.trim().substring(0, 16); // Limit length
      this.showMainMenu(); // Refresh to show new name
    }
  }

  private clearCurrentMenu(): void {
    if (this.currentMenu) {
      this.currentMenu.destroy();
      this.currentMenu = null;
    }
  }

  private setupInput(): void {
    // ESC key to go back
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.menuState !== 'main') {
        this.showMainMenu();
      }
    });
  }

  private startBackgroundMusic(): void {
    // Start menu music with fade in
    this.audioSystem.playMusic('bgm_menu', { fadeIn: 1500 });
  }

  destroy(): void {
    if (this.audioSystem) {
      this.audioSystem.destroy();
    }
    
    if (this.networkSystem) {
      this.networkSystem.destroy();
    }
    
    super.destroy();
  }
}