-- PixelFX Studio: cấu hình preset cho sprite sheet, không phải mã chạy pixelfx trong Lua.
return {
  id = "fire/fire-ring",
  sprite_sheet = "fire-fire-ring_sheet.png",
  seed = 6,
  flip = false,
  angle = 0, -- độ
  light = 2.5,
  speed = 1,
  fps = 12,
  frame_width = 224,
  frame_height = 128,
  frames = 47,
  columns = 12,
  pivot = { 112, 92 },
}