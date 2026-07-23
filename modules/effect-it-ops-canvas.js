/* effect-it-ops-canvas.js — live "IT Operations Center" canvas illustration. Unmodified. */
/* ================= PHASE 6 — LIVE "IT OPERATIONS CENTER" CANVAS SCENE =================
   Adapted & expanded from a reference demo the client supplied: same engine family as the
   hero's SVG network (packets, pulses, scan cones) but rebuilt on <canvas>, and widened to
   show a full IT environment — workstation, server rack, camera, switch/firewall, IP phone
   system, WiFi access point and cloud — not just networking gear.
   Safety/perf additions the reference demo did not have:
     - IntersectionObserver: the rAF loop only runs while the section is on screen.
     - prefers-reduced-motion: draws a single static frame, no animation loop at all.
     - Independent function/variable names (itOps*) so nothing here can collide with the
       existing hero network script. */
(function(){
  const stage = document.getElementById('itOpsStage');
  const canvas = document.getElementById('itOpsCanvas');
  if(!stage || !canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W=0, H=0;
  const nodes = {};
  function itOpsResize(){
    W = stage.offsetWidth; H = stage.offsetHeight;
    canvas.width = W*devicePixelRatio; canvas.height = H*devicePixelRatio;
    ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
    itOpsLayout();
  }
  function itOpsLayout(){
    nodes.firewall = {x:W*0.09, y:H*0.55, label:'فايروول'};
    nodes.switchN  = {x:W*0.36, y:H*0.55, label:'سويتش'};
    nodes.cloud    = {x:W*0.90, y:H*0.20, label:'سحابة'};
    nodes.camera   = {x:W*0.22, y:H*0.15, label:'كاميرا'};
    nodes.ap       = {x:W*0.55, y:H*0.13, label:'واي فاي'};
    nodes.rack     = {x:W*0.12, y:H*0.85, label:'سيرفر'};
    nodes.nvr      = {x:W*0.36, y:H*0.88, label:'تخزين'};
    nodes.pc       = {x:W*0.60, y:H*0.85, label:'كمبيوتر'};
    nodes.phone    = {x:W*0.86, y:H*0.62, label:'سنترال IP'};
  }

  const mouse = {x:-9999,y:-9999};
  stage.addEventListener('mousemove', e=>{
    const r = stage.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  stage.addEventListener('mouseleave', ()=>{ mouse.x=-9999; mouse.y=-9999; });

  /* ---- packets traveling along hub-and-spoke paths ---- */
  let packets = [];
  const PATHS = {
    'fw-sw':    {a:'firewall', b:'switchN', color:'#2fd8ff'},
    'sw-cloud': {a:'switchN',  b:'cloud',   color:'#2fd8ff'},
    'sw-nvr':   {a:'switchN',  b:'nvr',     color:'#3ee89a'},
    'sw-rack':  {a:'switchN',  b:'rack',    color:'#3ee89a'},
    'sw-pc':    {a:'switchN',  b:'pc',      color:'#7b8cff'},
    'sw-phone': {a:'switchN',  b:'phone',   color:'#f5a623'}
  };
  function spawnPacket(pathKey, isThreat){
    packets.push({path:pathKey, t:0, speed:0.005+Math.random()*0.006, threat:!!isThreat, blocked:false, yOff:(Math.random()-0.5)*8});
  }
  function pathPoint(pathKey, t){
    const p = PATHS[pathKey]; const a = nodes[p.a], b = nodes[p.b];
    return {x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t};
  }

  /* ---- switch port LEDs ---- */
  const PORT_COUNT = 10;
  let ports = Array.from({length:PORT_COUNT},()=>({on:Math.random()<0.5}));

  let camAngle=0, camDir=1, switchLit=0, fanAngle=0, fwPulse=0;
  let cloudParticles = Array.from({length:36},()=>({a:Math.random()*Math.PI*2, r:Math.random()*22+6, speed:(Math.random()*0.4+0.15)*(Math.random()<0.5?1:-1), size:Math.random()*1.6+0.5}));
  let wifiRings = [];
  let callRings = [];
  let pcBlink = 0;
  let activeCalls = 2;

  /* ---- ambient depth: soft twinkling starfield behind the topology (purely decorative, cheap to draw) ---- */
  let stars = [];
  function itOpsSeedStars(){
    stars = Array.from({length:46},()=>({x:Math.random(), y:Math.random(), r:Math.random()*1.3+0.3, phase:Math.random()*Math.PI*2, speed:Math.random()*0.02+0.01}));
  }
  function drawStarfield(t){
    stars.forEach(s=>{
      const tw = (Math.sin(t*s.speed*60 + s.phase)+1)/2;
      ctx.beginPath(); ctx.arc(s.x*W, s.y*H, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(160,200,255,${0.06+tw*0.16})`;
      ctx.fill();
    });
  }

  /* ---- arrival "impact" flash: a brief glow ring on whichever node a packet just reached ---- */
  const nodeHit = {};
  function pingNode(key){ nodeHit[key] = 1; }
  function drawArrivalFlashes(){
    Object.keys(nodeHit).forEach(key=>{
      const v = nodeHit[key];
      if(v <= 0.02){ delete nodeHit[key]; return; }
      const n = nodes[key]; if(!n) return;
      ctx.beginPath(); ctx.arc(n.x, n.y, 8 + (1-v)*16, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(120,200,255,${v*0.5})`; ctx.lineWidth = 1.4; ctx.stroke();
      nodeHit[key] = v * 0.88;
    });
  }

  function drawNode(pos, color, r=7){
    ctx.beginPath(); ctx.arc(pos.x,pos.y,r,0,Math.PI*2);
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 13; ctx.fill(); ctx.shadowBlur = 0;
  }
  function drawLabel(pos, text){
    ctx.font = '600 10px Cairo, Tahoma, sans-serif';
    ctx.fillStyle = 'rgba(210,222,240,0.62)';
    ctx.textAlign = 'center';
    ctx.fillText(text, pos.x, pos.y + 24);
  }
  function drawLine(a,b,color,width=1.2){
    const mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
    const dist = Math.hypot(mouse.x-mx, mouse.y-my);
    let cx=mx, cy=my;
    if(dist < 150){ const pull=(150-dist)/150*16; const ang=Math.atan2(my-mouse.y, mx-mouse.x); cx+=Math.cos(ang)*pull; cy+=Math.sin(ang)*pull; }
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.quadraticCurveTo(cx,cy,b.x,b.y);
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  }
  function drawFan(cx,cy,r,angle,color){
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle);
    for(let i=0;i<3;i++){
      ctx.rotate(Math.PI*2/3);
      ctx.beginPath(); ctx.ellipse(0,-r*0.5,r*0.3,r*0.5,0,0,Math.PI*2);
      ctx.fillStyle = color; ctx.globalAlpha = 0.6; ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(0,0,r*0.18,0,Math.PI*2); ctx.fillStyle = '#101826'; ctx.fill();
    ctx.restore();
  }

  function itOpsDraw(){
    ctx.clearRect(0,0,W,H);

    /* ambient depth: subtle vignette + twinkling starfield behind the topology */
    const bgGrad = ctx.createRadialGradient(W*0.5,H*0.45,0,W*0.5,H*0.45,Math.max(W,H)*0.75);
    bgGrad.addColorStop(0,'rgba(47,216,255,0.05)'); bgGrad.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = bgGrad; ctx.fillRect(0,0,W,H);
    drawStarfield(Date.now()*0.001);

    drawLine(nodes.firewall, nodes.switchN, 'rgba(47,216,255,0.25)', 1.4);
    drawLine(nodes.switchN, nodes.cloud, 'rgba(47,216,255,0.18)', 1.1);
    drawLine(nodes.switchN, nodes.camera, 'rgba(47,216,255,0.16)', 1);
    drawLine(nodes.switchN, nodes.ap, 'rgba(62,232,154,0.16)', 1);
    drawLine(nodes.switchN, nodes.rack, 'rgba(120,150,190,0.2)', 1);
    drawLine(nodes.switchN, nodes.nvr, 'rgba(120,150,190,0.16)', 1);
    drawLine(nodes.switchN, nodes.pc, 'rgba(123,140,255,0.2)', 1);
    drawLine(nodes.switchN, nodes.phone, 'rgba(245,166,35,0.22)', 1);

    /* camera scan cone */
    camAngle += 0.011*camDir; if(Math.abs(camAngle) > 0.45) camDir *= -1;
    const camBase = Math.atan2(nodes.switchN.y-nodes.camera.y, nodes.switchN.x-nodes.camera.x);
    const coneLen = Math.hypot(nodes.switchN.x-nodes.camera.x, nodes.switchN.y-nodes.camera.y)*0.7;
    const a1 = camBase+camAngle-0.15, a2 = camBase+camAngle+0.15;
    ctx.beginPath(); ctx.moveTo(nodes.camera.x, nodes.camera.y);
    ctx.lineTo(nodes.camera.x+Math.cos(a1)*coneLen, nodes.camera.y+Math.sin(a1)*coneLen);
    ctx.lineTo(nodes.camera.x+Math.cos(a2)*coneLen, nodes.camera.y+Math.sin(a2)*coneLen);
    ctx.closePath();
    const coneGrad = ctx.createRadialGradient(nodes.camera.x,nodes.camera.y,0,nodes.camera.x,nodes.camera.y,coneLen);
    coneGrad.addColorStop(0,'rgba(47,216,255,0.14)'); coneGrad.addColorStop(1,'rgba(47,216,255,0)');
    ctx.fillStyle = coneGrad; ctx.fill();
    drawNode(nodes.camera, '#2fd8ff', 7);
    drawLabel(nodes.camera, nodes.camera.label);

    /* firewall pulse */
    fwPulse += 0.02;
    drawNode(nodes.firewall, '#ff4d6a', 6.5+Math.sin(fwPulse)*1.6);
    drawLabel(nodes.firewall, nodes.firewall.label);

    /* switch + port LEDs */
    switchLit = Math.max(0, switchLit-0.02);
    const haloR = 26 + Math.sin(Date.now()*0.0016)*4;
    const haloGrad = ctx.createRadialGradient(nodes.switchN.x,nodes.switchN.y,0,nodes.switchN.x,nodes.switchN.y,haloR);
    haloGrad.addColorStop(0, switchLit>0.05 ? 'rgba(62,232,154,0.16)' : 'rgba(47,216,255,0.14)');
    haloGrad.addColorStop(1,'rgba(47,216,255,0)');
    ctx.fillStyle = haloGrad; ctx.beginPath(); ctx.arc(nodes.switchN.x,nodes.switchN.y,haloR,0,Math.PI*2); ctx.fill();
    drawNode(nodes.switchN, switchLit>0.05 ? '#3ee89a' : '#2fd8ff', 8+switchLit*3);
    ports.forEach((p,i)=>{
      const px = nodes.switchN.x - 24 + i*5.2, py = nodes.switchN.y + 15;
      ctx.beginPath(); ctx.arc(px,py,1.4,0,Math.PI*2);
      ctx.fillStyle = p.on ? '#3ee89a' : 'rgba(120,150,190,0.3)';
      if(p.on){ ctx.shadowColor='#3ee89a'; ctx.shadowBlur=5; }
      ctx.fill(); ctx.shadowBlur=0;
    });
    drawLabel(nodes.switchN, nodes.switchN.label);

    /* server rack + fans */
    ctx.fillStyle='#0f1622'; ctx.fillRect(nodes.rack.x-22, nodes.rack.y-42, 44, 84);
    ctx.strokeStyle='rgba(120,150,190,0.25)'; ctx.strokeRect(nodes.rack.x-22, nodes.rack.y-42, 44, 84);
    fanAngle += 0.08;
    drawFan(nodes.rack.x, nodes.rack.y-20, 10, fanAngle, '#3ee89a');
    drawFan(nodes.rack.x, nodes.rack.y+4, 10, -fanAngle*1.3, '#3ee89a');
    drawFan(nodes.rack.x, nodes.rack.y+26, 10, fanAngle*0.8, '#3ee89a');
    drawLabel({x:nodes.rack.x, y:nodes.rack.y+42}, nodes.rack.label);

    /* NVR storage bar */
    const storagePhase = (Math.sin(Date.now()*0.0006)+1)/2;
    ctx.fillStyle='#0f1622'; ctx.fillRect(nodes.nvr.x-24, nodes.nvr.y-7, 48, 14);
    ctx.strokeStyle='rgba(120,150,190,0.3)'; ctx.strokeRect(nodes.nvr.x-24, nodes.nvr.y-7, 48, 14);
    ctx.fillStyle='rgba(47,216,255,0.5)'; ctx.fillRect(nodes.nvr.x-22, nodes.nvr.y-5, 44*storagePhase, 10);
    drawLabel({x:nodes.nvr.x, y:nodes.nvr.y+10}, nodes.nvr.label);

    /* access point + wifi rings */
    drawNode(nodes.ap, '#3ee89a', 6);
    wifiRings.forEach(r=>{ r.r += 0.8; r.alpha -= 0.007;
      ctx.beginPath(); ctx.arc(nodes.ap.x, nodes.ap.y, r.r, Math.PI*1.1, Math.PI*1.9);
      ctx.strokeStyle = `rgba(62,232,154,${Math.max(0,r.alpha)})`; ctx.lineWidth=1.3; ctx.stroke();
    });
    wifiRings = wifiRings.filter(r=>r.alpha>0);
    drawLabel(nodes.ap, nodes.ap.label);

    /* cloud + orbiting particles */
    cloudParticles.forEach(p=>{ p.a += p.speed*0.02;
      const x = nodes.cloud.x + Math.cos(p.a)*p.r, y = nodes.cloud.y + Math.sin(p.a)*p.r*0.6;
      ctx.beginPath(); ctx.arc(x,y,p.size,0,Math.PI*2); ctx.fillStyle='rgba(47,216,255,0.5)'; ctx.fill();
    });
    drawNode(nodes.cloud, '#2fd8ff', 6);
    drawLabel(nodes.cloud, nodes.cloud.label);

    /* workstation (PC): monitor glyph + blinking activity dot */
    pcBlink += 0.05;
    ctx.fillStyle='#0f1622'; ctx.fillRect(nodes.pc.x-14, nodes.pc.y-11, 28, 18);
    ctx.strokeStyle='rgba(123,140,255,0.35)'; ctx.strokeRect(nodes.pc.x-14, nodes.pc.y-11, 28, 18);
    ctx.fillStyle='rgba(123,140,255,0.25)'; ctx.fillRect(nodes.pc.x-9, nodes.pc.y+8, 18, 3);
    const pcOn = (Math.sin(pcBlink)+1)/2 > 0.4;
    ctx.beginPath(); ctx.arc(nodes.pc.x+8, nodes.pc.y-5, 1.8, 0, Math.PI*2);
    ctx.fillStyle = pcOn ? '#7b8cff' : 'rgba(123,140,255,0.25)';
    if(pcOn){ ctx.shadowColor='#7b8cff'; ctx.shadowBlur=6; }
    ctx.fill(); ctx.shadowBlur=0;
    drawLabel({x:nodes.pc.x, y:nodes.pc.y+11}, nodes.pc.label);

    /* IP phone / PBX: handset glyph + call rings */
    drawNode(nodes.phone, '#f5a623', 6);
    callRings.forEach(r=>{ r.r += 0.7; r.alpha -= 0.008;
      ctx.beginPath(); ctx.arc(nodes.phone.x, nodes.phone.y, r.r, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(245,166,35,${Math.max(0,r.alpha)})`; ctx.lineWidth=1.3; ctx.stroke();
    });
    callRings = callRings.filter(r=>r.alpha>0);
    drawLabel(nodes.phone, nodes.phone.label);

    /* packets along every spoke, each with a short fading trail for a livelier "data flow" feel */
    packets.forEach(pk=>{
      pk.t += pk.speed;
      if(pk.path==='fw-sw' && pk.threat && pk.t>0.4 && pk.t<0.6 && !pk.blocked){ pk.blocked = true; pk.blockedAt = pk.t; }
      const pt = pathPoint(pk.path, Math.min(pk.t,1));
      let color = PATHS[pk.path].color;
      if(pk.path==='fw-sw' && pk.threat) color = pk.t < (pk.blockedAt||0.5) ? '#ff4d6a' : '#3ee89a';
      let dx=0,dy=0;
      const dist = Math.hypot(mouse.x-pt.x, mouse.y-pt.y);
      if(dist<60){ const f=(60-dist)/60*8; const ang=Math.atan2(pt.y-mouse.y,pt.x-mouse.x); dx=Math.cos(ang)*f; dy=Math.sin(ang)*f; }
      // trail: a few fading echoes just behind the packet along the same path
      for(let k=3;k>=1;k--){
        const tt = Math.max(0, pk.t - k*0.035);
        const tp = pathPoint(pk.path, tt);
        ctx.beginPath(); ctx.arc(tp.x+dx, tp.y+dy+pk.yOff*0.3, 2*(1-k*0.22), 0, Math.PI*2);
        ctx.fillStyle = color; ctx.globalAlpha = 0.22*(1-k*0.22); ctx.fill(); ctx.globalAlpha = 1;
      }
      ctx.beginPath(); ctx.arc(pt.x+dx, pt.y+dy+pk.yOff*0.3, 2, 0, Math.PI*2);
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 7; ctx.fill(); ctx.shadowBlur = 0;
      if(pk.path==='fw-sw' && Math.abs(camAngle) < 0.05) switchLit = 1;
      if(pk.t >= 1 && !pk.arrived){ pk.arrived = true; pingNode(PATHS[pk.path].b); }
    });
    packets = packets.filter(p=>p.t<1);

    drawArrivalFlashes();
  }

  /* ---- rAF loop, only while the section is visible (real perf win over the reference demo) ---- */
  let rafId = null, running = false;
  function loop(){ itOpsDraw(); rafId = requestAnimationFrame(loop); }
  function start(){ if(running || reduceMotion) return; running = true; loop(); }
  function stop(){ running = false; if(rafId) cancelAnimationFrame(rafId); rafId = null; }

  const spawners = [];
  function startSpawners(){
    spawners.push(setInterval(()=> spawnPacket('fw-sw', Math.random()<0.3), 260));
    spawners.push(setInterval(()=> spawnPacket('sw-cloud'), 420));
    spawners.push(setInterval(()=> spawnPacket('sw-nvr'), 460));
    spawners.push(setInterval(()=> spawnPacket('sw-rack'), 520));
    spawners.push(setInterval(()=> spawnPacket('sw-pc'), 600));
    spawners.push(setInterval(()=> spawnPacket('sw-phone'), 900));
    spawners.push(setInterval(()=> { ports.forEach(p=>{ if(Math.random()<0.35) p.on = !p.on; }); }, 300));
    spawners.push(setInterval(()=> wifiRings.push({r:0, alpha:0.5}), 1000));
    spawners.push(setInterval(()=>{ callRings.push({r:0, alpha:0.55}); activeCalls = Math.max(0, activeCalls + (Math.random()<0.5?1:-1)); const el=document.getElementById('itOpsCalls'); if(el) el.textContent = Math.max(1,activeCalls); }, 1400));
  }

  itOpsSeedStars();
  itOpsResize();
  window.addEventListener('resize', itOpsResize);

  /* FIX: the "من نحن" page is `display:none` until the user navigates to it, so on
     first page load stage.offsetWidth/offsetHeight are both 0 and the canvas gets
     sized 0x0 — nothing ever draws again because a plain window 'resize' event never
     fires just from switching pages. A ResizeObserver catches that 0 -> real-size
     jump the moment the page becomes visible (display:none -> block), so the canvas
     gets re-sized and redrawn correctly every time this section appears on screen. */
  if(window.ResizeObserver){
    const ro = new ResizeObserver(()=> itOpsResize());
    ro.observe(stage);
  }

  if(reduceMotion){
    itOpsDraw(); /* single static frame, fully readable, no motion at all */
  } else {
    startSpawners();
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){ itOpsResize(); start(); }
        else stop();
      });
    }, { threshold: 0.1 });
    io.observe(stage);
  }
})();

/* ================= Slim top promo bar =================
   Offers are editable by the admin from admin.html (تبويب "إعدادات الموقع") —
   they're stored in Supabase `site_settings` under the key 'promo_offers' and
   fetched here at runtime. If Supabase has nothing configured yet (or the
   request fails), we fall back to these defaults so the bar never looks broken. */
(function(){
  const DEFAULT_OFFERS = [
    { brand:'Tiandy', text:'باقة Tiandy: ٤ كاميرات + NVR ٤ قنوات + هارد ١ تيرا بـ 6,000 ج.م بدل 7,800 (وفّر 1,800)', short:'باقة Tiandy 6,000 ج.م بدل 7,800' },
    { brand:'Hikvision', text:'باقة Hikvision منزلية: كاميرتين + NVR بـ 4,250 ج.م بدل 5,100 (وفّر 850)', short:'باقة Hikvision 4,250 ج.م بدل 5,100' },
    { brand:'Ruijie', text:'راوتر Ruijie Enterprise + نقطة وصول بـ 3,100 ج.م بدل 3,650 (وفّر 550)', short:'راوتر Ruijie 3,100 ج.م بدل 3,650' }
  ];
  const root = document.getElementById('promoBar');
  const textEl = document.getElementById('promoBarText');
  const cta = document.getElementById('promoBarCta');
  if(!root || !textEl || !cta) return;
  if(sessionStorage.getItem('promoBarDismissed') === '1'){ root.classList.add('hide'); return; }
  let OFFERS = DEFAULT_OFFERS;
  let i = 0, rotateTimer = null;
  function render(){
    const o = OFFERS[i];
    const useShort = window.innerWidth <= 700 && o.short;
    textEl.style.animation = 'none'; void textEl.offsetWidth; textEl.style.animation = '';
    textEl.textContent = useShort ? o.short : o.text;
    cta.onclick = function(){
      const msg = `عايز أعرف تفاصيل عرض: ${o.text}`;
      if(typeof WHATSAPP_NUMBER !== 'undefined'){
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
      }
    };
  }
  window.dismissPromoBar = function(){
    root.classList.remove('show');
    document.body.classList.remove('has-promo');
    sessionStorage.setItem('promoBarDismissed', '1');
    setTimeout(()=> root.classList.add('hide'), 500);
    if(rotateTimer) clearInterval(rotateTimer);
  };
  function start(){
    render();
    setTimeout(()=>{ root.classList.add('show'); document.body.classList.add('has-promo'); }, 1600);
    if(rotateTimer) clearInterval(rotateTimer);
    if(OFFERS.length > 1) rotateTimer = setInterval(()=>{ i = (i+1) % OFFERS.length; render(); }, 6500);
  }
  start();
  window.addEventListener('resize', render);
  if(typeof sb !== 'undefined' && sb && sb.from){
    sb.from('site_settings').select('value').eq('key','promo_offers').maybeSingle()
      .then(({ data }) => {
        const list = data && data.value && Array.isArray(data.value) && data.value.length ? data.value : null;
        if(list){ OFFERS = list; i = 0; start(); }
      })
      .catch(()=>{ /* keep defaults on any error */ });
  }
})();

/* ================= Admin-editable "الحلول" mega-menu =================
   Managed from admin.html ("🎛️ إعدادات الموقع" tab) without touching any code -
   stored in Supabase `site_settings` under the key 'solutions_menu'. If nothing is
   configured yet (or the request fails) the hardcoded defaults already in the HTML
   stay exactly as they are, so the menu never looks broken. */
(function(){
  if(typeof sb === 'undefined' || !sb || !sb.from) return;
  const listHost = document.getElementById('megaSolList');
  const showHost = document.getElementById('megaSolShowcase');
  if(!listHost || !showHost) return;

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function renderSolutions(items){
    if(!Array.isArray(items) || !items.length) return; // never wipe the working defaults
    listHost.innerHTML = items.map((it,i) => `
      <div class="mega-list-item sol-item ${i===0?'active':''}" data-sol="${esc(it.id)}" onmouseenter="showSolutionPreview('${esc(it.id)}')" onclick="solutionAction('${esc(it.action)}')"><span class="mega-ic">${esc(it.icon)}</span><span>${esc(it.title)}</span></div>
    `).join('');
    showHost.innerHTML = items.map((it,i) => `
      <div class="sol-preview ${i===0?'active':''}" data-sol="${esc(it.id)}">
        <h5>${esc(it.icon)} ${esc(it.title)}</h5>
        <p>${esc(it.desc)}</p>
        <div class="sol-tags">${(it.tags||[]).map(t=>`<span>${esc(t)}</span>`).join('')}</div>
        <button class="btn btn-primary sol-cta" onclick="solutionAction('${esc(it.action)}')">${esc(it.cta_label || '🚀 ابدأ تصميم الحل')}</button>
      </div>
    `).join('');
  }

  sb.from('site_settings').select('value').eq('key','solutions_menu').maybeSingle()
    .then(({ data }) => {
      const list = data && data.value && Array.isArray(data.value) && data.value.length ? data.value : null;
      if(list) renderSolutions(list);
    })
    .catch(()=>{ /* keep the built-in defaults on any error */ });
})();
