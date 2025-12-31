# Developer Bug Dashboard - Implementation Plan

**Status**: 📝 Planning  
**Priority**: Medium  
**Estimated Time**: 3-4 hours  
**Last Updated**: December 30, 2024

---

## Overview

Create a developer-only bug dashboard where devs can:
- View all bug reports from all users
- Filter by status, severity, category
- Change bug status
- View bug details and screenshots
- Access via profile menu (dev-only)

---

## User Role System

### Role Field

Add `role` field to users collection:

```javascript
// users collection
{
  _id: ObjectId,
  email: string,
  username: string,
  role: 'user' | 'beta' | 'dev' | 'admin',  // NEW
  subscription: {...},
  beta_features: {...},
  // ... other fields
}
```

**Role Hierarchy**:
- `user` - Regular user (default)
- `beta` - Beta tester (unlimited features)
- `dev` - Developer (bug dashboard access + beta features)
- `admin` - Full admin access (future)

### Manual Role Assignment

Developers will manually update MongoDB to grant dev access:

```javascript
// MongoDB command to make a user a dev
db.users.updateOne(
  { email: "developer@example.com" },
  { $set: { role: "dev" } }
)
```

---

## Backend Changes

### 1. Update Bug Router

Add dev-only endpoints:

```python
# /Nowry-API/app/routers/bugs.py

@router.get("/all", response_model=List[BugReport])
async def get_all_bugs(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    category: Optional[str] = None,
    current_user=Depends(get_current_user_authorization)
):
    """
    Get all bug reports (Dev only).
    Supports filtering by status, severity, category.
    """
    
    # Check if user is dev
    user_id = current_user.get("user_id")
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    
    if user.get("role") not in ["dev", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Developer access required"
        )
    
    # Build query
    query = {}
    if status:
        query["status"] = status
    if severity:
        query["severity"] = severity
    if category:
        query["category"] = category
    
    bugs = await bugs_collection.find(query).sort("created_at", -1).to_list(500)
    
    # Convert ObjectIds
    for bug in bugs:
        bug["_id"] = str(bug["_id"])
    
    return bugs


@router.patch("/{bug_id}/status", response_model=dict)
async def update_bug_status(
    bug_id: str,
    status_update: BugStatusUpdate,
    current_user=Depends(get_current_user_authorization)
):
    """
    Update bug status (Dev only).
    Allows devs to change status, priority, and add notes.
    """
    
    # Check if user is dev
    user_id = current_user.get("user_id")
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    
    if user.get("role") not in ["dev", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Developer access required"
        )
    
    # Find bug
    try:
        bug = await bugs_collection.find_one({"_id": ObjectId(bug_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid bug ID")
    
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found")
    
    # Update bug
    update_data = {
        "status": status_update.status,
        "updated_at": datetime.utcnow()
    }
    
    if status_update.priority:
        update_data["priority"] = status_update.priority
    
    if status_update.notes:
        update_data["dev_notes"] = status_update.notes
    
    if status_update.status == "resolved":
        update_data["resolved_at"] = datetime.utcnow()
    
    await bugs_collection.update_one(
        {"_id": ObjectId(bug_id)},
        {"$set": update_data}
    )
    
    return {
        "message": "Bug status updated",
        "bug_id": bug_id,
        "status": status_update.status
    }


@router.get("/stats", response_model=dict)
async def get_bug_stats(
    current_user=Depends(get_current_user_authorization)
):
    """
    Get bug statistics (Dev only).
    Returns counts by status, severity.
    """
    
    # Check if user is dev
    user_id = current_user.get("user_id")
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    
    if user.get("role") not in ["dev", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Developer access required"
        )
    
    # Get stats
    total = await bugs_collection.count_documents({})
    open_bugs = await bugs_collection.count_documents({"status": "open"})
    in_progress = await bugs_collection.count_documents({"status": "in-progress"})
    resolved = await bugs_collection.count_documents({"status": "resolved"})
    critical = await bugs_collection.count_documents({"severity": "critical"})
    high = await bugs_collection.count_documents({"severity": "high"})
    
    return {
        "total": total,
        "by_status": {
            "open": open_bugs,
            "in_progress": in_progress,
            "resolved": resolved
        },
        "by_severity": {
            "critical": critical,
            "high": high
        }
    }
```

### 2. Add Status Update Model

```python
# /Nowry-API/app/models/Bug.py

class BugStatusUpdate(BaseModel):
    """Schema for updating bug status"""
    status: str  # open, in-progress, resolved, closed
    priority: Optional[str] = None  # low, medium, high, urgent
    notes: Optional[str] = None  # Dev notes
```

### 3. Helper Function for Role Check

