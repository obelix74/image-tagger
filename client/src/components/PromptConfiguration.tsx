import React, { useState, useRef } from 'react';
import './PromptConfiguration.css';

export interface PromptPreset {
  name: string;
  description: string;
  prompt: string;
}

interface PromptConfigurationProps {
  onPromptChange: (prompt: string) => void;
  currentPrompt?: string;
}

const promptPresets: PromptPreset[] = [
  {
    name: "Default Analysis",
    description: "General-purpose image analysis with comprehensive metadata",
    prompt: `Analyze this image and provide the following information in JSON format:

{
  "title": "A short, descriptive title (2-5 words)",
  "caption": "A concise, engaging caption suitable for social media (1-2 sentences)",
  "headline": "A detailed description of the image (2-3 sentences)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "instructions": "Special instructions for photo editing or usage",
  "location": "Location information if identifiable",
  "confidence": 0.95
}

Requirements:
- Title: Short and descriptive
- Caption: Engaging and shareable
- Headline: Detailed description including objects, people, setting, mood, colors, and composition
- Keywords: Provide 5-10 SEO-optimized keywords relevant to the image content, style, and potential use cases
- Instructions: Editing suggestions or usage recommendations
- Location: Geographical or venue information if identifiable
- Confidence: Your confidence level in the analysis (0.0 to 1.0)

Please ensure the JSON is valid and properly formatted.`
  },
  {
    name: "Sports Photography",
    description: "Comprehensive sports analysis including action, players, equipment, and venues",
    prompt: `Please analyze this sports photograph and provide:
1. A short title (2-5 words)
2. A brief caption (1-2 sentences)
3. A detailed headline/description (2-3 sentences)
4. A list of relevant keywords including sport type, action, players, equipment, and venue details
5. Special instructions for photo editing or usage
6. Location information (if identifiable venues are present)

Focus on:
- Sport identification (football, basketball, soccer, baseball, tennis, etc.)
- Action and movement (running, jumping, throwing, catching, scoring)
- Player details (jersey numbers if visible, team colors, positions)
- Equipment and gear (balls, bats, rackets, protective gear)
- Venue characteristics (stadium, field, court, arena, outdoor/indoor)
- Game situation (offense, defense, celebration, timeout)
- Crowd and atmosphere
- Lighting conditions and photography technique

Please format your response as JSON with the following structure:
{
  "title": "short descriptive title",
  "caption": "brief caption here",
  "headline": "detailed headline/description here",
  "keywords": ["sport name", "action", "player details", "equipment", "venue", "team colors"],
  "instructions": "editing suggestions or usage notes",
  "location": "venue name if identifiable"
}`
  },
  {
    name: "Nature & Wildlife",
    description: "Focused on species identification, behavior, and environmental context",
    prompt: `Please analyze this nature/wildlife photograph and provide:
1. A short title (2-5 words)
2. A brief caption (1-2 sentences)
3. A detailed headline/description (2-3 sentences)
4. A list of relevant keywords including species names, habitat, behavior, and environmental conditions
5. Special instructions for photo editing or usage
6. Location information (if identifiable landmarks or ecosystems are present)

Focus on:
- Accurate species identification when possible
- Behavioral descriptions (feeding, mating, hunting, etc.)
- Environmental context (season, weather, habitat type)
- Conservation status if known
- Technical photography aspects (lighting, composition)

Please format your response as JSON with the following structure:
{
  "title": "short descriptive title",
  "caption": "brief caption here",
  "headline": "detailed headline/description here",
  "keywords": ["species name", "behavior", "habitat", "season", "conservation status", "photography technique"],
  "instructions": "editing suggestions or usage notes",
  "location": "location name if identifiable"
}`
  },
  {
    name: "Travel & Landscape",
    description: "Focuses on geographical features, cultural elements, and travel aspects",
    prompt: `Please analyze this travel/landscape photograph and provide:
1. A short title (2-5 words)
2. A brief caption (1-2 sentences)
3. A detailed headline/description (2-3 sentences)
4. A list of relevant keywords including geographical features, climate, time of day, and cultural elements
5. Special instructions for photo editing or usage
6. Location information (if identifiable landmarks or regions are present)

Focus on:
- Geographical features (mountains, ocean, desert, forest, urban)
- Weather and atmospheric conditions
- Time of day and lighting quality
- Cultural landmarks or human elements
- Seasonal characteristics
- Photography techniques (long exposure, panoramic, HDR)
- Travel and tourism aspects

Please format your response as JSON with the following structure:
{
  "title": "short descriptive title",
  "caption": "brief caption here",
  "headline": "detailed headline/description here",
  "keywords": ["landscape type", "geographical features", "weather", "time of day", "cultural elements", "technique"],
  "instructions": "editing suggestions or usage notes",
  "location": "location name if identifiable landmarks present"
}`
  },
  {
    name: "Food Photography",
    description: "Cuisine identification, presentation style, and culinary contexts",
    prompt: `Please analyze this food photograph and provide:
1. A short title (2-5 words)
2. A brief caption (1-2 sentences)
3. A detailed headline/description (2-3 sentences)
4. A list of relevant keywords including cuisine type, ingredients, presentation style, and culinary context
5. Special instructions for photo editing or usage
6. Location information (if identifiable restaurants or venues are present)

Focus on:
- Food identification (dish type, cuisine style, ingredients)
- Presentation and plating style
- Photography technique (overhead, close-up, styled, natural)
- Lighting quality (natural, artificial, mood lighting)
- Setting context (restaurant, home, studio, outdoor)
- Cultural and culinary significance
- Appetite appeal and visual composition
- Garnishes and accompaniments

Please format your response as JSON with the following structure:
{
  "title": "short descriptive title",
  "caption": "brief caption here",
  "headline": "detailed headline/description here",
  "keywords": ["cuisine type", "dish name", "ingredients", "presentation", "photography style", "setting"],
  "instructions": "editing suggestions or usage notes",
  "location": "restaurant or venue name if identifiable"
}`
  }
];

