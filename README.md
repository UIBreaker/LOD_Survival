# LOD_SURVIVAL

Game sinh tồn pixel art góc nhìn từ trên xuống. WASD để di chuyển, chuột để ngắm, giữ chuột trái để bắn, Space để lướt né, E để phun lửa, Q để phóng lốc xoáy và R để tỏa vòng lửa thiêu đốt địch xung quanh. Nhấn C hoặc nút CHỈ SỐ để xem thông số nhân vật, Esc để tạm dừng, F11 hoặc nút ⛶ để bật/tắt toàn màn hình. Game tự co giãn đúng tỉ lệ 16:9 theo kích thước cửa sổ. Trong Cài đặt có thể bật tự động bắn và chỉnh âm lượng. Nhặt XP Orb để lên cấp và chọn nâng cấp; xu được cộng khi hạ địch. Boss xuất hiện mỗi 5 đợt.

## Chạy game

Yêu cầu Node.js 20.19+ hoặc 22.12+.

```powershell
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal. Để chạy dưới dạng ứng dụng desktop: `npm run build` rồi `npm start`.

## Tạo EXE Windows

```powershell
npm run pack:win
```

File portable là `release/LOD_SURVIVAL.exe`. Mỗi lần đóng gói thành công sẽ thay bản cũ và dọn các đầu ra khác trong `release/`. Đóng game trước khi đóng gói để Windows cho phép ghi đè. Lần đóng gói đầu tiên cần mạng để tải công cụ. Game sau khi đóng gói chạy ngoại tuyến.

## Android

Game dùng Capacitor 8. Cần Node.js 22+, JDK 21 và Android SDK API 36. Build APK thử nghiệm:

```powershell
npm run android:sync
cd android
.\gradlew.bat assembleDebug
```

APK nằm ở `android/app/build/outputs/apk/debug/app-debug.apk`. Trên điện thoại, game chạy ngang màn hình: joystick bên trái để di chuyển, chạm vùng chơi để ngắm, các nút bên phải để lướt và dùng Q/E/R. Bắn thường tự động nhắm địch gần nhất. Bản beta trên GitHub Releases là APK debug để cài thử; giữ cùng khóa ký nếu muốn cập nhật trực tiếp, hoặc gỡ bản cũ trước khi cài bản ký bằng khóa khác.

## PixelFX

Game cài [patch-gg/pixelfx](https://github.com/patch-gg/pixelfx) từ GitHub. Đạn dùng sprite sheet Fireball Throw 36 frame được cung cấp trong `src/assets/`; va chạm, nổ và nhặt vật phẩm dùng module PixelFX gốc. Trong Cài đặt, chọn đồng thời PNG và JSON xuất từ PixelFX Lab để thay sprite sheet Fireball cho phiên chơi hiện tại. Tệp Lua kèm theo trong `public/` là preset tham chiếu từ Lab, không phải mã được game thực thi.

Hơi thở lửa dùng hiệu ứng `fire/fire-breath` sống của PixelFX: nhân vật gồng và gom tia lửa trong 0,38 giây, sau đó phun các cụm lửa, tia nóng và tàn chuyển động theo chuột. Cuối chiêu, ánh lửa lắng xuống và khói tan dần. Địch bị trúng nhận sát thương ban đầu, cháy thêm 3 giây; hiệu ứng `status-burning` 15 khung hình bám trên địch, mờ dần rồi chuyển sang khói và để lại vết cháy. Phép hồi sau 5 giây. Sprite sheet `fire/fire-breath` cũ được giữ làm tham chiếu.

Lốc xoáy lửa dùng sprite sheet `fire/fire-tornado` 60 frame từ PixelFX Lab. Nhấn Q để phóng lốc bay theo hướng chuột trong 3 giây; địch trong bán kính 90 pixel bị kéo vào tâm, nhận sát thương lặp lại khi áp sát và cháy thêm 3 giây. Phép hồi sau 8 giây.

Vòng lửa R dùng sprite sheet `fire/fire-ring` 47 frame từ PixelFX Lab, lan ra từ vị trí nhân vật khi dùng và thiêu đốt kẻ địch trong vùng tác dụng. Hồi chiêu 10 giây. Thanh hồi chiêu Q/E/R hiển thị thời gian còn lại và tiến độ. Nâng cấp **PHÉP KHỔNG LỒ** tăng 20% kích thước hiệu ứng và vùng tác dụng của cả ba phép mỗi lần chọn.

Vật phẩm trên mặt đất dùng sprite sheet `pickups/xp-orb` 22 frame từ PixelFX Lab, được phóng lớn để dễ nhìn. Thu thập chúng để nhận XP. Nâng cấp **CÓ SỨC HÚT** hút mọi XP Orb hiện có và rơi về sau về nhân vật. Địch thường có 8% cơ hội rơi lọ thuốc `pickups/potion` 72 frame, boss luôn rơi; lọ thuốc cũng được phóng lớn và khi nhặt lúc bị thương sẽ hồi 45% máu tối đa. Lọ thuốc không bị nâng cấp hút XP Orb kéo từ xa. Boss gà rơi thêm rương `pickups/chest-open` 138 frame; chạm rương để xem hoạt ảnh mở, nhận 75 vàng và cả ba lá kỹ năng hiển thị trên màn thưởng.

Khi lên cấp, game tạm dừng để phát hiệu ứng `ui/level-up` của PixelFX, chỉ gồm ánh sáng và chữ, không có nhân vật mẫu. Sau khi hiệu ứng kết thúc, các thẻ nâng cấp lần lượt xuất hiện. Sprite sheet 44 frame do PixelFX Lab xuất vẫn được giữ trong `src/assets/` để tham chiếu.

Nhân vật chính và 10 loại địch dùng sprite sheet do người chơi cung cấp trong `src/assets/characters_source.png`. Chạy `python scripts/extract_characters.py` (cần Pillow) để tách nền và tạo `characters_atlas.png` gồm 8 khung mỗi nhân vật. Game giữ tọa độ 480 × 270 nhưng vẽ lên canvas 960 × 540 để bảo toàn chi tiết pixel. Pháp sư bắn phép, cung thủ bắn tên, gà trùm vẫn ném trứng. Âm thanh chiptune được tạo bằng Web Audio API.

## Ghi công

PixelFX được phát hành theo giấy phép MIT. Xem [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
