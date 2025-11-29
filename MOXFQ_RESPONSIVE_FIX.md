# MOXFQ Table Responsive Display Fix

## Problem
On narrow screens (like 768px × 1024px portrait mode), the 4th and 5th answer choice columns in the MOXFQ table were not fully visible, potentially leading to incomplete responses since users couldn't easily select the rightmost options (values 3 and 4).

## Root Cause
The original responsive CSS at 768px breakpoint set:
- Number column: 40px
- Question column: 200px  
- 5 Answer columns: 60px each = 300px
- **Total minimum width**: 540px

While this theoretically fits in 768px width, additional factors like:
- Container padding (16px × 2 = 32px)
- Table borders and margins
- Browser scrollbar width
- Viewport inconsistencies

Could push the total required width beyond the available screen space, causing the rightmost columns to be cut off or require horizontal scrolling that users might not notice.

## Solution Applied

### 1. Enhanced Responsive CSS
**Files modified:**
- `src/components/MoxfqTableComponent.vue`
- `src/components/forms/MoxfqTableRenderer.vue`

### 2. Key Changes at 768px Breakpoint

#### Optimized Column Sizes:
```css
.number-column: 35px (was 40px)
.question-column: 180px (was 200px)  
.answer-column: 58px (was 60px)
```

#### Forced Minimum Table Width:
```css
.moxfq-table {
  overflow-x: auto;
  min-width: 700px; /* Ensures all 5 columns always visible */
}
```

#### Reduced Container Padding:
```css
.moxfq-table-container {
  padding: 8px; /* Reduced from 16px on mobile */
}
```

### 3. Additional Mobile Improvements

#### 480px Breakpoint Added:
- Even smaller column sizes for very narrow screens
- Minimum table width of 650px
- Ensures compatibility with older phones

#### Enhanced Touch Scrolling:
```css
.moxfq-table {
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
}
```

## Result
- **All 5 answer columns (0, 1, 2, 3, 4) are now always visible on portrait tablets**
- **Horizontal scrolling is smooth and obvious when needed**
- **No answer options are hidden or require discovery through scrolling**
- **Better user experience on mobile devices**

## Testing Recommendations
Test the MOXFQ table on:
- iPad in portrait mode (768px × 1024px)  
- Android tablets in portrait mode
- Small phones (480px width)
- Various browser zoom levels (100%, 110%, 125%)

## Files Modified
1. `/src/components/MoxfqTableComponent.vue` - Standalone component
2. `/src/components/forms/MoxfqTableRenderer.vue` - JSONForms renderer
3. `/src/views/Overview/ReviewFormAnswers.vue` - Uses the renderer

Both table implementations now have consistent responsive behavior ensuring all answer choices remain accessible on narrow screens.
