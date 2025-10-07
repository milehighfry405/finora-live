# Browser Testing Guide

## Setup
- **Frontend**: Running at http://localhost:3000 (dev server is live)
- **Backend**: Deployed to https://web-production-77576.up.railway.app

## Test URL
Open in browser: **http://localhost:3000/agent/sfdc-dedup**

## What to Test

### 1. Initial Page Load
- [ ] Page loads without errors
- [ ] Title shows "SFDC Deduplication Agent"
- [ ] "Start Job" button is visible
- [ ] Left column shows "Activity Log (Empty)"
- [ ] Right column shows "Workflow Progress"

### 2. Start a Job
- [ ] Click "Start Job" button
- [ ] Button changes to "Running..."
- [ ] Activity log starts showing messages
- [ ] Phase cards appear one by one in right column

### 3. Watch Phases Progress
Expected phases (should appear in order):
1. **Phase 1: Connect to Salesforce**
   - Message: "Connected to Salesforce..."
   - Status indicator turns green when complete

2. **Phase 2: Extract Contacts**
   - Message: "Found 21 contacts across 1 account owner"
   - Shows sample contact names
   - Has "View Details" button (expandable)

3. **Phase 3: Validate Emails**
   - Message about email validation
   - Has "View Details" button (expandable)

4. **Phase 4: Analyze Duplicates**
   - Message: "Found 1 duplicate pair(s)"
   - Shows example: "Arthur Song vs Arther Soong"
   - Has "View Details" button (expandable)

5. **Awaiting Approval**
   - Status changes to "Awaiting Approval"
   - Approval UI appears below activity log
   - Shows duplicate pair with side-by-side comparison

### 4. Test Expandable Phase Cards
- [ ] Click "View Details" on Phase 2 (Extract Contacts)
  - [ ] Card expands to show full contact list
  - [ ] Shows 10 contacts initially with "Show all 21 contacts" button
  - [ ] Chat input appears at bottom
  - [ ] Click "Show all" to see all 21 contacts

- [ ] Click "View Details" on Phase 3 (Validate Emails)
  - [ ] Shows validation logic explanation
  - [ ] Shows table of email validation results
  - [ ] Green checkmarks for valid emails

- [ ] Click "View Details" on Phase 4 (Analyze Duplicates)
  - [ ] Shows duplicate pair comparison
  - [ ] Contact 1: Arthur Song with full details
  - [ ] Contact 2: Arther Soong with basic details
  - [ ] Shows confidence level (high)
  - [ ] Shows AI reasoning

### 5. Test Chat (Basic Implementation)
- [ ] In expanded phase card, type a question
- [ ] Press Enter or click send
- [ ] Gets keyword-based response (TODO: integrate Claude API)

### 6. Test Approval UI
- [ ] Approval section shows below activity log
- [ ] Shows "Review 1 Duplicate Pair"
- [ ] Side-by-side contact comparison visible
- [ ] "Approve" button present
- [ ] "Reject" button present
- [ ] Can approve/reject (TODO: test this action)

## Known Issues to Verify

1. **LangSmith Errors** ❌ EXPECTED
   - Console will show LangSmith API errors
   - This is expected - we removed the LangSmith UI but the route still exists
   - Safe to ignore

2. **WebSocket Connection**
   - Phases should update in real-time
   - If phases don't appear, check console for WebSocket errors

3. **Phase Expansion**
   - Phase details are fetched lazily (only when you click "View Details")
   - First click may take a moment to load

4. **Activity Log**
   - Should show real-time updates as job progresses
   - Messages should include emojis and conversational text

## Success Criteria

✅ All phases appear progressively
✅ Phase cards are expandable and show real data
✅ Duplicate pair shows with full contact details
✅ Approval UI appears when job pauses
✅ No critical errors in console (LangSmith errors are OK)

## Next Steps After Browser Test

1. Fix any UI bugs discovered
2. Enhance chat to use Claude API instead of keywords
3. Test approval workflow (approve/reject actions)
4. Add loading states and animations
5. Deploy to Vercel for production testing
