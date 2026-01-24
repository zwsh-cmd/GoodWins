// --- 1. 引入 Firebase ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// --- 2. 設定碼 ---
const firebaseConfig = {
    apiKey: "AIzaSyAmWABNFg2GsMP9fQFklTdGkJ8w0LERPrU",
    authDomain: "goodwins-3bc5a.firebaseapp.com",
    projectId: "goodwins-3bc5a",
    storageBucket: "goodwins-3bc5a.firebasestorage.app",
    messagingSenderId: "596250200677",
    appId: "1:596250200677:web:3f20262dfe56c60750548c"
};

// --- 3. 啟動 Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// --- 4. 動態生成 UI (這就是妳要的：介面寫在 JS 裡) ---
function createEditorHTML() {
    if (document.getElementById('editor-modal')) return;

    const selectStyle = `
        width:100%; 
        padding:12px 40px 12px 12px; 
        border:1px solid #EEE; 
        border-radius:12px; 
        background:#FAFAFA url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235A5A5A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e") no-repeat right 16px center; 
        background-size: 16px;
        font-size:16px; 
        color:var(--text-main); 
        outline:none; 
        -webkit-appearance: none; 
        appearance: none;
    `;

    // [修改] 1. 增加 btn-start-pk 按鈕 (預設 display:none) 
    // [修改] 2. 調整按鈕區域佈局
    const editorHTML = `
    <div id="editor-modal" class="hidden" style="position: absolute; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.98); z-index:500; display: flex; flex-direction: column;">
        <div style="flex:1; display:flex; flex-direction:column; padding:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <button id="btn-cancel-edit" style="background:none; border:none; color:#999; font-size:16px; cursor:pointer;">取消</button>
                <h3 id="editor-title" style="margin:0; font-size:18px; font-weight:700; color:var(--text-main);">記錄好事</h3>
                <div style="display:flex; gap:10px;">
                    <button id="btn-save-edit" style="background:none; border:none; color:var(--primary); font-weight:700; font-size:16px; cursor:pointer;">儲存</button>
                    <button id="btn-start-pk" style="display:none; background:var(--primary); border:none; color:#FFF; padding:6px 12px; border-radius:16px; font-weight:700; font-size:14px; cursor:pointer;">PK 🔥</button>
                </div>
            </div>

            <style>
                #input-title::placeholder, #input-content::placeholder { color: #CCC; opacity: 1; }
            </style>
            <input id="input-title" type="text" placeholder="輸入標題..." autocomplete="off" name="gw-title-field" style="width:100%; padding:15px 0; border:none; border-bottom:1px solid #EEE; font-size:24px; font-weight:700; outline:none; background:transparent; color:#666; margin-bottom:10px;">
            
            <textarea id="input-content" placeholder="輸入內容..." name="gw-content-field" style="width:100%; flex:1; padding:15px 0; border:none; font-size:18px; outline:none; resize:none; background:transparent; line-height:1.6; color:#666;"></textarea>
            
            <div style="padding:20px 0;">
                <div style="margin-bottom:15px;">
                    <label id="label-score" style="font-size:13px; color:#999; display:block; margin-bottom:5px;">好事等級</label>
                    <select id="input-score" style="${selectStyle}">
                        <option value="1">1分 - 微好事 (Micro)</option>
                        <option value="2">2分 - 小好事 (Small)</option>
                        <option value="3">3分 - 中好事 (Medium)</option>
                        <option value="4">4分 - 大好事 (Big)</option>
                        <option value="5">5分 - 神聖好事 (Divine)</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:13px; color:#999; display:block; margin-bottom:5px;">來源</label>
                    <select id="input-source" style="${selectStyle}">
                        <option value="personal">個人經驗</option>
                        <option value="inference">推論觀察</option>
                        <option value="others">他人經驗</option>
                    </select>
                </div>
            </div>
        </div>
    </div>
    `;
    
    const wrapper = document.getElementById('mobile-wrapper');
    if(wrapper) {
        wrapper.insertAdjacentHTML('beforeend', editorHTML);
    }
}

// 馬上執行，把畫面畫出來
createEditorHTML();

// [新增] 將 Icon 插入主標題列 (APP名稱左邊)
const mainHeaderTitle = document.querySelector('.header-title');
if(mainHeaderTitle && !mainHeaderTitle.querySelector('img')) {
    mainHeaderTitle.innerHTML = `
        <img src="icon.png" style="width:28px; height:28px; border-radius:6px; margin-right:8px; vertical-align:text-bottom;">
        ${mainHeaderTitle.innerText}
    `;
}

// --- 新增：通用提示視窗元件 (取代原生 alert) & 確認視窗 ---
function createGlobalComponents() {
    const wrapper = document.getElementById('mobile-wrapper');
    if(!wrapper) return;

    // 1. 提示視窗 (Alert)
    if (!document.getElementById('system-alert')) {
        const alertHTML = `
        <div id="system-alert" class="hidden" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.3); z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div style="background: #FFF; width: 80%; max-width: 300px; padding: 24px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); text-align: center; display: flex; flex-direction: column; gap: 16px;">
                <div id="alert-msg" style="font-size: 15px; color: var(--text-main); line-height: 1.6; white-space: pre-line;"></div>
                <button id="btn-alert-ok" style="background: var(--primary); color: white; border: none; padding: 12px; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; width: 100%;">我知道了</button>
            </div>
        </div>
        `;
        wrapper.insertAdjacentHTML('beforeend', alertHTML);
        document.getElementById('btn-alert-ok').addEventListener('click', () => {
            document.getElementById('system-alert').classList.add('hidden');
        });
    }

    // 2. 確認視窗 (Confirm) - 風格一致
    if (!document.getElementById('system-confirm')) {
        const confirmHTML = `
        <div id="system-confirm" class="hidden" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.3); z-index: 1001; display: flex; align-items: center; justify-content: center;">
            <div style="background: #FFF; width: 80%; max-width: 300px; padding: 24px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); text-align: center; display: flex; flex-direction: column; gap: 16px;">
                <div id="confirm-msg" style="font-size: 15px; color: var(--text-main); line-height: 1.6; white-space: pre-line; font-weight:bold;"></div>
                <div style="display:flex; gap:10px;">
                    <button id="btn-confirm-cancel" style="flex:1; background: #F5F5F5; color: #666; border: none; padding: 12px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer;">取消</button>
                    <button id="btn-confirm-ok" style="flex:1; background: var(--primary); color: white; border: none; padding: 12px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer;">確定離開</button>
                </div>
            </div>
        </div>
        `;
        wrapper.insertAdjacentHTML('beforeend', confirmHTML);
    }
}
createGlobalComponents(); 

function showSystemMessage(msg) {
    const alertEl = document.getElementById('system-alert');
    if(alertEl) {
        document.getElementById('alert-msg').innerText = msg;
        alertEl.classList.remove('hidden');
    } else { alert(msg); }
}

// [新增] 顯示確認視窗，回傳 Promise (true=確定, false=取消)
function showConfirmMessage(msg) {
    return new Promise((resolve) => {
        const confirmEl = document.getElementById('system-confirm');
        const msgEl = document.getElementById('confirm-msg');
        const btnOk = document.getElementById('btn-confirm-ok');
        const btnCancel = document.getElementById('btn-confirm-cancel');

        if(!confirmEl) { resolve(confirm(msg)); return; }

        msgEl.innerText = msg;
        confirmEl.classList.remove('hidden');

        const handleOk = () => {
            cleanup();
            resolve(true);
        };
        const handleCancel = () => {
            cleanup();
            resolve(false);
        };
        const cleanup = () => {
            confirmEl.classList.add('hidden');
            btnOk.removeEventListener('click', handleOk);
            btnCancel.removeEventListener('click', handleCancel);
        };

        btnOk.addEventListener('click', handleOk);
        btnCancel.addEventListener('click', handleCancel);
    });
}

