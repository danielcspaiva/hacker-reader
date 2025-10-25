# Comment Feature - Visual Demo Guide

**Feature**: Post comments on HN stories from the mobile app  
**Status**: ✅ Ready for testing  
**File**: `apps/mobile/app/story/[id].tsx`

---

## What's New

### 1. Comment Button (Top Right Header)

```
┌─────────────────────────────────────────┐
│  Story Title          💬 🔖 ⬆️          │ ← New comment button!
└─────────────────────────────────────────┘
```

- **Icon**: Speech bubble (💬)
- **Shows**: Only for authenticated users
- **Action**: Opens/closes comment input

---

### 2. Comment Input Panel (Bottom of Screen)

```
┌─────────────────────────────────────────┐
│                                         │
│  [Story content and comments above...]  │
│                                         │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Add a comment...                    │ │ ← Multiline input
│ │                                     │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Supports HN markdown (*, code, etc.)    │
│                     [Post Comment] ──────┤ ← HN orange button
└─────────────────────────────────────────┘
```

**Features**:
- Multiline text input (80-120px height)
- 5,000 character limit
- Markdown hint text
- Disabled during posting
- HN orange "Post Comment" button

---

## User Flow

### For Authenticated Users

1. **Open a story**
   ```
   Feed → Tap story → Story detail page opens
   ```

2. **Start commenting**
   ```
   Tap 💬 button → Comment input slides up
   ```

3. **Write comment**
   ```
   Type in input → Use markdown if desired
   ```

4. **Post comment**
   ```
   Tap "Post Comment" → Shows "Posting..." → Success!
   ```

5. **See result**
   ```
   Comment input closes → Story refreshes → Your comment appears!
   ```

### For Unauthenticated Users

- Comment button (💬) not shown
- Everything else works normally
- Can read comments as usual

---

## States

### 1. Normal State (Input Closed)
- Comment button shows speech bubble icon
- No input visible
- Normal scrolling

### 2. Comment Input Open
- Comment button shows X icon (to close)
- Input panel visible at bottom
- Keyboard pushes content up

