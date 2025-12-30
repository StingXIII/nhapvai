// constants/character.ts
import { PlayerStats, RealmBaseStatDefinition } from '../types'; // Đảm bảo đường dẫn đúng

export const SUB_REALM_NAMES = ["Nhất Trọng", "Nhị Trọng", "Tam Trọng", "Tứ Trọng", "Ngũ Trọng", "Lục Trọng", "Thất Trọng", "Bát Trọng", "Cửu Trọng", "Đỉnh Phong"];

export const DEFAULT_MORTAL_STATS: Pick<PlayerStats, 'baseMaxSinhLuc' | 'baseMaxLinhLuc' | 'baseSucTanCong' | 'baseMaxKinhNghiem' | 'realm' | 'linhLuc' | 'maxLinhLuc' | 'kinhNghiem' | 'maxKinhNghiem' | 'hieuUngBinhCanh' | 'activeStatusEffects' | 'spiritualRoot' | 'specialPhysique' | 'professions' | 'thoNguyen' | 'maxThoNguyen' | 'defeatCount' | 'sucPhongNhu' | 'tocDo'> = {
  baseMaxSinhLuc: 100,
  baseMaxLinhLuc: 0,
  baseSucTanCong: 10,
  baseMaxKinhNghiem: 100,
  realm: "Người Thường",
  linhLuc: 0,
  maxLinhLuc: 0,
  kinhNghiem: 0,
  maxKinhNghiem: 100,
  hieuUngBinhCanh: false,
  activeStatusEffects: [],
  spiritualRoot: "Phàm Căn",
  specialPhysique: "Phàm Thể",
  professions: [],
  thoNguyen: 80,
  maxThoNguyen: 80,
  defeatCount: 0, // Rule 3: Initialize defeat count
  sucPhongNhu: 5,
  tocDo: 10, // New stat: Speed
};

export const DEFAULT_PLAYER_STATS: PlayerStats = {
  baseMaxSinhLuc: 100,
  baseMaxLinhLuc: 50,
  baseSucTanCong: 10,
  baseMaxKinhNghiem: 100,
  sinhLuc: 100,
  maxSinhLuc: 100,
  linhLuc: 50,
  maxLinhLuc: 50,
  sucTanCong: 10,
  kinhNghiem: 0,
  maxKinhNghiem: 100,
  realm: "Phàm Nhân Nhất Trọng",
  currency: 0,
  turn: 0,
  hieuUngBinhCanh: false,
  activeStatusEffects: [],
  spiritualRoot: "Chưa rõ", // New
  specialPhysique: "Chưa rõ", // New
  professions: [], // New
  thoNguyen: 120, // New
  maxThoNguyen: 120, //New
  playerSpecialStatus: null, // NEW
  defeatCount: 0, // Rule 3: Initialize defeat count
  blackFlashCombo: 0,
  sucPhongNhu: 5,
  tocDo: 10, // New stat: Speed
  baseTocDo: 10,
};

// Các hằng số khác (để code compile được)
export const PROFICIENCY_EXP_THRESHOLDS: any = {
    "Sơ Nhập": 100,
    "Tiểu Thành": 200,
    "Đại Thành": 400,
    "Viên Mãn": 800,
    "Xuất Thần Nhập Hóa": null, 
};
export const PROFICIENCY_DMG_HEAL_MULTIPLIERS: any = {
    "Sơ Nhập": 1.0,
    "Tiểu Thành": 2.0,
    "Đại Thành": 3.0,
    "Viên Mãn": 4.0,
    "Xuất Thần Nhập Hóa": 5.0,
};
export const PROFICIENCY_COST_COOLDOWN_MULTIPLIERS: any = {
    "Sơ Nhập": 1.0,
    "Tiểu Thành": 0.8,
    "Đại Thành": 0.6,
    "Viên Mãn": 0.4,
    "Xuất Thần Nhập Hóa": 0.2,
};
export const TU_CHAT_VALUE_MULTIPLIERS: any = {
    "Phế Phẩm": 0.5,
    "Hạ Đẳng": 0.8,
    "Trung Đẳng": 1.0,
    "Thượng Đẳng": 1.5,
    "Cực Phẩm": 2.5,
    "Tiên Phẩm": 5.0,
    "Thần Phẩm": 10.0,
};
export const WEAPON_TYPES_FOR_VO_Y = ["Quyền", "Kiếm", "Đao", "Thương", "Côn", "Cung", "Trượng", "Phủ", "Chỉ", "Trảo", "Chưởng"] as const;

export interface NpcArchetype {
  hp: number;
  mp: number;
  atk: number;
  def: number;
  spd: number;
}

export const NPC_ARCHETYPES: Record<string, NpcArchetype> = {
  BALANCED: { hp: 1.0, mp: 1.0, atk: 1.0, def: 1.0, spd: 1.0 },
  TANK: { hp: 1.5, mp: 0.8, atk: 0.7, def: 1.3, spd: 0.8 },
  ASSASSIN: { hp: 0.7, mp: 0.8, atk: 1.4, def: 0.6, spd: 1.3 },
  MAGE: { hp: 0.6, mp: 1.5, atk: 1.5, def: 0.5, spd: 1.0 },
  BOSS: { hp: 3.0, mp: 2.0, atk: 1.2, def: 1.2, spd: 1.0 },
  FODDER: { hp: 0.3, mp: 0.5, atk: 0.5, def: 0.5, spd: 0.8 },
};
