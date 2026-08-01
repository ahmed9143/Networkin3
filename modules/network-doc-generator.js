/* network-doc-generator.js — embedded "مولّد التوثيق التلقائي للشبكة" tool inside the Smart Tools Hub.
   Generates network diagram, rack diagram, IP table, VLAN table, port map, patch panel sheet and cable labels. */

let NDG_STATE = null;
let ndgReady = false;

function ndgInit(){
  if(ndgReady) return;
  ndgReady = true;
  document.getElementById('ndgProjName').addEventListener('keydown', e=>{ if(e.key==='Enter') ndgGenerateAll(); });
}

function ndgPad(n, len=2){ return String(n).padStart(len, '0'); }

function ndgGenerateAll(){
  const proj = document.getElementById('ndgProjName').value || 'مشروع';
  const nSwitch = Math.max(1, parseInt(document.getElementById('ndgNSwitch').value)||1);
  const portsPerSwitch = parseInt(document.getElementById('ndgSwitchPorts').value)||24;
  const nCam = Math.max(0, parseInt(document.getElementById('ndgNCam').value)||0);
  const nAP = Math.max(0, parseInt(document.getElementById('ndgNAP').value)||0);
  const nNVR = Math.max(0, parseInt(document.getElementById('ndgNNVR').value)||0);
  const nData = Math.max(0, parseInt(document.getElementById('ndgNData').value)||0);
  const hasFW = document.getElementById('ndgHasFW').value === '1';

  // ---- 1) Device naming ----
  const devices = [];
  if(hasFW) devices.push({id:'FW-01', type:'Firewall', vlan:'MGMT'});
  devices.push({id:'CSW-01', type:'Core Switch', vlan:'MGMT'});
  for(let i=1;i<=nSwitch;i++) devices.push({id:`ASW-${ndgPad(i)}`, type:'Access Switch', vlan:'MGMT'});
  for(let i=1;i<=nNVR;i++) devices.push({id:`NVR-${ndgPad(i)}`, type:'NVR', vlan:'CCTV'});
  for(let i=1;i<=nCam;i++) devices.push({id:`CAM-${ndgPad(i)}`, type:'Camera', vlan:'CCTV'});
  for(let i=1;i<=nAP;i++) devices.push({id:`AP-${ndgPad(i)}`, type:'Access Point', vlan:'WIFI'});
  for(let i=1;i<=nData;i++) devices.push({id:`PC-${ndgPad(i)}`, type:'Data Point', vlan:'DATA'});

  // ---- 2) VLAN table ----
  const vlanDefs = [
    {vlan:10, name:'VLAN10-CCTV', subnet:'10.10.10.0/24', gw:'10.10.10.1', members:['CCTV']},
    {vlan:20, name:'VLAN20-DATA', subnet:'10.10.20.0/24', gw:'10.10.20.1', members:['DATA']},
    {vlan:30, name:'VLAN30-WIFI', subnet:'10.10.30.0/24', gw:'10.10.30.1', members:['WIFI']},
    {vlan:99, name:'VLAN99-MGMT', subnet:'10.10.99.0/24', gw:'10.10.99.1', members:['MGMT']},
  ];
  const vlanIpFor = {'CCTV':10,'DATA':20,'WIFI':30,'MGMT':99};

  // ---- 3) IP table (auto-assign, start .10) ----
  const ipCounters = {10:9, 20:9, 30:9, 99:9};
  const ipTable = devices.map(d=>{
    const v = vlanIpFor[d.vlan];
    ipCounters[v]++;
    return {...d, ip: `10.10.${v}.${ipCounters[v]}`, vlanNum:v};
  });

  // ---- 4) Port mapping + patch panel + cable numbering ----
  const leafDevices = ipTable.filter(d=>!['Firewall','Core Switch','Access Switch'].includes(d.type));
  const portMap = [];
  let curSwitch = 0;
  let curPort = 1;
  const switchNames = [];
  for(let i=1;i<=nSwitch;i++) switchNames.push(`ASW-${ndgPad(i)}`);

  leafDevices.forEach(dev=>{
    if(curPort > ndgPortPerSwitchAvailable(portsPerSwitch)){
      curSwitch++; curPort = 1;
    }
    if(curSwitch >= switchNames.length){ curSwitch = switchNames.length-1; }
    const swName = switchNames[curSwitch] || switchNames[0];
    const cableId = `CAB-${swName}-P${ndgPad(curPort)}`;
    portMap.push({switchId: swName, port: curPort, deviceId: dev.id, deviceType: dev.type, cableId, vlan: dev.vlan});
    curPort++;
  });
  function ndgPortPerSwitchAvailable(total){ return total - 1; }

  switchNames.forEach((sw)=>{
    portMap.push({switchId: sw, port: portsPerSwitch, deviceId:'CSW-01 (Uplink)', deviceType:'Uplink', cableId:`CAB-${sw}-P${portsPerSwitch}`, vlan:'TRUNK'});
  });
  if(hasFW){
    portMap.push({switchId:'CSW-01', port:1, deviceId:'FW-01', deviceType:'Uplink', cableId:'CAB-CSW01-P01', vlan:'TRUNK'});
  }

  // ---- 5) Cable labels ----
  const labels = portMap.map(p=>({
    cableId: p.cableId, from: p.switchId+':P'+ndgPad(p.port), to: p.deviceId, vlan: p.vlan
  }));

  NDG_STATE = {proj, nSwitch, portsPerSwitch, hasFW, nNVR, devices, vlanDefs, ipTable, portMap, labels};

  document.getElementById('ndgEmptyState').style.display='none';
  document.getElementById('ndgResultsWrap').style.display='block';
  ndgRenderTabs();
  ndgRenderPanel('diagram');
}

