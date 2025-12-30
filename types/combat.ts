import { ReactNode } from 'react';

export type VfxType = 'damage' | 'heal' | 'crit' | 'miss' | 'info';

export interface FloatingVfx {
    id: string;
    text: ReactNode;
    x: number;
    y: number;
    type: VfxType;
}

export interface CombatLogEntry {
    id: string;
    text: string;
    type: 'player' | 'ally' | 'helper' | 'enemy' | 'system' | 'info';
}

export type CombatOutcome = 'victory' | 'defeat' | 'escaped' | null;

export interface CombatAction {
    type: 'attack' | 'skill' | 'item' | 'defend' | 'flee';
    skillId?: string;
    itemId?: string;
    targetId?: string;
}
