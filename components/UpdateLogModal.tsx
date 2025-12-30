
import React from 'react';
import Icon from './common/Icon';
import Button from './common/Button';

interface UpdateLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UpdateLogModal: React.FC<UpdateLogModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const updates = [
    {
      version: "7.0.0 (Cập nhật Trải nghiệm & Hướng dẫn)",
      notes: [
        "**Hệ thống Tu Luyện Linh Hoạt:** Giờ đây bạn có thể tùy chỉnh sâu hơn hệ thống tu luyện. Sử dụng cú pháp dải số (VD: 'Tầng 1 - Tầng 9') trong mục 'Tiểu Cảnh Giới' để tự động tạo danh sách dài, giúp thế giới của bạn phong phú và sáng tạo hơn.",
        "**Tra Cứu Thông Tin Tức Thời:** Khi click vào một thực thể được tô sáng (màu xanh hoặc vàng) chưa có trong Bách Khoa Toàn Thư, một popup sẽ hiện ra. Bạn có thể chọn 'Tra cứu ngay' (tốn API) để AI sáng tạo thông tin về thực thể đó ngay lập tức, hoặc 'Hỏi trong lượt sau' để tiết kiệm chi phí.",
        "**Hai Chế Độ Chiến Đấu Rõ Rệt:** Trong màn hình 'Kiến Tạo Thế Giới', bạn có thể chọn giữa hai chế độ chiến đấu:",
        "- **Chiến đấu Cơ chế (Client Combat):** Mọi hành động tấn công sẽ mở giao diện chiến đấu cơ học, nơi bạn toàn quyền điều khiển nhân vật và đồng đội.",
        "- **Chiến đấu Tường thuật (Narrative Combat):** AI sẽ dẫn dắt và mô tả toàn bộ diễn biến trận đấu. Chế độ này phù hợp cho trải nghiệm tập trung vào cốt truyện, không có giao diện chiến đấu."
      ]
    },
    {
      version: "6.8.0 (Giao Diện Thông Báo Chiến Đấu)",
      notes: [
        `**Thông báo Sát khí:** Khi AI kích hoạt trận đấu, một bảng thông báo màu xanh dương sẽ hiện ra thay thế cho các gợi ý hành động, giúp bạn có thời gian chuẩn bị tâm lý trước khi vào trận.`,
        `**Nút Bắt Đầu:** Nút 'BẮT ĐẦU CHIẾN ĐẤU' chiếm vị trí nổi bật, đi kèm danh sách tên các đối thủ mà bạn sẽ phải đối mặt.`,
        `**Cải thiện UX:** Ngăn chặn việc nhảy thẳng vào màn hình combat mà chưa đọc xong lời dẫn của AI.`
      ]
    },
    {
      version: "6.7.0 (Hệ Thống Hậu Cung & Tù Binh)",
      notes: [
        `**Giao Diện Quản Lý Mới:** Ra mắt nút 'Đồng Hành & Hậu Cung' riêng biệt trên thanh menu. Giao diện được chia thành 3 tab rõ ràng: Đạo Lữ (Harem), Nô Lệ và Bạn Đồng Hành, giúp quản lý nhân sự dễ dàng hơn.`,
        `**Cơ Chế Tù Binh (Prisoner):**`,
        `- **Bắt Giữ:** Khi chiến thắng kẻ thù dạng người (NPC) trong chiến đấu, bạn có tùy chọn 'Bắt Giữ' thay vì kết liễu.`,
        `- **Xử Lý:** Tù binh bị bắt sẽ xuất hiện trong danh sách Tù Binh. Bạn có thể thực hiện các hành động: Tra tấn (giảm Ý chí), Dụ dỗ (tăng Thiện cảm) hoặc Thu phục (biến thành Nô lệ/Đồng hành).`,
        `- **Buôn Bán:** Tù binh có thể được bán cho các Thương nhân Nô lệ hoặc tại Chợ Đen để kiếm một khoản tiền lớn.`,
        `**Hệ Thống Nô Lệ (Slave):**`,
        `- **Chỉ số Phục tùng:** Nô lệ có chỉ số 'Phục tùng' và 'Ý chí'. Ý chí càng thấp, phục tùng càng cao, càng dễ sai bảo.`,
        `- **Tương tác:** Có thể mang Nô lệ đi chiến đấu (như đồng hành) hoặc dùng làm đối tượng Song Tu (trong màn hình Tu Luyện) để tăng tốc độ tu vi.`,
        `**Đạo Lữ (Harem):**`,
        `- Quy tụ những nhân vật có mối quan hệ tình cảm sâu sắc (Vợ/Chồng/Người yêu).`,
        `- Được ưu tiên hỗ trợ trong chiến đấu và tăng hiệu quả cao nhất khi Song Tu.`
      ]
    },
    {
      version: "2.0.0 (Đại Cập Nhật: Tu Chân Giới Hoàn Mỹ)",
      notes: [
        `**Hệ Thống Tu Luyện Chuyên Sâu:** Truy cập thông qua nút 'Tu Luyện' (Icon Gậy Phép) trên thanh bên. Bạn có thể chọn:`,
        `- **Bế Quan:** Tiêu hao tiền tệ để tăng Kinh nghiệm (EXP) và Tu vi.`,
        `- **Luyện Kỹ:** Tăng độ thuần thục cho các Linh Kĩ đã học.`,
        `- **Song Tu:** Kết hợp với Đạo lữ/Nô lệ (nếu có) để tăng tốc độ tu luyện (Yêu cầu độ thiện cảm cao).`,
        
        `**Cơ Chế Độ Kiếp (Tribulation):** Khi thanh kinh nghiệm đầy ở cấp bậc cao nhất của một đại cảnh giới (VD: Luyện Khí Viên Mãn), bạn sẽ gặp **'Bình Cảnh'**. Nút 'Độ Kiếp' màu vàng sẽ xuất hiện trong màn hình Tu Luyện.`,
        `- **Thử thách:** Bạn phải chiến đấu sinh tử với 'Lôi Kiếp Hóa Thân'.`,
        `- **Thành công:** Đột phá lên đại cảnh giới mới, hồi phục toàn bộ trạng thái, và được cộng thêm tuổi thọ (Thọ nguyên).`,
        `- **Thất bại:** Bạn sẽ bị trọng thương, mất sạch kinh nghiệm tích lũy và **TỤT CẤP** (rớt xuống cảnh giới thấp hơn). Hãy chuẩn bị kỹ (thuốc, trang bị) trước khi độ kiếp!`,

        `**Client Chiến Đấu Visual (Offline Mode):** Giao diện chiến đấu mới trực quan với thanh HP/MP và hiệu ứng.`,
        `- **Đội hình (Party):** Cho phép mang theo Đồng hành/Nô lệ/Vợ vào trận chiến (Cần chọn trong nút 'Đổi Đội Hình').`,
        `- **Kỹ năng & Vật phẩm:** Sử dụng trực tiếp từ bảng điều khiển thay vì gõ lệnh.`,
        `- **Cơ chế Phản Sát (Counter):** Khi máu dưới 40%, nút 'Phản Sát' sẽ sáng lên. Chơi minigame 'Bắt điểm sáng' để chặn sát thương và kích hoạt khiên hộ thể.`,
        `- **Hắc Thiểm (Black Flash):** Khi tấn công, có xác suất kích hoạt minigame 'Tâm điểm'. Bấm đúng nhịp để gây sát thương chí mạng (Crit) gấp nhiều lần (X2.5 ~ X10).`
      ]
    },
    {
      version: "6.6.6 (Siêu Cập Nhật: Gemini 3.0 & Tối Ưu Hóa Cốt Lõi)",
      notes: [
        `**Tích hợp Gemini 3.0 Pro (Siêu Trí Tuệ):** Bổ sung model mạnh nhất hiện nay vào Cài đặt. Chế độ này sẽ tự động bỏ qua các giới hạn hiệu suất (Max Tokens, Thinking Budget) để AI phát huy tối đa khả năng tư duy và sáng tạo dẫn truyện.`,
        `**Nâng cấp Codex: Gán & Thực Thi:** Tính năng Codex giờ đây không chỉ tạo mới mà còn có thể **Cập nhật/Gán** thông tin cho thực thể đã có. Ví dụ: 'Sửa thanh kiếm sắt thành gỉ sét' sẽ cập nhật trực tiếp vật phẩm trong túi đồ thay vì tạo cái mới.`,
        `**Sàng Lọc Ngữ Cảnh Cục Bộ (Chống Out Token):** Khắc phục triệt để lỗi tràn bộ nhớ khi sử dụng Dataset lớn. Hệ thống giờ đây chỉ trích xuất các đoạn văn bản có chứa 'Từ khóa Neo' (tên nhân vật, địa danh...) liên quan thay vì gửi toàn bộ file cho AI.`,
        `**Tùy Biến Giao Diện Gameplay:** Nếu bạn tắt 'Hệ thống Chỉ số' hoặc 'Cột mốc' trong lúc Kiến tạo Thế giới, các mục này sẽ được ẩn hoàn toàn khỏi giao diện chơi game để tối ưu không gian.`,
      ]
    },
    {
        version: "1.7.4 (Đại tu Bách Khoa: Phân Loại Động & Backup)",
        notes: [
            `**Hệ Thống Danh Mục Tùy Chỉnh:** Người chơi giờ đây có thể tự tạo và quản lý các danh mục riêng (VD: 'Cảnh Giới', 'Thần Thú') trong Bách Khoa Toàn Thư. Các danh mục này sẽ hiển thị dưới dạng Tab riêng biệt, giúp phân loại thông tin linh hoạt hơn.`,
            `**AI Thông Minh Hơn:** AI dẫn truyện đã được cập nhật để nhận biết các danh mục bạn tạo. Khi sinh ra thực thể mới, AI sẽ ưu tiên đưa chúng vào các danh mục tùy chỉnh phù hợp nhất (ví dụ: đưa 'Trúc Cơ Kỳ' vào tab 'Cảnh Giới') thay vì các nhóm mặc định.`,
            `**Xuất/Nhập Dữ Liệu Toàn Diện:** Tính năng Xuất/Nhập (Backup) trong Bách Khoa đã được nâng cấp để sao lưu TOÀN BỘ dữ liệu: bao gồm vật phẩm, kỹ năng, NPC, nhiệm vụ, phe phái, các thực thể ban đầu và cả danh mục tùy chỉnh. Đảm bảo an toàn tuyệt đối cho dữ liệu của bạn.`,
            `**Di chuyển Dữ liệu Linh hoạt:** Tính năng 'Chỉnh sửa / Di chuyển' cho phép bạn di chuyển bất kỳ thực thể nào vào các Tab Động một cách dễ dàng. Hệ thống sẽ tự động cập nhật phân loại của thực thể đó để tương thích với Tab mới.`
        ]
    },
    {
      version: "1.7.0 (Cập nhật Model & Mô phỏng Thế giới)",
      notes: [
        `**Tích hợp Gemini 2.5 Pro:** Đã bổ sung tùy chọn model Gemini 2.5 Pro vào phần Cài đặt. Người chơi giờ đây có thể linh hoạt chuyển đổi giữa tốc độ phản hồi cực nhanh của bản Flash hoặc khả năng tư duy sâu sắc, văn phong chau chuốt vượt trội của bản Pro để có trải nghiệm dẫn truyện đỉnh cao nhất.`,
        `**Hệ thống 'Cutscene' Thế giới:** Đôi khi vào cuối lượt chơi, AI sẽ kích hoạt một đoạn mô phỏng ngắn (Cutscene) về các sự kiện đang diễn ra ở những nơi khác trong thế giới (tin đồn, biến động phe phái, sự kiện ngầm...). Điều này giúp thế giới game trở nên sống động, rộng lớn và vận hành độc lập ngay cả khi không có sự can thiệp trực tiếp của bạn.`
      ]
    },
    {
      version: "1.6.5 (Đại tu Bách Khoa Toàn Thư & Tối ưu hóa Dữ liệu)",
      notes: [
        `**Hệ thống Phân loại Động:** Bách Khoa Toàn Thư giờ đây có khả năng tự động học và tạo ra các danh mục phân loại mới (\`customCategory\`) do AI đề xuất, giúp hệ thống linh hoạt với mọi loại dữ liệu sáng tạo.`,
        `**Chuẩn hóa Thông minh bằng AI:** Tích hợp công cụ \"Chuẩn Hóa\" trong mục Quản Lý, cho phép AI tự động phân tích, gộp các danh mục lộn xộn (VD: 'Dược thảo', 'Linh dược' -> 'Dược Liệu') và hợp nhất các mục bị trùng lặp (VD: 'Lộ Na' và 'HLV Lộ Na'), giữ cho dữ liệu luôn sạch sẽ và có tổ chức.`,
        `**Giao diện Tab Động:** Giao diện Bách Khoa Toàn Thư được nâng cấp để tự động hiển thị các tab mới dựa trên các phân loại động do AI tạo ra, giúp người chơi dễ dàng duyệt qua các loại thông tin mới lạ.`,
        `**Vệ sinh Dữ liệu Đầu vào:** Triển khai cơ chế tự động làm sạch tên thực thể, loại bỏ các hậu tố thừa (VD: 'Thanh Tâm Liên - Tuyệt phẩm' -> 'Thanh Tâm Liên'), đảm bảo tính nhất quán của dữ liệu.`
      ]
    },
    {
      version: "1.6.0 (Đại tu Kiến tạo Thế giới & Hệ thống Cột mốc)",
      notes: [
        `**Hệ thống Cột mốc (Chỉ số dạng chữ):** Giới thiệu một hệ thống chỉ số dạng chữ hoàn toàn mới, cho phép theo dõi các tiến trình phi số hóa như 'Cảnh Giới Tu Luyện', 'Thân Phận', 'Linh Căn'... Hệ thống này có thể bật/tắt riêng biệt.`,
        `**AI Hỗ trợ Thông minh:** Bổ sung các nút 'AI Hỗ trợ' chuyên dụng cho Hệ thống Cột mốc, giúp AI tự động điền các chỉ số phù hợp với thể loại và bối cảnh, hoặc hoàn thiện các chi tiết người chơi còn bỏ trống.`,
        `**Nâng cấp Giao diện Kiến tạo:** Tích hợp các 'Tooltips' (hướng dẫn chi tiết) cho mọi mục quan trọng, giúp người mới dễ dàng hiểu rõ công dụng của từng tùy chọn. Chuyển đổi mục 'Thể loại' thành danh sách chọn lựa với tùy chọn 'Tùy chỉnh' linh hoạt.`,
        `**Hiển thị Cột mốc trong Gameplay:** Bảng điều khiển nhân vật trong game giờ đây sẽ hiển thị các Cột mốc quan trọng, giúp người chơi dễ dàng theo dõi tiến trình tu luyện và các trạng thái đặc biệt.`
      ]
    },
    {
      version: "1.5.4 (Nâng cấp Trải nghiệm Người dùng & AI)",
      notes: [
        `**Nâng cấp Tính cách Nhân vật do AI tạo:** AI giờ đây sẽ tạo ra các tính cách tùy chỉnh có chiều sâu, phức tạp và mâu thuẫn hơn, mang lại những nhân vật đáng nhớ và khó đoán hơn.`,
        `**Đại tu Màn hình Tải Game:** Giao diện tải game được thiết kế lại hoàn toàn, phân loại rõ ràng giữa file lưu 'Thủ công' và 'Tự động', giúp người chơi quản lý các bản lưu một cách trực quan và hiệu quả hơn.`,
        `**Thêm Bộ lọc Thông minh cho Kiến Tạo Thực Thể Ban Đầu:** Bổ sung bộ lọc và thanh tìm kiếm, cho phép người chơi dễ dàng tìm kiếm và quản lý danh sách các NPC, vật phẩm, địa điểm... khi kiến tạo thế giới, đặc biệt hữu ích với các thế giới có nhiều thực thể.`
      ]
    }
  ];

  const formatNote = (note: string) => {
    // A simple markdown-like bold formatter
    return note.split('**').map((text, index) => 
      index % 2 === 1 ? <strong key={index} className="text-slate-200">{text}</strong> : text
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-2xl relative animate-fade-in-up flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-special-400 flex items-center gap-3">
            <Icon name="news" className="w-6 h-6 text-fuchsia-400" />
            Nhật Ký Cập Nhật Game
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
             <Icon name="xCircle" className="w-7 h-7" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 space-y-6">
          {updates.map((update, index) => (
            <div key={index}>
              <h3 className="text-lg font-semibold text-fuchsia-300 border-b border-fuchsia-500/30 pb-1 mb-2">{update.version}</h3>
              <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm">
                {update.notes.map((note, noteIndex) => (
                  <li key={noteIndex}>{formatNote(note)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-6 flex-shrink-0">
            <Button onClick={onClose} variant="special" className="!w-auto !py-2 !px-5 !text-base">
                Đóng
            </Button>
        </div>

        <style>{`
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up {
            animation: fade-in-up 0.3s ease-out forwards;
          }
        `}</style>
      </div>
    </div>
  );
};

export default UpdateLogModal;