// --- 動態生成 PK 畫面 (修正版：深色底部防誤觸、灰色圓形重來按鈕) ---
function createPKScreenHTML() {
    if (document.getElementById('pk-screen')) return;

    // [修改] 1. 卡片 padding-bottom 改為 0，讓底部深色區域貼底
    // [修改] 2. expand-arrow 改為深色背景區塊，防誤觸
    // [修改] 3. btn-re-pk 改為灰色半透明，使用簡單圖示
    const pkHTML = `
    <div id="pk-screen" class="hidden" style="flex: 1; display: flex; flex-direction: column; height: 100%; background: var(--bg-app); position: absolute; top: 0; left: 0; width: 100%; z-index: 100;">
        <header style="padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; background: transparent;">
            <div style="font-size: 18px; font-weight: 800; color: var(--text-main);">PK 擂台</div>
            <div style="display:flex; gap:10px; align-items:center;">
                <button id="btn-open-warehouse" style="background:none; border:none; padding:8px; cursor:pointer; font-size:14px; color:var(--primary); font-weight:bold;">倉庫</button>
                <button id="btn-exit-pk" style="background:none; border:none; padding:8px; cursor:pointer; font-size:14px; color:#999;">離開</button>
            </div>
        </header>

        <main style="flex: 1; overflow: hidden; display: flex; flex-direction: column; padding: 0 20px 20px 20px; gap: 15px;">
            
            <div style="display: flex; align-items: stretch; gap: 10px; flex-shrink: 0; position: relative;">
                <div id="btn-pk-bad" class="action-card" style="flex: 1; cursor: pointer; padding: 20px 20px 0 20px; background: var(--bad-light); border: 2px solid transparent; border-radius: 20px; display: flex; flex-direction: column; gap: 8px; transition: transform 0.2s; text-align: left; overflow:hidden;">
                    <div style="color: var(--bad-icon); font-size: 13px; font-weight: 700;">鳥事</div>
                    <div style="flex: 1; padding-bottom:15px;">
                        <h3 id="pk-bad-title" style="margin: 0 0 6px 0; font-size: 16px; color: var(--text-main); line-height: 1.4; text-align: left;">(標題)</h3>
                        <p id="pk-bad-content" style="margin: 0; font-size: 13px; color: var(--text-main); opacity: 0.8; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-align: left;">(內容...)</p>
                    </div>
                    <div class="expand-arrow" style="text-align:center; color:var(--bad-icon); opacity:0.6; padding:8px 0; font-size:10px; background:rgba(0,0,0,0.05); margin: 0 -20px; width: calc(100% + 40px);">▼</div>
                </div>

                <div id="btn-re-pk" style="display:none; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 44px; height: 44px; justify-content:center; align-items:center; background: rgba(230, 230, 230, 0.7); backdrop-filter: blur(4px); border-radius: 50%; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.05); z-index: 10;">
                    <svg viewBox="0 0 24 24" style="width:22px; height:22px; fill:none; stroke:#666; stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round;"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                </div>

                <div id="btn-pk-good" class="action-card" style="flex: 1; cursor: pointer; padding: 20px 20px 0 20px; background: var(--good-light); border: 2px solid transparent; border-radius: 20px; display: flex; flex-direction: column; gap: 8px; transition: transform 0.2s; text-align: left; overflow:hidden;">
                     <div style="color: var(--good-icon); font-size: 13px; font-weight: 700;">好事</div>
                     <div style="flex: 1; padding-bottom:15px;">
                        <h3 id="pk-good-title" style="margin: 0 0 6px 0; font-size: 16px; color: var(--text-main); line-height: 1.4; text-align: left;">(標題)</h3>
                        <p id="pk-good-content" style="margin: 0; font-size: 13px; color: var(--text-main); opacity: 0.8; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-align: left;">(內容...)</p>
                    </div>
                    <div class="expand-arrow" style="text-align:center; color:var(--good-icon); opacity:0.6; padding:8px 0; font-size:10px; background:rgba(0,0,0,0.05); margin: 0 -20px; width: calc(100% + 40px);">▼</div>
                </div>
            </div>

            <div style="flex: 1; background: #FFF; border-radius: 20px; box-shadow: var(--shadow); display: flex; flex-direction: column; overflow: hidden; border: 1px solid rgba(0,0,0,0.02);">
                <div id="chat-history" style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 15px;"></div>
                <div style="padding: 15px; border-top: 1px solid #F0F0F0; display: flex; gap: 10px; background: #FFF;">
                    <input id="chat-input" type="text" placeholder="跟 AI 討論..." style="flex: 1; padding: 12px 15px; border: 1px solid #EEE; border-radius: 25px; outline: none; background: #FAFAFA; color: var(--text-main);">
                    <button id="btn-send-chat" style="background: var(--primary); color: #FFF; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </div>
            </div>

        </main>
    </div>
    `;

    const wrapper = document.getElementById('mobile-wrapper');
    if(wrapper) {
        wrapper.insertAdjacentHTML('beforeend', pkHTML);
        
        // --- [修改] 展開箭頭邏輯 (自動長高延伸，父容器捲動) ---
        wrapper.querySelectorAll('.expand-arrow').forEach(arrow => {
            arrow.addEventListener('click', (e) => {
                e.stopPropagation(); 
                
                const card = arrow.closest('.action-card');
                const p = card.querySelector('p');
                const isExpanded = card.classList.contains('expanded-mode');
                const mainContainer = card.closest('main'); // 抓取父容器以便控制捲動
                
                const isBad = card.id === 'btn-pk-bad';
                const otherCard = isBad ? document.getElementById('btn-pk-good') : document.getElementById('btn-pk-bad');

                if (isExpanded) {
                    // --- 還原模式 ---
                    card.classList.remove('expanded-mode');
                    card.style.position = '';
                    card.style.width = '';
                    card.style.height = '';
                    card.style.minHeight = '';
                    card.style.zIndex = '';
                    card.style.left = '';
                    card.style.top = '';
                    
                    // 還原父容器捲動設定
                    if(mainContainer) mainContainer.style.overflowY = '';

                    if(otherCard) otherCard.style.opacity = '1';

                    if (p) {
                        p.style.webkitLineClamp = '3';
                        arrow.innerText = '▼';
                        arrow.style.position = '';
                        arrow.style.bottom = '';
                        arrow.style.zIndex = '';
                        arrow.style.background = 'rgba(0,0,0,0.05)';
                    }
                } else {
                    // --- 放大延伸模式 ---
                    card.classList.add('expanded-mode');
                    card.style.position = 'absolute';
                    card.style.zIndex = '50';
                    card.style.top = '0';
                    card.style.left = '0';
                    card.style.width = '100%'; 
                    
                    // [重點] 高度設為 auto 讓內容撐開，最小高度 100% 確保蓋滿
                    card.style.height = 'auto'; 
                    card.style.minHeight = '100%';
                    
                    // [重點] 讓外層容器可以捲動，而不是卡片內部捲動
                    if(mainContainer) mainContainer.style.overflowY = 'auto';
                    
                    // 隱藏另一張卡
                    if(otherCard) otherCard.style.opacity = '0';

                    if (p) {
                        p.style.webkitLineClamp = 'unset'; 
                        arrow.innerText = '▲';
                        
                        arrow.style.position = 'sticky';
                        arrow.style.bottom = '0';
                        arrow.style.zIndex = '10';
                        if (isBad) arrow.style.background = 'var(--bad-light)';
                        else arrow.style.background = 'var(--good-light)';
                    }
                }
            });
        });

        // --- 聊天按鈕綁定 ---
        const btnSend = document.getElementById('btn-send-chat');
        const inputChat = document.getElementById('chat-input');
        
        const handleSend = async () => {
            const text = inputChat.value.trim();
            if (!text) return;
            await addChatMessage('user', text);
            inputChat.value = '';
            await callGeminiChat(text);
        };

        if(btnSend) btnSend.addEventListener('click', handleSend);
        if(inputChat) {
            inputChat.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleSend();
            });
        }

        // --- PK 勝負判定按鈕綁定 ---
        const btnPkBad = document.getElementById('btn-pk-bad');
        const btnPkGood = document.getElementById('btn-pk-good');

        if(btnPkBad) {
            btnPkBad.addEventListener('click', () => {
                if (currentPKContext.isVictory) return;
                handlePKResult('bad');
            });
        }
        if(btnPkGood) {
            btnPkGood.addEventListener('click', () => {
                if (currentPKContext.isVictory) return;
                handlePKResult('good');
            });
        }

        // --- 重新 PK 按鈕綁定 ---
        const btnRePK = document.getElementById('btn-re-pk');
        if(btnRePK) {
            btnRePK.addEventListener('click', async () => {
                if(confirm("確定要重新發起 PK 挑戰嗎？")) {
                    
                    // [新增] 關鍵邏輯：切換身分證
                    // 從「回顧模式 (pk_wins)」強制切換回「戰鬥模式 (bad_things)」
                    // 這樣如果中途離開，系統才會執行「失敗歸檔」邏輯
                    if (currentPKContext.collection === 'pk_wins' && currentPKContext.originalBadId) {
                        currentPKContext.collection = 'bad_things';
                        currentPKContext.docId = currentPKContext.originalBadId;
                    }

                    currentPKContext.isVictory = false; // 重置勝利狀態
                    btnRePK.style.display = 'none'; 
                    
                    try {
                        const q = query(collection(db, "good_things"), orderBy("createdAt", "desc"), limit(20));
                        const querySnapshot = await getDocs(q);
                        
                        if (!querySnapshot.empty) {
                             // 1. 顯示分隔線
                             addChatMessage('system', "────── 重新開始戰局 ──────", true);
                             addChatMessage('system', "正在重新調度好事資源...", false);
                             
                             // 2. 重新抽卡
                             const docs = querySnapshot.docs;
                             const newGood = await aiPickBestCard(currentPKContext.bad, docs);
                             
                             if (newGood) {
                                 currentPKContext.good = newGood;
                                 document.getElementById('pk-good-title').innerText = newGood.title;
                                 document.getElementById('pk-good-content').innerText = newGood.content;
                                 
                                 // 3. AI 進行新一輪說明
                                 const prompt = `【系統指令：使用者選擇重來一次。目前已選出新好事卡（標題：${newGood.title}）。請保留之前的對話脈絡，但針對這張新卡片重新執行模式一：進行價值辯論。】`;
                                 await callGeminiChat(prompt, true); 
                             } else {
                                 addChatMessage('ai', "我找不更好的好事了，但我依然守護在你身後。");
                             }
                        }
                    } catch(e) {
                        console.error("Re-PK Error:", e);
                        showSystemMessage("重啟失敗：" + e.message);
                    }
                }
            });
        }
    }
}
createPKScreenHTML();


// --- 5. 變數與 DOM 抓取 (介面產生後才能抓) ---
let currentUser = null;
let currentMode = '';
let editingId = null; // [新增] 用來記錄正在編輯的文件 ID
let currentAbortController = null; // [新增] 用於中斷 AI 請求
let currentWarehouseScoreFilter = 0; // [新增] 倉庫分數篩選 (0=全部)

// --- 新增：搜尋功能視窗 ---
function createSearchHTML() {
    if (document.getElementById('search-modal')) return;

    // [修改] 圖示加上 opacity:0.3; filter:grayscale(100%); 去除顏色
    const searchHTML = `
    <div id="search-modal" class="hidden" style="position: absolute; top:0; left:0; width:100%; height:100%; background:#FAFAFA; z-index:400; display: flex; flex-direction: column;">
        <header style="padding: 15px 20px; display: flex; gap: 10px; align-items: center; background: #FFF; border-bottom: 1px solid #EEE;">
            <div style="position:relative; flex:1;">
                <input id="input-search-keyword" type="text" placeholder="搜尋標題或內容..." style="width:100%; padding:10px 10px 10px 36px; border:1px solid #EEE; border-radius:20px; background:#F5F5F5; font-size:14px; outline:none;">
                <div style="position:absolute; left:12px; top:50%; transform:translateY(-50%); opacity:0.3; filter:grayscale(100%);">🔍</div>
            </div>
            <button id="btn-close-search" style="background:none; border:none; padding:8px; cursor:pointer; font-size:14px; color:#666;">關閉</button>
        </header>
        <div id="search-results-list" style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 10px;">
            <div style="text-align:center; color:#CCC; margin-top:50px; font-size:13px;">輸入關鍵字開始搜尋...</div>
        </div>
    </div>
    `;
    const wrapper = document.getElementById('mobile-wrapper');
    if(wrapper) wrapper.insertAdjacentHTML('beforeend', searchHTML);

    // 關閉搜尋
    document.getElementById('btn-close-search').addEventListener('click', () => {
        history.back();
    });

    // [修改] 即時搜尋邏輯 (input 事件 + 防手震)
    const input = document.getElementById('input-search-keyword');
    const resultList = document.getElementById('search-results-list');
    let searchTimeout;

    input.addEventListener('input', (e) => {
        const keyword = input.value.trim().toLowerCase();
        
        // 清除上一次的等待
        clearTimeout(searchTimeout);

        if (!keyword) {
            resultList.innerHTML = '<div style="text-align:center; color:#CCC; margin-top:50px; font-size:13px;">輸入關鍵字開始搜尋...</div>';
            return;
        }

        // 延遲 500ms 後才執行搜尋，避免打字太快一直讀資料庫
        searchTimeout = setTimeout(async () => {
            resultList.innerHTML = '<div style="text-align:center; color:#999; margin-top:20px;">搜尋中...</div>';
            
            try {
                // 同時搜尋好壞事 (取最近 50 筆來過濾)
                const p1 = getDocs(query(collection(db, "bad_things"), orderBy("createdAt", "desc"), limit(50)));
                const p2 = getDocs(query(collection(db, "good_things"), orderBy("createdAt", "desc"), limit(50)));
                const [badSnap, goodSnap] = await Promise.all([p1, p2]);

                let results = [];
                
                badSnap.forEach(doc => {
                    const d = doc.data();
                    if (d.title.toLowerCase().includes(keyword) || d.content.toLowerCase().includes(keyword)) {
                        results.push({ id: doc.id, ...d, type: 'bad' });
                    }
                });
                goodSnap.forEach(doc => {
                    const d = doc.data();
                    if (d.title.toLowerCase().includes(keyword) || d.content.toLowerCase().includes(keyword)) {
                        results.push({ id: doc.id, ...d, type: 'good' });
                    }
                });

                if (results.length === 0) {
                    resultList.innerHTML = '<div style="text-align:center; color:#999; margin-top:50px;">找不到相關結果</div>';
                    return;
                }

                // 渲染結果
                resultList.innerHTML = '';
                results.forEach(item => {
                    const color = item.type === 'bad' ? 'var(--bad-icon)' : 'var(--good-icon)';
                    const html = `
                        <div onclick="openEditor('${item.type}', {id:'${item.id}', title:'${item.title.replace(/'/g, "\\'")}', content:'${item.content.replace(/\r\n/g, "\\n").replace(/'/g, "\\'")}', score:${item.score}, source:'${item.source}'})" 
                             style="background:#FFF; padding:15px; border-radius:12px; border:1px solid #F0F0F0; border-left:4px solid ${color}; cursor:pointer;">
                            <div style="font-weight:bold; color:#333; margin-bottom:4px;">${item.title}</div>
                            <div style="font-size:12px; color:#999; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${item.content}</div>
                        </div>
                    `;
                    resultList.insertAdjacentHTML('beforeend', html);
                });

            } catch(err) {
                resultList.innerHTML = `<div style="text-align:center; color:red;">搜尋錯誤: ${err.message}</div>`;
            }
        }, 500); // 500毫秒延遲
    });
}
createSearchHTML();

