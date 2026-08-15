import re

# Read current article
with open(r"d:\MyWeb\Night Lore\src\content\stories\therac-25-radiation-accidents.md", "r", encoding="utf-8") as f:
    text = f.read()

parts = text.split("## Verification Checklist")
header = parts[0]
checklist = "## Verification Checklist" + parts[1]

frontmatter_and_status = header.split("## The Blind Machine")[0]
body = "## The Blind Machine" + header.split("## The Blind Machine")[1]

words_body = len(body.split())
print("Original Body Words:", words_body)

# Let's adjust body to ~2,100 words (0.68 ratio of 3100 is ~2100)
# We can condense sentences while keeping 100% of factual detail intact.

# Let's check paragraph by paragraph and condense slightly where prose is redundant.
lines = body.split("\n")
new_lines = []

for line in lines:
    new_lines.append(line)

new_body = "\n".join(new_lines)
print("New Body Words:", len(new_body.split()))
