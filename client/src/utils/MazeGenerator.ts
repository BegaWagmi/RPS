import { TileType, MazeData, Vector2 } from './Types.ts';

export enum MazeAlgorithm {
  RECURSIVE_BACKTRACKING = 'recursive_backtracking',
  CELLULAR_AUTOMATA = 'cellular_automata',
  BINARY_TREE = 'binary_tree',
  PERLIN_CAVES = 'perlin_caves'
}

export interface MazeGenerationOptions {
  width: number;
  height: number;
  algorithm: MazeAlgorithm;
  seed?: number;
  density?: number; // For cellular automata (0.0 - 1.0)
  iterations?: number; // For cellular automata
  minRoomSize?: number; // Minimum room dimensions
  maxRoomSize?: number; // Maximum room dimensions
  roomCount?: number; // Number of rooms to generate
}

export class MazeGenerator {
  private rng: () => number;
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed || Date.now();
    this.rng = this.createSeededRandom(this.seed);
  }

  /**
   * Create a seeded random number generator
   */
  private createSeededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  }

  /**
   * Generate a complete maze with all required elements
   */
  public generateMaze(options: MazeGenerationOptions): MazeData {
    console.log('🏗️ Generating maze with algorithm:', options.algorithm);
    
    let layout: TileType[][];
    
    switch (options.algorithm) {
      case MazeAlgorithm.RECURSIVE_BACKTRACKING:
        layout = this.generateRecursiveBacktracking(options);
        break;
      case MazeAlgorithm.CELLULAR_AUTOMATA:
        layout = this.generateCellularAutomata(options);
        break;
      case MazeAlgorithm.BINARY_TREE:
        layout = this.generateBinaryTree(options);
        break;
      case MazeAlgorithm.PERLIN_CAVES:
        layout = this.generatePerlinCaves(options);
        break;
      default:
        layout = this.generateRecursiveBacktracking(options);
    }

    // Ensure boundaries are walls
    this.ensureBoundaryWalls(layout);

    // Find suitable positions for spawn points, keys, doors, and exit
    const floorTiles = this.findFloorTiles(layout);
    console.log(`🔍 Found ${floorTiles.length} floor tiles`);
    
    const spawnPoints = this.generateSpawnPoints(floorTiles, 4); // Support up to 4 players
    console.log(`👥 Generated ${spawnPoints.length} spawn points`);
    
    const keySpawns = this.generateKeySpawns(floorTiles, spawnPoints, 6); // 6 keys
    console.log(`🔑 Generated ${keySpawns.length} key spawns`);
    
    const doorPositions = this.generateDoorPositions(layout, floorTiles, 3); // 3 doors
    console.log(`🚪 Generated ${doorPositions.length} door positions`);
    
    const exitPosition = this.generateExitPosition(floorTiles, spawnPoints);
    console.log(`🏁 Generated exit position at (${exitPosition.x}, ${exitPosition.y})`);

    // Place special tiles in the layout
    this.placeSpecialTiles(layout, spawnPoints, keySpawns, doorPositions, exitPosition);
    
    // Verify door placement
    let doorTileCount = 0;
    for (let y = 0; y < layout.length; y++) {
      for (let x = 0; x < layout[y].length; x++) {
        if (layout[y][x] === TileType.DOOR) {
          doorTileCount++;
        }
      }
    }
    console.log(`✅ Verified ${doorTileCount} door tiles placed in layout`);

    return {
      id: `maze_${this.seed}_${Date.now()}`,
      width: options.width,
      height: options.height,
      layout,
      spawnPoints,
      keySpawns,
      doorPositions,
      exitPosition,
      theme: 'default'
    };
  }

  /**
   * Recursive Backtracking Algorithm
   * Creates complex mazes with single solutions
   */
  private generateRecursiveBacktracking(options: MazeGenerationOptions): TileType[][] {
    const { width, height } = options;
    
    // Initialize with all walls
    const layout: TileType[][] = [];
    for (let y = 0; y < height; y++) {
      layout[y] = [];
      for (let x = 0; x < width; x++) {
        layout[y][x] = TileType.WALL;
      }
    }

    // Ensure odd dimensions for proper maze generation
    const startX = 1;
    const startY = 1;
    
    const stack: Vector2[] = [];
    const visited: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));
    
    // Start from a random odd position
    stack.push({ x: startX, y: startY });
    layout[startY][startX] = TileType.FLOOR;
    visited[startY][startX] = true;

    const directions = [
      { x: 0, y: -2 }, // North
      { x: 2, y: 0 },  // East
      { x: 0, y: 2 },  // South
      { x: -2, y: 0 }  // West
    ];

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors: Vector2[] = [];

      // Find unvisited neighbors
      for (const dir of directions) {
        const newX = current.x + dir.x;
        const newY = current.y + dir.y;

        if (newX > 0 && newX < width - 1 && 
            newY > 0 && newY < height - 1 && 
            !visited[newY][newX]) {
          neighbors.push({ x: newX, y: newY });
        }
      }

      if (neighbors.length > 0) {
        // Choose a random neighbor
        const next = neighbors[Math.floor(this.rng() * neighbors.length)];
        
        // Carve path to neighbor
        const wallX = current.x + (next.x - current.x) / 2;
        const wallY = current.y + (next.y - current.y) / 2;
        
        layout[wallY][wallX] = TileType.FLOOR;
        layout[next.y][next.x] = TileType.FLOOR;
        visited[next.y][next.x] = true;
        
        stack.push(next);
      } else {
        stack.pop();
      }
    }

    // Add some rooms for variety
    this.addRandomRooms(layout, options.minRoomSize || 3, options.maxRoomSize || 7, options.roomCount || 3);

    return layout;
  }

  /**
   * Cellular Automata Algorithm
   * Creates more organic, cave-like layouts
   */
  private generateCellularAutomata(options: MazeGenerationOptions): TileType[][] {
    const { width, height, density = 0.45, iterations = 5 } = options;
    
    let layout: TileType[][] = [];
    
    // Initialize with random walls and floors
    for (let y = 0; y < height; y++) {
      layout[y] = [];
      for (let x = 0; x < width; x++) {
        layout[y][x] = this.rng() < density ? TileType.WALL : TileType.FLOOR;
      }
    }

    // Apply cellular automata rules
    for (let i = 0; i < iterations; i++) {
      layout = this.applyCellularAutomataRules(layout, width, height);
    }

    // Ensure connectivity by connecting isolated areas
    this.ensureConnectivity(layout);

    return layout;
  }

  /**
   * Binary Tree Algorithm
   * Simpler algorithm that creates mazes with a distinctive texture
   */
  private generateBinaryTree(options: MazeGenerationOptions): TileType[][] {
    const { width, height } = options;
    
    // Initialize with all walls
    const layout: TileType[][] = [];
    for (let y = 0; y < height; y++) {
      layout[y] = [];
      for (let x = 0; x < width; x++) {
        layout[y][x] = TileType.WALL;
      }
    }

    // Carve passages using binary tree algorithm
    for (let y = 1; y < height - 1; y += 2) {
      for (let x = 1; x < width - 1; x += 2) {
        layout[y][x] = TileType.FLOOR;

        const directions: Vector2[] = [];
        
        // Can go north?
        if (y > 1) directions.push({ x: 0, y: -1 });
        
        // Can go west?
        if (x > 1) directions.push({ x: -1, y: 0 });

        if (directions.length > 0) {
          const dir = directions[Math.floor(this.rng() * directions.length)];
          layout[y + dir.y][x + dir.x] = TileType.FLOOR;
        }
      }
    }

    return layout;
  }

  /**
   * Perlin-like caves algorithm
   * Creates more natural cave systems
   */
  private generatePerlinCaves(options: MazeGenerationOptions): TileType[][] {
    const { width, height, density = 0.4 } = options;
    
    const layout: TileType[][] = [];
    
    for (let y = 0; y < height; y++) {
      layout[y] = [];
      for (let x = 0; x < width; x++) {
        // Use multiple octaves of noise for more interesting patterns
        const noise1 = this.noise(x * 0.1, y * 0.1);
        const noise2 = this.noise(x * 0.05, y * 0.05) * 0.5;
        const noise3 = this.noise(x * 0.2, y * 0.2) * 0.25;
        
        const combined = noise1 + noise2 + noise3;
        layout[y][x] = combined > density ? TileType.WALL : TileType.FLOOR;
      }
    }

    // Smooth the caves
    for (let i = 0; i < 3; i++) {
      this.smoothCaves(layout);
    }

    return layout;
  }

  /**
   * Simple noise function for cave generation
   */
  private noise(x: number, y: number): number {
    const seed = this.seed;
    let n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return (n - Math.floor(n));
  }

  /**
   * Smooth caves by applying cellular automata-like rules
   */
  private smoothCaves(layout: TileType[][]): void {
    const height = layout.length;
    const width = layout[0].length;
    const newLayout: TileType[][] = JSON.parse(JSON.stringify(layout));

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let wallCount = 0;
        
        // Count surrounding walls
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (layout[y + dy][x + dx] === TileType.WALL) {
              wallCount++;
            }
          }
        }

        // Apply smoothing rule
        newLayout[y][x] = wallCount >= 5 ? TileType.WALL : TileType.FLOOR;
      }
    }

    // Copy back
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        layout[y][x] = newLayout[y][x];
      }
    }
  }

  /**
   * Apply cellular automata rules
   */
  private applyCellularAutomataRules(layout: TileType[][], width: number, height: number): TileType[][] {
    const newLayout: TileType[][] = [];
    
    for (let y = 0; y < height; y++) {
      newLayout[y] = [];
      for (let x = 0; x < width; x++) {
        let wallCount = 0;
        let floorCount = 0;

        // Count neighbors
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
              wallCount++; // Treat out-of-bounds as walls
            } else if (layout[ny][nx] === TileType.WALL) {
              wallCount++;
            } else {
              floorCount++;
            }
          }
        }

        // Apply rules
        if (wallCount >= 5) {
          newLayout[y][x] = TileType.WALL;
        } else {
          newLayout[y][x] = TileType.FLOOR;
        }
      }
    }

    return newLayout;
  }

  /**
   * Add random rooms to the maze for more interesting layouts
   */
  private addRandomRooms(layout: TileType[][], minSize: number, maxSize: number, count: number): void {
    const height = layout.length;
    const width = layout[0].length;

    for (let i = 0; i < count; i++) {
      const roomWidth = minSize + Math.floor(this.rng() * (maxSize - minSize + 1));
      const roomHeight = minSize + Math.floor(this.rng() * (maxSize - minSize + 1));
      
      const roomX = 1 + Math.floor(this.rng() * (width - roomWidth - 2));
      const roomY = 1 + Math.floor(this.rng() * (height - roomHeight - 2));

      // Carve out the room
      for (let y = roomY; y < roomY + roomHeight; y++) {
        for (let x = roomX; x < roomX + roomWidth; x++) {
          layout[y][x] = TileType.FLOOR;
        }
      }

      // Connect room to existing passages
      this.connectRoomToMaze(layout, roomX, roomY, roomWidth, roomHeight);
    }
  }

  /**
   * Connect a room to the existing maze
   */
  private connectRoomToMaze(layout: TileType[][], roomX: number, roomY: number, roomWidth: number, roomHeight: number): void {
    const connections: Vector2[] = [];
    
    // Check all room perimeter tiles for potential connections
    for (let x = roomX; x < roomX + roomWidth; x++) {
      // Top wall
      if (roomY > 1 && layout[roomY - 2][x] === TileType.FLOOR) {
        connections.push({ x, y: roomY - 1 });
      }
      // Bottom wall
      if (roomY + roomHeight < layout.length - 1 && layout[roomY + roomHeight + 1][x] === TileType.FLOOR) {
        connections.push({ x, y: roomY + roomHeight });
      }
    }

    for (let y = roomY; y < roomY + roomHeight; y++) {
      // Left wall
      if (roomX > 1 && layout[y][roomX - 2] === TileType.FLOOR) {
        connections.push({ x: roomX - 1, y });
      }
      // Right wall
      if (roomX + roomWidth < layout[0].length - 1 && layout[y][roomX + roomWidth + 1] === TileType.FLOOR) {
        connections.push({ x: roomX + roomWidth, y });
      }
    }

    // Create at least one connection
    if (connections.length > 0) {
      const connection = connections[Math.floor(this.rng() * connections.length)];
      layout[connection.y][connection.x] = TileType.FLOOR;
    }
  }

  /**
   * Ensure all walls around the boundary
   */
  private ensureBoundaryWalls(layout: TileType[][]): void {
    const height = layout.length;
    const width = layout[0].length;

    // Top and bottom walls
    for (let x = 0; x < width; x++) {
      layout[0][x] = TileType.WALL;
      layout[height - 1][x] = TileType.WALL;
    }

    // Left and right walls
    for (let y = 0; y < height; y++) {
      layout[y][0] = TileType.WALL;
      layout[y][width - 1] = TileType.WALL;
    }
  }

  /**
   * Ensure all floor areas are connected
   */
  private ensureConnectivity(layout: TileType[][]): void {
    const height = layout.length;
    const width = layout[0].length;
    const visited: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));
    const regions: Vector2[][] = [];

    // Find all connected regions
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (layout[y][x] === TileType.FLOOR && !visited[y][x]) {
          const region = this.floodFill(layout, visited, x, y);
          if (region.length > 10) { // Only keep larger regions
            regions.push(region);
          }
        }
      }
    }

    // Connect regions if there are multiple
    if (regions.length > 1) {
      for (let i = 1; i < regions.length; i++) {
        this.connectRegions(layout, regions[0], regions[i]);
      }
    }
  }

  /**
   * Flood fill to find connected regions
   */
  private floodFill(layout: TileType[][], visited: boolean[][], startX: number, startY: number): Vector2[] {
    const region: Vector2[] = [];
    const stack: Vector2[] = [{ x: startX, y: startY }];
    const height = layout.length;
    const width = layout[0].length;

    while (stack.length > 0) {
      const { x, y } = stack.pop()!;

      if (x < 0 || x >= width || y < 0 || y >= height || visited[y][x] || layout[y][x] !== TileType.FLOOR) {
        continue;
      }

      visited[y][x] = true;
      region.push({ x, y });

      // Add neighbors
      stack.push({ x: x + 1, y });
      stack.push({ x: x - 1, y });
      stack.push({ x, y: y + 1 });
      stack.push({ x, y: y - 1 });
    }

    return region;
  }

  /**
   * Connect two regions by carving a path
   */
  private connectRegions(layout: TileType[][], region1: Vector2[], region2: Vector2[]): void {
    let bestDistance = Infinity;
    let bestConnection: { p1: Vector2; p2: Vector2 } | null = null;

    // Find closest points between regions
    for (const p1 of region1) {
      for (const p2 of region2) {
        const distance = Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestConnection = { p1, p2 };
        }
      }
    }

    if (bestConnection) {
      this.carveConnection(layout, bestConnection.p1, bestConnection.p2);
    }
  }

  /**
   * Carve a connection between two points
   */
  private carveConnection(layout: TileType[][], start: Vector2, end: Vector2): void {
    let { x, y } = start;

    // Move horizontally first
    while (x !== end.x) {
      layout[y][x] = TileType.FLOOR;
      x += x < end.x ? 1 : -1;
    }

    // Then move vertically
    while (y !== end.y) {
      layout[y][x] = TileType.FLOOR;
      y += y < end.y ? 1 : -1;
    }

    layout[y][x] = TileType.FLOOR;
  }

  /**
   * Find all floor tiles in the maze
   */
  private findFloorTiles(layout: TileType[][]): Vector2[] {
    const floors: Vector2[] = [];
    
    for (let y = 0; y < layout.length; y++) {
      for (let x = 0; x < layout[y].length; x++) {
        if (layout[y][x] === TileType.FLOOR) {
          floors.push({ x, y });
        }
      }
    }

    return floors;
  }

  /**
   * Generate spawn points ensuring they're spread out
   */
  private generateSpawnPoints(floorTiles: Vector2[], count: number): Vector2[] {
    const spawns: Vector2[] = [];
    const used = new Set<string>();

    // Try to place spawn points with good separation
    for (let i = 0; i < count && spawns.length < count; i++) {
      let attempts = 0;
      const maxAttempts = 100;

      while (attempts < maxAttempts) {
        const tile = floorTiles[Math.floor(this.rng() * floorTiles.length)];
        const key = `${tile.x},${tile.y}`;

        if (!used.has(key)) {
          // Check distance from other spawns
          const minDistance = 5;
          const tooClose = spawns.some(spawn => 
            Math.abs(spawn.x - tile.x) + Math.abs(spawn.y - tile.y) < minDistance
          );

          if (!tooClose) {
            spawns.push(tile);
            used.add(key);
            break;
          }
        }

        attempts++;
      }
    }

    // If we couldn't place enough with distance constraints, just place them
    while (spawns.length < count && spawns.length < floorTiles.length) {
      const tile = floorTiles[Math.floor(this.rng() * floorTiles.length)];
      const key = `${tile.x},${tile.y}`;
      
      if (!used.has(key)) {
        spawns.push(tile);
        used.add(key);
      }
    }

    return spawns;
  }

  /**
   * Generate key spawn positions
   */
  private generateKeySpawns(floorTiles: Vector2[], spawnPoints: Vector2[], count: number): Vector2[] {
    const keys: Vector2[] = [];
    const used = new Set<string>();
    
    // Add spawn points to used set
    spawnPoints.forEach(spawn => used.add(`${spawn.x},${spawn.y}`));

    for (let i = 0; i < count && keys.length < count; i++) {
      let attempts = 0;
      const maxAttempts = 100;

      while (attempts < maxAttempts && keys.length < count) {
        const tile = floorTiles[Math.floor(this.rng() * floorTiles.length)];
        const key = `${tile.x},${tile.y}`;

        if (!used.has(key)) {
          keys.push(tile);
          used.add(key);
          break;
        }

        attempts++;
      }
    }

    return keys;
  }

  /**
   * Generate door positions on walls adjacent to floors
   */
  private generateDoorPositions(layout: TileType[][], floorTiles: Vector2[], count: number): Vector2[] {
    const doors: Vector2[] = [];
    const used = new Set<string>();
    const potentialDoors: Vector2[] = [];

    console.log('🔍 Generating door positions...');
    console.log(`📐 Layout dimensions: ${layout[0]?.length}x${layout.length}`);
    console.log(`🎯 Target door count: ${count}`);

    // Find walls that are adjacent to floors and could be doors
    for (let y = 1; y < layout.length - 1; y++) {
      for (let x = 1; x < layout[y].length - 1; x++) {
        if (layout[y][x] === TileType.WALL) {
          // Check if adjacent to floors - make it less restrictive
          const adjacentFloors = [
            { x: x - 1, y },
            { x: x + 1, y },
            { x, y: y - 1 },
            { x, y: y + 1 }
          ].filter(pos => 
            pos.x >= 0 && pos.x < layout[0].length &&
            pos.y >= 0 && pos.y < layout.length &&
            layout[pos.y][pos.x] === TileType.FLOOR
          );

          // Changed from >= 2 to >= 1 to be less restrictive
          if (adjacentFloors.length >= 1) {
            potentialDoors.push({ x, y });
          }
        }
      }
    }

    console.log(`🔍 Found ${potentialDoors.length} potential door positions`);

    // If we don't have enough potential doors, try a different approach
    if (potentialDoors.length < count) {
      console.log(`⚠️ Not enough potential doors (${potentialDoors.length}), trying alternative approach...`);
      
      // Look for any wall tiles that are not at the very edge
      for (let y = 2; y < layout.length - 2; y++) {
        for (let x = 2; x < layout[y].length - 2; x++) {
          if (layout[y][x] === TileType.WALL) {
            const key = `${x},${y}`;
            if (!used.has(key)) {
              potentialDoors.push({ x, y });
              used.add(key);
            }
          }
        }
      }
      console.log(`🔍 After alternative approach: ${potentialDoors.length} potential door positions`);
    }

    // Select doors from potential positions
    for (let i = 0; i < count && doors.length < count && potentialDoors.length > 0; i++) {
      const index = Math.floor(this.rng() * potentialDoors.length);
      const door = potentialDoors.splice(index, 1)[0];
      doors.push(door);
    }

    console.log(`✅ Generated ${doors.length} door positions:`, doors);
    return doors;
  }

  /**
   * Generate exit position far from spawn points
   */
  private generateExitPosition(floorTiles: Vector2[], spawnPoints: Vector2[]): Vector2 {
    let bestExit = floorTiles[0];
    let maxMinDistance = 0;

    // Find the floor tile that's farthest from all spawn points
    for (const tile of floorTiles) {
      const minDistance = Math.min(...spawnPoints.map(spawn =>
        Math.abs(spawn.x - tile.x) + Math.abs(spawn.y - tile.y)
      ));

      if (minDistance > maxMinDistance) {
        maxMinDistance = minDistance;
        bestExit = tile;
      }
    }

    return bestExit;
  }

  /**
   * Place special tiles in the layout
   */
  private placeSpecialTiles(
    layout: TileType[][], 
    spawnPoints: Vector2[], 
    keySpawns: Vector2[], 
    doorPositions: Vector2[], 
    exitPosition: Vector2
  ): void {
    // Do not mark SPAWN tiles in the layout anymore. Keep spawnPoints for logic only.

    // Mark key spawns (K blocks removed from map)
    // keySpawns.forEach(key => {
    //   layout[key.y][key.x] = TileType.KEY_SPAWN;
    // });

    // Mark doors
    doorPositions.forEach(door => {
      layout[door.y][door.x] = TileType.DOOR;
    });

    // Do not mark EXIT tiles in the layout anymore.
  }
}
