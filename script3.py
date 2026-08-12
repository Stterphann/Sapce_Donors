# Let's inspect which image is which
# input_file_0.png, input_file_1.png, Nave.gif, image_134a3e.png, Space Junkies...
for name in ['input_file_0.png', 'input_file_1.png', 'Nave.gif', 'image_134a3e.png']:
    if os.path.exists(name):
        print(name, os.path.getsize(name))
