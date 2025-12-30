import { OfflineCombatItem, OfflineCombatSkill } from './types';

export const COMBAT_MODE_ITEMS: OfflineCombatItem[] = [
    {
        id: 'potion_small_heal',
        name: 'Tiểu Hoàn Đan',
        description: 'Hồi phục 50 HP.',
        quantity: 1,
        tags: ['healing', 'consumable'],
        customCategory: 'Potion',
        effect: {
            type: 'HEAL_HP',
            value: 50,
            target: 'single_ally'
        }
    },
    {
        id: 'potion_mana',
        name: 'Hồi Linh Đan',
        description: 'Hồi phục 30 MP.',
        quantity: 1,
        tags: ['mana', 'consumable'],
        customCategory: 'Potion',
        effect: {
            type: 'HEAL_MP',
            value: 30,
            target: 'single_ally'
        }
    }
];

export const COMBAT_MODE_SKILLS: OfflineCombatSkill[] = [
    {
        id: 'basic_attack',
        name: 'Tấn Công Cơ Bản',
        description: 'Tấn công vật lý thông thường.',
        manaCost: 0,
        mpCost: 0,
        effect: {
            type: 'DAMAGE_HP',
            basePower: 10,
            target: 'single_enemy'
        }
    },
    {
        id: 'fireball',
        name: 'Hỏa Cầu Thuật',
        description: 'Bắn một quả cầu lửa gây sát thương.',
        manaCost: 10,
        mpCost: 10,
        effect: {
            type: 'DAMAGE_HP',
            basePower: 30,
            target: 'single_enemy',
            element: 'fire'
        }
    },
    {
        id: 'heal',
        name: 'Trị Liệu Thuật',
        description: 'Hồi phục HP cho đồng minh.',
        manaCost: 15,
        mpCost: 15,
        effect: {
            type: 'HEAL_HP',
            basePower: 40,
            target: 'single_ally'
        }
    },
    {
        id: 'combat_heal',
        name: 'combat Trị Liệu Thuật', // System internal name
        description: 'Hồi phục HP.',
        manaCost: 15,
        mpCost: 15,
        effect: {
            type: 'HEAL_HP',
            basePower: 40,
            target: 'single_ally'
        }
    }
];