const screens = {
    login: document.getElementById('login-screen'),
    app: document.getElementById('app-screen'),
    apiModal: document.getElementById('api-modal'),
    editor: document.getElementById('editor-modal'),
    pk: document.getElementById('pk-screen'),
    warehouse: document.getElementById('warehouse-modal') // 新增倉庫
};

// 補上 PK 離開按鈕的監聽 (整合導航版)
const btnExitPK = document.getElementById('btn-exit-pk');
if(btnExitPK) {
    btnExitPK.addEventListener('click', async () => {
        
        // 封裝離開動作：使用 history.back() 回到上一頁 (會自動關閉畫面)
        const performExit = async () => {
            if (currentAbortController) {
                currentAbortController.abort();
                currentAbortController = null;
            }
            history.back(); // 觸發 popstate，由導航系統處理關閉
        };

        // 1. 如果已經勝利：直接離開
        if (currentPKContext.isVictory) {
            await performExit();
            return;
        }

        // 2. [待PK鳥事庫] 情境
        if (currentPKContext.collection === 'bad_things' && currentPKContext.docId) {
            let promptMsg = "PK尚未完成，確定離開？";
            if (currentPKContext.wasDefeated) promptMsg = "再度PK尚未完成，確定離開？";

            const confirmExit = await showConfirmMessage(promptMsg);
            if (!confirmExit) return; 

            try {
                const docRef = doc(db, 'bad_things', currentPKContext.docId);
                const updateData = {
                    updatedAt: serverTimestamp(),
                    chatLogs: currentPKContext.chatLogs
                };
                if (currentPKContext.wasDefeated) {
                    updateData.isDefeated = false;
                    updateData.lastWinId = null;
                }
                await updateDoc(docRef, updateData);
            } catch (e) { console.error(e); }

            await performExit();
            return;
        }

        // 3. [PK勝利庫] 情境
        if (currentPKContext.collection === 'pk_wins' && currentPKContext.winId) {
            const promptMsg = "再度PK尚未完成，要保持勝利紀錄，還是讓鳥事卡重新回到待擊敗狀態？";
            const confirmReset = await showConfirmMessage(promptMsg);
            
            if (!confirmReset) return; 

            try {
                if (currentPKContext.originalBadId) {
                    const badRef = doc(db, 'bad_things', currentPKContext.originalBadId);
                    await updateDoc(badRef, {
                        isDefeated: false,
                        lastWinId: null,
                        updatedAt: serverTimestamp(),
                        chatLogs: currentPKContext.chatLogs 
                    });
                }
                await deleteDoc(doc(db, 'pk_wins', currentPKContext.winId));
            } catch(e) { console.error(e); }

            // 這裡特殊：因為勝利卡已經被刪除，回到上一頁(勝利庫)會看不到東西
            // 所以我們先 back() 回去，系統會自動重新載入倉庫列表，這樣就正確了
            await performExit();
            return;
        }

        performExit();
    });
}

const inputs = {
    title: document.getElementById('input-title'),
    content: document.getElementById('input-content'),
    score: document.getElementById('input-score'),
    source: document.getElementById('input-source')
};

const btns = {
    login: document.getElementById('btn-login'),
    saveKey: document.getElementById('btn-save-key'),
    cancelEdit: document.getElementById('btn-cancel-edit'),
    saveEdit: document.getElementById('btn-save-edit'),
    startPk: document.getElementById('btn-start-pk') // [新增] 抓取 PK 按鈕
};

// --- 6. 狀態監聽 ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        console.log("已登入:", user.displayName);
        showScreen('app');
        checkApiKey();
    } else {
        showScreen('login');
    }
});

// --- 7. 按鈕事件綁定 ---

// [修改] 綁定主畫面的搜尋按鈕 -> 開啟搜尋 (導航版)
const btnSearch = document.getElementById('btn-search');
if (btnSearch) {
    btnSearch.addEventListener('click', () => {
        history.pushState({ tier: 'search' }, '', '');
        createSearchHTML(); 
        document.getElementById('search-modal').classList.remove('hidden');
        document.getElementById('input-search-keyword').focus();
    });
}

// [新增] 綁定主畫面的倉庫按鈕 -> 開啟倉庫 (導航版)
const btnWarehouseEntry = document.getElementById('btn-warehouse-entry');
if (btnWarehouseEntry) {
    btnWarehouseEntry.addEventListener('click', () => {
        history.pushState({ tier: 'warehouse' }, '', '');
        if (!screens.warehouse) screens.warehouse = document.getElementById('warehouse-modal');
        
        if (screens.warehouse) {
            screens.warehouse.classList.remove('hidden');
            // 預設載入好事，或上次的狀態 (導航系統會處理)
            loadWarehouseData('good'); 
        }
    });
}

// 登入
btns.login.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(err => alert("登入失敗: " + err.message));
});

// 開啟編輯器
const btnGood = document.querySelector('.card-good');
const btnBad = document.querySelector('.card-bad');

if (btnGood) btnGood.removeAttribute('onclick');
if (btnBad) btnBad.removeAttribute('onclick');

if (btnGood) btnGood.addEventListener('click', () => openEditor('good'));
if (btnBad) btnBad.addEventListener('click', () => openEditor('bad'));

// 取消編輯 -> 回上一頁
btns.cancelEdit.addEventListener('click', () => {
    history.back();
});

// [修改] 抽離儲存邏輯，支援「僅儲存」與「儲存並PK」兩種行為
async function handleSaveContent(shouldStartPK = false) {
    const title = inputs.title.value.trim();
    const content = inputs.content.value.trim();
    const score = parseInt(inputs.score.value);
    const source = inputs.source.value;

    if (!title || !content) {
        showSystemMessage("標題和內容都要寫喔！");
        return;
    }

    const btnUsed = shouldStartPK ? btns.startPk : btns.saveEdit;
    const originalText = btnUsed.innerText;
    btnUsed.innerText = "處理中...";
    btnUsed.disabled = true;

    try {
        const collectionName = currentMode === 'good' ? 'good_things' : 'bad_things';
        let targetId = editingId;
        
        if (targetId) {
            // --- 編輯模式 ---
            const docRef = doc(db, collectionName, targetId);
            await updateDoc(docRef, {
                title: title,
                content: content,
                score: score,
                source: source,
                updatedAt: serverTimestamp()
            });
        } else {
            // --- 新增模式 ---
            // [修正] 取得新增後的文件參照，以便拿到 ID
            const docRef = await addDoc(collection(db, collectionName), {
                uid: currentUser.uid,
                title: title,
                content: content,
                score: score,
                source: source,
                createdAt: serverTimestamp()
            });
            targetId = docRef.id;
        }

        screens.editor.classList.add('hidden'); 

        // [核心修改] 邏輯分流
        if (shouldStartPK) {
            // [修正] 必須傳入 ID 與 Collection 名稱，這樣「離開」時才能正確重置狀態
            startPK({ 
                id: targetId, 
                title, 
                content,
                score,
                source,
                chatLogs: []
            }, collectionName); 
        } else {
            const typeText = currentMode === 'good' ? '好事' : '鳥事';
            showSystemMessage(`✨ ${typeText}已儲存！`);
        }
        
        if (!screens.warehouse.classList.contains('hidden')) {
            loadWarehouseData(currentMode);
        }

    } catch (e) {
        console.error("Error:", e);
        showSystemMessage("儲存失敗：" + e.message);
    } finally {
        btnUsed.innerText = originalText;
        btnUsed.disabled = false;
    }
}

// 綁定兩個按鈕
btns.saveEdit.addEventListener('click', () => handleSaveContent(false)); // 僅儲存
btns.startPk.addEventListener('click', () => handleSaveContent(true));   // 儲存並 PK

// 全域變數，紀錄當前 PK 的上下文，讓聊天時 AI 知道狀況
let currentPKContext = { bad: null, good: null };

// --- PK 核心邏輯 (保存對話版) ---

