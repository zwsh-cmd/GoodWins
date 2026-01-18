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
    // 如果已經有了就不重複建立
    if (document.getElementById('editor-modal')) return;

    // 自定義下拉選單樣式
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

    // 這裡我們移除了 placeholder，並加上 autocomplete="off"
    const editorHTML = `
    <div id="editor-modal" class="hidden" style="position: absolute; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.98); z-index:500; display: flex; flex-direction: column;">
        <div style="flex:1; display:flex; flex-direction:column; padding:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <button id="btn-cancel-edit" style="background:none; border:none; color:#999; font-size:16px; cursor:pointer;">取消</button>
                <h3 id="editor-title" style="margin:0; font-size:18px; font-weight:700; color:var(--text-main);">記錄好事</h3>
                <button id="btn-save-edit" style="background:none; border:none; color:var(--primary); font-weight:700; font-size:16px; cursor:pointer;">儲存</button>
            </div>

            <input id="input-title" type="text" autocomplete="off" style="width:100%; padding:15px 0; border:none; border-bottom:1px solid #EEE; font-size:20px; font-weight:700; outline:none; background:transparent; color:var(--text-main); margin-bottom:10px;">
            
            <textarea id="input-content" style="width:100%; flex:1; padding:15px 0; border:none; font-size:16px; outline:none; resize:none; background:transparent; line-height:1.6; color:var(--text-main);"></textarea>
            
            <div style="padding:20px 0;">
                <div style="margin-bottom:15px;">
                    <label style="font-size:12px; color:#999; display:block; margin-bottom:5px;">這件事有多好？</label>
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

// --- 新增：動態生成 PK 畫面 ---
function createPKScreenHTML() {
    if (document.getElementById('pk-screen')) return;

    const pkHTML = `
    <div id="pk-screen" class="hidden" style="flex: 1; display: flex; flex-direction: column; height: 100%; background: var(--bg-app); position: absolute; top: 0; left: 0; width: 100%; z-index: 100;">
        <header style="padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #EEE;">
            <div style="font-size: 20px; font-weight: 800; color: var(--text-main);">PK 擂台</div>
            <button id="btn-exit-pk" style="background:none; border:none; padding:8px; cursor:pointer; font-size:14px; color:#999;">離開</button>
        </header>

        <main style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 24px;">
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div class="action-card card-bad" style="cursor: default; padding: 20px; border: 2px solid var(--bad-icon);">
                    <div class="icon-circle" style="width: 40px; height: 40px;">
                        <svg class="icon-svg" viewBox="0 0 24 24" style="width: 20px; height: 20px;"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                    </div>
                    <div class="card-text">
                        <h3 id="pk-bad-title" style="margin-bottom: 6px; font-size: 16px;">(鳥事標題)</h3>
                        <p id="pk-bad-content" style="font-size: 13px; color: var(--text-main); opacity: 0.8;">(內容...)</p>
                    </div>
                </div>
                
                <div style="text-align: center; font-weight: 900; color: #DDD; font-size: 14px;">⚡ VS ⚡</div>

                <div class="action-card card-good" style="cursor: default; padding: 20px; border: 2px solid var(--good-icon);">
                    <div class="icon-circle" style="width: 40px; height: 40px;">
                        <svg class="icon-svg" viewBox="0 0 24 24" style="width: 20px; height: 20px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                    </div>
                    <div class="card-text">
                        <h3 id="pk-good-title" style="margin-bottom: 6px; font-size: 16px;">(好事標題)</h3>
                        <p id="pk-good-content" style="font-size: 13px; color: var(--text-main); opacity: 0.8;">(內容...)</p>
                    </div>
                </div>
            </div>

            <div style="background: #FFF; border-radius: 16px; padding: 20px; box-shadow: var(--shadow); border: 1px solid #EEE;">
                <div style="font-weight: 700; color: var(--primary); margin-bottom: 12px; display:flex; align-items:center; gap:8px;">
                    <span>🤖 AI 裁判講評</span>
                </div>
                <p id="pk-ai-comment" style="font-size: 15px; color: var(--text-main); line-height: 1.6;">
                    正在搜尋適合的好事卡來對抗...<br>請稍候...
                </p>
            </div>
        </main>
    </div>
    `;

    const wrapper = document.getElementById('mobile-wrapper');
    if(wrapper) {
        wrapper.insertAdjacentHTML('beforeend', pkHTML);
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
    pk: document.getElementById('pk-screen') // 新增
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
        alert("標題和內容都要寫喔！");
        return;
    }

    // --- 新增：按鈕變更狀態，給予使用者回饋 ---
    const originalText = btns.saveEdit.innerText;
    btns.saveEdit.innerText = "儲存中...";
    btns.saveEdit.disabled = true;

    try {
        const collectionName = currentMode === 'good' ? 'good_things' : 'bad_things';
        
        // 1. 存入資料庫
        await addDoc(collection(db, collectionName), {
            uid: currentUser.uid,
            title: title,
            content: content,
            score: score,
            source: source,
            createdAt: serverTimestamp()
        });

        screens.editor.classList.add('hidden'); // 關閉編輯器

        // 2. 如果是「鳥事」，進入 PK 環節
        if (currentMode === 'bad') {
            startPK({ title, content });
        } else {
            alert("好事已記錄！累積正能量 +1");
        }

    } catch (e) {
        console.error("Error:", e);
        alert("儲存失敗：" + e.message);
    } finally {
        // --- 恢復按鈕狀態 ---
        btns.saveEdit.innerText = originalText;
        btns.saveEdit.disabled = false;
    }
});

// --- PK 核心邏輯 ---
async function startPK(badThing) {
    // 1. 顯示 PK 畫面
    screens.pk.classList.remove('hidden');
    
    // 2. 填入鳥事內容
    document.getElementById('pk-bad-title').innerText = badThing.title;
    document.getElementById('pk-bad-content').innerText = badThing.content;

    // 3. 尋找一張好事卡 (這裡先簡單抓最新的一張，之後再接 AI)
    const aiCommentEl = document.getElementById('pk-ai-comment');
    aiCommentEl.innerText = "🔍 AI 正在翻找你的好事庫...";
    
    try {
        // 從 good_things 隨機(或最新)抓一張
        const q = query(collection(db, "good_things"), orderBy("createdAt", "desc"), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const goodThing = querySnapshot.docs[0].data();
            
            // 填入好事內容
            document.getElementById('pk-good-title').innerText = goodThing.title;
            document.getElementById('pk-good-content').innerText = goodThing.content;
            
            aiCommentEl.innerText = `找到了一件好事來對抗！\n\n雖然發生了「${badThing.title}」，但別忘了你也曾經「${goodThing.title}」。\n這世界還是很美好的！`;
        } else {
            // 如果沒好事
            document.getElementById('pk-good-title').innerText = "尚無好事";
            document.getElementById('pk-good-content').innerText = "趕快去記錄一件好事，再來 PK 吧！";
            aiCommentEl.innerText = "你的彈藥庫空空的！快去記錄好事來支援！";
        }

    } catch (e) {
        console.error("PK Error:", e);
        aiCommentEl.innerText = "AI 連線有點問題，但別擔心，好事總會發生的。";
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
    const scoreLabel = inputs.score.previousElementSibling; 
    const scoreSelect = inputs.score;

    if (mode === 'good') {
        // --- 好事模式 ---
        titleEl.innerText = "記錄一件好事";
        titleEl.style.color = "var(--good-icon)";
        if (scoreLabel) scoreLabel.innerText = "這件事有多好？";
        
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
        if (scoreLabel) scoreLabel.innerText = "這件事有多鳥？";
        
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
