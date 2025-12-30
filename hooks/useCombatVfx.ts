import { useState, useCallback, ReactNode } from 'react';
import { FloatingVfx, VfxType } from '../types/combat';
import { VFX_DURATION } from '../constants/combat';

export const useCombatVfx = () => {
    const [floatingVfx, setFloatingVfx] = useState<FloatingVfx[]>([]);

    const getElementCenter = (elementId: string): { x: number, y: number } | null => {
        const el = document.getElementById(`combatant-${elementId}`);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    };

    const triggerVfx = useCallback((targetId: string, text: ReactNode, type: VfxType) => {
        const coords = getElementCenter(targetId);
        if (coords) {
            const newVfx: FloatingVfx = {
                id: `vfx-${Date.now()}-${Math.random()}`,
                text,
                x: coords.x,
                y: coords.y,
                type
            };
            setFloatingVfx(prev => [...prev, newVfx]);
            setTimeout(() => {
                setFloatingVfx(prev => prev.filter(v => v.id !== newVfx.id));
            }, VFX_DURATION);
        }
    }, []);

    return { floatingVfx, triggerVfx };
};
