
// utils/tagProcessors/SkillProcessor.ts
import { GameState, VectorUpdate, Skill } from '../../types';
import { mergeAndDeduplicateByName } from '../arrayUtils';
import { sanitizeEntityName } from '../textProcessing';
import { COMBAT_MODE_SKILLS } from '../../templates';

/**
 * Xử lý logic thêm một kỹ năng mới cho nhân vật.
 * @param currentState - Trạng thái game hiện tại.
 * @param params - Các tham số từ thẻ [SKILL_LEARNED].
 * @returns Một đối tượng chứa trạng thái game mới và các yêu cầu cập nhật vector.
 */
export function processSkillLearned(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    if (!params.name) {
        console.warn('Bỏ qua thẻ [SKILL_LEARNED] không hợp lệ:', params);
        return { newState: currentState, vectorUpdates: [] };
    }

    const sanitizedName = sanitizeEntityName(params.name);
    const lowerCaseSanitizedName = sanitizedName.toLowerCase();

    // Tìm một mẫu kỹ năng có sẵn
    const skillTemplate = COMBAT_MODE_SKILLS.find(
        s => s.name.toLowerCase() === lowerCaseSanitizedName
    );

    let newSkill: Skill;

    if (skillTemplate) {
        // Tìm thấy mẫu, tạo một đối tượng kỹ năng hoàn chỉnh
        newSkill = {
            ...skillTemplate,
            id: `skill_${Date.now()}_${Math.random()}`, // Đảm bảo ID là duy nhất
            description: params.description || skillTemplate.description, // Cho phép AI ghi đè mô tả
            proficiencyTier: 'Sơ Nhập',
            proficiency: 0,
            maxProficiency: 100,
        };
    } else {
        // Không tìm thấy mẫu (kỹ năng do AI tự tạo), tạo một kỹ năng cơ bản với hiệu ứng dự phòng
        const fallbackAttack = COMBAT_MODE_SKILLS.find(s => s.id === 'basic_attack');
        newSkill = {
            id: `skill_${Date.now()}_${Math.random()}`,
            name: sanitizedName,
            description: params.description || 'Một kỹ năng chưa rõ hiệu ứng.',
            manaCost: 5, // Chi phí mặc định
            mpCost: 5,   // Chi phí mặc định cho combat
            effect: fallbackAttack ? fallbackAttack.effect : { type: 'DAMAGE_HP', basePower: 10, target: 'single_enemy' }, // Hiệu ứng dự phòng
            proficiencyTier: 'Sơ Nhập',
            proficiency: 0,
            maxProficiency: 100,
        };
    }

    // Cập nhật vào danh sách kỹ năng chiến đấu (playerSkills), không phải character.skills
    const updatedPlayerSkills = mergeAndDeduplicateByName(currentState.playerSkills || [], [newSkill]);

    const vectorContent = `Kỹ năng: ${newSkill.name}\nMô tả: ${newSkill.description}`;
    const vectorUpdate: VectorUpdate = {
        id: newSkill.name,
        type: 'Skill',
        content: vectorContent,
    };

    return {
        newState: {
            ...currentState,
            playerSkills: updatedPlayerSkills,
        },
        vectorUpdates: [vectorUpdate],
    };
}
