// ===== FIREBASE IMPORTS (logout thực tế và bảo vệ trang) =====
import { initializeApp } from 'firebase/app';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';

// Cấu hình Firebase (giống login.html)
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAcsjZmPrUDxnaUA1nzCGiE9M-3fUM2rRk",
  authDomain: "blogevents-8977c.firebaseapp.com",
  projectId: "blogevents-8977c",
  storageBucket: "blogevents-8977c.firebasestorage.app",
  messagingSenderId: "353511561806",
  appId: "1:353511561806:web:ffaab4fd78d66b8437c11f"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ===== DỮ LIỆU VÀ LƯU TRỮ =====
let newsData = [];
const STORAGE_KEY = 'blogPosts';

// Hàm tải dữ liệu từ localStorage hoặc từ file posts.json
async function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            newsData = JSON.parse(stored);
            let needSave = false;
            newsData = newsData.map(item => {
                if (item.views === undefined) {
                    item.views = 0;
                    needSave = true;
                }
                return item;
            });
            if (needSave) saveData();
            return;
        } catch (e) {
            console.warn('Lỗi parse localStorage, dùng dữ liệu mặc định');
        }
    }
    try {
        const response = await fetch('posts.json');
        if (!response.ok) throw new Error('Không tìm thấy posts.json');
        const data = await response.json();
        newsData = data.map(item => ({ ...item, views: item.views || 0 }));
        saveData();
    } catch (error) {
        console.error('Không thể tải posts.json, dùng dữ liệu mặc định:', error);
        newsData = [
            { id: 1, title: 'Bài viết mẫu 1', category: 'Git', date: '2026-08-16', views: 0, image: null, video: null, body: 'Nội dung mẫu...' }
        ];
        saveData();
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newsData));
}

// ===== LẤY THÔNG TIN USER TỪ LOCALSTORAGE =====
const userStr = localStorage.getItem('user');
let currentUser = null;
if (userStr) {
    try {
        currentUser = JSON.parse(userStr);
    } catch (e) {}
}

// ===== BẢO VỆ TRANG: NẾU CHƯA LOGIN -> CHUYỂN VỀ LOGIN =====
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Không có user -> chuyển về login
        window.location.href = '../login.html';
        return;
    }
    // Đã login, cập nhật thông tin nếu cần
    if (!currentUser) {
        // Lưu lại thông tin nếu chưa có trong localStorage
        localStorage.setItem('user', JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL || ''
        }));
        currentUser = { uid: user.uid, email: user.email, displayName: user.displayName || user.email.split('@')[0], photoURL: user.photoURL || '' };
    }
    // Hiển thị tên user trên header
    const usernameSpan = document.querySelector('.username');
    if (usernameSpan && currentUser) {
        usernameSpan.innerHTML = `<i class="fas fa-user-circle"></i> ${currentUser.displayName || currentUser.email}`;
    }
});

// ===== XỬ LÝ ĐĂNG XUẤT (Firebase + localStorage) =====
const logoutBtn = document.querySelector('.logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async function() {
        try {
            // Đăng xuất khỏi Firebase
            await signOut(auth);
            // Xóa localStorage
            localStorage.removeItem('user');
            // Chuyển về login
            window.location.href = '../login.html';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Đăng xuất thất bại, vui lòng thử lại.');
        }
    });
}

// ===== BIẾN TOÀN CỤC =====
let currentPage = 1;
const itemsPerPage = 3;
let currentData = [];
let currentCategory = 'all';

const newsListEl = document.getElementById('newsList');
const detailOverlay = document.getElementById('newsDetailOverlay');
const detailContent = document.getElementById('newsDetailContent');
const closeDetailBtn = document.querySelector('.close-detail-btn');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');

const adminOverlay = document.getElementById('adminOverlay');
const adminBtn = document.getElementById('adminBtn');
const closeAdminBtn = document.getElementById('closeAdminBtn');
const addPostForm = document.getElementById('addPostForm');
const editPostId = document.getElementById('editPostId');
const adminFormTitle = document.getElementById('adminFormTitle');
const submitBtnText = document.getElementById('submitBtnText');
const deletePostBtn = document.getElementById('deletePostBtn');

const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const fileInput = document.getElementById('fileInput');

const categoryMap = {
    'all': 'Tất cả',
    'git': 'Git',
    'story': 'Story-Ngẫm',
    'effects': 'Effects Video',
    'music': 'Music',
    'decor': 'Home-Decor'
};

