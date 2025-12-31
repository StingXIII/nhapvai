
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { AppSettings, SaveSlot } from "../types";

// Thông tin cấu hình Firebase
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
const USER_DOC_ID = "personal-user-data";

const sanitizeData = (data: any) => {
    return JSON.parse(JSON.stringify(data));
};

export const syncSettingsToCloud = async (settings: AppSettings) => {
    try {
        const userDoc = doc(db, "configs", USER_DOC_ID);
        await setDoc(userDoc, { 
            settings: sanitizeData(settings), 
            updatedAt: new Date().toISOString() 
        }, { merge: true });
    } catch (error: any) {
        console.error("Lỗi đồng bộ Cloud Settings:", error);
    }
};

export const syncSaveToCloud = async (saveData: SaveSlot) => {
    try {
        const saveDoc = doc(db, "saves", USER_DOC_ID);
        await setDoc(saveDoc, { 
            data: sanitizeData(saveData), 
            updatedAt: new Date().toISOString() 
        });
        console.log("☁️ Đã đồng bộ bản lưu mới nhất lên Cloud.");
    } catch (error: any) {
        console.error("Lỗi đồng bộ Cloud Save:", error);
    }
};

/**
 * Xóa bản lưu trên Cloud
 */
export const deleteSaveFromCloud = async () => {
    try {
        const saveDoc = doc(db, "saves", USER_DOC_ID);
        await deleteDoc(saveDoc);
        console.log("☁️ Đã xóa bản lưu trên Cloud.");
    } catch (error) {
        console.error("Lỗi khi xóa dữ liệu Cloud:", error);
    }
};

export const loadAllFromCloud = async (): Promise<{ settings: AppSettings | null, lastSave: SaveSlot | null }> => {
    try {
        const configSnap = await getDoc(doc(db, "configs", USER_DOC_ID));
        const saveSnap = await getDoc(doc(db, "saves", USER_DOC_ID));
        
        return {
            settings: configSnap.exists() ? configSnap.data().settings : null,
            lastSave: saveSnap.exists() ? saveSnap.data().data : null
        };
    } catch (error: any) {
        console.error("Lỗi tải dữ liệu từ Cloud:", error);
        return { settings: null, lastSave: null };
    }
};
