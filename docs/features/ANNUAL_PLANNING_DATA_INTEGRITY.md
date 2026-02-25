# Annual Planning - Data Integrity & Focus Area Management

## Overview
The Annual Planning system enforces strict data integrity rules to prevent orphaned records and ensure consistency.

---

## Focus Areas: Fixed Count Architecture

### Core Rules
1. **Exactly 3 Focus Areas:** Users MUST always have exactly 3 focus areas
2. **Modification, Not Deletion:** Focus areas should be modified/renamed, NOT deleted
3. **ID-Based References:** All related data (goals, priorities, milestones) reference focus areas by `_id`

### Why This Matters

#### Data Relationships
```
AnnualPlan
└── FocusArea (exactly 3)
    ├── Goals (0 to many)
    │   └── Milestones (nested array in goal)
    └── Priorities (0 to many)
```

#### What Happens When You...

**✅ MODIFY a Focus Area** (Name, Icon, Color, Description):
- **Goals:** Remain linked, automatically show new name/icon/color
- **Priorities:** Remain linked, automatically show new name/icon/color
- **Milestones:** Stay nested in goals, unaffected
- **Result:** ✅ All data stays intact and updated

**❌ DELETE a Focus Area:**
- **Goals:** Orphaned! `focus_area_id` points to non-existent area
- **Priorities:** Orphaned! `focus_area_id` points to non-existent area
- **Milestones:** Orphaned with their parent goals
- **Result:** ❌ Data corruption, broken references, UI errors

---

## Implementation

### Frontend: `FocusAreaSetup.js`

#### Key Features:
```javascript
const REQUIRED_AREAS_COUNT = 3

// On load:
- Fetches existing focus areas
- If found: Loads them for editing (Edit Mode)
- If missing slots: Fills with empty templates to reach 3
- If more than 3: Slices to exactly 3

// On save:
- Updates existing areas (if they have _id)
- Creates new areas (if no _id)
- Always saves exactly 3 areas
```

#### Behavior:
- **First Time:** User creates 3 brand new focus areas
- **Edit Plan:** User modifies existing 3 focus areas (names, icons, colors, descriptions)
- **Always:** Exactly 3 focus areas maintained

### Backend: `annual_planning.py`

#### DELETE Endpoint Protection:
```python
@router.delete("/focus-areas/{id}")
async def delete_focus_area(id: str, current_user: dict):
    # Check for related data
    goals_count = await goals_collection.count_documents({"focus_area_id": id})
    priorities_count = await priorities_collection.count_documents({"focus_area_id": id})
    
    # Block deletion if data exists
    if goals_count > 0 or priorities_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete focus area. It has {goals_count} goal(s) and {priorities_count} priority(ies). Please reassign or delete them first."
        )
    
    await focus_areas_collection.delete_one({"_id": ObjectId(id)})
    return {"message": "Focus area deleted"}
```

---

## User Workflow

### Creating Initial Plan
1. User clicks "Edit Plan" button
2. Wizard shows 3 empty slots
3. User fills in all 3 focus areas
4. Clicks "Finalize Plan"
5. ✅ 3 focus areas created

### Editing Existing Plan
1. User clicks "Edit Plan" button
2. Wizard loads existing 3 focus areas
3. User modifies names, icons, colors, descriptions
4. Clicks "Save Changes"
5. ✅ 3 focus areas updated (same IDs, new data)

### What Happens to Related Data
- **Goals:** Keep working, show updated focus area info
- **Priorities:** Keep working, show updated focus area info
- **Milestones:** Keep working (nested in goals)
- **Progress Calculations:** Recalculate based on updated area ID (still valid)

---

## Edge Cases Handled

### More Than 3 Areas Somehow Exist
```javascript
const loadedAreas = existingAreas.slice(0, REQUIRED_AREAS_COUNT)
```
→ Only first 3 are loaded

### Less Than 3 Areas Exist
```javascript
while (loadedAreas.length < REQUIRED_AREAS_COUNT) {
  loadedAreas.push({ name: '', description: '', icon: ICONS[index], color: COLORS[index] })
}
```
→ Empty slots are filled

### User Tries to Delete an Area with Goals
```
Backend returns 400 error:
"Cannot delete focus area. It has 5 goal(s) and 2 priority(ies)..."
```
→ Deletion blocked

---

## Best Practices

### ✅ DO:
- Modify existing focus areas when user wants to "change" them
- Keep the 3-area structure at all times
- Use descriptive names, icons, and colors for clarity
- Update focus area info as life priorities change

### ❌ DON'T:
- Delete and recreate focus areas
- Allow users to have < 3 or > 3 focus areas
- Implement cascade delete without careful consideration
- Allow orphaned goals/priorities

---

## Future Considerations

If you ever need to support variable numbers of focus areas:

1. **Add Reassignment Flow:**
   ```
   Before delete:
   - List all goals/priorities for this area
   - Ask user to reassign them to another area
   - Update all focus_area_id references
   - Then delete area
   ```

2. **Implement Cascade Delete:**
   ```python
   - Delete all goals for area
   - Delete all priorities for area
   - Then delete area
   - Recalculate plan metrics
   ```

3. **Add Archive Instead:**
   ```python
   # Don't delete, just archive
   area.archived = True
   area.archived_at = datetime.now()
   ```

For now, the **3-fixed-areas + modification-only** approach is the safest and simplest solution.
