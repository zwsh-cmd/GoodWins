// --- 1. 引入 Firebase ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

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

    // 下拉選單樣式 (維持不變)
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

    // [修正] 改用 top:0 + bottom:0 強制垂直拉伸填滿，解決 100dvh 可能計算誤差導致的露底問題
    const editorHTML = `
    <div id="editor-modal" class="hidden" style="position: absolute; top:0; left:0; width:100%; height:auto; bottom:0; background:#FFF; z-index:500; display: flex; flex-direction: column;">
        
        <div style="flex-shrink: 0; background: #FFF; z-index: 10; border-bottom: 1px solid #F0F0F0; box-shadow: 0 2px 10px rgba(0,0,0,0.02);">
            <div style="padding: 15px 24px; display:flex; justify-content:space-between; align-items:center;">
                <button id="btn-cancel-edit" style="background:none; border:none; color:#999; font-size:16px; cursor:pointer;">取消</button>
                <h3 id="editor-title" style="margin:0; font-size:18px; font-weight:700; color:var(--text-main);">記錄好事</h3>
                <button id="btn-save-edit" style="background:none; border:none; color:var(--primary); font-weight:700; font-size:16px; cursor:pointer;">儲存</button>
            </div>
            <div style="padding: 0 24px 15px 24px;">
                <input id="input-title" type="text" placeholder="標題" autocomplete="off" name="gw-title-field" style="width:100%; padding:10px 0; border:none; font-size:24px; font-weight:700; outline:none; background:transparent; color:#333;">
            </div>
        </div>

        <style>
            #input-title::placeholder, #input-content::placeholder { color: #E0E0E0; opacity: 1; }
            select option { font-size: 17px; }
        </style>

        <div id="editor-scroll-area" style="flex:1; overflow-y:auto; padding:20px 24px 40px 24px; display:flex; flex-direction:column; -webkit-overflow-scrolling: touch;">
            
            <textarea id="input-content" placeholder="內容" name="gw-content-field" style="width:100%; min-height:300px; padding:0; border:none; font-size:18px; outline:none; resize:none; background:transparent; line-height:1.6; color:#666; margin-bottom: 20px; overflow:hidden;"></textarea>
            
            <div style="padding:10px 0; display:flex; justify-content:flex-end;">
                <button id="btn-start-pk" style="display:none; background:#FFF9C4; color:#FBC02D; border:1.5px solid #FBC02D; padding:6px 20px; border-radius:50px; font-weight:700; font-size:14px; cursor:pointer;">開始PK</button>
            </div>

            <div style="padding:10px 0 40px 0;">
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
        
        // [新增] 自動延伸高度邏輯 (Auto Grow)
        const textarea = document.getElementById('input-content');
        if (textarea) {
            const autoResize = () => {
                textarea.style.height = 'auto'; // 先重置高度以計算縮小
                textarea.style.height = textarea.scrollHeight + 'px'; // 再設為內容高度
            };
            textarea.addEventListener('input', autoResize);
            // 掛載到全域供 openEditor 呼叫
            window.resizeEditorContent = autoResize;
        }
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
    // [新增] 防止搜尋引擎索引 (SEO Privacy)
    // 這會告訴 Google/Bing 不要收錄這個網頁
    const metaRobots = document.createElement('meta');
    metaRobots.name = "robots";
    metaRobots.content = "noindex";
    document.head.appendChild(metaRobots);

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
        @keyframes pulse-btn {
            0% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 rgba(251,192,45,0); }
            50% { opacity: 0.9; transform: scale(0.98); box-shadow: 0 0 10px rgba(251,192,45,0.4); }
            100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 rgba(251,192,45,0); }
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
                    <button id="btn-confirm-cancel" style="flex:1; background: #F5F5F5; color: #666; border: none; padding: 12px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; white-space: pre-line;">取消</button>
                    <button id="btn-confirm-ok" style="flex:1; background: var(--primary); color: white; border: none; padding: 12px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; white-space: pre-line;">確定</button>
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
                <div style="position: relative;">
                    <button id="btn-pk-menu" style="background:none; border:none; padding:8px; cursor:pointer; font-size:20px; color:#999; font-weight:bold; line-height:1;">⋮</button>
                    <div id="pk-dropdown-menu" class="hidden" style="position: absolute; right: 0; top: 40px; background: #FFF; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); border: 1px solid #EEE; width: 140px; z-index: 300; overflow: hidden;">
                        <button id="btn-clear-chat" style="width: 100%; padding: 12px 16px; border: none; background: none; text-align: left; font-size: 14px; color: #FF5252; cursor: pointer;">刪除所有對話</button>
                    </div>
                </div>
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
                <div id="chat-history" style="flex: 1; overflow-y: auto; padding: 20px 20px 75px 20px; display: flex; flex-direction: column; gap: 15px;"></div>
            
                <div id="pk-floating-area" style="position: absolute; bottom: 75px; left: 0; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; pointer-events: none; z-index: 20;"></div>

                <div style="position: relative; background: #FFF; z-index: 25; border-top: 1px solid #F0F0F0;">
                    
                    <div style="position: absolute; top: 10px; bottom: 10px; left: 10px; right: 10px; border: 1px solid #EEE; border-radius: 24px; background: #FAFAFA; pointer-events: none; z-index: 1;"></div>

                    <textarea id="chat-input" rows="1" placeholder="跟 AI 討論..." 
                        style="display: block; width: 100%; box-sizing: border-box; 
                               margin: 10px 0;
                               padding: 12px 75px 12px 25px; 
                               border: none; background: transparent; outline: none; 
                               color: var(--text-main); font-size: 13px; 
                               resize: none; overflow-y: auto; line-height: 1.5; 
                               max-height: 130px; position: relative; z-index: 2;
                               white-space: pre-wrap; overflow-wrap: break-word; word-break: break-all;"></textarea>

                    <button id="btn-send-chat" style="background: var(--primary); color: #FFF; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; position: absolute; right: 22px; bottom: 13px; z-index: 10;">
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

        // [新增] 自動校正浮動按鈕區域寬度 (扣除滾動條寬度，實現完美置中)
        const chatHist = document.getElementById('chat-history');
        const floatArea = document.getElementById('pk-floating-area');
        if (chatHist && floatArea) {
            const resizeObserver = new ResizeObserver(() => {
                // clientWidth 屬性天生不包含滾動條寬度，這正是我們要的
                floatArea.style.width = chatHist.clientWidth + 'px';
            });
            resizeObserver.observe(chatHist);
        }
        
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
            inputChat.style.height = 'auto'; // [修正] 發送後重置高度
            
            await callGeminiChat(text);
        };

        if(btnSend) btnSend.addEventListener('click', handleSend);
        if(inputChat) {
            // [新增] 自動調整高度 (最多約 5 行，由 max-height CSS 控制)
            inputChat.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
            
            // [修正] Enter 發送 (防止換行)，若需換行可按 Shift+Enter (雖然手機鍵盤通常直接換行，此處維持 Enter 發送習慣)
            inputChat.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); 
                    handleSend();
                }
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
                const confirmed = await showConfirmMessage("確定要重新發起 PK 挑戰嗎？\n（將扣除原本贏得的分數）", "重新開啟戰局", "取消");
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

                    // 3. 保留對話紀錄，重置標題並移除位階顯示
                    document.getElementById('pk-good-title').innerText = "準備開戰...";
                    document.getElementById('pk-good-content').innerText = "請召喚好事卡來破解這件鳥事。";
                    document.getElementById('pk-good-header').innerText = "好事";
                    currentPKContext.shownGoodCardIds = [];

                    // [修正] 4. 自動流程：顯示訊息並自動抽卡
                    addChatMessage('system', "———— 重新開啟戰局 ————", true);
                    
                    // 5. 插入浮動手動按鈕區域 (改為自動執行)
                    const floatArea = document.getElementById('pk-floating-area');
                    floatArea.innerHTML = '';
                    
                    // 顯示 AI 思考中狀態
                    const btnStyle = "display:block; margin:6px auto; padding:6px 16px; background:#FFF9C4; color:#FBC02D; border:1.5px solid #FBC02D; border-radius:50px; font-weight:bold; font-size:12px; cursor:pointer; box-shadow:0 4px 10px rgba(251,192,45,0.1); pointer-events: auto; animation: pulse-btn 1.5s infinite ease-in-out;";

                    // 自動執行抽卡邏輯
                    (async () => {
                        try {
                            const q = query(getMyCollection("good_things"), orderBy("createdAt", "desc"), limit(1000));
                            const querySnapshot = await getDocs(q);
                            if (!querySnapshot.empty) {
                                // [新增] Loading UI
                                const loadingId = 'card-loading-' + Date.now();
                                const chatHistory = document.getElementById('chat-history');
                                const loadingDiv = document.createElement('div');
                                loadingDiv.id = loadingId;
                                loadingDiv.style.cssText = "align-self: flex-start; font-size: 12px; color: #CCC; margin-left: 10px; font-style: italic; margin-bottom: 10px;";
                                loadingDiv.innerText = "正在分析戰局...";
                                chatHistory.appendChild(loadingDiv);
                                chatHistory.scrollTop = chatHistory.scrollHeight;

                                const updateStatus = (msg) => {
                                        const el = document.getElementById(loadingId);
                                        if(el) el.innerText = msg;
                                };

                                const newGood = await aiPickBestCard(currentPKContext.bad, querySnapshot.docs, currentPKContext.shownGoodCardIds, updateStatus);
                                
                                const el = document.getElementById(loadingId);
                                if(el) el.remove(); // 移除 Loading 動畫

                                if (!newGood || newGood === "AI_FAILED") {
                                    addChatMessage('system', "AI 暫時找不到適合的好事卡，請點擊鳥事卡再次嘗試。", true);
                                    return;
                                }

                                // [修正] 只有成功時才顯示並儲存紀錄
                                addChatMessage('system', "✅ 已選出好事卡。", true);
                                
                                // [修正] 補上 FIFO 機制：保持黑名單在 18 張以內 (確保邏輯一致性)
                                if (newGood.id) {
                                    currentPKContext.shownGoodCardIds.push(newGood.id);
                                    if (currentPKContext.shownGoodCardIds.length > 18) {
                                        currentPKContext.shownGoodCardIds.shift();
                                    }
                                }

                                currentPKContext.good = newGood;
                                document.getElementById('pk-good-title').innerText = newGood.title;
                                document.getElementById('pk-good-content').innerText = newGood.content;
                                document.getElementById('pk-good-header').innerText = `好事 (Lv.${newGood.score || 1})`;
                                
                                // (已移除重複的按鈕生成代碼)
                            } else {
                                addChatMessage('system', "倉庫裡還沒有好事卡喔！", true);
                            }
                        } catch (e) { 
                            console.error(e);
                            addChatMessage('system', "抽卡發生錯誤，請稍後再試。", true);
                        }
                    })();
                }
            });
        }
    }
}
createPKScreenHTML();

// --- [選單邏輯] 處理 PK 畫面的選單與刪除對話 ---
const btnPkMenu = document.getElementById('btn-pk-menu');
const pkDropdown = document.getElementById('pk-dropdown-menu');

if(btnPkMenu) {
    btnPkMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        pkDropdown.classList.toggle('hidden');
    });
}

// 點擊空白處關閉選單
document.addEventListener('click', () => {
    if(pkDropdown) pkDropdown.classList.add('hidden');
});

// (選單中的開啟倉庫按鈕已移除，統一使用離開功能返回倉庫)

// 選單：一鍵刪除對話
document.getElementById('btn-clear-chat')?.addEventListener('click', async () => {
    const confirmed = await showConfirmMessage("確定要刪除此局所有對話紀錄嗎？\n(操作不可復原)", "確定刪除", "取消");
    if(confirmed && currentPKContext.docId) {
        try {
            // [修正] 改用 getMyDoc
            const docRef = getMyDoc(currentPKContext.collection, currentPKContext.docId);
            await updateDoc(docRef, { chatLogs: [] });
            currentPKContext.chatLogs = [];
            currentPKContext.shownGoodCardIds = []; // [修正] 清空對話同時重置抽卡記憶
            document.getElementById('chat-history').innerHTML = '';
            showSystemMessage("對話紀錄已清空");
        } catch(e) { console.error(e); }
    }
});


// --- 5. 變數與 DOM 抓取 (介面產生後才能抓) ---
let currentUser = null;

// --- [核心架構] 私有路徑小助手 ---
function getMyCollection(colName) {
    if (!currentUser) throw new Error("請先登入");
    // 自動指向 users/{uid}/{colName}
    return collection(db, "users", currentUser.uid, colName);
}
function getMyDoc(colName, docId) {
    if (!currentUser) throw new Error("請先登入");
    return doc(db, "users", currentUser.uid, colName, docId);
}

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
                // 使用 getMyCollection，移除 where，並移除 limit 以搜尋全部
                const p1 = getDocs(query(getMyCollection("bad_things"), orderBy("createdAt", "desc")));
                const p2 = getDocs(query(getMyCollection("good_things"), orderBy("createdAt", "desc")));
                const p3 = getDocs(query(getMyCollection("pk_wins"), orderBy("createdAt", "desc")));
                
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
                        // [安全修正] 防止 XSS
                        title = escapeHtml(item.title);
                        content = escapeHtml(item.content);
                        // [修改] 改用圖示按鈕 (修改)
                        actionBtnHTML = `<button class="btn-search-action" data-action="edit" data-id="${item.id}" data-type="${item.type}" style="${btnStyle}" title="修改">${iconEdit}</button>`;
                    } else if (item.type === 'good') {
                        color = 'var(--good-icon)';
                        typeLabel = '好事';
                        // [安全修正] 防止 XSS
                        title = escapeHtml(item.title);
                        content = escapeHtml(item.content);
                        // [修改] 改用圖示按鈕 (修改)
                        actionBtnHTML = `<button class="btn-search-action" data-action="edit" data-id="${item.id}" data-type="${item.type}" style="${btnStyle}" title="修改">${iconEdit}</button>`;
                    } else if (item.type === 'wins') {
                        color = '#E0C060';
                        typeLabel = 'PK勝利';
                        // [安全修正] 防止 XSS
                        title = `擊敗「${escapeHtml(item.badTitle)}」`;
                        content = `戰友：${escapeHtml(item.goodTitle)}`;
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
                // [修正] 改用 getMyDoc
                const docSnap = await getDoc(getMyDoc(collectionName, id));
                if (docSnap.exists()) {
                    openEditor(type, { id: docSnap.id, ...docSnap.data() });
                }
            } catch(e) { console.error(e); }
        } else if (action === 'review') {
            try {
                // [修正] 改用 getMyDoc
                const docSnap = await getDoc(getMyDoc('pk_wins', id));
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
                
                // 重置鳥事卡 (變回紅色) [修正] 改用 getMyDoc
                const docRef = getMyDoc('bad_things', currentPKContext.docId);
                await updateDoc(docRef, {
                    isDefeated: false,
                    lastWinId: null,
                    updatedAt: serverTimestamp(),
                    chatLogs: currentPKContext.chatLogs // 保留對話
                });

                // 如果有對應的勝利紀錄 (lastWinId 或 winId)，刪除它
                if (currentPKContext.winId) {
                    // [修正] 改用 getMyDoc
                    await deleteDoc(getMyDoc('pk_wins', currentPKContext.winId));
                }
                
                showSystemMessage("挑戰未完成，\n鳥事已回歸待擊敗狀態。");
            }
            else if (currentPKContext.collection === 'bad_things' && currentPKContext.docId) {
                // 一般 PK 中途離開，只更新對話與時間 [修正] 改用 getMyDoc
                const docRef = getMyDoc('bad_things', currentPKContext.docId);
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
    // [修正] 點擊後立即改變按鈕狀態為載入中，避免使用者覺得畫面無回應或跳回原點
    btns.login.disabled = true;
    btns.login.innerText = "載入中...";
    
    signInWithPopup(auth, provider)
        .catch(err => {
            // 若使用者手動關閉視窗或登入失敗，還原按鈕狀態
            alert("登入失敗: " + err.message);
            btns.login.disabled = false;
            btns.login.innerText = "Google 登入";
        });
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
        
        // [新增] 編輯模式下，詢問是否覆蓋或另存
        if (targetId) {
            const isOverwrite = await showConfirmMessage("卡片已經修改，另存為新的卡片？\n或者合併舊卡片的紀錄？", "合併舊卡\n(保留PK紀錄)", "另存新卡");
            if (!isOverwrite) {
                targetId = null; // 設為 null，後續邏輯會自動進入「新增模式」
            }
        }
        
        if (targetId) {
            // --- 編輯模式 ---
            // 使用 getMyDoc 鎖定私人路徑
            const docRef = getMyDoc(collectionName, targetId);
            await updateDoc(docRef, {
                title: title,
                content: content,
                score: score,
                source: source,
                updatedAt: serverTimestamp()
            });
        } else {
            // --- 新增模式 ---
            // 使用 getMyCollection 存入私人房間 (移除冗餘的 uid 欄位)
            const docRef = await addDoc(getMyCollection(collectionName), {
                title: title,
                content: content,
                score: score,
                source: source,
                createdAt: serverTimestamp()
            });
            targetId = docRef.id;
        }

        screens.editor.classList.add('hidden'); 

        // [核心修改] 邏輯分流與導航優化
        
        // 情況 A：如果是「鳥事」 (Bad Thing)
        // 目標：建立 [首頁] -> [倉庫] -> (可選 [PK]) 的路徑，取代原本的 [首頁] -> [編輯器]
        if (currentMode === 'bad') {
            
            // 1. 偷天換日：把當前的「編輯器」歷史紀錄替換成「倉庫」
            history.replaceState({ tier: 'warehouse' }, '', '');
            
            // 2. 視覺切換：先關閉編輯器
            screens.editor.classList.add('hidden'); 
            
            // [關鍵修正] 確保倉庫 DOM 已存在，並預先設定為「待PK鳥事」狀態
            // 這樣當從 PK 頁面「離開」觸發 popstate 時，程式檢查 DOM 才會知道要留在「待PK鳥事」分頁
            createWarehouseHTML(); 
            if (!screens.warehouse) screens.warehouse = document.getElementById('warehouse-modal');
            loadWarehouseData('bad'); // 這裡會預先設定好 Tab 的顏色狀態 (即使視窗現在可能被 PK 蓋住或隱藏)

            // 3. 分流處理
            if (shouldStartPK) {
                // [修正] 如果要 PK，直接進入 PK
                // 由於已經 replaceState 為 warehouse，再 startPK (pushState pk)，
                // 歷史堆疊會變成 Home -> Warehouse -> PK。
                // 且因為上面已經 loadWarehouseData('bad')，按離開回頭時，popstate 會讀到正確的 Tab 狀態。
                
                // [新增] 必須隱藏倉庫 modal，因為倉庫 Z-index(200) 高於 PK(100)，不隱藏會導致 PK 畫面被蓋住
                if (screens.warehouse) screens.warehouse.classList.add('hidden');

                startPK({ 
                    id: targetId, 
                    title, 
                    content,
                    score,
                    source,
                    chatLogs: []
                }, collectionName); 
            } else {
                // 如果只是儲存，顯示倉庫 (因為上面已經 load 了，這裡只要移除 hidden)
                screens.warehouse.classList.remove('hidden');
                showSystemMessage("鳥事已儲存！");
            }
        }
        
        // 情況 B：如果是「好事」 (Good Thing)
        // 目標：維持原本邏輯，儲存後回到上一頁 (可能是首頁，也可能是從倉庫進來的)
        else {
            if (shouldStartPK) {
                // 好事理論上不觸發 PK，但保留邏輯防呆
                startPK({ id: targetId, title, content, score, source, chatLogs: [] }, collectionName);
            } else {
                history.back(); // 回到上一層
                showSystemMessage("✨ 好事已儲存！");
                
                // 如果上一層剛好是倉庫，重新整理一下讓新資料出現
                setTimeout(() => {
                    if (screens.warehouse && !screens.warehouse.classList.contains('hidden')) {
                        loadWarehouseData(currentMode);
                    }
                }, 100);
            }
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

// [修正] AI 智慧選牌模組：全域審視 (Global Evaluation)
// 目的：要求 AI 閱讀完整份清單，綜合評估「有效性」與「分數成本」後做出最佳決策，但保留原始 Prompt 靈魂。
// [修正] 增加 statusCallback 參數用於回報連線進度
async function aiPickBestCard(badData, candidateDocs, excludeList = [], statusCallback = null) {
    const apiKey = sessionStorage.getItem('gemini_key');
    if (!apiKey || candidateDocs.length === 0) return null;

    // 1. 轉陣列
    const excludes = Array.isArray(excludeList) ? excludeList : (excludeList ? [excludeList] : []);

    // 2. 嚴格過濾：同時檢查 ID 與 Title (只排除傳入的黑名單)
    let finalCandidates = candidateDocs.filter(doc => {
        const data = doc.data();
        const isExcludedById = excludes.includes(doc.id);
        const isExcludedByTitle = excludes.includes(data.title);
        return !isExcludedById && !isExcludedByTitle;
    });

    // [修正] 自動重置機制：如果過濾後發現沒牌了 (都被加入黑名單)，則解禁所有卡片
    // 避免因為卡片太少導致無限輪迴的 "return null"
    if (finalCandidates.length === 0) {
        console.warn("所有好事卡都已輪過一輪，解除黑名單限制，重新開放所有卡片。");
        finalCandidates = candidateDocs;
    }

    if (finalCandidates.length === 0) return null;

    // 3. 排序：依照分數由低到高 (Lv.1 -> Lv.5)
    // 雖然我們要 AI 看全部，但有序的清單有助於 AI 理解「成本結構」，保留「以小搏大」的參考依據。
    finalCandidates.sort((a, b) => {
        const scoreA = parseInt(a.data().score) || 1;
        const scoreB = parseInt(b.data().score) || 1;
        return scoreA - scoreB;
    });

    // 製作給 AI 看的資料 (保留原始結構)
    const aiInputCandidates = finalCandidates.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        score: doc.data().score || 1,
        content: (doc.data().content || "").substring(0, 100) 
    }));

    // [核心修改] Prompt：將「循序掃描」改為「全域審視」，並將高分卡門檻放寬至 Lv.3-5
    const selectionPrompt = `
    任務：你是「GoodWins」APP 的邏輯演算中樞。你的任務是「價值平衡運算 (Value Equilibrium Calculation)」**。
    目標：從清單中計算出唯一一張能對【眼前鳥事】進行「有效補償」的卡片。

    【變數輸入】
    【鳥事 (Loss)】：${badData.title} (內容：${badData.content})
    【候選好事 (Candidates)】：${JSON.stringify(aiInputCandidates)}

    【核心運算邏輯 (Core Logic)】

    **定義：什麼是「好」？**
    在此系統中，「好」的定義不是道德上的善 (Moral Good)，而是**能量上的獲得 (Energy Gain)**。
    
    **邏輯一：補償原則 (The Principle of Compensation)**
    - 鳥事被視為一種「虧損 (Debit)」。你的任務是尋找「進帳 (Credit)」來平衡報表。

    **邏輯二：好事卡與鳥事卡必須要有主題和邏輯上的關聯性**
    - 舉例，當使用者認為工作分配不公時，最好能找到一張卡片來**「證明這世界還有公道，努力會有回報」**。而不是給出一張吃到好吃下午茶的小確幸好事來彌補疲累(沒有主題關聯性，只是純粹一件好事情)。
	- 除非完全找不到主題和邏輯關聯性的好事卡，才可以偶爾使用一下小確幸。
        
    **邏輯三：領域互補性 (Domain Complementarity)**
    - 優先搜尋 **[同領域的反向事件]** (工作被貶低 vs 工作被讚賞)。
    - 若同領域無有效解 (即：同領域卡片皆被邏輯二剔除)，則啟動 **[跨領域補償]** (工作虧損 vs 生活進帳)。

	**重要規則：忽略等級限制 (Ignore Score Constraints)**
    - **允許「以小博大」**：請優先考慮內容的「性質互補性」而非「分數」。
    - 即使好事卡只有 1 分 (Micro)，只要它的性質能精準抵銷鳥事。
    - **絕對不要因為好事卡分數低於鳥事卡就放棄選擇**，請盡力選出一張最適合的。
    
	**重要規則2：嚴禁說教、否定使用者想法、勉強使用者轉念。而是應該藉由引導和感人的理由來幫助使用者感受好事卡的正面力量。

    【執行程序】
    1. **掃描 (Scan)**：讀取所有候選卡片。
    2. **驗證 (Validate)**：對每一張卡片套用【邏輯二】。
       - 拿著「公道檢測儀」檢查：這張別人的卡片，能證明「努力有回報」嗎？不能就刪。
    3. **計算 (Calculate)**：在通過驗證的卡片中，選出能量最強（最能抵銷鳥事虧損）的一張。

    【輸出規定】
    請深思熟慮後，**只回傳**該卡片的 ID (純字串)，不要有任何解釋。
    `;

    const modelList = await getSortedModelList(apiKey);
    
    // [設定] Temperature 設為 0.4
    // 稍微調高創意值，讓 AI 在面對相同清單時，能根據對「最佳」的些微不同解讀而有變化 (避免每次都選同一張)
    const temperature = 0.4;

    for (const model of modelList) {
        try {
            // --- 監控：紀錄選牌 API 發送 ---
            window.apiCallCount++;
            const statusMsg = `嘗試連線AI模型：${model.id}...`;
            console.warn(`[監控] ${statusMsg} (累積發送 ${window.apiCallCount} 次)`);
            if (statusCallback) statusCallback(statusMsg);

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: selectionPrompt }] }],
                    generationConfig: { temperature: temperature } 
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

    console.warn("AI 正在深度發想創意連結...");
    return null;
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

    // [修正] 如果是「再擊敗」，必須將上次贏的那張好事卡(excludeGoodTitle)也加入黑名單
    if (options.excludeGoodTitle) {
        currentPKContext.shownGoodCardIds.push(options.excludeGoodTitle);
    }

    // [修正] 1. 解析歷史對話，同時支援「舊格式(已淘汰)」與「新格式(暫時落敗)」
    if (data.chatLogs && Array.isArray(data.chatLogs)) {
        data.chatLogs.forEach(log => {
             if (log.role === 'system') {
                 // 格式 A: 新版 "「...」暫時落敗"
                 const mNew = log.text.match(/「(.*?)」暫時落敗/);
                 if (mNew) currentPKContext.shownGoodCardIds.push(mNew[1]);
                 
                 // 格式 B: 舊版 "已淘汰「...」" (相容舊紀錄)
                 const mOld = log.text.match(/已淘汰「(.*?)」/);
                 if (mOld) currentPKContext.shownGoodCardIds.push(mOld[1]);

                 // 格式 C: 換牌 "新好事卡為（...）"
                 const mSwap = log.text.match(/新好事卡為（(.*?)）/);
                 if (mSwap) currentPKContext.shownGoodCardIds.push(mSwap[1]);
             }
        });

        // [新增] 強制只保留最後 18 筆歷史黑名單 (遺忘機制)
        if (currentPKContext.shownGoodCardIds.length > 18) {
            currentPKContext.shownGoodCardIds = currentPKContext.shownGoodCardIds.slice(-18);
        }
    }

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
        
        // [修正] 選出新卡前位階消失，僅顯示「好事」
        document.getElementById('pk-good-title').innerText = "準備開戰...";
        document.getElementById('pk-good-content').innerText = "AI 正在分析戰局並挑選好事卡...";
        document.getElementById('pk-good-header').innerText = "好事";

        if (options.isReDefeat) {
            addChatMessage('system', "———— 重新開啟戰局 ————", true);
        } else {
            addChatMessage('system', "———— 繼續進攻，AI正在抽出好事卡 ————", true);
        }

        const floatArea = document.getElementById('pk-floating-area');
        floatArea.innerHTML = ''; // 清空，確保唯一

        // --- 1. 立即渲染正確按鈕 (隨機=黃, 說服=灰) ---
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = "display:flex; gap:10px; justify-content:center; width:100%; pointer-events:auto; align-items:center; padding: 0 10px;";
        
        // 定義樣式
        const yellowStyle = "flex:1; padding:10px 0; background:#FFF9C4; color:#FBC02D; border:1.5px solid #FBC02D; border-radius:50px; font-weight:bold; font-size:13px; cursor:pointer; box-shadow:0 4px 10px rgba(251,192,45,0.1); pointer-events: auto; animation: pulse-btn 1.5s infinite ease-in-out; text-align:center;";
        const grayStyle = "flex:1; padding:10px 0; background:#F5F5F5; color:#AAA; border:1.5px solid #E0E0E0; border-radius:50px; font-weight:bold; font-size:13px; cursor:not-allowed; text-align:center; pointer-events:none;";

        // 按鈕：隨機抽卡 (黃色常駐)
        const btnRandom = document.createElement('button');
        btnRandom.innerText = "隨機抽卡";
        btnRandom.style.cssText = yellowStyle;

        // 按鈕：請說服我 (初始灰色)
        const btnChat = document.createElement('button');
        btnChat.innerText = "AI 思考中...";
        btnChat.style.cssText = grayStyle;
        btnChat.disabled = true;

        btnContainer.appendChild(btnRandom);
        btnContainer.appendChild(btnChat);
        floatArea.appendChild(btnContainer);

        let userIntervened = false;
        let selectedGoodThing = null;

        // 更新 UI 函式
        const updateCardUI = (card) => {
            if(!card) return;
            if (card.id) {
                currentPKContext.shownGoodCardIds.push(card.id);
                if (currentPKContext.shownGoodCardIds.length > 18) currentPKContext.shownGoodCardIds.shift();
            }
            currentPKContext.good = card;
            document.getElementById('pk-good-title').innerText = card.title;
            document.getElementById('pk-good-content').innerText = card.content;
            document.getElementById('pk-good-header').innerText = `好事 (Lv.${card.score || 1})`;
            selectedGoodThing = card;
            
            // 卡片出來了，啟用「請說服我」為黃色
            btnChat.style.cssText = yellowStyle;
            btnChat.innerText = "請說服我";
            btnChat.disabled = false;
        };

        // 按鈕邏輯：請說服我
        btnChat.onclick = async () => {
             btnChat.disabled = true;
             btnRandom.disabled = true;
             const originalText = btnChat.innerText;
             btnChat.innerText = "思考中...";
             
             const isRePersuade = (originalText === "再說服我");
             let prompt = "";
             if (isRePersuade) {
                 prompt = `【系統指令：使用者對目前的說法還不夠滿意。針對同一張好事卡（${selectedGoodThing.title}），請切換一個完全不同的角度，再次嘗試說服使用者這張牌為何能扭轉鳥事。】`;
             } else {
                 if (currentPKContext.chatLogs.length > 0) {
                    prompt = `【系統指令：忽略舊結果。新好事卡為（${selectedGoodThing.title}）。請開始價值辯論。】`;
                 } else {
                    prompt = "【系統指令：PK 開始。策略選牌完成，進行價值辯論。】";
                 }
             }
             
             const success = await callGeminiChat(prompt, true);
             if (success) {
                 btnChat.innerText = "再說服我";
                 btnChat.disabled = false;
                 btnRandom.disabled = false;
             } else {
                 btnChat.innerText = originalText;
                 btnChat.disabled = false;
                 btnRandom.disabled = false;
             }
        };

        // 自動執行抽卡 (背景非同步)
        (async () => {
            try {
                const querySnapshot = await getDocs(query(getMyCollection("good_things"), orderBy("createdAt", "desc")));
                
                // 按鈕邏輯：隨機抽卡 (搶斷/重抽)
                btnRandom.onclick = () => {
                    // 若無卡片可抽
                    if (querySnapshot.empty) {
                        addChatMessage('system', "倉庫裡沒有好事卡，無法抽卡。", true);
                        return;
                    }
                    
                    userIntervened = true; // 標記搶斷，AI 回來後會被忽略

                    const candidates = querySnapshot.docs.filter(doc => !currentPKContext.shownGoodCardIds.includes(doc.id));
                    const pool = candidates.length > 0 ? candidates : querySnapshot.docs; 
                    const randomDoc = pool[Math.floor(Math.random() * pool.length)];
                    
                    updateCardUI({ id: randomDoc.id, ...randomDoc.data() });
                    
                    // [修正] 移除 Loading 並寫入對話紀錄
                    const el = document.getElementById('start-pk-loading');
                    if(el) el.remove();
                    addChatMessage('system', "✅ 已選出好事卡。", true);
                };

                if (querySnapshot.empty) {
                    addChatMessage('system', "倉庫裡還沒有好事卡喔，先去記錄幾件好事吧！", true);
                    return;
                }

                // 啟動 AI 運算 (背景執行)
                const loadingId = 'start-pk-loading';
                const chatHistory = document.getElementById('chat-history');
                const loadingDiv = document.createElement('div');
                loadingDiv.id = loadingId;
                loadingDiv.style.cssText = "align-self: flex-start; font-size: 12px; color: #CCC; margin-left: 10px; font-style: italic; margin-bottom: 10px;";
                loadingDiv.innerText = "正在分析戰局...";
                chatHistory.appendChild(loadingDiv);
                chatHistory.scrollTop = chatHistory.scrollHeight;

                const updateStatus = (msg) => {
                    const el = document.getElementById(loadingId);
                    if(el) el.innerText = msg;
                };

                const aiPicked = await aiPickBestCard(currentPKContext.bad, querySnapshot.docs, currentPKContext.shownGoodCardIds, updateStatus);
                
                const el = document.getElementById(loadingId);
                if(el) el.remove();

                // 除非使用者已經搶斷，否則使用 AI 結果更新 UI
                if (!userIntervened) {
                    if (!aiPicked || aiPicked === "AI_FAILED") {
                         addChatMessage('system', "AI 暫時找不到適合的好事卡，請手動隨機抽卡。", true);
                         return;
                    }
                    updateCardUI(aiPicked);
                    // [修正] 成功選出後寫入紀錄
                    addChatMessage('system', "✅ 已選出好事卡。", true);
                }

            } catch (e) { 
                console.error(e);
                addChatMessage('system', "抽卡發生錯誤，請稍後再試。", true);
            }
        })();
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
        // [修正] 強制寬度 100% 並文字置中，確保與浮動按鈕對齊
        msgDiv.style.cssText = "align-self: center; width: 100%; text-align: center; padding: 8px; font-size: 12px; color: #BBB;";
        msgDiv.innerText = text;
    }
    
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight; 

    // 儲存到 Firestore
    // [修改] 移除了 sender !== 'system' 的限制，只要 saveToDb 為 true 就存
    // 這樣「重新開始戰局」的分隔線就會被記錄
    if (saveToDb && currentPKContext.docId) {
        try {
            // 使用 getMyDoc (collection 名稱會自動對應)
        const docRef = getMyDoc(currentPKContext.collection, currentPKContext.docId);
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
    // 順位機制主要用於應對個別模型的 RPM (每分鐘請求限制) 塞車問題，而非總額度耗盡。
    console.log("系統設定：鎖定 2.5 -> 2.5 F -> 1.5 穩定備援路徑");
    
    return [
        { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
        { id: 'gemini-2.5-flash-lite', displayName: 'Gemini 2.5 Flash-Lite' },
        { id: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash (最穩定)' }
    ];
}

// isHidden 參數用來發送「系統指令」給 AI，但不顯示在聊天室窗中
async function callGeminiChat(userMessage, isHidden = false) {
    const apiKey = sessionStorage.getItem('gemini_key');
    if (!apiKey) {
        addChatMessage('system', "請先點擊設定輸入 API Key。", true);
        return false; // [修改] 回傳 false
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

    let finalSuccess = false; // [修改] 追蹤最終結果

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
	   - **扭轉局面**：必須切題，不是一味地要使用者看到光明面，要試著去說服使用者「這件好事」跟「鳥事」之間有什麼關聯性、為何這件好事可以扭轉局面抵銷鳥事帶來的負面影響。
	   - **切合問題面向**：舉例，自動判斷使用者問題的面向，若是基督信仰問題，就從基督信仰觀點回答。以此類推。

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

【回應限制】請將回應長度控制在 200 個中文字以內。
        `;

        let loopSuccess = false; // [修改] 區域變數
        const updateLoadingMsg = (msg) => {
            const el = document.getElementById(loadingId);
            if(el) el.innerText = msg;
        };

        if (signal.aborted) throw new Error("AbortError");

        for (const model of modelList) {
            if (signal.aborted) throw new Error("AbortError");

            try {
                window.apiCallCount++;
                console.warn(`[監控] 準備發送 API (對話)！目前累積發送 ${window.apiCallCount} 次`);

                console.log(`[聊天] 嘗試連線模型: ${model.id} ...`);
                // [修正] 統一提示詞格式
                updateLoadingMsg(`嘗試連線AI模型：${model.id}...`);
                
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
                    loopSuccess = true; 
                    finalSuccess = true; // [修改] 標記為成功
                    break; 
                } else {
                    throw new Error("EMPTY_RESPONSE");
                }

            } catch (err) {
                if (err.name === 'AbortError' || err.message === 'AbortError') throw err;
                
                const errMsg = err.message || "";
                console.warn(`[聊天] 模型 ${model.id} 失敗 (${errMsg})`);

                const errorMap = {
                    "400": "請求內容錯誤 (400) - 請檢查對話長度或內容。",
                    "401": "API Key 無效 (401) - 請檢查設定中的金鑰。",
                    "403": "無權限 (403) - 您的 API Key 無法存取此模型。",
                    "404": "模型未找到 (404) - Google 可能已移除此模型。",
                    "429": "API 額度已滿 (429) - 請等待約 1-2 分鐘後再試。",
                    "500": "Google 伺服器錯誤 (500) - 請稍後再試。",
                    "503": "服務暫時無法使用 (503) - 伺服器過載。"
                };

                let friendlyMsg = null;
                for (const [code, msg] of Object.entries(errorMap)) {
                    if (errMsg.includes(code)) {
                        friendlyMsg = msg;
                        break;
                    }
                }

                if (friendlyMsg && (errMsg.includes("429") || errMsg.includes("401"))) {
                    const loadingEl = document.getElementById(loadingId);
                    if(loadingEl) loadingEl.remove();
                    addChatMessage('system', `⛔ 連線停止：${friendlyMsg}`, true);
                    loopSuccess = true; 
                    // [修改] 雖然停止了，但因為是「連線停止」錯誤，視為 AI 未成功回應，finalSuccess 保持 false
                    break; 
                }

                updateLoadingMsg(`模型 ${model.id} 異常 (${errMsg})，嘗試下一條線路...`);
            }
        }

        if (!loopSuccess) {
            const loadingEl = document.getElementById(loadingId);
            if(loadingEl) loadingEl.remove();
            addChatMessage('system', "❌ 所有 AI 線路皆忙碌或無回應，請稍後再試。", true);
            // finalSuccess 保持 false
        }

    } catch (e) {
        const loadingEl = document.getElementById(loadingId);
        if(loadingEl) loadingEl.remove();
        
        if (e.name === 'AbortError' || e.message === 'AbortError') {
            console.log("使用者中斷了請求");
        } else {
            console.error(e);
            addChatMessage('system', "目前找不到適合的AI模型，請稍後再試一次。", true);
        }
        finalSuccess = false; // [修改] 確保失敗
    } finally {
        currentAbortController = null;
        return finalSuccess; // [修改] 回傳結果
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
// [新增] XSS/顯示修復：將特殊符號轉義，避免 < > 導致內容消失或版面錯乱
function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
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

    // [修正] 移除 JS 高度鎖定，改由 CSS (bottom:0) 自動適應鍵盤高度，確保標題不被推擠
    screens.editor.style.height = ''; 
    screens.editor.classList.remove('hidden');

    // [新增] 若有定義自動調整函式，開啟時執行一次 (讓舊內容撐開高度)
    if (window.resizeEditorContent) window.resizeEditorContent();
    
    // 強制滾動到最上方 (避免因為內容很長，開啟時直接在底部)
    const scrollArea = document.getElementById('editor-scroll-area');
    if(scrollArea) scrollArea.scrollTop = 0;
}