// ===== RENDER =====
function renderNews(data = currentData, page = 1) {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = data.slice(start, end);

    if (pageItems.length === 0) {
        newsListEl.innerHTML = `<p style="text-align:center;color:#b2bec3;padding:40px 0;">Không có bài viết nào phù hợp.</p>`;
        updatePagination(data, page);
        return;
    }

    newsListEl.innerHTML = pageItems.map(item => `
        <div class="news-item" data-id="${item.id}">
            <div class="news-thumbnail">
                <img src="${item.image || 'https://picsum.photos/seed/default/234/132'}" alt="${item.title}" loading="lazy" />
            </div>
            <div class="news-content">
                <div class="news-title">${item.title}</div>
                <div class="news-meta">
                    <span><i class="fas fa-tag"></i> ${item.category}</span>
                    <span><i class="fas fa-calendar-alt"></i> ${item.date}</span>
                    <span><i class="fas fa-eye"></i> ${item.views}</span>
                </div>
            </div>
            <button class="edit-post-btn" data-id="${item.id}"><i class="fas fa-edit"></i> Sửa</button>
        </div>
    `).join('');

    document.querySelectorAll('.news-item').forEach(el => {
        el.addEventListener('click', function(e) {
            if (e.target.closest('.edit-post-btn')) return;
            const id = parseInt(this.dataset.id);
            openDetail(id);
        });
        const editBtn = el.querySelector('.edit-post-btn');
        if (editBtn) {
            editBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = parseInt(this.dataset.id);
                openEditForm(id);
            });
        }
    });

    updatePagination(data, page);
}

