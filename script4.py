# Let's generate base64 strings for:
# 1. Nave (input_file_0.png)
# 2. Meteoro (input_file_1.png)
# 3. Sound laser (roblox-laser-gun.mp3)
# 4. Background music (Space Junkies Game Theme Song  Feel For Music - Ubisoft Music (youtube).mp3)

import base64

def to_b64(filename):
    with open(filename, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')

nave_b64 = to_b64("input_file_0.png")
meteoro_b64 = to_b64("input_file_1.png")
laser_b64 = to_b64("roblox-laser-gun.mp3")
music_b64 = to_b64("Space Junkies Game Theme Song  Feel For Music - Ubisoft Music (youtube).mp3")

print(f"Nave b64 len: {len(nave_b64)}")
print(f"Meteoro b64 len: {len(meteoro_b64)}")
print(f"Laser b64 len: {len(laser_b64)}")
print(f"Music b64 len: {len(music_b64)}")
