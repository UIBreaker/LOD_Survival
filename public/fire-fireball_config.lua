-- PixelFX Studio: cấu hình preset cho sprite sheet, không phải mã chạy pixelfx trong Lua.
return {
  id = "fire/fireball",
  sprite_sheet = "fire-fireball_sheet.png",
  seed = 5,
  flip = false,
  angle = 0, -- độ
  light = 1,
  speed = 1,
  fps = 30,
  frame_width = 136,
  frame_height = 56,
  frames = 36,
  columns = 16,
  pivot = { 112, 28 },
}