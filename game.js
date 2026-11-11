(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = 1000, H = 600;
  const goldEl = document.getElementById('gold'), healthEl = document.getElementById('health');
  const titleEl = document.getElementById('phase-title'), labelEl = document.getElementById('day-label');
  const mainEl = document.getElementById('controls-main'), sideEl = document.getElementById('side-card');
  const toastEl = document.getElementById('toast'), dayDot = document.getElementById('day-dot'), nightDot = document.getElementById('night-dot');
  const plots = Array.from({length:18}, () => ({crop:null}));
  const towerPads = [{x:340,y:218},{x:474,y:218},{x:635,y:218},{x:798,y:218},{x:365,y:390},{x:557,y:390},{x:704,y:390},{x:858,y:390}];
  const path = [{x:1000,y:305},{x:840,y:305},{x:840,y:450},{x:600,y:450},{x:600,y:305},{x:330,y:305},{x:330,y:430},{x:125,y:430}];
  const state = {day:1,gold:24,health:10,water:6,mode:'day',tool:'plant-turnip',towers:[],enemies:[],bullets:[],spawned:0,total:0,spawnTimer:0,last:0,toastTimer:0,notice:'',hover:null,nightKills:0};
  const colors = {turnip:'#cf92be',pumpkin:'#f5a343'};

  function toast(text){toastEl.textContent=text;toastEl.classList.add('show');state.toastTimer=2.2;}
  function updateHeader(){
    goldEl.textContent=state.gold; healthEl.textContent=state.health;
    const night=state.mode.startsWith('night')||state.mode==='lost'||state.mode==='won';
    dayDot.classList.toggle('active',!night); nightDot.classList.toggle('night-active',night);
    if(state.mode==='day'){labelEl.textContent=`DAY ${String(state.day).padStart(2,'0')} · MORNING`;titleEl.innerHTML='A little patch of <em>paradise.</em>';}
    else if(state.mode==='night-prep'){labelEl.textContent=`DAY ${String(state.day).padStart(2,'0')} · DUSK`;titleEl.innerHTML='The moon is up. <em>Make it home.</em>';}
    else if(state.mode==='night-battle'){labelEl.textContent=`NIGHT ${String(state.day).padStart(2,'0')} · WAVE ${state.day}`;titleEl.innerHTML='Hold the line, <em>little farmer.</em>';}
    else if(state.mode==='lost'){labelEl.textContent='THE FARM HAS FALLEN';titleEl.innerHTML='The night took <em>root.</em>';}
    else {labelEl.textContent='A LEGEND IN BLOOM';titleEl.innerHTML='The valley is <em>safe again.</em>';}
  }
  function setTool(tool){state.tool=tool;renderControls();}
  function renderControls(){
    if(state.mode==='day'){
      mainEl.innerHTML=`<div class="control-top"><span class="control-title">☀ &nbsp; FARM BY DAY</span><span class="control-hint">Choose a tool, then tap a garden bed</span></div><div class="tool-row">
        <button class="tool-btn ${state.tool==='plant-turnip'?'selected':''}" data-tool="plant-turnip"><span class="emoji">🌱</span><span>Turnip seed<small class="price">3 gold · ${plantsCount('turnip')} growing</small></span></button>
        <button class="tool-btn ${state.tool==='plant-pumpkin'?'selected':''}" data-tool="plant-pumpkin"><span class="emoji">🎃</span><span>Pumpkin seed<small class="price">8 gold · ${plantsCount('pumpkin')} growing</small></span></button>
        <button class="tool-btn ${state.tool==='water'?'selected':''}" data-tool="water"><span class="emoji">💧</span><span>Water<small>${state.water} drops left</small></span></button>
        <button class="tool-btn ${state.tool==='harvest'?'selected':''}" data-tool="harvest"><span class="emoji">🧺</span><span>Harvest<small>${readyCount()} ready</small></span></button>
        <button class="action-btn" id="sleep-btn">TUCK IN FOR THE NIGHT &nbsp; ☾</button></div>`;
      sideEl.innerHTML=`<span class="side-kicker">TODAY'S LITTLE WINS</span><span class="side-title">${readyCount()?`${readyCount()} crop${readyCount()>1?'s':''} ready to gather!`:'Tend the garden, then defend it.'}</span><span class="side-text">Watered crops grow overnight. Harvests earn gold for tonight's defenses.</span><div class="meter"><span style="width:${Math.min(100,(plots.filter(p=>p.crop?.watered).length/6)*100)}%"></span></div>`;
    }else if(state.mode==='night-prep'||state.mode==='night-battle'){
      const battle=state.mode==='night-battle';
      mainEl.innerHTML=`<div class="control-top"><span class="control-title">☾ &nbsp; DEFEND BY NIGHT</span><span class="control-hint">${battle?'Tap an empty pad to build during the wave':'Build towers, then start the wave'}</span></div><div class="tool-row">
        <button class="tool-btn ${state.tool==='tower-pea'?'selected':''}" data-tool="tower-pea"><span class="emoji">🌿</span><span>Pea pod<small class="price">14 gold · quick</small></span></button>
        <button class="tool-btn ${state.tool==='tower-thorn'?'selected':''}" data-tool="tower-thorn"><span class="emoji">🌵</span><span>Thorn cannon<small class="price">24 gold · mighty</small></span></button>
        <button class="action-btn moon" id="${battle?'skip-btn':'wave-btn'}">${battle?'WAVE IN PROGRESS':'LET THE MOON RISE  ☾'}</button></div>`;
      sideEl.innerHTML=`<span class="side-kicker">${battle?'NIGHT WATCH':'DUSK PREPARATION'} · WAVE ${state.day}</span><span class="side-title">${battle?`${Math.max(0,state.total-state.spawned)} still lurking`:`${state.total} shadow${state.total===1?'':'s'} on the trail`}</span><span class="side-text">${battle?'Your towers fire automatically. Protect the barn door at the end of the trail.':'Place towers beside the winding trail. Every tower helps keep the barn safe.'}</span><div class="meter"><span style="width:${Math.max(4,state.health*10)}%;background:#c87664"></span></div>`;
    }else{
      mainEl.innerHTML=`<div class="control-top"><span class="control-title">${state.mode==='lost'?'🌑 &nbsp; THE BARN IS QUIET':'🌟 &nbsp; A FARMER’S TALE'}</span></div><div class="tool-row"><button class="action-btn" id="restart-btn">${state.mode==='lost'?'TRY AGAIN':'PLAY ANOTHER SPRING'} &nbsp; ↻</button></div>`;
      sideEl.innerHTML=`<span class="side-kicker">${state.mode==='lost'?'YOUR STORY':'NIGHTS SURVIVED'}</span><span class="side-title">${state.mode==='lost'?`Made it to day ${state.day}`:`${state.day-1} nights protected`}</span><span class="side-text">${state.mode==='lost'?'Grow crops by day and build more towers before the next wave.':'The Moonroot valley will remember your kindness.'}</span>`;
    }
    mainEl.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
    const sleep=document.getElementById('sleep-btn'); if(sleep)sleep.addEventListener('click',startNight);
    const wave=document.getElementById('wave-btn');if(wave)wave.addEventListener('click',beginWave);
    const restart=document.getElementById('restart-btn');if(restart)restart.addEventListener('click',resetGame);
  }
  function plantsCount(type){return plots.filter(p=>p.crop?.type===type).length;}
  function readyCount(){return plots.filter(p=>p.crop&&p.crop.growth>=2).length;}
  function resetGame(){state.day=1;state.gold=24;state.health=10;state.water=6;state.mode='day';state.tool='plant-turnip';state.towers=[];state.enemies=[];state.bullets=[];plots.forEach(p=>p.crop=null);updateHeader();renderControls();toast('A fresh start in Moonroot Valley!');}
  function startNight(){
    plots.forEach(p=>{if(p.crop){if(p.crop.watered)p.crop.growth=Math.min(2,p.crop.growth+1);p.crop.watered=false;}});
    state.mode='night-prep';state.total=5+Math.min(8,state.day);state.spawned=0;state.nightKills=0;state.enemies=[];state.bullets=[];state.tool='tower-pea';updateHeader();renderControls();toast('Shadows gather along the old trail…');
  }
  function beginWave(){if(state.mode!=='night-prep')return;state.mode='night-battle';state.spawnTimer=.45;state.last=performance.now()/1000;updateHeader();renderControls();toast('The night creatures are coming!');}
  function finishNight(){
    if(state.health<=0){state.mode='lost';updateHeader();renderControls();toast('The barn has fallen…');return;}
    state.gold+=4+Math.floor(state.nightKills/2);state.day++;state.water=6;state.mode='day';state.tool='plant-turnip';state.enemies=[];state.bullets=[];state.towers.forEach(t=>{t.target=null;t.cooldown=.25;});updateHeader();renderControls();toast('You made it! +'+(4+Math.floor(state.nightKills/2))+' gold');
  }
  function handleBoard(x,y){
    if(state.mode==='day'){
      const col=Math.floor((x-270)/94),row=Math.floor((y-195)/91);
      if(col<0||col>5||row<0||row>2)return;
      const p=plots[row*6+col];
      if(state.tool.startsWith('plant-')){
        if(p.crop){toast('That bed already has something growing.');return;}
        const type=state.tool==='plant-turnip'?'turnip':'pumpkin',cost=type==='turnip'?3:8;
        if(state.gold<cost){toast('Not enough gold for that seed.');return;}
        state.gold-=cost;p.crop={type,growth:0,watered:false};toast(type==='turnip'?'A turnip seed is tucked in.':'A pumpkin seed is tucked in.');
      }else if(state.tool==='water'){
        if(!p.crop){toast('Plant a seed here first.');return;}if(p.crop.growth>=2){toast('That crop is ready to harvest!');return;}if(p.crop.watered){toast('This bed is already watered.');return;}if(state.water<=0){toast('Your watering can is empty for today.');return;}
        p.crop.watered=true;state.water--;toast('A little drink for your crop.');
      }else if(state.tool==='harvest'){
        if(!p.crop||p.crop.growth<2){toast('Not ripe just yet. Give it another day.');return;}
        const reward=p.crop.type==='turnip'?12:27;state.gold+=reward;p.crop=null;toast(`Harvested! +${reward} gold`);
      }
      updateHeader();renderControls();
    }else if(state.mode==='night-prep'||state.mode==='night-battle'){
      const i=towerPads.findIndex(p=>Math.hypot(p.x-x,p.y-y)<31);if(i<0)return;
      if(state.towers.some(t=>t.pad===i)){toast('A tower is already guarding this spot.');return;}
      if(state.tool!=='tower-pea'&&state.tool!=='tower-thorn'){toast('Choose a tower to build first.');return;}
      const thorn=state.tool==='tower-thorn',cost=thorn?24:14;if(state.gold<cost){toast('Not enough gold for this tower.');return;}
      state.gold-=cost;state.towers.push({pad:i,x:towerPads[i].x,y:towerPads[i].y,type:thorn?'thorn':'pea',cooldown:.2});toast(thorn?'Thorn cannon planted!':'Pea pod tower planted!');updateHeader();renderControls();
    }
  }
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();handleBoard((e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height);});

  function rr(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
  function ellipse(x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
  function label(text,x,y,size,color,weight='700',align='center'){ctx.fillStyle=color;ctx.font=`${weight} ${size}px 'DM Sans',sans-serif`;ctx.textAlign=align;ctx.fillText(text,x,y);}
  function drawBackground(night){
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,night?'#354866':'#b8d995');sky.addColorStop(.55,night?'#61789a':'#a2c980');sky.addColorStop(1,night?'#81977d':'#83ae68');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    // layered hills
    ctx.fillStyle=night?'#526e6b':'#84b875';ctx.beginPath();ctx.moveTo(0,210);ctx.quadraticCurveTo(190,95,390,205);ctx.quadraticCurveTo(600,85,805,190);ctx.quadraticCurveTo(920,110,1000,165);ctx.lineTo(1000,350);ctx.lineTo(0,350);ctx.fill();
    ctx.fillStyle=night?'#6c836c':'#a1ca7e';ctx.beginPath();ctx.moveTo(0,260);ctx.quadraticCurveTo(185,175,365,254);ctx.quadraticCurveTo(570,150,760,247);ctx.quadraticCurveTo(900,185,1000,240);ctx.lineTo(1000,390);ctx.lineTo(0,390);ctx.fill();
    // distant cottages and tree silhouettes
    for(let i=0;i<8;i++){const x=265+i*105,sy=190+(i%3)*16;ctx.fillStyle=night?'#485a54':'#709e62';ctx.beginPath();ctx.arc(x,sy,21+(i%2)*5,Math.PI,0);ctx.lineTo(x+25,sy+22);ctx.lineTo(x-25,sy+22);ctx.fill();}
    // grassy foreground
    ctx.fillStyle=night?'#526d58':'#78a85d';ctx.fillRect(0,275,W,325);
    for(let i=0;i<100;i++){const x=(i*173+47)%W,y=282+(i*97%300);ctx.strokeStyle=night?'#8aa06c66':'#d5e59a77';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-3,y-5);ctx.moveTo(x,y);ctx.lineTo(x+3,y-4);ctx.stroke();}
    // sun / moon
    if(night){ellipse(886,89,29,29,'#f1e5b9');ellipse(897,78,27,27,'#435977');for(let i=0;i<24;i++){let x=(i*137+34)%W,y=(i*79+23)%245;ellipse(x,y,1.3,1.3,'#fff6d8aa');}}
    else{ellipse(875,92,32,32,'#f9d879');ellipse(875,92,42,42,'#f9d87922');}
  }
  function drawBarn(night){
    // little farmhouse at left
    ctx.save();ctx.translate(73,154);
    ellipse(79,233,103,17,'#243b2b33');
    rr(8,72,142,125,8,night?'#bd8062':'#dfaa70','#755c43');
    ctx.fillStyle=night?'#634b53':'#a95f4c';ctx.beginPath();ctx.moveTo(-2,81);ctx.lineTo(77,20);ctx.lineTo(160,81);ctx.closePath();ctx.fill();ctx.strokeStyle=night?'#493f4a':'#835143';ctx.lineWidth=4;ctx.stroke();
    rr(54,116,52,81,4,night?'#775945':'#a96e46','#70543b');ctx.strokeStyle='#e2bd82';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(80,117);ctx.lineTo(80,195);ctx.stroke();
    rr(19,97,26,28,5,night?'#ecce82':'#f8e4a4','#856a49');ctx.strokeStyle='#806946';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(32,98);ctx.lineTo(32,125);ctx.moveTo(20,111);ctx.lineTo(44,111);ctx.stroke();
    rr(113,97,26,28,5,night?'#e7c879':'#f8e4a4','#856a49');ctx.strokeStyle='#806946';ctx.beginPath();ctx.moveTo(126,98);ctx.lineTo(126,125);ctx.moveTo(114,111);ctx.lineTo(138,111);ctx.stroke();
    rr(58,57,38,26,4,night?'#8c6651':'#c88754','#71543f');ctx.restore();
    // fence
    ctx.strokeStyle=night?'#8a8064':'#e0c58c';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(239,282);ctx.lineTo(238,505);ctx.moveTo(242,322);ctx.lineTo(256,322);ctx.moveTo(242,483);ctx.lineTo(257,483);ctx.stroke();
    for(let i=0;i<6;i++){let y=291+i*39;rr(231,y,14,24,3,night?'#877a5e':'#dfc187');}
    // well
    ellipse(156,426,35,13,'#32473a55');rr(121,381,69,45,9,night?'#777e70':'#b5b39a','#77785f');ellipse(155,382,35,11,night?'#75888a':'#d3d4b8');ellipse(155,383,21,6,'#588694');ctx.strokeStyle='#765d42';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(127,378);ctx.lineTo(127,352);ctx.lineTo(183,352);ctx.lineTo(183,378);ctx.stroke();ctx.beginPath();ctx.moveTo(149,352);ctx.lineTo(149,380);ctx.stroke();
    // flower patches
    for(const [x,y,c] of [[225,212,'#f7d786'],[213,522,'#f5c2c0'],[62,524,'#f6d681'],[940,187,'#efbcb2'],[916,523,'#f6d681']]){for(let k=0;k<4;k++){ellipse(x+Math.cos(k*Math.PI/2)*4,y+Math.sin(k*Math.PI/2)*4,3,3,c);}ellipse(x,y,2,2,'#d89852');}
  }
  function drawDay(){
    drawBackground(false);drawBarn(false);
    // garden beds
    for(let row=0;row<3;row++)for(let col=0;col<6;col++){
      const i=row*6+col,x=274+col*94,y=198+row*91,p=plots[i];
      ellipse(x+41,y+73,41,9,'#35432730');rr(x,y,84,76,11,'#79533b','#d0b181');rr(x+4,y+4,76,67,8,'#926747');
      ctx.strokeStyle='#b6875d';ctx.lineWidth=2;for(let k=0;k<3;k++){ctx.beginPath();ctx.moveTo(x+9,y+19+k*19);ctx.lineTo(x+75,y+19+k*19);ctx.stroke();}
      if(p.crop)drawCrop(x+42,y+37,p.crop);
      else{ctx.strokeStyle='#d2a777';ctx.lineWidth=2;ctx.setLineDash([3,5]);ctx.strokeRect(x+11,y+12,62,52);ctx.setLineDash([]);label('＋',x+42,y+45,18,'#d7b785','600');}
      if(state.hover&&state.hover.type==='plot'&&state.hover.id===i){ctx.strokeStyle='#fff9ce';ctx.lineWidth=3;ctx.strokeRect(x+1,y+1,82,74);}
    }
    label('THE GARDEN',558,181,10,'#fff5d5','900');
    // basket and tools decor
    rr(887,471,60,44,10,'#ca985f','#805d3c');ctx.strokeStyle='#805d3c';ctx.lineWidth=4;ctx.beginPath();ctx.arc(917,476,21,Math.PI,0);ctx.stroke();label('✦',918,502,15,'#f9e3a8');
    for(let i=0;i<3;i++){ellipse(912+i*10,457-i%2*4,7,5,['#dca846','#c88561','#dfb35d'][i]);}
    if(state.mode==='day'&&state.tool.startsWith('plant'))label('✿',state.hover?.type==='plot'?274+(state.hover.id%6)*94+42:0,state.hover?.type==='plot'?198+Math.floor(state.hover.id/6)*91+37:0,18,'#fff9d8');
  }
  function drawCrop(x,y,crop){
    if(crop.growth===0){
      ctx.strokeStyle='#486e3c';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,y+20);ctx.quadraticCurveTo(x,y+8,x-4,y+3);ctx.moveTo(x,y+17);ctx.quadraticCurveTo(x+2,y+7,x+8,y+5);ctx.stroke();ellipse(x-4,y+3,5,3,'#8ebc69');ellipse(x+8,y+5,5,3,'#8ebc69');
    }else if(crop.type==='turnip'){
      ctx.strokeStyle='#376a3e';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,y+20);ctx.lineTo(x,y-2);ctx.stroke();ellipse(x-8,y+1,9,5,'#67a85b');ellipse(x+8,y-4,9,5,'#82b65e');ellipse(x,y+19,crop.growth>=2?17:12,crop.growth>=2?14:10,'#e1cce0');ctx.beginPath();ctx.moveTo(x,y+25);ctx.lineTo(x-3,y+32);ctx.strokeStyle='#a68aa1';ctx.lineWidth=2;ctx.stroke();
    }else{
      ctx.strokeStyle='#3c713d';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,y+22);ctx.quadraticCurveTo(x-3,y+4,x+2,y-5);ctx.stroke();ellipse(x-9,y+8,11,6,'#72a956');ellipse(x+11,y+1,11,6,'#85b866');ellipse(x,y+13,crop.growth>=2?17:12,crop.growth>=2?15:10,'#ef9b3e');ctx.strokeStyle='#b86d31';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-7,y+16);ctx.quadraticCurveTo(x,y+7,x+7,y+17);ctx.stroke();
    }
    if(crop.watered){ellipse(x+22,y-20,4,6,'#70c7d8');ellipse(x-20,y-16,3,4,'#70c7d8');}
    if(crop.growth>=2){for(let i=0;i<3;i++)ellipse(x-17+i*17,y-24,2.4,2.4,'#fff0a1');}
    else if(crop.growth===1){ellipse(x+19,y-22,3,3,'#f6dc93');}
    if(crop.growth<2)label(crop.watered?'WET':'NEEDS WATER',x,y+57,7,crop.watered?'#9bd8d4':'#e9d8b8','900');else label('READY!',x,y+57,8,'#fff5ba','900');
  }
  function drawNight(){
    drawBackground(true);drawBarn(true);
    ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);for(let i=1;i<path.length;i++)ctx.lineTo(path[i].x,path[i].y);
    ctx.strokeStyle='#344742';ctx.lineWidth=82;ctx.stroke();ctx.strokeStyle='#b49b72';ctx.lineWidth=67;ctx.stroke();ctx.strokeStyle='#c9b187';ctx.lineWidth=2;ctx.setLineDash([12,14]);ctx.stroke();ctx.setLineDash([]);
    for(let i=0;i<35;i++){let x=(i*91+28)%980,y=287+(i*61%182);if(y<340||y>416)ellipse(x,y,2,1.4,'#e1c99b66');}
    rr(78,395,71,68,8,'#765c47','#d5b178');ctx.strokeStyle='#e7c894';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(81,403);ctx.lineTo(145,403);ctx.moveTo(83,454);ctx.lineTo(145,454);ctx.stroke();label('BARN',113,390,9,'#f1dfb8','900');
    towerPads.forEach((p,i)=>{const built=state.towers.find(t=>t.pad===i);if(!built){ellipse(p.x,p.y+5,28,12,'#293b303a');ellipse(p.x,p.y,25,18,'#8e9b71');ellipse(p.x,p.y-2,19,12,'#a8b586');ctx.setLineDash([3,3]);ctx.strokeStyle='#f0dfa4aa';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,21,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);label('＋',p.x,p.y+5,18,'#f9edc9','700');}else drawTower(built);if(state.hover&&state.hover.type==='pad'&&state.hover.id===i&&!built){ctx.strokeStyle='#fff7bd';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,29,0,Math.PI*2);ctx.stroke();}});
    state.towers.forEach(t=>{if(t.target&&state.mode==='night-battle'){ctx.strokeStyle=t.type==='thorn'?'#ffcf7e24':'#d5ffc52b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(t.x,t.y-13);ctx.lineTo(t.target.x,t.target.y);ctx.stroke();}});
    state.bullets.forEach(b=>{ellipse(b.x,b.y,b.type==='thorn'?7:5,b.type==='thorn'?7:5,b.type==='thorn'?'#ffcf73':'#bde886');ellipse(b.x-2,b.y-2,2,2,'#fff5c3');});state.enemies.forEach(drawEnemy);
    if(state.mode==='night-prep'){rr(423,66,182,32,16,'#1c3446cc');label('TAP A MOON PAD TO BUILD',514,87,9,'#f5e9c2','900');}
    else if(state.mode==='night-battle'){rr(802,20,168,34,17,'#24394dce');label(`SHADOWS  ${state.enemies.length} / ${state.total}`,886,42,10,'#f4e7c4','900');}
  }
  function drawTower(t){
    ellipse(t.x,t.y+15,29,11,'#1d2c2d55');ellipse(t.x,t.y,22,17,t.type==='thorn'?'#426e4c':'#5d9755');ellipse(t.x-2,t.y-7,14,12,t.type==='thorn'?'#619553':'#89b965');
    if(t.type==='pea'){ctx.strokeStyle='#38684a';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(t.x+1,t.y+3);ctx.lineTo(t.x+2,t.y-18);ctx.stroke();ellipse(t.x+6,t.y-18,12,10,'#75ae5e');ellipse(t.x+15,t.y-18,7,6,'#4e8b52');ellipse(t.x+17,t.y-18,2,2,'#244e3c');}
    else{for(let i=0;i<4;i++){const a=i*Math.PI/2;ellipse(t.x+Math.cos(a)*11,t.y-7+Math.sin(a)*11,8,7,'#3f7b50');}ellipse(t.x,t.y-8,10,9,'#9cc36e');ellipse(t.x+3,t.y-11,4,4,'#315a42');}
  }
  function drawEnemy(e){
    const bob=Math.sin(e.phase)*3;ellipse(e.x,e.y+13,17,7,'#20313a70');const g=ctx.createRadialGradient(e.x-5,e.y-8,2,e.x,e.y,22);g.addColorStop(0,'#a9d681');g.addColorStop(1,e.kind==='big'?'#6c7954':'#557c66');
    ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(e.x-17,e.y+9+bob);ctx.quadraticCurveTo(e.x-23,e.y-8+bob,e.x-10,e.y-16+bob);ctx.quadraticCurveTo(e.x,e.y-25+bob,e.x+11,e.y-15+bob);ctx.quadraticCurveTo(e.x+23,e.y-6+bob,e.x+17,e.y+10+bob);ctx.quadraticCurveTo(e.x,e.y+17+bob,e.x-17,e.y+9+bob);ctx.fill();
    ellipse(e.x-6,e.y-5+bob,2.4,3,'#263b3b');ellipse(e.x+6,e.y-5+bob,2.4,3,'#263b3b');ctx.strokeStyle='#3c4d42';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(e.x,e.y+1+bob,4,.2,Math.PI-.2);ctx.stroke();rr(e.x-15,e.y-31+bob,30,4,2,'#273b3b');rr(e.x-15,e.y-31+bob,30*Math.max(0,e.hp/e.maxHp),4,2,'#e27d70');
  }
  function pathPosition(distance){for(let i=0;i<path.length-1;i++){const a=path[i],b=path[i+1],len=Math.hypot(b.x-a.x,b.y-a.y);if(distance<=len){const t=distance/len;return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}distance-=len;}return {...path[path.length-1]};}
  function updateBattle(dt){
    if(state.mode!=='night-battle')return;
    if(state.spawned<state.total){state.spawnTimer-=dt;if(state.spawnTimer<=0){const hp=3+Math.floor(state.day/2);state.enemies.push({distance:0,x:path[0].x,y:path[0].y,hp,maxHp:hp,speed:57+Math.min(25,state.day*2),phase:Math.random()*6,kind:state.day>4&&state.spawned%4===3?'big':'slime'});state.spawned++;state.spawnTimer=1.35;}}
    state.enemies.forEach(e=>{e.phase+=dt*6;e.distance+=e.speed*dt;const p=pathPosition(e.distance);e.x=p.x;e.y=p.y;});
    for(const t of state.towers){t.cooldown-=dt;const range=t.type==='thorn'?230:185;const target=state.enemies.filter(e=>Math.hypot(e.x-t.x,e.y-t.y)<range).sort((a,b)=>b.distance-a.distance)[0];t.target=target||null;if(target&&t.cooldown<=0){state.bullets.push({x:t.x,y:t.y-13,target,damage:t.type==='thorn'?2:1,speed:t.type==='thorn'?350:430,type:t.type});t.cooldown=t.type==='thorn'?1.45:.72;}}
    state.bullets.forEach(b=>{if(!state.enemies.includes(b.target)){b.dead=true;return;}const dx=b.target.x-b.x,dy=b.target.y-b.y,d=Math.hypot(dx,dy),step=b.speed*dt;if(d<=step+8){b.target.hp-=b.damage;b.dead=true;if(b.target.hp<=0){state.enemies=state.enemies.filter(e=>e!==b.target);state.nightKills++;state.gold++;}}else{b.x+=dx/d*step;b.y+=dy/d*step;}});state.bullets=state.bullets.filter(b=>!b.dead);
    const length=path.reduce((sum,p,i)=>i?sum+Math.hypot(p.x-path[i-1].x,p.y-path[i-1].y):sum,0),escaped=state.enemies.filter(e=>e.distance>length);
    if(escaped.length){state.health=Math.max(0,state.health-escaped.length);state.enemies=state.enemies.filter(e=>!escaped.includes(e));updateHeader();renderControls();toast(escaped.length===1?'A shadow slipped past the towers!':`${escaped.length} shadows reached the barn!`);}
    if(state.health<=0){state.mode='lost';updateHeader();renderControls();toast('The barn has fallen…');}
    else if(state.spawned>=state.total&&state.enemies.length===0)finishNight();
  }
  function update(dt){if(state.toastTimer>0){state.toastTimer-=dt;if(state.toastTimer<=0)toastEl.classList.remove('show');}updateBattle(dt);}
  function draw(){if(state.mode==='day')drawDay();else drawNight();}
  function loop(now){const t=now/1000,dt=Math.min(.05,state.last?Math.max(0,t-state.last):0);state.last=t;update(dt);draw();requestAnimationFrame(loop);}
  canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;if(state.mode==='day'){const col=Math.floor((x-270)/94),row=Math.floor((y-195)/91);state.hover=col>=0&&col<6&&row>=0&&row<3?{type:'plot',id:row*6+col}:null;}else{const i=towerPads.findIndex(p=>Math.hypot(p.x-x,p.y-y)<31);state.hover=i<0?null:{type:'pad',id:i};}});
  canvas.addEventListener('pointerleave',()=>state.hover=null);
  updateHeader();renderControls();requestAnimationFrame(loop);
})();