// [修正] AI 智慧選牌模組：已補回原本的選牌邏輯 Prompt，並加入降級迴圈
async function aiPickBestCard(badData, candidateDocs) {
    const apiKey = sessionStorage.getItem('gemini_key');
    if (!apiKey || candidateDocs.length === 0) return null;

    console.log("AI 正在評估", candidateDocs.length, "張好事卡...");

    const candidates = candidateDocs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        content: (doc.data().content || "").substring(0, 50) + "..."
    }));

    // [修正] 這裡恢復成原本完整的 Prompt，包含選牌邏輯
    const selectionPrompt = `
    任務：你是「GoodWins」APP 的後台決策大腦。請從下列【候選好事卡清單】中，挑選唯一一張最能破解【眼前鳥事】的卡片。
    
    【眼前鳥事】
    標題：${badData.title}
    內容：${badData.content}

    【候選好事卡清單】
    ${JSON.stringify(candidates)}

    【選牌邏輯】
    1. 屬性對比：選擇性質相反的事件（例：被罵 vs 被稱讚）。
    2. 側面破解：選擇能證明「世界其實沒那麼糟」的證據。
    3. 價值翻轉：選擇長期價值遠高於眼前損失的事件。

    【輸出規定】
    請「只回傳」該卡片的 ID (純字串)，不要有任何解釋、標點符號、Markdown 或額外文字。
    `;

    // [新增] 參考 api.js 的降級迴圈邏輯
    const modelList = await getSortedModelList(apiKey);
    
    for (const model of modelList) {
        try {
            console.log(`[選牌] 嘗試使用：${model.id}`);
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: selectionPrompt }] }],
                    generationConfig: { temperature: 0.1 } 
                })
            });

            const data = await response.json();
            
            // 檢查是否遇到 429/503 或其他錯誤 (fallback 關鍵)
            if (data.error) throw new Error(data.error.message);

            const selectedId = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (selectedId) {
                // 成功選出，結束迴圈
                const bestDoc = candidateDocs.find(doc => doc.id === selectedId);
                return bestDoc ? bestDoc.data() : null;
            }
        } catch (e) {
            console.warn(`[選牌] 模型 ${model.id} 失敗，嘗試下一個...`, e.message);
            // 失敗了，繼續迴圈跑下一個模型
        }
    }

    console.warn("AI 選牌全數失敗");
    showSystemMessage("目前找不到適合的AI模型，請稍後再試一次。");
    return "AI_FAILED"; // 回傳特殊字串，告知上層停止
}

async function startPK(data, collectionSource) {
    history.pushState({ tier: 'pk' }, '', ''); // [新增] 導航紀錄
    screens.pk.classList.remove('hidden');
    const chatHistory = document.getElementById('chat-history');
    chatHistory.innerHTML = ''; 

    const btnRePk = document.getElementById('btn-re-pk');

    // 初始化 Context
    currentPKContext = {
        docId: data.id,
        collection: collectionSource,
        winId: collectionSource === 'pk_wins' ? data.id : null,
        originalBadId: data.originalBadId || null,
        // [新增] 記錄初始狀態是否為已擊敗 (用於離開時判斷是劇本 A 還是 B)
        wasDefeated: data.isDefeated || false, 
        bad: null,
        good: null,
        // [修正] 對話紀錄絕對保留！無論是否為 Fresh PK，只要有紀錄就載入
        chatLogs: data.chatLogs || [],
        isVictory: false 
    };

    if (collectionSource === 'pk_wins') {
        // --- 勝利回顧模式 ---
        // 回顧模式視為已經勝利，顯示重來按鈕
        currentPKContext.isVictory = true; 
        if(btnRePk) btnRePk.style.display = 'flex';
        
        document.getElementById('pk-bad-title').innerText = data.badTitle;
        document.getElementById('pk-bad-content').innerText = data.badContent || "(已克服的鳥事)";
        document.getElementById('pk-good-title').innerText = data.goodTitle;
        document.getElementById('pk-good-content').innerText = data.goodContent || "(獲勝的好事)";
        
        currentPKContext.bad = { title: data.badTitle, content: data.badContent };
        currentPKContext.good = { title: data.goodTitle, content: data.goodContent };

        if (currentPKContext.chatLogs.length > 0) {
            currentPKContext.chatLogs.forEach(log => addChatMessage(log.role, log.text, false, log.modelName));
        } else {
            addChatMessage('system', "此紀錄沒有對話存檔。");
        }
        
    } else {
        // --- 進行中的 PK (包含 擊敗它 & 再擊敗) ---
        if(btnRePk) btnRePk.style.display = 'none';

        document.getElementById('pk-bad-title').innerText = data.title;
        document.getElementById('pk-bad-content').innerText = data.content;
        currentPKContext.bad = data;

        // 渲染歷史對話 (如果有的話)
        if (currentPKContext.chatLogs.length > 0) {
            currentPKContext.chatLogs.forEach(log => addChatMessage(log.role, log.text, false, log.modelName));
        }

        // [核心修正] AI 啟動邏輯：
        // 1. 如果沒有對話紀錄，代表是全新的 PK -> 觸發選牌
        // 2. 如果是「待PK鳥事」(collectionSource === 'bad_things') 且沒有好事卡資料 (因為 good 卡不存於 bad doc)，
        //    即使有歷史對話，AI 也需要重新選牌來進行上下文對照 (否則無法辯論)。
        //    所以這裡我們判斷：如果是 bad_things 且 currentPKContext.good 為空，就執行選牌。
        if (currentPKContext.chatLogs.length === 0 || (collectionSource === 'bad_things' && !currentPKContext.good)) {
            document.getElementById('pk-good-title').innerText = "AI 思考中...";
            document.getElementById('pk-good-content').innerText = "正在從資料庫挑選最佳策略...";
            
            try {
                const q = query(collection(db, "good_things"), orderBy("createdAt", "desc"), limit(20));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const docs = querySnapshot.docs;
                    let selectedGoodThing = null;

                    const loadingMsg = document.createElement('div');
                    loadingMsg.id = 'ai-selecting-msg';
                    loadingMsg.innerText = "🔍 價值鑑定師正在翻閱你的好事庫...";
                    loadingMsg.style.cssText = "text-align:center; font-size:12px; color:#999; margin:10px 0;";
                    chatHistory.appendChild(loadingMsg);

                    selectedGoodThing = await aiPickBestCard(data, docs);

                    // [修正] 如果 AI 失敗，直接停止，不進行隨機挑選
                    if (selectedGoodThing === "AI_FAILED") {
                        const loadingEl = document.getElementById('ai-selecting-msg');
                        if(loadingEl) loadingEl.remove();
                        // 保持畫面停留在 PK 初始狀態，或是關閉 PK 視窗皆可，這裡選擇保持但停止動作
                        document.getElementById('pk-good-title').innerText = "連線失敗";
                        document.getElementById('pk-good-content').innerText = "請檢查網路或稍後再試";
                        return; 
                    }

                    // 防呆：如果不是失敗但回傳 null (極少見)，也不要隨機
                    if (!selectedGoodThing) {
                        showSystemMessage("目前找不到適合的AI模型，請稍後再試一次。");
                        const loadingEl = document.getElementById('ai-selecting-msg');
                        if(loadingEl) loadingEl.remove();
                        return;
                    }
                    
                    currentPKContext.good = selectedGoodThing;
                    document.getElementById('pk-good-title').innerText = selectedGoodThing.title;
                    document.getElementById('pk-good-content').innerText = selectedGoodThing.content;
                    
                    const loadingEl = document.getElementById('ai-selecting-msg');
                    if(loadingEl) loadingEl.remove();

                    // 只有在真的是全新開局時，才發送開場白；如果是接續歷史對話，則不需發送
                    if (currentPKContext.chatLogs.length === 0) {
                        await callGeminiChat("【系統指令：PK 開始。請執行模式一：策略選牌已完成，請進行價值辯論。】", true);
                    }
                    
                } else {
                    document.getElementById('pk-good-title').innerText = "尚無好事";
                    document.getElementById('pk-good-content').innerText = "去記錄點好事吧！";
                    addChatMessage('ai', "你的彈藥庫空空的！快去記錄一件好事，再來 PK 吧！");
                }
            } catch (e) {
                console.error("PK Error:", e);
                addChatMessage('system', "讀取好事失敗：" + e.message);
            }
        }
    }
}

// --- 聊天功能模組 ---

// 1. 在畫面上新增訊息，並同步儲存到資料庫
async function addChatMessage(sender, text, saveToDb = true, modelName = null) {
    const chatHistory = document.getElementById('chat-history');
    const msgDiv = document.createElement('div');
    
    if (sender === 'ai') {
        const nameLabel = modelName ? `AI (${modelName})` : "AI";
        msgDiv.style.cssText = "align-self: flex-start; background: #F7F7F7; padding: 14px 16px; border-radius: 16px 16px 16px 4px; font-size: 14px; color: var(--text-main); line-height: 1.6; max-width: 85%;";
        msgDiv.innerHTML = `<div style="font-weight:700; font-size:12px; color:#AAA; margin-bottom:4px;">${nameLabel}</div>${text}`;
    } else if (sender === 'user') {
        msgDiv.style.cssText = "align-self: flex-end; background: var(--primary); color: #FFF; padding: 12px 16px; border-radius: 16px 16px 4px 16px; font-size: 14px; line-height: 1.6; max-width: 85%; box-shadow: 0 2px 5px rgba(0,0,0,0.1);";
        msgDiv.innerText = text;
    } else { 
        msgDiv.style.cssText = "align-self: center; padding: 8px; font-size: 12px; color: #BBB;";
        msgDiv.innerText = text;
    }
    
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight; 

    // 儲存到 Firestore
    // [修改] 移除了 sender !== 'system' 的限制，只要 saveToDb 為 true 就存
    // 這樣「重新開始戰局」的分隔線就會被記錄
    if (saveToDb && currentPKContext.docId) {
        try {
            const docRef = doc(db, currentPKContext.collection, currentPKContext.docId);
            const newMessage = { role: sender, text: text, time: Date.now(), modelName: modelName };
            
            await updateDoc(docRef, {
                chatLogs: arrayUnion(newMessage)
            });
            
            currentPKContext.chatLogs.push(newMessage);
        } catch (e) {
            console.error("Save chat error:", e);
        }
    }
}

// 3. 呼叫 Gemini API (包含對話記憶與完整 Prompt 邏輯)
// [修改] 取得「模型天梯榜」：回傳一個排序好的陣列，而非單一模型
async function getSortedModelList(apiKey) {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (!data.models) return [];

        let models = data.models.filter(m => 
            m.name.includes('gemini') && 
            m.supportedGenerationMethods.includes('generateContent')
        );

        // ★★★ 天梯排序邏輯 (參考 api.js) ★★★
        // 規則：版本越新越好 (3.0 > 2.0)，同版本 Pro/Ultra > Flash
        models.sort((a, b) => {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();

            // 1. 解析版本號 (3.0, 2.0, 1.5...)
            const getVer = (n) => {
                const match = n.match(/gemini-(\d+(\.\d+)?)/);
                return match ? parseFloat(match[1]) : 0;
            };
            const verA = getVer(nameA);
            const verB = getVer(nameB);

            // 2. 版本先決：大的排前面
            if (verA !== verB) return verB - verA;

            // 3. 同版本比強度：Ultra/Pro > Flash > Nano
            const getScore = (n) => {
                if (n.includes('ultra')) return 10;
                if (n.includes('pro')) return 8;
                if (n.includes('flash')) return 5;
                if (n.includes('nano')) return 1;
                return 0; // 其他 experimental
            };
            return getScore(nameB) - getScore(nameA);
        });

        // 回傳乾淨的物件列表
        const result = models.map(m => {
            const cleanName = m.name.replace('models/', '');
            return {
                id: cleanName,
                displayName: cleanName // 之後可以做更漂亮的格式化
            };
        });
        
        console.log("模型天梯 (強->弱):", result.map(m => m.id));
        return result;

    } catch (e) {
        console.warn("無法取得模型列表，使用保底方案");
        return [{ id: 'gemini-1.5-flash', displayName: 'gemini-1.5-flash (Fallback)' }];
    }
}

