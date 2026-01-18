// --- 1. 引入 Firebase ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// --- 2. 妳的專屬設定碼 (已填入) ---
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

// --- 4. DOM 元素抓取 ---
const screens = {
    login: document.getElementById('login-screen'),
    app: document.getElementById('app-screen'),
    apiModal: document.getElementById('api-modal')
};
const btns = {
    login: document.getElementById('btn-login'),
    saveKey: document.getElementById('btn-save-key')
};

// --- 5. 狀態管理邏輯 ---

// 監聽登入狀態
onAuthStateChanged(auth, (user) => {
    if (user) {
        // 已登入
        console.log("使用者已登入:", user.displayName);
        showScreen('app');
        checkApiKey(); // 檢查有沒有輸入過 Key
    } else {
        // 未登入
        showScreen('login');
    }
});

// 登入按鈕功能
btns.login.addEventListener('click', () => {
    signInWithPopup(auth, provider)
        .then((result) => {
            // 登入成功，onAuthStateChanged 會自動處理後續
        }).catch((error) => {
            console.error("登入失敗:", error);
            alert("登入失敗，請重試");
        });
});

// API Key 處理 (存於 Session Storage，關閉分頁即消失)
function checkApiKey() {
    const key = sessionStorage.getItem('gemini_key');
    if (!key) {
        // 如果沒有 Key，跳出輸入框
        screens.apiModal.classList.remove('hidden');
    }
}

btns.saveKey.addEventListener('click', () => {
    const input = document.getElementById('input-api-key');
    const key = input.value.trim();
    if (key.length > 10) {
        sessionStorage.setItem('gemini_key', key);
        screens.apiModal.classList.add('hidden');
        alert("金鑰已暫存，可以開始使用了！");
    } else {
        alert("請輸入有效的 API Key");
    }
});

// --- 輔助函式: 切換畫面 ---
function showScreen(screenName) {
    // 隱藏所有畫面
    Object.values(screens).forEach(el => el.classList.add('hidden'));
    
    // 顯示指定畫面
    if (screenName === 'login') screens.login.classList.remove('hidden');
    if (screenName === 'app') screens.app.classList.remove('hidden');
}
