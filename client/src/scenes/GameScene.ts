import Phaser from 'phaser';
import { 
  SCENE_KEYS, 
  GAME_CONFIG, 
  GAMEPLAY_CONFIG, 
  COLORS, 
  KeyType,
  DoorType,
  DEBUG_CONFIG, 
  PlayerStatus 
} from '../utils/Constants.ts';
import { TileType } from '../utils/Types.ts';
import { 
  MazeData, 
  PlayerData, 
  Vector2, 
  InputState 
} from '../utils/Types.ts';
import { NetworkSystem } from '../systems/NetworkSystem.ts';
import { ParticleSystem } from '../systems/ParticleSystem.ts';
import { AudioSystem } from '../systems/AudioSystem.ts';
import { Player } from '../entities/Player.ts';
import { PowerUp, PowerUpManager } from '../entities/PowerUp.ts';
import { MazeGenerator, MazeAlgorithm } from '../utils/MazeGenerator.ts';

export class GameScene extends Phaser.Scene {
  // Core systems
  private networkSystem!: NetworkSystem;
  private particleSystem!: ParticleSystem;
  private audioSystem!: AudioSystem;
  private players: Map<string, Player> = new Map();
  private localPlayer!: Player;
  private maze!: MazeData;
  
  // Game objects
  private mazeLayer!: Phaser.Tilemaps.TilemapLayer;
  private keysGroup!: Phaser.Physics.Arcade.Group;
  private doorsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private portalDoorsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private powerUpManager!: PowerUpManager;
  // Physics colliders that we need to recreate on teleport
  private mazeCollider?: Phaser.Physics.Arcade.Collider;
  private keysOverlap?: Phaser.Physics.Arcade.Collider;
  private doorsCollider?: Phaser.Physics.Arcade.Collider;
  private portalOverlap?: Phaser.Physics.Arcade.Collider;
  
  // Input and movement
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: { [key: string]: Phaser.Input.Keyboard.Key };
  private currentInput: InputState = {
    movement: { x: 0, y: 0 },
    actions: new Set(),
    timestamp: 0
  };
  
  // UI elements (now handled in HTML/CSS)
  
  // Game state
  private gameStarted: boolean = false;
  // private lastNetworkUpdate: number = 0;
  private networkUpdateRate: number = 1000 / 30; // 30Hz

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  init(data: any): void {
    console.log('🎮 GameScene: Initializing with data:', data);
    
    // Get match data from menu and ensure proper defaults
    this.maze = data.maze || {
      id: 'default',
      width: GAME_CONFIG.MAZE_WIDTH,
      height: GAME_CONFIG.MAZE_HEIGHT,
      layout: [],
      spawnPoints: [],
      keySpawns: [],
      doorPositions: [],
      exitPosition: { x: GAME_CONFIG.MAZE_WIDTH - 2, y: GAME_CONFIG.MAZE_HEIGHT - 2 },
      theme: 'default'
    };

    // Ensure maze uses optimal dimensions for 32x21 maze
    if (!this.maze.width || this.maze.width < 32) this.maze.width = GAME_CONFIG.MAZE_WIDTH;
    if (!this.maze.height || this.maze.height < 21) this.maze.height = GAME_CONFIG.MAZE_HEIGHT;
    
    // Get network system
    this.networkSystem = this.registry.get('networkManager');
    
    // Clear existing players
    this.players.clear();
  }

  create(): void {
    console.log('🎮 GameScene: Creating game world...');
    
    // Create maze
    this.createMaze();
    
    // Setup physics
    this.setupPhysics();
    
    // Create initial players
    this.createPlayers();
    
    // Setup input
    this.setupInput();
    
    // Create HUD
    this.createHUD();
    
    // Setup camera
    this.setupCamera();
    
    // Setup network events
    this.setupNetworkEvents();
    
    // Initialize particle system
    this.particleSystem = new ParticleSystem(this);
    
    // Initialize audio system
    this.audioSystem = new AudioSystem(this);
    
    // Initialize power-up system
    this.setupPowerUps();
    
    // Start game
    this.startGame();
  }

  private createMaze(): void {
    console.log('🏗️ Creating maze with data:', {
      width: this.maze.width,
      height: this.maze.height,
      layoutSize: this.maze.layout?.length || 0,
      sampleLayout: this.maze.layout?.slice(0, 3)?.map(row => row?.slice(0, 3))
    });

    // Generate maze if none exists or if it's empty
    if (!this.maze.layout || this.maze.layout.length === 0) {
      console.log('🎲 Generating new maze using MazeGenerator');
      
      const generator = new MazeGenerator();
      const generatedMaze = generator.generateMaze({
        width: this.maze.width,
        height: this.maze.height,
        algorithm: MazeAlgorithm.RECURSIVE_BACKTRACKING, // Available: RECURSIVE_BACKTRACKING, CELLULAR_AUTOMATA, BINARY_TREE, PERLIN_CAVES
        minRoomSize: 3,
        maxRoomSize: 7,
        roomCount: 2,
        density: 0.45, // For cellular automata (0.4-0.5 works well)
        iterations: 5   // For cellular automata smoothing
      });

      // Update the maze data with generated content
      this.maze.layout = generatedMaze.layout;
      this.maze.spawnPoints = generatedMaze.spawnPoints;
      this.maze.keySpawns = generatedMaze.keySpawns;
      this.maze.doorPositions = generatedMaze.doorPositions;
      this.maze.exitPosition = generatedMaze.exitPosition;

      console.log('✅ Maze generated successfully:', {
        spawnPoints: this.maze.spawnPoints.length,
        keySpawns: this.maze.keySpawns.length,
        doorPositions: this.maze.doorPositions.length,
        exitPosition: this.maze.exitPosition
      });
      
      // Debug: Check if doors were actually generated
      console.log('🚪 Door positions after generation:', this.maze.doorPositions);
      if (this.maze.doorPositions.length === 0) {
        console.warn('⚠️ WARNING: No doors were generated by MazeGenerator!');
        console.log('🔍 Checking maze layout for door tiles...');
        let doorTileCount = 0;
        for (let y = 0; y < this.maze.layout.length; y++) {
          for (let x = 0; x < this.maze.layout[y].length; x++) {
            if (this.maze.layout[y][x] === TileType.DOOR) {
              doorTileCount++;
              console.log(`🚪 Found door tile at (${x}, ${y})`);
            }
          }
        }
        console.log(`🔍 Total door tiles in layout: ${doorTileCount}`);
      }

      // Debug: Log first few rows of the maze layout
      console.log('🗺️ Maze layout preview (first 5 rows):');
      for (let y = 0; y < Math.min(5, this.maze.layout.length); y++) {
        console.log(`Row ${y}:`, this.maze.layout[y].slice(0, 10));
      }
    } else {
      console.log('🗺️ Using existing maze layout');
      console.log('🚪 Existing door positions:', this.maze.doorPositions);
    }

    // Create tilemap
    const map = this.make.tilemap({ 
      data: this.maze.layout, 
      tileWidth: GAME_CONFIG.TILE_SIZE, 
      tileHeight: GAME_CONFIG.TILE_SIZE 
    });
    
    // Add tileset using the combined maze tileset
    const tileset = map.addTilesetImage('tiles', 'maze_tileset');
    
    // Create layer
    this.mazeLayer = map.createLayer(0, tileset!, 0, 0)!;
    
    // Set maze layer depth to ensure doors are rendered above it
    this.mazeLayer.setDepth(0);
    
    // Set collisions for walls (exclude EMPTY, FLOOR, DOOR from collision)
    this.mazeLayer.setCollisionByExclusion([TileType.EMPTY, TileType.FLOOR, TileType.DOOR]);
    
    console.log('🎯 Collision exclusion set for tiles:', [TileType.EMPTY, TileType.FLOOR, TileType.DOOR]);
    console.log('🎯 Maze layer depth set to:', this.mazeLayer.depth);
    
    // Create world bounds
    this.physics.world.setBounds(
      0, 0, 
      this.maze.width * GAME_CONFIG.TILE_SIZE, 
      this.maze.height * GAME_CONFIG.TILE_SIZE
    );
    
    // Note: Spawn points, key spawns, and door positions are now handled by MazeGenerator
    // Fallbacks are no longer needed as the generator ensures proper placement
    
    console.log(`🗺️ Created maze: ${this.maze.width}x${this.maze.height} with:`, {
      spawnPoints: this.maze.spawnPoints.length,
      keySpawns: this.maze.keySpawns.length,
      doorPositions: this.maze.doorPositions.length
    });
  }