### 3. Posting State
- Button shows "Posting..."
- Input disabled (can't type)
- Button disabled (can't press)

### 4. Success State
- Alert: "Your comment has been posted!"
- Input closes automatically
- Story data refreshes
- Scroll to see new comment

### 5. Error States

**Session Expired**
```
┌─────────────────────────────┐
│      Session Expired        │
│                             │
│ Please log in again to      │
│ continue                    │
│                             │
│            [OK]             │
└─────────────────────────────┘
```

**Rate Limited**
```
┌─────────────────────────────┐
│        Slow Down            │
│                             │
│ You're performing actions   │
│ too quickly. Please wait    │
│ a moment.                   │
│                             │
│            [OK]             │
└─────────────────────────────┘
```

**Generic Error**
```
┌─────────────────────────────┐
│          Error              │
│                             │
│ Failed to post comment.     │
│ Please try again.           │
│                             │
│            [OK]             │
└─────────────────────────────┘
```

---

## Testing Checklist

### Prerequisites
- [ ] User is logged in (Settings → Login to HN)
- [ ] App is running on device/simulator
- [ ] Internet connection available

### Basic Functionality
- [ ] Comment button (💬) appears in story header
- [ ] Tapping button opens comment input
- [ ] Input accepts text
- [ ] Input supports multiline
- [ ] Tapping X closes input
- [ ] Post button shows correct text
- [ ] Post button disabled when input empty

### Posting Flow
- [ ] Typing enables Post button
- [ ] Tapping Post shows "Posting..."
- [ ] Success alert appears
- [ ] Input closes after success
- [ ] Story refreshes showing new comment
- [ ] New comment visible in list

### Error Handling
- [ ] Invalid session triggers re-login prompt
- [ ] Rate limiting shows appropriate message
- [ ] Network errors show retry message
- [ ] All errors show user-friendly alerts

### UI/UX
- [ ] Keyboard pushes content up (not covered)
- [ ] Input has proper padding
- [ ] Colors work in light mode
- [ ] Colors work in dark mode
- [ ] Button has loading state
- [ ] Input disabled during posting
- [ ] Safe area insets work (iOS notch)
- [ ] Safe area insets work (Android nav bar)

### Edge Cases
- [ ] Posting empty comment shows error
- [ ] Posting whitespace-only comment shows error
- [ ] Very long comment (5,000 chars) works
- [ ] Comment with markdown renders correctly on HN
- [ ] Rapid button presses handled correctly
- [ ] Closing input preserves typed text (if re-opened)

### Cross-Device Testing
- [ ] Works on iPhone (various sizes)
- [ ] Works on iPad
- [ ] Works on Android phone
- [ ] Works on Android tablet

---

## Known Behaviors

### Expected
- ✅ Comment input slides up from bottom
- ✅ Keyboard shows/hides automatically
- ✅ Content scrolls to avoid keyboard
- ✅ Success alert confirms posting
- ✅ Story refreshes to show comment

### By Design (Not Bugs)
- ℹ️ Can only comment on stories (not replies to comments yet)
- ℹ️ Cannot preview markdown before posting
- ℹ️ Cannot edit comments after posting
- ℹ️ Cannot delete comments
- ℹ️ Input clears on successful post (not saved as draft)

---

## Troubleshooting

### "Comment button not showing"
**Solution**: Make sure you're logged in
- Go to Settings tab
- Tap "Login to HN"
- Complete login in WebView
- Return to story

### "Session Expired" error
**Solution**: Log in again
- Alert will appear
- Tap OK
- Go to Settings
- Login again

### "Comment not appearing"
**Solution**: Wait and refresh
- Comments may take a few seconds
- Pull down to refresh story
- Check HN website to confirm posting

### "Keyboard covering input"
**Solution**: Expected behavior being handled
- iOS: Content should push up
- Android: Input should remain visible
- If not working, report as bug

---

## Quick Test Script

### 5-Minute Test

1. **Setup** (30 seconds)
   - Ensure logged in
   - Open any story

2. **Basic Flow** (2 minutes)
   - Tap comment button
   - Type "Test comment"
   - Tap "Post Comment"
   - Verify success alert
   - Verify comment appears

3. **Error Test** (1 minute)
   - Try posting empty comment
   - Verify error message

4. **UI Test** (1.5 minutes)
   - Open/close input multiple times
   - Test with keyboard
   - Test in light/dark mode
   - Check safe areas

✅ **Pass**: All steps work as expected  
❌ **Fail**: Any step shows unexpected behavior

---

## Screenshot Locations

When testing, take screenshots of:

1. **Story header with comment button**
2. **Comment input open**
3. **Posting state (button shows "Posting...")**
4. **Success alert**
5. **Story with new comment visible**
6. **Error alerts** (if encountered)

Save to: `/ignore/testing-screenshots/comment-feature/`

---

## Demo Video Script

### 30-Second Demo

```
[0:00] Show story page with comment button
[0:03] Tap comment button → Input slides up
[0:06] Type example comment
[0:15] Tap "Post Comment" button
[0:18] Show "Posting..." state
[0:20] Success alert appears
[0:23] Input closes, story refreshes
[0:27] Scroll to show new comment
[0:30] End
```

### Recording Tips
- Use iOS Simulator or Android Emulator for clean recording
- Record at 60fps for smooth animations
- Show both light and dark mode
- Include one error scenario

---

## Next Steps After Testing

### If Tests Pass ✅
1. Create demo video
2. Add to release notes
3. Update user documentation
4. Mark feature as complete
5. Move to next feature (comment replies?)

### If Tests Fail ❌
1. Document exact failure scenario
2. Note device/OS version
3. Check console logs
4. Report issue with screenshots
5. Fix and retest

---

## Feature Completion

**Phase 2.3 Status**: ✅ Complete

From the improved plan:
- ✅ Comment form to story detail page
- ✅ React Query mutation for posting
- ✅ Error handling (session expiration, rate limiting)
- ✅ Success feedback
- ✅ Story data refresh

**Ready for**: Manual QA → Beta testing → Production release

---

**Last Updated**: 2025-10-25  
**Tested By**: [Your name]  
**Test Date**: [Date]  
**Result**: [ ] Pass / [ ] Fail  
**Notes**: _____________________

