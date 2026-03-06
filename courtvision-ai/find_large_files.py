import subprocess
import os

print("Scanning Git for large blobs (>= 50MB)...")

# Get list of all objects inside commits that are not pushed
out = subprocess.check_output(['git', 'rev-list', '--objects', '--branches', '--not', '--remotes']).decode('utf-8', 'ignore')

lines = out.splitlines()
object_map = {}
for line in lines:
    if ' ' in line:
        blob, path = line.split(' ', 1)
        object_map[blob] = path

blobs = list(object_map.keys())
print(f"Found {len(blobs)} objects. Fetching sizes...")

p = subprocess.Popen(['git', 'cat-file', '--batch-check=%(objecttype) %(objectname) %(objectsize) %(rest)'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
out, err = p.communicate('\n'.join(blobs).encode())
res = out.decode('utf-8', 'ignore').splitlines()

large_files = []
for r in res:
    if r.startswith('blob'):
        parts = r.split()
        if len(parts) >= 3:
            size_bytes = int(parts[2])
            size_mb = size_bytes / (1024*1024)
            if size_mb >= 50:
                blob_hash = parts[1]
                path = object_map.get(blob_hash, 'Unknown')
                large_files.append((size_mb, path))

large_files.sort(reverse=True)
for size, path in large_files[:10]:
    print(f"{size:.2f} MB: {path}")
