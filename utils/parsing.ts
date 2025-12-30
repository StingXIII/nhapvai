// File: utils/parsing.ts
// This utility provides a robust function for parsing parameter strings from AI-generated tags.

/**
 * Parses a parameter string from within an AI tag into a key-value object.
 * This function is designed to handle various quoting styles and values without quotes.
 *
 * @param {string} paramString - The raw parameter string, e.g., 'name="John Doe", affinity="+=10", isHostile=true'.
 * @returns {Record<string, string>} An object containing the parsed key-value pairs.
 * @example
 * parseTagParams('name="Tiểu Long Nữ", affinity="+=10"');
 * // returns { name: "Tiểu Long Nữ", affinity: "+=10" }
 *
 * parseTagParams("isHostile=true, target='Player'");
 * // returns { isHostile: "true", target: "Player" }
 */
export const parseTagParams = (paramString: string): Record<string, string> => {
    const result: Record<string, string> = {};
    if (!paramString) return result;

    // This regex captures key-value pairs with double quotes, single quotes, or no quotes.
    // Group 1: key (e.g., "name")
    // Group 2: value in double quotes
    // Group 3: value in single quotes
    // Group 4: value without quotes
    const regex = /([\w\.]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s,\]]+))/g;
    let match;

    while ((match = regex.exec(paramString)) !== null) {
        const key = match[1];
        // The value will be in one of the capturing groups depending on the quotes used.
        // The nullish coalescing operator (??) provides a clean way to select the correct one.
        const value = match[2] ?? match[3] ?? match[4] ?? '';
        result[key] = value;
    }
    
    return result;
};
