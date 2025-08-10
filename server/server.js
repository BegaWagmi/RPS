const http = require('http');
const { Server } = require('socket.io');

const LOG = {
  ENABLED: false,
  CONNECTIONS: false,
  MATCHMAKING: false,
  INPUTS: false,
  COLLISIONS: false,
  STATE_BROADCAST: false,
  STATE_EVERY_TICKS: 20,
  ERRORS: false
};

function nowTs() { return new Date().toISOString(); }
function log(tag, data) { if (LOG.ENABLED) console.log(`[${nowTs()}] ${tag} ${data?JSON.stringify(data):''}`); }

const TILE_SIZE = 32;
const WIDTH_TILES = 32;
const HEIGHT_TILES = 21;

// Minimal maze generation (same as earlier version)
function generateMazeRecursiveBacktracking(width, height, seed = Date.now()) {
  const layout = Array.from({ length: height }, () => Array.from({ length: width }, () => 1));
  let state = seed; const rng = () => ((state = (state * 9301 + 49297) % 233280) / 233280);
  for (let x = 0; x < width; x++) { layout[0][x] = 1; layout[height - 1][x] = 1; }
  for (let y = 0; y < height; y++) { layout[y][0] = 1; layout[y][width - 1] = 1; }
  const startX = 1, startY = 1; layout[startY][startX] = 2;
  const stack = [{ x: startX, y: startY }];
  const visited = Array.from({ length: height }, () => Array.from({ length: width }, () => false));
  visited[startY][startX] = true;
  const dirs = [{x:0,y:-2},{x:2,y:0},{x:0,y:2},{x:-2,y:0}];
  while (stack.length) {
    const cur = stack[stack.length-1];
    const nbrs = [];
    for (const d of dirs) { const nx = cur.x+d.x, ny = cur.y+d.y; if (nx>0&&nx<width-1&&ny>0&&ny<height-1&&!visited[ny][nx]) nbrs.push({x:nx,y:ny}); }
    if (nbrs.length) {
      const next = nbrs[Math.floor(rng()*nbrs.length)];
      const wx = cur.x + (next.x-cur.x)/2, wy = cur.y + (next.y-cur.y)/2; layout[wy][wx]=2; layout[next.y][next.x]=2; visited[next.y][next.x]=true; stack.push(next);
    } else stack.pop();
  }
  return layout;
}

