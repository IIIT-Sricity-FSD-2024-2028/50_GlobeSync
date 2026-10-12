import os
import glob

base_dir = r"c:\Users\miste\html\GlobeSync\front-end"
directories = ["admin", "super", "guide", "support"]

link_html = '      <a class="nav-item" data-page="profile" href="profile.html"><span class="nav-icon">👤</span>My Profile</a>\n    </nav>'

for directory in directories:
    dir_path = os.path.join(base_dir, directory)
    for filepath in glob.glob(os.path.join(dir_path, "*.html")):
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        # check if it already has profile
        if 'href="profile.html"' not in content and '</nav>' in content:
            new_content = content.replace('    </nav>', link_html)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Patched: {filepath}")

print("Done patching sidebars.")
