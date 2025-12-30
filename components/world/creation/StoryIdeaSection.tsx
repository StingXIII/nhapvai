import React from 'react';
import Icon from '../../common/Icon';
import Button from '../../common/Button';
import AiAssistButton from '../../common/AiAssistButton';
import { StyledInput, LoadingStates } from './constants';

interface StoryIdeaSectionProps {
    storyIdea: string;
    setStoryIdea: (val: string) => void;
    fanfictionIdea: string;
    setFanfictionIdea: (val: string) => void;
    loadingStates: LoadingStates;
    onGenerateWorld: () => void;
    onGenerateFanfiction: () => void;
    onLoadFanficFile: () => void;
    onOpenFanficLibrary: () => void;
}

const StoryIdeaSection: React.FC<StoryIdeaSectionProps> = ({
    storyIdea,
    setStoryIdea,
    fanfictionIdea,
    setFanfictionIdea,
    loadingStates,
    onGenerateWorld,
    onGenerateFanfiction,
    onLoadFanficFile,
    onOpenFanficLibrary
}) => {
    return (
        <div className="space-y-8">
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg border-l-4 border-fuchsia-500 p-4 shadow-lg">
                <h3 className="text-xl font-bold text-left text-fuchsia-400 mb-2 flex items-center">
                    <Icon name="magic" className="w-6 h-6 mr-3" />
                    Ý Tưởng Cốt Truyện Ban Đầu (AI Hỗ Trợ)
                </h3>
                <p className="text-sm text-slate-400 mb-3 italic">
                    Nhập một ý tưởng ngắn gọn, AI sẽ tự động kiến tạo toàn bộ thế giới cho bạn.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <StyledInput 
                        placeholder="VD: một thám tử ma thuật ở Sài Gòn năm 2077..." 
                        value={storyIdea}
                        onChange={(e) => setStoryIdea(e.target.value)}
                    />
                    <AiAssistButton 
                        isLoading={loadingStates['worldIdea']} 
                        onClick={onGenerateWorld}
                        isFullWidth
                        className="sm:!w-auto"
                    >
                        Kiến Tạo Nhanh
                    </AiAssistButton>
                </div>
            </div>
            
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg border-l-4 border-violet-500 p-4 shadow-lg">
                <h3 className="text-xl font-bold text-left text-violet-400 mb-2 flex items-center">
                    <Icon name="magic" className="w-6 h-6 mr-3" />
                    Ý Tưởng Đồng Nhân / Fanfiction (AI Hỗ Trợ)
                </h3>
                <p className="text-sm text-slate-400 mb-3 italic">
                    Nhập tên tác phẩm và ý tưởng. AI sẽ sử dụng các tệp nguyên tác trong kho để đồng bộ bối cảnh chính xác nhất.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-2 mb-3">
                    <StyledInput 
                        placeholder="VD: đồng nhân Naruto, nếu Obito không theo Madara..." 
                        value={fanfictionIdea}
                        onChange={(e) => setFanfictionIdea(e.target.value)}
                    />
                    <AiAssistButton 
                        isLoading={loadingStates['worldFanfictionIdea']} 
                        onClick={onGenerateFanfiction}
                        isFullWidth
                        className="sm:!w-auto"
                    >
                        Kiến Tạo Đồng Nhân
                    </AiAssistButton>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <Button onClick={onLoadFanficFile} variant="secondary" className="!w-full sm:!w-auto !text-sm !py-2">
                        <Icon name="upload" className="w-4 h-4 mr-2" /> Tải từ máy (.txt)
                    </Button>
                     <Button onClick={onOpenFanficLibrary} variant="secondary" className="!w-full sm:!w-auto !text-sm !py-2">
                        <Icon name="save" className="w-4 h-4 mr-2" /> Chọn từ Kho (.txt)
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default StoryIdeaSection;