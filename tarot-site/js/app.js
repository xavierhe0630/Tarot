/* ============================================================
   应用主逻辑
   ============================================================ */

let state = {
  deckFilter: { arcana: "all", search: "" },
  currentSpreadId: null,
  currentDraw: null,   // { spreadId, question, date, slots:[{cardId, reversed}] }
  editingSpread: null, // 正在编辑的自定义牌阵（草稿）
  pendingSlotIndex: null,
  pickerTargetType: null // "slot" 用于占卜取牌
};

/* -------------------- 视图切换 -------------------- */
function initTabs(){
  document.querySelectorAll(".tab-btn").forEach(btn=>{
    btn.addEventListener("click", ()=> showView(btn.dataset.view));
  });
}
function showView(viewId){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
  document.getElementById("view-"+viewId).classList.add("active");
  document.querySelector(`.tab-btn[data-view="${viewId}"]`).classList.add("active");
  if(viewId==="deck") renderDeck();
  if(viewId==="spreads") renderSpreadsLibrary();
  if(viewId==="draw") renderDrawSetup();
  if(viewId==="history") renderHistory();
  window.scrollTo({top:0, behavior:"smooth"});
}

/* -------------------- 卡牌大全 -------------------- */
function cardThumbContent(card){
  const img = Store.getCardImage(card.id);
  if(img) return `<img src="${img}" alt="${card.name_cn}">`;
  const symbol = card.arcana==="major" ? "✦" : ({wands:"🔥",cups:"💧",swords:"🌬",pentacles:"⛰"}[card.suit]||"✦");
  return symbol;
}

function renderDeck(){
  const grid = document.getElementById("deck-grid");
  const {arcana, search} = state.deckFilter;
  let list = CARDS.filter(c=>{
    if(arcana==="major" && c.arcana!=="major") return false;
    if(arcana!=="all" && arcana!=="major" && c.suit!==arcana) return false;
    if(search){
      const s = search.trim();
      if(!c.name_cn.includes(s) && !c.name_en.toLowerCase().includes(s.toLowerCase())) return false;
    }
    return true;
  });
  if(list.length===0){
    grid.innerHTML = `<div class="empty-state">没有找到匹配的牌，换个筛选条件试试。</div>`;
    return;
  }
  grid.innerHTML = list.map(c=>`
    <div class="card-tile" onclick="openCardModal('${c.id}')">
      <div class="thumb">${cardThumbContent(c)}</div>
      <div class="name">${c.name_cn}</div>
      <div class="element-tag">${c.element}属性</div>
    </div>
  `).join("");
}

function initDeckFilters(){
  document.querySelectorAll("#deck-filter-chips .chip").forEach(chip=>{
    chip.addEventListener("click", ()=>{
      document.querySelectorAll("#deck-filter-chips .chip").forEach(c=>c.classList.remove("active"));
      chip.classList.add("active");
      state.deckFilter.arcana = chip.dataset.filter;
      renderDeck();
    });
  });
  document.getElementById("deck-search").addEventListener("input", (e)=>{
    state.deckFilter.search = e.target.value;
    renderDeck();
  });
}

