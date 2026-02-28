import os
import re
import sys
import json

SKILLS_DIR = "C:/Users/Mohamed/.gemini/antigravity/skills"

required_fields = ["name", "description"]
optional_fields = ["tags", "author", "version", "difficulty"]

def validate_skill(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    frontmatter_match = re.search(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if not frontmatter_match:
        return False, "Missing frontmatter"
        
    frontmatter_str = frontmatter_match.group(1)
    results = {}
    
    errors = []
    warnings = []
    
    for field in required_fields:
        if not re.search(rf'^{field}:', frontmatter_str, re.MULTILINE):
            errors.append(f"Missing required field: {field}")
            
    for field in optional_fields:
        if not re.search(rf'^{field}:', frontmatter_str, re.MULTILINE):
            warnings.append(f"Missing optional field: {field}")
            
    return len(errors) == 0, {"errors": errors, "warnings": warnings}

def main():
    all_skills = []
    report = {"errors": 0, "warnings": 0, "skill_count": 0, "details": {}}
    
    for root, dirs, files in os.walk(SKILLS_DIR):
        if "SKILL.md" in files:
            skill_path = os.path.join(root, "SKILL.md")
            skill_name = os.path.basename(root)
            report["skill_count"] += 1
            
            is_valid, detail = validate_skill(skill_path)
            if not is_valid:
                report["errors"] += len(detail["errors"])
                report["details"][skill_name] = detail
            
            report["warnings"] += len(detail["warnings"])
            
    print(json.dumps(report, indent=2))
    
    if report["errors"] > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
