// --- 1. 引入 Firebase ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
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

    // [修改] 加大輸入框字體
    const editorHTML = `
    <div id="editor-modal" class="hidden" style="position: absolute; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.98); z-index:500; display: flex; flex-direction: column;">
        <div style="flex:1; display:flex; flex-direction:column; padding:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <button id="btn-cancel-edit" style="background:none; border:none; color:#999; font-size:16px; cursor:pointer;">取消</button>
                <h3 id="editor-title" style="margin:0; font-size:18px; font-weight:700; color:var(--text-main);">記錄好事</h3>
                <button id="btn-save-edit" style="background:none; border:none; color:var(--primary); font-weight:700; font-size:16px; cursor:pointer;">儲存</button>
            </div>

            <input id="input-title" type="text" placeholder="輸入標題..." autocomplete="off" name="gw-title-field" style="width:100%; padding:15px 0; border:none; border-bottom:1px solid #EEE; font-size:24px; font-weight:700; outline:none; background:transparent; color:var(--text-main); margin-bottom:10px;">
            
            <textarea id="input-content" placeholder="輸入內容..." name="gw-content-field" style="width:100%; flex:1; padding:15px 0; border:none; font-size:18px; outline:none; resize:none; background:transparent; line-height:1.6; color:var(--text-main);"></textarea>
            
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

    // [修改] 在好事卡和鳥事卡中間加入「重新PK」按鈕
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
            
            <div style="display: flex; align-items: stretch; gap: 10px; flex-shrink: 0;">
                <div id="btn-pk-bad" class="action-card" style="flex: 1; cursor: pointer; padding: 20px; background: var(--bad-light); border: 2px solid transparent; border-radius: 20px; display: flex; flex-direction: column; gap: 8px; transition: transform 0.2s;">
                    <div style="color: var(--bad-icon); font-size: 13px; font-weight: 700;">鳥事</div>
                    <div style="flex: 1;">
                        <h3 id="pk-bad-title" style="margin: 0 0 6px 0; font-size: 16px; color: var(--text-main); line-height: 1.4;">(標題)</h3>
                        <p id="pk-bad-content" style="margin: 0; font-size: 13px; color: var(--text-main); opacity: 0.8; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">(內容...)</p>
                    </div>
                </div>

                <div id="btn-re-pk" style="width: 40px; display:none; flex-direction:column; justify-content:center; align-items:center; background:#EEE; border-radius:12px; cursor:pointer; gap:4px;">
                    <svg viewBox="0 0 24 24" style="width:20px; height:20px; fill:none; stroke:#666; stroke-width:2;"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                    <span style="font-size:12px; font-weight:bold; color:#666; writing-mode: vertical-rl;">重來</span>
                </div>

                <div id="btn-pk-good" class="action-card" style="flex: 1; cursor: pointer; padding: 20px; background: var(--good-light); border: 2px solid transparent; border-radius: 20px; display: flex; flex-direction: column; gap: 8px; transition: transform 0.2s;">
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
        
        // --- 聊天按鈕綁定 ---
        const btnSend = document.getElementById('btn-send-chat');
        const inputChat = document.getElementById('chat-input');
        
        const handleSend = async () => {
            const text = inputChat.value.trim();
            if (!text) return;
            // 呼叫新版 addChatMessage，會自動存入 DB
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

        // --- 新增：PK 勝負判定按鈕綁定 ---
        const btnPkBad = document.getElementById('btn-pk-bad');
        const btnPkGood = document.getElementById('btn-pk-good');

        if(btnPkBad) {
            btnPkBad.addEventListener('click', () => handlePKResult('bad'));
        }
        if(btnPkGood) {
            btnPkGood.addEventListener('click', () => handlePKResult('good'));
        }

        // --- 新增：重新 PK 按鈕綁定 ---
        const btnRePK = document.getElementById('btn-re-pk');
        if(btnRePK) {
            btnRePK.addEventListener('click', async () => {
                if(confirm("確定要重新 PK 嗎？\n這將會開啟一場新的對決，並重新選擇好事。")) {
                    // 使用當前鳥事資訊重新開始 PK
                    // 注意：此時 currentPKContext.bad 應該要有標題和內容
                    if(currentPKContext.bad) {
                        // 強制轉為 bad_things 模式，視為新的 PK
                        await startPK({
                            id: 'temp-' + Date.now(), // 臨時 ID，真正存檔時會產生新的或覆蓋
                            title: currentPKContext.bad.title,
                            content: currentPKContext.bad.content
                        }, 'bad_things');
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

// 儲存邏輯 (支援新增與編輯)
btns.saveEdit.addEventListener('click', async () => {
    const title = inputs.title.value.trim();
    const content = inputs.content.value.trim();
    const score = parseInt(inputs.score.value);
    const source = inputs.source.value;

    if (!title || !content) {
        showSystemMessage("標題和內容都要寫喔！");
        return;
    }

    const originalText = btns.saveEdit.innerText;
    btns.saveEdit.innerText = "處理中...";
    btns.saveEdit.disabled = true;

    try {
        const collectionName = currentMode === 'good' ? 'good_things' : 'bad_things';
        
        if (editingId) {
            // --- 編輯模式：更新舊資料 ---
            const docRef = doc(db, collectionName, editingId);
            await updateDoc(docRef, {
                title: title,
                content: content,
                score: score,
                source: source,
                updatedAt: serverTimestamp()
            });
        } else {
            // --- 新增模式：建立新資料 ---
            await addDoc(collection(db, collectionName), {
                uid: currentUser.uid,
                title: title,
                content: content,
                score: score,
                source: source,
                createdAt: serverTimestamp()
            });
        }

        screens.editor.classList.add('hidden'); 

        // 如果是鳥事，無論新增或編輯，都直接開始 PK
        if (currentMode === 'bad') {
            startPK({ title, content });
        } else {
            showSystemMessage("✨ 好事已儲存！");
        }
        
        // 如果倉庫開著，重整列表
        if (!screens.warehouse.classList.contains('hidden')) {
            loadWarehouseData(currentMode);
        }

    } catch (e) {
        console.error("Error:", e);
        showSystemMessage("儲存失敗：" + e.message);
    } finally {
        btns.saveEdit.innerText = originalText;
        btns.saveEdit.disabled = false;
    }
});;

// 全域變數，紀錄當前 PK 的上下文，讓聊天時 AI 知道狀況
let currentPKContext = { bad: null, good: null };

// --- PK 核心邏輯 (保存對話版) ---
async function startPK(data, collectionSource) {
    screens.pk.classList.remove('hidden');
    const chatHistory = document.getElementById('chat-history');
    chatHistory.innerHTML = ''; // 先清空介面

    const btnRePk = document.getElementById('btn-re-pk');

    // 設定上下文 (包含來源 collection，便於儲存對話)
    currentPKContext = {
        docId: data.id,
        collection: collectionSource,
        bad: null,
        good: null,
        chatLogs: data.chatLogs || [] // 載入歷史對話
    };

    // 判斷是「新/進行中的 PK」還是「已勝利的回顧」
    if (collectionSource === 'pk_wins') {
        // --- 勝利回顧模式 ---
        if(btnRePk) btnRePk.style.display = 'flex'; // 顯示重新PK按鈕

        document.getElementById('pk-bad-title').innerText = data.badTitle;
        document.getElementById('pk-bad-content').innerText = data.badContent || "(已克服的鳥事)";
        document.getElementById('pk-good-title').innerText = data.goodTitle;
        document.getElementById('pk-good-content').innerText = data.goodContent || "(獲勝的好事)";
        
        currentPKContext.bad = { title: data.badTitle, content: data.badContent };
        currentPKContext.good = { title: data.goodTitle, content: data.goodContent };

        // 渲染歷史對話
        if (currentPKContext.chatLogs.length > 0) {
            currentPKContext.chatLogs.forEach(log => addChatMessage(log.role, log.text, false)); // false 表示不重複存檔
        } else {
            addChatMessage('system', "此紀錄沒有對話存檔。");
        }
        
    } else {
        // --- 進行中的 PK (鳥事) ---
        if(btnRePk) btnRePk.style.display = 'none'; // 隱藏重新PK按鈕

        document.getElementById('pk-bad-title').innerText = data.title;
        document.getElementById('pk-bad-content').innerText = data.content;
        currentPKContext.bad = data;

        // 渲染歷史對話
        if (currentPKContext.chatLogs.length > 0) {
            currentPKContext.chatLogs.forEach(log => addChatMessage(log.role, log.text, false));
            // 如果有舊紀錄，就不自動發起新話題，除非這是剛開始
        }

        // 只有當沒有 Good Thing (剛開始) 時，才去抓
        try {
            const q = query(collection(db, "good_things"), orderBy("createdAt", "desc"), limit(5)); // 抓前5個隨機
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const docs = querySnapshot.docs;
                const randomDoc = docs[Math.floor(Math.random() * docs.length)];
                const goodThing = randomDoc.data();
                
                currentPKContext.good = goodThing;
                document.getElementById('pk-good-title').innerText = goodThing.title;
                document.getElementById('pk-good-content').innerText = goodThing.content;

                // 如果完全沒有對話紀錄，才主動發起第一句話
                if (currentPKContext.chatLogs.length === 0) {
                    callGeminiChat("請比較這兩件事，並開啟話題。");
                }
            } else {
                document.getElementById('pk-good-title').innerText = "尚無好事";
                document.getElementById('pk-good-content').innerText = "去記錄點好事吧！";
                addChatMessage('ai', "你的彈藥庫空空的！快去記錄一件好事，再來 PK 吧！");
            }
        } catch (e) {
            console.error("PK Error:", e);
            addChatMessage('system', "讀取好事失敗。");
        }
    }
}

// --- 聊天功能模組 ---

// 1. 在畫面上新增訊息，並同步儲存到資料庫
async function addChatMessage(sender, text, saveToDb = true) {
    const chatHistory = document.getElementById('chat-history');
    const msgDiv = document.createElement('div');
    
    if (sender === 'ai') {
        msgDiv.style.cssText = "align-self: flex-start; background: #F7F7F7; padding: 14px 16px; border-radius: 16px 16px 16px 4px; font-size: 14px; color: var(--text-main); line-height: 1.6; max-width: 85%;";
        msgDiv.innerHTML = `<div style="font-weight:700; font-size:12px; color:#AAA; margin-bottom:4px;">AI</div>${text}`;
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
    if (saveToDb && currentPKContext.docId && sender !== 'system') {
        try {
            const docRef = doc(db, currentPKContext.collection, currentPKContext.docId);
            const newMessage = { role: sender, text: text, time: Date.now() };
            
            // 使用 arrayUnion 加入陣列
            await updateDoc(docRef, {
                chatLogs: arrayUnion(newMessage)
            });
            
            // 更新本地上下文
            currentPKContext.chatLogs.push(newMessage);
        } catch (e) {
            console.error("Save chat error:", e);
        }
    }
}

// 3. 呼叫 Gemini API (包含對話記憶與完整 Prompt 邏輯)
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

    const modelsToTry = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.0-pro"];

    try {
        const bad = currentPKContext.bad;
        const good = currentPKContext.good;
        
        // 構建上下文歷史 (取最近 6 則)
        const historyText = currentPKContext.chatLogs.slice(-6)
            .map(log => `${log.role === 'user' ? '使用者' : '你'}: ${log.text}`)
            .join('\n');

        // [關鍵修改] 融合舊有詳細邏輯 + 新增的限制與辯證需求
        const prompt = `
            情境：使用者正在使用「GoodWins」APP，進行「好事 vs 鳥事」的 PK 對抗。
            【鳥事 (Bad Thing)】：${bad ? bad.title + ' - ' + bad.content : '無'}
            【好事 (Good Thing)】：${good ? good.title + ' - ' + good.content : '無'}
            【之前的對話脈絡】：
            ${historyText}
            【使用者目前的訊息】：${userMessage}

            角色設定：你不是高高在上的導師，也不是盲目灌雞湯的機器人。你是使用者身邊一位「理性、幽默且溫暖的朋友」。
            
            核心任務 (請融合以下邏輯)：
            1. 【同理情緒】：先接住使用者的情緒（例如：遇到這種事真的很煩），不要一上來就說教。
            2. 【脈絡意識】：請參考【之前的對話脈絡】，不要重複你已經說過的論點。如果使用者在閒聊，就自然回應。
            3. 【理性說服】：運用理性客觀的角度，說明「為什麼這件好事的光明面，足以證明世界沒有那麼糟」。請參考以下「好事選擇邏輯」來論述：
               - (如果兩件事性質相似)：強調「你看，雖然有那種鳥事，但同樣情境下也有這樣溫暖的好事發生，人性還是有光輝的。」
               - (如果性質不同但等級相當)：強調「雖然鳥事很扣分，但這件好事的價值和快樂足以抵銷那份不愉快。」
               - (如果是廣泛觀察)：強調「雖然鳥事存在，但從這件好事來看，善意其實更常態。」
            4. 【人性辯證 (升級層次)】：如果使用者覺得這件事情很鳥，那表示使用者無法欣賞這件事情所引出的人性，那麼好事卡可以被使用者欣賞、信任嗎？請從這個點下去辯證。引導他思考：既然能敏銳感知惡，是否也能信任這張好事卡背後的「善」？如果因為鳥事而全盤否定好事，是否也否定了自己相信美好的能力？

            語氣限制：
            1. 【日常口語】：像跟朋友傳訊息一樣自然，不要文謅謅，不要用書面語。
            2. 【禁止肉麻】：絕對不要叫使用者「親愛的」、「孩子」、「寶貝」等過度親密的稱呼。
            3. 【理性不盲目】：不要只說「好事會贏」，要說出「為什麼贏」（例如：因為這代表了真實的善意）。
            4. 【短促有力】：回應請嚴格限制在 **100字以內** (包含標點)。這點非常重要。
        `;

        let successData = null;
        for (const model of modelsToTry) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.candidates && data.candidates[0].content) {
                        successData = data;
                        break;
                    }
                }
            } catch (err) {}
        }

        const loadingEl = document.getElementById(loadingId);
        if(loadingEl) loadingEl.remove();

        if (successData) {
            const aiText = successData.candidates[0].content.parts[0].text;
            addChatMessage('ai', aiText);
        } else {
            // [修改] 勝利後即使 AI 暫時無法回應，也不要顯示錯誤訊息干擾心情
            if (!userMessage.includes("勝利")) {
                addChatMessage('system', "AI 暫時無法回應。");
            }
        }

    } catch (e) {
        const loadingEl = document.getElementById(loadingId);
        if(loadingEl) loadingEl.remove();
        addChatMessage('system', "連線錯誤。");
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

    // [修改] 設定按鈕文字
    if (mode === 'good') {
        btns.saveEdit.innerText = "儲存";
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
        btns.saveEdit.innerText = "儲存"; // [修改] 將 PK 改回 儲存 (由使用者決定何時去倉庫PK)
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

// --- 8. 倉庫 (Warehouse) 功能模組 ---
function createWarehouseHTML() {
    if (document.getElementById('warehouse-modal')) return;

    const warehouseHTML = `
    <div id="warehouse-modal" class="hidden" style="position: absolute; top:0; left:0; width:100%; height:100%; background:#FAFAFA; z-index:200; display: flex; flex-direction: column;">
        <header style="padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; background: #FFF; border-bottom: 1px solid #EEE;">
            <div style="font-size: 18px; font-weight: 800; color: var(--text-main);">卡片倉庫</div>
            <button id="btn-close-warehouse" style="background:none; border:none; padding:8px; cursor:pointer; font-size:14px; color:#999;">關閉</button>
        </header>
        <div style="padding: 10px 20px; display: flex; gap: 8px; overflow-x: auto;">
            <button id="tab-wins" style="flex: 1; min-width:80px; padding: 10px 5px; border: none; border-radius: 10px; background: #FFD700; color: #FFF; font-weight: 700; cursor: pointer; font-size:13px;">PK勝利</button>
            <button id="tab-good" style="flex: 1; min-width:80px; padding: 10px 5px; border: none; border-radius: 10px; background: #EEE; color: #999; font-weight: 700; cursor: pointer; font-size:13px;">好事庫</button>
            <button id="tab-bad" style="flex: 1; min-width:80px; padding: 10px 5px; border: none; border-radius: 10px; background: #EEE; color: #999; font-weight: 700; cursor: pointer; font-size:13px;">待PK鳥事</button>
        </div>
        <div id="warehouse-list" style="flex: 1; overflow-y: auto; padding: 0 20px 20px 20px; display: flex; flex-direction: column; gap: 10px;">
            <div style="text-align:center; color:#999; margin-top:50px;">載入中...</div>
        </div>
    </div>
    `;
    
    const wrapper = document.getElementById('mobile-wrapper');
    if(wrapper) wrapper.insertAdjacentHTML('beforeend', warehouseHTML);

    document.getElementById('btn-close-warehouse').addEventListener('click', () => {
        document.getElementById('warehouse-modal').classList.add('hidden');
    });

    document.getElementById('tab-wins').addEventListener('click', () => loadWarehouseData('wins'));
    document.getElementById('tab-good').addEventListener('click', () => loadWarehouseData('good'));
    document.getElementById('tab-bad').addEventListener('click', () => loadWarehouseData('bad'));

    // [新增] 倉庫列表的事件監聽 (擊敗、編輯、刪除、回顧)
    const listEl = document.getElementById('warehouse-list');
    listEl.addEventListener('click', async (e) => {
        const target = e.target;
        const action = target.dataset.action;
        const id = target.dataset.id;

        if (!action || !id) return;
        
        try {
            if (action === 'delete') {
                if(confirm('確定要刪除這張卡片嗎？')) {
                    // 簡單判斷當前 Tab
                    const isBadTab = document.getElementById('tab-bad').style.background.includes('var(--bad-light)');
                    const collectionName = isBadTab ? 'bad_things' : 'good_things';
                    
                    await deleteDoc(doc(db, collectionName, id));
                    target.closest('.card-item').remove();
                }
            } else if (action === 'edit') {
                // 判斷是編輯好事還是鳥事
                const isGoodTab = document.getElementById('tab-good').style.background.includes('var(--good-light)');
                const collectionName = isGoodTab ? 'good_things' : 'bad_things';
                
                const docSnap = await getDoc(doc(db, collectionName, id));
                if (docSnap.exists()) {
                    openEditor(isGoodTab ? 'good' : 'bad', { id: docSnap.id, ...docSnap.data() });
                }
            } else if (action === 'defeat') {
                // 擊敗鳥事 (進入 PK)
                const docSnap = await getDoc(doc(db, 'bad_things', id));
                if (docSnap.exists()) {
                    document.getElementById('warehouse-modal').classList.add('hidden');
                    startPK({ id: docSnap.id, ...docSnap.data() }, 'bad_things');
                }
            } else if (action === 'review') {
                // 回顧勝利 (唯讀 PK)
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

// 載入倉庫資料 (支援三大類)
async function loadWarehouseData(type) {
    const listEl = document.getElementById('warehouse-list');
    const tabWins = document.getElementById('tab-wins');
    const tabGood = document.getElementById('tab-good');
    const tabBad = document.getElementById('tab-bad');
    
    listEl.innerHTML = '<div style="text-align:center; color:#999; margin-top:50px;">讀取中...</div>';

    // 重置所有 Tab 樣式
    if(tabWins && tabGood && tabBad) {
        [tabWins, tabGood, tabBad].forEach(btn => {
            btn.style.background = '#EEE'; btn.style.color = '#999';
        });
    }

    let collectionName = '';
    let emptyMsg = '';

    if (type === 'wins') {
        if(tabWins) { tabWins.style.background = '#FFD700'; tabWins.style.color = '#FFF'; } 
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
        const q = query(collection(db, collectionName), orderBy("createdAt", "desc"), limit(20));
        const querySnapshot = await getDocs(q);
        
        listEl.innerHTML = ''; 

        if (querySnapshot.empty) {
            listEl.innerHTML = `<div style="text-align:center; color:#CCC; margin-top:50px; line-height:1.6;">${emptyMsg}</div>`;
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const docId = doc.id;
            const date = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : '剛剛';
            
            let cardBg = '#FFF';
            let iconColor = '#999';
            let labelText = '';
            let actionButtonsHTML = '';
            let displayTitle = data.title; // 預設使用 title
            let displayContent = data.content; // 預設使用 content
            
            if (type === 'good') { 
                iconColor = 'var(--good-icon)'; 
                labelText = `等級: ${data.score || 1}`;
                
                actionButtonsHTML = `
                    <div style="display:flex; gap:8px; margin-top:10px; border-top:1px solid #F0F0F0; padding-top:10px;">
                        <button data-action="edit" data-id="${docId}" style="flex:1; background:#EEE; color:#666; border:none; padding:6px; border-radius:6px; font-size:12px; cursor:pointer;">寫筆記</button>
                        <button data-action="delete" data-id="${docId}" style="flex:1; background:#FFEBEE; color:var(--bad-icon); border:none; padding:6px; border-radius:6px; font-size:12px; cursor:pointer;">垃圾桶</button>
                    </div>
                `;
            }
            else if (type === 'bad') { 
                iconColor = 'var(--bad-icon)'; 
                labelText = `等級: ${data.score || 1}`;
                
                actionButtonsHTML = `
                    <div style="display:flex; gap:8px; margin-top:10px; border-top:1px solid #F0F0F0; padding-top:10px;">
                        <button data-action="defeat" data-id="${docId}" style="flex:1; background:var(--primary); color:#FFF; border:none; padding:6px; border-radius:6px; font-size:12px; cursor:pointer;">擊敗它</button>
                        <button data-action="edit" data-id="${docId}" style="flex:1; background:#EEE; color:#666; border:none; padding:6px; border-radius:6px; font-size:12px; cursor:pointer;">寫筆記</button>
                        <button data-action="delete" data-id="${docId}" style="flex:1; background:#FFEBEE; color:var(--bad-icon); border:none; padding:6px; border-radius:6px; font-size:12px; cursor:pointer;">垃圾桶</button>
                    </div>
                `;
            }
            else { 
                iconColor = '#FFD700'; 
                labelText = '🏆 PK 勝利';
                // [修改] 勝利庫標題顯示邏輯
                displayTitle = `擊敗「${data.badTitle}」`;
                displayContent = `戰友：${data.goodTitle}`;

                actionButtonsHTML = `
                    <div style="display:flex; gap:8px; margin-top:10px; border-top:1px solid #F0F0F0; padding-top:10px;">
                        <button data-action="review" data-id="${docId}" style="flex:1; background:#FFF9C4; color:#FBC02D; border:none; padding:6px; border-radius:6px; font-size:12px; cursor:pointer; font-weight:bold;">回顧勝利</button>
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
                        <div style="margin-top: 8px; font-size: 12px; color: ${iconColor}; font-weight: 700;">
                            ${labelText}
                        </div>
                        ${actionButtonsHTML}
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