function openCardModal(cardId){
  const card = CARDS.find(c=>c.id===cardId);
  if(!card) return;
  const note = Store.getNote(cardId);
  const img = Store.getCardImage(cardId);
  const box = document.getElementById("card-modal-body");
  box.innerHTML = `
    <div class="card-detail-head">
      <div class="card-detail-thumb" id="card-detail-thumb" onclick="document.getElementById('card-image-input').click()">
        ${img ? `<img src="${img}">` : cardThumbContent(card)}
      </div>
      <div>
        <h3 style="margin-bottom:2px;">${card.name_cn}</h3>
        <div style="color:var(--ink-faint); font-size:12.5px; margin-bottom:8px;">${card.name_en}</div>
        <div class="meta-row" style="margin:0;">
          <div class="meta-item"><span>元素属性</span>${card.element}</div>
          <div class="meta-item"><span>对应</span>${card.astro}</div>
          <div class="meta-item"><span>类别</span>${card.arcana==="major" ? "大阿尔卡纳" : "小阿尔卡纳 · "+card.suitName}</div>
        </div>
        <div class="upload-hint">点击左侧图案可上传/更换你自己的这张牌图片</div>
      </div>
    </div>
    <input type="file" id="card-image-input" accept="image/*" style="display:none">

    <div class="meaning-block upright">
      <h4>正位 · 基本含义</h4>
      <div class="meaning-text">${card.upright}</div>
    </div>
    <div class="meaning-block reversed">
      <h4>逆位 · 基本含义</h4>
      <div class="meaning-text">${card.reversed}</div>
    </div>

    <div class="meaning-block">
      <h4>我的备注</h4>
      <textarea class="notes-area" id="card-note-area" placeholder="写下你对这张牌的个人理解、常见情境或专属联想……">${note}</textarea>
      <div class="notes-save-state" id="notes-save-state"></div>
    </div>
  `;
  document.getElementById("card-image-input").addEventListener("change", async (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const base64 = await fileToBase64(file);
    Store.setCardImage(cardId, base64);
    document.getElementById("card-detail-thumb").innerHTML = `<img src="${base64}">`;
    renderDeck();
  });
  let saveTimer = null;
  document.getElementById("card-note-area").addEventListener("input", (e)=>{
    clearTimeout(saveTimer);
    const stateEl = document.getElementById("notes-save-state");
    stateEl.textContent = "正在保存…";
    saveTimer = setTimeout(()=>{
      Store.setNote(cardId, e.target.value);
      stateEl.textContent = "已保存 ✓";
      setTimeout(()=>{ if(stateEl) stateEl.textContent=""; }, 1500);
    }, 500);
  });
  document.getElementById("card-modal-overlay").classList.add("active");
}
function closeCardModal(){
  document.getElementById("card-modal-overlay").classList.remove("active");
}

/* -------------------- 牌阵库 -------------------- */
function renderSpreadsLibrary(){
  const grid = document.getElementById("spreads-grid");
  const spreads = allSpreads();
  grid.innerHTML = spreads.map(s=>{
    const isCustom = !!DEFAULT_SPREADS.find(d=>d.id===s.id) ? false : true;
    const bg = Store.getSpreadImage(s.id);
    return `
    <div class="spread-card">
      <div class="spread-card-top">
        <div><h3 style="margin-bottom:2px;">${s.name}</h3></div>
        <span class="spread-cat-tag">${s.category}</span>
      </div>
      <div class="spread-desc">${s.description||""} · 共 ${s.positions.length} 张牌</div>
      <div class="spread-mini-canvas" style="${bg?`background-image:url(${bg}); background-size:cover; background-position:center;`:""}">
        ${s.positions.map((p,i)=>`<div class="pos-dot" style="left:${p.x}%; top:${p.y}%;">${i+1}</div>`).join("")}
      </div>
      <div class="spread-actions">
        <button class="btn btn-primary btn-sm" onclick="goDrawWithSpread('${s.id}')">用这个牌阵起阵</button>
        <button class="btn btn-sm" onclick="openSpreadEditor('${s.id}')">${isCustom?"编辑":"复制并编辑"}</button>
        ${isCustom?`<button class="btn btn-sm btn-danger" onclick="deleteSpread('${s.id}')">删除</button>`:""}
      </div>
    </div>`;
  }).join("");
}

function deleteSpread(id){
  if(!confirm("确定删除这个自定义牌阵吗？")) return;
  Store.deleteCustomSpread(id);
  Store.setSpreadImage(id, null);
  renderSpreadsLibrary();
}

function goDrawWithSpread(spreadId){
  showView("draw");
  document.getElementById("draw-spread-select").value = spreadId;
  beginDraw();
}

