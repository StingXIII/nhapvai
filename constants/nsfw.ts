import { NsfwDescriptionStyle, ViolenceLevel, StoryTone } from '../types';

export const NSFW_DESCRIPTION_STYLES: NsfwDescriptionStyle[] = ['Hoa Mỹ', 'Trần Tục', 'Gợi Cảm', 'Mạnh Bạo (BDSM)'];
export const DEFAULT_NSFW_DESCRIPTION_STYLE: NsfwDescriptionStyle = 'Hoa Mỹ';

export const VIOLENCE_LEVELS: ViolenceLevel[] = ['Nhẹ Nhàng', 'Thực Tế', 'Cực Đoan'];
export const DEFAULT_VIOLENCE_LEVEL: ViolenceLevel = 'Thực Tế';

export const STORY_TONES: StoryTone[] = ['Tích Cực', 'Trung Tính', 'Đen Tối', 'Dâm Dục', 'Hoang Dâm', 'Dâm Loạn'];
export const DEFAULT_STORY_TONE: StoryTone = 'Trung Tính';

export const NSFW_TRANSLATIONS = {
  // Difficulty guidance
  difficultyLabel: "Độ Khó",
  difficultyEasy: "Dễ",
  difficultyNormal: "Thường",
  difficultyHard: "Khó",
  difficultyNightmare: "Ác Mộng",
  difficultyGuidanceEasy: "Trải nghiệm dễ dàng. Tài nguyên dồi dào, kẻ địch yếu và cơ hội thành công trong mọi hành động rất cao. AI sẽ ưu tiên các sự kiện tích cực.",
  difficultyGuidanceNormal: "Trải nghiệm cân bằng. Thử thách vừa phải, tài nguyên ổn định. AI sẽ tạo ra các tình huống có cả thành công và thất bại thực tế.",
  difficultyGuidanceHard: "Thử thách khắc nghiệt. Kẻ địch mạnh mẽ, tài nguyên khan hiếm. Mọi quyết định đều mang tính rủi ro cao và AI sẽ không nương tay.",
  difficultyGuidanceNightmare: "Ác mộng thực sự. Thế giới tàn bạo, tỉ lệ tử vong cao. Các sự kiện tiêu cực xảy ra liên tục, đòi hỏi sự tính toán cực độ để sinh tồn.",

  // NSFW Description Style
  nsfwDescriptionStyleLabel: "Phong Cách Miêu Tả Tình Dục (Khi Chế Độ 18+ Bật)",
  nsfwGuidanceHoaMy: "Hoa Mỹ: Sử dụng ngôn ngữ văn chương, ẩn dụ nghệ thuật (tiểu huyệt, ngọc hành, vân mưa...). Diễn họa tinh tế, mãnh liệt nhưng không dung tục.",
  nsfwGuidanceTranTuc: "Trần Tục: Sử dụng ngôn ngữ thẳng thắn, trực diện và bản năng. Đi sâu vào cơ chế vật lý, âm thanh và từ ngữ thông tục nóng bỏng.",
  nsfwGuidanceGoiCam: "Gợi Cảm: Tập trung vào trải nghiệm giác quan, tâm lý và bầu không khí khêu gợi. Khơi gợi trí tưởng tượng thông qua cảm xúc và sự va chạm.",
  nsfwGuidanceManhBaoBDSM: "Mạnh Bạo (BDSM): Tập trung vào sự tương phản quyền lực (Dom/Sub), trói buộc, trừng phạt và những cảm giác mạnh bạo nhất.",

  // Violence Level
  violenceLevelLabel: "Mức Độ Miêu Tả Bạo Lực (Khi Chế Độ 18+ Bật)",
  violenceLevelGuidanceNheNhang: "Nhẹ Nhàng: Bạo lực được gợi ý hoặc mô tả ngắn gọn, tránh các chi tiết đồ họa máu me. Tập trung vào kết quả chiến đấu.",
  violenceLevelGuidanceThucTe: "Thực Tế: Mô tả chân thực các vết thương, máu và tác động vật lý. Không né tránh sự tàn khốc của chiến trường.",
  violenceLevelGuidanceCucDoan: "Cực Đoan: Mô tả trần trụi, chi tiết đến mức ghê rợn các cảnh tàn sát, tra tấn và biến dạng cơ thể.",

  // Story Tone
  storyToneLabel: "Tông Màu Câu Chuyện (Khi Chế Độ 18+ Bật)",
  storyToneGuidanceTichCuc: "Tích Cực: Thế giới tươi sáng, hào hùng. Nhân vật chính thường gặp may mắn và chính nghĩa luôn thắng thế.",
  storyToneGuidanceTrungTinh: "Trung Tính: Phản ánh thực tế đa chiều, có vui có buồn, không có gì tuyệt đối trắng đen.",
  storyToneGuidanceDenToi: "Đen Tối: Thế giới u ám, tàn khốc, đầy rẫy sự phản bội và tuyệt vọng. Sinh tồn là ưu tiên hàng đầu.",
  storyToneGuidanceDamDuc: "Dâm Dục: Tập trung vào sự ham muốn và các mối quan hệ nhục dục xuyên suốt cốt truyện.",
  storyToneGuidanceHoangDam: "Hoang Dâm: Đẩy mạnh yếu tố sắc dục lên mức cực đoan, loạn giao và thỏa mãn dục vọng không giới hạn.",
  storyToneGuidanceDamLoan: "Dâm Loạn: Kết hợp hoang dâm với các mối quan hệ cấm kỵ, phá vỡ các rào cản đạo đức truyền thống.",
};