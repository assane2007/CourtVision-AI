import os
import re
import json

SKILLS_DIR = "C:/Users/Mohamed/.gemini/antigravity/skills"
OUTPUT_FILE = "C:/Users/Mohamed/Documents/CourtVision-AI/courtvision-ai/skills_index.json"

def extract_metadata(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    frontmatter_match = re.search(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if not frontmatter_match:
        return None
        
    frontmatter_str = frontmatter_match.group(1)
    metadata = {}
    
    for line in frontmatter_str.split('\n'):
        if ':' in line:
            key, value = line.split(':', 1)
            metadata[key.strip()] = value.strip()
            
    # Extract first paragraph
    body = content[frontmatter_match.end():].strip()
    first_para = body.split('\n\n')[0].strip()
    metadata['short_description'] = first_para[:200]
    
    return metadata

def main():
    index = []
    
    for root, dirs, files in os.walk(SKILLS_DIR):
        if "SKILL.md" in files:
            skill_path = os.path.join(root, "SKILL.md")
            meta = extract_metadata(skill_path)
            if meta:
                meta['path'] = os.path.relpath(skill_path, SKILLS_DIR)
                meta['id'] = os.path.basename(root)
                index.append(meta)
                
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(index, f, indent=2)
        
    print(f"Index built with {len(index)} skills.")

if __name__ == "__main__":
    main()
