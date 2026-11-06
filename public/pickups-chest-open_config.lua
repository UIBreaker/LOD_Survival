-- PixelFX Studio: cấu hình preset cho sprite sheet, không phải mã chạy pixelfx trong Lua.
return {
  id = "pickups/chest-open",
  sprite_sheet = "pickups-chest-open_sheet.png",
  seed = 3,
  flip = false,
  angle = 0, -- độ
  light = 1,
  speed = 1,
  fps = 30,
  frame_width = 176,
  frame_height = 112,
  frames = 138,
  columns = 16,
  pivot = { 88, 96 },
}