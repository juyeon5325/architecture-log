// Data Structure
let records = [];
let comments = [];
let currentUser = null;
let currentEditId = null;
let currentDetailId = null;
let tags = new Set();
let categories = new Set(['종교건축', '주거건축', '공공건축', '상업건축', '문화건축', '기타']);

// Category Colors
const categoryColors = {
    '종교건축': '#9b59b6',
    '주거건축': '#3498db',
    '공공건축': '#2ecc71',
    '상업건축': '#f39c12',
    '문화건축': '#e74c3c',
    '기타': '#95a5a6'
};

// DOM Elements
const addBtn = document.getElementById('addBtn');
const modal = document.getElementById('modal');
const userModal = document.getElementById('userModal');
const detailModal = document.getElementById('detailModal');
const closeBtns = document.querySelectorAll('.close');
const cancelBtn = document.getElementById('cancelBtn');
const recordForm = document.getElementById('recordForm');
const recordsList = document.getElementById('recordsList');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const tagFilter = document.getElementById('tagFilter');
const sortSelect = document.getElementById('sortSelect');
const photoInput = document.getElementById('photo');
const photoPreview = document.getElementById('photoPreview');
const tagInput = document.getElementById('tagInput');
const tagList = document.getElementById('tagList');
const currentDateEl = document.getElementById('currentDate');
const modalTitle = document.getElementById('modalTitle');
const userBtn = document.getElementById('userBtn');
const userNameEl = document.getElementById('userName');
const tabBtns = document.querySelectorAll('.tab-btn');
const categoryStats = document.getElementById('categoryStats');
const statsTitle = categoryStats.querySelector('.stats-title') || (() => {
    const title = document.createElement('h3');
    title.className = 'stats-title';
    categoryStats.appendChild(title);
    return title;
})();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateCurrentDate();
    loadUser();
    loadRecords();
    loadComments();
    setupEventListeners();
    renderRecords();
});

// Update current date
function updateCurrentDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    currentDateEl.textContent = now.toLocaleDateString('ko-KR', options);
}

// User Management
function loadUser() {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
        currentUser = JSON.parse(stored);
        userNameEl.textContent = currentUser.name;
    }
}

function saveUser() {
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
}

function promptUserName() {
    const name = prompt('사용자 이름을 입력하세요:', '사용자');
    if (name) {
        currentUser = { id: generateId(), name: name };
        saveUser();
        userNameEl.textContent = currentUser.name;
    }
}

// Load records from localStorage
function loadRecords() {
    const stored = localStorage.getItem('architectureRecords');
    if (stored) {
        records = JSON.parse(stored);
        updateTags();
    }
}

// Save records to localStorage
function saveRecords() {
    localStorage.setItem('architectureRecords', JSON.stringify(records));
}

// Load comments from localStorage
function loadComments() {
    const stored = localStorage.getItem('architectureComments');
    if (stored) {
        comments = JSON.parse(stored);
    }
}

// Save comments to localStorage
function saveComments() {
    localStorage.setItem('architectureComments', JSON.stringify(comments));
}

// Get comment count for a record
function getCommentCount(recordId) {
    return comments.filter(c => c.recordId === recordId).length;
}

// Update tags from all records
function updateTags() {
    tags.clear();
    records.forEach(record => {
        if (record.tags && Array.isArray(record.tags)) {
            record.tags.forEach(tag => tags.add(tag));
        }
    });
    updateTagFilter();
}

// Update tag filter dropdown
function updateTagFilter() {
    tagFilter.innerHTML = '<option value="">전체</option>';
    Array.from(tags).sort().forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagFilter.appendChild(option);
    });
}