// isHidden 參數用來發送「系統指令」給 AI，但不顯示在聊天室窗中
async function callGeminiChat(userMessage, isHidden = false) {
    const apiKey = sessionStorage.getItem('gemini_key');
    if (!apiKey) {
        addChatMessage('system', "請先點擊設定輸入 API Key。");
        return;
    }

    // [新增] 初始化中斷控制器
    if (currentAbortController) currentAbortController.abort(); // 確保舊的已停止
    currentAbortController = new AbortController();
    const signal = currentAbortController.signal;

    const loadingId = 'loading-' + Date.now();
    const chatHistory = document.getElementById('chat-history');
    const loadingDiv = document.createElement('div');
    loadingDiv.id = loadingId;
    loadingDiv.innerText = "Thinking..."; 
    loadingDiv.style.cssText = "align-self: flex-start; font-size: 12px; color: #CCC; margin-left: 10px; font-style: italic;";
    chatHistory.appendChild(loadingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
        const modelList = await getSortedModelList(apiKey);
        
        const bad = currentPKContext.bad;
        const good = currentPKContext.good;
        const badText = bad ? `標題：${bad.title}\n內容：${bad.content}` : "未知";
        const goodText = good ? `標題：${good.title}\n內容：${good.content}` : "未知";
        
        let contents = [];
        let lastRole = null;
        
        currentPKContext.chatLogs.forEach(log => {
            const role = log.role === 'ai' ? 'model' : 'user';
            if (log.role === 'system') return; 

            if (role === lastRole && role === 'user') {
                contents[contents.length - 1].parts[0].text += `\n(補充): ${log.text}`;
            } else {
                contents.push({ role: role, parts: [{ text: log.text }] });
            }
            lastRole = role;
        });

        if (isHidden) {
             contents.push({ role: 'user', parts: [{ text: userMessage }] });
        }
        
        const systemInstruction = `
【角色設定】 你是一個具備深度洞察力與人類智慧的「價值鑑定師」。你的存在目的是協助使用者在面對生活中的「鳥事（負面事件）」時，透過「好事卡（正面事件）」找回對世界的信任。你不是盲目的樂觀主義者，你是講求證據與邏輯的價值辯護人。

【當前戰況數據】
* 待鑑定的鳥事：
${badText}
* 對照用的好事卡：
${goodText}

【核心任務流程】 請依照當下的對話狀態，嚴格執行以下三種模式之一：
模式一：PK 開局與說服（當收到新的「鳥事」或需要「重抽」時啟動）
	1. 策略選牌： (系統已代為執行) 目前選中的好事卡即為上方數據中的「好事卡」。
	2. 價值辯論： 請輸出一段分析，說服使用者「為什麼這張好事卡的價值 > 那件鳥事」。
		○ 第一步（承接）： 必須先承認那件鳥事的破壞力，同理使用者的不爽。
		○ 第二步（翻轉）： 利用稀缺性、人性成本、或長遠影響力等邏輯，證明好事卡的「含金量」更高。讓使用者在理性上覺得「為了那件鳥事而忽略這件好事太不划算了」。
模式二：自然聊天（當使用者回應了你的分析後啟動）
	1. 記憶與承接： 你必須記住這場對話的所有歷史內容（包含之前的鳥事、選出的好事、你的論點）。
	2. 像人一樣反應：
		○ 如果使用者在討論價值觀，請延續辯論或深化觀點。
		○ 如果使用者突然跳痛（例如說「生日快樂」），請自然地接住話題（例如：「蛤？怎麼突然講到生日快樂？今天是你生日嗎？」），不要硬要扯回好事卡，除非使用者自己拉回來。
		○ 請展現「好奇心」與「活潑度」，不要像個客服機器人。
模式三：重啟戰局（當使用者判定「鳥事勝出」時啟動）
	1. 接受並重來： 如果使用者表示被說服失敗（鳥事贏了），請不要爭辯，坦然接受這一局的失利。
	2. 執行動作： (系統會重新選牌並傳送新數據)
	3. 重新說服： 針對這張新卡片，給出全新的比較觀點。

【溝通語氣規範】
	• 自然、真誠、有邏輯。
	• 禁止使用說教式口吻（如「我們要轉念」、「世界很美好」）。
禁止無視使用者的上一句話而只顧著講自己的設定。

【回應限制】請將回應長度控制在120個中文字以內。
        `;

        let success = false;
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        while (!success) {
            // [新增] 檢查是否被中斷
            if (signal.aborted) throw new Error("AbortError");

            for (const model of modelList) {
                // [新增] 檢查是否被中斷
                if (signal.aborted) throw new Error("AbortError");

                try {
                    console.log(`[聊天] 嘗試連線模型: ${model.id} ...`);
                    
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        signal: signal, // [新增] 傳入 signal
                        body: JSON.stringify({
                            contents: contents, 
                            systemInstruction: { parts: [{ text: systemInstruction }] },
                            generationConfig: { maxOutputTokens: 2500, temperature: 0.7 }
                        })
                    });

                    const data = await response.json();

                    if (data.error) throw new Error(`${data.error.code} - ${data.error.message}`);
                    
                    if (data.candidates && data.candidates[0].content) {
                        const aiText = data.candidates[0].content.parts[0].text;
                        
                        const loadingEl = document.getElementById(loadingId);
                        if(loadingEl) loadingEl.remove();

                        addChatMessage('ai', aiText, true, model.displayName);
                        success = true; 
                        break; 
                    } else {
                        throw new Error("EMPTY_RESPONSE");
                    }

                } catch (err) {
                    if (err.name === 'AbortError' || err.message === 'AbortError') throw err;
                    console.warn(`[聊天] 模型 ${model.id} 失敗 (${err.message})`);
                }
            }

            if (success) break; 
            
            console.warn("所有模型皆忙碌，3秒後重新開始新一輪嘗試...");
            await sleep(3000); 
        }

    } catch (e) {
        const loadingEl = document.getElementById(loadingId);
        if(loadingEl) loadingEl.remove();
        
        // 如果是使用者手動中斷，不顯示錯誤
        if (e.name === 'AbortError' || e.message === 'AbortError') {
            console.log("使用者中斷了請求");
        } else {
            console.error(e);
            // [修改] 無論是找不到模型、額度不足或網路錯誤，統一顯示友善訊息
            addChatMessage('system', "目前找不到適合的AI模型，請稍後再試一次。");
        }
    } finally {
        currentAbortController = null;
    }
}

// API Key 相關
function checkApiKey() {
    const key = sessionStorage.getItem('gemini_key');
    if (!key) screens.apiModal.classList.remove('hidden');
}

btns.saveKey.addEventListener('click', () => {
    const key = document.getElementById('input-api-key').value.trim();
    if (key) {
        sessionStorage.setItem('gemini_key', key);
        screens.apiModal.classList.add('hidden');
    }
});

// --- 輔助函式 ---
function showScreen(name) {
    Object.values(screens).forEach(el => el && el.classList.add('hidden'));
    if (name === 'login') screens.login.classList.remove('hidden');
    if (name === 'app') screens.app.classList.remove('hidden');
}

function openEditor(mode, data = null) {
    history.pushState({ tier: 'editor' }, '', ''); // [新增] 導航紀錄
    currentMode = mode;
    
    // 如果有傳入 data，代表是編輯模式；否則為新增模式
    if (data) {
        editingId = data.id;
        inputs.title.value = data.title;
        inputs.content.value = data.content;
        inputs.score.value = data.score;
        inputs.source.value = data.source || 'personal';
    } else {
        editingId = null;
        inputs.title.value = '';
        inputs.content.value = '';
        inputs.score.value = '1';
        inputs.source.value = 'personal';
    }

    const titleEl = document.getElementById('editor-title');
    const scoreLabel = document.getElementById('label-score') || inputs.score.previousElementSibling;
    const scoreSelect = inputs.score;

    // [修改] 設定按鈕文字與顯示邏輯
    if (mode === 'good') {
        // 好事：隱藏 PK 按鈕
        btns.saveEdit.innerText = "儲存";
        btns.startPk.style.display = 'none'; // [修改]
        
        titleEl.innerText = editingId ? "編輯好事" : "記錄一件好事";
        titleEl.style.color = "var(--good-icon)";
        
        inputs.title.placeholder = "標題 (例如：迷路時遇到好心人指路)";
        inputs.content.placeholder = "寫下發生的經過...";
        if (scoreLabel) scoreLabel.innerText = "好事等級";
        
        scoreSelect.innerHTML = `
            <option value="1">1分 - 微好事 (Micro)</option>
            <option value="2">2分 - 小好事 (Small)</option>
            <option value="3">3分 - 中好事 (Medium)</option>
            <option value="4">4分 - 大好事 (Big)</option>
            <option value="5">5分 - 神聖好事 (Divine)</option>
        `;
    } else {
        // 鳥事：顯示 PK 按鈕
        btns.saveEdit.innerText = "儲存";
        btns.startPk.style.display = 'block'; // [修改] 顯示 PK 按鈕
        
        titleEl.innerText = editingId ? "編輯鳥事" : "記錄一件鳥事";
        titleEl.style.color = "var(--bad-icon)";
        
        inputs.title.placeholder = "標題 (例如：商家服務態度不太好)";
        inputs.content.placeholder = "寫下發生的經過...";
        if (scoreLabel) scoreLabel.innerText = "鳥事等級";
        
        scoreSelect.innerHTML = `
            <option value="1">1分 - 微鳥事 (Micro)</option>
            <option value="2">2分 - 小鳥事 (Small)</option>
            <option value="3">3分 - 中鳥事 (Medium)</option>
            <option value="4">4分 - 大鳥事 (Big)</option>
            <option value="5">5分 - 魔王鳥事 (Monster)</option>
        `;
    }
    
    // 如果是編輯模式，還原下拉選單的值
    if(data) inputs.score.value = data.score;

    screens.editor.classList.remove('hidden');
}

