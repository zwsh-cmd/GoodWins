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

// --- 監控代碼：全域計數器 ---
window.apiCallCount = 0;    // API 實際發送次數
window.pkTriggerCount = 0;  // PK 畫面進入次數

// --- 4. 動態生成 UI (這就是妳要的：介面寫在 JS 裡) ---
function createEditorHTML() {
    if (document.getElementById('editor-modal')) return;

    // [修改] 下拉選單文字微調至 17px
    const selectStyle = `
        width:100%; 
        padding:12px 40px 12px 12px; 
        border:1px solid #EEE; 
        border-radius:12px; 
        background:#FAFAFA url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235A5A5A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e") no-repeat right 16px center; 
        background-size: 16px;
        font-size:17px; 
        color:var(--text-main); 
        outline:none; 
        -webkit-appearance: none; 
        appearance: none;
    `;

    // [修改] 1. placeholder 顏色改為 #E0E0E0 (更淺)
    // [修改] 2. select option 字體同步調整為 17px
    const editorHTML = `
    <div id="editor-modal" class="hidden" style="position: absolute; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.98); z-index:500; display: flex; flex-direction: column;">
        <div style="flex:1; display:flex; flex-direction:column; padding:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <button id="btn-cancel-edit" style="background:none; border:none; color:#999; font-size:16px; cursor:pointer;">取消</button>
                <h3 id="editor-title" style="margin:0; font-size:18px; font-weight:700; color:var(--text-main);">記錄好事</h3>
                <button id="btn-save-edit" style="background:none; border:none; color:var(--primary); font-weight:700; font-size:16px; cursor:pointer;">儲存</button>
            </div>

            <style>
                #input-title::placeholder, #input-content::placeholder { color: #E0E0E0; opacity: 1; }
                select option { font-size: 17px; }
            </style>

            <input id="input-title" type="text" placeholder="標題" autocomplete="off" name="gw-title-field" style="width:100%; padding:15px 0; border:none; border-bottom:1px solid #EEE; font-size:24px; font-weight:700; outline:none; background:transparent; color:#666; margin-bottom:10px;">
            
            <textarea id="input-content" placeholder="內容" name="gw-content-field" style="width:100%; flex:1; padding:15px 0; border:none; font-size:18px; outline:none; resize:none; background:transparent; line-height:1.6; color:#666;"></textarea>
            
            <div style="padding:10px 0; display:flex; justify-content:flex-end;">
                <button id="btn-start-pk" style="display:none; background:transparent; border:1px solid var(--primary); color:var(--primary); padding:6px 20px; border-radius:50px; font-weight:700; font-size:14px; cursor:pointer;">開始PK</button>
            </div>

            <div style="padding:10px 0 20px 0;">
                <div style="margin-bottom:15px;">
                    <label id="label-score" style="font-size:15px; color:#999; display:block; margin-bottom:8px; font-weight:bold;">好事等級</label>
                    <select id="input-score" style="${selectStyle}">
                        <option value="1">1分 - 微好事 (Micro)</option>
                        <option value="2">2分 - 小好事 (Small)</option>
                        <option value="3">3分 - 中好事 (Medium)</option>
                        <option value="4">4分 - 大好事 (Big)</option>
                        <option value="5">5分 - 神聖好事 (Divine)</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:15px; color:#999; display:block; margin-bottom:8px; font-weight:bold;">來源</label>
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
    // [修改] 1. 注入手機狀態列顏色 (與 APP 背景 #FAFAFA 一致)
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
        metaTheme = document.createElement('meta');
        metaTheme.name = "theme-color";
        document.head.appendChild(metaTheme);
    }
    metaTheme.content = "#FAFAFA";

    // [新增] 2. 注入全域 CSS 禁止下拉重新整理與回彈 (Overscroll Fix)
    // 這能解決手機下拉時出現的灰色背景或重新整理圖示
    const globalStyle = document.createElement('style');
    globalStyle.innerHTML = `
        html, body {
            overscroll-behavior-y: none; /* 禁止下拉重整行為 */
            background-color: #FAFAFA;   /* 確保背景色一致 */
        }
    `;
    document.head.appendChild(globalStyle);

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
                    <button id="btn-confirm-ok" style="flex:1; background: var(--primary); color: white; border: none; padding: 12px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer;">確定</button>
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

// [新增] 顯示確認視窗，支援自訂按鈕文字
function showConfirmMessage(msg, okText = "確定", cancelText = "取消") {
    return new Promise((resolve) => {
        const confirmEl = document.getElementById('system-confirm');
        const msgEl = document.getElementById('confirm-msg');
        const btnOk = document.getElementById('btn-confirm-ok');
        const btnCancel = document.getElementById('btn-confirm-cancel');

        if(!confirmEl) { resolve(confirm(msg)); return; }

        msgEl.innerText = msg;
        btnOk.innerText = okText;         
        btnCancel.innerText = cancelText; 
        
        // 若為刪除操作，按鈕改紅色以示警示
        if(okText.includes("刪除")) {
            btnOk.style.background = "#FF5252";
        } else {
            btnOk.style.background = "var(--primary)";
        }

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

    // [修改] 4. chat-input 字體改為 13px (稍微縮小)
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
                    <div id="pk-bad-header" style="color: var(--bad-icon); font-size: 13px; font-weight: 700;">鳥事</div>
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
                     <div id="pk-good-header" style="color: var(--good-icon); font-size: 13px; font-weight: 700;">好事</div>
                     <div style="flex: 1; padding-bottom:15px;">
                        <h3 id="pk-good-title" style="margin: 0 0 6px 0; font-size: 16px; color: var(--text-main); line-height: 1.4; text-align: left;">(標題)</h3>
                        <p id="pk-good-content" style="margin: 0; font-size: 13px; color: var(--text-main); opacity: 0.8; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-align: left;">(內容...)</p>
                    </div>
                    <div class="expand-arrow" style="text-align:center; color:var(--good-icon); opacity:0.6; padding:8px 0; font-size:10px; background:rgba(0,0,0,0.05); margin: 0 -20px; width: calc(100% + 40px);">▼</div>
                </div>
            </div>

            <div style="flex: 1; background: #FFF; border-radius: 20px; box-shadow: var(--shadow); display: flex; flex-direction: column; overflow: hidden; border: 1px solid rgba(0,0,0,0.02); position: relative;">
                <div id="chat-history" style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 15px;"></div>
                
                <div id="pk-floating-area" style="position: absolute; bottom: 75px; left: 0; width: 100%; display: flex; flex-direction: column; align-items: center; pointer-events: none; z-index: 20;"></div>

                <div style="padding: 15px; border-top: 1px solid #F0F0F0; display: flex; gap: 10px; background: #FFF;">
                    <input id="chat-input" type="text" placeholder="跟 AI 討論..." style="flex: 1; padding: 12px 15px; border: 1px solid #EEE; border-radius: 25px; outline: none; background: #FAFAFA; color: var(--text-main); font-size: 13px;">
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
                const confirmed = await showConfirmMessage("確定要重新發起 PK 挑戰嗎？（將扣除原本贏得的分數）", "重新開啟戰場", "取消");
                if(confirmed) {
                    // 1. 扣除之前贏的分數
                    if(currentPKContext.pointsToDeduct > 0) {
                        await updateUserScore(-currentPKContext.pointsToDeduct);
                        currentPKContext.pointsToDeduct = 0; 
                    }

                    // 2. 切換身分證與重置狀態
                    if (currentPKContext.collection === 'pk_wins' && currentPKContext.originalBadId) {
                        currentPKContext.collection = 'bad_things';
                        currentPKContext.docId = currentPKContext.originalBadId;
                    }
                    currentPKContext.wasDefeated = true; 
                    currentPKContext.isVictory = false; 
                    btnRePK.style.display = 'none'; 

                    // 3. 清空對話 UI 與好事區文字
                    const chatHistory = document.getElementById('chat-history');
                    chatHistory.innerHTML = '';
                    document.getElementById('pk-good-title').innerText = "準備開戰...";
                    document.getElementById('pk-good-content').innerText = "請召喚好事卡來破解這件鳥事。";
                    currentPKContext.shownGoodCardIds = [];

                    // 4. 插入浮動手動按鈕
                    const floatArea = document.getElementById('pk-floating-area');
                    floatArea.innerHTML = '';
                    const btnStyle = "display:block; margin:5px auto; padding:10px 24px; background:var(--primary); color:#FFF; border:none; border-radius:50px; font-weight:bold; font-size:14px; cursor:pointer; box-shadow:0 4px 15px rgba(0,0,0,0.2); pointer-events: auto;";
                    
                    const btnDraw = document.createElement('button');
                    btnDraw.innerText = "抽好事卡";
                    btnDraw.style.cssText = btnStyle;

                    btnDraw.onclick = async () => {
                        btnDraw.disabled = true;
                        btnDraw.innerText = "挑選中...";
                        try {
                            const q = query(collection(db, "good_things"), orderBy("createdAt", "desc"), limit(1000));
                            const querySnapshot = await getDocs(q);
                            if (!querySnapshot.empty) {
                                const newGood = await aiPickBestCard(currentPKContext.bad, querySnapshot.docs, currentPKContext.shownGoodCardIds);
                                if (!newGood || newGood === "AI_FAILED") {
                                    btnDraw.innerText = "請重試";
                                    btnDraw.disabled = false;
                                    return;
                                }
                                if (newGood.id) currentPKContext.shownGoodCardIds.push(newGood.id);
                                currentPKContext.good = newGood;
                                document.getElementById('pk-good-title').innerText = newGood.title;
                                document.getElementById('pk-good-content').innerText = newGood.content;
                                document.getElementById('pk-good-header').innerText = `好事 (Lv.${newGood.score || 1})`;
                                btnDraw.remove();

                                const btnChat = document.createElement('button');
                                btnChat.innerText = "請說服我";
                                btnChat.style.cssText = btnStyle;
                                btnChat.onclick = async () => {
                                    btnChat.disabled = true;
                                    btnChat.innerText = "思考中...";
                                    await addChatMessage('system', "────── 重新開始戰局 ──────", true);
                                    await callGeminiChat(`【系統指令：忽略舊結果。新好事卡為（${newGood.title}）。請開始價值辯論。】`, true);
                                    btnChat.remove();
                                };
                                floatArea.appendChild(btnChat);
                            }
                        } catch (e) { btnDraw.disabled = false; btnDraw.innerText = "失敗，請重試"; }
                    };
                    floatArea.appendChild(btnDraw);
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

    // 定義 Icon SVG (與倉庫風格一致)
    const iconEdit = `<svg style="pointer-events:none; width:16px; height:16px; fill:none; stroke:#888; stroke-width:2;" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
    const iconReview = `<svg style="pointer-events:none; width:16px; height:16px; fill:none; stroke:#FBC02D; stroke-width:2;" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;

    // [修改] 移除輸入框 placeholder
    const searchHTML = `
    <div id="search-modal" class="hidden" style="position: absolute; top:0; left:0; width:100%; height:100%; background:#FAFAFA; z-index:400; display: flex; flex-direction: column;">
        <header style="padding: 15px 20px; display: flex; gap: 10px; align-items: center; background: #FFF; border-bottom: 1px solid #EEE;">
            <div style="position:relative; flex:1;">
                <input id="input-search-keyword" type="text" autocomplete="off" style="width:100%; padding:10px 10px 10px 36px; border:1px solid #EEE; border-radius:20px; background:#F5F5F5; font-size:14px; outline:none;">
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

    document.getElementById('btn-close-search').addEventListener('click', () => {
        history.back();
    });

    const input = document.getElementById('input-search-keyword');
    const resultList = document.getElementById('search-results-list');
    let searchTimeout;

    input.addEventListener('input', (e) => {
        const keyword = input.value.trim().toLowerCase();
        
        clearTimeout(searchTimeout);

        if (!keyword) {
            resultList.innerHTML = '<div style="text-align:center; color:#CCC; margin-top:50px; font-size:13px;">輸入關鍵字開始搜尋...</div>';
            return;
        }

        searchTimeout = setTimeout(async () => {
            resultList.innerHTML = '<div style="text-align:center; color:#999; margin-top:20px;">搜尋中...</div>';
            
            try {
                const p1 = getDocs(query(collection(db, "bad_things"), orderBy("createdAt", "desc"), limit(30)));
                const p2 = getDocs(query(collection(db, "good_things"), orderBy("createdAt", "desc"), limit(30)));
                const p3 = getDocs(query(collection(db, "pk_wins"), orderBy("createdAt", "desc"), limit(30)));
                
                const [badSnap, goodSnap, winSnap] = await Promise.all([p1, p2, p3]);

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
                winSnap.forEach(doc => {
                    const d = doc.data();
                    if (d.badTitle.toLowerCase().includes(keyword) || d.goodTitle.toLowerCase().includes(keyword)) {
                        results.push({ id: doc.id, ...d, type: 'wins' });
                    }
                });

                if (results.length === 0) {
                    resultList.innerHTML = '<div style="text-align:center; color:#999; margin-top:50px;">找不到相關結果</div>';
                    return;
                }

                resultList.innerHTML = '';
                results.forEach(item => {
                    let color = '#999';
                    let typeLabel = '';
                    let actionBtnHTML = '';
                    let title = item.title;
                    let content = item.content;
                    const btnStyle = `width:28px; height:28px; border-radius:50%; border:1px solid #EEE; background:#FFF; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0;`;

                    if (item.type === 'bad') {
                        color = 'var(--bad-icon)';
                        typeLabel = '鳥事';
                        title = item.title;
                        content = item.content;
                        // [修改] 改用圖示按鈕 (修改)
                        actionBtnHTML = `<button class="btn-search-action" data-action="edit" data-id="${item.id}" data-type="${item.type}" style="${btnStyle}" title="修改">${iconEdit}</button>`;
                    } else if (item.type === 'good') {
                        color = 'var(--good-icon)';
                        typeLabel = '好事';
                        title = item.title;
                        content = item.content;
                        // [修改] 改用圖示按鈕 (修改)
                        actionBtnHTML = `<button class="btn-search-action" data-action="edit" data-id="${item.id}" data-type="${item.type}" style="${btnStyle}" title="修改">${iconEdit}</button>`;
                    } else if (item.type === 'wins') {
                        color = '#E0C060';
                        typeLabel = 'PK勝利';
                        title = `擊敗「${item.badTitle}」`;
                        content = `戰友：${item.goodTitle}`;
                        // [修改] 改用圖示按鈕 (回顧)
                        actionBtnHTML = `<button class="btn-search-action" data-action="review" data-id="${item.id}" style="${btnStyle}" title="回顧勝利">${iconReview}</button>`;
                    }

                    const html = `
                        <div class="search-item" style="background:#FFF; padding:15px; border-radius:12px; border:1px solid #F0F0F0; border-left:4px solid ${color}; display:flex; align-items:center; gap:10px;">
                            <div style="flex:1; overflow:hidden;">
                                <div style="font-size:10px; color:${color}; font-weight:bold; margin-bottom:2px;">${typeLabel}</div>
                                <div style="font-weight:bold; color:#333; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${title}</div>
                                <div style="font-size:12px; color:#999; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden;">${content}</div>
                            </div>
                            <div>${actionBtnHTML}</div>
                        </div>
                    `;
                    resultList.insertAdjacentHTML('beforeend', html);
                });

            } catch(err) {
                console.error(err);
                resultList.innerHTML = `<div style="text-align:center; color:red;">搜尋錯誤: ${err.message}</div>`;
            }
        }, 500);
    });

    resultList.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-search-action');
        if (!btn) return;

        const action = btn.dataset.action;
        const id = btn.dataset.id;
        const type = btn.dataset.type;

        if (action === 'edit') {
            const collectionName = type === 'good' ? 'good_things' : 'bad_things';
            try {
                const docSnap = await getDoc(doc(db, collectionName, id));
                if (docSnap.exists()) {
                    openEditor(type, { id: docSnap.id, ...docSnap.data() });
                }
            } catch(e) { console.error(e); }
        } else if (action === 'review') {
            try {
                const docSnap = await getDoc(doc(db, 'pk_wins', id));
                if (docSnap.exists()) {
                    document.getElementById('search-modal').classList.add('hidden'); 
                    startPK({ id: docSnap.id, ...docSnap.data() }, 'pk_wins');
                }
            } catch(e) { console.error(e); }
        }
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
        
        const performExit = async () => {
            if (currentAbortController) {
                currentAbortController.abort();
                currentAbortController = null;
            }
            history.back(); 
        };

        // 1. 如果已經勝利：直接離開
        if (currentPKContext.isVictory) {
            await performExit();
            return;
        }

        // 2. 失敗/中途離開邏輯 (涵蓋 Re-PK 失敗)
        let promptMsg = "PK尚未完成，確定離開？";
        
        // 如果是「再擊敗」狀態下離開，視為失敗，需要重置
        if (currentPKContext.wasDefeated) {
            promptMsg = "再度PK尚未完成，離開將視為挑戰失敗（鳥事回歸），確定離開？";
        }

        const confirmExit = await showConfirmMessage(promptMsg, "確定離開", "取消");
        if (!confirmExit) return; 

        try {
            // 如果是 Re-PK 失敗，必須刪除勝利紀錄並重置鳥事卡
            if (currentPKContext.wasDefeated && currentPKContext.docId) {
                
                // 重置鳥事卡 (變回紅色)
                const docRef = doc(db, 'bad_things', currentPKContext.docId);
                await updateDoc(docRef, {
                    isDefeated: false,
                    lastWinId: null,
                    updatedAt: serverTimestamp(),
                    chatLogs: currentPKContext.chatLogs // 保留對話
                });

                // 如果有對應的勝利紀錄 (lastWinId 或 winId)，刪除它
                if (currentPKContext.winId) {
                    await deleteDoc(doc(db, 'pk_wins', currentPKContext.winId));
                }
                
                showSystemMessage("挑戰未完成，鳥事已回歸待擊敗狀態。");
            } 
            else if (currentPKContext.collection === 'bad_things' && currentPKContext.docId) {
                // 一般 PK 中途離開，只更新對話與時間
                const docRef = doc(db, 'bad_things', currentPKContext.docId);
                await updateDoc(docRef, {
                    updatedAt: serverTimestamp(),
                    chatLogs: currentPKContext.chatLogs
                });
            }
        } catch (e) { console.error(e); }

        await performExit();
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

// [修正] AI 智慧選牌模組：嚴格「小於等於」起手 + 湊滿10張 + 創意切入 + 無保底
async function aiPickBestCard(badData, candidateDocs, excludeList = []) {
    const apiKey = sessionStorage.getItem('gemini_key');
    if (!apiKey || candidateDocs.length === 0) return null;

    // 1. 轉陣列
    const excludes = Array.isArray(excludeList) ? excludeList : (excludeList ? [excludeList] : []);

    // 2. 嚴格過濾：同時檢查 ID 與 Title (只排除傳入的黑名單)
    const availableDocs = candidateDocs.filter(doc => {
        const data = doc.data();
        const isExcludedById = excludes.includes(doc.id);
        // 如果有傳入 Title 排除需求才檢查，預設主要依賴 ID
        const isExcludedByTitle = excludes.includes(data.title);
        return !isExcludedById && !isExcludedByTitle;
    });

    if (availableDocs.length === 0) return null;

    // 3. 全量餵食 + 強制排序 (Lv.1 -> Lv.5)
    // 讓 AI 依照 Prompt 指令從低分開始掃描
    availableDocs.sort((a, b) => {
        const scoreA = parseInt(a.data().score) || 1;
        const scoreB = parseInt(b.data().score) || 1;
        return scoreA - scoreB;
    });

    const finalCandidates = availableDocs; // 不切片，全給

    // 製作給 AI 看的清單
    const aiInputCandidates = finalCandidates.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        score: doc.data().score || 1,
        content: (doc.data().content || "").substring(0, 100) // 內容稍微給多一點讓 AI 判斷創意
    }));

    const selectionPrompt = `
    任務：你是「GoodWins」APP 的後台決策大腦。請從下列【候選好事卡清單】中，挑選唯一一張最能破解【眼前鳥事】的卡片。

    【眼前鳥事】
    標題：${badData.title}
    內容：${badData.content}
    等級(Score)：${badData.score || 1}

    【候選好事卡清單】
    (注意：此清單已嚴格依照「好事等級」由低到高 (Lv.1 -> Lv.5) 排序。)
    ${JSON.stringify(aiInputCandidates)}

    【選牌最高指導原則】
    1. **絕對不重複**：清單中已經完全移除了本局對話出現過的所有卡片。(系統自動過濾)
    2. **優先策略 - 以柔克剛 (Strict Scanning)**：
       - 請務必從清單的**第一張 (低分卡)** 開始往下逐一檢視。
       - 問自己：「這張微小的好事，在邏輯或情感上能否抵銷這件鳥事？」
       - 若答案為 **YES**，請**立即選定**該卡片。(我們希望能用最小的代價贏得勝利)
       - 若為 NO，才繼續檢查下一張。
    3. **必要策略 - 創意切入 (Creative Fallback)**：
       - **如果掃描完整份清單，沒有任何一張能「正面擊倒」鳥事，請不要放棄。**
       - 請重新檢視清單，發揮你的聯想力，挑選一張最有可能透過**「幽默感」、「反諷」或「意想不到的哲學角度」**來翻轉局勢的卡片。
       - 告訴自己：**沒有無用的好事，只有沒被發現的連結。** 請務必選出一張。

    【輸出規定】
    請「只回傳」該卡片的 ID (純字串)，不要有任何解釋、標點符號、Markdown 或額外文字。
    `;

    const modelList = await getSortedModelList(apiKey);
    
    for (const model of modelList) {
        try {
            // --- 監控：紀錄選牌 API 發送 ---
            window.apiCallCount++;
            console.warn(`[監控] 準備發送 API (選牌)！目前累積發送 ${window.apiCallCount} 次`);

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
            
            if (data.error) throw new Error(data.error.message);

            const selectedId = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (selectedId) {
                const bestDoc = finalCandidates.find(doc => doc.id === selectedId);
                return bestDoc ? { id: bestDoc.id, ...bestDoc.data() } : null;
            }
        } catch (e) {
            console.warn(`[選牌] 模型 ${model.id} 失敗，嘗試下一個...`, e.message);
        }
    }

    console.warn("AI 選牌全數失敗");
    showSystemMessage("目前找不到適合的AI模型，請稍後再試一次。");
    return "AI_FAILED"; 
}