// Event Listeners
function setupEventListeners() {
    addBtn.addEventListener('click', () => {
        if (!currentUser) {
            promptUserName();
        }
        if (currentUser) openModal();
    });
    
    closeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
                if (modal === userModal) {
                    // User modal closed
                } else if (modal === detailModal) {
                    currentDetailId = null;
                } else {
                    closeModal();
                }
            }
        });
    });
    
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    userBtn.addEventListener('click', () => {
        userModal.style.display = 'block';
        const userNameInput = document.getElementById('userNameInput');
        if (userNameInput && currentUser) {
            userNameInput.value = currentUser.name;
        }
    });
    
    document.getElementById('saveUserBtn').addEventListener('click', () => {
        const name = document.getElementById('userNameInput').value;
        if (name) {
            if (!currentUser) {
                currentUser = { id: generateId(), name: name };
            } else {
                currentUser.name = name;
            }
            saveUser();
            userNameEl.textContent = currentUser.name;
            userModal.style.display = 'none';
        }
    });
    
    recordForm.addEventListener('submit', handleFormSubmit);
    photoInput.addEventListener('change', handlePhotoPreview);
    
    tagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
        }
    });
    
    searchInput.addEventListener('input', renderRecords);
    categoryFilter.addEventListener('change', renderRecords);
    tagFilter.addEventListener('change', renderRecords);
    sortSelect.addEventListener('change', renderRecords);
    
    // Tab buttons
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            
            if (tab === 'category') {
                showCategoryStats();
                categoryStats.classList.add('show');
            } else {
                categoryStats.classList.remove('show');
            }
            
            // Update rendering based on tab
            renderRecords();
        });
    });
    
    // Comment handling
    document.getElementById('addCommentBtn').addEventListener('click', () => {
        const author = document.getElementById('commentAuthor').value;
        const content = document.getElementById('commentText').value;
        if (author && content && currentDetailId) {
            addComment(currentDetailId, author, content);
        }
    });
}

// Category Statistics
function showCategoryStats() {
    const stats = {};
    categories.forEach(cat => stats[cat] = 0);
    
    records.forEach(record => {
        if (record.category) {
            stats[record.category] = (stats[record.category] || 0) + 1;
        }
    });
    
    const total = records.length;
    statsTitle.textContent = `전체 답사: ${total}건`;
    
    let statsHTML = '<div class="stats-grid">';
    Object.entries(stats).forEach(([cat, count]) => {
        if (count > 0) {
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
            statsHTML += `
                <div class="stat-item" style="background: ${categoryColors[cat]}">
                    <div class="stat-name">${cat}</div>
                    <div class="stat-count">${count}</div>
                    <div style="font-size: 0.8rem;">${percentage}%</div>
                </div>
            `;
        }
    });
    statsHTML += '</div>';
    
    // Remove old stats
    const oldStats = categoryStats.querySelector('.stats-grid');
    if (oldStats) oldStats.remove();
    
    // Add new stats
    const statsGrid = document.createElement('div');
    statsGrid.className = 'stats-grid';
    statsGrid.innerHTML = Object.entries(stats).filter(([_, count]) => count > 0).map(([cat, count]) => {
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
        return `
            <div class="stat-item" style="background: ${categoryColors[cat]}">
                <div class="stat-name">${cat}</div>
                <div class="stat-count">${count}</div>
                <div style="font-size: 0.8rem;">${percentage}%</div>
            </div>
        `;
    }).join('');
    
    categoryStats.appendChild(statsGrid);
}

// Modal Functions
function openModal(id = null) {
    modal.style.display = 'block';
    currentEditId = id;
    
    if (id) {
        modalTitle.textContent = '답사 기록 수정';
        const record = records.find(r => r.id === id);
        if (record) {
            fillForm(record);
        }
    } else {
        modalTitle.textContent = '답사 기록 추가';
        recordForm.reset();
        photoPreview.innerHTML = '';
        tagList.innerHTML = '';
        selectedTags = [];
    }
}

function closeModal() {
    modal.style.display = 'none';
    currentEditId = null;
    photoPreview.innerHTML = '';
    tagList.innerHTML = '';
    selectedTags = [];
    recordForm.reset();
}

function fillForm(record) {
    document.getElementById('buildingName').value = record.buildingName || '';
    document.getElementById('category').value = record.category || '';
    document.getElementById('location').value = record.location || '';
    document.getElementById('date').value = record.date || '';
    document.getElementById('note').value = record.note || '';
    document.getElementById('isPublic').checked = record.isPublic !== false;
    
    if (record.photo) {
        photoPreview.innerHTML = `<img src="${record.photo}" alt="${record.buildingName}">`;
    }
    
    tagList.innerHTML = '';
    selectedTags = [];
    if (record.tags && Array.isArray(record.tags)) {
        selectedTags = [...record.tags];
        record.tags.forEach(tag => addTagToDisplay(tag));
    }
}

