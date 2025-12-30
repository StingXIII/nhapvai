
// utils/tagProcessors/TagParser.ts
import { ParsedTag } from './types';

/**
 * Phân tích một chuỗi key-value mạnh mẽ.
 */
function parseKeyValue(content: string): Record<string, any> {
    const result: Record<string, any> = {};
    const regex = /(\w+)\s*=\s*("([^"]*)"|'([^']*)'|([^,\]\n]+))/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const key = match[1];
        let valueStr: string = (match[3] ?? match[4] ?? match[5] ?? '').trim();
        let value: string | number | boolean = valueStr;

        if (valueStr.match(/^-?\d+(\.\d+)?$/) && valueStr.trim() !== '') {
            value = Number(valueStr);
        } else if (valueStr.toLowerCase() === 'true') {
            value = true;
        } else if (valueStr.toLowerCase() === 'false') {
            value = false;
        }
        result[key] = value;
    }
    return result;
}

/**
 * Tách phản hồi thô của AI thành các phần dựa trên thẻ XML.
 * CẢI TIẾN CỰC KỲ NGHIÊM NGẶT: Loại bỏ hoàn toàn mọi văn bản nằm ngoài các cặp thẻ XML.
 */
export function parseResponse(rawText: string): { narration: string; tags: ParsedTag[]; worldSim?: string; thinking?: string } {
    // Tìm kiếm nội dung bên trong các thẻ XML
    const thinkingMatch = rawText.match(/<thinking>([\s\S]*?)<\/thinking>/i);
    const worldSimMatch = rawText.match(/<world_sim>([\s\S]*?)<\/world_sim>/i);
    const narrationMatch = rawText.match(/<narration>([\s\S]*?)<\/narration>/i);
    const dataTagsMatch = rawText.match(/<data_tags>([\s\S]*?)<\/data_tags>/i);
    const entityDefinitionsMatch = rawText.match(/<entity_definitions>([\s\S]*?)<\/entity_definitions>/i);

    const thinking = thinkingMatch ? thinkingMatch[1].trim() : '';
    let worldSim: string | undefined = undefined;
    if (worldSimMatch) {
        const content = worldSimMatch[1].trim();
        if (content && !/^EMPTY\.?$/i.test(content) && content !== 'NONE') {
            worldSim = content;
        }
    }
    
    // NGUYÊN TẮC VÀNG: Chỉ lấy nội dung BÊN TRONG thẻ <narration>.
    // Nếu AI viết lách lung tung bên ngoài thẻ (leaking), đoạn đó sẽ bị vứt bỏ hoàn toàn.
    let narration = narrationMatch ? narrationMatch[1].trim() : '';

    // Trường hợp khẩn cấp: Nếu AI quên dùng thẻ <narration> nhưng phản hồi có vẻ chứa lời kể
    // Chúng ta sẽ cố gắng lấy phần văn bản dài nhất nằm ngoài các thẻ tag dữ liệu
    if (!narration && !rawText.includes('<narration>')) {
        // Loại bỏ các khối thẻ khác để tìm "lời kể rác"
        let fallbackText = rawText
            .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
            .replace(/<world_sim>[\s\S]*?<\/world_sim>/gi, '')
            .replace(/<data_tags>[\s\S]*?<\/data_tags>/gi, '')
            .replace(/<entity_definitions>[\s\S]*?<\/entity_definitions>/gi, '')
            .replace(/\[\w+:[\s\S]*?\]/g, '') // Loại bỏ các thẻ [TAG]
            .trim();
        
        // Chỉ chấp nhận fallback nếu nó không chứa các dấu hiệu "đang suy nghĩ" bằng tiếng Anh
        if (!fallbackText.match(/^(I will|Here is|Based on|Analyzing|Strategizing|Confidence)/i)) {
            narration = fallbackText;
        }
    }

    const tags: ParsedTag[] = [];
    
    // Hàm helper để parse tags từ một khối văn bản
    const parseTagsFromBlock = (blockContent: string) => {
        const tagBlockRegex = /\[(\w+):\s*([\s\S]*?)\]/g;
        let match;
        while ((match = tagBlockRegex.exec(blockContent)) !== null) {
            const tagName = match[1].toUpperCase();
            const content = match[2].trim();
            try {
                const params = parseKeyValue(content);
                tags.push({ tagName, params });
            } catch (e) {
                console.error(`Lỗi phân tích thẻ [${tagName}]`);
            }
        }
    };

    // Parse từ <data_tags>
    const tagsPart = dataTagsMatch ? dataTagsMatch[1] : rawText;
    parseTagsFromBlock(tagsPart);

    // Parse từ <entity_definitions> nếu có (gộp chung vào mảng tags để xử lý thống nhất)
    if (entityDefinitionsMatch) {
        parseTagsFromBlock(entityDefinitionsMatch[1]);
    }
    
    return { narration, tags, worldSim, thinking };
}
