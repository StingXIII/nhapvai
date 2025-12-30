

import { generateJson, setDebugContext } from '../core/geminiClient';
import { Type } from '@google/genai';
import { AwakeningResult } from '../../types';

const AWAKENING_PROMPT = `
Bạn là một AI phân tích tâm lý và hành vi người chơi trong game nhập vai.
Nhiệm vụ: Dựa trên lịch sử hành động (Action Log) của người chơi, hãy phân tích "Căn Cơ" (Archetype) và phân phối điểm chỉ số tiềm năng cho họ.

Quy tắc phân phối điểm (Tổng 20 điểm):
- STR (Sức Mạnh): Hành động tấn công trực diện, bạo lực, dũng cảm, che chắn.
- AGI (Thân Pháp): Hành động lén lút, bỏ chạy, né tránh, tốc độ, kỹ năng khéo léo.
- INT (Trí Tuệ): Hành động giao tiếp, thuyết phục, tìm tòi, dùng phép thuật, chế đồ, suy luận.

Hãy sáng tạo một "Danh Hiệu" (Title) thật ngầu (hơi hướng Tiên Hiệp/Fantasy) phản ánh phong cách chơi này. VD: "Cuồng Đao Huyết Sát", "Bóng Ma Vô Hình", "Học Giả Uyên Bác".
`;

export const analyzePlayerArchetype = async (actionLog: string[]): Promise<AwakeningResult> => {
    setDebugContext('Archetype Analysis');

    const logContent = actionLog.join('\n');
    
    const prompt = `
${AWAKENING_PROMPT}

--- ACTION LOG CỦA NGƯỜI CHƠI ---
${logContent}
--- KẾT THÚC LOG ---

Hãy phân tích và trả về kết quả JSON.
`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "Danh hiệu ngầu, tối đa 4-6 từ." },
            description: { type: Type.STRING, description: "Mô tả ngắn gọn về phong cách chơi đã dẫn đến danh hiệu này." },
            stats: {
                type: Type.OBJECT,
                properties: {
                    str: { type: Type.NUMBER, description: "Điểm Sức Mạnh (0-20)" },
                    agi: { type: Type.NUMBER, description: "Điểm Thân Pháp (0-20)" },
                    int: { type: Type.NUMBER, description: "Điểm Trí Tuệ (0-20)" },
                },
                required: ['str', 'agi', 'int']
            },
            summary: { type: Type.STRING, description: "Một lời bình phẩm của AI về tính cách nhân vật (hài hước hoặc thâm sâu)." }
        },
        required: ['title', 'description', 'stats', 'summary']
    };

    // Use Pro model for better reasoning on abstract archetypes
    // FIX: Changed model name to 'gemini-3-pro' to match the function's type signature.
    return generateJson<AwakeningResult>(prompt, schema, undefined, 'gemini-3-pro');
};
