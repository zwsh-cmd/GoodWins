// --- 1. 引入 Firebase ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

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
        font-size:15px; 
        color:var(--text-main); 
        outline:none; 
        -webkit-appearance: none; 
        appearance: none;
    `;

    // 修改重點：
    // 1. label 改為「好事等級」
    // 2. input 加上 placeholder
    // 3. 加上 autocomplete="off" 避免瀏覽器跳出歷史選單
    const editorHTML = `
    <div id="editor-modal" class="hidden" style="position: absolute; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.98); z-index:500; display: flex; flex-direction: column;">
        <div style="flex:1; display:flex; flex-direction:column; padding:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <button id="btn-cancel-edit" style="background:none; border:none; color:#999; font-size:16px; cursor:pointer;">取消</button>
                <h3 id="editor-title" style="margin:0; font-size:18px; font-weight:700; color:var(--text-main);">記錄好事</h3>
                <button id="btn-save-edit" style="background:none; border:none; color:var(--primary); font-weight:700; font-size:16px; cursor:pointer;">儲存</button>
            </div>

            <input id="input-title" type="text" placeholder="輸入標題..." autocomplete="off" name="gw-title-field" style="width:100%; padding:15px 0; border:none; border-bottom:1px solid #EEE; font-size:20px; font-weight:700; outline:none; background:transparent; color:var(--text-main); margin-bottom:10px;">
            
            <textarea id="input-content" placeholder="輸入內容..." name="gw-content-field" style="width:100%; flex:1; padding:15px 0; border:none; font-size:16px; outline:none; resize:none; background:transparent; line-height:1.6; color:var(--text-main);"></textarea>
            
            <div style="padding:20px 0;">
                <div style="margin-bottom:15px;">
                    <label id="label-score" style="font-size:12px; color:#999; display:block; margin-bottom:5px;">好事等級</label>
                    <select id="input-score" style="${selectStyle}">
                        <option value="1">1分 - 微好事 (Micro)</option>
                        <option value="2">2分 - 小好事 (Small)</option>
                        <option value="3">3分 - 中好事 (Medium)</option>
                        <option value="4">4分 - 大好事 (Big)</option>
                        <option value="5">5分 - 神聖好事 (Divine)</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:12px; color:#999; display:block; margin-bottom:5px;">來源</label>
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

// --- 新增：通用提示視窗元件 (取代原生 alert) ---
function createGlobalComponents() {
    if (document.getElementById('system-alert')) return;

    const alertHTML = `
    <div id="system-alert" class="hidden" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.3); z-index: 1000; display: flex; align-items: center; justify-content: center;">
        <div style="background: #FFF; width: 80%; max-width: 300px; padding: 24px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); text-align: center; display: flex; flex-direction: column; gap: 16px;">
            <div id="alert-msg" style="font-size: 15px; color: var(--text-main); line-height: 1.6; white-space: pre-line;"></div>
            <button id="btn-alert-ok" style="background: var(--primary); color: white; border: none; padding: 12px; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; width: 100%;">我知道了</button>
        </div>
    </div>
    `;
    const wrapper = document.getElementById('mobile-wrapper');
    if(wrapper) wrapper.insertAdjacentHTML('beforeend', alertHTML);

    document.getElementById('btn-alert-ok').addEventListener('click', () => {
        document.getElementById('system-alert').classList.add('hidden');
    });
}
createGlobalComponents(); // 馬上建立

// 封裝顯示函式 (之後都呼叫這個)
function showSystemMessage(msg) {
    const alertEl = document.getElementById('system-alert');
    const msgEl = document.getElementById('alert-msg');
    if(alertEl && msgEl) {
        msgEl.innerText = msg;
        alertEl.classList.remove('hidden');
    } else {
        alert(msg); // 備用
    }
}

