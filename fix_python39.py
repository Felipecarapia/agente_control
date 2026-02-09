import os
import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original_content = content
    
    # Regex to find "Type | None" in type hints
    # Matches ": Type | None" or "-> Type | None"
    # To handle "list[dict[str, Any]]", we need to be more permissive with the type group
    # We match anything that isn't a pipe or newline, until we hit " | None"
    pattern_optional = re.compile(r'(\:\s*|->\s*|response_model=)([^|\n]+?)\s*\|\s*None')
    content = pattern_optional.sub(r'\1Optional[\2]', content)
    
    # None | Simple case (less common but possible)
    pattern_optional_reverse = re.compile(r'(\:\s*|->\s*)None\s*\|\s*([\w\d\[\].]+)')
    content = pattern_optional_reverse.sub(r'\1Optional[\2]', content)

    # General Union case: Type A | Type B
    # This is harder to do safely with regex without parsing, but we can try for simple cases
    # We'll skip this for now to avoid breaking things, focusing on | None which is 90% of issues
    pattern_union = re.compile(r'(\:\s*|->\s*)([\w\d\[\].]+)\s*\|\s*([\w\d\[\].]+)')
    content = pattern_union.sub(r'\1Union[\2, \3]', content)

    if content != original_content:
        # Check imports
        has_optional = "Optional" in content
        has_union = "Union" in content
        
        lines = content.splitlines()
        import_line_index = -1
        typing_import_index = -1
        
        for i, line in enumerate(lines):
            if line.startswith("from typing import"):
                typing_import_index = i
                break
            if line.startswith("import ") or line.startswith("from "):
                if import_line_index == -1:
                    import_line_index = i
        
        if typing_import_index != -1:
            # Modify existing typing import
            current_import = lines[typing_import_index]
            if has_optional and "Optional" not in current_import:
                lines[typing_import_index] = current_import + ", Optional"
            if has_union and "Union" not in lines[typing_import_index]: # Refetch line in case we modified it
                lines[typing_import_index] = lines[typing_import_index] + ", Union"
        else:
            # Add new typing import
            imports_to_add = []
            if has_optional: imports_to_add.append("Optional")
            if has_union: imports_to_add.append("Union")
            
            if imports_to_add:
                new_import = f"from typing import {', '.join(imports_to_add)}"
                if import_line_index != -1:
                    lines.insert(import_line_index, new_import)
                else:
                    lines.insert(0, new_import)
        
        with open(filepath, 'w') as f:
            f.write("\n".join(lines) + "\n")
        print(f"Fixed {filepath}")
        return True
    return False

def main():
    base_dir = "backend/app"
    count = 0
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith(".py"):
                if fix_file(os.path.join(root, file)):
                    count += 1
    print(f"Fixed {count} files")

if __name__ == "__main__":
    main()
