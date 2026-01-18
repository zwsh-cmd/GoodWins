// --- 1. 引入 Firebase ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

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

    const editorHTML = `
    <div id="editor-modal" class="hidden" style="position: absolute; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.98); z-index:500; display: flex; flex-direction: column;">
        <div style="flex:1; display:flex; flex-direction:column; padding:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <button id="btn-cancel-edit" style="background:none; border:none; color:#999; font-size:16px; cursor:pointer;">取消</button>
                <h3 id="editor-title" style="margin:0; font-size:18px; font-weight:700; color:var(--text-main);">記錄好事</h3>
                <button id="btn-save-edit" style="background:none; border:none; color:var(--primary); font-weight:700; font-size:16px; cursor:pointer;">儲存</button>
            </div>

            <input id="input-title" type="text" placeholder="標題 (例如：今天喝了好咖啡)" style="width:100%; padding:15px 0; border:none; border-bottom:1px solid #EEE; font-size:20px; font-weight:700; outline:none; background:transparent; color:var(--text-main); margin-bottom:10px;">
            
            <textarea id="input-content" placeholder="寫下發生的經過..." style="width:100%; flex:1; padding:15px 0; border:none; font-size:16px; outline:none; resize:none; background:transparent; line-height:1.6; color:var(--text-main);"></textarea>
            
            <div style="padding:20px 0;">
                <div style="margin-bottom:15px;">
                    <label style="font-size:12px; color:#999; display:block; margin-bottom:5px;">這件事有多好？</label>
                    <select id="input-score" style="width:100%; padding:12px; border:1px solid #EEE; border-radius:12px; background:#FAFAFA; font-size:15px; color:var(--text-main); outline:none;">
                        <option value="1">1分 - 微好事 (Micro)</option>
                        <option value="2">2分 - 小好事 (Small)</option>
                        <option value="3">3分 - 中好事 (Medium)</option>
                        <option value="4">4分 - 大好事 (Big)</option>
                        <option value="5">5分 - 神聖好事 (Divine)</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:12px; color:#999; display:block; margin-bottom:5px;">來源</label>
                    <select id="input-source" style="width:100%; padding:12px; border:1px solid #EEE; border-radius:12px; background:#FAFAFA; font-size:15px; color:var(--text-main); outline:none;">
                        <option value="personal">個人經驗</option>
                        <option value="inference">推論觀察</option>
                        <option value="others">他人經驗</option>
                    </select>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // 把它插入到 mobile-wrapper 裡面，這樣才不會跑版
    const wrapper = document.getElementById('mobile-wrapper');
    if(wrapper) {
        wrapper.insertAdjacentHTML('beforeend', editorHTML);
    }
}

// 馬上執行，把畫面畫出來
createEditorHTML();


// --- 5. 變數與 DOM 抓取 (介面產生後才能抓) ---
let currentUser = null;
let currentMode = '';

const screens = {
    login: document.getElementById('login-screen'),
    app: document.getElementById('app-screen'),
    apiModal: document.getElementById('api-modal'),
    editor: document.getElementById('editor-modal')
};

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
document.querySelector('.card-good').addEventListener('click', () => {
    openEditor('good');
});

document.querySelector('.card-bad').addEventListener('click', () => {
    openEditor('bad');
});

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

    try {
        const collectionName = currentMode === 'good' ? 'good_things' : 'bad_things';
        await addDoc(collection(db, collectionName), {
            uid: currentUser.uid,
            title: title,
            content: content,
            score: score,
            source: source,
            createdAt: serverTimestamp()
        });
        alert("儲存成功！");
        screens.editor.classList.add('hidden');
    } catch (e) {
        console.error("Error:", e);
        alert("儲存失敗：" + e.message);
    }
});

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
    const scoreLabel = inputs.score.previousElementSibling; // 抓取選單上面的標籤文字
    const scoreSelect = inputs.score;

    if (mode === 'good') {
        // --- 好事模式 ---
        titleEl.innerText = "記錄一件好事";
        titleEl.style.color = "var(--good-icon)";
        inputs.title.placeholder = "標題 (例如：今天喝了好咖啡)";
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
        inputs.title.placeholder = "標題 (例如：踩到狗屎...)";
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
