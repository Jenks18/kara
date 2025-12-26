# 🎨 Kara Design System - Component Showcase

## Color Palette

### Primary (Brand Blue)
- Used for: Main actions, links, active states
- Colors: `primary-500` (#0ea5e9) to `primary-700` (#0369a1)

### Dark Green Background
- Main background: `dark-200` (#162519)
- Cards: `dark-100` (#1a2e1f)
- Borders: `gray-800`

### Status Colors
- **Success:** `success-500` (#10b981) - Approved expenses
- **Warning:** `warning-500` (#f59e0b) - Pending items
- **Danger:** `danger-500` (#ef4444) - Rejected/errors

## Typography

### Font Families
- **UI Text:** System fonts (-apple-system, SF Pro Display)
- **Numbers/Currency:** Monospace (SF Mono, Monaco, Consolas)

### Type Scale
```
Display:  40px / 2.5rem  - Hero numbers, large totals
H1:       28px / 1.75rem - Page titles
H2:       24px / 1.5rem  - Section headings
H3:       20px / 1.25rem - Card titles
Body:     16px / 1rem    - Default text
Small:    14px / 0.875rem - Secondary info
Caption:  12px / 0.75rem - Metadata, timestamps
```

## Components

### Button Variants

**Primary Button:**
- Background: `primary-500`
- Hover: `primary-600`
- Shadow: Elevated with color glow
- Use for: Main actions (Scan Receipt, Create Expense)

**Secondary Button:**
- Background: `dark-100`
- Border: `gray-700`
- Use for: Alternative actions (Cancel, View All)

**Danger Button:**
- Background: `danger-500`
- Use for: Destructive actions (Delete, Sign Out)

### Cards

**Expense Card:**
```
┌────────────────────────────────┐
│ 🔥 Shell Westlands    KES 5250│
│    Fuel • Dec 26               │
│    📍 4.05 mi @ KES 0.70/mi    │
└────────────────────────────────┘
```

**Stats Card:**
```
┌────────────────────────────────┐
│ This Month                     │
│ KES 28,476                     │
│ +12% from last month          │
└────────────────────────────────┘
```

### Navigation

**Bottom Navigation:**
- 5 tabs: Inbox, Reports, Create, Workspaces, Account
- Active state: `primary-400` color + bold icon
- Inactive: `gray-400`
- Height: 72px including safe area

**Floating Action Button (FAB):**
- Position: Fixed bottom-right
- Size: 64x64px
- Icon: Camera
- Background: `primary-500` with large shadow
- Above bottom nav (z-index: 50)

## Layout Patterns

### Screen Structure
```
┌─────────────────────────┐
│ Header (sticky)         │ 56-60px
├─────────────────────────┤
│                         │
│ Content (scrollable)    │
│ - padding: 16px         │
│ - max-width: 448px      │
│ - centered              │
│                         │
├─────────────────────────┤
│ Bottom Nav (fixed)      │ 72px
└─────────────────────────┘
```

### Spacing System (4px grid)
- Screen padding: 16px (space-4)
- Card padding: 20-24px (space-5 to space-6)
- Between cards: 12px (space-3)
- Button padding: 16px-24px
- Section gaps: 24-32px

## Interactive States

### Touch Feedback
- **Press:** Scale to 98% (`active:scale-[0.98]`)
- **Hover:** Subtle background change
- **Focus:** Ring outline in primary color
- **Disabled:** 50% opacity, no pointer events

### Transitions
- **Fast:** 150ms - Button presses, icon changes
- **Base:** 200ms - Most interactions
- **Slow:** 300ms - Large movements, page transitions

## Accessibility

### Touch Targets
- Minimum size: 44x44px
- Bottom nav buttons: 48x48px
- FAB: 64x64px

### Color Contrast
- White text on primary-500: ✅ Pass WCAG AA
- Gray-300 on dark-200: ✅ Pass WCAG AA
- All interactive elements have focus indicators

### Screen Reader Support
- All buttons have `aria-label`
- Icons supplemented with text
- Semantic HTML structure

## Animation Guidelines

### Micro-interactions
```css
/* Button press */
.active:scale-[0.98]:active

/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Loading shimmer */
.skeleton - Animated gradient for loading states
```

### When to Animate
- ✅ Page transitions
- ✅ Card entrances
- ✅ Button presses
- ✅ Status changes
- ❌ Don't animate on scroll
- ❌ Keep motion minimal (accessibility)

## Mobile Optimization

### Thumb Zones
```
┌─────────────────────────┐
│ 🔴 Hard to reach        │ < Header, back buttons
│                         │
│ 🟡 Comfortable          │ < Secondary actions
│                         │
│ 🟢 Easy (thumb zone)    │ < Primary actions
│ [Bottom Navigation]     │ < Always reachable
│ [FAB Button]            │
└─────────────────────────┘
```

### Gestures (Future)
- **Swipe left:** Delete expense
- **Pull down:** Refresh list
- **Long press:** Quick actions
- **Pinch:** Zoom receipt image

## Responsive Breakpoints

Primary target: **375px - 428px** (iPhone SE to iPhone 14 Pro Max)

Future web responsive:
- Mobile: < 640px
- Tablet: 768px
- Desktop: 1024px+

## Best Practices

### ✅ Do:
- Use system fonts for performance
- Keep touch targets large (44px+)
- Test on real devices
- Use semantic HTML
- Add loading states
- Provide feedback for actions
- Use consistent spacing

### ❌ Don't:
- Use custom fonts (slower loading)
- Make text too small (< 14px)
- Forget safe area insets
- Animate everything
- Use complex gradients (performance)
- Ignore dark mode contrast

## File Structure

```
components/
├── ui/
│   ├── Button.tsx      - All button variants
│   ├── Card.tsx        - Container cards
│   ├── Badge.tsx       - Status badges
│   ├── CategoryPill.tsx - Filter chips
│   ├── FAB.tsx         - Floating action button
│   └── EmptyState.tsx  - No data states
├── expense/
│   ├── ExpenseCard.tsx - Transaction display
│   └── StatsCard.tsx   - Metric cards
└── navigation/
    ├── BottomNav.tsx   - Main navigation
    └── Header.tsx      - Page headers
```

## Usage Examples

### Creating a new screen:
```tsx
import BottomNav from '@/components/navigation/BottomNav'
import Header from '@/components/navigation/Header'

export default function MyPage() {
  return (
    <div className="min-h-screen pb-20">
      <Header title="My Page" />
      
      <div className="px-4 py-6 max-w-md mx-auto">
        {/* Your content */}
      </div>
      
      <BottomNav />
    </div>
  )
}
```

### Adding a new card:
```tsx
<Card hoverable onClick={handleClick}>
  <div className="flex items-center gap-3">
    <Icon size={24} className="text-primary-400" />
    <div>
      <h3 className="font-semibold text-gray-100">Title</h3>
      <p className="text-sm text-gray-400">Description</p>
    </div>
  </div>
</Card>
```

---

**Design Goals:**
- ⚡ Fast & Responsive
- 👍 Thumb-friendly
- 🎨 Beautiful & Modern
- 📱 Mobile-first
- ♿ Accessible

**Inspired by:** Expensify, Stripe, Notion, Modern fintech apps