  private setupPhysics(): void {
    console.log('🎮 Setting up physics systems...');
    
    // Create groups for game objects
    this.keysGroup = this.physics.add.group();
    this.doorsGroup = this.physics.add.staticGroup();
    this.portalDoorsGroup = this.physics.add.staticGroup();
    
    // Log maze data before spawning
    console.log('🗺️ Maze data:', {
      width: this.maze.width,
      height: this.maze.height,
      layout: this.maze.layout,
      spawnPoints: this.maze.spawnPoints,
      keySpawns: this.maze.keySpawns,
      doorPositions: this.maze.doorPositions
    });
    
    // Spawn keys
    this.spawnKeys();
    
    // Spawn doors
    this.spawnDoors();
    
    // Log initial game state
    console.log('🎯 Initial game state:', {
      keyCount: this.keysGroup.children.size,
      normalDoorCount: this.doorsGroup.children.size,
      portalDoorCount: this.portalDoorsGroup.children.size,
      playerCount: this.players.size
    });
    
    // Debug: Log door group details
    console.log('🚪 Door groups details:');
    this.doorsGroup.children.each((door: any) => {
      console.log(`  - NORMAL Door: ${door.getData('doorId')}, Position: (${door.x}, ${door.y})`);
      return true;
    });
    this.portalDoorsGroup.children.each((door: any) => {
      console.log(`  - PORTAL Door: ${door.getData('doorId')}, Position: (${door.x}, ${door.y})`);
      return true;
    });
  }

  private spawnKeys(): void {
    console.log('🎲 Starting key spawning system...');
    
    // Define key types
    const keyTypes = [KeyType.ROCK, KeyType.PAPER, KeyType.SCISSORS];
    console.log('📋 Available key types:', keyTypes);
    
    // Initial spawn of one of each type
    keyTypes.forEach((keyType, index) => {
      const spawn = this.getRandomSpawnPoint();
      if (spawn) {
        this.spawnSingleKey(spawn, keyType, `initial_${index}`);
        console.log(`🔑 Spawned initial ${keyType} key at (${spawn.x}, ${spawn.y})`);
      } else {
        console.warn(`⚠️ Could not find spawn point for initial ${keyType} key`);
      }
    });

    // Create a timer for periodic key spawning
    const spawnTimer = this.time.addEvent({
      delay: 3000, // Check every 3 seconds
      callback: () => {
        // Count current keys
        let keyCount = 0;
        this.keysGroup.children.each(() => { keyCount++; return true; });
        console.log(`📊 Current key count: ${keyCount}`);
        
        // If we have less than minimum keys, spawn a new one
        if (keyCount < 5) { // Maintain at least 5 keys
          console.log('🎲 Attempting to spawn new key...');
          this.spawnRandomKey();
        }
      },
      loop: true,
      startAt: 0
    });
    
    // Store timer reference
    this.registry.set('keySpawnTimer', spawnTimer);
  }

  private getRandomSpawnPoint(): Vector2 | null {
    console.log('🔍 Searching for spawn point...');
    
    // Debug maze layout
    console.log('🗺️ Maze layout:', {
      dimensions: `${this.maze.layout.length}x${this.maze.layout[0]?.length}`,
      sample: this.maze.layout.slice(0, 3).map(row => row.slice(0, 3))
    });
    
    const validPositions: Vector2[] = [];
    
    // Scan the entire maze for valid floor tiles
    for (let y = 0; y < this.maze.layout.length; y++) {
      for (let x = 0; x < this.maze.layout[y].length; x++) {
        // Check if it's a floor-like tile (treat legacy indices 2/3/6 as floor)
        const tileType = this.maze.layout[y][x];
        if (tileType === TileType.FLOOR || tileType === TileType.SPAWN || tileType === TileType.EXIT) {
          const worldX = x * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
          const worldY = y * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
          
          // Check if position is not occupied by a key
          let isOccupied = false;
          this.keysGroup.children.each((key: any) => {
            const distance = Phaser.Math.Distance.Between(key.x, key.y, worldX, worldY);
            if (distance < GAME_CONFIG.TILE_SIZE) {
              isOccupied = true;
            }
            return true;
          });
          
          // Check distance from players (reduced distance check)
          let tooCloseToPlayer = false;
          this.players.forEach(player => {
            const distance = Phaser.Math.Distance.Between(player.x, player.y, worldX, worldY);
            if (distance < GAME_CONFIG.TILE_SIZE * 2) { // 2 tiles away from players
              tooCloseToPlayer = true;
            }
          });
          
          // Check if it's not too close to doors (reduced distance check)
          let tooCloseToDoor = false;
          this.doorsGroup.children.each((door: any) => {
            const distance = Phaser.Math.Distance.Between(door.x, door.y, worldX, worldY);
            if (distance < GAME_CONFIG.TILE_SIZE) { // 1 tile away from doors
              tooCloseToDoor = true;
            }
            return true;
          });
          
          if (!isOccupied && !tooCloseToPlayer && !tooCloseToDoor) {
            validPositions.push({ x, y });
          }
        }
      }
    }
    
    if (validPositions.length === 0) {
      console.warn('⚠️ No valid spawn positions found');
      return null;
    }
    
    // Pick a random valid position
    const randomPosition = validPositions[Math.floor(Math.random() * validPositions.length)];
    console.log(`📍 Found spawn point at (${randomPosition.x}, ${randomPosition.y}), out of ${validPositions.length} valid positions`);
    return randomPosition;
  }

