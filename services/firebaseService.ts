
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { AppSettings, SaveSlot } from "../types";

// Thông tin cấu hình Firebase thực tế của bạn
const firebaseConfig = {
  apiKey: "AIzaSyD_x5JURhFWFj7zkf9MaaGcYY8p2c_tBAY",
  authDomain: "neogame-289f2.firebaseapp.com",
  projectId: "neogame-289f2",
  storageBucket: "neogame-289f2.firebasestorage.app",
  messagingSenderId: "639651714216",
  appId: "1:639651714216:web:d4682313b12415d9be9e9d",
  measurementId: "G-GZNPQWY30Z"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ID cố định cho người dùng cá nhân (Single User Mode)
const USER_DOC_ID = "personal-user-data";

/**
 * Hàm hỗ trợ làm sạch dữ liệu: Firestore không chấp nhận 'undefined'.
 * Chuyển đổi đối tượng sang chuỗi JSON và ngược lại là cách nhanh nhất để loại bỏ các key có giá trị undefined.
 */
const sanitizeData = (data: any) => {
    return JSON.parse(JSON.stringify(data));
};

export interface CloudData {
    settings: AppSettings | null;
    lastSave: any | null; // Lưu game state cuối cùng hoặc danh sách save
    updatedAt: string;
}

/**
 * Lưu cấu hình (API Keys) lên Firebase
 */
export const syncSettingsToCloud = async (settings: AppSettings) => {
    try {
        const userDoc = doc(db, "configs", USER_DOC_ID);
        await setDoc(userDoc, { 
            settings: sanitizeData(settings), 
            updatedAt: new Date().toISOString() 
        }, { merge: true });
        console.log("☁️ Settings đã được đồng bộ lên Cloud.");
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            console.error("❌ Lỗi Firebase: Quyền truy cập bị từ chối. Vui lòng kiểm tra Firestore Rules trên Firebase Console.");
        } else {
            console.error("Lỗi đồng bộ Cloud Settings:", error);
        }
    }
};

/**
 * Lưu một slot game lên Firebase
 */
export const syncSaveToCloud = async (saveData: SaveSlot) => {
    try {
        // Chúng ta lưu vào một collection riêng để không làm nặng document config
        const saveDoc = doc(db, "saves", USER_DOC_ID);
        
        // Làm sạch dữ liệu trước khi lưu để tránh lỗi undefined
        const cleanedSaveData = sanitizeData(saveData);
        
        await setDoc(saveDoc, { 
            data: cleanedSaveData, 
            updatedAt: new Date().toISOString() 
        });
        console.log("☁️ Game Save đã được đồng bộ lên Cloud.");
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            console.error("❌ Lỗi Firebase: Quyền truy cập bị từ chối. Vui lòng kiểm tra Firestore Rules trên Firebase Console.");
        } else {
            console.error("Lỗi đồng bộ Cloud Save:", error);
        }
    }
};

/**
 * Tải toàn bộ dữ liệu từ Cloud khi khởi động
 */
export const loadAllFromCloud = async (): Promise<{ settings: AppSettings | null, lastSave: SaveSlot | null }> => {
    try {
        const configSnap = await getDoc(doc(db, "configs", USER_DOC_ID));
        const saveSnap = await getDoc(doc(db, "saves", USER_DOC_ID));
        
        return {
            settings: configSnap.exists() ? configSnap.data().settings : null,
            lastSave: saveSnap.exists() ? saveSnap.data().data : null
        };
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            console.error("❌ Lỗi Firebase: Quyền truy cập bị từ chối. Hãy cập nhật Firestore Rules để cho phép truy cập.");
        } else {
            console.error("Lỗi tải dữ liệu từ Cloud:", error);
        }
        return { settings: null, lastSave: null };
    }
};
