// ===== مكتبة المساعدات =====

class Utils {
    constructor() {
        this.toasts = [];
        this.notifications = [];
    }

    // ===== معالجة الأخطاء =====
    handleError(error, context = '') {
        console.error(`[ERROR] ${context}:`, error);
        
        const errorMessage = this.extractErrorMessage(error);
        this.showToast(errorMessage, 'error');
        
        // إعادة الخطأ للتعامل معه في المستوى الأعلى
        return errorMessage;
    }

    extractErrorMessage(error) {
        if (typeof error === 'string') return error;
        if (error.response?.data?.error) return error.response.data.error;
        if (error.message) return error.message;
        return 'حدث خطأ غير متوقع';
    }

    // ===== التنبيهات =====
    showToast(message, type = 'info', duration = 3000) {
        const toast = Toastify({
            text: message,
            duration: duration,
            gravity: 'top',
            position: 'left',
            backgroundColor: this.getToastColor(type),
            stopOnFocus: true,
            onClick: () => toast.hideToast()
        }).showToast();
        
        this.toasts.push(toast);
        return toast;
    }

    getToastColor(type) {
        const colors = {
            success: '#43B581',
            error: '#ED4245',
            warning: '#FAA81A',
            info: '#5865F2'
        };
        return colors[type] || colors.info;
    }

    showNotification(title, message, type = 'info', duration = 5000) {
        const notificationId = 'notification-' + Date.now();
        const notification = {
            id: notificationId,
            title,
            message,
            type,
            timeout: null
        };

        // إنشاء عنصر الإشعار
        const notificationEl = this.createNotificationElement(notification);
        document.getElementById('notifications-container').appendChild(notificationEl);

        // إضافة للإدارة
        notification.element = notificationEl;
        this.notifications.push(notification);

        // إخفاء تلقائي بعد المدة
        notification.timeout = setTimeout(() => {
            this.hideNotification(notificationId);
        }, duration);

        return notificationId;
    }

