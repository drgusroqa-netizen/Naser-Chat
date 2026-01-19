// ===== إدارة المصادقة =====

class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.user = null;
        this.init();
    }

    async init() {
        // التحقق من التوكن الموجود
        const token = localStorage.getItem('naser_token');
        if (token) {
            await this.verifyToken(token);
        }
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // تبديل بين تسجيل الدخول والتسجيل
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabId = e.currentTarget.dataset.tab;
                this.switchAuthTab(tabId);
            });
        });

        // تسجيل الدخول
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // التسجيل
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // إظهار/إخفاء كلمة المرور
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const targetId = e.currentTarget.dataset.target;
                this.togglePasswordVisibility(targetId);
            });
        });

        // تسجيل الخروج
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    switchAuthTab(tabId) {
        // تحديث التبويبات النشطة
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelector(`.auth-tab[data-tab="${tabId}"]`).classList.add('active');

        // تبديل النماذج
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        
        document.getElementById(`${tabId}-form`).classList.add('active');
    }

    togglePasswordVisibility(inputId) {
        const input = document.getElementById(inputId);
        const toggle = document.querySelector(`.password-toggle[data-target="${inputId}"] i`);
        
        if (input.type === 'password') {
            input.type = 'text';
            toggle.classList.remove('fa-eye');
            toggle.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            toggle.classList.remove('fa-eye-slash');
            toggle.classList.add('fa-eye');
        }
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('remember-me')?.checked;

        if (!email || !password) {
            utils.showToast('يرجى ملء جميع الحقول', 'error');
            return;
        }

        try {
            const user = await api.login(email, password);
            
            if (user) {
                this.handleLoginSuccess(user, rememberMe);
            }
        } catch (error) {
            console.error('Login error:', error);
            utils.showToast(error.message || 'فشل تسجيل الدخول', 'error');
        }
    }

    async handleRegister() {
        const username = document.getElementById('register-username').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const displayName = document.getElementById('register-displayname')?.value.trim() || '';
        const agreeTerms = document.getElementById('agree-terms')?.checked;

        if (!username || !email || !password) {
            utils.showToast('يرجى ملء الحقول المطلوبة', 'error');
            return;
        }

        if (!agreeTerms) {
            utils.showToast('يجب الموافقة على الشروط والأحكام', 'error');
            return;
        }

        try {
            const user = await api.register(username, email, password, displayName);
            
            if (user) {
                this.handleLoginSuccess(user, true);
            }
        } catch (error) {
            console.error('Registration error:', error);
            utils.showToast(error.message || 'فشل إنشاء الحساب', 'error');
        }
    }

    async verifyToken(token) {
        try {
            const user = await api.verifyToken();
            
            if (user) {
                this.user = user;
                this.isAuthenticated = true;
                this.showMainApp();
                return true;
            }
        } catch (error) {
            console.error('Token verification error:', error);
            api.clearToken();
        }
        
        return false;
    }

    handleLoginSuccess(user, rememberMe = true) {
        this.user = user;
        this.isAuthenticated = true;
        
        if (!rememberMe) {
            // استخدام تخزين الجلسة بدلاً من التخزين المحلي الدائم
            sessionStorage.setItem('naser_token', api.getToken());
            localStorage.removeItem('naser_token');
        }
        
        utils.showToast('تم تسجيل الدخول بنجاح!', 'success');
        this.showMainApp();
    }

    showMainApp() {
        // إخفاء شاشة المصادقة
        document.getElementById('auth-screen').style.display = 'none';
        
        // إظهار التطبيق الرئيسي
        document.getElementById('main-app').style.display = 'flex';
        
        // تحديث بيانات المستخدم
        this.updateUserProfile();
        
        // الاتصال بالسوكيت
        if (this.user) {
            socketService.connect(this.user.id);
        }
        
        // تحميل البيانات الأولية
        this.loadInitialData();
        
        // إرسال حدث أن التطبيق جاهز
        document.dispatchEvent(new Event('app:ready'));
    }

    updateUserProfile() {
        if (!this.user) return;

        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');
        const userTag = document.getElementById('user-tag');

        if (userAvatar) {
            userAvatar.src = this.user.avatar || utils.generateAvatarUrl(this.user.displayName || this.user.username);
        }

        if (userName) {
            userName.textContent = this.user.displayName || this.user.username;
        }

        if (userTag) {
            userTag.textContent = `#${this.user.id.slice(-4)}`;
        }
    }

    async loadInitialData() {
        try {
            // تحميل الخوادم
            const serversResponse = await api.getUserServers();
            if (serversResponse.success) {
                window.appState.servers = serversResponse.servers;
                this.renderServers();
            }

            // تحميل الأصدقاء
            const friendsResponse = await api.getFriends();
            if (friendsResponse.success) {
                window.appState.friends = friendsResponse.friends;
                this.renderFriends();
            }

            // تحميل طلبات الصداقة
            const requestsResponse = await api.getFriendRequests();
            if (requestsResponse.success) {
                window.appState.friendRequests = requestsResponse.requests;
            }

        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    renderServers() {
        const serverList = document.querySelector('.server-list');
        if (!serverList || !window.appState.servers) return;

        serverList.innerHTML = '';

        // الخادم الرئيسي (الرسائل المباشرة)
        const homeServer = utils.createElement('div', ['server-item', 'active'], { id: 'home-server' });
        homeServer.innerHTML = '<i class="fas fa-home"></i>';
        homeServer.addEventListener('click', () => this.loadDirectMessages());
        serverList.appendChild(homeServer);

        // فاصل
        const separator = utils.createElement('div', ['server-separator']);
        serverList.appendChild(separator);

        // الخوادم
        window.appState.servers.forEach(server => {
            const serverItem = utils.createElement('div', ['server-item'], {
                'data-server-id': server._id
            });
            
            const avatarUrl = server.icon || utils.generateAvatarUrl(server.name);
            serverItem.innerHTML = `<img src="${avatarUrl}" alt="${server.name}">`;
            
            serverItem.addEventListener('click', () => this.loadServer(server));
            serverList.appendChild(serverItem);
        });

        // زر إضافة خادم
        const addServerBtn = utils.createElement('div', ['server-item', 'add-server']);
        addServerBtn.innerHTML = '<i class="fas fa-plus"></i>';
        addServerBtn.addEventListener('click', () => utils.openModal('create-server-modal'));
        serverList.appendChild(addServerBtn);
    }

    renderFriends() {
        const friendsList = document.querySelector('.friends-list');
        if (!friendsList || !window.appState.friends) return;

        friendsList.innerHTML = '';

        window.appState.friends.forEach(friend => {
            const friendItem = utils.createElement('div', ['friend-item']);
            
            const avatarUrl = friend.avatar || utils.generateAvatarUrl(friend.displayName || friend.username);
            
            friendItem.innerHTML = `
                <div class="friend-avatar">
                    <img src="${avatarUrl}" alt="${friend.displayName || friend.username}">
                    <div class="friend-status ${friend.status || 'offline'}"></div>
                </div>
                <div class="friend-info">
                    <div class="friend-name">${friend.displayName || friend.username}</div>
                    <div class="friend-activity">${this.getFriendActivity(friend)}</div>
                </div>
            `;
            
            friendItem.addEventListener('click', () => this.openDirectMessage(friend));
            friendsList.appendChild(friendItem);
        });
    }

    getFriendActivity(friend) {
        if (friend.status === 'online') {
            return '🟢 متصل';
        } else if (friend.status === 'idle') {
            return '🟡 مشغول';
        } else if (friend.status === 'dnd') {
            return '🔴 لا تزعج';
        } else {
            return '⚫ غير متصل';
        }
    }

    async loadServer(server) {
        try {
            const response = await api.getServer(server._id);
            if (response.success) {
                window.appState.currentServer = response.server;
                this.updateServerView();
            }
        } catch (error) {
            console.error('Error loading server:', error);
            utils.showToast('فشل تحميل الخادم', 'error');
        }
    }

    updateServerView() {
        const server = window.appState.currentServer;
        if (!server) return;

        // تحديث اسم الخادم
        const serverName = document.getElementById('server-name');
        if (serverName) {
            serverName.textContent = server.name;
        }

        // تحديث أيقونة الخادم
        const serverIcon = document.getElementById('server-icon-img');
        if (serverIcon) {
            serverIcon.src = server.icon || utils.generateAvatarUrl(server.name);
        }

        // تحديث عدد المتصلين
        const onlineCount = document.querySelector('.online-count');
        if (onlineCount && server.members) {
            const onlineMembers = server.members.filter(m => m.user?.status === 'online');
            onlineCount.textContent = onlineMembers.length;
        }

        // تحميل القنوات
        this.loadChannels();
        
        // تحميل الأعضاء
        this.loadMembers();
    }

    async loadChannels() {
        if (!window.appState.currentServer) return;

        try {
            const response = await api.getServerChannels(window.appState.currentServer._id);
            if (response.success) {
                window.appState.channels = response.channels;
                this.renderChannels();
            }
        } catch (error) {
            console.error('Error loading channels:', error);
        }
    }

    renderChannels() {
        const channelsContainer = document.querySelector('.channels-container');
        if (!channelsContainer || !window.appState.channels) return;

        channelsContainer.innerHTML = '';

        // تجميع القنوات حسب الفئة
        const categorizedChannels = {};
        
        window.appState.channels.forEach(channel => {
            const category = channel.category || 'غير مصنف';
            if (!categorizedChannels[category]) {
                categorizedChannels[category] = [];
            }
            categorizedChannels[category].push(channel);
        });

        // عرض القنوات
        Object.entries(categorizedChannels).forEach(([category, channels]) => {
            const categoryElement = utils.createElement('div', ['channel-category']);
            
            const categoryHeader = utils.createElement('div', ['category-header']);
            categoryHeader.innerHTML = `
                <span>${category}</span>
                <div class="category-actions">
                    <i class="fas fa-plus"></i>
                </div>
            `;
            
            const channelList = utils.createElement('div', ['channel-list']);
            
            channels.sort((a, b) => a.position - b.position).forEach(channel => {
                const channelItem = utils.createElement('div', ['channel-item'], {
                    'data-channel-id': channel._id
                });
                
                const icon = channel.type === 'text' ? 'fa-hashtag' : 'fa-volume-up';
                channelItem.innerHTML = `
                    <i class="fas ${icon}"></i>
                    <span>${channel.name}</span>
                `;
                
                channelItem.addEventListener('click', () => this.loadChannel(channel));
                channelList.appendChild(channelItem);
            });
            
            categoryElement.appendChild(categoryHeader);
            categoryElement.appendChild(channelList);
            channelsContainer.appendChild(categoryElement);
        });
    }

    async loadMembers() {
        if (!window.appState.currentServer) return;

        try {
            const response = await api.getServerMembers(window.appState.currentServer._id);
            if (response.success) {
                window.appState.members = response.members;
                this.renderMembers();
            }
        } catch (error) {
            console.error('Error loading members:', error);
        }
    }

    renderMembers() {
        const membersList = document.querySelector('.members-list');
        const membersCount = document.querySelector('.members-count');
        
        if (!membersList || !window.appState.members) return;

        membersList.innerHTML = '';

        window.appState.members.forEach(member => {
            const memberItem = utils.createElement('div', ['member-item']);
            
            const user = member.user;
            const avatarUrl = user.avatar || utils.generateAvatarUrl(user.displayName || user.username);
            
            memberItem.innerHTML = `
                <div class="member-avatar">
                    <img src="${avatarUrl}" alt="${user.displayName || user.username}">
                    <div class="member-status ${user.status || 'offline'}"></div>
                </div>
                <div class="member-info">
                    <div class="member-name">${user.displayName || user.username}</div>
                    <div class="member-role">${this.getRoleText(member.role)}</div>
                </div>
            `;
            
            membersList.appendChild(memberItem);
        });

        if (membersCount) {
            membersCount.textContent = window.appState.members.length;
        }
    }

    getRoleText(role) {
        const roles = {
            owner: 'المالك',
            admin: 'مدير',
            moderator: 'مشرف',
            member: 'عضو'
        };
        return roles[role] || role;
    }

    async loadChannel(channel) {
        window.appState.currentChannel = channel;
        this.updateChannelView();
        
        // الانضمام إلى غرفة القناة
        socketService.joinChannel(channel._id);
        
        // تحميل الرسائل
        await this.loadMessages();
    }

    updateChannelView() {
        const channel = window.appState.currentChannel;
        if (!channel) return;

        // تحديث اسم القناة
        const channelName = document.getElementById('channel-name');
        if (channelName) {
            channelName.textContent = channel.name;
        }

        // تحديث أيقونة القناة
        const channelIcon = document.getElementById('channel-icon');
        if (channelIcon) {
            channelIcon.className = channel.type === 'text' ? 'fas fa-hashtag' : 'fas fa-volume-up';
        }

        // تحديث موضوع القناة
        const channelTopic = document.getElementById('channel-topic');
        if (channelTopic) {
            channelTopic.textContent = channel.topic || '';
            channelTopic.style.display = channel.topic ? 'block' : 'none';
        }

        // إظهار/إخفاء رسالة الترحيب
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
    }

    async loadMessages() {
        if (!window.appState.currentChannel) return;

        try {
            const response = await api.getMessages(window.appState.currentChannel._id, 50);
            if (response.success) {
                window.appState.messages = response.messages;
                this.renderMessages();
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    renderMessages() {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer || !window.appState.messages) return;

        messagesContainer.innerHTML = '';

        if (window.appState.messages.length === 0) {
            // إظهار رسالة الترحيب إذا لم تكن هناك رسائل
            const welcomeMessage = document.getElementById('welcome-message');
            if (welcomeMessage) {
                welcomeMessage.style.display = 'block';
            }
            return;
        }

        window.appState.messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });

        // التمرير إلى الأسفل
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    createMessageElement(message) {
        const isCurrentUser = message.author._id === window.appState.user?.id;
        
        const messageDiv = utils.createElement('div', ['message', isCurrentUser ? 'user-message' : '']);
        
        const avatarUrl = message.author.avatar || 
                         utils.generateAvatarUrl(message.author.displayName || message.author.username);
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <img src="${avatarUrl}" alt="${message.author.displayName || message.author.username}">
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${message.author.displayName || message.author.username}</span>
                    <span class="message-time">${utils.formatMessageTime(message.timestamp)}</span>
                </div>
                <div class="message-text">${utils.escapeHtml(message.content)}</div>
                ${this.renderAttachments(message.attachments)}
                ${this.renderReactions(message.reactions)}
            </div>
            <div class="message-actions">
                ${this.renderMessageActions(message, isCurrentUser)}
            </div>
        `;
        
        return messageDiv;
    }

    renderAttachments(attachments) {
        if (!attachments || attachments.length === 0) return '';
        
        return `
            <div class="message-attachments">
                ${attachments.map(att => `
                    <div class="attachment-item">
                        <div class="attachment-icon">
                            <i class="fas fa-file"></i>
                        </div>
                        <div class="attachment-info">
                            <div class="attachment-name">${att.filename}</div>
                            <div class="attachment-size">${utils.formatFileSize(att.size)}</div>
                        </div>
                        <button class="attachment-remove" onclick="utils.downloadFile('${att.url}', '${att.filename}')">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderReactions(reactions) {
        if (!reactions || reactions.length === 0) return '';
        
        return `
            <div class="message-reactions">
                ${reactions.map(reaction => `
                    <div class="reaction">
                        <span class="reaction-emoji">${reaction.emoji}</span>
                        <span class="reaction-count">${reaction.count}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderMessageActions(message, isCurrentUser) {
        const actions = [];
        
        if (isCurrentUser) {
            actions.push('<button class="message-action-btn" title="تعديل"><i class="fas fa-edit"></i></button>');
            actions.push('<button class="message-action-btn" title="حذف"><i class="fas fa-trash"></i></button>');
        } else {
            actions.push('<button class="message-action-btn" title="رد"><i class="fas fa-reply"></i></button>');
            actions.push('<button class="message-action-btn" title="تفاعل"><i class="fas fa-smile"></i></button>');
        }
        
        actions.push('<button class="message-action-btn" title="تثبيت"><i class="fas fa-thumbtack"></i></button>');
        
        return actions.join('');
    }

    loadDirectMessages() {
        // تحميل الرسائل المباشرة (الأصدقاء)
        window.appState.currentServer = null;
        window.appState.currentChannel = null;
        
        // تحديث الواجهة
        const serverName = document.getElementById('server-name');
        if (serverName) {
            serverName.textContent = 'الرسائل المباشرة';
        }
        
        const channelsContainer = document.querySelector('.channels-container');
        if (channelsContainer) {
            channelsContainer.innerHTML = '<div class="direct-messages-info">اختر صديقاً للمحادثة</div>';
        }
        
        const membersContainer = document.querySelector('.members-container');
        if (membersContainer) {
            membersContainer.style.display = 'none';
        }
        
        const chatHeader = document.querySelector('.chat-header');
        if (chatHeader) {
            chatHeader.style.display = 'none';
        }
    }

    openDirectMessage(friend) {
        // فتح محادثة مباشرة مع صديق
        console.log('Opening direct message with:', friend);
        // TODO: تنفيذ نظام الرسائل المباشرة
    }

    async logout() {
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.handleLogout();
        }
    }

    handleLogout() {
        // فصل السوكيت
        socketService.disconnect();
        
        // مسح البيانات
        this.user = null;
        this.isAuthenticated = false;
        window.appState = {
            servers: [],
            channels: [],
            messages: [],
            members: [],
            friends: [],
            friendRequests: [],
            currentServer: null,
            currentChannel: null
        };
        
        // إعادة التوجيه إلى شاشة المصادقة
        document.getElementById('main-app').style.display = 'none';
        document.getElementById('auth-screen').style.display = 'flex';
        
        // مسح النماذج
        this.clearForms();
        
        utils.showToast('تم تسجيل الخروج بنجاح', 'success');
    }

    clearForms() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.reset();
        
        const registerForm = document.getElementById('register-form');
        if (registerForm) registerForm.reset();
        
        // العودة إلى تبويب تسجيل الدخول
        this.switchAuthTab('login');
    }

    // ===== الحصول على البيانات =====
    getUser() {
        return this.user;
    }

    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    getUserId() {
        return this.user?.id;
    }
}

// إنشاء نسخة عامة
const authManager = new AuthManager();

// تصدير للاستخدام في الملفات الأخرى
window.authManager = authManager;

// تهيئة حالة التطبيق
window.appState = {
    user: null,
    servers: [],
    channels: [],
    messages: [],
    members: [],
    friends: [],
    friendRequests: [],
    currentServer: null,
    currentChannel: null,
    onlineUsers: new Set(),
    typingUsers: new Map()
};