```python
# /Nowry-API/app/config/auth_config.py

async def require_dev_role(current_user: dict):
    """
    Check if user has dev or admin role.
    Raises 403 if not authorized.
    """
    from app.config.database import users_collection
    from bson import ObjectId
    
    user_id = current_user.get("user_id")
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    
    if not user or user.get("role") not in ["dev", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Developer or admin role required"
        )
    
    return user
```

---

## Frontend Implementation

### 1. Update Header Menu

Add "Bug Dashboard" menu item for devs:

```javascript
// /nowry/src/components/HomePage/Header.js

const [userRole, setUserRole] = useState('user')

// Fetch user role on mount
useEffect(() => {
  const fetchUserRole = async () => {
    try {
      const response = await apiClient.get('/user/me')
      setUserRole(response.data.role || 'user')
    } catch (error) {
      console.error('Failed to fetch user role:', error)
    }
  }
  
  if (isLoggedIn) {
    fetchUserRole()
  }
}, [isLoggedIn])

// In user menu dropdown
<MenuList>
  {/* ... existing items */}
  
  {/* Dev-only Bug Dashboard */}
  {(userRole === 'dev' || userRole === 'admin') && (
    <>
      <MenuItem onClick={() => navigate('/bugs/dashboard')} sx={{ borderRadius: 'sm' }}>
        <BugReportIcon fontSize='small' sx={{ mr: 1 }} />
        Bug Dashboard
      </MenuItem>
      <ListDivider />
    </>
  )}
  
  <MenuItem onClick={logout} color='danger'>
    {/* Logout */}
  </MenuItem>
</MenuList>
```

### 2. Create Bug Dashboard Page

**Location**: `/nowry/src/components/Bugs/BugDashboard.js`

```javascript
import React, { useState, useEffect } from 'react'
import { Box, Typography, Sheet, Stack, Select, Option, Chip, Table, Button, Modal } from '@mui/joy'
import { bugsService } from '../../api/services/bugs.service'

export default function BugDashboard() {
  const [bugs, setBugs] = useState([])
  const [stats, setStats] = useState(null)
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    category: ''
  })
  const [selectedBug, setSelectedBug] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchBugs()
    fetchStats()
  }, [filters])
  
  const fetchBugs = async () => {
    try {
      const data = await bugsService.getAllBugs(filters)
      setBugs(data)
    } catch (error) {
      console.error('Failed to fetch bugs:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchStats = async () => {
    try {
      const data = await bugsService.getBugStats()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }
  
  const handleStatusChange = async (bugId, newStatus) => {
    try {
      await bugsService.updateBugStatus(bugId, { status: newStatus })
      fetchBugs() // Refresh
      fetchStats()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }
  
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Typography level='h2' sx={{ mb: 3 }}>
        🐛 Bug Dashboard (Developer)
      </Typography>
      
      {/* Stats Cards */}
      {stats && (
        <Stack direction='row' spacing={2} sx={{ mb: 3 }}>
          <StatCard label='Total Bugs' value={stats.total} color='neutral' />
          <StatCard label='Open' value={stats.by_status.open} color='warning' />
          <StatCard label='In Progress' value={stats.by_status.in_progress} color='primary' />
          <StatCard label='Critical' value={stats.by_severity.critical} color='danger' />
        </Stack>
      )}
      
      {/* Filters */}
      <Stack direction='row' spacing={2} sx={{ mb: 3 }}>
        <Select
          placeholder='Status'
          value={filters.status}
          onChange={(e, value) => setFilters({...filters, status: value})}
        >
          <Option value=''>All Status</Option>
          <Option value='open'>Open</Option>
          <Option value='in-progress'>In Progress</Option>
          <Option value='resolved'>Resolved</Option>
        </Select>
        
        <Select
          placeholder='Severity'
          value={filters.severity}
          onChange={(e, value) => setFilters({...filters, severity: value})}
        >
          <Option value=''>All Severity</Option>
          <Option value='critical'>Critical</Option>
          <Option value='high'>High</Option>
          <Option value='medium'>Medium</Option>
          <Option value='low'>Low</Option>
        </Select>
        
        <Select
          placeholder='Category'
          value={filters.category}
          onChange={(e, value) => setFilters({...filters, category: value})}
        >
          <Option value=''>All Categories</Option>
          <Option value='ui'>UI/Design</Option>
          <Option value='functionality'>Functionality</Option>
          <Option value='performance'>Performance</Option>
          <Option value='other'>Other</Option>
        </Select>
      </Stack>
      
      {/* Bugs Table */}
      <Sheet variant='outlined' sx={{ borderRadius: 'sm', overflow: 'auto' }}>
        <Table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Severity</th>
              <th>Category</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bugs.map(bug => (
              <tr key={bug._id}>
                <td>
                  <Typography 
                    level='body-sm' 
                    sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                    onClick={() => setSelectedBug(bug)}
                  >
                    {bug.title}
                  </Typography>
                </td>
                <td>
                  <Chip size='sm' color={getSeverityColor(bug.severity)}>
                    {bug.severity}
                  </Chip>
                </td>
                <td>{bug.category}</td>
                <td>
                  <Select
                    size='sm'
                    value={bug.status}
                    onChange={(e, value) => handleStatusChange(bug._id, value)}
                  >
                    <Option value='open'>Open</Option>
                    <Option value='in-progress'>In Progress</Option>
                    <Option value='resolved'>Resolved</Option>
                    <Option value='closed'>Closed</Option>
                  </Select>
                </td>
                <td>{new Date(bug.created_at).toLocaleDateString()}</td>
                <td>
                  <Button size='sm' variant='outlined' onClick={() => setSelectedBug(bug)}>
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Sheet>
      
      {/* Bug Detail Modal */}
      <BugDetailModal 
        bug={selectedBug} 
        onClose={() => setSelectedBug(null)}
        onStatusChange={handleStatusChange}
      />
    </Box>
  )
}

// Helper components
function StatCard({ label, value, color }) {
  return (
    <Sheet variant='soft' color={color} sx={{ p: 2, borderRadius: 'sm', flex: 1 }}>
      <Typography level='body-sm'>{label}</Typography>
      <Typography level='h3'>{value}</Typography>
    </Sheet>
  )
}

function getSeverityColor(severity) {
  switch(severity) {
    case 'critical': return 'danger'
    case 'high': return 'warning'
    case 'medium': return 'primary'
    default: return 'neutral'
  }
}
```