function ndgRenderTabs(){
  const tabs = [
    ['diagram','🗺️ مخطط الشبكة'],
    ['rack','🗄️ مخطط الراك'],
    ['ip','🔢 جدول IP'],
    ['vlan','🏷️ جدول VLAN'],
    ['ports','🔌 خريطة البورتات'],
    ['patch','🧷 Patch Panel'],
    ['labels','🏷️ ليبل الكابلات'],
  ];
  const bar = document.getElementById('ndgTabsBar');
  bar.innerHTML = tabs.map((t,i)=>`<div class="ndg-tab ${i===0?'active':''}" data-tab="${t[0]}" onclick="ndgSwitchTab('${t[0]}')">${t[1]}</div>`).join('');
}

function ndgSwitchTab(name){
  document.querySelectorAll('.ndg-tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===name));
  ndgRenderPanel(name);
}

function ndgRenderPanel(name){
  const host = document.getElementById('ndgPanelsHost');
  if(name==='diagram') host.innerHTML = ndgDiagramSVG();
  else if(name==='rack') host.innerHTML = ndgRackSVG();
  else if(name==='ip') host.innerHTML = ndgIpTableHTML();
  else if(name==='vlan') host.innerHTML = ndgVlanTableHTML();
  else if(name==='ports') host.innerHTML = ndgPortsTableHTML();
  else if(name==='patch') host.innerHTML = ndgPatchPanelHTML();
  else if(name==='labels') host.innerHTML = ndgLabelsHTML();
}

function ndgDiagramSVG(){
  const s = NDG_STATE;
  const camCount = s.devices.filter(d=>d.type==='Camera').length;
  const apCount = s.devices.filter(d=>d.type==='Access Point').length;
  const pcCount = s.devices.filter(d=>d.type==='Data Point').length;
  const nvrCount = s.nNVR;
  let y0 = 30;
  let svg = `<svg viewBox="0 0 900 420" xmlns="http://www.w3.org/2000/svg">`;
  const box=(x,y,w,h,label,color)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${color}" stroke="#1e3a5f"/><text x="${x+w/2}" y="${y+h/2+5}" text-anchor="middle" fill="#fff" font-family="Cairo" font-size="12" font-weight="700">${label}</text>`;
  const line=(x1,y1,x2,y2)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#3b82f6" stroke-width="2"/>`;

  let cx = 450;
  if(s.hasFW){
    svg += box(cx-60,y0,120,40,'FW-01','#ef4444');
    svg += line(cx, y0+40, cx, y0+70);
    y0+=70;
  }
  svg += box(cx-70,y0,140,40,'CSW-01 (Core)','#f97316');
  const swY = y0+90;
  const swCount = s.nSwitch;
  const spacing = 800/(swCount+1);
  for(let i=0;i<swCount;i++){
    const sx = 50 + spacing*(i+1);
    svg += line(cx, y0+40, sx, swY);
    svg += box(sx-55, swY, 110, 36, `ASW-${ndgPad(i+1)}`, '#3b82f6');
  }
  const leafY = swY+80;
  const groups = [];
  if(nvrCount) groups.push(['NVR x'+nvrCount,'#22c55e']);
  if(camCount) groups.push(['Cameras x'+camCount,'#a855f7']);
  if(apCount) groups.push(['APs x'+apCount,'#06b6d4']);
  if(pcCount) groups.push(['Data Points x'+pcCount,'#eab308']);
  const gSpacing = 800/(groups.length+1);
  groups.forEach((g,i)=>{
    const gx = 50+gSpacing*(i+1);
    svg += line(cx, swY+36, gx, leafY);
    svg += box(gx-65, leafY, 130, 36, g[0], g[1]);
  });
  svg += `</svg>`;
  return `<div class="ndg-toolbar"><button onclick="ndgDownloadSVG('diagram')">⬇️ تحميل SVG</button></div>` + svg;
}

function ndgRackSVG(){
  const s = NDG_STATE;
  const units = [];
  if(s.hasFW) units.push({label:'FW-01 — Firewall', h:1, color:'#ef4444'});
  units.push({label:'CSW-01 — Core Switch', h:1, color:'#f97316'});
  units.push({label:'Patch Panel 1 (24 Port)', h:1, color:'#64748b'});
  for(let i=1;i<=s.nSwitch;i++) units.push({label:`ASW-${ndgPad(i)} — Access Switch (${s.portsPerSwitch}P)`, h:1, color:'#3b82f6'});
  for(let i=1;i<=s.nNVR;i++) units.push({label:`NVR-${ndgPad(i)}`, h:2, color:'#22c55e'});
  units.push({label:'UPS', h:2, color:'#eab308'});
  units.push({label:'Cable Management', h:1, color:'#334155'});

  let y=20; const uH=32; const rackW=420;
  let svg = `<svg viewBox="0 0 500 ${units.reduce((a,u)=>a+u.h*uH,40)}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect x="20" y="10" width="${rackW}" height="${units.reduce((a,u)=>a+u.h*uH,20)}" fill="#0a1729" stroke="#f97316" stroke-width="2" rx="6"/>`;
  units.forEach(u=>{
    const h = u.h*uH-4;
    svg += `<rect x="30" y="${y}" width="${rackW-20}" height="${h}" fill="${u.color}" stroke="#1e3a5f" rx="4"/>`;
    svg += `<text x="${30+(rackW-20)/2}" y="${y+h/2+5}" text-anchor="middle" fill="#fff" font-family="Cairo" font-size="12" font-weight="700">${u.label}</text>`;
    y += u.h*uH;
  });
  svg += `</svg>`;
  return `<div class="ndg-toolbar"><button onclick="ndgDownloadSVG('rack')">⬇️ تحميل SVG</button></div>` + svg;
}

function ndgIpTableHTML(){
  const rows = NDG_STATE.ipTable.map(d=>`<tr><td>${d.id}</td><td>${d.type}</td><td>VLAN${d.vlanNum}</td><td>${d.ip}</td></tr>`).join('');
  return `<div class="ndg-toolbar"><button onclick="ndgCopyTable('ndgIpTable')">📋 نسخ</button></div>
  <div class="ndg-table-scroll"><table id="ndgIpTable"><tr><th>الجهاز</th><th>النوع</th><th>VLAN</th><th>IP Address</th></tr>${rows}</table></div>`;
}

function ndgVlanTableHTML(){
  const rows = NDG_STATE.vlanDefs.map(v=>`<tr><td>${v.vlan}</td><td>${v.name}</td><td>${v.subnet}</td><td>${v.gw}</td><td>${v.members.join(', ')}</td></tr>`).join('');
  return `<div class="ndg-table-scroll"><table id="ndgVlanTable"><tr><th>VLAN ID</th><th>الاسم</th><th>Subnet</th><th>Gateway</th><th>الأجهزة</th></tr>${rows}</table></div>`;
}

function ndgPortsTableHTML(){
  const rows = NDG_STATE.portMap.map(p=>`<tr><td>${p.switchId}</td><td>P${ndgPad(p.port)}</td><td>${p.deviceId}</td><td>${p.deviceType}</td><td>${p.vlan}</td><td class="ndg-mono">${p.cableId}</td></tr>`).join('');
  return `<div class="ndg-table-scroll"><table id="ndgPortsTable"><tr><th>السويتش</th><th>البورت</th><th>الجهاز المتصل</th><th>النوع</th><th>VLAN</th><th>كود الكابل</th></tr>${rows}</table></div>`;
}

function ndgPatchPanelHTML(){
  const rows = NDG_STATE.portMap.filter(p=>p.deviceType!=='Uplink').map(p=>
    `<tr><td>${p.cableId}</td><td>Patch-${p.switchId}</td><td>P${ndgPad(p.port)}</td><td>${p.switchId} P${ndgPad(p.port)}</td><td>${p.deviceId}</td></tr>`).join('');
  return `<div class="ndg-table-scroll"><table><tr><th>كود الكابل</th><th>Patch Panel</th><th>بورت الـPanel</th><th>موصل بـ (Switch Side)</th><th>موصل بـ (Device Side)</th></tr>${rows}</table></div>`;
}

function ndgLabelsHTML(){
  const items = NDG_STATE.labels.map(l=>`<div class="ndg-label"><b>${l.cableId}</b>FROM: ${l.from}<br>TO: ${l.to}<br>VLAN: ${l.vlan}</div>`).join('');
  return `<div class="ndg-toolbar"><button onclick="window.print()">🖨️ طباعة الليبلات</button></div><div class="ndg-label-sheet">${items}</div>`;
}

function ndgDownloadSVG(prefix){
  const svgEl = document.querySelector('#ndgPanelsHost svg');
  if(!svgEl) return;
  const blob = new Blob([svgEl.outerHTML], {type:'image/svg+xml'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${NDG_STATE.proj}-${prefix}.svg`; a.click();
  URL.revokeObjectURL(url);
}

function ndgCopyTable(id){
  const table = document.getElementById(id);
  let text = '';
  table.querySelectorAll('tr').forEach(tr=>{
    const cells = [...tr.querySelectorAll('th,td')].map(c=>c.innerText);
    text += cells.join('\t') + '\n';
  });
  navigator.clipboard.writeText(text);
  alert('تم نسخ الجدول — الصقه في Excel مباشرة');
}

function ndgExportExcel(){
  if(!NDG_STATE){ alert('اضغط "توليد التوثيق الكامل" الأول'); return; }
  const s = NDG_STATE;
  function tbl(title, headers, rows){
    return `<h3>${title}</h3><table border="1"><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr>` +
      rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('') + `</table><br>`;
  }
  let html = `<html><head><meta charset="UTF-8"></head><body>`;
  html += tbl('IP Table', ['Device','Type','VLAN','IP'], s.ipTable.map(d=>[d.id,d.type,'VLAN'+d.vlanNum,d.ip]));
  html += tbl('VLAN Table', ['VLAN ID','Name','Subnet','Gateway','Members'], s.vlanDefs.map(v=>[v.vlan,v.name,v.subnet,v.gw,v.members.join(', ')]));
  html += tbl('Port Mapping', ['Switch','Port','Device','Type','VLAN','Cable ID'], s.portMap.map(p=>[p.switchId,'P'+ndgPad(p.port),p.deviceId,p.deviceType,p.vlan,p.cableId]));
  html += tbl('Cable Labels', ['Cable ID','From','To','VLAN'], s.labels.map(l=>[l.cableId,l.from,l.to,l.vlan]));
  html += `</body></html>`;
  const blob = new Blob([html], {type:'application/vnd.ms-excel'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${s.proj || 'network-doc'}.xls`; a.click();
  URL.revokeObjectURL(url);
}
