#!/bin/bash

# Remove console.log statements from dashboard files

echo "Removing console logs from dashboard.js..."
sed -i '' '/console\.log/d' /Users/developerlogam/Documents/logam-apk/logam-apk/pages/dashboard.js
sed -i '' '/console\.error/d' /Users/developerlogam/Documents/logam-apk/logam-apk/pages/dashboard.js
sed -i '' '/console\.warn/d' /Users/developerlogam/Documents/logam-apk/logam-apk/pages/dashboard.js

echo "Removing console logs from admin.js..."
if [ -f "/Users/developerlogam/Documents/logam-apk/logam-apk/pages/admin.js" ]; then
  sed -i '' '/console\.log/d' /Users/developerlogam/Documents/logam-apk/logam-apk/pages/admin.js
  sed -i '' '/console\.error/d' /Users/developerlogam/Documents/logam-apk/logam-apk/pages/admin.js
  sed -i '' '/console\.warn/d' /Users/developerlogam/Documents/logam-apk/logam-apk/pages/admin.js
fi

echo "✅ Console logs removed!"