function findFloorTiles(layout){ const out=[]; for(let y=0;y<layout.length;y++){ for(let x=0;x<layout[y].length;x++){ if(layout[y][x]===2) out.push({x,y}); } } return out; }
function generateSpawnTiles(layout,count,seed=Date.now()){ const floor=findFloorTiles(layout); const used=new Set(); let s=seed; const rng=()=>((s=s*9301+49297)%233280)/233280; const sp=[]; const minD=5; while(sp.length<Math.min(count,floor.length)){ const c=floor[Math.floor(rng()*floor.length)]; const k=`${c.x},${c.y}`; if(used.has(k)) continue; if(sp.some(t=>Math.abs(t.x-c.x)+Math.abs(t.y-c.y)<minD)) continue; sp.push(c); used.add(k);} return sp; }
function generateDoorPositions(layout,count,seed=Date.now()){ const pots=[]; for(let y=1;y<layout.length-1;y++){ for(let x=1;x<layout[y].length-1;x++){ if(layout[y][x]!==1) continue; const adj=[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(([ax,ay])=>layout[ay][ax]===2); if(adj) pots.push({x,y}); }} let s=seed; const rng=()=>((s=s*9301+49297)%233280)/233280; const doors=[]; while(doors.length<Math.min(count,pots.length)){ doors.push(pots.splice(Math.floor(rng()*pots.length),1)[0]); } return doors; }

const httpServer = http.createServer();
const io = new Server(httpServer, { cors: { origin: '*' } });
const rooms = new Map();

function tileToWorld(tile){ return { x: tile.x*TILE_SIZE + TILE_SIZE/2, y: tile.y*TILE_SIZE + TILE_SIZE/2 }; }
function worldToTile(pos){ return { x: Math.floor(pos.x/TILE_SIZE), y: Math.floor(pos.y/TILE_SIZE) }; }
function isWalkableInLayout(layoutRef, tile){ return !(tile.x<0||tile.y<0||tile.y>=layoutRef.length||tile.x>=layoutRef[0].length) && layoutRef[tile.y][tile.x]===2; }

function getOrCreateRoom(){ let room = Array.from(rooms.values()).find(r=>r.players.size<4); if(!room){ const id=`room_${Math.floor(Math.random()*10000)}`; const seed=Date.now(); const layout=generateMazeRecursiveBacktracking(WIDTH_TILES,HEIGHT_TILES,seed); const spawnTiles=generateSpawnTiles(layout,4,seed+1); const doorPositions=generateDoorPositions(layout,3,seed+2); room={ id, players:new Map(), tick:0, maze:{ seed, layout, spawnTiles, doorPositions } }; rooms.set(id, room);} return room; }

io.on('connection', (socket)=>{
  let currentRoom=null; let playerId=socket.id; let username='Player';
  socket.on('client_connect',(msg)=>{ username = (msg&&msg.data&&msg.data.playerName)||username; if(msg&&msg.data&&typeof msg.data.playerId==='string'&&msg.data.playerId.length>0){ playerId=msg.data.playerId; } });
  socket.on('join_queue', ()=>{
    currentRoom = getOrCreateRoom();
    const spawnIndex = currentRoom.players.size;
    const spawn = tileToWorld(currentRoom.maze.spawnTiles[spawnIndex % currentRoom.maze.spawnTiles.length] || {x:2,y:2});
    const player = { id: playerId, username, color: 0x00f5ff, position: spawn, velocity:{x:0,y:0}, keys:{items:[],maxSize:3,lastModified:Date.now()}, status:'alive', spawnTime:Date.now(), lastBattleTime:0, stats:{ keysCollected:0, doorsOpened:0, battlesWon:0, battlesLost:0, survivedTime:0, distanceTraveled:0 } };
    currentRoom.players.set(playerId, player); socket.join(currentRoom.id);
    const payload = { roomId: currentRoom.id, players: Array.from(currentRoom.players.values()), maze: { id:'server-maze', width: WIDTH_TILES, height: HEIGHT_TILES, layout: currentRoom.maze.layout, spawnPoints: currentRoom.maze.spawnTiles, keySpawns: [], doorPositions: currentRoom.maze.doorPositions, exitPosition: { x: WIDTH_TILES-2, y: HEIGHT_TILES-2 }, theme: 'cyber' } };
    io.to(currentRoom.id).emit('match_found', payload);
  });
  socket.on('player_input',(msg)=>{ if(!currentRoom) return; const p=currentRoom.players.get(playerId); if(!p) return; const input=msg?.data?.input||{movement:{x:0,y:0}}; const speed=128/20; const next={ x: p.position.x + (input.movement?.x||0)*speed, y: p.position.y + (input.movement?.y||0)*speed }; const tile=worldToTile(next); if(isWalkableInLayout(currentRoom.maze.layout, tile)){ p.position=next; } p.velocity={ x:(input.movement?.x||0)*128, y:(input.movement?.y||0)*128 }; });
  socket.on('disconnect', ()=>{ if(currentRoom) currentRoom.players.delete(playerId); });
});

setInterval(()=>{ rooms.forEach((room)=>{ room.tick++; const payload={ tick: room.tick, deltaState: { tick: room.tick, players: Array.from(room.players.values()) }, events: [] }; io.to(room.id).emit('game_state', payload); }); }, 50);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, ()=> log('server.listening',{port:PORT}));

// Debug endpoints
httpServer.on('request', (req, res) => {
  if (req.method==='GET' && req.url && req.url.startsWith('/health')) { res.writeHead(200, {'Content-Type':'application/json'}); res.end(JSON.stringify({ status:'ok', ts: nowTs() })); return; }
  if (req.method==='GET' && req.url && req.url.startsWith('/debug/rooms')) { const snapshot = Array.from(rooms.values()).map(r=>({ id:r.id, tick:r.tick, playerCount:r.players.size, players:Array.from(r.players.values()).map(p=>({id:p.id,username:p.username,x:Math.round(p.position.x),y:Math.round(p.position.y)})), maze:{ width:r.maze?.layout?.[0]?.length||WIDTH_TILES, height:r.maze?.layout?.length||HEIGHT_TILES, spawnTiles:r.maze?.spawnTiles||[] } })); res.writeHead(200, {'Content-Type':'application/json'}); res.end(JSON.stringify({ ts: nowTs(), rooms: snapshot })); return; }
  res.writeHead(404, {'Content-Type':'application/json'}); res.end(JSON.stringify({ error:'not_found' }));
});