    createNotificationElement(notification) {
        const div = document.createElement('div');
        div.className = 'notification';
        div.id = notification.id;
        
        const iconClass = this.getNotificationIconClass(notification.type);
        
        div.innerHTML = `
            <div class="notification-icon ${notification.type}">
                <i class="fas ${iconClass}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${this.escapeHtml(notification.title)}</div>
                <div class="notification-message">${this.escapeHtml(notification.message)}</div>
            </div>
            <button class="notification-close" onclick="utils.hideNotification('${notification.id}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        return div;
    }

    getNotificationIconClass(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    hideNotification(notificationId) {
        const index = this.notifications.findIndex(n => n.id === notificationId);
        if (index === -1) return;

        const notification = this.notifications[index];
        
        // إلغاء المؤقت
        if (notification.timeout) {
            clearTimeout(notification.timeout);
        }

        // إضافة تأثير الخروج
        if (notification.element) {
            notification.element.style.animation = 'notificationSlideIn 0.3s ease-out reverse';
            notification.element.style.opacity = '0';
            
            setTimeout(() => {
                if (notification.element.parentNode) {
                    notification.element.parentNode.removeChild(notification.element);
                }
            }, 300);
        }

        // إزالة من المصفوفة
        this.notifications.splice(index, 1);
    }

    // ===== التحميل =====
    showLoading(message = 'جاري التحميل...') {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.querySelector('p').textContent = message;
            loadingEl.style.display = 'flex';
        }
    }

    hideLoading() {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }

    // ===== Modals =====
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            // إضافة حدث لإغلاق Modal بالنقر خارج المحتوى
            modal.querySelector('.modal-overlay')?.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) {
                    this.closeModal(modalId);
                }
            });
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    // ===== قائمة السياق =====
    showContextMenu(event, items) {
        event.preventDefault();
        
        const contextMenu = document.getElementById('context-menu');
        const list = contextMenu.querySelector('.context-menu-list');
        
        // تنظيف القائمة السابقة
        list.innerHTML = '';
        
        // إضافة العناصر
        items.forEach(item => {
            if (item.type === 'divider') {
                const divider = document.createElement('div');
                divider.className = 'context-menu-divider';
                list.appendChild(divider);
            } else {
                const li = document.createElement('li');
                li.className = `context-menu-item ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''}`;
                li.innerHTML = `
                    <i class="fas fa-${item.icon}"></i>
                    <span>${item.label}</span>
                `;
                
                if (!item.disabled) {
                    li.addEventListener('click', (e) => {
                        e.stopPropagation();
                        item.action();
                        this.hideContextMenu();
                    });
                }
                
                list.appendChild(li);
            }
        });
        
        // عرض القائمة في الموقع الصحيح
        contextMenu.style.display = 'block';
        
        // حساب الموضع مع تجاوز الحدود
        const menuWidth = contextMenu.offsetWidth;
        const menuHeight = contextMenu.offsetHeight;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        let left = event.clientX;
        let top = event.clientY;
        
        if (left + menuWidth > windowWidth) {
            left = windowWidth - menuWidth - 10;
        }
        
        if (top + menuHeight > windowHeight) {
            top = windowHeight - menuHeight - 10;
        }
        
        contextMenu.style.left = left + 'px';
        contextMenu.style.top = top + 'px';
        
        // إخفاء القائمة عند النقر في أي مكان
        setTimeout(() => {
            const hideMenu = (e) => {
                if (!contextMenu.contains(e.target)) {
                    this.hideContextMenu();
                    document.removeEventListener('click', hideMenu);
                }
            };
            document.addEventListener('click', hideMenu);
        }, 100);
    }

    hideContextMenu() {
        const contextMenu = document.getElementById('context-menu');
        contextMenu.style.display = 'none';
    }

    // ===== تنسيق النصوص =====
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    truncateText(text, maxLength = 100, ellipsis = '...') {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + ellipsis;
    }

    formatMessageTime(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) {
            return 'الآن';
        } else if (diffMins < 60) {
            return `منذ ${diffMins} دقيقة`;
        } else if (diffHours < 24) {
            return `منذ ${diffHours} ساعة`;
        } else if (diffDays < 7) {
            return `منذ ${diffDays} يوم`;
        } else {
            return date.toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ===== الملفات =====
    async readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }

    validateFile(file, options = {}) {
        const {
            maxSize = 5 * 1024 * 1024, // 5MB افتراضي
            allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        } = options;

        // التحقق من الحجم
        if (file.size > maxSize) {
            return {
                valid: false,
                error: `حجم الملف كبير جداً (الحد الأقصى ${this.formatFileSize(maxSize)})`
            };
        }

        // التحقق من النوع
        if (!allowedTypes.includes(file.type)) {
            const extensions = allowedExtensions.join(', ');
            return {
                valid: false,
                error: `نوع الملف غير مدعوم (المسموح: ${extensions})`
            };
        }

        return { valid: true };
    }

    // ===== الألوان =====
    stringToColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const colors = [
            '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0',
            '#118AB2', '#073B4C', '#7209B7', '#F72585',
            '#3A86FF', '#FB5607', '#8338EC', '#FF006E'
        ];
        
        return colors[Math.abs(hash) % colors.length];
    }

    generateAvatarUrl(name, size = 128, background = null) {
        const color = background || this.stringToColor(name);
        const text = name.charAt(0).toUpperCase();
        
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color.replace('#', '')}&color=fff&size=${size}`;
    }

    // ===== التخزين المحلي =====
    setLocalStorage(key, value) {
        try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    getLocalStorage(key, defaultValue = null) {
        try {
            const serialized = localStorage.getItem(key);
            if (serialized === null) return defaultValue;
            return JSON.parse(serialized);
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    }

    removeLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }

    // ===== DOM =====
    createElement(tag, classes = [], attributes = {}, innerHTML = '') {
        const element = document.createElement(tag);
        
        if (classes.length > 0) {
            element.className = classes.join(' ');
        }
        
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        
        if (innerHTML) {
            element.innerHTML = innerHTML;
        }
        
        return element;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // ===== المصفوفات والكائنات =====
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    mergeObjects(target, source) {
        for (const key in source) {
            if (source[key] instanceof Object && key in target) {
                Object.assign(source[key], this.mergeObjects(target[key], source[key]));
            }
        }
        Object.assign(target || {}, source);
        return target;
    }

    // ===== الأرقام =====
    formatNumber(num) {
        if (typeof num !== 'number') return num;
        return new Intl.NumberFormat('ar-SA').format(num);
    }

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // ===== التاريخ والوقت =====
    formatDateTime(date) {
        if (!date) return '';
        
        const d = new Date(date);
        return d.toLocaleString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    isToday(date) {
        const today = new Date();
        const checkDate = new Date(date);
        return (
            checkDate.getDate() === today.getDate() &&
            checkDate.getMonth() === today.getMonth() &&
            checkDate.getFullYear() === today.getFullYear()
        );
    }

    // ===== الصوت =====
    playSound(soundName) {
        const sounds = {
            message: 'assets/sounds/message.mp3',
            join: 'assets/sounds/join.mp3',
            leave: 'assets/sounds/leave.mp3',
            notification: 'assets/sounds/notification.mp3'
        };

        const soundPath = sounds[soundName];
        if (!soundPath) return;

        const audio = new Audio(soundPath);
        audio.volume = 0.3;
        audio.play().catch(e => console.error('Error playing sound:', e));
    }

    // ===== التنزيل =====
    downloadFile(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // ===== الرموز التفاعلية =====
    getEmojiList() {
        return {
            smileys: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳'],
            people: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
            animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇'],
            food: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅'],
            activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷'],
            objects: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🎮', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️']
        };
    }
}

// إنشاء نسخة عامة
const utils = new Utils();

// تصدير للاستخدام في الملفات الأخرى
window.utils = utils;
