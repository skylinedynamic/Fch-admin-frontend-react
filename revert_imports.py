import os
import re

src_dir = r'c:\laragon\www\react-fch\src'

# Regex to revert public/assets back to assets
# Matches: import ... from "../../public/assets/..."
pattern = re.compile(r'(from|import|require)\s+[\'"](.*?)public/assets/(.*?)[\'"]')

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = pattern.sub(r'\1 "\2assets/\3"', content)
            
            if content != new_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Reverted: {filepath}")
