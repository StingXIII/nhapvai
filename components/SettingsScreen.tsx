
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Button from './common/Button';
import Icon from './common/Icon';
import ApiKeyModal from './common/ApiKeyModal';
import ToggleSwitch from './common/ToggleSwitch';
import { getSettings, saveSettings } from '../services/settingsService';
import { AppSettings, HarmCategory, HarmBlockThreshold, AiPerformanceSettings } from '../types';
import { HARM_CATEGORIES, HARM_BLOCK_THRESHOLDS } from '../constants';
import { loadKeysFromTxtFile, saveTextToFile } from '../services/fileService';

interface SettingsScreenProps {
  onBack: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleApiKeySave = (key: string) => {
    const newKeys = [key, ...settings.apiKeyConfig.keys.filter(k => k !== key)];
    const newSettings = {
      ...settings,
      apiKeyConfig: { ...settings.apiKeyConfig, keys: newKeys }
    };
    setSettings(newSettings);
    saveSettings(newSettings);
    setIsApiKeyModalOpen(false);
  };

  const handleRemoveKey = (index: number) => {
    const newKeys = settings.apiKeyConfig.keys.filter((_, i) => i !== index);
    const newSettings = {
      ...settings,
      apiKeyConfig: { ...settings.apiKeyConfig, keys: newKeys }
    };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleImportKeys = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        const newKeys = await loadKeysFromTxtFile(file);
        if (newKeys.length === 0) {
            alert('Không tìm thấy API key nào trong tệp.');
            return;
        }

        // Hợp nhất key mới với key cũ, loại bỏ trùng lặp
        const currentKeys = new Set(settings.apiKeyConfig.keys);
        let addedCount = 0;
        newKeys.forEach(key => {
            if (!currentKeys.has(key)) {
                currentKeys.add(key);
                addedCount++;
            }
        });

        const updatedKeys = Array.from(currentKeys);
        const newSettings = {
            ...settings,
            apiKeyConfig: { ...settings.apiKeyConfig, keys: updatedKeys }
        };
        setSettings(newSettings);
        saveSettings(newSettings);
        alert(`Đã nhập thành công ${addedCount} API key mới.`);

    } catch (error) {
        console.error(error);
        alert('Lỗi khi đọc tệp API key. Vui lòng đảm bảo tệp là .txt và mỗi key nằm trên một dòng.');
    } finally {
        if (event.target) event.target.value = ''; // Reset input
    }
  };

  const handleExportKeys = () => {
      const keys = settings.apiKeyConfig.keys;
      if (keys.length === 0) {
          alert('Không có API key nào để xuất.');
          return;
      }
      const content = keys.join('\n');
      saveTextToFile(content, 'gemini_api_keys.txt');
  };

  const handleSafetySettingChange = (category: HarmCategory, threshold: HarmBlockThreshold) => {
    const newSafetySettings = settings.safetySettings.settings.map(s => 
      s.category === category ? { ...s, threshold } : s
    );
    const newSettings = {
      ...settings,
      safetySettings: { ...settings.safetySettings, settings: newSafetySettings }
    };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const toggleSafetyFilter = () => {
    const newSettings = {
        ...settings,
        safetySettings: { ...settings.safetySettings, enabled: !settings.safetySettings.enabled }
    };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleAiPerformanceSettingChange = <T extends keyof AiPerformanceSettings>(key: T, value: AiPerformanceSettings[T]) => {
      let finalValue = value;
      if (key === 'maxOutputTokens' || key === 'thinkingBudget' || key === 'jsonBuffer') {
          finalValue = Number(value) as any;
      }

      const newSettings = {
          ...settings,
          aiPerformanceSettings: {
              ...settings.aiPerformanceSettings,
              [key]: finalValue
          }
      };
      setSettings(newSettings);
      saveSettings(newSettings);
  }

  const selectedModel = settings.aiPerformanceSettings.selectedModel || 'gemini-2.5-flash';
  const isHighEndModel = selectedModel.includes('pro') || selectedModel.includes('gemini-3');
  // Maximum thinking budget varies by model, but we set a safe UI max
  const maxThinkingBudget = 32768; 

  return (
    <div className="max-w-4xl mx-auto p-6 text-slate-200">
      <ApiKeyModal 
        isOpen={isApiKeyModalOpen} 
        onSave={handleApiKeySave} 
        onCancel={() => setIsApiKeyModalOpen(false)} 
      />
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".txt" 
        onChange={handleImportKeys} 
      />

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Cài Đặt</h1>
        <Button onClick={onBack} variant="secondary" className="!w-auto">
          <Icon name="back" className="w-5 h-5 mr-2"/>
          Quay lại
        </Button>
      </div>

      <div className="space-y-8">
        {/* API Key Section */}
        <section className="bg-slate-800/60 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl font-semibold text-blue-400 mb-4 flex items-center">
            <Icon name="key" className="w-6 h-6 mr-2" />
            Quản lý API Key
          </h2>
          <div className="space-y-4">
            <p className="text-sm text-slate-400">Quản lý danh sách API Key của bạn. Hệ thống sẽ tự động xoay vòng nếu một key bị hết hạn mức.</p>
            
            <div className="flex flex-wrap gap-2 mb-4">
                <Button onClick={() => setIsApiKeyModalOpen(true)} variant="primary" className="!w-auto !text-sm !py-2">
                    <Icon name="plus" className="w-4 h-4 mr-2" /> Thêm Key Mới
                </Button>
                <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="!w-auto !text-sm !py-2">
                    <Icon name="upload" className="w-4 h-4 mr-2" /> Nhập từ file .txt
                </Button>
                <Button onClick={handleExportKeys} variant="secondary" className="!w-auto !text-sm !py-2">
                    <Icon name="download" className="w-4 h-4 mr-2" /> Xuất ra file .txt
                </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {settings.apiKeyConfig.keys.map((key, index) => (
                <div key={index} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-md border border-slate-700/50">
                  <span className="font-mono text-sm text-slate-300">
                    {key.substring(0, 8)}...{key.substring(key.length - 6)}
                  </span>
                  <button onClick={() => handleRemoveKey(index)} className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded transition">
                    <Icon name="trash" className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {settings.apiKeyConfig.keys.length === 0 && <p className="text-slate-500 italic text-center py-4">Chưa có API Key nào. Vui lòng thêm ít nhất một key để chơi.</p>}
            </div>
          </div>
        </section>

        {/* Default Settings Section */}
        <section className="bg-slate-800/60 p-6 rounded-xl border border-slate-700">
            <h2 className="text-xl font-semibold text-green-400 mb-4 flex items-center">
                <Icon name="settings" className="w-6 h-6 mr-2" />
                Cài Đặt Mặc Định
            </h2>
            <div className="space-y-4">
                <div>
                    <h3 className="text-base font-semibold text-slate-200 mb-2">Chế độ Chiến đấu Mặc định</h3>
                    <div className="space-y-2">
                        <label className="flex items-start p-3 bg-slate-900/50 rounded-lg border-2 border-transparent has-[:checked]:border-green-400/50 has-[:checked]:bg-green-900/20 transition-all cursor-pointer">
                            <input 
                                type="radio"
                                name="defaultCombatMode"
                                value="mechanical"
                                checked={settings.aiPerformanceSettings.defaultCombatMode === 'mechanical'}
                                onChange={() => handleAiPerformanceSettingChange('defaultCombatMode', 'mechanical')}
                                className="mt-1 h-4 w-4 text-green-600 bg-slate-700 border-slate-500 focus:ring-green-500"
                            />
                            <div className="ml-3 text-sm">
                                <p className="font-bold text-slate-100">Chiến đấu Cơ chế (Đánh thật đó)</p>
                                <p className="text-slate-400 text-xs mt-1">Luôn ưu tiên client combat khi bắt đầu game mới.</p>
                            </div>
                        </label>
                        <label className="flex items-start p-3 bg-slate-900/50 rounded-lg border-2 border-transparent has-[:checked]:border-green-400/50 has-[:checked]:bg-green-900/20 transition-all cursor-pointer">
                            <input 
                                type="radio"
                                name="defaultCombatMode"
                                value="narrative"
                                checked={settings.aiPerformanceSettings.defaultCombatMode === 'narrative'}
                                onChange={() => handleAiPerformanceSettingChange('defaultCombatMode', 'narrative')}
                                className="mt-1 h-4 w-4 text-green-600 bg-slate-700 border-slate-500 focus:ring-green-500"
                            />
                            <div className="ml-3 text-sm">
                                <p className="font-bold text-slate-100">Chiến đấu Tường thuật (Đánh bằng mõm)</p>
                                <p className="text-slate-400 text-xs mt-1">Luôn ưu tiên AI dẫn truyện khi bắt đầu game mới.</p>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
        </section>

        {/* AI Model & Performance Section */}
        <section className="bg-slate-800/60 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl font-semibold text-yellow-400 mb-4 flex items-center">
            <Icon name="magic" className="w-6 h-6 mr-2" />
            Model & Hiệu Suất AI
          </h2>
          
          <div className="space-y-6">
            <div>
                <label htmlFor="model-select" className="block text-sm font-medium text-slate-300 mb-1">Model Dẫn Truyện</label>
                <select
                id="model-select"
                value={settings.aiPerformanceSettings.selectedModel || 'gemini-2.5-flash'}
                onChange={(e) => handleAiPerformanceSettingChange('selectedModel', e.target.value)}
                className="w-full bg-slate-900/70 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
                >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ổn định - Tốc độ cao)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Ổn định - Tư duy sâu)</option>
                <option value="gemini-3-flash">Gemini 3.0 Flash (Mới - Siêu tốc độ)</option>
                <option value="gemini-3-pro">Gemini 3.0 Pro (Mới - Siêu Trí Tuệ)</option>
                </select>
                <div className="mt-2 p-3 bg-slate-900/50 border border-slate-700 rounded text-xs text-slate-400 space-y-1">
                    <p><strong>2.5 Series:</strong> Phiên bản ổn định, cân bằng giữa hiệu năng và chi phí.</p>
                    <p><strong>3.0 Flash:</strong> Tốc độ phản hồi nhanh nhất, độ trễ cực thấp.</p>
                    <p><strong>3.0 Pro:</strong> Thế hệ mới nhất với khả năng hiểu ngữ cảnh và sáng tạo vượt trội. <span className="text-yellow-400 font-bold">Lưu ý: Các dòng Pro và 3.0 sẽ tự động tối ưu hóa Thinking Budget để đạt hiệu suất tốt nhất.</span></p>
                </div>
            </div>
            
            <div className={isHighEndModel ? 'opacity-50 pointer-events-none grayscale' : ''}>
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                    <label htmlFor="max-tokens-input" className="block text-sm font-medium text-slate-300">Độ dài Phản hồi Tối đa (Max Output Tokens)</label>
                    <input
                        type="number"
                        id="max-tokens-input"
                        value={settings.aiPerformanceSettings.maxOutputTokens}
                        onChange={(e) => handleAiPerformanceSettingChange('maxOutputTokens', e.target.value)}
                        className="w-24 bg-slate-900 border border-slate-600 rounded-md px-2 py-1 text-sm text-center"
                        min="1024"
                        max="8192"
                        step="256"
                    />
                    </div>
                    <input
                    type="range"
                    id="max-tokens-slider"
                    value={settings.aiPerformanceSettings.maxOutputTokens}
                    onChange={(e) => handleAiPerformanceSettingChange('maxOutputTokens', e.target.value)}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                    min="1024"
                    max="8192"
                    step="256"
                    />
                    <p className="text-xs text-slate-500 mt-1">Giới hạn số token tối đa AI có thể tạo ra. Hữu ích cho cả việc tạo JSON và tường thuật. Mặc định: 8000.</p>
                </div>
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <label htmlFor="thinking-budget" className="block text-sm font-medium text-slate-300">Thinking Budget (Dành cho Flash)</label>
                        <input
                        type="number"
                        id="thinking-budget-input"
                        value={settings.aiPerformanceSettings.thinkingBudget}
                        onChange={(e) => handleAiPerformanceSettingChange('thinkingBudget', e.target.value)}
                        className="w-24 bg-slate-900 border border-slate-600 rounded-md px-2 py-1 text-sm text-center"
                        min="0"
                        max={maxThinkingBudget}
                        step="100"
                        />
                    </div>
                    <input
                    type="range"
                    id="thinking-budget-slider"
                    value={settings.aiPerformanceSettings.thinkingBudget}
                    onChange={(e) => handleAiPerformanceSettingChange('thinkingBudget', e.target.value)}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                    min="0"
                    max={maxThinkingBudget}
                    step="100"
                    />
                    <p className="text-xs text-slate-500 mt-1">Cung cấp "ngân sách suy nghĩ" để AI xử lý các yêu cầu phức tạp. Mặc định: 1200.</p>
                </div>
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <label htmlFor="json-buffer-input" className="block text-sm font-medium text-slate-300">Độ dài Bổ sung cho JSON (jsonBuffer)</label>
                        <input
                        type="number"
                        id="json-buffer-input"
                        value={settings.aiPerformanceSettings.jsonBuffer}
                        onChange={(e) => handleAiPerformanceSettingChange('jsonBuffer', e.target.value)}
                        className="w-24 bg-slate-900 border border-slate-600 rounded-md px-2 py-1 text-sm text-center"
                        min="0"
                        max="8192"
                        step="128"
                        />
                    </div>
                    <input
                    type="range"
                    id="json-buffer-slider"
                    value={settings.aiPerformanceSettings.jsonBuffer}
                    onChange={(e) => handleAiPerformanceSettingChange('jsonBuffer', e.target.value)}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                    min="0"
                    max="8192"
                    step="128"
                    />
                    <p className="text-xs text-slate-500 mt-1">Thêm token dự phòng để đảm bảo AI có đủ không gian cho cấu trúc dữ liệu game (JSON), tránh lỗi. Giá trị này sẽ được cộng thêm vào giới hạn token cuối cùng khi gọi AI. Mặc định: 1024.</p>
                </div>
            </div>
            {isHighEndModel && (
                <div className="p-3 bg-yellow-900/20 border border-yellow-700/50 rounded text-center animate-pulse">
                    <p className="text-sm text-yellow-300 font-semibold">Đang sử dụng Model Cao Cấp (Pro / 3.0)</p>
                    <p className="text-xs text-yellow-500/80">Hệ thống đã tự động tối ưu hóa tài nguyên (Thinking & Tokens) ở mức tối đa. Các thanh trượt trên đã bị vô hiệu hóa.</p>
                </div>
            )}
          </div>
        </section>

        {/* Safety Settings Section */}
        <section className="bg-slate-800/60 p-6 rounded-xl border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-red-400 flex items-center">
              <Icon name="warning" className="w-6 h-6 mr-2" />
              Bộ Lọc An Toàn
            </h2>
            <div className="flex items-center">
                <span className={`text-sm mr-3 ${settings.safetySettings.enabled ? 'text-slate-300' : 'text-slate-500'}`}>
                    {settings.safetySettings.enabled ? 'Đang Bật' : 'Đang Tắt'}
                </span>
                <ToggleSwitch 
                    enabled={settings.safetySettings.enabled} 
                    setEnabled={toggleSafetyFilter} 
                />
            </div>
          </div>
          
          <div className={`space-y-4 transition-opacity duration-300 ${settings.safetySettings.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <p className="text-sm text-slate-400">Điều chỉnh mức độ chặn nội dung nhạy cảm của Gemini API.</p>
            {settings.safetySettings.settings.map((setting) => (
              <div key={setting.category} className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-2 border-b border-slate-700/50 last:border-0">
                <span className="text-slate-300 font-medium mb-1 sm:mb-0">{HARM_CATEGORIES[setting.category]}</span>
                <select
                  value={setting.threshold}
                  onChange={(e) => handleSafetySettingChange(setting.category, e.target.value as HarmBlockThreshold)}
                  className="bg-slate-900 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  {Object.entries(HARM_BLOCK_THRESHOLDS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsScreen;
