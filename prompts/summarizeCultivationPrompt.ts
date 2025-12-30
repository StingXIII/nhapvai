
export const generateSummarizeCultivationPrompt = (log: string[]): string => {
    const logString = log.join('\n---\n');

    return `
Bạn là một AI tóm tắt viên, chuyên nghiệp trong việc chắt lọc những sự kiện chính từ một phiên tu luyện.
Dưới đây là nhật ký chi tiết về quá trình tu luyện của nhân vật.

**NHẬT KÝ CHI TIẾT:**
${logString}

**YÊU CẦU:**
Dựa vào nhật ký trên, hãy viết một đoạn văn **ngắn gọn** (khoảng 2-3 câu) tóm tắt lại kết quả chính của phiên tu luyện. Tập trung vào:
1.  Quá trình tu luyện có thuận lợi không? Có gặp trở ngại gì không?
2.  Kết quả cuối cùng (ví dụ: "tu vi tăng nhẹ", "độ thuần thục kỹ năng tăng lên", "tâm cảnh ổn định hơn").

Mục tiêu là tạo ra một bản tóm tắt súc tích để ghi vào nhật ký chính của người chơi.
**QUAN TRỌNG:** Chỉ viết đoạn văn tóm tắt, không thêm lời dẫn, tag, hay tiêu đề nào khác.

**VÍ DỤ:**
Sau một thời gian bế quan, bạn đã hấp thụ thành công lượng lớn linh khí, kinh nghiệm tu luyện tăng lên đáng kể và cảnh giới cũng được củng cố hơn.
`;
};