  private spawnRandomKey(): void {
    const keyTypes = [KeyType.ROCK, KeyType.PAPER, KeyType.SCISSORS];
    
    // Count existing keys of each type
    const keyTypeCounts = new Map<KeyType, number>();
    keyTypes.forEach(type => keyTypeCounts.set(type, 0));
    
    this.keysGroup.children.each((key: any) => {
      const type = key.getData('keyType');
      keyTypeCounts.set(type, (keyTypeCounts.get(type) || 0) + 1);
      return true;
    });
    
    // Find the least common key type
    let minCount = Infinity;
    let selectedType = keyTypes[0];
    keyTypeCounts.forEach((count, type) => {
      if (count < minCount) {
        minCount = count;
        selectedType = type;
      }
    });
    
    console.log('📊 Current key distribution:', 
      Array.from(keyTypeCounts.entries())
        .map(([type, count]) => `${type}: ${count}`)
        .join(', ')
    );
    
    const spawn = this.getRandomSpawnPoint();
    if (spawn) {
      const keyId = `random_${Date.now()}`;
      this.spawnSingleKey(spawn, selectedType, keyId);
      console.log(`🔑 Spawned random ${selectedType} key at (${spawn.x}, ${spawn.y})`);
    } else {
      console.warn('⚠️ Could not find valid spawn point for random key');
    }
  }
  
