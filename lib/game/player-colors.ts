/**
 * Shared player color utilities.
 * Single source of truth for avatar colors used in PlayerArea, EventLog, and GameBoard.
 */

export const PLAYER_AVATAR_COLORS = [
    '#8E44AD', // violet
    '#2980B9', // blue
    '#27AE60', // green
    '#C0392B', // red
    '#E67E22', // orange
    '#16A085', // teal
];

/**
 * Deterministic color for a given playerId.
 * Uses charCode sum to pick a consistent color from the palette.
 */
export function getPlayerColor(playerId: string): string {
    if (!playerId) return PLAYER_AVATAR_COLORS[0];
    const index = playerId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return PLAYER_AVATAR_COLORS[index % PLAYER_AVATAR_COLORS.length];
}
