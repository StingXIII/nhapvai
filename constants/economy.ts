
// constants/economy.ts

// Hằng số định giá vật phẩm
export const MORTAL_REALM_BASE_VALUE = 50;
export const FIRST_CULTIVATION_REALM_BASE_VALUE = 100;
export const REALM_MULTIPLIER_BASE = 5.0; 
export const REALM_MULTIPLIER_DECAY = 0.3; 
export const REALM_MULTIPLIER_MIN = 3.0; 

export const STAT_POINT_VALUES: Record<string, number> = {
    sucTanCong: 50,
    maxSinhLuc: 1, 
    maxLinhLuc: 2, 
};

export const RARITY_MULTIPLIERS: Record<string, number> = {
    "Phổ Thông": 1.0,
    "Hiếm": 2.5,
    "Quý Báu": 7.5,
    "Cực Phẩm": 20.0,
    "Thần Thoại": 50.0,
    "Chí Tôn": 150.0,
};

export const CATEGORY_MULTIPLIERS: Record<string, number> = {
    "Potion": 1.2,
    "Material": 0.8,
    "CongPhap": 3.0,
    "LinhKi": 3.0,
    "ProfessionSkillBook": 2.5,
    "ProfessionTool": 1.5,
};

export const SPECIAL_EFFECT_KEYWORDS: Record<string, { baseMultiplier: number }> = {
    "hút máu": { baseMultiplier: 0.08 }, 
    "chí mạng": { baseMultiplier: 0.07 }, 
    "sát thương chí mạng": { baseMultiplier: 0.015 }, 
    "xuyên giáp": { baseMultiplier: 0.1 }, 
    "bỏ qua phòng thủ": { baseMultiplier: 0.1 }, 
    "phản sát thương": { baseMultiplier: 0.06 }, 
    "phản đòn": { baseMultiplier: 0.06 }, 
    "tăng tốc": { baseMultiplier: 0.15 }, 
    "né tránh": { baseMultiplier: 0.09 }, 
    "chính xác": { baseMultiplier: 0.08 }, 
    "kháng tất cả": { baseMultiplier: 0.12 }, 
    "giảm hồi chiêu": { baseMultiplier: 0.05 }, 
    "gây choáng": { baseMultiplier: 0.25 }, 
    "gây tê liệt": { baseMultiplier: 0.25 }, 
    "gây câm lặng": { baseMultiplier: 0.20 },
    "gây mù": { baseMultiplier: 0.18 },
    "gây độc": { baseMultiplier: 0.04 }, 
    "gây bỏng": { baseMultiplier: 0.04 },
    "hồi phục sinh lực": { baseMultiplier: 0.005 }, 
    "hồi phục linh lực": { baseMultiplier: 0.01 }, 
    "tăng kinh nghiệm": { baseMultiplier: 0.1 }, 
    "tăng vàng": { baseMultiplier: 0.08 }, 
    "miễn nhiễm": { baseMultiplier: 0.8 }, 
    "giảm tiêu hao linh lực": { baseMultiplier: 0.04 }, 
    "hấp thụ sát thương": { baseMultiplier: 0.11 }, 
};

export const UNKNOWN_EFFECT_MULTIPLIER = 0.15;

export const SPIRIT_STONE_PRICES: Record<string, number> = {
    "Linh Thạch Hạ Phẩm": 10,
    "Linh Thạch Trung Phẩm": 20,
    "Linh Thạch Thượng Phẩm": 40,
    "Linh Thạch Cực Phẩm": 80,
    "Linh Thạch Tiên Phẩm": 160,
    "Tiên Thạch Hạ Phẩm": 300,
    "Tiên Thạch Trung Phẩm": 600,
    "Tiên Thạch Thượng Phẩm": 1200,
    "Tiên Thạch Cực Phẩm": 2400,
    "Tiên Thạch Tiên Phẩm": 4800,
};

// Hằng số phụ trợ cho auction
export const AUCTION_NPC_CURRENCY_BY_REALM_TIER: number[] = [500, 5000, 25000, 100000, 350000, 1000000]; // Giả lập