  private spawnSingleKey(spawn: Vector2, keyType: KeyType, keyId: string | number): void {
    try {
      console.log(`🎯 Attempting to spawn ${keyType} key at position:`, spawn);
      
      // Calculate pixel position
      const x = spawn.x * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
      const y = spawn.y * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
      
      // Validate position
      if (isNaN(x) || isNaN(y)) {
        console.error('❌ Invalid spawn position:', { spawn, x, y });
        return;
      }
      
      // Create key sprite
      const keySprite = this.getKeyTexture(keyType);
      const key = this.physics.add.sprite(x, y, keySprite);
      
      // Set key data
      key.setData('keyType', keyType);
      key.setData('keyId', `key_${keyId}`);
      
      // Add glow effect
      key.setTint(this.getKeyColor(keyType));
      
      // Add emoji indicator
      const emoji = this.getKeyEmoji(keyType);
      const keyText = this.add.text(0, 0, emoji, {
        fontSize: '24px', // Increased size for better visibility
        fontFamily: 'Arial, sans-serif'
      }).setOrigin(0.5);
      
      // Create container and add key and text
      const container = this.add.container(x, y, [keyText]);
      
      // Store container reference on the key sprite for cleanup
      key.setData('container', container);
      
      // Floating animation
      this.tweens.add({
        targets: container,
        y: container.y - 8, // Slightly larger float distance
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      // Add to physics group
      this.keysGroup.add(key);
      
      // Enable physics
      key.setCollideWorldBounds(true);
      key.setPushable(false);
      
      console.log(`✅ Successfully spawned ${keyType} key at (${x}, ${y})`);
      console.log('📊 Current key count:', this.keysGroup.children.size);
      
    } catch (error) {
      console.error('❌ Error spawning key:', error);
    }
  }

  private getRandomKeyRequirements(count: number): KeyType[] {
    const keyTypes = [KeyType.ROCK, KeyType.PAPER, KeyType.SCISSORS];
    const requirements: KeyType[] = [];
    
    // Randomly select 'count' different key types
    while (requirements.length < count && keyTypes.length > 0) {
      const randomIndex = Math.floor(Math.random() * keyTypes.length);
      const selectedType = keyTypes.splice(randomIndex, 1)[0];
      requirements.push(selectedType);
    }
    
    return requirements;
  }

  private getKeyEmoji(keyType: KeyType): string {
    switch (keyType) {
      case KeyType.ROCK: return '🪨';
      case KeyType.PAPER: return '📄';
      case KeyType.SCISSORS: return '✂️';
      default: return '❓';
    }
  }

  private spawnDoors(): void {
    console.log('🚪 Starting door spawning...');
    console.log('🗺️ Door positions from maze:', this.maze.doorPositions);
    console.log('🎲 Door positions count:', this.maze.doorPositions.length);
    
    const doorTypes = [KeyType.ROCK, KeyType.PAPER, KeyType.SCISSORS];
    
    if (this.maze.doorPositions.length === 0) {
      console.warn('⚠️ No door positions found in maze! This might be the issue.');
      console.log('🔍 Maze layout sample:', this.maze.layout?.slice(0, 5)?.map(row => row?.slice(0, 10)));
      return;
    }
    
    // Guarantee exactly ONE portal per map by selecting a single index
    const portalIndex = Math.floor(Math.random() * this.maze.doorPositions.length);
    console.log(`🌀 Guaranteed single portal will be at index ${portalIndex}`);

    this.maze.doorPositions.forEach((doorPos, index) => {
      console.log(`🔍 Processing door position ${index}: (${doorPos.x}, ${doorPos.y})`);
      
      // Determine door type: exactly one Portal (P), others Normal (D)
      const isPortal = index === portalIndex;
      const doorType = isPortal ? DoorType.PORTAL : DoorType.NORMAL;
      
      console.log(`🎯 Door ${index} will be: ${isPortal ? 'PORTAL' : 'NORMAL'}`);
      
      // For normal doors, use the key type system
      // For portal doors, use a special portal texture (fallback to door_rock if portal_door doesn't exist)
      const doorSprite = isPortal ? 'door_rock' : this.getDoorTexture(doorTypes[index % doorTypes.length]);
      
      console.log(`🖼️ Using texture: ${doorSprite}`);
      
      const door = this.physics.add.staticSprite(
        doorPos.x * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2,
        doorPos.y * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2,
        doorSprite
      );
      
      console.log(`📍 Door sprite created at world position: (${door.x}, ${door.y})`);
      
      // Set door properties
      door.setData('doorType', doorType);
      door.setData('doorId', `door_${index}`);
      door.setData('isOpen', false);
      door.setData('isPortal', isPortal);
      
      // For portal doors, set random key requirements (2 random keys)
      if (isPortal) {
        const randomKeys = this.getRandomKeyRequirements(2);
        door.setData('requirements', randomKeys);
        door.setData('targetMap', `map_${Math.floor(Math.random() * 1000)}`); // Random map ID
        door.setTint(0x8000ff); // Purple tint for portal doors
        
        // Set depth to ensure portal doors are visible above maze
        door.setDepth(10);

        // Add a visible 'P' label above the portal door for clarity
        const label = this.add.text(door.x, door.y, 'P', {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#ffffff'
        }).setOrigin(0.5).setDepth(11);
        door.setData('label', label);
        
        console.log(`🚪 Created portal door at (${doorPos.x}, ${doorPos.y}):`, {
          doorId: `door_${index}`,
          requirements: randomKeys,
          targetMap: `map_${Math.floor(Math.random() * 1000)}`,
          tint: '0x8000ff (purple)',
          position: { x: door.x, y: door.y },
          texture: doorSprite,
          depth: door.depth,
          visible: door.visible,
          alpha: door.alpha,
          scale: { x: door.scaleX, y: door.scaleY }
        });
      } else {
        // Normal doors use the existing key type system
        const keyType = doorTypes[index % doorTypes.length];
        door.setData('symbol', keyType);
        door.setData('requirements', [keyType]);
        door.setTint(this.getKeyColor(keyType));
        
        // Set depth for normal doors too
        door.setDepth(10);
        
        console.log(`🚪 Created normal door at (${doorPos.x}, ${doorPos.y}):`, {
          doorId: `door_${index}`,
          symbol: keyType,
          requirements: [keyType],
          tint: this.getKeyColor(keyType),
          position: { x: door.x, y: door.y },
          texture: doorSprite,
          depth: door.depth,
          visible: door.visible,
          alpha: door.alpha,
          scale: { x: door.scaleX, y: door.scaleY }
        });
      }
      
      // Doors are static bodies; they won't move when collided with
      
      if (isPortal) {
        // Non-blocking: handled via overlap
        if (door.body) {
          const body = door.body as Phaser.Physics.Arcade.StaticBody;
          body.checkCollision.none = true;
        }
        this.portalDoorsGroup.add(door);
        console.log(`✅ Door ${index} added to portalDoorsGroup. Group size now: ${this.portalDoorsGroup.children.size}`);
      } else {
        this.doorsGroup.add(door);
        console.log(`✅ Door ${index} added to doorsGroup. Group size now: ${this.doorsGroup.children.size}`);
      }
    });
    
    // With the guarantee above, we expect exactly 1 portal
    const normalCount = this.doorsGroup.children.size;
    const portalCount = this.portalDoorsGroup.children.size;
    console.log(`🚪 Spawned doors (Normal: ${normalCount}, Portal: ${portalCount})`);
    
    // Final verification
    console.log('🔍 Final door group verification:');
    this.doorsGroup.children.each((door: any) => {
      console.log(`  - Door: ${door.getData('doorId')}, Type: ${door.getData('doorType')}, Portal: ${door.getData('isPortal')}, Position: (${door.x}, ${door.y}), Visible: ${door.visible}, Alpha: ${door.alpha}, Depth: ${door.depth}, Scale: (${door.scaleX}, ${door.scaleY})`);
      return true;
    });
    this.portalDoorsGroup.children.each((door: any) => {
      console.log(`  - Portal Door: ${door.getData('doorId')}, Type: ${door.getData('doorType')}, Portal: ${door.getData('isPortal')}, Position: (${door.x}, ${door.y}), Visible: ${door.visible}, Alpha: ${door.alpha}, Depth: ${door.depth}, Scale: (${door.scaleX}, ${door.scaleY})`);
      return true;
    });
    
    // Check camera bounds and door visibility
    const camera = this.cameras.main;
    console.log('📷 Camera bounds:', {
      x: camera.scrollX,
      y: camera.scrollY,
      width: camera.width,
      height: camera.height,
      worldView: camera.worldView
    });
    
    // Check if doors are within camera bounds
    this.doorsGroup.children.each((door: any) => {
      const inView = camera.worldView.contains(door.x, door.y);
      console.log(`🔍 Door ${door.getData('doorId')} in camera view: ${inView}, Position: (${door.x}, ${door.y})`);
      
      // Additional visibility debugging
      if (!inView) {
        console.log(`⚠️ Door ${door.getData('doorId')} is OUTSIDE camera view!`);
        console.log(`   Door world position: (${door.x}, ${door.y})`);
        console.log(`   Camera scroll: (${camera.scrollX}, ${camera.scrollY})`);
        console.log(`   Camera world view: (${camera.worldView.x}, ${camera.worldView.y}) to (${camera.worldView.x + camera.worldView.width}, ${camera.worldView.y + camera.worldView.height})`);
      }
      return true;
    });
    this.portalDoorsGroup.children.each((door: any) => {
      const inView = camera.worldView.contains(door.x, door.y);
      console.log(`🔍 Portal Door ${door.getData('doorId')} in camera view: ${inView}, Position: (${door.x}, ${door.y})`);
      if (!inView) {
        console.log(`⚠️ Portal Door ${door.getData('doorId')} is OUTSIDE camera view!`);
        console.log(`   Door world position: (${door.x}, ${door.y})`);
        console.log(`   Camera scroll: (${camera.scrollX}, ${camera.scrollY})`);
        console.log(`   Camera world view: (${camera.worldView.x}, ${camera.worldView.y}) to (${camera.worldView.x + camera.worldView.width}, ${camera.worldView.y + camera.worldView.height})`);
      }
      return true;
    });
    
    // Log maze dimensions for reference
    console.log('🗺️ Maze dimensions for reference:', {
      mazeWidth: this.maze.width * GAME_CONFIG.TILE_SIZE,
      mazeHeight: this.maze.height * GAME_CONFIG.TILE_SIZE,
      tileSize: GAME_CONFIG.TILE_SIZE,
      doorPositions: this.maze.doorPositions.map((pos, i) => ({
        index: i,
        tilePos: { x: pos.x, y: pos.y },
        worldPos: { 
          x: pos.x * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2,
          y: pos.y * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2
        }
      }))
    });
  }

  private createPlayers(): void {
    const matchData = this.registry.get('matchData');
    if (!matchData || !matchData.players) return;
    
    const localPlayerId = this.networkSystem.getPlayerId();
    
    matchData.players.forEach((playerData: PlayerData, index: number) => {
      const spawnPoint = this.maze.spawnPoints[index % this.maze.spawnPoints.length];
      const isLocal = playerData.id === localPlayerId;
      
      const player = new Player(
        this,
        spawnPoint.x * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2,
        spawnPoint.y * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2,
        playerData,
        isLocal
      );
      
      this.players.set(playerData.id, player);
      
      if (isLocal) {
        this.localPlayer = player;
      }
    });
    
    console.log(`👥 Created ${this.players.size} players`);
  }

  private setupInput(): void {
    // Cursor keys
    this.cursors = this.input.keyboard!.createCursorKeys();
    
    // WASD keys
    this.wasdKeys = this.input.keyboard!.addKeys('W,S,A,D') as { [key: string]: Phaser.Input.Keyboard.Key };
    
    // Additional keys
    this.input.keyboard!.on('keydown-SPACE', () => {
      this.currentInput.actions.add('interact');
    });
    
    this.input.keyboard!.on('keydown-ESC', () => {
      this.pauseGame();
    });
  }

  private createHUD(): void {
    // HUD is now handled in HTML/CSS - just set up update timers
    
    // Initialize HTML elements
    this.updateHTMLPlayerCount();
    this.updateHTMLKeyCount();
    this.updateHTMLTimer();
    if (DEBUG_CONFIG.SHOW_FPS) {
      this.updateHTMLDebugInfo();
    }
    
    // Update key count display every second
    this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.updateHTMLKeyCount();
      },
      loop: true,
      startAt: 0
    });
    
