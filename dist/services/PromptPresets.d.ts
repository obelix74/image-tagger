/**
 * Prompt Presets for AI Image Analysis
 * Based on the Lightroom plugin prompt system
 */
export interface PromptPreset {
    name: string;
    description: string;
    prompt: string;
}
export declare class PromptPresets {
    private static presets;
    /**
     * Get all available preset prompts
     */
    static getPresets(): PromptPreset[];
    /**
     * Get a specific preset by name
     */
    static getPreset(name: string): PromptPreset | null;
    /**
     * Get preset names for dropdown UI
     */
    static getPresetNames(): string[];
    /**
     * Get default prompt (general analysis)
     */
    static getDefaultPrompt(): string;
}
//# sourceMappingURL=PromptPresets.d.ts.map