// Photo Preview
function handlePhotoPreview(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            photoPreview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    }
}

// Tag Management
let selectedTags = [];

function addTag() {
    const value = tagInput.value.trim();
    if (value && !selectedTags.includes(value)) {
        selectedTags.push(value);
        addTagToDisplay(value);
        tags.add(value);
        tagInput.value = '';
    }
}

function addTagToDisplay(tagName) {
    const tagElement = document.createElement('span');
    tagElement.className = 'tag';
    tagElement.innerHTML = `${tagName} <span class="tag-remove">&times;</span>`;
    tagElement.querySelector('.tag-remove').addEventListener('click', () => {
        removeTag(tagName);
    });
    tagList.appendChild(tagElement);
}

function removeTag(tagName) {
    selectedTags = selectedTags.filter(t => t !== tagName);
    renderTags();
}

function renderTags() {
    tagList.innerHTML = '';
    selectedTags.forEach(tag => addTagToDisplay(tag));
}

// Form Submit Handler
function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
        buildingName: document.getElementById('buildingName').value,
        category: document.getElementById('category').value,
        location: document.getElementById('location').value,
        date: document.getElementById('date').value,
        note: document.getElementById('note').value,
        tags: selectedTags.slice(),
        isPublic: document.getElementById('isPublic').checked,
        userId: currentUser ? currentUser.id : 'anonymous'
    };
    
    // Handle photo
    const file = photoInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            formData.photo = event.target.result;
            saveRecord(formData);
        };
        reader.readAsDataURL(file);
    } else {
        // Keep existing photo if editing
        if (currentEditId) {
            const existingRecord = records.find(r => r.id === currentEditId);
            formData.photo = existingRecord ? existingRecord.photo : '';
        }
        saveRecord(formData);
    }
}