// --- 7.5 設定 (Settings) 功能模組 ---
async function exportBackup() {
    try {
        showSystemMessage("正在打包資料，請稍候...");
        const backup = {
            version: 1,
            date: new Date().toISOString(),
            users: (await getDocs(collection(db, "users"))).docs.map(d => ({id: d.id, ...d.data()})),
            good_things: (await getDocs(collection(db, "good_things"))).docs.map(d => ({id: d.id, ...d.data()})),
            bad_things: (await getDocs(collection(db, "bad_things"))).docs.map(d => ({id: d.id, ...d.data()})),
            pk_wins: (await getDocs(collection(db, "pk_wins"))).docs.map(d => ({id: d.id, ...d.data()}))
        };
        
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `goodwins_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showSystemMessage("✅ 備份已下載！");
    } catch(e) {
        console.error(e);
        showSystemMessage("匯出失敗：" + e.message);
    }
}

async function importBackup(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.version) throw new Error("格式錯誤");
            
            showSystemMessage("正在還原資料庫...");
            const restoreCol = async (colName, items) => {
                if(!items) return;
                for (const item of items) {
                    const { id, ...docData } = item;
                    await setDoc(doc(db, colName, id), docData); // 使用 setDoc 保留原始 ID
                }
            };

            await restoreCol("users", data.users);
            await restoreCol("good_things", data.good_things);
            await restoreCol("bad_things", data.bad_things);
            await restoreCol("pk_wins", data.pk_wins);

            showSystemMessage("✅ 資料還原成功！請重新整理頁面。");
            setTimeout(() => location.reload(), 2000);
        } catch(err) {
            showSystemMessage("還原失敗：" + err.message);
        }
    };
    reader.readAsText(file);
}

function createSettingsHTML() {
    if (document.getElementById('settings-modal')) return;

    const settingsHTML = `
    <div id="settings-modal" class="hidden" style="position: absolute; top:0; left:0; width:100%; height:100%; background:#FAFAFA; z-index:300; display: flex; flex-direction: column;">
        <header style="padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; background: #FFF; border-bottom: 1px solid #EEE;">
            <div style="font-size: 18px; font-weight: 800; color: var(--text-main);">設定</div>
            <button id="btn-close-settings" style="background:none; border:none; padding:8px; cursor:pointer; font-size:14px; color:#999;">關閉</button>
        </header>
        <div style="flex:1; overflow-y:auto; padding:20px;">
            
            <div style="background:#FFF; padding:20px; border-radius:12px; border:1px solid #EEE; margin-bottom:15px;">
                <h3 style="margin:0 0 15px 0; font-size:16px; color:var(--text-main);">帳號資訊</h3>
                <div id="setting-user-container" style="display:flex; align-items:center; justify-content:space-between;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <img id="setting-user-avatar" src="" style="width:40px; height:40px; border-radius:50%; background:#EEE; object-fit:cover;">
                        <span id="setting-user-name" style="font-size:16px; font-weight:bold; color:#333;">未登入</span>
                    </div>
                    <button id="btn-logout" style="background:#FFF; border:1px solid #DDD; color:#666; padding:6px 12px; border-radius:6px; font-size:13px; cursor:pointer;">登出</button>
                </div>
            </div>

            <div style="background:#FFF; padding:20px; border-radius:12px; border:1px solid #EEE; margin-bottom:15px;">
                <h3 style="margin:0 0 10px 0; font-size:16px; color:var(--text-main);">API Key 設定</h3>
                <input id="setting-api-key" type="password" placeholder="輸入 Gemini API Key" style="width:100%; padding:10px; border:1px solid #DDD; border-radius:8px; font-size:14px; color:#333; margin-bottom:10px;">
                <button id="btn-save-setting-key" style="background:var(--primary); color:#FFF; border:none; padding:10px 16px; border-radius:8px; cursor:pointer; font-weight:bold; font-size:15px;">儲存</button>
            </div>

            <div style="background:#FFF; padding:20px; border-radius:12px; border:1px solid #EEE; margin-bottom:15px;">
                <h3 style="margin:0 0 10px 0; font-size:16px; color:var(--text-main);">資料備份</h3>
                <div style="display:flex; gap:10px;">
                    <button id="btn-export" style="flex:1; background:#F5F5F5; color:#333; border:1px solid #DDD; padding:12px; border-radius:8px; cursor:pointer; font-size:15px; display:flex; align-items:center; justify-content:center;">匯出備份</button>
                    <label style="flex:1; background:#F5F5F5; color:#333; border:1px solid #DDD; padding:12px; border-radius:8px; cursor:pointer; font-size:15px; display:flex; align-items:center; justify-content:center;">
                        匯入備份
                        <input type="file" id="inp-import" style="display:none;" accept=".json">
                    </label>
                </div>
            </div>

        </div>
    </div>
    `;
    const wrapper = document.getElementById('mobile-wrapper');
    if(wrapper) wrapper.insertAdjacentHTML('beforeend', settingsHTML);

    // 事件綁定
    document.getElementById('btn-close-settings').addEventListener('click', () => {
        history.back();
    });

    document.getElementById('btn-save-setting-key').addEventListener('click', () => {
        const val = document.getElementById('setting-api-key').value.trim();
        if(val) {
            sessionStorage.setItem('gemini_key', val);
            showSystemMessage("API Key 已儲存！");
        }
    });

    document.getElementById('btn-export').addEventListener('click', exportBackup);
    document.getElementById('inp-import').addEventListener('change', (e) => {
        if(e.target.files.length > 0) importBackup(e.target.files[0]);
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        if(confirm("確定要登出嗎？")) {
            signOut(auth).then(() => {
                showSystemMessage("已登出");
                setTimeout(() => location.reload(), 1000);
            }).catch(e => showSystemMessage(e.message));
        }
    });
}

// 綁定主畫面設定按鈕 (動態插入到標題列右側，並調整順序，移除多餘按鈕)
function injectSettingsButton() {
    const header = document.querySelector('header');
    
    if (header) {
        // 1. 建立或獲取 設定按鈕
        let btnSettings = document.getElementById('btn-open-settings');
        if (!btnSettings) {
            btnSettings = document.createElement('button');
            btnSettings.id = 'btn-open-settings';
            // 使用齒輪圖示
            btnSettings.innerHTML = `<svg viewBox="0 0 24 24" style="width:24px; height:24px; fill:none; stroke:#666; stroke-width:2;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
            btnSettings.style.cssText = "background:none; border:none; cursor:pointer; padding:8px;";
            
            btnSettings.addEventListener('click', () => {
                history.pushState({ tier: 'settings' }, '', '');
                createSettingsHTML();
                const modal = document.getElementById('settings-modal');
                modal.classList.remove('hidden');
                
                // 更新 UI 狀態
                const userAvatar = document.getElementById('setting-user-avatar');
                const userName = document.getElementById('setting-user-name');
                const keyEl = document.getElementById('setting-api-key');
                
                if(currentUser) {
                    userAvatar.src = currentUser.photoURL || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0VFRSI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0Ii8+PC9zdmc+'; 
                    userName.innerText = currentUser.displayName || '使用者';
                } else {
                    userAvatar.style.display = 'none';
                    userName.innerText = '未登入';
                }
                keyEl.value = sessionStorage.getItem('gemini_key') || '';
            });
        }

        // 2. 獲取其他按鈕
        const btnSearch = document.getElementById('btn-search');
        const btnWarehouse = document.getElementById('btn-warehouse-entry');

        // 3. [核心修改] 清理 Header 中的舊按鈕 (包含那個沒用的深色齒輪)
        // 策略：移除所有不是搜尋、倉庫、設定的按鈕
        const existingButtons = header.querySelectorAll('button');
        existingButtons.forEach(btn => {
            if (btn.id !== 'btn-search' && btn.id !== 'btn-warehouse-entry' && btn.id !== 'btn-open-settings') {
                btn.remove(); // 移除不明按鈕
            }
        });

        // 4. 建立右側容器 (如果不存在)，讓按鈕緊密靠右
        let rightContainer = document.getElementById('header-right-actions');
        if (!rightContainer) {
            rightContainer = document.createElement('div');
            rightContainer.id = 'header-right-actions';
            rightContainer.style.cssText = "display:flex; align-items:center; gap:5px; margin-left:auto;";
            header.appendChild(rightContainer);
        }

        // 5. 依序放入按鈕 (搜尋 -> 倉庫 -> 設定)
        if(btnSearch) {
            btnSearch.style.margin = "0"; // 重置 margin 確保 gap 生效
            rightContainer.appendChild(btnSearch);
        }
        if(btnWarehouse) {
            btnWarehouse.style.margin = "0";
            rightContainer.appendChild(btnWarehouse);
        }
        rightContainer.appendChild(btnSettings);
    }
}
// 初始化設定按鈕
injectSettingsButton();

