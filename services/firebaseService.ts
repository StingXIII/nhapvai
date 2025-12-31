
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { AppSettings, SaveSlot } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyD_x5JURhFWFj7zkf9MaaGcYY8p2c_tBAY",
  authDomain: "neogame-289f2.firebaseapp.com",
  projectId: "neogame-289f2",
  storageBucket: "neogame-289f2.firebasestorage.app",
  messagingSenderId: "639651714216",
  appId: "1:639651714216:web:d4682313b12415d9be9e9d",
  measurementId: "G-GZNPQWY30Z"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const USER_DATA_ID = "global-user-profile"; // Document ID cố định cho cấu hình user

const sanitizeData = (data: any) => {
    return JSON.parse(JSON.stringify(data));
};

export const syncSettingsToCloud = async (settings: AppSettings) => {
    try {
        const userDoc = doc(db, "configs", USER_DATA_ID);
        await setDoc(userDoc, { 
            settings: sanitizeData(settings), 
            updatedAt: new Date().toISOString() 
        }, { merge: true });
    } catch (error: any) {
        console.error("Lỗi đồng bộ Cloud Settings:", error);
    }
};

/**
 * Đồng bộ bản lưu lên Cloud
 * Để tiết kiệm lượt đọc và tránh lỗi quyền Collection, 
 * chúng ta lưu ID của bản lưu mới nhất vào document configs.
 */
export const syncSaveToCloud = async (saveData: SaveSlot) => {
    try {
        const saveIdStr = String(saveData.saveId);
        
        // 1. Lưu bản dữ liệu chi tiết
        const saveDoc = doc(db, "saves", saveIdStr);
        await setDoc(saveDoc, { 
            data: sanitizeData(saveData), 
            updatedAt: new Date().toISOString() 
        });

        // 2. Cập nhật "Pointer" chỉ định đây là bản lưu mới nhất
        const userDoc = doc(db, "configs", USER_DATA_ID);
        await setDoc(userDoc, { 
            lastManualSaveId: saveIdStr,
            updatedAt: new Date().toISOString() 
        }, { merge: true });

        console.log(`☁️ Đã đồng bộ bản lưu ${saveIdStr} lên Cloud.`);
    } catch (error: any) {
        console.error("Lỗi đồng bộ Cloud Save:", error);
    }
};

export const deleteSaveFromCloud = async (saveId: number) => {
    try {
        const saveIdStr = String(saveId);
        await deleteDoc(doc(db, "saves", saveIdStr));
        console.log(`☁️ Đã xóa bản lưu ${saveIdStr} trên Cloud.`);
    } catch (error) {
        console.error("Lỗi khi xóa dữ liệu Cloud:", error);
    }
};

/**
 * Tải dữ liệu từ Cloud
 * Sử dụng cơ chế đọc trực tiếp Document ID thay vì query collection
 */
export const loadAllFromCloud = async (): Promise<{ settings: AppSettings | null, lastSave: SaveSlot | null }> => {
    try {
        // 1. Tải cấu hình và Pointer bản lưu
        const configSnap = await getDoc(doc(db, "configs", USER_DATA_ID));
        
        if (!configSnap.exists()) {
            return { settings: null, lastSave: null };
        }

        const configData = configSnap.data();
        const settings = configData.settings || null;
        const lastSaveId = configData.lastManualSaveId;

        // 2. Nếu có pointer, tải trực tiếp document đó
        let lastSave = null;
        if (lastSaveId) {
            const saveSnap = await getDoc(doc(db, "saves", String(lastSaveId)));
            if (saveSnap.exists()) {
                lastSave = saveSnap.data().data as SaveSlot;
            }
        }
        
        return { settings, lastSave };
    } catch (error: any) {
        console.error("Lỗi tải dữ liệu từ Cloud:", error.message);
        // Nếu bị lỗi quyền, trả về null thay vì crash
        return { settings: null, lastSave: null };
    }
};