### 3. Add API Service Methods

```javascript
// /nowry/src/api/services/bugs.service.js

export const bugsService = {
  // ... existing methods
  
  /**
   * Get all bugs (Dev only)
   */
  getAllBugs: async (filters = {}) => {
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.severity) params.severity = filters.severity
    if (filters.category) params.category = filters.category
    
    const response = await apiClient.get('/bugs/all', { params })
    return response.data
  },
  
  /**
   * Get bug statistics (Dev only)
   */
  getBugStats: async () => {
    const response = await apiClient.get('/bugs/stats')
    return response.data
  },
  
  /**
   * Update bug status (Dev only)
   */
  updateBugStatus: async (bugId, statusData) => {
    const response = await apiClient.patch(`/bugs/${bugId}/status`, statusData)
    return response.data
  }
}
```

### 4. Add Route

```javascript
// /nowry/src/App.js

import BugDashboard from './components/Bugs/BugDashboard'

<Route path='/bugs/dashboard' element={<BugDashboard />} />
```

---

## Database Migration

### Update Existing Users

```javascript
// MongoDB command to set default role for existing users
db.users.updateMany(
  { role: { $exists: false } },
  { $set: { role: "user" } }
)

// Make yourself a dev
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "dev" } }
)
```

---

## Implementation Checklist

### Backend
- [ ] Add `BugStatusUpdate` model
- [ ] Add `require_dev_role` helper function
- [ ] Add `/bugs/all` endpoint (dev-only)
- [ ] Add `/bugs/{id}/status` PATCH endpoint  
- [ ] Add `/bugs/stats` endpoint
- [ ] Test all endpoints with Postman

### Frontend
- [ ] Create `BugDashboard.js` component
- [ ] Create `BugDetailModal.js` component
- [ ] Add dashboard route
- [ ] Update Header to show menu item for devs
- [ ] Add API service methods
- [ ] Test dashboard with dev user

### Database
- [ ] Add `role` field to users collection
- [ ] Update existing users with default role
- [ ] Create dev user for testing

---

## Testing Plan

1. **Role Check**:
   - [ ] Regular user cannot access `/bugs/all`
   - [ ] Dev user can access all endpoints
   - [ ] Menu item only shows for devs

2. **Dashboard**:
   - [ ] Bugs load correctly
   - [ ] Filters work
   - [ ] Stats are accurate
   - [ ] Can change status
   - [ ] Modal shows bug details

3. **Security**:
   - [ ] API returns 403 for non-devs
   - [ ] Cannot bypass role check

---

## Future Enhancements

- Assign bugs to specific devs
- Add comments/discussion thread
- Email notifications on status change
- Export bugs to CSV
- Bug priority system
- Search functionality
- Pagination for large bug lists

---

**Ready to implement?** Let me know and I'll start building! 🚀
