-- PixelFX Studio: cấu hình preset cho sprite sheet, không phải mã chạy pixelfx trong Lua.
return {
  id = "pickups/potion",
  sprite_sheet = "pickups-potion_sheet.png",
  seed = 5,
  flip = false,
  angle = 0, -- độ
  light = 1,
  speed = 1,
  fps = 30,
  frame_width = 56,
  frame_height = 72,
  frames = 72,
  columns = 16,
  pivot = { 28, 64 },
  palette = { "#1e0606", "#ca121b", "#cf1717", "#ea1a1a", "#f21818", "#ffffff", "#ffd2f6", "#ffffff" },
}