/* -------------------- 牌阵编辑器 -------------------- */
function openSpreadEditor(sourceId){
  const source = sourceId ? getSpreadById(sourceId) : null;
  const isDefault = source && !!DEFAULT_SPREADS.find(d=>d.id===source.id);
  state.editingSpread = source ? {
    id: isDefault ? ("custom-"+Date.now()) : source.id,
    name: isDefault ? (source.name+"（副本）") : source.name,
    category: source.category,
    description: source.description||"",
    positions: JSON.parse(JSON.stringify(source.positions)),
    _bg: Store.getSpreadImage(source.id) || null
  } : {
    id: "custom-"+Date.now(),
    name: "",
    category: "自定义",
    description: "",
    positions: [],
    _bg: null
  };
  renderSpreadEditor();
  document.getElementById("spread-editor-overlay").classList.add("active");
}
function closeSpreadEditor(){
  document.getElementById("spread-editor-overlay").classList.remove("active");
  state.editingSpread = null;
}
function renderSpreadEditor(){
  const s = state.editingSpread;
  document.getElementById("editor-name").value = s.name;
  document.getElementById("editor-category").value = s.category;
  document.getElementById("editor-description").value = s.description;
  const canvas = document.getElementById("editor-canvas");
  canvas.style.backgroundImage = s._bg ? `url(${s._bg})` : "";
  canvas.innerHTML = s.positions.map((p,i)=>`
    <div class="editor-pos" style="left:${p.x}%; top:${p.y}%;" data-idx="${i}">${i+1}</div>
  `).join("");
  attachEditorDrag();

  const list = document.getElementById("editor-pos-list");
  list.innerHTML = s.positions.map((p,i)=>`
    <div class="editor-pos-row">
      <span style="color:var(--ink-faint); font-size:12px; width:16px;">${i+1}</span>
      <input type="text" value="${p.label}" placeholder="这张牌的位置含义（如：现状/挑战/建议）"
             oninput="updateEditorPosLabel(${i}, this.value)">
      <button class="btn btn-sm btn-danger" onclick="removeEditorPos(${i})">删除</button>
    </div>
  `).join("") || `<div class="empty-state" style="padding:14px;">点击上方画布来添加牌位</div>`;
}
function attachEditorDrag(){
  const canvas = document.getElementById("editor-canvas");
  canvas.querySelectorAll(".editor-pos").forEach(el=>{
    el.addEventListener("mousedown", (ev)=>startDragPos(ev, el));
    el.addEventListener("touchstart", (ev)=>startDragPos(ev, el), {passive:false});
  });
}
function startDragPos(ev, el){
  ev.preventDefault();
  el.classList.add("dragging");
  const canvas = document.getElementById("editor-canvas");
  const idx = +el.dataset.idx;
  function move(e){
    const rect = canvas.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    let x = ((point.clientX - rect.left)/rect.width)*100;
    let y = ((point.clientY - rect.top)/rect.height)*100;
    x = Math.max(2, Math.min(98, x));
    y = Math.max(2, Math.min(98, y));
    el.style.left = x+"%"; el.style.top = y+"%";
    state.editingSpread.positions[idx].x = Math.round(x);
    state.editingSpread.positions[idx].y = Math.round(y);
  }
  function up(){
    el.classList.remove("dragging");
    document.removeEventListener("mousemove", move);
    document.removeEventListener("mouseup", up);
    document.removeEventListener("touchmove", move);
    document.removeEventListener("touchend", up);
  }
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
  document.addEventListener("touchmove", move, {passive:false});
  document.addEventListener("touchend", up);
}
function editorCanvasClick(ev){
  if(ev.target.closest(".editor-pos")) return;
  const canvas = document.getElementById("editor-canvas");
  const rect = canvas.getBoundingClientRect();
  const x = Math.round(((ev.clientX-rect.left)/rect.width)*100);
  const y = Math.round(((ev.clientY-rect.top)/rect.height)*100);
  state.editingSpread.positions.push({x,y,label:"新的牌位"});
  renderSpreadEditor();
}
function updateEditorPosLabel(i, val){ state.editingSpread.positions[i].label = val; }
function removeEditorPos(i){
  state.editingSpread.positions.splice(i,1);
  renderSpreadEditor();
}
async function editorUploadBg(e){
  const file = e.target.files[0];
  if(!file) return;
  state.editingSpread._bg = await fileToBase64(file);
  renderSpreadEditor();
}
function saveSpreadEditor(){
  const s = state.editingSpread;
  s.name = document.getElementById("editor-name").value.trim() || "未命名牌阵";
  s.category = document.getElementById("editor-category").value.trim() || "自定义";
  s.description = document.getElementById("editor-description").value.trim();
  if(s.positions.length===0){
    alert("请至少添加一个牌位（点击画布空白处添加）。");
    return;
  }
  const toSave = { id:s.id, name:s.name, category:s.category, description:s.description, positions:s.positions };
  Store.updateCustomSpread(toSave);
  Store.setSpreadImage(s.id, s._bg);
  closeSpreadEditor();
  renderSpreadsLibrary();
}

/* -------------------- 起阵 / 占卜 -------------------- */
function renderDrawSetup(){
  const sel = document.getElementById("draw-spread-select");
  const spreads = allSpreads();
  sel.innerHTML = spreads.map(s=>`<option value="${s.id}">${s.name} · ${s.category}（${s.positions.length}张）</option>`).join("");
  document.getElementById("draw-canvas-area").innerHTML = "";
  document.getElementById("draw-result-area").innerHTML = "";
}

