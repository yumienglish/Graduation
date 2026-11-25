# FCE Graduation 🎓

Trang bài tập về nhà tự học cho lớp **Graduation**, dùng sách *FCE Practice Tests* (Mark Harrison, Oxford). Khung web chép từ [B2 First Adventure](https://github.com/yumienglish/B2-First) (cùng giao diện esports teen, đăng nhập Yumi, bảng xếp hạng, huy hiệu, Quick review, Revenge, nộp 2 lần).

Link cho học sinh: https://yumienglish.github.io/Graduation/

## Nội dung
Mỗi test lấy 2 phần: **Paper 1 Reading Part 2** (điền câu A–H vào bài đọc, kéo thả) và **Paper 3 Use of English Part 1** (trắc nghiệm A–D). Gộp 2 test thành 1 màn:
- Màn 1 (`?w=1`): Test 1 + Test 2
- Màn 2 (`?w=2`): Test 3 + Test 4

Mỗi màn nộp chung 1 lần (38 câu), làm lại câu sai rồi nộp lần 2.

## Cấu trúc
- `index.html`: trang chủ (bản đồ Season) và trang bài làm `?w=N`. Cô xem trước màn chưa mở: `?w=N&preview`
- `lessons.js`: **dữ liệu bài học** (`OPEN_WEEK`, `VOCAB`, `LESSONS`), cú pháp ghi ở đầu file
- `app.js`: giao diện, chấm điểm, làm lại câu sai, gửi bài · `fun.js`: bản đồ, huy hiệu, Quick review, âm thanh · `battle.js`: Revenge / Boss
- `img/ui`, `img/fx`, `audio/`: hình và âm thanh trò chơi (chung với B2 First)

## Nộp bài
Dùng chung máy chủ Code.gs với các trang BTVN (unit `FCE Tests`, tiêu đề mail `FCE Graduation Tests 1 & 2 – …`). Dữ liệu lưu trên máy với khoá `grad-…`, đồng bộ theo tài khoản qua `/yumi-auth.js` (nhóm `grad`).