// --- 9. PK 邏輯與積分系統 ---

async function handlePKResult(winner) {
    if (!currentUser) {
        showSystemMessage("請先登入才能紀錄 PK 結果！");
        return;
    }

    if (winner === 'bad') {
        // --- 使用者選了鳥事 ---
        addChatMessage('user', "還是覺得這件鳥事比較強... 😩");
        addChatMessage('system', "AI 正在尋找更有力的好事來支援...");

        try {
            const q = query(collection(db, "good_things"), orderBy("createdAt", "desc"), limit(10));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const candidates = querySnapshot.docs.map(doc => doc.data())
                    .filter(item => item.title !== currentPKContext.good?.title);
                
                if (candidates.length > 0) {
                    const newGood = candidates[Math.floor(Math.random() * candidates.length)];
                    currentPKContext.good = newGood;
                    
                    document.getElementById('pk-good-title').innerText = newGood.title;
                    document.getElementById('pk-good-content').innerText = newGood.content;
                    
                    const prompt = `使用者覺得鳥事贏了。請換個角度，用這件新的好事「${newGood.title}」來說服他，為什麼這件好事能戰勝那件鳥事？(100字以內)`;
                    await callGeminiChat(prompt);
                } else {
                    addChatMessage('ai', "我找不到其他好事了... 但請相信，這件鳥事終究會過去的！");
                }
            }
        } catch(e) {
            console.error("Fetch new good thing error:", e);
        }

    } else {
        // --- 使用者選了好事 (勝利！) ---
        addChatMessage('user', "好事贏了！這點鳥事不算什麼！ ✨");
        
        // 1. 計算積分
        const scoreToAdd = currentPKContext.bad?.score || 1;
        const newTotal = await updateUserScore(scoreToAdd);
        const rankTitle = getRankTitle(newTotal);

        // 2. 寫入勝利紀錄 (修改：必須儲存完整 content 才能支援重新 PK)
        try {
            await addDoc(collection(db, "pk_wins"), {
                uid: currentUser.uid,
                badTitle: currentPKContext.bad?.title || "未知鳥事",
                badContent: currentPKContext.bad?.content || "", // [新增]
                goodTitle: currentPKContext.good?.title || "未知好事",
                goodContent: currentPKContext.good?.content || "", // [新增]
                score: scoreToAdd,
                chatLogs: currentPKContext.chatLogs, 
                createdAt: serverTimestamp()
            });
            
            // [新增] 只有在「待PK鳥事庫」的才刪除，如果是從「勝利庫重新PK」則不刪
            if (currentPKContext.collection === 'bad_things') {
                await deleteDoc(doc(db, "bad_things", currentPKContext.docId));
            }
            
            console.log("勝利已記錄！");
        } catch(e) {
            console.error("Save Win Error", e);
            showSystemMessage("勝利紀錄儲存失敗：" + e.message);
        }

        // 3. 顯示勝利訊息
        showSystemMessage(`🎉 PK 勝利！\n\n已存入勝利庫\n獲得積分：+${scoreToAdd}\n目前總分：${newTotal}\n當前稱號：${rankTitle}`);
        
        // 4. AI 恭喜 (確保 AI 知道這是勝利時刻)
        // 傳送空字串給 addChatMessage 避免重複顯示，但讓它觸發 callGeminiChat
        await callGeminiChat(`我贏了！我選擇了好事，成功擊敗了鳥事！請給我一個溫暖的恭喜。`);
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
