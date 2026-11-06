-- PixelFX Studio: cấu hình preset cho sprite sheet, không phải mã chạy pixelfx trong Lua.
return {
  id = "fire/fire-tornado",
  sprite_sheet = "fire-fire-tornado_sheet.png",
  seed = 4,
  flip = false,
  angle = 0, -- độ
  light = 2.5,
  speed = 1,
  fps = 30,
  frame_width = 120,
  frame_height = 152,
  frames = 60,
  columns = 16,
  pivot = { 60, 136 },
}