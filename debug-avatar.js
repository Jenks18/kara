// Debug script to check avatar state
// Run this in browser console: copy and paste, then press Enter

console.log('=== Avatar Debug Info ===')

// Check localStorage
const storedAvatar = localStorage.getItem('user-avatar')
console.log('1. localStorage avatar:', storedAvatar)
if (storedAvatar) {
  try {
    const parsed = JSON.parse(storedAvatar)
    console.log('   Parsed:', parsed)
  } catch (e) {
    console.error('   ❌ Failed to parse:', e)
  }
} else {
  console.log('   ⚠️ No avatar in localStorage')
}

// Check if avatar context is loaded
console.log('\n2. To check current avatar in React:')
console.log('   Open React DevTools → Components → Search for "AvatarProvider"')
console.log('   Look at the "value" prop → should show current avatar')

// Test instructions
console.log('\n3. To test avatar save:')
console.log('   a) Go to /account/profile')
console.log('   b) Click camera icon on avatar')
console.log('   c) Select a new emoji')
console.log('   d) Click "Save"')
console.log('   e) Run this script again to see if localStorage updated')

console.log('\n4. Clear avatar (reset to default):')
console.log('   localStorage.removeItem("user-avatar")')
console.log('   Then refresh the page')

console.log('\n======================')
