import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, KeyType, GAMEPLAY_CONFIG } from '../utils/Constants.ts';
import { BattleData, BattleResult } from '../utils/Types.ts';
import { NetworkSystem } from '../systems/NetworkSystem.ts';
import { ParticleSystem } from '../systems/ParticleSystem.ts';
import { AudioSystem } from '../systems/AudioSystem.ts';

export class BattleScene extends Phaser.Scene {
  private networkSystem!: NetworkSystem;
  private particleSystem!: ParticleSystem;
  private audioSystem!: AudioSystem;
  private battleData!: BattleData;
  private opponentName: string = '';
  private selectedChoice: KeyType | null = null;
  private opponentChoice: KeyType | null = null;
  private timeRemaining: number = GAMEPLAY_CONFIG.BATTLE_SELECTION_TIME;
  
  // UI Elements
  private backgroundOverlay!: Phaser.GameObjects.Rectangle;
  private battleContainer!: Phaser.GameObjects.Container;
  private timerText!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private choiceButtons!: Phaser.GameObjects.Container;
  private resultContainer!: Phaser.GameObjects.Container;
  
  // Choice buttons
  private rockButton!: Phaser.GameObjects.Container;
  private paperButton!: Phaser.GameObjects.Container;
  private scissorsButton!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: SCENE_KEYS.BATTLE });
  }

  init(data: any): void {
    this.battleData = data.battleData;
    this.opponentName = data.opponentName;
    this.selectedChoice = null;
    this.opponentChoice = null;
    this.timeRemaining = GAMEPLAY_CONFIG.BATTLE_SELECTION_TIME;
    
    console.log('⚔️ Starting battle with:', this.opponentName);
  }

  create(): void {
    // Get network system
    this.networkSystem = this.registry.get('networkManager');
    
    // Initialize particle system
    this.particleSystem = new ParticleSystem(this);
    
    // Initialize audio system
    this.audioSystem = new AudioSystem(this);
    
    // Setup battle UI
    this.createBattleUI();
    
    // Setup network listeners
    this.setupNetworkListeners();
    
    // Start selection timer
    this.startSelectionTimer();
    
    // Setup input
    this.setupInput();
  }

  private createBattleUI(): void {
    const { width, height } = this.cameras.main;
    
    // Semi-transparent background overlay
    this.backgroundOverlay = this.add.rectangle(
      width / 2, 
      height / 2, 
      width, 
      height, 
      COLORS.BLACK, 
      0.8
    );
    
    // Main battle container
    this.battleContainer = this.add.container(width / 2, height / 2);
    
    // Battle title
    const title = this.add.text(0, -200, 'BATTLE!', {
      fontSize: '48px',
      color: '#ff006e',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Opponent info
    const opponentInfo = this.add.text(0, -150, `VS ${this.opponentName}`, {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    // Timer
    this.timerText = this.add.text(0, -100, `Time: ${Math.ceil(this.timeRemaining / 1000)}s`, {
      fontSize: '20px',
      color: '#00f5ff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    // Instructions
    this.instructionText = this.add.text(0, -50, 'Choose your weapon!', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    // Choice buttons container
    this.choiceButtons = this.add.container(0, 50);
    this.createChoiceButtons();
    
    // Result container (hidden initially)
    this.resultContainer = this.add.container(0, 0);
    this.resultContainer.setVisible(false);
    
    // Add all to main container
    this.battleContainer.add([
      title, 
      opponentInfo, 
      this.timerText, 
      this.instructionText, 
      this.choiceButtons,
      this.resultContainer
    ]);
    
    // Entrance animation with particle effects
    this.battleContainer.setScale(0);
    this.tweens.add({
      targets: this.battleContainer,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: 'Back.easeOut'
    });
    
    // Create dramatic entrance effect
    this.particleSystem.createBattleClash({ x: width / 2, y: height / 2 });
  }

  private createChoiceButtons(): void {
    // Rock button
    this.rockButton = this.createChoiceButton(-120, 0, 'ROCK', KeyType.ROCK, COLORS.ROCK_COLOR);
    
    // Paper button
    this.paperButton = this.createChoiceButton(0, 0, 'PAPER', KeyType.PAPER, COLORS.PAPER_COLOR);
    
    // Scissors button
    this.scissorsButton = this.createChoiceButton(120, 0, 'SCISSORS', KeyType.SCISSORS, COLORS.SCISSORS_COLOR);
    
    this.choiceButtons.add([this.rockButton, this.paperButton, this.scissorsButton]);
  }

  private createChoiceButton(x: number, y: number, text: string, choice: KeyType, color: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    
    // Background circle
    const bg = this.add.circle(0, 0, 40, color, 0.8);
    bg.setStrokeStyle(3, COLORS.WHITE);
    
    // Icon (simplified representation)
    let icon: Phaser.GameObjects.Shape;
    switch (choice) {
      case KeyType.ROCK:
        icon = this.add.triangle(0, 0, 0, 20, -15, -10, 15, -10, COLORS.WHITE);
        break;
      case KeyType.PAPER:
        icon = this.add.rectangle(0, 0, 20, 25, COLORS.WHITE);
        break;
      case KeyType.SCISSORS:
        icon = this.add.star(0, 0, 4, 8, 15, COLORS.WHITE);
        break;
      default:
        icon = this.add.circle(0, 0, 10, COLORS.WHITE);
    }
    
    // Label
    const label = this.add.text(0, 60, text, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    container.add([bg, icon, label]);
    container.setSize(80, 80);
    container.setInteractive({ useHandCursor: true });
    
    // Hover effects
    container.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 150
      });
      bg.setStrokeStyle(3, COLORS.ACCENT_CYAN);
    });
    
    container.on('pointerout', () => {
      if (this.selectedChoice !== choice) {
        this.tweens.add({
          targets: container,
          scaleX: 1,
          scaleY: 1,
          duration: 150
        });
        bg.setStrokeStyle(3, COLORS.WHITE);
      }
    });
    
    // Selection
    container.on('pointerdown', () => {
      this.selectChoice(choice);
    });
    
    return container;
  }

  private selectChoice(choice: KeyType): void {
    if (this.selectedChoice) return; // Already selected
    
    this.selectedChoice = choice;
    console.log('⚔️ Selected:', choice);
    
    // Create selection effect
    const { width, height } = this.cameras.main;
    this.particleSystem.createKeySparkle({ x: width / 2, y: height / 2 + 50 }, this.getChoiceColor(choice));
    
    // Send choice to server
    this.networkSystem.sendBattleChoice(this.battleData.id, choice);
    
    // Update UI
    this.updateChoiceButtons();
    this.instructionText.setText('Waiting for opponent...');
  }

  private updateChoiceButtons(): void {
    // Disable all buttons and highlight selected
    [this.rockButton, this.paperButton, this.scissorsButton].forEach((button, index) => {
      const choices = [KeyType.ROCK, KeyType.PAPER, KeyType.SCISSORS];
      const choice = choices[index];
      const bg = button.list[0] as Phaser.GameObjects.Arc;
      
      if (this.selectedChoice === choice) {
        // Highlight selected
        bg.setStrokeStyle(5, COLORS.ACCENT_CYAN);
        button.setScale(1.2);
      } else {
        // Dim unselected
        button.setAlpha(0.5);
        button.disableInteractive();
      }
    });
  }

  private startSelectionTimer(): void {
    this.time.addEvent({
      delay: 100, // Update every 100ms
      callback: () => {
        this.timeRemaining -= 100;
        this.timerText.setText(`Time: ${Math.ceil(this.timeRemaining / 1000)}s`);
        
        // Change color as time runs out
        if (this.timeRemaining <= 3000) {
          this.timerText.setColor('#ff006e');
        }
        
        // Auto-select if time runs out
        if (this.timeRemaining <= 0 && !this.selectedChoice) {
          this.selectChoice(KeyType.ROCK); // Default to rock
        }
        
        // Play countdown sound at 3, 2, 1
        if (this.timeRemaining === 3000 || this.timeRemaining === 2000 || this.timeRemaining === 1000) {
          this.audioSystem.playBattleCountdown();
        }
      },
      repeat: Math.ceil(this.timeRemaining / 100)
    });
  }

  private setupNetworkListeners(): void {
    this.networkSystem.on('battleResult', this.handleBattleResult, this);
  }

  private handleBattleResult(result: BattleResult): void {
    if (result.battleId !== this.battleData.id) return;
    
    console.log('⚔️ Battle result received:', result);
    
    // Get opponent choice
    const localPlayerId = this.networkSystem.getPlayerId();
    this.opponentChoice = Object.entries(result.choices)
      .find(([playerId]) => playerId !== localPlayerId)?.[1] as KeyType || KeyType.ROCK;
    
    // Show result
    this.showBattleResult(result);
  }

  private showBattleResult(result: BattleResult): void {
    // Hide choice buttons
    this.choiceButtons.setVisible(false);
    this.timerText.setVisible(false);
    this.instructionText.setVisible(false);
    
    // Show choices
    const localPlayerId = this.networkSystem.getPlayerId();
    const won = result.winner === localPlayerId;
    
    // Result text
    const resultText = this.add.text(0, -50, won ? 'VICTORY!' : 'DEFEAT!', {
      fontSize: '36px',
      color: won ? '#00ff87' : '#ff006e',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Choice display
    const choiceDisplay = this.add.text(0, 0, 
      `You: ${this.selectedChoice?.toUpperCase()} vs ${this.opponentChoice?.toUpperCase()} :${this.opponentName}`, {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    // Key transfer info
    let transferText = '';
    if (result.keyTransfers.length > 0) {
      const transfer = result.keyTransfers[0];
      if (transfer.toPlayer === localPlayerId) {
        transferText = `You gained a ${transfer.keyType} key!`;
      } else {
        transferText = `You lost a ${transfer.keyType} key!`;
      }
    }
    
    const transferInfo = this.add.text(0, 30, transferText, {
      fontSize: '14px',
      color: '#00f5ff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    // Continue button
    const continueBtn = this.createMenuButton(0, 80, 'CONTINUE', () => {
      this.exitBattle();
    });
    
    this.resultContainer.add([resultText, choiceDisplay, transferInfo, continueBtn]);
    this.resultContainer.setVisible(true);
    
    // Entrance animation for result
    this.resultContainer.setAlpha(0);
    this.tweens.add({
      targets: this.resultContainer,
      alpha: 1,
      duration: 500
    });
    
    // Create result effect
    const { width, height } = this.cameras.main;
    if (won) {
      this.particleSystem.createVictoryCelebration({ x: width / 2, y: height / 2 });
      this.audioSystem.playBattleWin();
    } else {
      this.particleSystem.createEliminationEffect({ x: width / 2, y: height / 2 }, COLORS.ACCENT_PINK);
      this.audioSystem.playBattleLose();
    }
    
    // Auto-continue after 5 seconds
    this.time.delayedCall(5000, () => {
      this.exitBattle();
    });
  }

  private createMenuButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    
    const bg = this.add.rectangle(0, 0, 150, 40, COLORS.SECONDARY);
    bg.setStrokeStyle(2, COLORS.ACCENT_CYAN, 0.5);
    
    const label = this.add.text(0, 0, text, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    container.add([bg, label]);
    container.setSize(150, 40);
    container.setInteractive({ useHandCursor: true });
    
    container.on('pointerover', () => {
      bg.setFillStyle(COLORS.ACCENT_CYAN, 0.2);
    });
    
    container.on('pointerout', () => {
      bg.setFillStyle(COLORS.SECONDARY);
    });
    
    container.on('pointerdown', callback);
    
    return container;
  }

  private exitBattle(): void {
    // Exit animation
    this.tweens.add({
      targets: this.battleContainer,
      scaleX: 0,
      scaleY: 0,
      duration: 300,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.scene.stop();
        this.scene.resume(SCENE_KEYS.GAME);
      }
    });
  }

  private setupInput(): void {
    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-ONE', () => {
      if (!this.selectedChoice) this.selectChoice(KeyType.ROCK);
    });
    
    this.input.keyboard?.on('keydown-TWO', () => {
      if (!this.selectedChoice) this.selectChoice(KeyType.PAPER);
    });
    
    this.input.keyboard?.on('keydown-THREE', () => {
      if (!this.selectedChoice) this.selectChoice(KeyType.SCISSORS);
    });
    
    // ESC to forfeit (auto-select rock)
    this.input.keyboard?.on('keydown-ESC', () => {
      if (!this.selectedChoice) this.selectChoice(KeyType.ROCK);
    });
  }

  private getChoiceColor(choice: KeyType): number {
    switch (choice) {
      case KeyType.ROCK: return COLORS.ROCK_COLOR;
      case KeyType.PAPER: return COLORS.PAPER_COLOR;
      case KeyType.SCISSORS: return COLORS.SCISSORS_COLOR;
      default: return COLORS.WHITE;
    }
  }

  destroy(): void {
    // Remove network listeners
    this.networkSystem.off('battleResult', this.handleBattleResult, this);
    
    // Clean up particle system
    if (this.particleSystem) {
      this.particleSystem.destroy();
    }
    
    // Clean up audio system
    if (this.audioSystem) {
      this.audioSystem.destroy();
    }
    
    super.destroy();
  }
}