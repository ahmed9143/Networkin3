/* compare-widgets.js — Before/After ColorVu slider + Day/Night split-screen comparison.
   Zero dependencies. Call renderBeforeAfter() / renderSplitCompare() with a container id.
   Both widgets are fully responsive and touch-friendly (drag on mobile + desktop). */

(function(){

/* ---------- shared CSS (injected once) ---------- */
function injectCompareCSS(){
  if(document.getElementById('compareWidgetsCSS')) return;
  const css = `
  .cmp-wrap{position:relative;width:100%;aspect-ratio:16/9;border-radius:16px;overflow:hidden;
    direction:ltr;border:1px solid var(--line,rgba(255,255,255,.08));user-select:none;touch-action:none;background:#000;}
  .cmp-wrap img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;}
  .cmp-after{position:absolute;inset:0;overflow:hidden;}
  .cmp-handle{position:absolute;top:0;bottom:0;width:3px;background:linear-gradient(#fff,#fff);
    box-shadow:0 0 0 1px rgba(0,0,0,.25);cursor:ew-resize;transform:translateX(-50%);z-index:3;}
  .cmp-handle::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
    width:44px;height:44px;border-radius:50%;background:#fff;box-shadow:0 4px 14px rgba(0,0,0,.4);}
  .cmp-handle::after{content:'⇔';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
    font-size:18px;color:#0b1220;z-index:1;}
  .cmp-tag{position:absolute;top:14px;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:800;
    color:#fff;background:rgba(5,8,22,.72);backdrop-filter:blur(4px);z-index:2;letter-spacing:.3px;}
  .cmp-tag.left{left:14px;} .cmp-tag.right{right:14px;}
  .cmp-tag.on{background:linear-gradient(120deg,#2F7BFF,#8A5CFF);}
  .cmp-range{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:ew-resize;z-index:4;}
  .split-wrap{position:relative;width:100%;aspect-ratio:16/9;border-radius:16px;overflow:hidden;
    display:flex;direction:ltr;border:1px solid var(--line,rgba(255,255,255,.08));background:#000;}
  .split-half{position:relative;flex:1;overflow:hidden;}
  .split-half img{width:100%;height:100%;object-fit:cover;display:block;}
  .split-wrap .split-mid{position:absolute;top:0;bottom:0;left:50%;width:2px;background:rgba(255,255,255,.6);
    transform:translateX(-50%);z-index:2;}
  .split-tag{position:absolute;bottom:14px;padding:6px 14px;border-radius:20px;font-size:12.5px;font-weight:800;
    color:#fff;background:rgba(5,8,22,.72);z-index:2;}
  .split-half.pos-left .split-tag{left:14px;}
  .split-half.pos-right .split-tag{right:14px;}
  .cmp-caption{text-align:center;font-size:12.5px;color:var(--ink-soft,#8E9AAF);margin-top:10px;}
  `;
  const style = document.createElement('style');
  style.id = 'compareWidgetsCSS';
  style.textContent = css;
  document.head.appendChild(style);
}

/**
 * Before/After draggable slider (e.g. Normal camera -> ColorVu).
 * @param {string} containerId - id of an empty div to render into
 * @param {object} opts - { beforeImg, afterImg, beforeLabel, afterLabel, startPct, caption }
 */
window.renderBeforeAfter = function(containerId, opts){
  injectCompareCSS();
  const el = document.getElementById(containerId);
  if(!el) return;
  const o = Object.assign({
    beforeImg:'', afterImg:'', beforeLabel:'كاميرا عادية', afterLabel:'ColorVu — لون كامل بالليل',
    startPct:50, caption:'اسحب المنتصف لتقارن بين الكاميرا العادية وتقنية ColorVu ليلًا'
  }, opts||{});

  el.innerHTML = `
    <div class="cmp-wrap" id="${containerId}_stage">
      <img src="${o.beforeImg}" alt="${o.beforeLabel}">
      <div class="cmp-after" id="${containerId}_after" style="width:${o.startPct}%">
        <img src="${o.afterImg}" alt="${o.afterLabel}">
      </div>
      <div class="cmp-tag left">${o.beforeLabel}</div>
      <div class="cmp-tag right on">${o.afterLabel}</div>
      <div class="cmp-handle" id="${containerId}_handle" style="left:${o.startPct}%"></div>
      <input type="range" class="cmp-range" id="${containerId}_range" min="0" max="100" value="${o.startPct}">
    </div>
    ${o.caption ? `<div class="cmp-caption">↔️ ${o.caption}</div>` : ''}
  `;

  const stage = document.getElementById(containerId+'_stage');
  const after = document.getElementById(containerId+'_after');
  const handle = document.getElementById(containerId+'_handle');
  const range = document.getElementById(containerId+'_range');

  function setPct(pct){
    pct = Math.max(0, Math.min(100, pct));
    after.style.width = pct+'%';
    handle.style.left = pct+'%';
    range.value = pct;
  }
  range.addEventListener('input', e => setPct(parseFloat(e.target.value)));

  let dragging = false;
  function pctFromClientX(clientX){
    const r = stage.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * 100;
  }
  stage.addEventListener('pointerdown', e => { dragging = true; setPct(pctFromClientX(e.clientX)); stage.setPointerCapture(e.pointerId); });
  stage.addEventListener('pointermove', e => { if(dragging) setPct(pctFromClientX(e.clientX)); });
  stage.addEventListener('pointerup', () => dragging = false);
  stage.addEventListener('pointercancel', () => dragging = false);
};

/**
 * Split-screen day/night comparison (e.g. cheap camera on the right vs professional camera on the left).
 * Positions are explicit and independent of page text direction.
 * @param {string} containerId
 * @param {object} opts - { rightImg, rightLabel, leftImg, leftLabel, caption }
 *   Default matches the brief: right = كاميرا رخيصة, left = كاميرا احترافية.
 */
window.renderSplitCompare = function(containerId, opts){
  injectCompareCSS();
  const el = document.getElementById(containerId);
  if(!el) return;
  const o = Object.assign({
    rightImg:'', rightLabel:'كاميرا رخيصة',
    leftImg:'', leftLabel:'كاميرا احترافية (ColorVu/Starlight)',
    caption:'الفرق الحقيقي بيبان بالليل — نفس المكان، لحظتين مختلفتين'
  }, opts||{});

  /* .split-wrap has direction:ltr, so DOM order = visual order: first child on the left. */
  el.innerHTML = `
    <div class="split-wrap">
      <div class="split-half pos-left"><img src="${o.leftImg}" alt="${o.leftLabel}"><div class="split-tag">${o.leftLabel}</div></div>
      <div class="split-half pos-right"><img src="${o.rightImg}" alt="${o.rightLabel}"><div class="split-tag">${o.rightLabel}</div></div>
      <div class="split-mid"></div>
    </div>
    ${o.caption ? `<div class="cmp-caption">🌙 ${o.caption}</div>` : ''}
  `;
};

})();
