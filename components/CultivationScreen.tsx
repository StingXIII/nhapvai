
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { KnowledgeBase, GameScreen, Skill, NPC, Wife, Slave } from './../types';
import Button from './common/Button';
import Spinner from './ui/Spinner';
import { VIETNAMESE } from './../constants';
import * as GameTemplates from './../templates';

// Simple InputField internal component since we don't have the original source
const InputField: React.FC<any> = ({ label, id, type, options, value, onChange, disabled, children, min, className }) => {
    return (
        <div className="mb-2">
            <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
            {type === 'select' ? (
                <select
                    id={id}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    className={className || "w-full p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-100"}
                >
                    {options && options.map((opt: any) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                    {children}
                </select>
            ) : (
                <input
                    type={type}
                    id={id}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    min={min}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-100"
                />
            )}
        </div>
    );
};

interface CultivationScreenProps {
  knowledgeBase: KnowledgeBase;
  onStartCultivation: (
    type: 'skill' | 'method',
    duration: number,
    targetId?: string,
    partnerId?: string
  ) => Promise<string[]>;
  onExit: (cultivationLog: string[], totalDuration: { days: number; months: number; years: number; }) => void;
  isLoading: boolean;
  setCurrentScreen: (screen: GameScreen) => void;
  onStartBreakthrough: () => Promise<void>; // Passed from parent
}

const CultivationScreen: React.FC<CultivationScreenProps> = ({
  knowledgeBase,
  onStartCultivation,
  onExit,
  isLoading,
  setCurrentScreen,
  onStartBreakthrough
}) => {
  const isBottlenecked = knowledgeBase.playerStats.hieuUngBinhCanh;

  const [activeTab, setActiveTab] = useState<'skill' | 'method'>('method');
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<'solo' | 'dual'>('solo');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [duration, setDuration] = useState({ days: 1, months: 0, years: 0 });
  const [totalAccumulatedDuration, setTotalAccumulatedDuration] = useState({ days: 0, months: 0, years: 0 });
  const [cultivationLog, setCultivationLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // New state for tribulation preparation
  const [isPreparing, setIsPreparing] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const isCurrentlyPreparingRef = useRef(false); // Ref để tránh lỗi stale closure trong setTimeout

  const { playerSkills, wives, slaves, playerStats, worldConfig, realmProgressionList } = knowledgeBase;
  const currencyName = worldConfig?.currencyName || "tiền tệ";
  
  const [viewingRealmData, setViewingRealmData] = useState<string>(playerStats.realm || '');

  const totalTurns = useMemo(() => {
    return duration.days + (duration.months * 30) + (duration.years * 360);
  }, [duration]);
  
  const realmCultivationData = useMemo(() => {
    const playerRace = worldConfig?.playerRace || 'Nhân Tộc';
    const playerRealmSystem = worldConfig?.raceCultivationSystems?.find(s => s.raceName === playerRace)?.realmSystem 
                              || 'Luyện Khí - Trúc Cơ - Kim Đan - Nguyên Anh - Hóa Thần';
    const progressionList = playerRealmSystem.split(' - ').map(s => s.trim()).filter(Boolean);
    
    return progressionList.map((realmName, index) => {
        const cost = Math.floor(500 * Math.pow(1.2, index));
        const exp = Math.floor(500 * Math.pow(0.8, index));
        return { realmName, cost, exp };
    });
  }, [worldConfig]);

  const { costPerDay, expPerDay } = useMemo(() => {
    const currentMainRealm = (realmProgressionList || []).find(r => (playerStats.realm || '').startsWith(r));
    const realmIndex = currentMainRealm ? (realmProgressionList || []).indexOf(currentMainRealm) : 0;
    
    const cost = Math.floor(500 * Math.pow(1.2, realmIndex));
    const exp = Math.floor(500 * Math.pow(0.8, realmIndex));
    return { costPerDay: cost, expPerDay: exp };
  }, [playerStats.realm, realmProgressionList]);

  const totalCost = totalTurns * costPerDay;
  const totalExpGain = totalTurns * expPerDay;

  const canAfford = (playerStats.currency || 0) >= totalCost;

  const cultivatableSkills = useMemo(() => {
    // Assuming SKILL_TYPE_LINH_KI is a constant or logic. Using simple check for now.
    return playerSkills.filter(skill => skill.skillType === 'LINH_KI');
  }, [playerSkills]);

  const soloCultivationMethods = useMemo(() => {
    return playerSkills.filter(skill => skill.skillType === 'CONG_PHAP_TU_LUYEN' && skill.congPhapDetails?.type !== 'SONG_TU');
  }, [playerSkills]);

  const dualCultivationMethods = useMemo(() => {
    return playerSkills.filter(skill => skill.skillType === 'CONG_PHAP_TU_LUYEN' && skill.congPhapDetails?.type === 'SONG_TU');
  }, [playerSkills]);

  const dualCultivationPartners = useMemo(() => {
    return [...wives, ...slaves];
  }, [wives, slaves]);

  useEffect(() => {
    const currentMainRealm = (realmProgressionList || []).find(r => (playerStats.realm || '').startsWith(r));
    if (currentMainRealm) {
        setViewingRealmData(currentMainRealm);
    }
  }, [playerStats.realm, realmProgressionList]);

  useEffect(() => {
    if (activeTab === 'method') {
      const currentMethods = selectedMethod === 'solo' ? soloCultivationMethods : dualCultivationMethods;
      const isMethodSelectionValid = currentMethods.some(m => m.id === selectedMethodId);

      if (currentMethods.length > 0 && !isMethodSelectionValid) {
        setSelectedMethodId(currentMethods[0].id);
      } else if (currentMethods.length === 0 && selectedMethodId) {
        setSelectedMethodId('');
      }

      if (selectedMethod === 'dual') {
        const isPartnerSelectionValid = dualCultivationPartners.some(p => p.id === selectedPartnerId);
        if (dualCultivationPartners.length > 0 && !isPartnerSelectionValid) {
          setSelectedPartnerId(dualCultivationPartners[0].id);
        } else if (dualCultivationPartners.length === 0 && selectedPartnerId) {
          setSelectedPartnerId('');
        }
      }
    }
  }, [activeTab, selectedMethod, soloCultivationMethods, dualCultivationMethods, dualCultivationPartners, selectedMethodId, selectedPartnerId]);

  const handleDurationChange = (field: 'days' | 'months' | 'years', value: string) => {
    const numValue = parseInt(value, 10) || 0;
    setDuration(prev => ({
      ...prev,
      [field]: Math.max(0, numValue)
    }));
  };

  const handleStart = async () => {
    setError(null);
    try {
      const targetId = activeTab === 'skill' ? selectedSkillId : selectedMethodId;
      
      const log = await onStartCultivation(
        activeTab,
        totalTurns,
        targetId,
        (activeTab === 'method' && selectedMethod === 'dual') ? selectedPartnerId : undefined
      );
      
      setCultivationLog(prev => [...prev, ...log]);
      setTotalAccumulatedDuration(prev => ({
          days: prev.days + duration.days,
          months: prev.months + duration.months,
          years: prev.years + duration.years,
      }));
      setDuration({ days: 1, months: 0, years: 0 });

    } catch (e) {
      setError(e instanceof Error ? e.message : VIETNAMESE.errorCultivating);
    }
  };

  const handleExit = () => {
    onExit(cultivationLog, totalAccumulatedDuration);
  };
  
  const canStartCultivation = () => {
    if (isLoading || isBottlenecked) return false;
    const isDurationValid = duration.days > 0 || duration.months > 0 || duration.years > 0;
    if (!isDurationValid) return false;

    if (activeTab === 'skill') return !!selectedSkillId;
    if (activeTab === 'method') {
      if (!selectedMethodId && soloCultivationMethods.length > 0 && selectedMethod === 'solo') {
          // auto-select first if none selected
          setSelectedMethodId(soloCultivationMethods[0].id);
          return true;
      }
      if (!selectedMethodId) return false;

      if (selectedMethod === 'solo') return true;
      if (selectedMethod === 'dual') return !!selectedPartnerId && dualCultivationMethods.length > 0;
    }
    return false;
  }

  const startTribulation = useCallback(async () => {
    if (isLoading || isPreparing) return; // Prevent multiple clicks
    setIsPreparing(true);
    isCurrentlyPreparingRef.current = true; // Cập nhật ref ngay lập tức

    let count = 3;
    setCountdown(count);
    
    // Safety timer to unlock if stuck
    const safetyTimer = setTimeout(() => {
        if (isCurrentlyPreparingRef.current) { // Sử dụng ref để kiểm tra giá trị mới nhất
            setIsPreparing(false);
            isCurrentlyPreparingRef.current = false; // Cập nhật ref khi hết hạn
            setError("Quá trình chuẩn bị bị gián đoạn. Vui lòng thử lại.");
        }
    }, 5000); // 5 seconds timeout

    const interval = setInterval(() => {
        count--;
        setCountdown(c => Math.max(0, c - 1));
        if (count < 0) {
            clearInterval(interval);
        }
    }, 1000);
    
    try {
        await onStartBreakthrough();
        // Nếu onStartBreakthrough hoàn tất thành công và chuyển màn hình,
        // component này sẽ unmount. Nhưng nếu vì lý do nào đó không chuyển,
        // ta vẫn cần đảm bảo `isPreparing` được đặt về `false`.
    } catch(e) {
        setError(e instanceof Error ? e.message : "Lỗi khi bắt đầu Độ Kiếp.");
    } finally {
        // Luôn đảm bảo xóa interval, timer và reset `isPreparing`
        clearInterval(interval);
        clearTimeout(safetyTimer);
        setIsPreparing(false); // Reset `isPreparing` trong mọi trường hợp
        isCurrentlyPreparingRef.current = false; // Cập nhật ref khi kết thúc
    }
  }, [onStartBreakthrough, isLoading, isPreparing]);

  return (
    <div className="h-screen w-screen bg-gray-900 flex flex-col p-4 text-gray-100 relative overflow-hidden">
      {isPreparing && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
            <Spinner />
            <p className="text-xl mt-4 text-cyan-300">Chuẩn bị Lôi Trì...</p>
            <p className="text-5xl font-bold mt-2 text-white">{countdown > 0 ? countdown : '...'}</p>
        </div>
      )}
      <header className="mb-4 flex justify-between items-center shrink-0">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400">
          {VIETNAMESE.cultivationScreenTitle}
        </h1>
        <div className="flex items-center gap-2">
            <Button onClick={handleExit} variant="secondary" disabled={isLoading}>
                {VIETNAMESE.exitCultivationButton}
            </Button>
        </div>
      </header>

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
        {/* Left Panel: Options */}
        <div className="lg:col-span-1 bg-gray-900 p-4 rounded-lg shadow-xl border border-gray-700 flex flex-col space-y-4 overflow-y-auto">
          <div className="flex border-b border-gray-600">
            <button onClick={() => setActiveTab('method')} className={`flex-1 py-2 text-sm font-semibold ${activeTab === 'method' ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}>{VIETNAMESE.methodCultivationTab}</button>
            <button onClick={() => setActiveTab('skill')} className={`flex-1 py-2 text-sm font-semibold ${activeTab === 'skill' ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}>{VIETNAMESE.skillCultivationTab}</button>
          </div>

          {activeTab === 'skill' && (
            <div className="space-y-3">
               <label htmlFor="selectSkill" className="block text-sm font-medium text-gray-300">{VIETNAMESE.selectSkillToCultivate}</label>
               <select
                  id="selectSkill"
                  value={selectedSkillId}
                  onChange={(e) => setSelectedSkillId(e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-100"
                  disabled={isBottlenecked}
               >
                  <option value="">-- Chọn Linh Kĩ --</option>
                  {cultivatableSkills.map(skill => (
                     <option key={skill.id} value={skill.id}>{skill.name} ({skill.proficiencyTier || 'Sơ Nhập'})</option>
                  ))}
               </select>
               {cultivatableSkills.length === 0 && <p className="text-xs text-yellow-400 italic">{VIETNAMESE.noSkillsToCultivate}</p>}
            </div>
          )}

          {activeTab === 'method' && (
            <div className="space-y-3">
                <InputField
                    label={VIETNAMESE.selectCultivationMethod}
                    id="selectMethod"
                    type="select"
                    options={[VIETNAMESE.closedDoorCultivation, VIETNAMESE.dualCultivation]}
                    value={selectedMethod === 'solo' ? VIETNAMESE.closedDoorCultivation : VIETNAMESE.dualCultivation}
                    onChange={(e: any) => {
                    setSelectedMethodId('');
                    setSelectedMethod(e.target.value === VIETNAMESE.closedDoorCultivation ? 'solo' : 'dual')
                    }}
                    disabled={isBottlenecked}
                />
              
              {selectedMethod === 'solo' && (
                <InputField
                  label="Chọn Công Pháp Bế Quan"
                  id="select-solo-method"
                  type="select"
                  options={soloCultivationMethods.map(m => m.name) || []}
                  value={soloCultivationMethods.find(m=>m.id === selectedMethodId)?.name || ''}
                  onChange={(e: any) => setSelectedMethodId(soloCultivationMethods.find(m=>m.name === e.target.value)?.id || '')}
                  disabled={soloCultivationMethods.length === 0 || isBottlenecked}
                />
              )}

              {selectedMethod === 'dual' && (
                <>
                  <InputField
                    label="Chọn Công Pháp Song Tu"
                    id="select-dual-method"
                    type="select"
                    options={dualCultivationMethods.map(m => m.name) || []}
                    value={dualCultivationMethods.find(m=>m.id === selectedMethodId)?.name || ''}
                    onChange={(e: any) => setSelectedMethodId(dualCultivationMethods.find(m=>m.name === e.target.value)?.id || '')}
                    disabled={dualCultivationMethods.length === 0 || isBottlenecked}
                  />
                  {dualCultivationMethods.length === 0 && <p className="text-xs text-yellow-400 italic">{VIETNAMESE.noDualCultivationMethod}</p>}
                  {dualCultivationPartners.length === 0 && <p className="text-xs text-yellow-400 italic">{VIETNAMESE.noDualCultivationPartnerAvailable}</p>}
                  
                  {dualCultivationMethods.length > 0 && (
                     <InputField
                        label={VIETNAMESE.selectDualCultivationPartner}
                        id="selectPartner"
                        type="select"
                        options={dualCultivationPartners.map(p => p.name)}
                        value={dualCultivationPartners.find(p=>p.id === selectedPartnerId)?.name || ''}
                        onChange={(e: any) => setSelectedPartnerId(dualCultivationPartners.find(p=>p.name === e.target.value)?.id || '')}
                        disabled={dualCultivationPartners.length === 0 || isBottlenecked}
                     />
                  )}
                </>
              )}
            </div>
          )}

            <fieldset disabled={isBottlenecked}>
                <legend className="block text-sm font-medium text-gray-300 mb-2">{VIETNAMESE.cultivationDurationLabel}</legend>
                <div className="grid grid-cols-3 gap-2">
                    <InputField label="Năm" id="duration-years" type="number" min={0} value={duration.years} onChange={(e: any) => handleDurationChange('years', e.target.value)} />
                    <InputField label="Tháng" id="duration-months" type="number" min={0} value={duration.months} onChange={(e: any) => handleDurationChange('months', e.target.value)} />
                    <InputField label="Ngày" id="duration-days" type="number" min={0} value={duration.days} onChange={(e: any) => handleDurationChange('days', e.target.value)} />
                </div>
            </fieldset>
            
            <div className="mt-2 p-3 bg-gray-800 rounded-md border border-gray-700 space-y-2">
                 <InputField
                    label="Bảng Chi Phí & Kinh Nghiệm Tu Luyện"
                    id="realm-cost-info"
                    type="select"
                    value={viewingRealmData}
                    onChange={(e: any) => setViewingRealmData(e.target.value)}
                    options={realmCultivationData.map(d => d.realmName)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-100"
                >
                    {realmCultivationData.map(data => (
                        <option key={data.realmName} value={data.realmName}>
                            {data.realmName}: {data.cost.toLocaleString()} {currencyName} → {data.exp.toLocaleString()} EXP/ngày
                        </option>
                    ))}
                 </InputField>

                <p className="text-sm text-gray-300">
                    <span className="font-semibold text-amber-400">Tổng chi phí:</span>
                    <span className={`ml-2 font-bold text-lg ${canAfford ? 'text-white' : 'text-red-400'}`}>{totalCost.toLocaleString()} {currencyName}</span>
                </p>
                 <p className="text-sm text-gray-300">
                    <span className="font-semibold text-green-400">Sẽ nhận được:</span>
                    <span className="ml-2 font-bold text-lg text-white">{totalExpGain.toLocaleString()} Kinh nghiệm</span>
                </p>
                <p className={`text-xs ${canAfford ? 'text-gray-400' : 'text-red-400'}`}>
                    (Hiện có: {playerStats.currency?.toLocaleString() || 0} {currencyName})
                </p>
            </div>

          {totalAccumulatedDuration.days > 0 || totalAccumulatedDuration.months > 0 || totalAccumulatedDuration.years > 0 ? (
            <div className="text-xs text-center text-cyan-300 bg-cyan-900/30 p-2 rounded-md border border-cyan-700">
                Tổng thời gian đã tu luyện: {totalAccumulatedDuration.years} năm, {totalAccumulatedDuration.months} tháng, {totalAccumulatedDuration.days} ngày.
            </div>
          ) : null}

          <Button onClick={handleStart} variant="primary" isLoading={isLoading} loadingText={VIETNAMESE.cultivatingMessage} disabled={!canStartCultivation() || !canAfford || isPreparing}>
            {VIETNAMESE.startCultivationButton}
          </Button>

          {isBottlenecked && (
                <div className="mt-4 pt-4 border-t-2 border-red-500 bg-red-900/20 p-3 rounded-lg space-y-3 animate-pulse">
                    <h3 className="text-xl font-bold text-red-300 text-center">!!! BÌNH CẢNH !!!</h3>
                    <p className="text-sm text-red-200 text-center">
                        Tu vi của bạn đã đạt đến đỉnh phong. Cần phải vượt qua thiên kiếp để đột phá! Đây là một thử thách sinh tử, thành công sẽ lên mây, thất bại sẽ rơi xuống vực.
                    </p>
                    <Button 
                        onClick={startTribulation} 
                        variant="warning" 
                        isLoading={isLoading || isPreparing}
                        disabled={isLoading || isPreparing}
                        className="w-full"
                    >
                        Độ Kiếp
                    </Button>
                </div>
            )}

        </div>

        {/* Right Panel: Results */}
        <div className="lg:col-span-2 bg-gray-900 p-4 rounded-lg shadow-xl border border-gray-700 flex flex-col overflow-hidden">
          <h2 className="text-xl font-semibold text-cyan-300 mb-3 border-b border-gray-600 pb-2 flex-shrink-0">{VIETNAMESE.cultivationResultTitle}</h2>
          <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
            {isLoading && cultivationLog.length === 0 && <Spinner text={VIETNAMESE.cultivatingMessage} />}
            {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}
            {cultivationLog.length > 0 ? (
              <div className="space-y-3 text-sm whitespace-pre-wrap leading-relaxed">
                {cultivationLog.map((logEntry, index) => (
                  <p key={index}>{logEntry}</p>
                ))}
              </div>
            ) : (
                !isLoading && <p className="text-gray-500 italic">Hãy chọn phương thức và bắt đầu tu luyện để xem kết quả.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CultivationScreen;