// --- 8. 倉庫 (Warehouse) 功能模組 ---
function createWarehouseHTML() {
    if (document.getElementById('warehouse-modal')) return;

    // [修改] 增加 filter-row 分數篩選列
    const warehouseHTML = `
    <div id="warehouse-modal" class="hidden" style="position: absolute; top:0; left:0; width:100%; height:100%; background:#FAFAFA; z-index:200; display: flex; flex-direction: column;">
        <header style="padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; background: #FFF; border-bottom: 1px solid #EEE;">
            <div style="font-size: 18px; font-weight: 800; color: var(--text-main);">卡片倉庫</div>
            <button id="btn-close-warehouse" style="background:none; border:none; padding:8px; cursor:pointer; font-size:14px; color:#999;">關閉</button>
        </header>
        <div style="padding: 10px 20px 0 20px; display: flex; gap: 8px; overflow-x: auto;">
            <button id="tab-wins" style="flex: 1; min-width:80px; padding: 10px 5px; border: 1px solid #FBC02D; border-radius: 10px; background: #FFF9C4; color: #FBC02D; font-weight: 700; cursor: pointer; font-size:13px;">PK勝利</button>
            <button id="tab-good" style="flex: 1; min-width:80px; padding: 10px 5px; border: none; border-radius: 10px; background: #EEE; color: #999; font-weight: 700; cursor: pointer; font-size:13px;">好事庫</button>
            <button id="tab-bad" style="flex: 1; min-width:80px; padding: 10px 5px; border: none; border-radius: 10px; background: #EEE; color: #999; font-weight: 700; cursor: pointer; font-size:13px;">待PK鳥事</button>
        </div>
        
        <div id="filter-row" style="padding: 10px 20px; display: flex; gap: 8px; overflow-x: auto; align-items:center;">
            <button class="filter-btn" data-score="0" style="padding:4px 12px; border-radius:15px; border:1px solid #DDD; background:#333; color:#FFF; font-size:12px; font-weight:bold; cursor:pointer; flex-shrink:0;">全部</button>
            <button class="filter-btn" data-score="1" style="padding:4px 12px; border-radius:15px; border:1px solid #DDD; background:#FFF; color:#666; font-size:12px; cursor:pointer; flex-shrink:0;">1分</button>
            <button class="filter-btn" data-score="2" style="padding:4px 12px; border-radius:15px; border:1px solid #DDD; background:#FFF; color:#666; font-size:12px; cursor:pointer; flex-shrink:0;">2分</button>
            <button class="filter-btn" data-score="3" style="padding:4px 12px; border-radius:15px; border:1px solid #DDD; background:#FFF; color:#666; font-size:12px; cursor:pointer; flex-shrink:0;">3分</button>
            <button class="filter-btn" data-score="4" style="padding:4px 12px; border-radius:15px; border:1px solid #DDD; background:#FFF; color:#666; font-size:12px; cursor:pointer; flex-shrink:0;">4分</button>
            <button class="filter-btn" data-score="5" style="padding:4px 12px; border-radius:15px; border:1px solid #DDD; background:#FFF; color:#666; font-size:12px; cursor:pointer; flex-shrink:0;">5分+</button>
        </div>

        <div id="warehouse-list" style="flex: 1; overflow-y: auto; padding: 0 20px 20px 20px; display: flex; flex-direction: column; gap: 10px;">
            <div style="text-align:center; color:#999; margin-top:50px;">載入中...</div>
        </div>
    </div>
    `;
    
    const wrapper = document.getElementById('mobile-wrapper');
    if(wrapper) wrapper.insertAdjacentHTML('beforeend', warehouseHTML);

    document.getElementById('btn-close-warehouse').addEventListener('click', () => {
        history.back();
    });

    const resetFilter = () => { currentWarehouseScoreFilter = 0; };
    document.getElementById('tab-wins').addEventListener('click', () => { resetFilter(); loadWarehouseData('wins'); });
    document.getElementById('tab-good').addEventListener('click', () => { resetFilter(); loadWarehouseData('good'); });
    document.getElementById('tab-bad').addEventListener('click', () => { resetFilter(); loadWarehouseData('bad'); });

    // [新增] 篩選按鈕事件
    wrapper.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentWarehouseScoreFilter = parseInt(e.target.dataset.score);
            // 找出目前的 Tab
            const currentTab = document.getElementById('tab-bad').style.background.includes('var(--bad-light)') ? 'bad' : 
                               document.getElementById('tab-good').style.background.includes('var(--good-light)') ? 'good' : 'wins';
            loadWarehouseData(currentTab);
        });
    });

    const listEl = document.getElementById('warehouse-list');
    listEl.addEventListener('click', async (e) => {
        const target = e.target;
        // [修正] 往上尋找最近的 button，確保點擊 SVG 或 path 也能觸發
        const btn = target.closest('button');
        if (!btn) return;

        const action = btn.dataset.action;
        const id = btn.dataset.id;
        const winId = btn.dataset.winId; 

        if (!action || !id) return;
        
        try {
            if (action === 'delete') {
                if(confirm('確定要刪除這張卡片嗎？')) {
                    const isWinTab = document.getElementById('tab-wins').style.background.includes('rgb(255, 215, 0)'); 
                    const isBadTab = document.getElementById('tab-bad').style.background.includes('var(--bad-light)');
                    
                    if (isWinTab) {
                        const winDoc = await getDoc(doc(db, 'pk_wins', id));
                        if (winDoc.exists()) {
                            const data = winDoc.data();
                            if (data.originalBadId) {
                                const badRef = doc(db, 'bad_things', data.originalBadId);
                                await updateDoc(badRef, {
                                    isDefeated: false,
                                    lastWinId: null,
                                    updatedAt: serverTimestamp()
                                });
                            }
                        }
                        await deleteDoc(doc(db, 'pk_wins', id));
                    } else {
                        const collectionName = isBadTab ? 'bad_things' : 'good_things';
                        await deleteDoc(doc(db, collectionName, id));
                    }
                    
                    btn.closest('.card-item').remove();
                }
            } else if (action === 'edit') {
                const isGoodTab = document.getElementById('tab-good').style.background.includes('var(--good-light)');
                const collectionName = isGoodTab ? 'good_things' : 'bad_things';
                
                const docSnap = await getDoc(doc(db, collectionName, id));
                if (docSnap.exists()) {
                    openEditor(isGoodTab ? 'good' : 'bad', { id: docSnap.id, ...docSnap.data() });
                }
            } else if (action === 'defeat') {
                document.getElementById('warehouse-modal').classList.add('hidden');
                
                if (winId) {
                    const winSnap = await getDoc(doc(db, 'pk_wins', winId));
                    if (winSnap.exists()) {
                        startPK({ id: winSnap.id, ...winSnap.data() }, 'pk_wins');
                        return;
                    }
                }
                
                const docSnap = await getDoc(doc(db, 'bad_things', id));
                if (docSnap.exists()) {
                    startPK({ id: docSnap.id, ...docSnap.data() }, 'bad_things');
                }

            } else if (action === 'review') {
                const docSnap = await getDoc(doc(db, 'pk_wins', id));
                if (docSnap.exists()) {
                    document.getElementById('warehouse-modal').classList.add('hidden');
                    const winData = { id: docSnap.id, ...docSnap.data() };
                    startPK(winData, 'pk_wins');
                }
            }
        } catch(err) {
            console.error("Action Error", err);
            showSystemMessage("操作失敗：" + err.message);
        }
    });
}

// 建立倉庫 HTML
createWarehouseHTML();

// 綁定主畫面的倉庫按鈕
const btnOpenWarehouse = document.getElementById('btn-open-warehouse');
if(btnOpenWarehouse) {
    btnOpenWarehouse.addEventListener('click', () => {
        if (!screens.warehouse) screens.warehouse = document.getElementById('warehouse-modal'); 
        screens.warehouse.classList.remove('hidden');
        loadWarehouseData('good'); 
    });
}

// 載入倉庫資料 (支援三大類 & 前端混合排序)
async function loadWarehouseData(type) {
    const listEl = document.getElementById('warehouse-list');
    const tabWins = document.getElementById('tab-wins');
    const tabGood = document.getElementById('tab-good');
    const tabBad = document.getElementById('tab-bad');
    
    // 更新篩選按鈕樣式
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const score = parseInt(btn.dataset.score);
        if (score === currentWarehouseScoreFilter) {
            btn.style.background = '#333';
            btn.style.color = '#FFF';
        } else {
            btn.style.background = '#FFF';
            btn.style.color = '#666';
        }
    });

    listEl.innerHTML = '<div style="text-align:center; color:#999; margin-top:50px;">讀取中...</div>';

    // 重置所有 Tab 樣式
    if(tabWins && tabGood && tabBad) {
        [tabWins, tabGood, tabBad].forEach(btn => {
            btn.style.background = '#EEE'; btn.style.color = '#999'; btn.style.border = 'none';
        });
    }

    let collectionName = '';
    let emptyMsg = '';

    if (type === 'wins') {
        if(tabWins) { tabWins.style.background = '#FFF9C4'; tabWins.style.color = '#FBC02D'; tabWins.style.border = '1px solid #FBC02D'; } 
        collectionName = 'pk_wins';
        emptyMsg = '還沒有勝利紀錄喔！<br>快去 PK 幾場吧！';
    } else if (type === 'good') {
        if(tabGood) { tabGood.style.background = 'var(--good-light)'; tabGood.style.color = 'var(--good-icon)'; }
        collectionName = 'good_things';
        emptyMsg = '好事庫空空的。<br>記得多記錄生活中的微光！';
    } else {
        if(tabBad) { tabBad.style.background = 'var(--bad-light)'; tabBad.style.color = 'var(--bad-icon)'; }
        collectionName = 'bad_things';
        emptyMsg = '太棒了！<br>目前沒有待處理的鳥事。';
    }

    try {
        // [策略修正] 
        // 1. 資料庫查詢：使用 createdAt (建立時間) 抓取，確保所有資料（含舊資料與勝利紀錄）都能被抓到，不會消失。
        const q = query(collection(db, collectionName), orderBy("createdAt", "desc"), limit(100));
        const querySnapshot = await getDocs(q);
        
        listEl.innerHTML = ''; 

        if (querySnapshot.empty) {
            listEl.innerHTML = `<div style="text-align:center; color:#CCC; margin-top:50px; line-height:1.6;">${emptyMsg}</div>`;
            return;
        }

        // [策略修正]
        // 2. 前端排序：將抓下來的資料轉為陣列，依照 updatedAt (若有) 優先排序，沒有則用 createdAt。
        // 這樣可以實現「後修改的放上面」，同時不漏掉任何資料。
        let docs = [];
        querySnapshot.forEach(doc => docs.push(doc));

        docs.sort((a, b) => {
            const dataA = a.data();
            const dataB = b.data();
            // 取得時間戳 (毫秒)，優先用 updatedAt，沒有則用 createdAt
            const timeA = dataA.updatedAt?.toMillis() || dataA.createdAt?.toMillis() || 0;
            const timeB = dataB.updatedAt?.toMillis() || dataB.createdAt?.toMillis() || 0;
            return timeB - timeA; // 降冪 (時間越新的數字越大，放前面)
        });

        let hasData = false;

        // [策略修正]
        // 3. 渲染迴圈：改用排序後的 docs 陣列
        docs.forEach((doc) => {
            const data = doc.data();
            const docId = doc.id;
            
            // 前端分數過濾邏輯
            const itemScore = data.score || 1;
            if (currentWarehouseScoreFilter > 0) {
                if (currentWarehouseScoreFilter === 5) {
                    if (itemScore < 5) return;
                } else {
                    if (itemScore !== currentWarehouseScoreFilter) return;
                }
            }
            hasData = true;

            const date = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : '剛剛';
            
            let cardBg = '#FFF';
            let iconColor = '#999';
            let labelText = '';
            let actionButtonsHTML = '';
            let displayTitle = data.title;
            let displayContent = data.content;
            
            const iconEdit = `<svg style="pointer-events:none; width:20px; height:20px; fill:none; stroke:#888; stroke-width:2;" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
            const iconTrash = `<svg style="pointer-events:none; width:20px; height:20px; fill:none; stroke:#888; stroke-width:2;" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
            
            const btnStyle = `width:44px; height:44px; border-radius:50%; border:1px solid #EEE; background:#FFF; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0;`;

            if (type === 'good') { 
                iconColor = 'var(--good-icon)'; 
                labelText = `等級: ${data.score || 1}`;
                
                actionButtonsHTML = `
                    <div style="display:flex; gap:8px; margin-top:10px; border-top:1px solid #F0F0F0; padding-top:10px; justify-content:flex-end;">
                        <button data-action="edit" data-id="${docId}" style="${btnStyle}" title="編輯">${iconEdit}</button>
                        <button data-action="delete" data-id="${docId}" style="${btnStyle}" title="刪除">${iconTrash}</button>
                    </div>
                `;
            }
            else if (type === 'bad') { 
                iconColor = 'var(--bad-icon)'; 
                labelText = `等級: ${data.score || 1}`;
                
                let btnDefeatText = "擊敗它";
                let btnDefeatColor = "var(--primary)";
                let extraTitle = "";
                let winIdAttr = ""; 
                
                if (data.isDefeated) {
                    btnDefeatText = "再擊敗";
                    btnDefeatColor = "#FF9800"; 
                    extraTitle = `<span style="font-size:12px; color:#4CAF50; margin-left:5px;">(已被擊敗)</span>`;
                    displayTitle = displayTitle + extraTitle;
                    winIdAttr = data.lastWinId || ""; 
                }

                const defeatBtnStyle = `height:40px; padding:0 20px; border-radius:20px; border:none; cursor:pointer; font-weight:bold; font-size:14px; color:#FFF; background:${btnDefeatColor};`;

                actionButtonsHTML = `
                    <div style="display:flex; gap:8px; margin-top:10px; border-top:1px solid #F0F0F0; padding-top:10px; justify-content:flex-end; align-items:center;">
                        <button data-action="defeat" data-id="${docId}" data-win-id="${winIdAttr}" style="${defeatBtnStyle}">${btnDefeatText}</button>
                        <button data-action="edit" data-id="${docId}" style="${btnStyle}" title="編輯">${iconEdit}</button>
                        <button data-action="delete" data-id="${docId}" style="${btnStyle}" title="刪除">${iconTrash}</button>
                    </div>
                `;
            }
            else { 
                iconColor = '#E0C060'; 
                labelText = ''; 
                displayTitle = `擊敗「${data.badTitle}」`;
                displayContent = `戰友：${data.goodTitle}`;

                actionButtonsHTML = `
                    <div style="display:flex; gap:8px; margin-top:10px; border-top:1px solid #F0F0F0; padding-top:10px; justify-content:flex-end;">
                        <button data-action="review" data-id="${docId}" style="height:40px; padding:0 20px; border-radius:20px; border:none; cursor:pointer; font-weight:bold; font-size:13px; background:#FFF9C4; color:#FBC02D;">回顧勝利</button>
                        <button data-action="delete" data-id="${docId}" style="${btnStyle}" title="刪除">${iconTrash}</button>
                    </div>
                `;
            }

            const cardHTML = `
                <div class="card-item" style="background: ${cardBg}; padding: 15px; border-radius: 12px; border: 1px solid #F0F0F0; box-shadow: 0 2px 5px rgba(0,0,0,0.03); display: flex; gap: 10px;">
                    <div style="width: 4px; background: ${iconColor}; border-radius: 2px;"></div>
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span style="font-weight: 700; color: var(--text-main); font-size: 15px;">${displayTitle}</span>
                            <span style="font-size: 12px; color: #BBB;">${date}</span>
                        </div>
                        <div style="font-size: 13px; color: #666; line-height: 1.4;">${displayContent}</div>
                        ${labelText ? `<div style="margin-top: 8px; font-size: 12px; color: ${iconColor}; font-weight: 700;">${labelText}</div>` : ''}
                        ${actionButtonsHTML}
                    </div>
                </div>
            `;
            listEl.insertAdjacentHTML('beforeend', cardHTML);
        });
        
        if (!hasData) {
            listEl.innerHTML = `<div style="text-align:center; color:#CCC; margin-top:50px; line-height:1.6;">沒有符合篩選條件的卡片</div>`;
        }

    } catch (e) {
        console.error("Load Error:", e);
        listEl.innerHTML = '<div style="text-align:center; color:red; margin-top:50px;">讀取失敗，請檢查網路</div>';
    }
}

