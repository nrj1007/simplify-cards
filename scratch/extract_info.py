import re

filepath = r"C:\Users\manpr\.gemini\antigravity-cli\brain\a2548086-4cc8-4879-9b59-6785f4dc6d58\.system_generated\steps\4973\content.md"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Remove HTML tag noise to make reading easier
text = re.sub(r'<[^>]+>', ' ', content)
text = '\n'.join([line.strip() for line in text.split('\n') if line.strip()])

keywords = ["lounge", "fee", "golf", "reward", "forex", "markup", "utility", "insurance", "exclusion", "spa", "movie"]

print("=== SEARCH RESULTS ===")
for keyword in keywords:
    print(f"\n--- Matches for: {keyword} ---")
    matches = re.finditer(keyword, text, re.IGNORECASE)
    seen_lines = set()
    for m in matches:
        start = max(0, m.start() - 100)
        end = min(len(text), m.end() + 150)
        snippet = text[start:end].replace('\n', ' ')
        print(f"...{snippet}...")
