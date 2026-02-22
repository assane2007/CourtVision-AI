import docx
import sys

doc = docx.Document(r'c:\Users\Mohamed\.gemini\antigravity\playground\spectral-rocket\CourtVision-AI\CourtVision AI Prompt V2.docx')
with open(r'c:\Users\Mohamed\.gemini\antigravity\playground\spectral-rocket\CourtVision-AI\prompt_v2.txt', 'w', encoding='utf-8') as f:
    for p in doc.paragraphs:
        f.write(p.text + '\n')
print("Done!")