async function startPK(data, collectionSource, options = {}) {
    // --- 監控：紀錄進入 PK 擂台 ---
    window.pkTriggerCount++;
    console.warn(`[監控] startPK 被觸發！目前進入第 ${window.pkTriggerCount} 次`);

    history.pushState({ tier: 'pk' }, '', '');
    screens.pk.classList.remove('hidden');
    const chatHistory = document.getElementById('chat-history');
    chatHistory.innerHTML = ''; 

    const btnRePk = document.getElementById('btn-re-pk');

    // [核心修正] winId 初始化邏輯：
    // 如果是從「再擊敗」進來 (collectionSource 是 bad_things)，但 options 裡有 associatedWinId，
    // 我們就使用那個 ID。這樣在 btnExitPK 的刪除邏輯中，就能抓到這張該刪的勝利卡。
    // [核心修正] 初始化 PK 上下文，加入 shownGoodCardIds 用於同場對話不重複
    currentPKContext = {
        docId: data.id,
        collection: collectionSource,
        winId: options.associatedWinId || (collectionSource === 'pk_wins' ? data.id : null),
        originalBadId: data.originalBadId || null,
        wasDefeated: options.isReDefeat || data.isDefeated || false, 
        bad: null,
        good: null,
        chatLogs: data.chatLogs || [],
        isVictory: false,
        pointsToDeduct: (collectionSource === 'pk_wins' ? (data.score || 0) : 0),
        shownGoodCardIds: [], // [新增] 紀錄本場對話出現過的好事卡 ID
        excludeTitles: []     // [新增] 紀錄歷史勝利的好事卡標題
    };

    if (collectionSource === 'pk_wins') {
        // --- 勝利回顧模式 (純瀏覽，不觸發 AI) ---
        currentPKContext.isVictory = true; 
        if(btnRePk) btnRePk.style.display = 'flex';
        
        document.getElementById('pk-bad-title').innerText = data.badTitle;
        document.getElementById('pk-bad-content').innerText = data.badContent || "(已克服的鳥事)";
        // [新增] 顯示等級 (若舊資料無 score 則預設 1)
        document.getElementById('pk-bad-header').innerText = `鳥事 (Lv.${data.badScore || 1})`;

        document.getElementById('pk-good-title').innerText = data.goodTitle;
        document.getElementById('pk-good-content').innerText = data.goodContent || "(獲勝的好事)";
        document.getElementById('pk-good-header').innerText = `好事 (Lv.${data.goodScore || 1})`;
        
        currentPKContext.bad = { title: data.badTitle, content: data.badContent };
        currentPKContext.good = { title: data.goodTitle, content: data.goodContent };

        if (currentPKContext.chatLogs.length > 0) {
            currentPKContext.chatLogs.forEach(log => addChatMessage(log.role, log.text, false, log.modelName));
        } else {
            addChatMessage('system', "此紀錄沒有對話存檔。", true);
        }
        
    } else {
        // --- 進行中的 PK (戰鬥模式) ---
        if(btnRePk) btnRePk.style.display = 'none';

        document.getElementById('pk-bad-title').innerText = data.title;
        document.getElementById('pk-bad-content').innerText = data.content;
        // [新增] 顯示鳥事等級
        document.getElementById('pk-bad-header').innerText = `鳥事 (Lv.${data.score || 1})`;
        currentPKContext.bad = data;

        // 渲染歷史對話
        if (currentPKContext.chatLogs.length > 0) {
            currentPKContext.chatLogs.forEach(log => addChatMessage(log.role, log.text, false, log.modelName));
        }

        // [核心修正] 只要進入戰鬥模式，無論是全新還是有舊紀錄，都觸發「選牌 + 開場」
        // 若有舊紀錄，則視為「重新開始戰局」
        
        // [手動 PK 流程] 使用浮動按鈕容器
        document.getElementById('pk-good-title').innerText = "準備開戰...";
        document.getElementById('pk-good-content').innerText = "請召喚好事卡來破解這件鳥事。";

        const floatArea = document.getElementById('pk-floating-area');
        floatArea.innerHTML = ''; // 清空

        const btnStyle = "display:block; margin:5px auto; padding:10px 24px; background:var(--primary); color:#FFF; border:none; border-radius:50px; font-weight:bold; font-size:14px; cursor:pointer; box-shadow:0 4px 15px rgba(0,0,0,0.2); pointer-events: auto;";

        const btnDraw = document.createElement('button');
        btnDraw.innerText = "抽好事卡";
        btnDraw.style.cssText = btnStyle;

        btnDraw.onclick = async () => {
            btnDraw.disabled = true;
            btnDraw.innerText = "挑選中...";
            try {
                const querySnapshot = await getDocs(query(collection(db, "good_things"), orderBy("createdAt", "desc"), limit(1000)));
                if (!querySnapshot.empty) {
                    const selectedGoodThing = await aiPickBestCard(currentPKContext.bad, querySnapshot.docs, currentPKContext.shownGoodCardIds);
                    if (!selectedGoodThing || selectedGoodThing === "AI_FAILED") {
                        btnDraw.innerText = "請稍候重試";
                        btnDraw.disabled = false;
                        return;
                    }
                    if (selectedGoodThing.id) currentPKContext.shownGoodCardIds.push(selectedGoodThing.id);
                    currentPKContext.good = selectedGoodThing;
                    document.getElementById('pk-good-title').innerText = selectedGoodThing.title;
                    document.getElementById('pk-good-content').innerText = selectedGoodThing.content;
                    document.getElementById('pk-good-header').innerText = `好事 (Lv.${selectedGoodThing.score || 1})`;
                    btnDraw.remove();

                    const btnChat = document.createElement('button');
                    btnChat.innerText = "請說服我";
                    btnChat.style.cssText = btnStyle;
                    btnChat.onclick = async () => {
                        btnChat.disabled = true;
                        btnChat.innerText = "思考中...";
                        if (currentPKContext.chatLogs.length > 0) {
                            await addChatMessage('system', "────── 重新開始戰局 ──────", true);
                            await callGeminiChat(`【系統指令：忽略舊結果。新好事卡為（${selectedGoodThing.title}）。請開始價值辯論。】`, true);
                        } else {
                            await callGeminiChat("【系統指令：PK 開始。策略選牌完成，進行價值辯論。】", true);
                        }
                        btnChat.remove();
                    };
                    floatArea.appendChild(btnChat);
                }
            } catch (e) { btnDraw.disabled = false; btnDraw.innerText = "連線失敗，請重試"; }
        };
        floatArea.appendChild(btnDraw);
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
async function getSortedModelList(apiKey) {
    // [修正] 根據監控紀錄，自動取得模型清單會包含大量 Limit: 0 的地雷模型。
    // 現在改為鎖定 2.5 與 1.5 系列中，免費用戶確定有額度的穩定模型，避免瞬間連發 API 造成 429。
    console.log("系統設定：鎖定 2.5 與 1.5 穩定版路徑");
    
    return [
        { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
        { id: 'gemini-2.5-flash-lite', displayName: 'Gemini 2.5 Flash-Lite' },
        { id: 'gemini-1.5-flash-latest', displayName: 'Gemini 1.5 Flash (最穩定)' }
    ];
}

// isHidden 參數用來發送「系統指令」給 AI，但不顯示在聊天室窗中
async function callGeminiChat(userMessage, isHidden = false) {
    const apiKey = sessionStorage.getItem('gemini_key');
    if (!apiKey) {
        addChatMessage('system', "請先點擊設定輸入 API Key。", true);
        return;
    }

    if (currentAbortController) currentAbortController.abort(); 
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
【角色設定】
你是「GoodWins」的價值鑑定師。你具備專業的洞察力，但語氣溫暖、平易近人，像是一個**理性又懂你的好朋友**。
你的任務不是為了搞笑，也不是為了說教，而是透過「比較」與「證據」，協助使用者在混亂的鳥事中，重新看見好事的價值。

【當前戰況數據】
* 對方丟出的鳥事（Bad Card）：
${badText}
* 你出的好事卡（Good Card）：
${goodText}

【核心任務流程】 請依照當下的對話狀態，嚴格執行以下三種模式之一：

模式一：PK 開局（當收到新的「鳥事」或需要「重抽」時啟動）
	1. **溫和同理**：先接住使用者的情緒，承認那件鳥事確實令人困擾（例如：「這聽起來真的很煩」、「遇到這種事誰都會傻眼」）。
	2. **理性翻轉（關鍵）**：提出這張「好事卡」作為反證。
	   - **焦點轉移**：不要硬說「善行是普遍的」，而是強調「這件善行是真實存在的」。
	   - **價值對比**：解釋為什麼這件好事的「質感」或「對心靈的滋養」，足以抵銷或平衡那件鳥事的消耗。
	   - **以柔克剛**：如果好事卡等級較低，請強調為什麼這張好事卡實際價值高於鳥事卡。

模式二：自然對話（當使用者回應後啟動）
	1. **延續討論**：針對使用者的反饋進行理性的交流。
	2. **保持專業與溫度**：不要太油條，也不要太嚴肅。就像在咖啡廳跟朋友分析問題一樣。

模式三：承認戰敗並重來（當使用者判定「鳥事勝出」時啟動）
	1. **坦然接受**：承認這件鳥事確實影響力很大，不要硬拗。
	2. **再戰一局**：針對新選出的好事卡，嘗試用不同的邏輯切入（例如：從「情感面」轉為「利益面」，或從「瞬間」轉為「永恆」）。

【語氣與用語規範】
❌ **禁止**：
   - 禁止過度說教（如：我們要轉念、世界很美好）。
   - 禁止過於油腔滑調或刻意搞笑。
✅ **建議**：
   - 使用台灣日常口語（如：很煩、傻眼、太誇張了、其實蠻溫暖的）。
   - 語氣要堅定但溫柔，展現出「我懂你，但這件事值得你看看」的態度。

【回應限制】請將回應長度控制在 150 個中文字以內。
        `;

        let success = false;
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // [新增] 輔助函式：更新載入訊息
        const updateLoadingMsg = (msg) => {
            const el = document.getElementById(loadingId);
            if(el) el.innerText = msg;
        };

        while (!success) {
            if (signal.aborted) throw new Error("AbortError");

            for (const model of modelList) {
                if (signal.aborted) throw new Error("AbortError");

                try {
                    // --- 監控：紀錄聊天 API 發送 ---
                    window.apiCallCount++;
                    console.warn(`[監控] 準備發送 API (對話)！目前累積發送 ${window.apiCallCount} 次`);

                    console.log(`[聊天] 嘗試連線模型: ${model.id} ...`);
                    // [新增] 介面顯示當前嘗試的模型
                    updateLoadingMsg(`嘗試連線 AI 模型 (${model.id})...`);
                    
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        signal: signal, 
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
                    // [新增] 介面顯示失敗與切換
                    updateLoadingMsg(`模型 ${model.id} 忙碌中，切換下一條線路...`);
                }
            }

            if (success) break; 
            
            console.warn("所有模型皆忙碌，3秒後重新開始新一輪嘗試...");
            updateLoadingMsg("所有線路忙碌，系統將於 3 秒後重試...");
            await sleep(3000); 
        }

    } catch (e) {
        const loadingEl = document.getElementById(loadingId);
        if(loadingEl) loadingEl.remove();
        
        if (e.name === 'AbortError' || e.message === 'AbortError') {
            console.log("使用者中斷了請求");
        } else {
            console.error(e);
            // [修正] 錯誤訊息強制存檔 (true)
            addChatMessage('system', "目前找不到適合的AI模型，請稍後再試一次。", true);
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

// --- 7.5 設定與垃圾桶功能 ---

// 垃圾桶 helper：移動到垃圾桶
async function moveToTrash(collectionName, docId) {
    try {
        const ref = doc(db, collectionName, docId);
        const snap = await getDoc(ref);
        if(snap.exists()){
            await addDoc(collection(db, "trash_bin"), {
                originCol: collectionName,
                originId: docId,
                data: snap.data(),
                delTime: serverTimestamp()
            });
            await deleteDoc(ref);
            return true;
        }
        return false;
    } catch(e) {
        console.error("Trash Error", e);
        return false;
    }
}

// 垃圾桶 helper：還原
async function restoreTrash(trashId) {
    try {
        const ref = doc(db, "trash_bin", trashId);
        const snap = await getDoc(ref);
        if(snap.exists()){
            const { originCol, originId, data } = snap.data();
            // 還原到原始位置 (使用 setDoc 指定 ID)
            await setDoc(doc(db, originCol, originId), data);
            await deleteDoc(ref);
            return true;
        }
        return false;
    } catch(e) {
        console.error("Restore Error", e);
        return false;
    }
}

// 產生垃圾桶畫面
async function createTrashHTML() {
    const iconRestore = `<svg style="pointer-events:none; width:16px; height:16px; fill:none; stroke:#2196F3; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>`;

    const trashHTML = `
    <div id="trash-modal" class="hidden" style="position: absolute; top:0; left:0; width:100%; height:100%; background:#FAFAFA; z-index:350; display: flex; flex-direction: column;">
        <header style="padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; background: #FFF; border-bottom: 1px solid #EEE;">
            <div style="font-size: 18px; font-weight: 800; color: var(--text-main);">垃圾桶</div>
            <button id="btn-close-trash" style="background:none; border:none; padding:8px; cursor:pointer; font-size:14px; color:#999;">關閉</button>
        </header>
        <div id="trash-list" style="flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:10px;">
            <div style="text-align:center; color:#CCC; margin-top:50px;">載入中...</div>
        </div>
    </div>
    `;
    const wrapper = document.getElementById('mobile-wrapper');
    if(!document.getElementById('trash-modal')) wrapper.insertAdjacentHTML('beforeend', trashHTML);

    // [修改] 使用 history.back() 返回上一層 (設定頁)
    document.getElementById('btn-close-trash').addEventListener('click', () => {
        history.back();
    });

    const listEl = document.getElementById('trash-list');
    listEl.innerHTML = '';

    const q = query(collection(db, "trash_bin"), orderBy("delTime", "desc"), limit(50));
    const snap = await getDocs(q);

    if(snap.empty) {
        listEl.innerHTML = '<div style="text-align:center; color:#CCC; margin-top:50px;">垃圾桶是空的</div>';
        return;
    }

    snap.forEach(d => {
        const item = d.data();
        let color = '#999';
        let typeLabel = '';
        let title = '';
        let content = '';

        if(item.originCol === 'pk_wins') {
            color = '#E0C060';
            typeLabel = 'PK勝利';
            title = `擊敗「${item.data.badTitle}」`;
            content = `戰友：${item.data.goodTitle}`;
        } else if(item.originCol === 'good_things') {
            color = 'var(--good-icon)';
            typeLabel = '好事';
            title = item.data.title;
            content = item.data.content;
        } else {
            color = 'var(--bad-icon)';
            typeLabel = '鳥事';
            title = item.data.title;
            content = item.data.content;
        }

        const btnStyle = `width:28px; height:28px; border-radius:50%; border:1px solid #EEE; background:#FFF; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0;`;
        
        const div = document.createElement('div');
        div.className = "trash-item";
        div.style.cssText = `background:#FFF; padding:15px; border-radius:12px; border:1px solid #F0F0F0; border-left:4px solid ${color}; display:flex; align-items:center; gap:10px;`;
        div.innerHTML = `
            <div style="flex:1; overflow:hidden;">
                <div style="font-size:10px; color:${color}; font-weight:bold; margin-bottom:2px;">${typeLabel}</div>
                <div style="font-weight:bold; color:#333; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${title}</div>
                <div style="font-size:12px; color:#999; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden;">${content || ''}</div>
            </div>
            <div>
                <button class="btn-restore" data-id="${d.id}" style="${btnStyle}" title="還原">${iconRestore}</button>
            </div>
        `;
        listEl.appendChild(div);
    });

    listEl.querySelectorAll('.btn-restore').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.closest('button').dataset.id;
            
            // [修改] 使用風格提示窗
            const confirmRestore = await showConfirmMessage("確定要還原此項目？", "還原", "取消");
            if(confirmRestore) {
                await restoreTrash(id);
                e.target.closest('.trash-item').remove();
                showSystemMessage("已還原");
            }
        });
    });

    document.getElementById('trash-modal').classList.remove('hidden');
}

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
                <div style="display:flex; justify-content:flex-end;">
                    <button id="btn-save-setting-key" style="background:#FFF; border:1px solid #DDD; color:#666; padding:6px 12px; border-radius:6px; font-size:13px; cursor:pointer;">儲存</button>
                </div>
            </div>

            <div style="background:#FFF; padding:20px; border-radius:12px; border:1px solid #EEE; margin-bottom:15px;">
                <h3 style="margin:0 0 10px 0; font-size:16px; color:var(--text-main);">資料管理</h3>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <button id="btn-open-trash-list" style="width:100%; background:#FFF3E0; color:#E65100; border:1px solid #FFE0B2; padding:12px; border-radius:8px; cursor:pointer; font-size:15px; font-weight:bold; margin-bottom:10px;">開啟垃圾桶</button>
                    <button id="btn-export" style="flex:1; background:#F5F5F5; color:#333; border:1px solid #DDD; padding:12px; border-radius:8px; cursor:pointer; font-size:15px;">匯出備份</button>
                    <label style="flex:1; background:#F5F5F5; color:#333; border:1px solid #DDD; padding:12px; border-radius:8px; cursor:pointer; font-size:15px; text-align:center;">
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

    // [修改] 開啟垃圾桶時，加入 pushState 以建立導航階層
    document.getElementById('btn-open-trash-list').addEventListener('click', () => {
        history.pushState({ tier: 'trash' }, '', '');
        createTrashHTML();
    });

    document.getElementById('btn-export').addEventListener('click', exportBackup);
    document.getElementById('inp-import').addEventListener('change', (e) => {
        if(e.target.files.length > 0) importBackup(e.target.files[0]);
    });

    // [修改] 登出按鈕使用風格提示窗
    document.getElementById('btn-logout').addEventListener('click', async () => {
        const confirmLogout = await showConfirmMessage("確定要登出嗎？", "登出", "取消");
        if(confirmLogout) {
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

    // [修改] SVG 圖示 (顏色直接寫死在 stroke 中，確保不被文字顏色影響)
    // 皇冠 (#FBC02D), 星星 (#7FB07F - Good Icon), 閃電 (#D48888 - Bad Icon)
    const iconCrown = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FBC02D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:text-bottom; margin-right:4px;"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path></svg>`;
    const iconStar = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7FB07F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:text-bottom; margin-right:4px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
    const iconLightning = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D48888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:text-bottom; margin-right:4px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;

    // [修改] 增加皇冠、星星與閃電 icon
    const warehouseHTML = `
    <div id="warehouse-modal" class="hidden" style="position: absolute; top:0; left:0; width:100%; height:100%; background:#FAFAFA; z-index:200; display: flex; flex-direction: column;">
        <header style="padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; background: #FFF; border-bottom: 1px solid #EEE;">
            <div style="font-size: 18px; font-weight: 800; color: var(--text-main);">卡片倉庫</div>
            <button id="btn-close-warehouse" style="background:none; border:none; padding:8px; cursor:pointer; font-size:14px; color:#999;">關閉</button>
        </header>
        <div style="padding: 10px 20px 0 20px; display: flex; gap: 8px; overflow-x: auto;">
            <button id="tab-wins" style="flex: 1; min-width:90px; padding: 10px 5px; border: 1px solid #FBC02D; border-radius: 10px; background: #FFF9C4; color: #FBC02D; font-weight: 700; cursor: pointer; font-size:13px;">${iconCrown}PK勝利</button>
            <button id="tab-good" style="flex: 1; min-width:90px; padding: 10px 5px; border: none; border-radius: 10px; background: #EEE; color: #999; font-weight: 700; cursor: pointer; font-size:13px;">${iconStar}好事庫</button>
            <button id="tab-bad" style="flex: 1; min-width:90px; padding: 10px 5px; border: none; border-radius: 10px; background: #EEE; color: #999; font-weight: 700; cursor: pointer; font-size:13px;">${iconLightning}待PK鳥事</button>
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

    wrapper.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentWarehouseScoreFilter = parseInt(e.target.dataset.score);
            const currentTab = document.getElementById('tab-bad').style.background.includes('var(--bad-light)') ? 'bad' : 
                               document.getElementById('tab-good').style.background.includes('var(--good-light)') ? 'good' : 'wins';
            loadWarehouseData(currentTab);
        });
    });

    const listEl = document.getElementById('warehouse-list');
    listEl.addEventListener('click', async (e) => {
        const target = e.target;
        const btn = target.closest('button');
        if (!btn) return;

        const action = btn.dataset.action;
        const id = btn.dataset.id;
        const winId = btn.dataset.winId; 
        const type = btn.dataset.type;

        if (!action || !id) return;
        
        try {
            if (action === 'delete') {
                let confirmMsg = '確定要刪除這張卡片嗎？';
                if (type === 'wins') {
                    confirmMsg = '只刪除勝利紀錄與其對話紀錄，好事卡/鳥事卡仍保存在各倉庫中。';
                }

                const confirmed = await showConfirmMessage(confirmMsg, "確定刪除", "取消");
                if (!confirmed) return;

                if (type === 'wins') {
                     const winDoc = await getDoc(doc(db, 'pk_wins', id));
                     if (winDoc.exists()) {
                         const data = winDoc.data();
                         const winScore = data.score || 1;
                         await updateUserScore(-winScore);

                         if (data.originalBadId) {
                             const badRef = doc(db, 'bad_things', data.originalBadId);
                             await updateDoc(badRef, {
                                 isDefeated: false,
                                 lastWinId: null,
                                 chatLogs: [],
                                 updatedAt: serverTimestamp()
                             });
                         }
                     }
                     await moveToTrash('pk_wins', id);
                } else {
                    const collectionName = type === 'good' ? 'good_things' : 'bad_things';
                    await moveToTrash(collectionName, id);
                }
                
                btn.closest('.card-item').remove();
                showSystemMessage("已移至垃圾桶");

            } else if (action === 'edit') {
                const collectionName = type === 'good' ? 'good_things' : 'bad_things';
                const docSnap = await getDoc(doc(db, collectionName, id));
                if (docSnap.exists()) {
                    openEditor(type === 'good' ? 'good' : 'bad', { id: docSnap.id, ...docSnap.data() });
                }
            } else if (action === 'defeat') {
                document.getElementById('warehouse-modal').classList.add('hidden');
                
                if (winId) {
                    // [修改] 再擊敗邏輯：讀取舊勝利以排除舊好事，並開啟新局
                    const winSnap = await getDoc(doc(db, 'pk_wins', winId));
                    let excludeTitle = null;
                    if (winSnap.exists()) {
                        excludeTitle = winSnap.data().goodTitle;
                    }

                    const docSnap = await getDoc(doc(db, 'bad_things', id));
                    if (docSnap.exists()) {
                        
                        // [新增] 再擊敗也要先扣分 (視為尚未勝利)
                        if (winSnap.exists()) {
                            const oldScore = winSnap.data().score || 1;
                            await updateUserScore(-oldScore);
                        }

                        // [修正] 補回 associatedWinId，讓系統知道這是哪張勝利紀錄，以便中途離開時刪除
                        startPK({ id: docSnap.id, ...docSnap.data() }, 'bad_things', { 
                            isReDefeat: true, 
                            excludeGoodTitle: excludeTitle,
                            associatedWinId: winId  
                        });
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
        // [修改] 鼠尾草綠邊框 #7E9F7E
        if(tabGood) { tabGood.style.background = 'var(--good-light)'; tabGood.style.color = 'var(--good-icon)'; tabGood.style.border = '1px solid #7E9F7E'; }
        collectionName = 'good_things';
        emptyMsg = '好事庫空空的。<br>記得多記錄生活中的微光！';
    } else {
        // [修改] 乾燥玫瑰粉邊框 #C47C7C
        if(tabBad) { tabBad.style.background = 'var(--bad-light)'; tabBad.style.color = 'var(--bad-icon)'; tabBad.style.border = '1px solid #C47C7C'; }
        collectionName = 'bad_things';
        emptyMsg = '太棒了！<br>目前沒有待處理的鳥事。';
    }

    try {
        // [策略修正] 1. 資料庫查詢：使用 createdAt 抓取
        const q = query(collection(db, collectionName), orderBy("createdAt", "desc"), limit(100));
        const querySnapshot = await getDocs(q);
        
        listEl.innerHTML = ''; 

        if (querySnapshot.empty) {
            listEl.innerHTML = `<div style="text-align:center; color:#CCC; margin-top:50px; line-height:1.6;">${emptyMsg}</div>`;
            return;
        }

        // [策略修正] 2. 前端排序
        let docs = [];
        querySnapshot.forEach(doc => docs.push(doc));

        docs.sort((a, b) => {
            const dataA = a.data();
            const dataB = b.data();
            const timeA = dataA.updatedAt?.toMillis() || dataA.createdAt?.toMillis() || 0;
            const timeB = dataB.updatedAt?.toMillis() || dataB.createdAt?.toMillis() || 0;
            return timeB - timeA; 
        });

        let hasData = false;

        // 3. 渲染迴圈
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
            
            // [修正] 按鈕樣式：圓形按鈕縮小至 28px
            const iconEdit = `<svg style="pointer-events:none; width:16px; height:16px; fill:none; stroke:#888; stroke-width:2;" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
            
            // [修正] 垃圾桶 Icon：使用標準單色垃圾桶 SVG (含蓋子與桶身，無中間線條)
            // 您要求「最普通的單色垃圾桶」，這裡提供一個乾淨的版本
            const iconTrash = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>`;
            
            const btnStyle = `width:28px; height:28px; border-radius:50%; border:1px solid #EEE; background:#FFF; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0;`;

            // [重點修改] 在按鈕加入 data-type="${type}"，確保刪除時知道是哪一類，不依賴顏色
            if (type === 'good') { 
                iconColor = 'var(--good-icon)'; 
                labelText = `等級: ${data.score || 1}`;
                
                actionButtonsHTML = `
                    <button data-action="edit" data-id="${docId}" data-type="good" style="${btnStyle}" title="編輯">${iconEdit}</button>
                    <button data-action="delete" data-id="${docId}" data-type="good" style="${btnStyle}" title="刪除">${iconTrash}</button>
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

                // [修正] 擊敗按鈕縮小
                const defeatBtnStyle = `height:28px; padding:0 12px; border-radius:14px; border:none; cursor:pointer; font-weight:bold; font-size:12px; color:#FFF; background:${btnDefeatColor};`;

                actionButtonsHTML = `
                    <button data-action="defeat" data-id="${docId}" data-win-id="${winIdAttr}" data-type="bad" style="${defeatBtnStyle}">${btnDefeatText}</button>
                    <button data-action="edit" data-id="${docId}" data-type="bad" style="${btnStyle}" title="編輯">${iconEdit}</button>
                    <button data-action="delete" data-id="${docId}" data-type="bad" style="${btnStyle}" title="刪除">${iconTrash}</button>
                `;
            }
            else { 
                iconColor = '#E0C060'; 
                // [修正] 勝利卡顯示等級
                labelText = `等級: ${data.score || 1}`;
                displayTitle = `擊敗「${data.badTitle}」`;
                displayContent = `戰友：${data.goodTitle}`;

                // [修正] 回顧按鈕縮小
                const reviewBtnStyle = `height:28px; padding:0 12px; border-radius:14px; border:none; cursor:pointer; font-weight:bold; font-size:12px; background:#FFF9C4; color:#FBC02D;`;

                actionButtonsHTML = `
                    <button data-action="review" data-id="${docId}" data-type="wins" style="${reviewBtnStyle}">回顧勝利</button>
                    <button data-action="delete" data-id="${docId}" data-type="wins" style="${btnStyle}" title="刪除">${iconTrash}</button>
                `;
            }

            // [修改] 版面結構：標題/內容在一區，下方一列分為 左(等級) 右(按鈕)
            const cardHTML = `
                <div class="card-item" style="background: ${cardBg}; padding: 15px; border-radius: 12px; border: 1px solid #F0F0F0; box-shadow: 0 2px 5px rgba(0,0,0,0.03); display: flex; gap: 10px;">
                    <div style="width: 4px; background: ${iconColor}; border-radius: 2px;"></div>
                    <div style="flex: 1; display:flex; flex-direction:column;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span style="font-weight: 700; color: var(--text-main); font-size: 15px;">${displayTitle}</span>
                            <span style="font-size: 12px; color: #BBB;">${date}</span>
                        </div>
                        <div style="font-size: 13px; color: #666; line-height: 1.4; flex:1;">${displayContent}</div>
                        
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding-top:10px; border-top:1px solid #F9F9F9;">
                            <div style="font-size: 12px; color: ${iconColor}; font-weight: 700;">${labelText}</div>
                            <div style="display:flex; gap:8px; align-items:center;">
                                ${actionButtonsHTML}
                            </div>
                        </div>
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
        // --- 使用者選了鳥事 (戰中換牌) --- 改為手動分階段模式
        addChatMessage('user', "還是覺得這件鳥事比較強...", true);
        addChatMessage('system', "收到。請重新召喚好事卡進行對決。", true);

        document.getElementById('pk-good-title').innerText = "重新部署中...";
        document.getElementById('pk-good-content').innerText = "等待召喚下一張好事卡。";

        const floatArea = document.getElementById('pk-floating-area');
        floatArea.innerHTML = ''; 

        const btnStyle = "display:block; margin:5px auto; padding:10px 24px; background:var(--primary); color:#FFF; border:none; border-radius:50px; font-weight:bold; font-size:14px; cursor:pointer; box-shadow:0 4px 15px rgba(0,0,0,0.2); pointer-events: auto;";

        const btnDraw = document.createElement('button');
        btnDraw.innerText = "抽好事卡";
        btnDraw.style.cssText = btnStyle;

        btnDraw.onclick = async () => {
            btnDraw.disabled = true;
            btnDraw.innerText = "搜尋中...";
            try {
                const q = query(collection(db, "good_things"), orderBy("createdAt", "desc"), limit(1000));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    if (currentPKContext.good?.id) currentPKContext.shownGoodCardIds.push(currentPKContext.good.id);
                    
                    const newGood = await aiPickBestCard(currentPKContext.bad, querySnapshot.docs, currentPKContext.shownGoodCardIds);
                    if (!newGood || newGood === "AI_FAILED") {
                        btnDraw.innerText = "找不到其他好事了";
                        return;
                    }

                    if (newGood.id) currentPKContext.shownGoodCardIds.push(newGood.id);
                    currentPKContext.good = newGood;
                    document.getElementById('pk-good-title').innerText = newGood.title;
                    document.getElementById('pk-good-content').innerText = newGood.content;
                    document.getElementById('pk-good-header').innerText = `好事 (Lv.${newGood.score || 1})`;
                    btnDraw.remove();

                    const btnChat = document.createElement('button');
                    btnChat.innerText = "請說服我";
                    btnChat.style.cssText = btnStyle;
                    btnChat.onclick = async () => {
                        btnChat.disabled = true;
                        btnChat.innerText = "思考中...";
                        const prompt = `【系統指令：使用者判定鳥事勝出。系統已選出新好事（${newGood.title}）。請執行模式三：給出全新觀點，嘗試再次說服。】`;
                        await callGeminiChat(prompt, true);
                        btnChat.remove();
                    };
                    floatArea.appendChild(btnChat);
                }
            } catch (e) { btnDraw.disabled = false; btnDraw.innerText = "失敗，請重試"; }
        };
        floatArea.appendChild(btnDraw);

    } else {
        // --- 使用者選了好事 (勝利！) ---
        addChatMessage('user', "好事贏了！這點鳥事不算什麼！ ✨", true);
        
        currentPKContext.isVictory = true;
        const btnRePk = document.getElementById('btn-re-pk');
        if(btnRePk) btnRePk.style.display = 'flex'; 

        // 1. 計算積分
        // [修改] 計分邏輯：若低分卡打敗高分卡，獲得「鳥事等級 + 差距分」
        const badScore = parseInt(currentPKContext.bad?.score) || 1;
        const goodScore = parseInt(currentPKContext.good?.score) || 1;
        let scoreToAdd = badScore;

        if (goodScore < badScore) {
            scoreToAdd = badScore + (badScore - goodScore);
        }

        // 紀錄這次獲得的分數，以便重新PK時扣除
        currentPKContext.pointsToDeduct = scoreToAdd;

        const newTotal = await updateUserScore(scoreToAdd);
        const rankTitle = getRankTitle(newTotal);

        // 2. 寫入勝利紀錄
        try {
            if (currentPKContext.winId) {
                 const winRef = doc(db, "pk_wins", currentPKContext.winId);
                 await updateDoc(winRef, {
                    goodTitle: currentPKContext.good?.title || "未知好事",
                    goodContent: currentPKContext.good?.content || "", 
                    chatLogs: currentPKContext.chatLogs, 
                    updatedAt: serverTimestamp()
                 });
            } else {
                const winData = {
                    uid: currentUser.uid,
                    badTitle: currentPKContext.bad?.title || "未知鳥事",
                    badContent: currentPKContext.bad?.content || "", 
                    // [新增] 儲存等級以便回顧
                    badScore: parseInt(currentPKContext.bad?.score) || 1,

                    goodTitle: currentPKContext.good?.title || "未知好事",
                    goodContent: currentPKContext.good?.content || "", 
                    goodScore: parseInt(currentPKContext.good?.score) || 1,

                    score: scoreToAdd,
                    chatLogs: currentPKContext.chatLogs,
                    originalBadId: currentPKContext.collection === 'bad_things' ? currentPKContext.docId : null,
                    createdAt: serverTimestamp()
                };
                
                const winRef = await addDoc(collection(db, "pk_wins"), winData);
                currentPKContext.winId = winRef.id; 

                if (currentPKContext.collection === 'bad_things' && currentPKContext.docId) {
                    await updateDoc(doc(db, "bad_things", currentPKContext.docId), {
                        isDefeated: true,
                        lastWinId: winRef.id, 
                        updatedAt: serverTimestamp()
                    });
                }
            }

        } catch(e) {
            console.error("Save Win Error", e);
            showSystemMessage("勝利紀錄儲存失敗：" + e.message);
        }

        // 3. 顯示勝利訊息 (不呼叫真 AI，使用假 AI 恭喜)
        showSystemMessage(`🎉 PK 勝利！\n\n已存入勝利庫\n獲得積分：+${scoreToAdd}\n目前總分：${newTotal}\n當前稱號：${rankTitle}`);
        
        // [修正] 假裝是 AI 說的話 (role='ai')，但不扣 Token
        addChatMessage('ai', "恭喜！能夠戰勝這件鳥事，代表你又變得更強大了。這場勝利已為你保留。", true);
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

        // [新增] 隱藏垃圾桶
        const trashModal = document.getElementById('trash-modal');
        if(trashModal) trashModal.classList.add('hidden');

        // B. 根據 tier 顯示對應視窗
        if (!tier || tier === 'home') {
            // 回到首頁
        } 
        else if (tier === 'warehouse') {
            if(screens.warehouse) {
                screens.warehouse.classList.remove('hidden');
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
        else if (tier === 'trash') {
            // [新增] 垃圾桶階層 (需確保設定頁也顯示，營造堆疊感，或者直接顯示垃圾桶)
            // 這裡選擇直接顯示垃圾桶，但要確保如果使用者重新整理，createTrashHTML 能運作
            createTrashHTML();
        }
        else if (tier === 'pk') {
            if(screens.pk) screens.pk.classList.remove('hidden');
        }
    });
}

// 啟動導航監聽
setupNavigation();