// --- 動態生成 PK 畫面 (修正版：無框線、無PK字樣、修復聊天) ---
function createPKScreenHTML() {
    if (document.getElementById('pk-screen')) return;

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
            
            <div style="display: flex; align-items: stretch; gap: 15px; flex-shrink: 0;">
                <div class="action-card" style="flex: 1; cursor: default; padding: 20px; background: var(--bad-light); border: none; border-radius: 20px; display: flex; flex-direction: column; gap: 8px;">
                    <div style="color: var(--bad-icon); font-size: 13px; font-weight: 700;">鳥事</div>
                    <div style="flex: 1;">
                        <h3 id="pk-bad-title" style="margin: 0 0 6px 0; font-size: 16px; color: var(--text-main); line-height: 1.4;">(標題)</h3>
                        <p id="pk-bad-content" style="margin: 0; font-size: 13px; color: var(--text-main); opacity: 0.8; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">(內容...)</p>
                    </div>
                </div>

                <div class="action-card" style="flex: 1; cursor: default; padding: 20px; background: var(--good-light); border: none; border-radius: 20px; display: flex; flex-direction: column; gap: 8px;">
                     <div style="color: var(--good-icon); font-size: 13px; font-weight: 700;">好事</div>
                     <div style="flex: 1;">
                        <h3 id="pk-good-title" style="margin: 0 0 6px 0; font-size: 16px; color: var(--text-main); line-height: 1.4;">(標題)</h3>
                        <p id="pk-good-content" style="margin: 0; font-size: 13px; color: var(--text-main); opacity: 0.8; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">(內容...)</p>
                    </div>
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
        
        // --- 關鍵修復：在這裡直接綁定聊天按鈕，保證一定抓得到 ---
        const btnSend = document.getElementById('btn-send-chat');
        const inputChat = document.getElementById('chat-input');
        
        const handleSend = async () => {
            const text = inputChat.value.trim();
            if (!text) return;
            addChatMessage('user', text);
            inputChat.value = '';
            await callGeminiChat(text);
        };

        if(btnSend) btnSend.addEventListener('click', handleSend);
        if(inputChat) {
            inputChat.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleSend();
            });
        }
    }
}
createPKScreenHTML();


// --- 5. 變數與 DOM 抓取 (介面產生後才能抓) ---
let currentUser = null;
let currentMode = '';

const screens = {
    login: document.getElementById('login-screen'),
    app: document.getElementById('app-screen'),
    apiModal: document.getElementById('api-modal'),
    editor: document.getElementById('editor-modal'),
    pk: document.getElementById('pk-screen'),
    warehouse: document.getElementById('warehouse-modal') // 新增倉庫
};

