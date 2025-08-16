// Quick build fix script
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing build issues...');

// Fix PermissionGuard.tsx - remove duplicate exports
const permissionGuardPath = path.join(__dirname, '../components/PermissionGuard.tsx');
if (fs.existsSync(permissionGuardPath)) {
  let content = fs.readFileSync(permissionGuardPath, 'utf8');
  
  // Remove the bottom export block and keep only the individual exports
  content = content.replace(/\/\/ Export all components and hooks[\s\S]*export \{[\s\S]*?\};/g, '');
  
  fs.writeFileSync(permissionGuardPath, content);
  console.log('✅ Fixed PermissionGuard.tsx');
}

// Fix user-hierarchy-service.ts - remove duplicate exports  
const userHierarchyPath = path.join(__dirname, '../lib/user-hierarchy-service.ts');
if (fs.existsSync(userHierarchyPath)) {
  let content = fs.readFileSync(userHierarchyPath, 'utf8');
  
  // Keep only one export block
  const lines = content.split('\n');
  const exportStartIndex = lines.findIndex(line => line.includes('export {'));
  if (exportStartIndex !== -1) {
    // Remove duplicate export blocks
    let inExportBlock = false;
    let exportBlockCount = 0;
    const filteredLines = lines.filter((line, index) => {
      if (line.includes('export {')) {
        exportBlockCount++;
        if (exportBlockCount > 1) {
          inExportBlock = true;
          return false;
        }
      }
      if (inExportBlock && line.includes('};')) {
        inExportBlock = false;
        return false;
      }
      return !inExportBlock;
    });
    
    content = filteredLines.join('\n');
  }
  
  fs.writeFileSync(userHierarchyPath, content);
  console.log('✅ Fixed user-hierarchy-service.ts');
}

console.log('🎉 Build fixes applied!');
