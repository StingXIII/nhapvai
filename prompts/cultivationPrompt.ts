
import { KnowledgeBase, Skill, NPC, Wife, Slave } from '../types';
// Fix: Import DEFAULT_NSFW_DESCRIPTION_STYLE from constants/nsfw instead of constants
import { DEFAULT_NSFW_DESCRIPTION_STYLE } from '../constants/nsfw';

export const generateCultivationSessionPrompt = (
    kb: KnowledgeBase,
    cultivationType: 'skill' | 'method',
    duration: number, // in turns
    currentPageMessagesLog: string,
    previousPageSummaries: string[],
    lastNarrationFromPreviousPage?: string,
    skill?: Skill, // for skill cultivation
    method?: Skill, // for method cultivation. It's also of type Skill
    partner?: NPC | Wife | Slave // for dual cultivation
): string => {
    const { playerStats, worldConfig } = kb;
    const isNsfw = worldConfig?.nsfwMode || false;
    const nsfwStyle = worldConfig?.nsfwDescriptionStyle || DEFAULT_NSFW_DESCRIPTION_STYLE;
    const currentLocation = kb.discoveredEntities.find(l => l.name === kb.currentLocationId); // Assuming locationID is name

    // ... (NSFW logic omitted for brevity, essentially same as other prompts) ...
    const nsfwGuidanceCombined = isNsfw ? `LƯU Ý: Chế độ 18+ BẬT. Phong cách: ${nsfwStyle}` : "LƯU Ý: Chế độ 18+ TẮT.";
    
    let header = `Bạn là một AI kể chuyện, chuyên mô tả lại quá trình tu luyện của nhân vật trong một thế giới tu tiên.`;
    let mainRequest = '';
    let successFactors = `- Cảnh giới của người chơi (${playerStats.realm || 'Phàm Nhân'})\n- Linh căn của người chơi (${playerStats.spiritualRoot || 'Chưa rõ'})\n- Thể chất của người chơi (${playerStats.specialPhysique || 'Phàm thể'})\n- May mắn`;
    let failureFactors = `- Tâm ma quấy nhiễu\n- Vận rủi`;
    let partnerUpdateTag = '';

    if (cultivationType === 'skill') {
        header += ` Người chơi đang cố gắng tu luyện để tăng độ thuần thục của một Linh Kĩ.`;
        mainRequest = `**YÊU CẦU:**
- **Mục tiêu:** Tăng độ thuần thục cho Linh Kĩ: **${skill?.name || 'Không rõ'}**.
- **Mô tả kỹ năng:** ${skill?.description || 'Không rõ'}.
- **Độ thuần thục hiện tại:** ${skill?.proficiencyTier || 'Sơ Nhập'} (${skill?.proficiency || 0}/${skill?.maxProficiency || 100}).
- **Thời gian tu luyện:** ${duration} lượt.`;
        successFactors += `\n- Ngộ tính của người chơi\n- Sự tương thích của kỹ năng với linh căn/thể chất`;
        failureFactors += `\n- Công pháp tu luyện không phù hợp`;
    } else { // method
        if (partner) { // Dual cultivation
            header += ` Người chơi đang tiến hành song tu với ${partner.name}.`;
            mainRequest = `**YÊU CẦU:**
- **Mục tiêu:** Tu luyện theo công pháp Song Tu **${method?.name || 'Không rõ'}** cùng với **${partner.name}**.
- **Mô tả công pháp:** ${method?.description || 'Không rõ'}.
- **Thời gian tu luyện:** ${duration} lượt.`;
            successFactors += `\n- Sự phối hợp ăn ý giữa hai người\n- Độ thiện cảm cao giữa hai người (${partner.affinity || 0})\n- Cảnh giới của bạn đồng tu (${partner.realm || 'Không rõ'})`;
            failureFactors += `\n- Bất đồng trong quá trình tu luyện\n- Độ thiện cảm thấp`;
            partnerUpdateTag = `*   **Cập nhật bạn đồng tu:** Dùng tag \`[${(partner as any).entityType === 'wife' ? 'WIFE_UPDATE' : 'SLAVE_UPDATE'}: name="${partner.name}", affinity="+=X", statsJSON='{"kinhNghiem": "+=Y"}']\` để thể hiện sự tiến bộ của họ.`;
        } else { // Solo cultivation
            header += ` Người chơi đang bế quan tu luyện để tăng tu vi.`;
            mainRequest = `**YÊU CẦU:**
- **Mục tiêu:** Tăng trưởng kinh nghiệm/tu vi bằng cách tu luyện theo công pháp **${method?.name || 'Không rõ'}**.
- **Mô tả công pháp:** ${method?.description || 'Không rõ'}.
- **Thời gian tu luyện:** ${duration} lượt.`;
            successFactors += `\n- Chất lượng của công pháp tu luyện (${method?.congPhapDetails?.grade || 'Không rõ'})\n- Nồng độ linh khí tại ${currentLocation?.name || 'nơi tu luyện'}`;
            failureFactors += `\n- Bị ngoại cảnh quấy nhiễu`;
        }
    }

    const prompt = `
${header}

**BỐI CẢNH THẾ GIỚI:**
- **Chủ đề:** ${worldConfig?.theme || 'Chưa xác định'}
${nsfwGuidanceCombined}

${mainRequest}

**NHIỆM VỤ CỦA BẠN (AI):**
1.  **VIẾT LỜI KỂ:**
    *   Mô tả chi tiết quá trình tu luyện trong ${duration} lượt.
    *   **QUY TẮC THÀNH BẠI:** Dựa vào các yếu tố bên dưới, hãy quyết định xem quá trình tu luyện có thuận lợi hay không.
        - **Yếu tố thành công:**\n${successFactors}
        - **Yếu tố thất bại:**\n${failureFactors}
    *   **Nội dung lời kể:**
        - Nếu thuận lợi: Mô tả cảm giác linh lực/kiến thức dồi dào, sự tiến bộ rõ rệt.
        - Nếu gặp trở ngại: Mô tả khó khăn (tẩu hỏa nhập ma nhẹ, tâm ma, bị quấy rầy) và cách nhân vật vượt qua (hoặc không).

2.  **TẠO TAGS HỆ THỐNG:**
    *   **Cập nhật thời gian:** Dùng tag \`[TIME_PASS: days=X]\` để thể hiện thời gian tu luyện đã trôi qua. **X** phải bằng với **số lượt / 3**. Ví dụ: 30 lượt = 10 ngày.
    *   **Cập nhật chỉ số người chơi:**
        - Nếu tu luyện công pháp: Dùng tag \`[STAT_CHANGE: name="Kinh Nghiệm", operation="add", amount=X]\` để tăng kinh nghiệm. **X** là một con số hợp lý, phản ánh kết quả tu luyện (ngoài lượng exp cơ bản hệ thống đã cộng).
        - Nếu tu luyện kỹ năng: Dùng tag \`[SKILL_LEARNED: name="${skill?.name}", proficiency=Y]\` (với Y là lượng tăng thêm) để tăng độ thuần thục.
    ${partnerUpdateTag}
    *   **Hậu quả thất bại:** Nếu tu luyện thất bại, có thể dùng các tag như \`[STAT_CHANGE: name="Sinh Lực", operation="subtract", level="medium"]\` (tổn thương) hoặc \`[STATUS_ACQUIRED: ...]\` (tẩu hỏa nhập ma).
    *   **KHÔNG** dùng tag [SUGGESTION].

**VÍ DỤ (Tu luyện công pháp thành công):**
(Lời kể bạn viết ra sẽ nằm ở đây)
Sau 10 ngày bế quan, linh lực trong cơ thể bạn trở nên tinh thuần hơn, tu vi cũng có chút tiến triển.
[NARRATION_END]
[TIME_PASS: days=10]
[STAT_CHANGE: name="Kinh Nghiệm", operation="add", amount=500]
`;
    return prompt;
};
