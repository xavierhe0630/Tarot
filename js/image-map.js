/* ============================================================
   图片映射表
   把每张牌对应到 images/ 文件夹里的实际文件名
   （文件名规则来自用户提供的 rider-waite-tarot 文件夹截图）
   如果某个文件名猜测有误，图片会自动加载失败并退回显示图标符号，
   不会导致页面出错 —— 发现哪张不对，改这个文件里对应的一行即可。
   ============================================================ */

// 大阿尔卡纳：卡牌编号 -> 文件名关键词（对应 images/major_arcana_关键词.png）
const MAJOR_IMAGE_KEY = {
  "00": "fool",
  "01": "magician",
  "02": "high_priestess",   // 猜测，如不对改成 priestess 等
  "03": "empress",
  "04": "emperor",
  "05": "hierophant",
  "06": "lovers",
  "07": "chariot",          // 猜测
  "08": "strength",
  "09": "hermit",
  "10": "fortune",          // 命运之轮，已确认
  "11": "justice",
  "12": "hanged_man",       // 猜测
  "13": "death",
  "14": "temperance",       // 猜测
  "15": "devil",            // 猜测
  "16": "tower",            // 猜测
  "17": "star",             // 猜测
  "18": "moon",
  "19": "sun",              // 猜测
  "20": "judgement",        // 猜测，如不对改成 judgment
  "21": "world"
};

// 小阿尔卡纳：从 1 到 14 的序号 -> 文件名里的后缀（对应 images/minor_arcana_花色_后缀.png）
const MINOR_IMAGE_TOKEN = ["ace","2","3","4","5","6","7","8","9","10","page","knight","queen","king"];

function localImagePath(card){
  if(card.arcana === "major"){
    const key = MAJOR_IMAGE_KEY[card.number];
    return key ? `images/major_arcana_${key}.png` : null;
  }
  // id 形如 "wands-1" ~ "wands-14"，取出序号
  const idx = parseInt(card.id.split("-")[1], 10) - 1;
  const token = MINOR_IMAGE_TOKEN[idx];
  if(!token) return null;
  return `images/minor_arcana_${card.suit}_${token}.png`;
}