// 補上 PK 離開按鈕的監聽
const btnExitPK = document.getElementById('btn-exit-pk');
if(btnExitPK) {
    btnExitPK.addEventListener('click', () => {
        screens.pk.classList.add('hidden');
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
    saveEdit: document.getElementById('btn-save-edit')
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

// [修改] 綁定主畫面的搜尋按鈕 -> 顯示提示
const btnSearch = document.getElementById('btn-search');
if (btnSearch) {
    btnSearch.addEventListener('click', () => {
        showSystemMessage("🔍 搜尋功能開發中...\n(請點擊左邊的資料夾圖示開啟倉庫)");
    });
}

// [新增] 綁定主畫面的倉庫按鈕 -> 開啟倉庫
const btnWarehouseEntry = document.getElementById('btn-warehouse-entry');
if (btnWarehouseEntry) {
    btnWarehouseEntry.addEventListener('click', () => {
        // 確保倉庫視窗變數已抓取
        if (!screens.warehouse) screens.warehouse = document.getElementById('warehouse-modal');
        
        if (screens.warehouse) {
            screens.warehouse.classList.remove('hidden');
            loadWarehouseData('good'); // 預設載入好事
        }
    });
}

// 登入
btns.login.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(err => alert("登入失敗: " + err.message));
});

// 開啟編輯器 (使用 querySelector 因為這些是 class)
const btnGood = document.querySelector('.card-good');
const btnBad = document.querySelector('.card-bad');

// 移除 HTML 中舊有的 onclick alert
if (btnGood) btnGood.removeAttribute('onclick');
if (btnBad) btnBad.removeAttribute('onclick');

if (btnGood) {
    btnGood.addEventListener('click', () => {
        openEditor('good');
    });
}

if (btnBad) {
    btnBad.addEventListener('click', () => {
        openEditor('bad');
    });
}

// 取消編輯
btns.cancelEdit.addEventListener('click', () => {
    screens.editor.classList.add('hidden');
});

// 儲存邏輯
btns.saveEdit.addEventListener('click', async () => {
    const title = inputs.title.value.trim();
    const content = inputs.content.value.trim();
    const score = parseInt(inputs.score.value);
    const source = inputs.source.value;

    if (!title || !content) {
        showSystemMessage("標題和內容都要寫喔！"); // 改用新提示窗
        return;
    }

    const originalText = btns.saveEdit.innerText;
    btns.saveEdit.innerText = "儲存中...";
    btns.saveEdit.disabled = true;

    try {
        const collectionName = currentMode === 'good' ? 'good_things' : 'bad_things';
        
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout")), 5000)
        );

        const addDocPromise = addDoc(collection(db, collectionName), {
            uid: currentUser.uid,
            title: title,
            content: content,
            score: score,
            source: source,
            createdAt: serverTimestamp()
        });

        await Promise.race([addDocPromise, timeoutPromise]);

        screens.editor.classList.add('hidden'); 

        if (currentMode === 'bad') {
            startPK({ title, content });
        } else {
            showSystemMessage("✨ 好事已記錄！\n累積正能量 +1"); // 改用新提示窗
        }

    } catch (e) {
        console.error("Error:", e);
        
        let msg = "儲存失敗：" + e.message;
        if (e.message === "Timeout" || e.code === "unavailable") {
            msg = "儲存逾時！\n看起來是「資料庫沒開」或「網路不通」。\n\n請去 Firebase Console 檢查。";
        } else if (e.message.includes("permission-denied")) {
             msg = "儲存失敗：權限不足。\n請檢查 Firebase Console 的 Rules 設定。";
        }
        
        showSystemMessage(msg); // 改用新提示窗
    } finally {
        btns.saveEdit.innerText = originalText;
        btns.saveEdit.disabled = false;
    }
});

// 全域變數，紀錄當前 PK 的上下文，讓聊天時 AI 知道狀況
let currentPKContext = { bad: null, good: null };

// --- PK 核心邏輯 (乾淨版) ---
async function startPK(badThing) {
    screens.pk.classList.remove('hidden');
    document.getElementById('pk-bad-title').innerText = badThing.title;
    document.getElementById('pk-bad-content').innerText = badThing.content;

    // 清空聊天紀錄
    const chatHistory = document.getElementById('chat-history');
    chatHistory.innerHTML = '';
    
    // 存入上下文
    currentPKContext.bad = badThing;
    
    // 顯示純文字系統訊息
    addChatMessage('system', "正在搜尋好事庫...");

    try {
        const q = query(collection(db, "good_things"), orderBy("createdAt", "desc"), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const goodThing = querySnapshot.docs[0].data();
            currentPKContext.good = goodThing; 
            
            document.getElementById('pk-good-title').innerText = goodThing.title;
            document.getElementById('pk-good-content').innerText = goodThing.content;
            
            callGeminiChat("請比較這兩件事，並用溫暖的語氣告訴我，為什麼這件好事的價值勝過那件鳥事？");

        } else {
            document.getElementById('pk-good-title').innerText = "尚無好事";
            document.getElementById('pk-good-content').innerText = "尚無資料";
            addChatMessage('ai', "你的彈藥庫空空的！快去記錄一件好事，再來 PK 吧！");
        }

    } catch (e) {
        console.error("PK Error:", e);
        addChatMessage('system', "系統錯誤：請確認網路或資料庫連線。");
    }
}

// --- 聊天功能模組 ---