function beginDraw(){
  const spreadId = document.getElementById("draw-spread-select").value;
  const question = document.getElementById("draw-question").value.trim();
  const spread = getSpreadById(spreadId);
  if(!spread) return;
  state.currentDraw = {
    spreadId,
    question,
    date: new Date().toISOString(),
    slots: spread.positions.map(()=>({cardId:null, reversed:false}))
  };
  renderDrawCanvas();
  document.getElementById("draw-result-area").innerHTML = "";
}

function renderDrawCanvas(){
  const draw = state.currentDraw;
  const spread = getSpreadById(draw.spreadId);
  const bg = Store.getSpreadImage(spread.id);
  const wrap = document.getElementById("draw-canvas-area");
  wrap.innerHTML = `
    <div class="draw-canvas-wrap">
      <h3 style="margin-bottom:4px;">${spread.name}</h3>
      <div class="section-intro" style="margin-bottom:14px;">${spread.description||""} 点击每个牌位来记录你摸到的牌与正逆位。</div>
      <div class="draw-canvas" id="draw-canvas" style="${bg?`background-image:url(${bg})`:""}"></div>
      <div style="margin-top:16px; display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="computeReading()">解读牌阵</button>
        <button class="btn" onclick="clearDrawSlots()">清空重摸</button>
      </div>
    </div>
  `;
  const canvas = document.getElementById("draw-canvas");
  canvas.innerHTML = spread.positions.map((p,i)=>{
    const slot = draw.slots[i];
    const card = slot.cardId ? CARDS.find(c=>c.id===slot.cardId) : null;
    return `
      <div class="draw-slot ${card?'filled':''} ${slot.reversed?'reversed':''}" style="left:${p.x}%; top:${p.y}%;" onclick="openCardPicker(${i})">
        <div class="slot-card">${card ? card.name_cn : (i+1)}</div>
        <div class="slot-label">${p.label}</div>
      </div>
    `;
  }).join("");
}

function clearDrawSlots(){
  if(!state.currentDraw) return;
  state.currentDraw.slots = state.currentDraw.slots.map(()=>({cardId:null, reversed:false}));
  renderDrawCanvas();
  document.getElementById("draw-result-area").innerHTML = "";
}

function openCardPicker(slotIndex){
  state.pendingSlotIndex = slotIndex;
  const sel = document.getElementById("picker-card-select");
  sel.innerHTML = `<option value="">— 选择你摸到的牌 —</option>` + CARDS.map(c=>`<option value="${c.id}">${c.name_cn}（${c.element}）</option>`).join("");
  const current = state.currentDraw.slots[slotIndex];
  sel.value = current.cardId || "";
  document.getElementById("picker-reversed").checked = current.reversed;
  document.getElementById("card-picker-overlay").classList.add("active");
}
function closeCardPicker(){
  document.getElementById("card-picker-overlay").classList.remove("active");
}
function confirmCardPicker(){
  const cardId = document.getElementById("picker-card-select").value;
  const reversed = document.getElementById("picker-reversed").checked;
  if(!cardId){ alert("请选择一张牌"); return; }
  state.currentDraw.slots[state.pendingSlotIndex] = { cardId, reversed };
  closeCardPicker();
  renderDrawCanvas();
}
function clearCurrentSlot(){
  state.currentDraw.slots[state.pendingSlotIndex] = {cardId:null, reversed:false};
  closeCardPicker();
  renderDrawCanvas();
}

function computeReading(){
  const draw = state.currentDraw;
  const spread = getSpreadById(draw.spreadId);
  const unfilled = draw.slots.some(s=>!s.cardId);
  if(unfilled && !confirm("还有牌位没有填写，仍然生成解读吗？")){
    return;
  }
  const html = spread.positions.map((p,i)=>{
    const slot = draw.slots[i];
    if(!slot.cardId) return `
      <div class="result-item">
        <h4>${i+1}. ${p.label}</h4>
        <div class="orientation">（未记录）</div>
      </div>`;
    const card = CARDS.find(c=>c.id===slot.cardId);
    const meaning = slot.reversed ? card.reversed : card.upright;
    const note = Store.getNote(card.id);
    return `
      <div class="result-item">
        <h4>${i+1}. ${p.label} — <span class="card-name">${card.name_cn}</span> <span class="orientation">${slot.reversed?"（逆位）":"（正位）"}</span></h4>
        <div class="meaning-text">${meaning}　<span style="color:var(--ink-faint);">[${card.element}属性]</span></div>
        ${note ? `<div class="meaning-text" style="color:var(--rose); margin-top:4px;">我的备注：${note}</div>` : ""}
      </div>`;
  }).join("");
  document.getElementById("draw-result-area").innerHTML = `
    <div class="panel reading-result">
      <h3>解读结果</h3>
      ${draw.question ? `<div class="section-intro">问题：${draw.question}</div>` : ""}
      ${html}
      <div class="field" style="margin-top:10px;">
        <label>整体感悟 / 总结（可选，会一起保存到历史记录）</label>
        <textarea class="notes-area" id="reading-summary" placeholder="写下你对整体牌阵的直觉与结论……"></textarea>
      </div>
      <button class="btn btn-primary" style="margin-top:12px;" onclick="saveReading()">保存到历史记录</button>
    </div>
  `;
}