function saveRecord(formData) {
    if (currentEditId) {
        // Edit existing record
        const index = records.findIndex(r => r.id === currentEditId);
        if (index !== -1) {
            records[index] = { ...records[index], ...formData, updatedAt: new Date().toISOString() };
        }
    } else {
        // Add new record
        const newRecord = {
            id: generateId(),
            ...formData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        records.push(newRecord);
    }
    
    saveRecords();
    updateTags();
    renderRecords();
    closeModal();
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Comment Management
function addComment(recordId, author, content) {
    const comment = {
        id: generateId(),
        recordId: recordId,
        author: author,
        content: content,
        createdAt: new Date().toISOString()
    };
    comments.push(comment);
    saveComments();
    
    // Clear form
    document.getElementById('commentAuthor').value = '';
    document.getElementById('commentText').value = '';
    
    renderComments(recordId);
}

function renderComments(recordId) {
    const commentsList = document.getElementById('commentsList');
    const recordComments = comments.filter(c => c.recordId === recordId).sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    if (recordComments.length === 0) {
        commentsList.innerHTML = '<p style="text-align: center; color: #999;">댓글이 없습니다.</p>';
    } else {
        commentsList.innerHTML = recordComments.map(comment => `
            <div class="comment-item">
                <div class="comment-header">
                    <span class="comment-author">${comment.author}</span>
                    <span class="comment-date">${formatDate(comment.createdAt)}</span>
                </div>
                <div class="comment-text">${comment.content}</div>
            </div>
        `).join('');
    }
}

// Render Records
function renderRecords() {
    let filtered = filterRecords(records);
    filtered = sortRecords(filtered);
    
    recordsList.innerHTML = '';
    
    if (filtered.length === 0) {
        recordsList.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <h3>📝 기록이 없습니다</h3>
                <p>첫 번째 건축 답사 기록을 추가해보세요!</p>
            </div>
        `;
        return;
    }
    
    filtered.forEach(record => {
        const card = createRecordCard(record);
        recordsList.appendChild(card);
    });
}

function filterRecords(records) {
    let filtered = records;
    
    // User filter (show all if on "all" tab or only current user's records)
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
    if (activeTab !== 'all' && activeTab !== 'users' && currentUser) {
        filtered = filtered.filter(r => r.userId === currentUser.id);
    }
    
    // Search filter
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(record => 
            record.buildingName.toLowerCase().includes(searchTerm) ||
            record.location.toLowerCase().includes(searchTerm)
        );
    }
    
    // Category filter
    const selectedCategory = categoryFilter.value;
    if (selectedCategory) {
        filtered = filtered.filter(record => record.category === selectedCategory);
    }
    
    // Tag filter
    const selectedTag = tagFilter.value;
    if (selectedTag) {
        filtered = filtered.filter(record => 
            record.tags && record.tags.includes(selectedTag)
        );
    }
    
    return filtered;
}

function sortRecords(records) {
    const sortValue = sortSelect.value;
    
    switch(sortValue) {
        case 'date-desc':
            return [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
        case 'date-asc':
            return [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
        case 'name-asc':
            return [...records].sort((a, b) => a.buildingName.localeCompare(b.buildingName));
        default:
            return records;
    }
}

function createRecordCard(record) {
    const card = document.createElement('div');
    card.className = 'record-card';
    
    const imageHTML = record.photo 
        ? `<img src="${record.photo}" alt="${record.buildingName}" class="record-image">`
        : `<div class="record-image">🏛️</div>`;
    
    const categoryBadge = record.category 
        ? `<div class="category-badge" style="background: ${categoryColors[record.category] || categoryColors['기타']};">${record.category}</div>`
        : '';
    
    const tagsHTML = record.tags && record.tags.length > 0
        ? `<div class="record-tags">${record.tags.map(tag => `<span class="tag-small">${tag}</span>`).join('')}</div>`
        : '';
    
    const commentCount = getCommentCount(record.id);
    const commentBadge = commentCount > 0 
        ? `<div class="comment-count">💬 ${commentCount}개 댓글</div>` 
        : '';
    
    card.innerHTML = `
        ${imageHTML}
        <div class="record-content">
            ${categoryBadge}
            <div class="record-title">${record.buildingName}</div>
            <div class="record-info">📍 ${record.location || '위치 정보 없음'}</div>
            <div class="record-info">📅 ${formatDate(record.date)}</div>
            ${tagsHTML}
            ${record.note ? `<div class="record-note">${record.note}</div>` : ''}
            ${commentBadge}
            <div class="record-actions">
                <button class="btn btn-primary" onclick="viewDetails('${record.id}')">📖 상세</button>
                ${currentUser && record.userId === currentUser.id ? `
                    <button class="btn btn-edit" onclick="editRecord('${record.id}')">✏️ 수정</button>
                    <button class="btn btn-danger" onclick="deleteRecord('${record.id}')">🗑️ 삭제</button>
                ` : ''}
            </div>
        </div>
    `;
    
    return card;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// View Details
window.viewDetails = function(id) {
    const record = records.find(r => r.id === id);
    if (!record) return;
    
    currentDetailId = id;
    const comments = comments.filter(c => c.recordId === id);
    
    const content = document.getElementById('detailContent');
    content.innerHTML = `
        <h2>${record.buildingName}</h2>
        ${record.category ? `<div class="category-badge" style="background: ${categoryColors[record.category] || categoryColors['기타']};">${record.category}</div>` : ''}
        <p><strong>위치:</strong> ${record.location || '정보 없음'}</p>
        <p><strong>답사 날짜:</strong> ${formatDate(record.date)}</p>
        ${record.photo ? `<img src="${record.photo}" alt="${record.buildingName}">` : ''}
        ${record.note ? `<div class="record-note"><strong>메모:</strong><br>${record.note}</div>` : ''}
        ${record.tags && record.tags.length > 0 ? `<div class="record-tags"><strong>태그:</strong><br>${record.tags.map(t => `<span class="tag-small">${t}</span>`).join(' ')}</div>` : ''}
    `;
    
    renderComments(id);
    detailModal.style.display = 'block';
};

// Edit and Delete Functions
window.editRecord = function(id) {
    const record = records.find(r => r.id === id);
    if (record && record.tags) {
        selectedTags = [...record.tags];
    } else {
        selectedTags = [];
    }
    
    renderTags();
    openModal(id);
};

window.deleteRecord = function(id) {
    if (confirm('정말 이 기록을 삭제하시겠습니까?')) {
        records = records.filter(r => r.id !== id);
        comments = comments.filter(c => c.recordId !== id);
        saveRecords();
        saveComments();
        updateTags();
        renderRecords();
    }
};
