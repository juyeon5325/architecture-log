// Main Application Logic

const App = {
    currentUser: null,
    currentTab: 'feed',
    pastedImageData: null,
    droppedFile: null,
    droppedFiles: null,
    editingPostId: null,
    
    init() {
        this.currentUser = DataService.getCurrentUser();
        this.pastedImageData = null;
        this.droppedFile = null;
        this.droppedFiles = null;
        this.editingPostId = null;
        
        if (!this.currentUser) {
            this.showLoginModal();
        } else {
            this.showApp();
        }
        
        this.setupEventListeners();
        this.renderCurrentTab();
    },
    
    showLoginModal() {
        document.getElementById('loginModal').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
    },
    
    showApp() {
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        this.updateUsernameDisplay();
    },
    
    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('usernameInput').value;
            const bio = document.getElementById('bioInput').value || 'Architecture enthusiast';
            
            this.currentUser = {
                id: 'user_' + Date.now(),
                username: username,
                bio: bio,
                createdAt: new Date().toISOString()
            };
            
            DataService.setCurrentUser(this.currentUser);
            this.showApp();
        });
        
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });
        
        // Upload form
        const uploadForm = document.getElementById('uploadForm');
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Form submitted!');
                this.handleUpload();
                return false;
            });
        }
        
        // Photo upload preview
        document.getElementById('photoInput').addEventListener('change', (e) => {
            this.handlePhotoPreview(e);
        });
        
        // Drag and drop functionality
        this.setupDragAndDrop();
        
        // Paste image from clipboard
        window.addEventListener('paste', (e) => {
            this.handlePaste(e);
        });
        
        // Category filter
        document.getElementById('categoryFilter').addEventListener('change', () => {
            this.renderFeed();
        });
        
        // Search input
        document.getElementById('searchInput').addEventListener('input', () => {
            this.renderFeed();
        });
        
        // Modal close
        document.getElementById('modalClose').addEventListener('click', () => {
            document.getElementById('postModal').classList.add('hidden');
        });
    },
    
    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName + '-tab').classList.add('active');
        
        this.renderCurrentTab();
    },
    
    renderCurrentTab() {
        switch(this.currentTab) {
            case 'feed':
                this.renderFeed();
                break;
            case 'explore':
                this.renderExplore();
                break;
            case 'profile':
                this.renderProfile();
                break;
            case 'upload':
                // Upload form is static
                break;
        }
    },
    
    renderFeed() {
        let posts = DataService.getPosts().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Filter by category
        const category = document.getElementById('categoryFilter').value;
        if (category) {
            posts = posts.filter(p => p.category === category);
        }
        
        // Filter by search
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        if (searchTerm) {
            posts = posts.filter(p => 
                p.buildingName.toLowerCase().includes(searchTerm) ||
                p.location.toLowerCase().includes(searchTerm) ||
                (p.tags && p.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
            );
        }
        
        this.renderPosts(posts, document.getElementById('feedPosts'));
    },
    
    renderExplore() {
        const posts = DataService.getPosts().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const container = document.getElementById('exploreGrid');
        
        container.innerHTML = posts.map(post => `
            <div class="explore-card" onclick="App.showPostDetail('${post.id}')">
                ${post.photo ? 
                    `<img src="${post.photo}" alt="${post.buildingName}">` :
                    `<div class="explore-card-placeholder">🏛️</div>`
                }
            </div>
        `).join('');
    },
    
    renderProfile() {
        const userPosts = DataService.getUserPosts(this.currentUser.id);
        
        document.getElementById('profileUsername').textContent = this.currentUser.username;
        document.getElementById('profileBio').textContent = this.currentUser.bio;
        
        this.renderPosts(userPosts, document.getElementById('userPosts'));
    },
    
    renderPosts(posts, container) {
        if (posts.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6F7579; padding: 48px;">No posts yet. Start sharing your architecture journey!</p>';
            return;
        }
        
        container.innerHTML = posts.map(post => this.createPostCard(post)).join('');
        
        // Re-attach event listeners
        posts.forEach(post => {
            const likeBtn = document.getElementById(`like-btn-${post.id}`);
            if (likeBtn) {
                likeBtn.addEventListener('click', () => this.toggleLike(post.id));
            }
            
            const commentBtn = document.getElementById(`comment-btn-${post.id}`);
            if (commentBtn) {
                commentBtn.addEventListener('click', () => this.showPostDetail(post.id));
            }
        });
    },
    
    createPostCard(post) {
        const likes = DataService.getLikes(post.id);
        const isLiked = DataService.isLiked(post.id, this.currentUser.id);
        const comments = DataService.getComments(post.id);
        
        const categoryClass = post.category ? `category-${post.category.toLowerCase()}` : 'category-other';
        
        return `
            <div class="post-card" style="border-left: 4px solid ${post.emotionColor || '#E8E8E8'};">
                <div class="post-header">
                    <div class="post-author">
                        <div class="post-author-avatar">${post.username.charAt(0).toUpperCase()}</div>
                        <div>
                            <div class="post-author-name">${post.username}</div>
                            <div class="post-date">${this.formatDate(post.date)}</div>
                        </div>
                    </div>
                </div>
                ${post.photo ? 
                    `<img src="${post.photo}" alt="${post.buildingName}" class="post-image">` :
                    `<div class="post-image-placeholder">🏛️</div>`
                }
                <div class="post-content">
                    ${post.category ? `<div class="post-category ${categoryClass}">${post.category}</div>` : ''}
                    <h3 class="post-building-name">${post.buildingName}</h3>
                    <div class="post-location">📍 ${post.location || 'Location not specified'}</div>
                    ${post.note ? `<div class="post-note" style="background: ${post.emotionColor ? post.emotionColor + '20' : 'transparent'}; padding: 12px; border-radius: 8px; margin: 8px 0;">${post.note}</div>` : ''}
                    ${post.tags && post.tags.length > 0 ? `
                        <div class="post-tags">
                            ${post.tags.map(tag => `<span class="post-tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="post-actions">
                    <button class="btn-icon ${isLiked ? 'liked' : ''}" id="like-btn-${post.id}">
                        ❤️
                    </button>
                    <div class="post-stats">
                        <span id="like-count-${post.id}">${likes.length}</span> likes
                        <span id="comment-count-${post.id}">${comments.length}</span> comments
                    </div>
                    <button class="btn-icon" id="comment-btn-${post.id}">💬</button>
                    ${post.userId === this.currentUser.id ? `
                        <button class="btn-icon" id="edit-btn-${post.id}" onclick="App.editPost('${post.id}')" style="margin-left: auto;">✏️</button>
                        <button class="btn-icon" id="delete-btn-${post.id}" onclick="App.deletePost('${post.id}')" style="color: #e74c3c;">🗑️</button>
                    ` : ''}
                </div>
                <div class="post-comments-section">
                    <div class="comments-list" id="comments-${post.id}">
                        ${this.renderComments(post.id)}
                    </div>
                    <div class="comment-form">
                        <input type="text" class="comment-input" id="comment-text-${post.id}" placeholder="Add a comment...">
                        <button class="comment-submit" onclick="App.addComment('${post.id}')">Post</button>
                    </div>
                </div>
            </div>
        `;
    },
    
    renderComments(postId) {
        const comments = DataService.getComments(postId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        return comments.map(comment => `
            <div class="comment-item">
                <span class="comment-author">${comment.username}:</span>
                <span class="comment-text">${comment.content}</span>
            </div>
        `).join('');
    },
    
    toggleLike(postId) {
        DataService.toggleLike(postId, this.currentUser.id);
        
        const likes = DataService.getLikes(postId);
        const isLiked = DataService.isLiked(postId, this.currentUser.id);
        
        document.getElementById(`like-count-${postId}`).textContent = likes.length;
        
        const btn = document.getElementById(`like-btn-${postId}`);
        if (isLiked) {
            btn.classList.add('liked');
        } else {
            btn.classList.remove('liked');
        }
    },
    
    addComment(postId) {
        const input = document.getElementById(`comment-text-${postId}`);
        const content = input.value.trim();
        
        if (!content) return;
        
        const comment = {
            id: 'comment_' + Date.now(),
            postId: postId,
            userId: this.currentUser.id,
            username: this.currentUser.username,
            content: content,
            createdAt: new Date().toISOString()
        };
        
        DataService.saveComment(comment);
        input.value = '';
        
        // Update comments display
        document.getElementById(`comments-${postId}`).innerHTML = this.renderComments(postId);
        
        // Update comment count
        const comments = DataService.getComments(postId);
        document.getElementById(`comment-count-${postId}`).textContent = comments.length;
    },
    
    showPostDetail(postId) {
        const post = DataService.getPosts().find(p => p.id === postId);
        if (!post) return;
        
        const likes = DataService.getLikes(postId);
        const isLiked = DataService.isLiked(postId, this.currentUser.id);
        const comments = DataService.getComments(postId);
        
        const content = document.getElementById('postModalContent');
        content.innerHTML = `
            <div class="post-card">
                <div class="post-header">
                    <div class="post-author">
                        <div class="post-author-avatar">${post.username.charAt(0).toUpperCase()}</div>
                        <div>
                            <div class="post-author-name">${post.username}</div>
                            <div class="post-date">${this.formatDate(post.date)}</div>
                        </div>
                    </div>
                </div>
                ${post.photo ? 
                    `<img src="${post.photo}" alt="${post.buildingName}" class="post-image">` :
                    `<div class="post-image-placeholder">🏛️</div>`
                }
                <div class="post-content">
                    <div class="post-category category-${post.category.toLowerCase()}">${post.category}</div>
                    <h3 class="post-building-name">${post.buildingName}</h3>
                    <div class="post-location">📍 ${post.location || 'Location not specified'}</div>
                    ${post.note ? `<div class="post-note">${post.note}</div>` : ''}
                    ${post.tags && post.tags.length > 0 ? `
                        <div class="post-tags">
                            ${post.tags.map(tag => `<span class="post-tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="post-actions">
                    <button class="btn-icon ${isLiked ? 'liked' : ''}" onclick="App.toggleLike('${post.id}'); App.showPostDetail('${post.id}')">
                        ❤️
                    </button>
                    <div class="post-stats">
                        <span>${likes.length}</span> likes
                        <span>${comments.length}</span> comments
                    </div>
                </div>
                <div class="post-comments-section">
                    <div class="comments-list">${this.renderComments(post.id)}</div>
                    <div class="comment-form">
                        <input type="text" class="comment-input" id="comment-text-modal-${post.id}" placeholder="Add a comment...">
                        <button class="comment-submit" onclick="App.addComment('${post.id}'); App.showPostDetail('${post.id}')">Post</button>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('postModal').classList.remove('hidden');
    },
    
    handleUpload() {
        console.log('=== handleUpload START ===');
        
        try {
            // Get form values
            const buildingName = document.getElementById('buildingNameInput').value;
            const category = document.getElementById('categoryInput').value;
            const location = document.getElementById('locationInput').value;
            const date = document.getElementById('dateInput').value;
            const note = document.getElementById('noteInput').value;
            const tagsInput = document.getElementById('tagsInput').value;
            const emotionColor = document.getElementById('emotionColorInput').value;
            
            console.log('Form values:', { buildingName, category, location, date, note });
            
            // Validate
            if (!buildingName) {
                alert('건물명을 입력해주세요.');
                return;
            }
            
            // Create post object
            const post = {
                id: this.editingPostId || ('post_' + Date.now()),
                userId: this.currentUser.id,
                username: this.currentUser.username,
                buildingName: buildingName,
                category: category,
                location: location,
                date: date || new Date().toISOString().split('T')[0],
                note: note,
                tags: tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag),
                emotionColor: emotionColor,
                createdAt: this.editingPostId ? undefined : new Date().toISOString(),
                updatedAt: this.editingPostId ? new Date().toISOString() : undefined
            };
            
            // Handle images
            const photoInput = document.getElementById('photoInput');
            const hasNewPhotos = (photoInput && photoInput.files.length > 0) || this.droppedFiles || this.droppedFile || this.pastedImageData;
            
            if (hasNewPhotos) {
                console.log('Has photos, processing...');
                this.processPhotosAndSave(post);
            } else {
                console.log('No new photos, saving directly');
                if (this.editingPostId) {
                    const existing = DataService.getPosts().find(p => p.id === this.editingPostId);
                    if (existing) {
                        post.photo = existing.photo;
                        post.photos = existing.photos || [];
                    }
                }
                DataService.savePost(post);
                this.afterPosting();
            }
        } catch (error) {
            console.error('Error in handleUpload:', error);
            alert('오류 발생: ' + error.message);
        }
    },
    
    afterPosting() {
        console.log('=== afterPosting START ===');
        
        // Reset editing state
        const wasEditing = !!this.editingPostId;
        this.editingPostId = null;
        
        // Reset form
        const form = document.getElementById('uploadForm');
        form.reset();
        document.getElementById('photoPreview').innerHTML = '';
        this.pastedImageData = null;
        this.droppedFile = null;
        this.droppedFiles = null;
        
        // Reset button text
        const submitBtn = document.querySelector('#uploadForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = '게시하기';
        }
        
        // Show success message
        alert(wasEditing ? '게시글이 수정되었습니다!' : '게시글이 등록되었습니다!');
        
        // Switch to feed
        this.switchTab('feed');
        
        console.log('=== afterPosting END ===');
    },
    
    processPhotosAndSave(post) {
        console.log('=== processPhotosAndSave START ===');
        
        const photosToProcess = [];
        const photoInput = document.getElementById('photoInput');
        
        // Collect photos from all sources
        if (photoInput && photoInput.files.length > 0) {
            for (let i = 0; i < photoInput.files.length; i++) {
                photosToProcess.push(photoInput.files[i]);
            }
        }
        
        if (this.droppedFiles && this.droppedFiles.length > 0) {
            this.droppedFiles.forEach(file => photosToProcess.push(file));
        } else if (this.droppedFile) {
            photosToProcess.push(this.droppedFile);
        }
        
        if (this.pastedImageData) {
            photosToProcess.push(this.pastedImageData);
        }
        
        console.log('Total photos to process:', photosToProcess.length);
        
        if (photosToProcess.length === 0) {
            post.photo = null;
            post.photos = [];
            DataService.savePost(post);
            this.afterPosting();
            return;
        }
        
        let processedCount = 0;
        const photosArray = [];
        
        photosToProcess.forEach((photoData) => {
            if (photoData instanceof File || photoData instanceof Blob) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    photosArray.push(e.target.result);
                    processedCount++;
                    console.log(`Processed ${processedCount}/${photosToProcess.length}`);
                    
                    if (processedCount === photosToProcess.length) {
                        post.photos = photosArray;
                        post.photo = photosArray[0];
                        console.log('All photos processed, saving...');
                        DataService.savePost(post);
                        this.afterPosting();
                    }
                };
                reader.onerror = () => {
                    console.error('Error reading file');
                    processedCount++;
                    if (processedCount === photosToProcess.length) {
                        post.photos = photosArray;
                        post.photo = photosArray[0] || null;
                        DataService.savePost(post);
                        this.afterPosting();
                    }
                };
                reader.readAsDataURL(photoData);
            } else {
                // Already base64
                photosArray.push(photoData);
                processedCount++;
                if (processedCount === photosToProcess.length) {
                    post.photos = photosArray;
                    post.photo = photosArray[0];
                    DataService.savePost(post);
                    this.afterPosting();
                }
            }
        });
    },
    
    
    handlePhotoPreview(e) {
        const preview = document.getElementById('photoPreview');
        const files = [];
        
        // Get files from event
        if (e.target && e.target.files) {
            for (let i = 0; i < e.target.files.length; i++) {
                files.push(e.target.files[i]);
            }
        } else if (e.files && e.files.length > 0) {
            for (let i = 0; i < e.files.length; i++) {
                files.push(e.files[i]);
            }
        }
        
        if (files.length === 0) return;
        
        // Display all images
        let html = '';
        let processedCount = 0;
        
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                html += `<img src="${event.target.result}" alt="Preview ${index + 1}" style="max-width: 150px; margin: 5px; border-radius: 8px; border: 2px solid var(--border-color);">`;
                processedCount++;
                
                if (processedCount === files.length) {
                    preview.innerHTML = html;
                    
                    // Show success message
                    const successMsg = document.createElement('div');
                    successMsg.style.cssText = 'background: #4CAF50; color: white; padding: 8px; border-radius: 4px; margin-top: 8px; font-size: 14px;';
                    successMsg.textContent = `✓ ${files.length}개의 이미지가 업로드되었습니다!`;
                    preview.appendChild(successMsg);
                    
                    setTimeout(() => {
                        successMsg.remove();
                    }, 3000);
                }
            };
            reader.readAsDataURL(file);
        });
    },
    
    setupDragAndDrop() {
        const dropZone = document.getElementById('uploadDropZone');
        const photoInput = document.getElementById('photoInput');
        
        if (!dropZone) return;
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
        });
        
        // Highlight drop zone when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('dragover');
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('dragover');
            });
        });
        
        // Handle dropped files
        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                // Store files for later use
                this.droppedFiles = Array.from(files);
                
                // Show preview for all images
                const preview = document.getElementById('photoPreview');
                let html = '';
                let processedCount = 0;
                
                this.droppedFiles.forEach((file, index) => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        html += `<img src="${event.target.result}" alt="Preview ${index + 1}" style="max-width: 150px; margin: 5px; border-radius: 8px; border: 2px solid var(--border-color);">`;
                        processedCount++;
                        
                        if (processedCount === this.droppedFiles.length) {
                            preview.innerHTML = html;
                            
                            const successMsg = document.createElement('div');
                            successMsg.style.cssText = 'background: #4CAF50; color: white; padding: 8px; border-radius: 4px; margin-top: 8px; font-size: 14px;';
                            successMsg.textContent = `✓ ${this.droppedFiles.length}개의 이미지가 업로드되었습니다!`;
                            preview.appendChild(successMsg);
                            
                            setTimeout(() => {
                                successMsg.remove();
                            }, 3000);
                        }
                    };
                    reader.readAsDataURL(file);
                });
            }
        });
        
        // Click drop zone to open file selector (but not when clicking button)
        dropZone.addEventListener('click', (e) => {
            // Don't trigger if clicking the button
            if (e.target.closest('.upload-button')) {
                return;
            }
            photoInput.click();
        });
    },
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    },
    
    handlePaste(e) {
        // Only handle paste in upload tab
        if (this.currentTab !== 'upload') return;
        
        const items = e.clipboardData.items;
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            // Check if the item is an image
            if (item.type.indexOf('image') !== -1) {
                const blob = item.getAsFile();
                const reader = new FileReader();
                const preview = document.getElementById('photoPreview');
                
                reader.onload = (event) => {
                    preview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
                    
                    // Store the pasted image data in a hidden input or in App state
                    App.pastedImageData = event.target.result;
                    
                    // Show success message
                    const successMsg = document.createElement('div');
                    successMsg.style.cssText = 'background: #4CAF50; color: white; padding: 8px; border-radius: 4px; margin-top: 8px; font-size: 14px;';
                    successMsg.textContent = '✓ 이미지가 붙여넣기되었습니다!';
                    preview.appendChild(successMsg);
                    
                    // Remove message after 3 seconds
                    setTimeout(() => {
                        successMsg.remove();
                    }, 3000);
                };
                
                reader.readAsDataURL(blob);
                e.preventDefault();
                break;
            }
        }
    },
    
    updateUsernameDisplay() {
        if (this.currentUser) {
            document.getElementById('currentUsername').textContent = this.currentUser.username;
        }
    },
    
    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('ko-KR', options);
    },
    
    editPost(postId) {
        const post = DataService.getPosts().find(p => p.id === postId);
        if (!post) return;
        
        // Fill form with post data
        document.getElementById('buildingNameInput').value = post.buildingName || '';
        document.getElementById('categoryInput').value = post.category || '종교건축';
        document.getElementById('locationInput').value = post.location || '';
        document.getElementById('dateInput').value = post.date || '';
        document.getElementById('noteInput').value = post.note || '';
        document.getElementById('tagsInput').value = post.tags ? post.tags.join(', ') : '';
        document.getElementById('emotionColorInput').value = post.emotionColor || '#F5E6D3';
        
        // Show preview if exists
        const preview = document.getElementById('photoPreview');
        if (post.photo) {
            preview.innerHTML = `<img src="${post.photo}" alt="Preview">`;
        } else {
            preview.innerHTML = '';
        }
        
        // Store editing post ID
        this.editingPostId = postId;
        
        // Switch to upload tab
        this.switchTab('upload');
        
        // Scroll to top
        window.scrollTo(0, 0);
        
        // Update button text
        const submitBtn = document.querySelector('#uploadForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = '수정하기';
        }
    },
    
    deletePost(postId) {
        if (!confirm('정말 이 게시글을 삭제하시겠습니까?')) {
            return;
        }
        
        try {
            DataService.deletePost(postId);
            console.log('Post deleted:', postId);
            
            // Re-render current tab
            this.renderCurrentTab();
            
            // Show success message
            alert('게시글이 삭제되었습니다.');
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

