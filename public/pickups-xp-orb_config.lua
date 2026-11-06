-- PixelFX Studio: cấu hình preset cho sprite sheet, không phải mã chạy pixelfx trong Lua.
return {
  id = "pickups/xp-orb",
  sprite_sheet = "pickups-xp-orb_sheet.png",
  seed = 2,
  flip = false,
  angle = 0, -- độ
  light = 1,
  speed = 1,
  fps = 12,
  frame_width = 72,
  frame_height = 56,
  frames = 22,
  columns = 12,
  pivot = { 36, 48 },
}