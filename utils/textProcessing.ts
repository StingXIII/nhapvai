
// utils/textProcessing.ts
import { CoreEntityType } from '../types';

/**
 * "Làm mờ" các từ khóa nhạy cảm trong văn bản để vượt qua bộ lọc an toàn khi cần thiết.
 */
export const obfuscateText = (text: string): string => {
    const sensitiveKeywords = [
        'lồn', 'cặc', 'buồi', 'bướm', 'cu', 'địt', 'chịch', 'đụ', 'đéo',
        'âm đạo', 'dương vật', 'âm vật', 'tinh hoàn',
        'đâm', 'thúc', 'đút', 'nện', 'liếm', 'mút', 'bú', 'sục', 'giao hợp', 'làm tình',
        'giết', 'máu', 'chém', 'hiếp', 'dâm'
    ];
    const regex = new RegExp(`\\b(${sensitiveKeywords.join('|')})\\b`, 'gi');
    return text.replace(regex, (match) => `[${match.split('').join('-')}]`);
};

/**
 * Giải mã các từ bị làm mờ thành văn bản gốc.
 */
export const deobfuscateText = (text: string): string => {
    if (!text) return '';
    const regex = /\[([^:\]]*-[^\]]*)\]/g;
    return text.replace(regex, (match, group1) => {
        return group1.replace(/-/g, '');
    });
};

/**
 * Xử lý chuỗi tường thuật thô từ AI để làm sạch các thẻ không mong muốn trước khi hiển thị.
 * CẢI TIẾN: Loại bỏ triệt để các phần "AI meta-talk" rò rỉ.
 */
export const processNarration = (narration: string): string => {
    if (!narration) return '';

    let cleanedText = narration;

    // --- LỚP BẢO VỆ MỚI: XÓA META-TALK RÒ RỈ ---
    const metaTalkPatterns = [
        /^Confidence Score:.*$/gmi,
        /^Strategizing complete.*$/gmi,
        /^I will now proceed.*$/gmi,
        /^The player is.*$/gmi,
        /^Analyzing player intention.*$/gmi,
        /^Plan:.*$/gmi,
        /^\d+\.\s+\*\*Core Foundational Rules:\*\*.*$/gmi,
        /^\d+\.\s+\*\*Command Reflex Protocol:\*\*.*$/gmi,
        /^Command Reflex Protocol Application:.*$/gmi,
        /^Deep Simulation & Narrative Plan:.*$/gmi,
        /^Wait, let me rethink.*$/gmi,
        /^Wait,.*$/gmi
    ];

    metaTalkPatterns.forEach(pattern => {
        cleanedText = cleanedText.replace(pattern, '');
    });

    // Bước 1: San phẳng thẻ (Tag Flattening)
    const whitelist = ['entity', 'important', 'status', 'exp', 'thought'];
    whitelist.forEach(tag => {
        const flattenRegex = new RegExp(`<${tag}\\s+[^>]*>(.*?)<\\/${tag}>`, 'gi');
        cleanedText = cleanedText.replace(flattenRegex, `<${tag}>$1</${tag}>`);
    });

    // Bước 2: Loại bỏ các thẻ bên trong dấu ngoặc kép (hội thoại)
    cleanedText = cleanedText.replace(/"(.*?)"/g, (match, group1) => {
        const cleanedGroup = group1.replace(/<[^>]*>/g, '');
        return `"${cleanedGroup}"`;
    });

    // Bước 3: Loại bỏ các thẻ bên trong thẻ <thought>
    cleanedText = cleanedText.replace(/<thought>(.*?)<\/thought>/gs, (match, group1) => {
        const cleanedGroup = group1.replace(/<[^>]*>/g, '');
        return `<thought>${cleanedGroup}</thought>`;
    });

    // Bước 4: Dọn dẹp lỗi định dạng
    cleanedText = cleanedText.replace(/\s+<\/(entity|important|status|exp|thought)>/g, '</$1>');

    // Bước 5: VỆ SINH THẺ LẠ (Whitelist Filter)
    cleanedText = cleanedText.replace(/<\/?(?!(?:entity|important|status|exp|thought)\b)[a-zA-Z][^>]*>/gi, '');

    // Bước 6: Giải mã các từ bị làm mờ
    cleanedText = deobfuscateText(cleanedText);

    return cleanedText.trim();
};

/**
 * Tự động cắt bỏ các phần mô tả phẩm cấp/trạng thái khỏi tên thực thể.
 */
export const sanitizeEntityName = (name: string): string => {
    if (!name) return '';
    return name.split(/\s*-\s*/)[0].trim();
};

/**
 * "Đoán" loại và danh mục chi tiết của một thực thể dựa trên tên của nó.
 */
