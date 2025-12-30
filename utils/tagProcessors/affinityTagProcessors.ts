
// File: utils/tagProcessors/affinityTagProcessors.ts
import { GameState, EncounteredNPC, VectorUpdate, Wife, Slave, Prisoner } from '../../types';

const MAX_AFFINITY_CHANGE_PER_TURN = 10;

/**
 * Calculates and applies a capped affinity change to a given value.
 * @param {number} currentValue - The current affinity score.
 * @param {string} affinityValueString - The value from the AI tag (e.g., "+=15", "-=5", "50").
 * @returns {number} The new affinity value after capping and clamping.
 */
export function applyAffinityChange(currentValue: number, affinityValueString: string): number {
    let requestedDelta = 0;

    if (affinityValueString.startsWith('+=')) {
        requestedDelta = parseInt(affinityValueString.substring(2), 10);
    } else if (affinityValueString.startsWith('-=')) {
        requestedDelta = -parseInt(affinityValueString.substring(2), 10);
    } else {
        const absoluteValue = parseInt(affinityValueString, 10);
        if (!isNaN(absoluteValue)) {
            // This is an absolute assignment, but we'll treat it as a delta for capping.
            requestedDelta = absoluteValue - currentValue;
        }
    }

    if (isNaN(requestedDelta)) {
        console.warn(`[applyAffinityChange] Invalid affinity value: "${affinityValueString}"`);
        return currentValue;
    }

    // Cap the change to prevent extreme swings.
    const cappedDelta = Math.max(-MAX_AFFINITY_CHANGE_PER_TURN, Math.min(MAX_AFFINITY_CHANGE_PER_TURN, requestedDelta));

    // Apply the capped change and ensure the final value stays within the [-100, 100] range.
    return Math.max(-100, Math.min(100, currentValue + cappedDelta));
}

// A generic processor that handles updating an entity in a list.
function genericAffinityProcessor(
    knowledgeBase: GameState,
    entityListKey: 'wives' | 'slaves' | 'prisoners' | 'encounteredNPCs',
    params: any
): { newState: GameState; vectorUpdates: VectorUpdate[] } {
    const { name, affinity } = params;
    if (!name || !affinity) {
        return { newState: knowledgeBase, vectorUpdates: [] };
    }

    const entityList = (knowledgeBase[entityListKey] as EncounteredNPC[] | undefined) || [];
    const entityIndex = entityList.findIndex(e => e.name === name);

    if (entityIndex > -1) {
        const entity = entityList[entityIndex];
        const oldAffinity = entity.affinity || 0;
        const newAffinity = applyAffinityChange(oldAffinity, String(affinity));

        // Create a new list with the updated entity to avoid direct mutation
        const newList = [...entityList];
        newList[entityIndex] = { ...entity, affinity: newAffinity };

        const newState = { ...knowledgeBase, [entityListKey]: newList };
        return { newState, vectorUpdates: [] };
    } else {
        console.warn(`[genericAffinityProcessor] Entity named "${name}" not found in list "${String(entityListKey)}".`);
    }
    
    return { newState: knowledgeBase, vectorUpdates: [] };
}


// Specific processors exported for the dispatcher.
export function processNpcAffinityUpdate(knowledgeBase: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    return genericAffinityProcessor(knowledgeBase, 'encounteredNPCs', params);
}

export function processWifeAffinityUpdate(knowledgeBase: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    return genericAffinityProcessor(knowledgeBase, 'wives', params);
}

export function processSlaveAffinityUpdate(knowledgeBase: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    return genericAffinityProcessor(knowledgeBase, 'slaves', params);
}

export function processPrisonerAffinityUpdate(knowledgeBase: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    return genericAffinityProcessor(knowledgeBase, 'prisoners', params);
}
