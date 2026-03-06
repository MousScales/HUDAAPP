const fs = require('fs').promises;
const path = require('path');

async function fixLessonJSON() {
  try {
    console.log('🔧 Fixing malformed JSON files...');
    
    const lessonsDir = path.join(__dirname, '../lessons');
    const files = await fs.readdir(lessonsDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    let fixedCount = 0;
    
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(lessonsDir, file);
        let content = await fs.readFile(filePath, 'utf8');
        
        // Remove any control characters that cause JSON parsing issues
        const originalContent = content;
        content = content.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        
        // Fix common JSON issues
        content = content.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
        content = content.replace(/([{\[,]\s*)(\w+)(\s*:)/g, '$1"$2"$3'); // Quote unquoted keys
        
        // Try to parse to validate
        const parsed = JSON.parse(content);
        
        // If content was changed, write it back
        if (content !== originalContent) {
          await fs.writeFile(filePath, JSON.stringify(parsed, null, 2));
          console.log(`✓ Fixed ${file}`);
          fixedCount++;
        }
        
      } catch (error) {
        console.warn(`⚠️  Could not auto-fix ${file}: ${error.message}`);
        console.log(`   Manual review needed for: ${file}`);
      }
    }
    
    console.log(`\n✅ Fixed ${fixedCount} JSON files`);
    console.log(`📁 Total lesson files: ${jsonFiles.length}`);
    
  } catch (error) {
    console.error('❌ Error fixing JSON files:', error);
  }
}

// Run the fix
fixLessonJSON(); 