export function detectEntityTypeAndCategory(name: string): { type: CoreEntityType | null, category: string | null } {
    const lowerName = name.toLowerCase();

    if (/\b(tầng|kỳ|viên mãn|cảnh)\b/.test(lowerName)) {
        return { type: 'Hệ thống sức mạnh / Lore', category: 'Cảnh giới' };
    }
    if (/\b(kiếm|đao|thương|cung|nỏ|trượng|búa|rìu|chùy|giáo)\b/.test(lowerName)) {
        return { type: 'Vật phẩm', category: 'Vũ khí' };
    }
    if (/\b(giáp|khiên|mũ|nón|thuẫn)\b/.test(lowerName)) {
        return { type: 'Vật phẩm', category: 'Phòng cụ' };
    }
    if (/\b(đan|dược|thuốc|linh dịch|cao)\b/.test(lowerName)) {
        return { type: 'Vật phẩm', category: 'Đan dược' };
    }
    if (/\b(tửu|trà)\b/.test(lowerName)) {
        return { type: 'Vật phẩm', category: 'Thức uống' };
    }
    if (/\b(thảo|cỏ|đá|ngọc|quả|hạt|tinh|hạch|gỗ|xương|lông)\b/.test(lowerName)) {
        return { type: 'Vật phẩm', category: 'Nguyên liệu' };
    }
    if (/\b(bang|phái|môn|giáo|tông|gia|tộc|cung|điện|lâu|các)\b/.test(lowerName) && !/\b(công pháp|tâm pháp)\b/.test(lowerName)) {
        return { type: 'Phe phái/Thế lực', category: 'Thế lực' };
    }
    if (/\b(app|web|mạng|diễn đàn|facebook|onlyfans|tiktok|twitter|instagram)\b/.test(lowerName)) {
        return { type: 'Hệ thống sức mạnh / Lore', category: 'Nền Tảng Số' };
    }
    if (/\b(thành|làng|hang|động|sông|núi|rừng|thung lũng|quốc|cốc|viện|phủ|biển|hồ|đảo)\b/.test(lowerName)) {
        return { type: 'Địa điểm', category: 'Địa điểm' };
    }

    return { type: null, category: null };
}

/**
 * Phân tích chuỗi đầu vào để tạo danh sách cảnh giới.
 * Hỗ trợ cú pháp:
 * 1. Phân cách bằng dấu gạch ngang: "A - B - C" -> ["A", "B", "C"]
 * 2. Dải số: "Tầng 1 - Tầng 9" -> ["Tầng 1", "Tầng 2", ..., "Tầng 9"]
 * 3. Dải số Hán Việt: "Nhất Trọng - Cửu Trọng" -> ["Nhất Trọng", ..., "Cửu Trọng"]
 */
export const parseRealmString = (input: string): string[] => {
    if (!input || !input.trim()) return [];

    const parts = input.split('-').map(s => s.trim()).filter(Boolean);
    
    // Check for range syntax (exactly 2 parts)
    if (parts.length === 2) {
        const startStr = parts[0];
        const endStr = parts[1];

        // Case 1: Arabic numerals (e.g., "Tầng 1", "Tầng 9")
        const numericRegex = /^(.*?)(\d+)$/; // Captures Prefix (non-greedy) then Number
        const startMatch = startStr.match(numericRegex);
        const endMatch = endStr.match(numericRegex);

        if (startMatch && endMatch) {
            const startPrefix = startMatch[1].trim();
            const endPrefix = endMatch[1].trim();
            const startNum = parseInt(startMatch[2], 10);
            const endNum = parseInt(endMatch[2], 10);

            if (startPrefix === endPrefix && !isNaN(startNum) && !isNaN(endNum) && startNum < endNum) {
                const result: string[] = [];
                for (let i = startNum; i <= endNum; i++) {
                    result.push(`${startPrefix} ${i}`.trim());
                }
                return result;
            }
        }

        // Case 2: Han-Viet numerals (e.g., "Nhất Trọng", "Cửu Trọng")
        const hanVietMap: { [key: string]: number } = {
            "Nhất": 1, "Nhị": 2, "Tam": 3, "Tứ": 4, "Ngũ": 5,
            "Lục": 6, "Thất": 7, "Bát": 8, "Cửu": 9, "Thập": 10
        };
        const reverseHanVietMap = ["Nhất", "Nhị", "Tam", "Tứ", "Ngũ", "Lục", "Thất", "Bát", "Cửu", "Thập"];

        const hanVietRegex = new RegExp(`^(${reverseHanVietMap.join('|')})\\s*(.*)$`, 'i');
        const startHVMatch = startStr.match(hanVietRegex);
        const endHVMatch = endStr.match(hanVietRegex);

        if (startHVMatch && endHVMatch) {
            const startPrefix = startHVMatch[1];
            const startSuffix = startHVMatch[2].trim();
            const endPrefix = endHVMatch[1];
            const endSuffix = endHVMatch[2].trim();
            
            const startVal = hanVietMap[Object.keys(hanVietMap).find(k => k.toLowerCase() === startPrefix.toLowerCase())!];
            const endVal = hanVietMap[Object.keys(hanVietMap).find(k => k.toLowerCase() === endPrefix.toLowerCase())!];

            if (startSuffix.toLowerCase() === endSuffix.toLowerCase() && startVal && endVal && startVal < endVal) {
                const result: string[] = [];
                for (let i = startVal; i <= endVal; i++) {
                    // reverseHanVietMap is 0-indexed, so need i-1
                    result.push(`${reverseHanVietMap[i - 1]} ${startSuffix}`.trim());
                }
                return result;
            }
        }
    }

    // Fallback to original behavior if no range is detected
    return input.split('-').map(s => s.trim()).filter(Boolean);
};