    // Update debug info if enabled
    if (DEBUG_CONFIG.SHOW_FPS) {
      this.time.addEvent({
        delay: 100, // Update every 100ms for smooth FPS display
        callback: () => {
          this.updateHTMLDebugInfo();
        },
        loop: true,
        startAt: 0
      });
    }
    
    // Update timer display
    this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.updateHTMLTimer();
        this.updateHTMLPlayerCount();
      },
      loop: true,
      startAt: 0
    });
  }
  
  private updateHTMLKeyCount(): void {
    const keyTypes = [KeyType.ROCK, KeyType.PAPER, KeyType.SCISSORS];
    const counts = new Map<KeyType, number>();
    keyTypes.forEach(type => counts.set(type, 0));
    
    this.keysGroup.children.each((key: any) => {
      const type = key.getData('keyType');
      counts.set(type, (counts.get(type) || 0) + 1);
      return true;
    });
    
    const keyCountElement = document.getElementById('key-count');
    if (keyCountElement) {
      keyCountElement.textContent = 
        `Keys: 🪨${counts.get(KeyType.ROCK)} 📄${counts.get(KeyType.PAPER)} ✂️${counts.get(KeyType.SCISSORS)}`;
    }
  }
  
  private updateHTMLDebugInfo(): void {
    const fpsElement = document.getElementById('fps-counter');
    const pingElement = document.getElementById('ping-counter');
    const playersElement = document.getElementById('player-count-debug');
    
    if (fpsElement) {
      fpsElement.textContent = `FPS: ${Math.round(this.game.loop.actualFps)}`;
    }
    
    if (pingElement) {
      try {
        const ping = this.networkSystem?.getPing() || 0;
        pingElement.textContent = `Ping: ${ping}ms`;
      } catch (error) {
        pingElement.textContent = `Ping: 0ms`;
      }
    }
    
    if (playersElement) {
      playersElement.textContent = `Players: ${this.players.size}`;
    }
  }
  
  private updateHTMLTimer(): void {
    const timerElement = document.getElementById('game-timer');
    if (timerElement) {
      // Use scene time since game started
      const gameTime = Math.floor(this.time.now / 1000);
      const minutes = Math.floor(gameTime / 60);
      const seconds = gameTime % 60;
      timerElement.textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }
  
  private updateHTMLPlayerCount(): void {
    const playerCountElement = document.getElementById('player-count');
    if (playerCountElement) {
      playerCountElement.textContent = `Players: ${this.players.size}/4`; // Assuming max 4 players
    }
  }

  private setupCamera(): void {
    // Calculate the maze dimensions
    const mazeWidth = this.maze.width * GAME_CONFIG.TILE_SIZE;
    const mazeHeight = this.maze.height * GAME_CONFIG.TILE_SIZE;
    
    // Set camera bounds to match maze exactly
    this.cameras.main.setBounds(0, 0, mazeWidth, mazeHeight);
    
    // Position camera to show as much maze as possible in the available game area
    if (mazeHeight <= GAME_CONFIG.HEIGHT) {
      // Maze fits completely - center it
      this.cameras.main.centerOn(mazeWidth / 2, mazeHeight / 2);
    } else {
      // Maze is taller than game area - position to show maximum area
      const visibleHeight = GAME_CONFIG.HEIGHT;
      this.cameras.main.centerOn(mazeWidth / 2, visibleHeight / 2);
    }
    
    // IMPORTANT: Don't start following the player immediately
    // This ensures the camera shows the entire maze area initially
    // The camera will be set to follow the player after a short delay
    
    console.log('📷 Enhanced camera setup:', {
      mazeSize: `${mazeWidth}x${mazeHeight}`,
      gameAreaSize: `${GAME_CONFIG.WIDTH}x${GAME_CONFIG.HEIGHT}`,
      cameraFits: mazeHeight <= GAME_CONFIG.HEIGHT,
      utilization: `${((Math.min(mazeHeight, GAME_CONFIG.HEIGHT) / GAME_CONFIG.HEIGHT) * 100).toFixed(1)}%`,
      initialCameraPosition: { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY }
    });
    
    // Start following the player after a short delay to ensure doors are visible initially
    if (this.localPlayer) {
      // Delay camera follow to allow doors to be visible first
      this.time.delayedCall(2000, () => {
        this.cameras.main.startFollow(this.localPlayer, true, 0.1, 0.1);
        console.log('📷 Camera now following player');
      });
    }
  }

  private setupNetworkEvents(): void {
    this.networkSystem.on('gameStateUpdate', this.handleGameStateUpdate, this);
    this.networkSystem.on('battleStarted', this.handleBattleStarted, this);
    this.networkSystem.on('playerEliminated', this.handlePlayerEliminated, this);
    this.networkSystem.on('gameEnded', this.handleGameEnded, this);
  }

  private setupPowerUps(): void {
    this.powerUpManager = new PowerUpManager(this);
  }

  private startGame(): void {
    this.gameStarted = true;
    
    // Setup collision detection
    this.setupCollisions();
    
    // Start network updates
    this.startNetworkUpdates();
    
    // Start power-up spawning
    this.powerUpManager.startSpawning();
    
    // Start ambient effects
    this.particleSystem.createAmbientParticles();
    
    // Start game music
    this.audioSystem.playMusic('bgm_game', { fadeIn: 2000 });
    
    console.log('🚀 Game started!');
  }

  private setupCollisions(): void {
    if (!this.localPlayer) return;
    
    // Clean existing colliders if re-initializing
    if (this.mazeCollider) this.mazeCollider.destroy();
    if (this.keysOverlap) this.keysOverlap.destroy();
    if (this.doorsCollider) this.doorsCollider.destroy();
    if (this.portalOverlap) this.portalOverlap.destroy();
    
    // Player vs maze walls
    this.mazeCollider = this.physics.add.collider(this.localPlayer, this.mazeLayer);
    
    // Player vs keys (overlap to collect)
    this.keysOverlap = this.physics.add.overlap(
      this.localPlayer,
      this.keysGroup,
      this.collectKey as unknown as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
    
    // Player vs doors (collider to BLOCK until opened)
    this.doorsCollider = this.physics.add.collider(
      this.localPlayer,
      this.doorsGroup,
      ((playerObj: Phaser.GameObjects.GameObject, doorObj: Phaser.GameObjects.GameObject) => {
        this.interactWithDoor(
          playerObj as unknown as Player,
          doorObj as Phaser.Physics.Arcade.Sprite
        );
      }) as unknown as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
    
    // Player vs portal doors (overlap to TRIGGER, not block)
    this.portalOverlap = this.physics.add.overlap(
      this.localPlayer,
      this.portalDoorsGroup,
      ((playerObj: Phaser.GameObjects.GameObject, doorObj: Phaser.GameObjects.GameObject) => {
        this.handlePortalDoor(
          playerObj as unknown as Player,
          doorObj as Phaser.Physics.Arcade.Sprite
        );
      }) as unknown as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
    
    // Player vs power-ups
    this.setupPowerUpCollisions();
  }

  private collectKey(player: Player, keySprite: Phaser.Physics.Arcade.Sprite): void {
    const keyType = keySprite.getData('keyType') as KeyType;
    // const keyId = keySprite.getData('keyId') as string;
    const container = keySprite.getData('container') as Phaser.GameObjects.Container;
    
    // Create sparkle effect
    const keyColor = this.getKeyColor(keyType);
    this.particleSystem.createKeySparkle({ x: keySprite.x, y: keySprite.y }, keyColor);
    
    // Play collection sound
    this.audioSystem.playKeyCollected(keyType, 
      { x: keySprite.x, y: keySprite.y }, 
      { x: this.localPlayer.x, y: this.localPlayer.y }
    );
    
    // Add key to player
    player.addKey(keyType);
    
    // Remove all tweens associated with the container
    this.tweens.killTweensOf(container);
    
    // Remove key visuals
    container.destroy(); // This removes the container and all its children (sprite and text)
    keySprite.destroy(); // Ensure the physics sprite is destroyed
    
    // Remove from physics group
    this.keysGroup.remove(keySprite, true, true);
    
    // Send to server
    // this.networkSystem.sendKeyCollection(keyId);
    
    console.log(`🔑 Collected ${keyType} key`);
  }

  private interactWithDoor(player: Player, doorSprite: Phaser.Physics.Arcade.Sprite): void {
    // const doorType = doorSprite.getData('doorType') as DoorType;
    const isOpen = doorSprite.getData('isOpen') as boolean;
    const isPortal = doorSprite.getData('isPortal') as boolean;
    
    // If already open, allow passage (disable body if still enabled)
    if (isOpen) {
      if (doorSprite.body) {
        (doorSprite.body as Phaser.Physics.Arcade.Body).enable = false;
      }
      return;
    }
    
    if (isPortal) {
      // Handle Portal Door (P) - requires 2 random keys
      this.handlePortalDoor(player, doorSprite);
    } else {
      // Handle Normal Door (D) - requires 1 specific key
      this.handleNormalDoor(player, doorSprite);
    }
  }

  private handleNormalDoor(player: Player, doorSprite: Phaser.Physics.Arcade.Sprite): void {
    const keyType = doorSprite.getData('symbol') as KeyType;
    
    // Check if player can pass through door (with keys or Ghost Walk power-up)
    if (player.canPassThroughDoor(keyType)) {
      // Remove key if used (Ghost Walk doesn't consume keys)
      if (player.hasKey(keyType)) {
        player.removeKey(keyType);
      }
      
      // Open door
      doorSprite.setData('isOpen', true);
      doorSprite.setAlpha(0.5);
      
      // Change door type after interaction (BEFORE removing from physics group)
      const doorTypes = [KeyType.ROCK, KeyType.PAPER, KeyType.SCISSORS];
      const currentTypeIndex = doorTypes.indexOf(keyType);
      const newType = doorTypes[(currentTypeIndex + 1) % doorTypes.length];
      
      // Update door visuals
      doorSprite.setData('symbol', newType);
      doorSprite.setTexture(this.getDoorTexture(newType));
      doorSprite.setTint(this.getKeyColor(newType));
      
      // Enhanced visual effect
      const doorColor = this.getKeyColor(keyType);
      this.particleSystem.createDoorBurst({ x: doorSprite.x, y: doorSprite.y }, doorColor);
      
      // Play door opening sound
      this.audioSystem.playDoorOpened(keyType,
        { x: doorSprite.x, y: doorSprite.y },
        { x: this.localPlayer.x, y: this.localPlayer.y }
      );
      
      // CRITICAL FIX: Remove maze collision at door position
      this.removeMazeCollisionAtDoor(doorSprite);
      
      // Disable door collision so player can pass (keep sprite visible)
      if (doorSprite.body) {
        const body = doorSprite.body as Phaser.Physics.Arcade.StaticBody;
        body.checkCollision.none = true;
      }
      
      console.log(`🚪 Opened normal ${keyType} door`);
    } else {
      // Play door locked sound
      this.audioSystem.playDoorLocked(
        { x: doorSprite.x, y: doorSprite.y },
        { x: this.localPlayer.x, y: this.localPlayer.y }
      );
      
      console.log(`🔒 Need ${keyType} key to open normal door`);
    }
  }

  private handlePortalDoor(player: Player, doorSprite: Phaser.Physics.Arcade.Sprite): void {
    const requirements = doorSprite.getData('requirements') as KeyType[];
    const targetMap = doorSprite.getData('targetMap') as string;
    
    // Check if player has all required keys
    const hasAllKeys = requirements.every(keyType => player.hasKey(keyType));
    
    if (hasAllKeys) {
      // Consume all required keys
      requirements.forEach(keyType => {
        if (player.hasKey(keyType)) {
          player.removeKey(keyType);
        }
      });
      
      // Open portal door
      doorSprite.setData('isOpen', true);
      doorSprite.setAlpha(0.5);
      
      // Enhanced visual effect for portal
      this.particleSystem.createDoorBurst({ x: doorSprite.x, y: doorSprite.y }, 0x8000ff);
      
      // Play portal opening sound
      this.audioSystem.playDoorOpened(KeyType.ROCK, // Use default sound for portal
        { x: doorSprite.x, y: doorSprite.y },
        { x: this.localPlayer.x, y: this.localPlayer.y }
      );
      
      // CRITICAL FIX: Remove maze collision at door position
      this.removeMazeCollisionAtDoor(doorSprite);
      
      // Remove portal label if present
      const label: Phaser.GameObjects.Text | undefined = doorSprite.getData('label');
      if (label) {
        label.destroy();
        doorSprite.setData('label', undefined);
      }

      // Disable door collision so player can pass (keep sprite visible)
      if (doorSprite.body) {
        const body = doorSprite.body as Phaser.Physics.Arcade.StaticBody;
        body.checkCollision.none = true;
      }
      
      console.log(`🌀 Opened portal door to ${targetMap}`);
      
      // Teleport player to a new generated map
      this.teleportToNewMap(targetMap);
      
    } else {
      // Play door locked sound - Fixed the bug where doorSprite.y was used instead of this.localPlayer.y
      this.audioSystem.playDoorLocked(
        { x: doorSprite.x, y: doorSprite.y },
        { x: this.localPlayer.x, y: this.localPlayer.y }
      );
      
      const missingKeys = requirements.filter(keyType => !player.hasKey(keyType));
      console.log(`🔒 Need ${missingKeys.join(', ')} keys to open portal door`);
    }
  }

  private removeMazeCollisionAtDoor(doorSprite: Phaser.Physics.Arcade.Sprite): void {
    // Convert door world position back to tile coordinates
    const tileX = Math.floor(doorSprite.x / GAME_CONFIG.TILE_SIZE);
    const tileY = Math.floor(doorSprite.y / GAME_CONFIG.TILE_SIZE);
    
    // Check if the tile coordinates are valid
    if (tileY >= 0 && tileY < this.maze.layout.length && 
        tileX >= 0 && tileX < this.maze.layout[tileY].length) {
      
      // Set the maze tile at door position to floor (2) to remove collision
      this.maze.layout[tileY][tileX] = 2;
      
      // Update the tilemap layer to reflect the change
      if (this.mazeLayer) {
        this.mazeLayer.putTileAt(2, tileX, tileY);
      }
      
      console.log(`🗺️ Removed maze collision at door position (${tileX}, ${tileY})`);
    }
  }

  /**
   * Generate a new maze and move the player into it.
   * Keeps the current player entity and networking intact while rebuilding the world.
   */
  private teleportToNewMap(targetMapId: string): void {
    console.log(`🗺️ Teleporting to new map: ${targetMapId}`);

    // Listen for fade out complete, then rebuild the world
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      // Destroy old tilemap layer
      if (this.mazeLayer) {
        this.mazeLayer.destroy();
      }

      // Clear keys and doors
      if (this.keysGroup) {
        this.keysGroup.clear(true, true);
      }
      if (this.doorsGroup) {
        this.doorsGroup.clear(true, true);
      }
      if (this.portalDoorsGroup) {
        this.portalDoorsGroup.clear(true, true);
      }

      // Generate a fresh maze
      const generator = new MazeGenerator();
      const generatedMaze = generator.generateMaze({
        width: this.maze.width,
        height: this.maze.height,
        algorithm: MazeAlgorithm.RECURSIVE_BACKTRACKING,
        minRoomSize: 3,
        maxRoomSize: 7,
        roomCount: 2,
        density: 0.45,
        iterations: 5
      });

      // Replace maze data
      this.maze = {
        id: targetMapId,
        width: generatedMaze.width,
        height: generatedMaze.height,
        layout: generatedMaze.layout,
        spawnPoints: generatedMaze.spawnPoints,
        keySpawns: generatedMaze.keySpawns,
        doorPositions: generatedMaze.doorPositions,
        exitPosition: generatedMaze.exitPosition,
        theme: generatedMaze.theme
      } as any; // keep shape consistent with MazeData used in scene

      // Rebuild maze and physics
      this.createMaze();

      // Respawn keys and doors in the new maze
      this.spawnKeys();
      this.spawnDoors();

      // Recreate colliders to bind to the new tilemap and groups
      this.setupCollisions();

      // Move player to a spawn point in the new map and ensure visibility & camera follow
      const spawn = this.getRandomSpawnPoint();
      if (spawn && this.localPlayer) {
        const worldX = spawn.x * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
        const worldY = spawn.y * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
        this.localPlayer.setPosition(worldX, worldY);
        if (this.localPlayer.body) {
          this.localPlayer.body.reset(worldX, worldY);
          this.localPlayer.body.enable = true;
        }
        this.localPlayer.setActive(true);
        this.localPlayer.setVisible(true);
        // Bring player above everything
        this.localPlayer.setDepth(20);
        // Ensure UI badges (R,P,S) render on top and move with player
        this.localPlayer.bringUIToFront?.();
        // Force an immediate indicator refresh in case inventory changed during portal
        (this.localPlayer as any).updateKeyIndicators?.();
        // Immediately refollow the player on the new map
        this.cameras.main.startFollow(this.localPlayer, true, 0.1, 0.1);
      }

      // Fade back in
      this.cameras.main.fadeIn(250, 0, 0, 0);
    });

    // Start fade out
    this.cameras.main.fadeOut(250, 0, 0, 0);
  }

  private setupPowerUpCollisions(): void {
    if (!this.localPlayer) return;
    
    // Check collisions with power-ups every frame
    this.physics.world.on('worldstep', () => {
      this.powerUpManager.getPowerUps().forEach(powerUp => {
        if (this.physics.overlap(this.localPlayer, powerUp)) {
          this.collectPowerUp(this.localPlayer, powerUp);
        }
      });
    });
  }

  private collectPowerUp(player: Player, powerUp: PowerUp): void {
    // Create enhanced collection effect
    this.particleSystem.createPowerUpCollection(
      { x: powerUp.x, y: powerUp.y }, 
      powerUp.config.color
    );
    
    // Add power-up to player
    player.addPowerUp(powerUp.powerUpType);
    
    // Remove power-up from manager
    this.powerUpManager.removePowerUp(powerUp);
    
    // Play collection animation
    powerUp.collect();
    
    console.log(`✨ Collected ${powerUp.powerUpType} power-up`);
  }



  private startNetworkUpdates(): void {
    // Send input updates at regular intervals
    this.time.addEvent({
      delay: this.networkUpdateRate,
      callback: this.sendNetworkUpdate,
      callbackScope: this,
      loop: true
    });
  }

  private sendNetworkUpdate(): void {
    if (!this.localPlayer || !this.gameStarted) return;
    
    // Send current input state
    this.networkSystem.sendPlayerInput(this.currentInput);
  }

  private handleGameStateUpdate(data: any): void {
    // Update all players with server data
    if (data.deltaState && data.deltaState.players) {
      data.deltaState.players.forEach((playerData: PlayerData) => {
        const player = this.players.get(playerData.id);
        if (player) {
          player.updateFromServer(playerData);
        }
      });
    }
  }

  private handleBattleStarted(data: any): void {
    console.log('⚔️ Battle started!', data);
    
    // Create battle clash effect at battle position
    if (data.battleData && data.battleData.position) {
      this.particleSystem.createBattleClash(data.battleData.position);
    }
    
    // Play battle start sound
    this.audioSystem.playBattleStart();
    
    // Pause current scene and start battle scene
    this.scene.pause();
    this.scene.launch(SCENE_KEYS.BATTLE, {
      battleData: data.battleData,
      opponentName: data.opponentName
    });
  }

  private handlePlayerEliminated(data: any): void {
    const player = this.players.get(data.playerId);
    if (player) {
      // Create elimination effect
      this.particleSystem.createEliminationEffect(
        { x: player.x, y: player.y },
        player.playerData.color
      );
      
      // Play elimination sound
      this.audioSystem.playPlayerEliminated();
      
      player.playerData.status = PlayerStatus.ELIMINATED;
      console.log(`💀 Player eliminated: ${player.playerName}`);
    }
  }

  private handleGameEnded(data: any): void {
    console.log('🏁 Game ended!', data);
    this.gameStarted = false;
    
    // Create victory celebration if local player won
    const localPlayerId = this.networkSystem.getPlayerId();
    if (data.winner === localPlayerId && this.localPlayer) {
      this.particleSystem.createVictoryCelebration({ x: this.localPlayer.x, y: this.localPlayer.y });
      this.audioSystem.playBattleWin();
    } else {
      this.audioSystem.playBattleLose();
    }
    
    // Show end game screen
    this.showEndGameScreen(data);
  }

  private showEndGameScreen(data: any): void {
    const { width, height } = this.cameras.main;
    
    const endContainer = this.add.container(width / 2, height / 2);
    
    // Background
    const bg = this.add.rectangle(0, 0, 400, 300, COLORS.BLACK, 0.9);
    bg.setStrokeStyle(3, COLORS.ACCENT_CYAN);
    
    // Title
    const title = this.add.text(0, -100, data.winner ? 'VICTORY!' : 'GAME OVER', {
      fontSize: '32px',
      color: data.winner ? '#00ff87' : '#ff006e',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Winner info
    const winnerText = this.add.text(0, -50, `Winner: ${data.winner || 'None'}`, {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    // Back to menu button
    const menuButton = this.add.rectangle(0, 50, 200, 40, COLORS.SECONDARY);
    menuButton.setStrokeStyle(2, COLORS.ACCENT_CYAN);
    menuButton.setInteractive({ useHandCursor: true });
    
    const menuLabel = this.add.text(0, 50, 'BACK TO MENU', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    menuButton.on('pointerdown', () => {
      this.returnToMenu();
    });
    
    endContainer.add([bg, title, winnerText, menuButton, menuLabel]);
    endContainer.setScrollFactor(0);
    endContainer.setDepth(2000);
  }

  private pauseGame(): void {
    // Show pause menu or return to main menu
    this.returnToMenu();
  }

  private returnToMenu(): void {
    // Disconnect from network
    this.networkSystem.disconnect();
    
    // Clean up
    this.cleanup();
    
    // Return to menu
    this.scene.start(SCENE_KEYS.MENU);
  }

  // Utility methods
  private getKeyTexture(keyType: KeyType): string {
    switch (keyType) {
      case KeyType.ROCK: return 'key_rock';
      case KeyType.PAPER: return 'key_paper';
      case KeyType.SCISSORS: return 'key_scissors';
      default: return 'key_rock';
    }
  }

  private getDoorTexture(doorType: KeyType): string {
    switch (doorType) {
      case KeyType.ROCK: return 'door_rock';
      case KeyType.PAPER: return 'door_paper';
      case KeyType.SCISSORS: return 'door_scissors';
      default: return 'door_rock';
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

  update(time: number, delta: number): void {
    if (!this.gameStarted || !this.localPlayer) return;
    
    // Update input state
    this.updateInput();
    
    // Apply input to local player
    this.localPlayer.handleInput(this.currentInput);
    
    // Update all players
    this.players.forEach(player => {
      player.update(time, delta);
    });
    
    // Update power-ups
    this.powerUpManager.update();
    
    // Update particle system
    this.particleSystem.update();
    
    // Update HUD
    this.updateHUD();
    
    // Check for proximity battles
    this.checkProximityBattles();
  }

  private updateInput(): void {
    const movement = { x: 0, y: 0 };
    
    // Arrow keys
    if (this.cursors.left.isDown) movement.x -= 1;
    if (this.cursors.right.isDown) movement.x += 1;
    if (this.cursors.up.isDown) movement.y -= 1;
    if (this.cursors.down.isDown) movement.y += 1;
    
    // WASD keys
    if (this.wasdKeys.A.isDown) movement.x -= 1;
    if (this.wasdKeys.D.isDown) movement.x += 1;
    if (this.wasdKeys.W.isDown) movement.y -= 1;
    if (this.wasdKeys.S.isDown) movement.y += 1;
    
    // Normalize diagonal movement
    if (movement.x !== 0 && movement.y !== 0) {
      movement.x *= 0.707; // 1/sqrt(2)
      movement.y *= 0.707;
    }
    
    this.currentInput = {
      movement,
      actions: new Set(this.currentInput.actions), // Copy previous actions
      timestamp: Date.now()
    };
    
    // Clear actions after processing
    this.currentInput.actions.clear();
  }

  private updateHUD(): void {
    // HUD updates are now handled by the separate HTML update methods
    // This method is kept for compatibility but delegates to HTML updaters
    this.updateHTMLPlayerCount();
    this.updateHTMLTimer();
    this.updateHTMLKeyCount();
    if (DEBUG_CONFIG.SHOW_FPS) {
      this.updateHTMLDebugInfo();
    }
  }

  private checkProximityBattles(): void {
    if (!this.localPlayer) return;
    
    // Check distance to other players
    this.players.forEach(otherPlayer => {
      if (otherPlayer === this.localPlayer) return;
      
      const distance = this.localPlayer.getDistanceTo(otherPlayer);
      const inProximity = distance <= (GAMEPLAY_CONFIG.BATTLE_PROXIMITY_RANGE * GAME_CONFIG.TILE_SIZE);
      
      // Show/hide proximity warning
      this.localPlayer.showProximityWarning(inProximity);
    });
  }

  private cleanup(): void {
    // Remove network listeners
    this.networkSystem.off('gameStateUpdate', this.handleGameStateUpdate, this);
    this.networkSystem.off('battleStarted', this.handleBattleStarted, this);
    this.networkSystem.off('playerEliminated', this.handlePlayerEliminated, this);
    this.networkSystem.off('gameEnded', this.handleGameEnded, this);
    
    // Clean up players
    this.players.forEach(player => {
      player.destroy();
    });
    this.players.clear();
    
    // Clean up power-ups
    if (this.powerUpManager) {
      this.powerUpManager.destroy();
    }
    
    // Clean up particle system
    if (this.particleSystem) {
      this.particleSystem.destroy();
    }
    
    // Clean up audio system
    if (this.audioSystem) {
      this.audioSystem.destroy();
    }
  }

  destroy(): void {
    this.cleanup();
    // Scene cleanup handled in cleanup(); do not call super.destroy()
  }
}