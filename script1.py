import base64

def get_base64(filepath):
    with open(filepath, "rb") as f:
        return base64.b64encode(f.read()).decode('utf-8')

bg_music_b64 = get_base64("input_file_0.png") # Wait, let's check file paths or names
