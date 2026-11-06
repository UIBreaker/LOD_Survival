-- PixelFX Studio: cấu hình preset cho sprite sheet, không phải mã chạy pixelfx trong Lua.
return {
  id = "status/burning",
  sprite_sheet = "status-burning_sheet.png",
  seed = 3,
  flip = false,
  angle = 0, -- độ
  light = 2.5,
  speed = 1,
  fps = 12,
  frame_width = 72,
  frame_height = 80,
  frames = 15,
  columns = 12,
  pivot = { 36, 70 },
}