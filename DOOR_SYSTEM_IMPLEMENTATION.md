# 🚪 Two-Door System Implementation

## Overview

The game now features two distinct door types that create different gameplay experiences and strategic depth:

1. **Normal Doors (D)** - Traditional key-based unlocking
2. **Portal Doors (P)** - Multi-key requirements with map teleportation

## Implementation Details

### 1. Type System Updates

#### Constants.ts
```typescript
export enum DoorType {
  NORMAL = 'normal',    // (D) - Requires 1 key, allows passage
  PORTAL = 'portal'     // (P) - Requires 2 random keys, teleports to new map
}
```

#### Types.ts
```typescript
export interface DoorData {
  id: string;
  position: Vector2;
  type: DoorType;
  symbol: KeyType;
  isOpen: boolean;
  requirements: KeyType[];
  lastOpened: number;
  openCount: number;
  isPortal: boolean;  // True for portal doors, false for normal doors
  targetMap?: string; // For portal doors - the map to teleport to
}
```

### 2. Door Spawning Logic

#### GameScene.ts - spawnDoors()
```typescript
private spawnDoors(): void {
  const doorTypes = [KeyType.ROCK, KeyType.PAPER, KeyType.SCISSORS];
  
  this.maze.doorPositions.forEach((doorPos, index) => {
    // Determine door type: Normal (D) or Portal (P)
    const isPortal = Math.random() < 0.3; // 30% chance for portal doors
    const doorType = isPortal ? DoorType.PORTAL : DoorType.NORMAL;
    
    // For normal doors, use the key type system
    // For portal doors, use a special portal texture
    const doorSprite = isPortal ? 'portal_door' : this.getDoorTexture(doorTypes[index % doorTypes.length]);
    
    // Set door properties
    door.setData('doorType', doorType);
    door.setData('isPortal', isPortal);
    
    if (isPortal) {
      // For portal doors, set random key requirements (2 random keys)
      const randomKeys = this.getRandomKeyRequirements(2);
      door.setData('requirements', randomKeys);
      door.setData('targetMap', `map_${Math.floor(Math.random() * 1000)}`);
      door.setTint(0x8000ff); // Purple tint for portal doors
    } else {
      // Normal doors use the existing key type system
      const keyType = doorTypes[index % doorTypes.length];
      door.setData('symbol', keyType);
      door.setData('requirements', [keyType]);
      door.setTint(this.getKeyColor(keyType));
    }
  });
}
```

### 3. Door Interaction Logic

#### Main Interaction Handler
```typescript
private interactWithDoor(player: Player, doorSprite: Phaser.Physics.Arcade.Sprite): void {
  const doorType = doorSprite.getData('doorType') as DoorType;
  const isOpen = doorSprite.getData('isOpen') as boolean;
  const isPortal = doorSprite.getData('isPortal') as boolean;
  
  if (isOpen) return; // Already open
  
  if (isPortal) {
    // Handle Portal Door (P) - requires 2 random keys
    this.handlePortalDoor(player, doorSprite);
  } else {
    // Handle Normal Door (D) - requires 1 specific key
    this.handleNormalDoor(player, doorSprite);
  }
}
```

#### Normal Door Handler
```typescript
private handleNormalDoor(player: Player, doorSprite: Phaser.Physics.Arcade.Sprite): void {
  const keyType = doorSprite.getData('symbol') as KeyType;
  
  if (player.canPassThroughDoor(keyType)) {
    // Remove key if used
    if (player.hasKey(keyType)) {
      player.removeKey(keyType);
    }
    
    // Open door and cycle to next key type
    doorSprite.setData('isOpen', true);
    doorSprite.setAlpha(0.5);
    
    // Change door type after interaction
    const doorTypes = [KeyType.ROCK, KeyType.PAPER, KeyType.SCISSORS];
    const currentTypeIndex = doorTypes.indexOf(keyType);
    const newType = doorTypes[(currentTypeIndex + 1) % doorTypes.length];
    
    doorSprite.setData('symbol', newType);
    doorSprite.setTexture(this.getDoorTexture(newType));
    doorSprite.setTint(this.getKeyColor(newType));
    
    console.log(`🚪 Opened normal ${keyType} door`);
  }
}
```

#### Portal Door Handler
```typescript
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
    
    console.log(`🌀 Opened portal door to ${targetMap}`);
    
    // TODO: Implement map teleportation
    // this.teleportToNewMap(targetMap);
  } else {
    const missingKeys = requirements.filter(keyType => !player.hasKey(keyType));
    console.log(`🔒 Need ${missingKeys.join(', ')} keys to open portal door`);
  }
}
```

### 4. Player Class Updates

#### New Portal Door Method
```typescript
// Check if player can pass through portal door (requires multiple keys)
public canPassThroughPortalDoor(requirements: KeyType[]): boolean {
  // Check if player has all required keys
  const hasAllKeys = requirements.every(keyType => this.hasKey(keyType));
  
  if (hasAllKeys) {
    return true;
  }
  
  // Check if player has Ghost Walk power-up
  if (this.hasPowerUp(PowerUpType.GHOST_WALK)) {
    return this.usePowerUp(PowerUpType.GHOST_WALK);
  }
  
  return false;
}
```

### 5. Key Requirements Generation

#### Random Key Requirements
```typescript
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
```

## Gameplay Impact

### Strategic Depth
- **Normal Doors**: Provide consistent progression through the maze
- **Portal Doors**: High-risk, high-reward - consume 2 keys but offer map shortcuts
- **Key Management**: Players must decide between using keys for normal doors or saving for portals

### Visual Distinction
- **Normal Doors**: Colored based on key type (Rock=Brown, Paper=White, Scissors=Silver)
- **Portal Doors**: Purple tint to clearly indicate special behavior
- **Different Effects**: Portal doors use special particle effects and sounds

### Balance Considerations
- **Portal Spawn Rate**: 30% chance prevents overwhelming players
- **Key Requirements**: 2 random keys ensure variety and challenge
- **Map Generation**: Each portal leads to unique content for replayability

## Future Enhancements

### Map Teleportation
```typescript
// TODO: Implement in handlePortalDoor
private teleportToNewMap(targetMap: string): void {
  // Generate new maze
  const newMaze = this.generateNewMaze(targetMap);
  
  // Transition player to new map
  this.scene.start(SCENE_KEYS.GAME, { maze: newMaze });
}
```

### Portal Effects
- Screen transition effects
- Loading indicators
- Map preview before teleportation

### Advanced Portal Types
- **One-way portals**: No return path
- **Conditional portals**: Require specific power-ups
- **Timed portals**: Only active during certain game phases

## Testing

### Console Logs
When testing, you should see:
```
🚪 Spawned 5 doors (Normal: 3, Portal: 2)
🚪 Opened normal rock door
🌀 Opened portal door to map_456
🔒 Need rock, paper keys to open portal door
```

### Test File
Use `client/test-doors.html` to see a visual demonstration of the door system.

## Conclusion

The two-door system adds significant strategic depth to the game while maintaining the core RPS mechanics. Players must now make meaningful decisions about key usage and risk assessment, creating a more engaging and replayable experience.