// --- 7.5 設定與垃圾桶功能 ---

// 垃圾桶 helper：移動到垃圾桶 (新架構)
async function moveToTrash(collectionName, docId) {
    try {
        const ref = getMyDoc(collectionName, docId);
        const snap = await getDoc(ref);
        if(snap.exists()){
            // 存入 users/{uid}/trash_bin
            await addDoc(getMyCollection("trash_bin"), {
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

// 垃圾桶 helper：還原 (新架構)
async function restoreTrash(trashId) {
    try {
        const ref = getMyDoc("trash_bin", trashId);
        const snap = await getDoc(ref);
        if(snap.exists()){
            const { originCol, originId, data } = snap.data();
            // 還原到原始位置
            await setDoc(getMyDoc(originCol, originId), data);
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

    // 使用 getMyCollection，移除 where
    const q = query(getMyCollection("trash_bin"), orderBy("delTime", "desc"), limit(50));
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
        showSystemMessage("正在打包資料 (僅限個人資料)，請稍候...");
        // 備份新架構資料
        const backup = {
            version: 2, // 升級版本號
            date: new Date().toISOString(),
            // users 不用備份全部，因為這是個人備份
            good_things: (await getDocs(getMyCollection("good_things"))).docs.map(d => ({id: d.id, ...d.data()})),
            bad_things: (await getDocs(getMyCollection("bad_things"))).docs.map(d => ({id: d.id, ...d.data()})),
            pk_wins: (await getDocs(getMyCollection("pk_wins"))).docs.map(d => ({id: d.id, ...d.data()}))
        };

        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `goodwins_v2_${new Date().toISOString().slice(0,10)}.json`;
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
            // 支援 v1 (舊版) 與 v2 (新版) 格式

            showSystemMessage("正在還原資料庫...");
            const restoreCol = async (colName, items) => {
                if(!items) return;
                for (const item of items) {
                    const { id, ...docData } = item;
                    // 使用 getMyDoc 還原
                    await setDoc(getMyDoc(colName, id), docData); 
                }
            };

            // data.users 忽略，因為我們鎖定在當前使用者
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
                     // [修正] 改用 getMyDoc
                     const winDoc = await getDoc(getMyDoc('pk_wins', id));
                     if (winDoc.exists()) {
                         const data = winDoc.data();
                         const winScore = data.score || 1;
                         await updateUserScore(-winScore);

                         if (data.originalBadId) {
                             try {
                                 // [修正] 改用 getMyDoc
                                 const badRef = getMyDoc('bad_things', data.originalBadId);
                                 // [修正] 嘗試更新鳥事狀態，若鳥事已刪除則忽略錯誤(catch)，確保勝利卡能被刪除
                                 await updateDoc(badRef, {
                                     isDefeated: false,
                                     lastWinId: null,
                                     chatLogs: [],
                                     updatedAt: serverTimestamp()
                                 });
                             } catch (e) {
                                 console.warn("關聯鳥事已不存在或更新失敗，跳過並繼續刪除勝利卡", e);
                             }
                         }
                     }
                     await moveToTrash('pk_wins', id);
                } else {
                    const collectionName = type === 'good' ? 'good_things' : 'bad_things';
                    await moveToTrash(collectionName, id);
                }
                
                btn.closest('.card-item').remove();
                // [修正] 移除 showSystemMessage("已移至垃圾桶");

            } else if (action === 'edit') {
                const collectionName = type === 'good' ? 'good_things' : 'bad_things';
                // [修正] 改用 getMyDoc
                const docSnap = await getDoc(getMyDoc(collectionName, id));
                if (docSnap.exists()) {
                    openEditor(type === 'good' ? 'good' : 'bad', { id: docSnap.id, ...docSnap.data() });
                }
            } else if (action === 'defeat') {
                // [修改] 移除這裡的 hidden，改在資料讀取完畢後再隱藏，避免等待時閃現首頁
                
                if (winId) {
                    // [新增] 點選「再擊敗」時的確認視窗 (視為開啟新戰局)
                    const confirmed = await showConfirmMessage("確定要重新發起 PK 挑戰嗎？\n（將扣除原本贏得的分數）", "重新開啟戰局", "取消");
                    if (!confirmed) return;

                    // [修改] 再擊敗邏輯：使用 getMyDoc
                    const winSnap = await getDoc(getMyDoc('pk_wins', winId));
                    let excludeTitle = null;
                    if (winSnap.exists()) {
                        excludeTitle = winSnap.data().goodTitle;
                    }

                    // [修正] 改用 getMyDoc
                    const docSnap = await getDoc(getMyDoc('bad_things', id));
                    if (docSnap.exists()) {
                        
                        if (winSnap.exists()) {
                            const oldScore = winSnap.data().score || 1;
                            await updateUserScore(-oldScore);
                        }

                        document.getElementById('warehouse-modal').classList.add('hidden'); // [移至此處]
                        // 注意：startPK 設定 isReDefeat: true，若中途離開，main.js 後段的 btnExitPK 邏輯會自動將狀態改回「未擊敗」(紅色按鈕) 並保留對話
                        startPK({ id: docSnap.id, ...docSnap.data() }, 'bad_things', { 
                            isReDefeat: true, 
                            excludeGoodTitle: excludeTitle,
                            associatedWinId: winId  
                        });
                        return;
                    }
                }
                
                // [修正] 改用 getMyDoc
                const docSnap = await getDoc(getMyDoc('bad_things', id));
                if (docSnap.exists()) {
                    document.getElementById('warehouse-modal').classList.add('hidden'); // [移至此處]
                    startPK({ id: docSnap.id, ...docSnap.data() }, 'bad_things');
                }

            } else if (action === 'review') {
                // [修正] 改用 getMyDoc
                const docSnap = await getDoc(getMyDoc('pk_wins', id));
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
        // [策略修正] 1. 資料庫查詢：使用 getMyCollection，移除 limit 以讀取全部資料
    const q = query(getMyCollection(collectionName), orderBy("createdAt", "desc"));
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
            // [安全修正] 使用 escapeHtml 包覆，防止 XSS 與顯示錯誤
            let displayTitle = escapeHtml(data.title);
            let displayContent = escapeHtml(data.content);
            
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
                // [修正] 勝利卡顯示「取得積分」而非等級
                labelText = `取得積分: ${data.score || 0}`;
                // [修正] 使用 escapeHtml 包覆內層資料
                displayTitle = `擊敗「${escapeHtml(data.badTitle)}」`;
                displayContent = `戰友：${escapeHtml(data.goodTitle)}`;

                // [修正] 回顧按鈕縮小
                const reviewBtnStyle = `height:28px; padding:0 12px; border-radius:14px; border:none; cursor:pointer; font-weight:bold; font-size:12px; background:#FFF9C4; color:#FBC02D;`;

                actionButtonsHTML = `
                    <button data-action="review" data-id="${docId}" data-type="wins" style="${reviewBtnStyle}">回顧勝利</button>
                    <button data-action="delete" data-id="${docId}" data-type="wins" style="${btnStyle}" title="刪除">${iconTrash}</button>
                `;
            }

            // [修正] 版面結構：標題/內容在一區，下方一列分為 左(等級/積分) 右(按鈕)
            // [修正] 加入 white-space: pre-wrap 與 word-break: break-all 確保長英文與換行正常顯示
            const cardHTML = `
                <div class="card-item" style="background: ${cardBg}; padding: 15px; border-radius: 12px; border: 1px solid #F0F0F0; box-shadow: 0 2px 5px rgba(0,0,0,0.03); display: flex; gap: 10px;">
                    <div style="width: 4px; background: ${iconColor}; border-radius: 2px;"></div>
                    <div style="flex: 1; display:flex; flex-direction:column; min-width: 0;"> 
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span style="font-weight: 700; color: var(--text-main); font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%;">${displayTitle}</span>
                            <span style="font-size: 12px; color: #BBB; flex-shrink: 0;">${date}</span>
                        </div>
                        <div style="font-size: 13px; color: #666; line-height: 1.4; flex:1; white-space: pre-wrap; word-break: break-all;">${displayContent}</div>
                        
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

// [修正] 增加 isCustomInput 與 useTrueRandom 參數
async function handlePKResult(winner, isCustomInput = false, useTrueRandom = false) {
    if (!currentUser) {
        showSystemMessage("請先登入才能紀錄 PK 結果！");
        return;
    }

    if (winner === 'bad') {
        // --- 使用者選了鳥事 (戰中換牌) --- 按下卡片自動開始召喚，不顯示按鈕
        
        // [修正] 只有在非自訂指令時，才顯示預設的抱怨文字
        if (!isCustomInput) {
             addChatMessage('user', "還是覺得這件鳥事比較強... 😤", true);
        }
        
        const defeatedTitle = currentPKContext.good?.title;
        // [修正] 若有好事卡標題則顯示落敗，若無(如未知好事)則僅顯示收到
        const sysMsg = defeatedTitle 
            ? `收到。「${defeatedTitle}」暫時落敗。\n正在運用創意召喚新卡片進行對決。`
            : "收到。\n正在運用創意召喚新卡片進行對決。";
        addChatMessage('system', sysMsg, true);

        // 重置標題與位階標題
        document.getElementById('pk-good-title').innerText = "重新部署中...";
        document.getElementById('pk-good-content').innerText = "正在運用創意選牌...";
        document.getElementById('pk-good-header').innerText = "好事";

        const floatArea = document.getElementById('pk-floating-area');
        floatArea.innerHTML = ''; // 清空

        // --- 1. 立即渲染正確按鈕 ---
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = "display:flex; gap:10px; justify-content:center; width:100%; pointer-events:auto; align-items:center; padding:0 10px;";
        
        const yellowStyle = "flex:1; padding:10px 0; background:#FFF9C4; color:#FBC02D; border:1.5px solid #FBC02D; border-radius:50px; font-weight:bold; font-size:13px; cursor:pointer; box-shadow:0 4px 10px rgba(251,192,45,0.1); pointer-events: auto; animation: pulse-btn 1.5s infinite ease-in-out; text-align:center;";
        const grayStyle = "flex:1; padding:10px 0; background:#F5F5F5; color:#AAA; border:1.5px solid #E0E0E0; border-radius:50px; font-weight:bold; font-size:13px; cursor:not-allowed; text-align:center; pointer-events:none;";

        const btnRandom = document.createElement('button');
        btnRandom.innerText = "隨機抽卡";
        btnRandom.style.cssText = yellowStyle;

        // [修正] 立即綁定點擊事件，避免 AI 失敗提早 return 導致按鈕無反應
        btnRandom.onclick = () => {
            if(btnRandom.disabled) return;
            // 參數3: true 代表使用真隨機
            handlePKResult('bad', true, true);
        };

        const btnChat = document.createElement('button');
        btnChat.innerText = "AI 思考中...";
        btnChat.style.cssText = grayStyle;
        btnChat.disabled = true;

        btnContainer.appendChild(btnRandom);
        btnContainer.appendChild(btnChat);
        floatArea.appendChild(btnContainer);

        let userIntervened = false;
        let selectedGoodThing = null;

        // 更新 UI 函式
        const updateCardUI = (card) => {
            if(!card) return;
            if (card.id) {
                currentPKContext.shownGoodCardIds.push(card.id);
                if (currentPKContext.shownGoodCardIds.length > 18) currentPKContext.shownGoodCardIds.shift();
            }
            currentPKContext.good = card;
            document.getElementById('pk-good-title').innerText = card.title;
            document.getElementById('pk-good-content').innerText = card.content;
            document.getElementById('pk-good-header').innerText = `好事 (Lv.${card.score || 1})`;
            selectedGoodThing = card;
            
            btnChat.style.cssText = yellowStyle;
            btnChat.innerText = "請說服我";
            btnChat.disabled = false;
        };

        // 按鈕邏輯：請說服我
        btnChat.onclick = async () => {
             btnChat.disabled = true;
             btnRandom.disabled = true;
             const originalText = btnChat.innerText;
             btnChat.innerText = "思考中...";
             
             const isRePersuade = (originalText === "再說服我");
             let prompt = "";
             if (isRePersuade) {
                 prompt = `【系統指令：使用者對目前的說法還不夠滿意。針對同一張好事卡（${selectedGoodThing.title}），請切換一個完全不同的角度，再次嘗試說服使用者這張牌為何能扭轉鳥事。】`;
             } else {
                 prompt = `【系統指令：使用者判定鳥事勝出。系統已選出新好事（${selectedGoodThing.title}）。請執行模式三：給出全新觀點，嘗試再次說服。】`;
             }
             
             const success = await callGeminiChat(prompt, true);
             if (success) {
                 btnChat.innerText = "再說服我";
                 btnChat.disabled = false;
                 btnRandom.disabled = false;
             } else {
                 btnChat.innerText = originalText;
                 btnChat.disabled = false;
                 btnRandom.disabled = false;
             }
        };

        try {
            // [修正] 改用 getMyCollection，移除 limit
            const q = query(getMyCollection("good_things"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                if (currentPKContext.good?.id) currentPKContext.shownGoodCardIds.push(currentPKContext.good.id);
                
                // [新增] Loading UI
                const loadingId = 'card-loading-' + Date.now();
                const chatHistory = document.getElementById('chat-history');
                const loadingDiv = document.createElement('div');
                loadingDiv.id = loadingId;
                loadingDiv.style.cssText = "align-self: flex-start; font-size: 12px; color: #CCC; margin-left: 10px; font-style: italic; margin-bottom: 10px;";
                loadingDiv.innerText = "正在分析戰局...";
                chatHistory.appendChild(loadingDiv);
                chatHistory.scrollTop = chatHistory.scrollHeight;

                const updateStatus = (msg) => {
                        const el = document.getElementById(loadingId);
                        if(el) el.innerText = msg;
                };

                let newGood = null;

                if (useTrueRandom) {
                    // --- 純系統隨機模式 (不透過 AI) ---
                    // 1. 過濾掉已顯示過的卡片
                    const candidates = querySnapshot.docs.filter(doc => !currentPKContext.shownGoodCardIds.includes(doc.id));
                    
                    if (candidates.length > 0) {
                        // 2. 隨機選出一張
                        const randomIndex = Math.floor(Math.random() * candidates.length);
                        const selectedDoc = candidates[randomIndex];
                        newGood = { id: selectedDoc.id, ...selectedDoc.data() };
                        
                        // 模擬一點點延遲，讓體驗更自然
                        await new Promise(r => setTimeout(r, 600));
                    } else {
                        // 如果全部都抽完了，清空紀錄重新來過，或放寬限制 (這裡選擇回傳 null 讓下面處理)
                        newGood = null;
                    }

                } else {
                    // --- AI 推薦模式 ---
                    newGood = await aiPickBestCard(currentPKContext.bad, querySnapshot.docs, currentPKContext.shownGoodCardIds, updateStatus);
                }
                
                const el = document.getElementById(loadingId);
                if(el) el.remove(); // 移除 Loading

                if (!newGood) {
                    if (useTrueRandom) {
                        addChatMessage('system', "倉庫裡的好事卡都用過一輪囉！無法再隨機選出了。", true);
                    } else {
                        addChatMessage('system', "AI 暫時找不到適合的好事卡，請點擊鳥事卡再次嘗試。", true);
                    }
                    return;
                }

                // 直接呼叫 updateCardUI 來更新介面並喚醒按鈕
                updateCardUI(newGood);
                // [修正] 成功選出後寫入紀錄
                addChatMessage('system', "✅ 已選出好事卡。", true);
            }
        } catch (e) { 
            console.error(e);
            addChatMessage('system', "AI 暫時找不到適合的好事卡，請點擊鳥事卡再次嘗試。", true);
        }
        return;
    }

    // --- 使用者選了好事 (勝利！) ---
    addChatMessage('user', "好事贏了！這點鳥事不算什麼！ ✨", true);
    
    currentPKContext.isVictory = true;
    const btnRePk = document.getElementById('btn-re-pk');
    if(btnRePk) btnRePk.style.display = 'flex'; 
    
    // [修正] 勝利後，強制移除「請說服我」按鈕
    const floatArea = document.getElementById('pk-floating-area');
    if(floatArea) floatArea.innerHTML = '';

    // 1. 計算積分
    // [修正] 嚴格落實計分邏輯：若以弱勝強，得分為鳥事分數加上兩者間的位階差
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
             // 使用 getMyDoc
             const winRef = getMyDoc("pk_wins", currentPKContext.winId);
             await updateDoc(winRef, {
                goodTitle: currentPKContext.good?.title || "未知好事",
                goodContent: currentPKContext.good?.content || "", 
                chatLogs: currentPKContext.chatLogs, 
                updatedAt: serverTimestamp()
             });
        } else {
            const winData = {
                // uid: currentUser.uid, // 移除 redundant uid
                badTitle: currentPKContext.bad?.title || "未知鳥事",
                badContent: currentPKContext.bad?.content || "", 
                badScore: parseInt(currentPKContext.bad?.score) || 1,

                goodTitle: currentPKContext.good?.title || "未知好事",
                goodContent: currentPKContext.good?.content || "", 
                goodScore: parseInt(currentPKContext.good?.score) || 1,

                score: scoreToAdd,
                chatLogs: currentPKContext.chatLogs,
                originalBadId: currentPKContext.collection === 'bad_things' ? currentPKContext.docId : null,
                createdAt: serverTimestamp()
            };

            // 使用 getMyCollection
            const winRef = await addDoc(getMyCollection("pk_wins"), winData);
            currentPKContext.winId = winRef.id; 

            if (currentPKContext.collection === 'bad_things' && currentPKContext.docId) {
                // 使用 getMyDoc
                await updateDoc(getMyDoc("bad_things", currentPKContext.docId), {
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