const PromptConfiguration: React.FC<PromptConfigurationProps> = ({
  onPromptChange,
  currentPrompt
}) => {
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('Default Analysis');
  const [customPrompt, setCustomPrompt] = useState(currentPrompt || promptPresets[0].prompt);
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);
    const preset = promptPresets.find(p => p.name === presetName);
    if (preset) {
      setCustomPrompt(preset.prompt);
      onPromptChange(preset.prompt);
    }
  };

  const handleCustomPromptChange = (prompt: string) => {
    setCustomPrompt(prompt);
    onPromptChange(prompt);
  };

  const handleToggleCustomPrompt = (enabled: boolean) => {
    setUseCustomPrompt(enabled);
    if (!enabled) {
      // Reset to default preset
      const defaultPreset = promptPresets[0];
      setCustomPrompt(defaultPreset.prompt);
      onPromptChange(defaultPreset.prompt);
    }
  };

  const handleFileLoad = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === 'text/plain' || file.name.endsWith('.txt'))) {
      try {
        const text = await file.text();
        setCustomPrompt(text);
        onPromptChange(text);
        setUseCustomPrompt(true);
      } catch (error) {
        console.error('Error reading file:', error);
        alert('Error reading file. Please try again.');
      }
    } else {
      alert('Please select a valid text file (.txt)');
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const currentPresetDescription = promptPresets.find(p => p.name === selectedPreset)?.description || '';

  return (
    <div className="prompt-configuration">
      <div className="prompt-header">
        <h3>AI Prompt Configuration</h3>
        <button 
          className="expand-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          type="button"
        >
          {isExpanded ? '▼' : '▶'} {isExpanded ? 'Hide' : 'Show'} Advanced Settings
        </button>
      </div>

      {isExpanded && (
        <div className="prompt-content">
          <div className="prompt-options">
            <div className="option-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={useCustomPrompt}
                  onChange={(e) => handleToggleCustomPrompt(e.target.checked)}
                />
                Use custom prompt
              </label>
            </div>

            {useCustomPrompt && (
              <>
                <div className="option-group">
                  <label htmlFor="preset-select">Preset Prompts:</label>
                  <select
                    id="preset-select"
                    value={selectedPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="preset-dropdown"
                  >
                    {promptPresets.map((preset) => (
                      <option key={preset.name} value={preset.name}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                  <p className="preset-description">{currentPresetDescription}</p>
                </div>

                <div className="option-group">
                  <label htmlFor="file-upload">Load from file:</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="file-upload"
                    accept=".txt,.text"
                    onChange={handleFileLoad}
                    className="file-input"
                  />
                  <small>Load a custom prompt from a .txt file</small>
                </div>

                <div className="option-group">
                  <label htmlFor="custom-prompt">Custom Prompt:</label>
                  <textarea
                    id="custom-prompt"
                    value={customPrompt}
                    onChange={(e) => handleCustomPromptChange(e.target.value)}
                    className="prompt-textarea"
                    placeholder="Enter your custom analysis prompt here..."
                    rows={12}
                  />
                  <small>
                    Tip: Request JSON format with fields like title, caption, headline, keywords, instructions, and location
                  </small>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptConfiguration;