import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', '..', 'data', 'permissions.json');

// 🗄️ هيكل البيانات الافتراضي
const DEFAULT_DATA = {
    userPermissions: {},     // { userId: permissionLevel }
    rolePermissions: {},     // { roleId: permissionLevel }
    commandPermissions: {},  // { commandName: permissionLevel }
    lastUpdated: Date.now()
};

class Database {
    constructor() {
        this.data = this.load();
    }

    // 📖 تحميل البيانات
    load() {
        try {
            // إنشاء المجلد لو مش موجود
            const dataDir = join(__dirname, '..', '..', 'data');
            if (!existsSync(dataDir)) {
                require('fs').mkdirSync(dataDir, { recursive: true });
            }

            if (existsSync(DB_PATH)) {
                const raw = readFileSync(DB_PATH, 'utf-8');
                return JSON.parse(raw);
            }
        } catch (error) {
            console.error('❌ Error loading database:', error);
        }
        
        // لو فيه مشكلة أو الملف مش موجود، نرجع البيانات الافتراضية
        return { ...DEFAULT_DATA };
    }

    // 💾 حفظ البيانات
    save() {
        try {
            this.data.lastUpdated = Date.now();
            writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
            return true;
        } catch (error) {
            console.error('❌ Error saving database:', error);
            return false;
        }
    }

    // 👤 إدارة صلاحيات المستخدمين
    setUserPermission(userId, level) {
        this.data.userPermissions[userId] = level;
        return this.save();
    }

    getUserPermission(userId) {
        return this.data.userPermissions[userId] || null;
    }

    removeUserPermission(userId) {
        delete this.data.userPermissions[userId];
        return this.save();
    }

    // 🎭 إدارة صلاحيات الرولات
    setRolePermission(roleId, level) {
        this.data.rolePermissions[roleId] = level;
        return this.save();
    }

    getRolePermission(roleId) {
        return this.data.rolePermissions[roleId] || null;
    }

    removeRolePermission(roleId) {
        delete this.data.rolePermissions[roleId];
        return this.save();
    }

    // ⚙️ إدارة صلاحيات الأوامر
    setCommandPermission(commandName, level) {
        this.data.commandPermissions[commandName] = level;
        return this.save();
    }

    getCommandPermission(commandName) {
        return this.data.commandPermissions[commandName] || null;
    }

    removeCommandPermission(commandName) {
        delete this.data.commandPermissions[commandName];
        return this.save();
    }

    // 📋 الحصول على كل البيانات
    getAllUserPermissions() {
        return this.data.userPermissions;
    }

    getAllRolePermissions() {
        return this.data.rolePermissions;
    }

    getAllCommandPermissions() {
        return this.data.commandPermissions;
    }

    // 🔄 إعادة تعيين كل شيء
    reset() {
        this.data = { ...DEFAULT_DATA };
        return this.save();
    }
}

// تصدير instance واحد
export const db = new Database();