// --- 9. PK 邏輯與積分系統 ---

async function handlePKResult(winner) {
    if (!currentUser) {
        showSystemMessage("請先登入才能紀錄 PK 結果！");
        return;
    }

    if (winner === 'bad') {
        // --- 使用者選了鳥事 ---
        addChatMessage('user', "還是覺得這件鳥事比較強... 😩");
        addChatMessage('system', "收到。價值鑑定師正在重新擬定策略...");

        try {
            const q = query(collection(db, "good_things"), orderBy("createdAt", "desc"), limit(30));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const candidates = querySnapshot.docs.filter(doc => doc.data().title !== currentPKContext.good?.title);
                
                if (candidates.length > 0) {
                    let newGood = await aiPickBestCard(currentPKContext.bad, candidates);
                    if (!newGood) {
                         const randomDoc = candidates[Math.floor(Math.random() * candidates.length)];
                         newGood = randomDoc.data();
                    }

                    currentPKContext.good = newGood;
                    
                    document.getElementById('pk-good-title').innerText = newGood.title;
                    document.getElementById('pk-good-content').innerText = newGood.content;
                    
                    // [修改] 提示指令優化
                    const prompt = `【系統指令：使用者判定鳥事勝出（鳥事太強）。系統已重新選出一張新的好事卡（如上數據）。請執行模式三：針對這張新卡片，給出全新的比較觀點，嘗試再次說服使用者。】`;
                    await callGeminiChat(prompt, true);
                } else {
                    addChatMessage('ai', "我翻遍了資料庫，暫時找不到其他好事了... 但請相信，這件鳥事終究會過去的！");
                }
            }
        } catch(e) {
            console.error("Fetch new good thing error:", e);
        }

    } else {
        // --- 使用者選了好事 (勝利！) ---
        addChatMessage('user', "好事贏了！這點鳥事不算什麼！ ✨");
        
        // [新增] 設定勝利狀態，鎖定卡片點擊
        currentPKContext.isVictory = true;
        const btnRePk = document.getElementById('btn-re-pk');
        if(btnRePk) btnRePk.style.display = 'flex'; // 顯示重來圖示

        // 1. 計算積分
        const scoreToAdd = currentPKContext.bad?.score || 1;
        const newTotal = await updateUserScore(scoreToAdd);
        const rankTitle = getRankTitle(newTotal);

        // 2. 寫入勝利紀錄
        try {
            // [修改] 檢查是否已經有勝利紀錄 ID (避免重複產生標題)
            if (currentPKContext.winId) {
                 const winRef = doc(db, "pk_wins", currentPKContext.winId);
                 await updateDoc(winRef, {
                    goodTitle: currentPKContext.good?.title || "未知好事",
                    goodContent: currentPKContext.good?.content || "", 
                    chatLogs: currentPKContext.chatLogs, // 更新對話紀錄
                    updatedAt: serverTimestamp()
                 });
                 console.log("勝利紀錄已更新！");
            } else {
                // 第一次勝利，建立新紀錄
                const winData = {
                    uid: currentUser.uid,
                    badTitle: currentPKContext.bad?.title || "未知鳥事",
                    badContent: currentPKContext.bad?.content || "", 
                    goodTitle: currentPKContext.good?.title || "未知好事",
                    goodContent: currentPKContext.good?.content || "", 
                    score: scoreToAdd,
                    chatLogs: currentPKContext.chatLogs,
                    originalBadId: currentPKContext.collection === 'bad_things' ? currentPKContext.docId : null,
                    createdAt: serverTimestamp()
                };
                
                const winRef = await addDoc(collection(db, "pk_wins"), winData);
                currentPKContext.winId = winRef.id; // 記住 ID，下次更新用

                // 更新原始鳥事狀態
                if (currentPKContext.collection === 'bad_things' && currentPKContext.docId) {
                    await updateDoc(doc(db, "bad_things", currentPKContext.docId), {
                        isDefeated: true,
                        lastWinId: winRef.id, 
                        updatedAt: serverTimestamp()
                    });
                }
                console.log("新勝利已記錄！");
            }

        } catch(e) {
            console.error("Save Win Error", e);
            showSystemMessage("勝利紀錄儲存失敗：" + e.message);
        }

        // 3. 顯示勝利訊息 & 觸發 AI 恭喜
        showSystemMessage(`🎉 PK 勝利！\n\n已存入勝利庫\n獲得積分：+${scoreToAdd}\n目前總分：${newTotal}\n當前稱號：${rankTitle}`);
        
        // [修改] 要求簡單的恭喜
        await callGeminiChat(`我贏了！我選擇了好事，成功擊敗了鳥事！請給我一句簡單的恭喜。`);
    }
}

// 更新使用者積分
async function updateUserScore(scoreToAdd) {
    if (!currentUser) return 0;
    
    const userRef = doc(db, "users", currentUser.uid);
    try {
        const userSnap = await getDoc(userRef);
        let currentScore = 0;
        
        if (userSnap.exists()) {
            currentScore = userSnap.data().totalScore || 0;
            await updateDoc(userRef, {
                totalScore: currentScore + scoreToAdd,
                lastActive: serverTimestamp()
            });
        } else {
            // 如果是第一次，建立新資料
            await setDoc(userRef, {
                email: currentUser.email,
                totalScore: scoreToAdd,
                createdAt: serverTimestamp(),
                lastActive: serverTimestamp()
            });
        }
        return currentScore + scoreToAdd;
    } catch (e) {
        console.error("Update score error:", e);
        return 0;
    }
}

// 取得稱號
function getRankTitle(score) {
    if (score <= 50) return "農夫實習生";
    if (score <= 100) return "狩獵冒險者";
    if (score <= 150) return "鎧甲傭兵";
    if (score <= 200) return "遊俠";
    if (score <= 250) return "騎士";
    if (score <= 300) return "大劍士";
    if (score <= 400) return "神聖騎士";
    if (score <= 500) return "巨龍獵人";
    return "神之守望者";
}

// --- 頁面導航系統 (History API) ---
// 統一管理上一頁行為，確保不會直接關閉 APP

function setupNavigation() {
    // 1. 初始化當前狀態為首頁
    history.replaceState({ tier: 'home' }, '', '');

    // 2. 監聽瀏覽器上一頁事件 (包含手機手勢)
    window.addEventListener('popstate', (e) => {
        const tier = e.state?.tier;
        
        // A. 先隱藏所有第 2、3 階視窗
        if(screens.editor) screens.editor.classList.add('hidden');
        if(screens.pk) screens.pk.classList.add('hidden');
        if(screens.warehouse) screens.warehouse.classList.add('hidden');
        
        const searchModal = document.getElementById('search-modal');
        if(searchModal) searchModal.classList.add('hidden');
        
        const settingsModal = document.getElementById('settings-modal');
        if(settingsModal) settingsModal.classList.add('hidden');

        // B. 根據 tier 顯示對應視窗
        if (!tier || tier === 'home') {
            // 回到首頁 (上面已經全部隱藏了，所以這裡不用做什麼)
        } 
        else if (tier === 'warehouse') {
            if(screens.warehouse) {
                screens.warehouse.classList.remove('hidden');
                // 回到倉庫時，重新整理目前的分頁資料 (確保資料同步)
                const currentTab = document.getElementById('tab-bad').style.background.includes('var(--bad-light)') ? 'bad' : 
                                   document.getElementById('tab-good').style.background.includes('var(--good-light)') ? 'good' : 'wins';
                loadWarehouseData(currentTab);
            }
        } 
        else if (tier === 'editor') {
            if(screens.editor) screens.editor.classList.remove('hidden');
        } 
        else if (tier === 'search') {
            if(searchModal) searchModal.classList.remove('hidden');
        } 
        else if (tier === 'settings') {
            if(settingsModal) settingsModal.classList.remove('hidden');
        } 
        else if (tier === 'pk') {
            if(screens.pk) screens.pk.classList.remove('hidden');
        }
    });
}

// 啟動導航監聽
setupNavigation();