// ===== PHÂN TRANG =====
function updatePagination(data, currentPage) {
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const paginationEl = document.querySelector('.pagination');
    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    paginationEl.innerHTML = html;

    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const page = parseInt(this.dataset.page);
            currentPage = page;
            renderNews(currentData, page);
            document.querySelector('.main-content').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

// ===== LỌC =====
function filterByCategory(category) {
    if (searchInput.value.trim() !== '') {
        searchInput.value = '';
    }
    currentCategory = category;
    refreshCurrentData();
    renderNews(currentData, 1);
}

// ===== TÌM KIẾM =====
function performSearch(keyword) {
    const trimmed = keyword.trim().toLowerCase();
    currentCategory = 'all';
    filterBtns.forEach(btn => btn.classList.remove('active'));
    document.querySelector('.filter-btn[data-category="all"]').classList.add('active');
    refreshCurrentData();
    renderNews(currentData, 1);
}

// ===== LÀM MỚI CURRENT DATA =====
function refreshCurrentData() {
    if (currentCategory === 'all') {
        currentData = [...newsData];
    } else {
        const displayCat = categoryMap[currentCategory] || currentCategory;
        currentData = newsData.filter(item => item.category === displayCat);
    }
    const keyword = searchInput.value.trim().toLowerCase();
    if (keyword) {
        currentData = currentData.filter(item => {
            const title = item.title.toLowerCase();
            const category = item.category.toLowerCase();
            const body = item.body.toLowerCase();
            return title.includes(keyword) || category.includes(keyword) || body.includes(keyword);
        });
    }
    currentPage = 1;
}

// ===== MỞ CHI TIẾT (tự động tăng view) =====
function openDetail(id) {
    const item = currentData.find(n => n.id === id);
    if (!item) return;

    item.views = (item.views || 0) + 1;
    const original = newsData.find(n => n.id === id);
    if (original) original.views = item.views;
    saveData();

    const viewSpan = document.querySelector(`.news-item[data-id="${id}"] .news-meta span:last-child`);
    if (viewSpan) {
        viewSpan.innerHTML = `<i class="fas fa-eye"></i> ${item.views}`;
    }

    let videoHtml = '';
    if (item.video) {
        const isYoutube = item.video.includes('youtube.com/embed') || item.video.includes('youtu.be');
        if (isYoutube) {
            videoHtml = `
                <div class="detail-video">
                    <iframe src="${item.video}" allowfullscreen loading="lazy"></iframe>
                </div>
            `;
        } else {
            videoHtml = `
                <div class="detail-video">
                    <video controls>
                        <source src="${item.video}" type="video/mp4">
                        Trình duyệt không hỗ trợ video.
                    </video>
                </div>
            `;
        }
    }

    detailContent.innerHTML = `
        <h2>${item.title}</h2>
        <div class="detail-meta">
            <span><i class="fas fa-tag"></i> ${item.category}</span> &nbsp;|&nbsp;
            <span><i class="fas fa-calendar-alt"></i> ${item.date}</span> &nbsp;|&nbsp;
            <span><i class="fas fa-eye"></i> ${item.views}</span>
        </div>
        ${videoHtml}
        <div class="detail-body">${item.body}</div>
    `;

    detailOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDetail() {
    detailOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

closeDetailBtn.addEventListener('click', closeDetail);
detailOverlay.addEventListener('click', function(e) {
    if (e.target === this) closeDetail();
});
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeDetail();
});

// ===== MỞ FORM THÊM MỚI =====
function openAddForm() {
    editPostId.value = '';
    adminFormTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Thêm bài viết mới';
    submitBtnText.textContent = 'Đăng bài';
    deletePostBtn.style.display = 'none';
    addPostForm.reset();
    document.getElementById('postDate').value = new Date().toISOString().slice(0,10);
    adminOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// ===== MỞ FORM SỬA =====
function openEditForm(id) {
    const item = newsData.find(n => n.id === id);
    if (!item) return;
    editPostId.value = id;
    adminFormTitle.innerHTML = '<i class="fas fa-edit"></i> Sửa bài viết';
    submitBtnText.textContent = 'Cập nhật';
    deletePostBtn.style.display = 'inline-block';
    deletePostBtn.dataset.id = id;
    document.getElementById('postTitle').value = item.title;
    document.getElementById('postCategory').value = item.category;
    document.getElementById('postDate').value = item.date || '';
    document.getElementById('postImage').value = item.image || '';
    document.getElementById('postVideo').value = item.video || '';
    document.getElementById('postBody').value = item.body;
    adminOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAdmin() {
    adminOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

adminBtn.addEventListener('click', openAddForm);
closeAdminBtn.addEventListener('click', closeAdmin);
adminOverlay.addEventListener('click', function(e) {
    if (e.target === this) closeAdmin();
});

// ===== XỬ LÝ SUBMIT (THÊM / SỬA) =====
addPostForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const id = parseInt(editPostId.value);
    const title = document.getElementById('postTitle').value.trim();
    const category = document.getElementById('postCategory').value;
    const date = document.getElementById('postDate').value || new Date().toISOString().slice(0,10);
    const image = document.getElementById('postImage').value.trim() || null;
    const video = document.getElementById('postVideo').value.trim() || null;
    const body = document.getElementById('postBody').value.trim();

    if (!title || !body) {
        alert('Vui lòng điền đầy đủ tiêu đề và nội dung.');
        return;
    }

    if (id) {
        const index = newsData.findIndex(p => p.id === id);
        if (index !== -1) {
            newsData[index] = { ...newsData[index], title, category, date, image, video, body };
        }
    } else {
        const newId = newsData.length ? Math.max(...newsData.map(p => p.id)) + 1 : 1;
        const newPost = {
            id: newId,
            title,
            category,
            date,
            views: 0,
            image,
            video,
            body
        };
        newsData.push(newPost);
    }

    saveData();
    addPostForm.reset();
    document.getElementById('postDate').value = new Date().toISOString().slice(0,10);
    closeAdmin();

    refreshCurrentData();
    renderNews(currentData, 1);
});

// ===== XÓA BÀI VIẾT =====
deletePostBtn.addEventListener('click', function() {
    const id = parseInt(this.dataset.id);
    if (!id) return;
    if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return;
    newsData = newsData.filter(p => p.id !== id);
    saveData();
    closeAdmin();
    refreshCurrentData();
    renderNews(currentData, 1);
});

// ===== XUẤT JSON =====
exportBtn.addEventListener('click', function() {
    const dataStr = JSON.stringify(newsData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blog_posts_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

// ===== NHẬP JSON =====
importBtn.addEventListener('click', function() {
    fileInput.click();
});

fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const imported = JSON.parse(ev.target.result);
            if (!Array.isArray(imported)) throw new Error('Dữ liệu không hợp lệ');
            if (!confirm(`Bạn có muốn thay thế toàn bộ ${newsData.length} bài viết hiện tại bằng ${imported.length} bài viết mới?`)) return;
            newsData = imported.map(item => ({ ...item, views: item.views || 0 }));
            saveData();
            refreshCurrentData();
            renderNews(currentData, 1);
            alert('Nhập dữ liệu thành công!');
        } catch (err) {
            alert('Lỗi: File JSON không đúng định dạng.');
            console.error(err);
        }
    };
    reader.readAsText(file);
    fileInput.value = '';
});

// ===== SỰ KIỆN FILTER =====
filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        const category = this.dataset.category;
        filterByCategory(category);
        filterBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    });
});

// ===== TÌM KIẾM =====
searchInput.addEventListener('input', function() {
    performSearch(this.value);
});

// ===== KHỞI CHẠY =====
loadData().then(() => {
    currentData = [...newsData];
    renderNews(currentData, 1);
});