// 1. 在畫面上新增一條訊息 (風格一致版)
function addChatMessage(sender, text) {
    const chatHistory = document.getElementById('chat-history');
    const msgDiv = document.createElement('div');
    
    // 設定樣式
    if (sender === 'ai') {
        // AI 訊息：淺灰底，無圖示，純文字
        msgDiv.style.cssText = "align-self: flex-start; background: #F7F7F7; padding: 14px 16px; border-radius: 16px 16px 16px 4px; font-size: 14px; color: var(--text-main); line-height: 1.6; max-width: 85%;";
        msgDiv.innerHTML = `<div style="font-weight:700; font-size:12px; color:#AAA; margin-bottom:4px;">AI</div>${text}`;
    } else if (sender === 'user') {
        // 使用者訊息：主色調底，白字
        msgDiv.style.cssText = "align-self: flex-end; background: var(--primary); color: #FFF; padding: 12px 16px; border-radius: 16px 16px 4px 16px; font-size: 14px; line-height: 1.6; max-width: 85%; box-shadow: 0 2px 5px rgba(0,0,0,0.1);";
        msgDiv.innerText = text;
    } else { 
        // 系統訊息：極簡灰字
        msgDiv.style.cssText = "align-self: center; padding: 8px; font-size: 12px; color: #BBB;";
        msgDiv.innerText = text;
    }
    
    chatHistory.appendChild(msgDiv);
    // 自動捲動到底部
    chatHistory.scrollTop = chatHistory.scrollHeight; 
}



