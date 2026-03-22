# Let's see if we can search for relative paths in godot 4
import urllib.request
import json
req = urllib.request.Request(
    'https://api.github.com/search/code?q=ext_resource+path+extension:tres',
    headers={'User-Agent': 'Mozilla/5.0'}
)
# We can't easily search github code without auth, but let's just use google_search tool.