function saveReading(){
  const draw = state.currentDraw;
  const spread = getSpreadById(draw.spreadId);
  const summary = document.getElementById("reading-summary")?.value || "";
  const entry = {
    id: "reading-"+Date.now(),
    spreadId: draw.spreadId,
    spreadName: spread.name,
    category: spread.category,
    question: draw.question,
    date: draw.date,
    slots: draw.slots,
    summary
  };
  Store.addHistory(entry);
  alert("已保存到历史记录。");
  showView("history");
}

/* -------------------- 历史记录 -------------------- */
function renderHistory(){
  const list = Store.getHistory();
  const box = document.getElementById("history-list");
  if(list.length===0){
    box.innerHTML = `<div class="empty-state">还没有占卜记录。去「开始占卜」起一个牌阵吧。</div>`;
    return;
  }
  box.innerHTML = list.map(h=>`
    <div class="history-item" onclick="viewHistoryDetail('${h.id}')">
      <div class="history-top">
        <span class="h-name">${h.spreadName} · ${h.category}</span>
        <span class="h-date">${new Date(h.date).toLocaleString("zh-CN")}</span>
      </div>
      ${h.question ? `<div class="history-q">问题：${h.question}</div>` : ""}
    </div>
  `).join("");
}
function viewHistoryDetail(id){
  const h = Store.getHistory().find(x=>x.id===id);
  if(!h) return;
  const spread = getSpreadById(h.spreadId);
  const rows = h.slots.map((slot,i)=>{
    const pos = spread ? spread.positions[i] : null;
    if(!slot.cardId) return "";
    const card = CARDS.find(c=>c.id===slot.cardId);
    if(!card) return "";
    const meaning = slot.reversed ? card.reversed : card.upright;
    return `<div class="result-item"><h4>${i+1}. ${pos?pos.label:""} — <span class="card-name">${card.name_cn}</span> <span class="orientation">${slot.reversed?"（逆位）":"（正位）"}</span></h4><div class="meaning-text">${meaning}</div></div>`;
  }).join("");
  document.getElementById("card-modal-body").innerHTML = `
    <h3>${h.spreadName} · ${h.category}</h3>
    <div class="section-intro">${new Date(h.date).toLocaleString("zh-CN")}${h.question?" ｜ 问题：" + h.question:""}</div>
    ${rows}
    ${h.summary ? `<div class="meaning-block"><h4>整体感悟</h4><div class="meaning-text">${h.summary}</div></div>` : ""}
    <button class="btn btn-danger" style="margin-top:10px;" onclick="deleteHistoryEntry('${h.id}')">删除这条记录</button>
  `;
  document.getElementById("card-modal-overlay").classList.add("active");
}
function deleteHistoryEntry(id){
  if(!confirm("确定删除这条占卜记录吗？")) return;
  Store.deleteHistory(id);
  closeCardModal();
  renderHistory();
}

/* -------------------- 数据导入导出 -------------------- */
function exportData(){
  const data = Store.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tarot-backup-"+new Date().toISOString().slice(0,10)+".json";
  a.click();
  URL.revokeObjectURL(url);
}
function importData(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const data = JSON.parse(reader.result);
      Store.importAll(data);
      alert("导入成功，页面将刷新。");
      location.reload();
    }catch(err){
      alert("导入失败：文件格式不正确。");
    }
  };
  reader.readAsText(file);
}

/* -------------------- 初始化 -------------------- */
window.addEventListener("DOMContentLoaded", ()=>{
  initTabs();
  initDeckFilters();
  renderDeck();
});