// 3. 呼叫 Gemini API (自動輪詢多個模型版本)
async function callGeminiChat(userMessage) {
    const apiKey = sessionStorage.getItem('gemini_key');
    if (!apiKey) {
        addChatMessage('system', "請先點擊設定輸入 API Key。");
        return;
    }

    const loadingId = 'loading-' + Date.now();
    const chatHistory = document.getElementById('chat-history');
    const loadingDiv = document.createElement('div');
    loadingDiv.id = loadingId;
    loadingDiv.innerText = "Thinking...";
    loadingDiv.style.cssText = "align-self: flex-start; font-size: 12px; color: #CCC; margin-left: 10px; font-style: italic;";
    chatHistory.appendChild(loadingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // 定義要嘗試的模型清單 (精簡版：避免觸發 429 請求限制)
    const modelsToTry = [
        "gemini-2.5-flash",      // 最強大腦 (優先)
        "gemini-1.5-flash",    // 速度快 (候補)
        "gemini-1.0-pro"       // 穩定版 (保底)
    ];

    try {
        const bad = currentPKContext.bad;
        const good = currentPKContext.good;
        
        const prompt = `
            我們正在進行一場「好事 vs 鳥事」的 PK。
            【鳥事】：${bad ? bad.title + '-' + bad.content : '無'}
            【好事】：${good ? good.title + '-' + good.content : '無'}
            
            使用者的訊息：${userMessage}
            
            請扮演一位智慧的人生導師。
            重點分析：為什麼這張「好事卡」的價值可以打敗「鳥事卡」。
            限制：
            1. 回應長度請控制在 200 字以內。
            2. 講重點，不要廢話。
            3. 如果理由很簡單，50字以內也沒問題。
            請用繁體中文回答，不使用 Emoji。
        `;

        let successData = null;
        let lastError = null;

        // --- 自動輪詢迴圈：一個一個試 ---
        for (const model of modelsToTry) {
            try {
                // console.log(`Trying model: ${model}...`);
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.candidates && data.candidates[0].content) {
                        successData = data;
                        break; // 成功了！跳出迴圈
                    }
                } else {
                    // 如果失敗 (例如 404)，就記錄錯誤並繼續試下一個
                    const errText = await response.text();
                    lastError = `Model ${model} error: ${response.status}`;
                }
            } catch (err) {
                lastError = err.message;
            }
        }

        const loadingEl = document.getElementById(loadingId);
        if(loadingEl) loadingEl.remove();

        if (successData) {
            const aiText = successData.candidates[0].content.parts[0].text;
            addChatMessage('ai', aiText);
        } else {
            console.error("All models failed. Last error:", lastError);
            addChatMessage('system', "AI 暫時無法回應 (所有模型皆忙碌或 Key 無效)。");
        }

    } catch (e) {
        console.error(e);
        const loadingEl = document.getElementById(loadingId);
        if(loadingEl) loadingEl.remove();
        addChatMessage('system', "連線發生嚴重錯誤。");
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

function openEditor(mode) {
    currentMode = mode;
    inputs.title.value = '';
    inputs.content.value = '';
    inputs.score.value = '1';
    inputs.source.value = 'personal';

    const titleEl = document.getElementById('editor-title');
    // 使用 ID 抓取 label (因為我們剛剛在 HTML 裡加了 ID)
    const scoreLabel = document.getElementById('label-score') || inputs.score.previousElementSibling;
    const scoreSelect = inputs.score;

    if (mode === 'good') {
        // --- 好事模式 ---
        titleEl.innerText = "記錄一件好事";
        titleEl.style.color = "var(--good-icon)";
        
        // 設定提示詞
        inputs.title.placeholder = "標題 (例如：迷路時遇到好心人指路)";
        inputs.content.placeholder = "寫下發生的經過...";
        
        // 設定等級標籤
        if (scoreLabel) scoreLabel.innerText = "好事等級";
        
        scoreSelect.innerHTML = `
            <option value="1">1分 - 微好事 (Micro)</option>
            <option value="2">2分 - 小好事 (Small)</option>
            <option value="3">3分 - 中好事 (Medium)</option>
            <option value="4">4分 - 大好事 (Big)</option>
            <option value="5">5分 - 神聖好事 (Divine)</option>
        `;
    } else {
        // --- 鳥事模式 ---
        titleEl.innerText = "記錄一件鳥事";
        titleEl.style.color = "var(--bad-icon)";
        
        // 設定提示詞
        inputs.title.placeholder = "標題 (例如：商家服務態度不太好)";
        inputs.content.placeholder = "寫下發生的經過...";
        
        // 設定等級標籤
        if (scoreLabel) scoreLabel.innerText = "鳥事等級";
        
        scoreSelect.innerHTML = `
            <option value="1">1分 - 微鳥事 (Micro)</option>
            <option value="2">2分 - 小鳥事 (Small)</option>
            <option value="3">3分 - 中鳥事 (Medium)</option>
            <option value="4">4分 - 大鳥事 (Big)</option>
            <option value="5">5分 - 魔王鳥事 (Monster)</option>
        `;
    }
    screens.editor.classList.remove('hidden');
}

// --- 8. 倉庫 (Warehouse) 功能模組 ---
function createWarehouseHTML() {
    if (document.getElementById('warehouse-modal')) return;

    const warehouseHTML = `
    <div id="warehouse-modal" class="hidden" style="position: absolute; top:0; left:0; width:100%; height:100%; background:#FAFAFA; z-index:200; display: flex; flex-direction: column;">
        <header style="padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; background: #FFF; border-bottom: 1px solid #EEE;">
            <div style="font-size: 18px; font-weight: 800; color: var(--text-main);">卡片倉庫</div>
            <button id="btn-close-warehouse" style="background:none; border:none; padding:8px; cursor:pointer; font-size:14px; color:#999;">關閉</button>
        </header>
        <div style="padding: 10px 20px; display: flex; gap: 10px;">
            <button id="tab-good" style="flex: 1; padding: 10px; border: none; border-radius: 10px; background: var(--good-light); color: var(--good-icon); font-weight: 700; cursor: pointer;">好事卡</button>
            <button id="tab-bad" style="flex: 1; padding: 10px; border: none; border-radius: 10px; background: #EEE; color: #999; font-weight: 700; cursor: pointer;">鳥事卡</button>
        </div>
        <div id="warehouse-list" style="flex: 1; overflow-y: auto; padding: 0 20px 20px 20px; display: flex; flex-direction: column; gap: 10px;">
            <div style="text-align:center; color:#999; margin-top:50px;">載入中...</div>
        </div>
    </div>
    `;
    
    const wrapper = document.getElementById('mobile-wrapper');
    if(wrapper) wrapper.insertAdjacentHTML('beforeend', warehouseHTML);

    // 綁定倉庫內部按鈕
    document.getElementById('btn-close-warehouse').addEventListener('click', () => {
        document.getElementById('warehouse-modal').classList.add('hidden');
    });

    document.getElementById('tab-good').addEventListener('click', () => loadWarehouseData('good'));
    document.getElementById('tab-bad').addEventListener('click', () => loadWarehouseData('bad'));
}

// 建立倉庫 HTML
createWarehouseHTML();

// 綁定 PK 畫面的「倉庫」按鈕 (因為 HTML 是動態生成的，這裡要延遲綁定或確保元素存在)
// 這裡我們利用事件委派，或是直接抓取 (因為 createPKScreenHTML 已經執行過)
const btnOpenWarehouse = document.getElementById('btn-open-warehouse');
if(btnOpenWarehouse) {
    btnOpenWarehouse.addEventListener('click', () => {
        // 更新 screens 物件，確保抓得到新生成的 warehouse-modal
        screens.warehouse = document.getElementById('warehouse-modal'); 
        screens.warehouse.classList.remove('hidden');
        loadWarehouseData('good'); // 預設載入好事
    });
}

// 載入倉庫資料
async function loadWarehouseData(type) {
    const listEl = document.getElementById('warehouse-list');
    const tabGood = document.getElementById('tab-good');
    const tabBad = document.getElementById('tab-bad');
    
    listEl.innerHTML = '<div style="text-align:center; color:#999; margin-top:50px;">讀取中...</div>';

    // 切換 Tab 樣式
    if(type === 'good') {
        tabGood.style.background = 'var(--good-light)'; tabGood.style.color = 'var(--good-icon)';
        tabBad.style.background = '#EEE'; tabBad.style.color = '#999';
    } else {
        tabGood.style.background = '#EEE'; tabGood.style.color = '#999';
        tabBad.style.background = 'var(--bad-light)'; tabBad.style.color = 'var(--bad-icon)';
    }

    const collectionName = type === 'good' ? 'good_things' : 'bad_things';

    try {
        // 抓取最近 20 筆
        const q = query(collection(db, collectionName), orderBy("createdAt", "desc"), limit(20));
        const querySnapshot = await getDocs(q);
        
        listEl.innerHTML = ''; // 清空

        if (querySnapshot.empty) {
            listEl.innerHTML = '<div style="text-align:center; color:#CCC; margin-top:50px;">這裡空空的</div>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const date = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : '剛剛';
            const cardColor = type === 'good' ? 'var(--good-light)' : 'var(--bad-light)';
            const iconColor = type === 'good' ? 'var(--good-icon)' : 'var(--bad-icon)';

            const cardHTML = `
                <div style="background: #FFF; padding: 15px; border-radius: 12px; border: 1px solid #F0F0F0; box-shadow: 0 2px 5px rgba(0,0,0,0.03); display: flex; gap: 10px;">
                    <div style="width: 4px; background: ${iconColor}; border-radius: 2px;"></div>
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span style="font-weight: 700; color: var(--text-main); font-size: 15px;">${data.title}</span>
                            <span style="font-size: 12px; color: #BBB;">${date}</span>
                        </div>
                        <div style="font-size: 13px; color: #666; line-height: 1.4;">${data.content}</div>
                        <div style="margin-top: 8px; font-size: 12px; color: ${iconColor}; font-weight: 700;">
                            等級: ${data.score || 1}
                        </div>
                    </div>
                </div>
            `;
            listEl.insertAdjacentHTML('beforeend', cardHTML);
        });

    } catch (e) {
        console.error("Load Error:", e);
        listEl.innerHTML = '<div style="text-align:center; color:red; margin-top:50px;">讀取失敗，請檢查網路</div>';
    }
}
