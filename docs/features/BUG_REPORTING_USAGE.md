# Bug Reporting System - Usage Guide

## For Beta Testers

### How to Report a Bug

1. **Click the Bug Icon** 🐛
   - Look for the orange bug report button in the top navigation bar
   - It's located between the "Books" link and the theme toggle

2. **Fill Out the Form**
   - **Title*** (required): Brief description of the issue
   - **Description*** (required): Detailed explanation
   - **Steps to Reproduce**: How to recreate the bug (optional but helpful)
   - **Expected Behavior**: What should happen
   - **Actual Behavior**: What actually happened
   - **Severity**: How critical is this bug?
     - Low: Minor inconvenience
     - Medium: Noticeable issue
     - High: Major problem
     - Critical: App unusable
   - **Category**: What type of bug is it?
     - UI/Design
     - Functionality
     - Performance
     - Other

3. **Add Screenshots** (Optional)
   - Upload up to 3 screenshots
   - Images will be automatically compressed
   - Supported formats: PNG, JPG, GIF

4. **Submit**
   - Click "Submit Bug Report"
   - You'll see a success message
   - Your report is now saved!

### Tips for Good Bug Reports

✅ **Good Example:**
```
Title: Editor crashes when pasting large content

Description: When I paste content larger than 10 pages into the editor, 
the app freezes for about 5 seconds and then crashes completely.

Steps to Reproduce:
1. Open any book in the editor
2. Copy a large document (10+ pages)
3. Paste into the editor
4. Wait a few seconds
5. App crashes

Expected: Content should paste smoothly
Actual: Editor freezes and crashes

Severity: High
Category: Functionality
```

❌ **Bad Example:**
```
Title: Bug

Description: Doesn't work

Severity: Low
```

### Viewing Your Bug Reports

Currently, you can't view your submitted bug reports in the app, but they're safely stored in our database. Our team reviews all reports regularly.

Future updates will include:
- View all your bug reports
- Track status (Open, In Progress, Resolved)
- Get notifications when bugs are fixed

---

## For Developers

### API Endpoints

```javascript
// Submit a bug report
POST /api/bugs
Body: {
  title: string (required)
  description: string (required)
  steps_to_reproduce: string
  expected_behavior: string
  actual_behavior: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'ui' | 'functionality' | 'performance' | 'other'
  url: string
  browser_info: {
    name: string
    version: string
    os: string
    screen_resolution: string
  }
  screenshots: Array<{
    filename: string
    data: string (base64)
  }>
}

// Get current user's bug reports
GET /api/bugs/my-reports

// Get specific bug by ID
GET /api/bugs/{bug_id}

// Delete a bug report
DELETE /api/bugs/{bug_id}
```

### Database Schema

```javascript
// bugs collection
{
  _id: ObjectId,
  user_id: string,
  title: string,
  description: string,
  steps_to_reproduce: string,
  expected_behavior: string,
  actual_behavior: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  category: 'ui' | 'functionality' | 'performance' | 'other',
  url: string,
  browser_info: {
    name: string,
    version: string,
    os: string,
    screen_resolution: string
  },
  screenshots: [{
    filename: string,
    data: string (base64),
    uploaded_at: Date
  }],
  status: 'open' | 'in-progress' | 'resolved' | 'closed',
  priority: string,
  tags: [string],
  created_at: Date,
  updated_at: Date,
  resolved_at: Date
}
```

### Component Usage

```javascript
import BugReportModal from '../Bugs/BugReportModal'
import { bugsService } from '../../api/services/bugs.service'

const [bugReportOpen, setBugReportOpen] = useState(false)

const handleBugSubmit = async (bugData) => {
  try {
    const response = await bugsService.submitBug(bugData)
    console.log('Bug submitted:', response)
  } catch (error) {
    console.error('Failed to submit bug:', error)
  }
}

<BugReportModal
  open={bugReportOpen}
  onClose={() => setBugReportOpen(false)}
  onSubmit={handleBugSubmit}
/>
```

### Image Compression

Screenshots are automatically compressed before submission:
- Max dimensions: 1200x800px
- Format: JPEG with quality adjustment
- Target size: < 500KB per image
- Max 3 images per report

### Future Enhancements

#### Phase 2 (Admin Dashboard)
- [ ] Admin page to view all bugs
- [ ] Filter by status, severity, category
- [ ] Assign bugs to developers
- [ ] Add admin notes
- [ ] Change bug status
- [ ] Export bugs to CSV

#### Phase 3 (Advanced Features)
- [ ] Auto-capture console errors
- [ ] Screen recording capability
- [ ] Duplicate bug detection
- [ ] Email notifications
- [ ] Public bug tracker (optional)
- [ ] Bug upvoting system
- [ ] GitHub Issues integration

---

## Monitoring

### Database Indexes

Create these indexes for better performance:

```javascript
db.bugs.createIndex({ user_id: 1, created_at: -1 })
db.bugs.createIndex({ status: 1 })
db.bugs.createIndex({ severity: 1 })
db.bugs.createIndex({ category: 1 })
db.bugs.createIndex({ created_at: -1 })
```

### Querying Bugs

```python
# Get all open bugs
bugs = await db.bugs.find({"status": "open"}).sort("created_at", -1).to_list(100)

# Get critical bugs
critical = await db.bugs.find({"severity": "critical"}).to_list(100)

# Get bugs from last 7 days
from datetime import datetime, timedelta
week_ago = datetime.utcnow() - timedelta(days=7)
recent = await db.bugs.find({"created_at": {"$gte": week_ago}}).to_list(100)

# Count bugs by status
pipeline = [
  {"$group": {"_id": "$status", "count": {"$sum": 1}}}
]
stats = await db.bugs.aggregate(pipeline).to_list(100)
```

---

## Testing

### Manual Testing Checklist

- [ ] Click bug report button in header
- [ ] Modal opens correctly
- [ ] Fill out required fields (title, description)
- [ ] Upload 1 screenshot (should work)
- [ ] Upload 3 screenshots (should work)
- [ ] Try uploading 4th screenshot (should be blocked)
- [ ] Submit form
- [ ] See success message
- [ ] Check MongoDB for new bug document
- [ ] Verify screenshot data is base64
- [ ] Test with invalid image file
- [ ] Test form validation (empty required fields)
- [ ] Test on different browsers
- [ ] Test on mobile devices

### API Testing

```bash
# Test bug submission (with auth token)
curl -X POST http://localhost:8000/bugs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Bug",
    "description": "This is a test",
    "url": "/books",
    "browser_info": {
      "name": "Chrome",
      "version": "120.0",
      "os": "macOS",
      "screen_resolution": "1920x1080"
    },
    "screenshots": []
  }'

# Get my bug reports
curl -X GET http://localhost:8000/bugs/my-reports \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Troubleshooting

### Modal doesn't open
- Check console for errors
- Verify BugReportModal component is imported
- Check that bug report button has onClick handler

### Form submission fails
- Verify backend is running
- Check auth token is valid
- Look at browser network tab for error details
- Check backend logs

### Screenshots not uploading
- Verify file is an image (PNG, JPG, GIF)
- Check file size (too large files may cause issues)
- Look at console for compression errors
- Try a smaller image

### Database errors
- Verify MongoDB is running
- Check connection string in .env
- Ensure bugs collection exists
- Check user has valid user_id

---

**Last Updated**: December 30, 2024  
**Status**: ✅ Implemented and Ready for Testing
