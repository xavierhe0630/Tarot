/* ============================================================
   本地存储管理（全部数据保存在浏览器 localStorage 中，
   不会上传到任何服务器，仅保存在你自己的设备上）
   ============================================================ */

const STORE_KEYS = {
  notes: "tarot_card_notes_v1",        // { cardId: "备注文字" }
  images: "tarot_card_images_v1",      // { cardId: "base64图片" }
  customSpreads: "tarot_custom_spreads_v1", // [spreadObj, ...]
  spreadImages: "tarot_spread_images_v1",   // { spreadId: "base64图片(背景/注解)" }
  history: "tarot_reading_history_v1"  // [readingObj, ...]
};

function loadJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return fallback;
    return JSON.parse(raw);
  }catch(e){
    console.warn("读取本地存储失败：", key, e);
    return fallback;
  }
}

function saveJSON(key, value){
  try{
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  }catch(e){
    console.warn("写入本地存储失败（可能空间已满）：", key, e);
    alert("保存失败：本地存储空间可能已满，建议清理历史记录或压缩图片后重试。");
    return false;
  }
}

const Store = {
  getNote(cardId){
    const notes = loadJSON(STORE_KEYS.notes, {});
    return notes[cardId] || "";
  },
  setNote(cardId, text){
    const notes = loadJSON(STORE_KEYS.notes, {});
    notes[cardId] = text;
    saveJSON(STORE_KEYS.notes, notes);
  },
  getCardImage(cardId){
    const imgs = loadJSON(STORE_KEYS.images, {});
    return imgs[cardId] || null;
  },
  setCardImage(cardId, base64){
    const imgs = loadJSON(STORE_KEYS.images, {});
    if(base64) imgs[cardId] = base64; else delete imgs[cardId];
    saveJSON(STORE_KEYS.images, imgs);
  },
  getCustomSpreads(){
    return loadJSON(STORE_KEYS.customSpreads, []);
  },
  saveCustomSpreads(list){
    saveJSON(STORE_KEYS.customSpreads, list);
  },
  addCustomSpread(spread){
    const list = Store.getCustomSpreads();
    list.push(spread);
    Store.saveCustomSpreads(list);
  },
  updateCustomSpread(spread){
    const list = Store.getCustomSpreads();
    const idx = list.findIndex(s=>s.id===spread.id);
    if(idx>=0) list[idx]=spread; else list.push(spread);
    Store.saveCustomSpreads(list);
  },
  deleteCustomSpread(id){
    const list = Store.getCustomSpreads().filter(s=>s.id!==id);
    Store.saveCustomSpreads(list);
  },
  getSpreadImage(spreadId){
    const imgs = loadJSON(STORE_KEYS.spreadImages, {});
    return imgs[spreadId] || null;
  },
  setSpreadImage(spreadId, base64){
    const imgs = loadJSON(STORE_KEYS.spreadImages, {});
    if(base64) imgs[spreadId] = base64; else delete imgs[spreadId];
    saveJSON(STORE_KEYS.spreadImages, imgs);
  },
  getHistory(){
    return loadJSON(STORE_KEYS.history, []);
  },
  addHistory(entry){
    const list = Store.getHistory();
    list.unshift(entry);
    saveJSON(STORE_KEYS.history, list);
  },
  deleteHistory(id){
    const list = Store.getHistory().filter(h=>h.id!==id);
    saveJSON(STORE_KEYS.history, list);
  },
  clearAllData(){
    Object.values(STORE_KEYS).forEach(k=>localStorage.removeItem(k));
  },
  exportAll(){
    const out = {};
    Object.entries(STORE_KEYS).forEach(([k,key])=>{
      out[k] = loadJSON(key, k==="history"||k==="customSpreads" ? [] : {});
    });
    return out;
  },
  importAll(data){
    Object.entries(STORE_KEYS).forEach(([k,key])=>{
      if(data[k] !== undefined) saveJSON(key, data[k]);
    });
  }
};

function allSpreads(){
  return DEFAULT_SPREADS.concat(Store.getCustomSpreads());
}

function getSpreadById(id){
  return allSpreads().find(s=>s.id===id);
}

function fileToBase64(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
