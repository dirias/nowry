# Quick Reference: Using DeleteConfirmationModal

## Basic Usage

```jsx
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal'

function MyComponent() {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    // Your delete logic here
    setLoading(false)
    setShowDeleteModal(false)
  }

  return (
    <>
      <Button onClick={() => setShowDeleteModal(true)}>
        Delete Something
      </Button>

      <DeleteConfirmationModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Item"
        description="Are you sure you want to delete this item?"
        confirmText="Delete Item"
        loading={loading}
        consequences={[
          { text: "All related data will be deleted" },
          { text: "This action affects X items" }
        ]}
      />
    </>
  )
}
```

## With Custom Icons

```jsx
import BookIcon from '@mui/icons-material/BookRounded'
import StyleIcon from '@mui/icons-material/StyleRounded'

<DeleteConfirmationModal
  // ... other props
  consequences={[
    {
      text: "All books will be deleted",
      icon: <BookIcon fontSize="small" />
    },
    {
      text: "All cards will be deleted",
      icon: <StyleIcon fontSize="small" />
    }
  ]}
/>
```

## Warning Variant

For less critical deletions:

```jsx
<DeleteConfirmationModal
  variant="warning"  // Instead of 'danger'
  // ... other props
/>
```

## Dynamic Content

```jsx
const [itemToDelete, setItemToDelete] = useState(null)

<DeleteConfirmationModal
  open={!!itemToDelete}
  onClose={() => setItemToDelete(null)}
  title="Delete Deck"
  description={`Are you sure you want to delete "${itemToDelete?.name}"?`}
  consequences={[
    {
      text: `All ${itemToDelete?.cardCount || 0} cards will be deleted`
    }
  ]}
/>
```

## Translation Keys Required

Add to your `translation.json`:

```json
{
  "myFeature": {
    "deleteModal": {
      "title": "Delete Item",
      "description": "Are you sure?",
      "confirm": "Delete",
      "consequence1": "First consequence",
      "consequence2": "Second consequence"
    }
  }
}
```

Then use with i18n:

```jsx
const { t } = useTranslation()

<DeleteConfirmationModal
  title={t('myFeature.deleteModal.title')}
  description={t('myFeature.deleteModal.description')}
  confirmText={t('myFeature.deleteModal.confirm')}
  consequences={[
    { text: t('myFeature.deleteModal.consequence1') },
    { text: t('myFeature.deleteModal.consequence2') }
  ]}
/>
```

## Props Reference

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `open` | boolean | ✅ | - | Modal open state |
| `onClose` | function | ✅ | - | Close handler |
| `onConfirm` | function | ✅ | - | Confirm handler |
| `title` | string | ✅ | - | Modal title |
| `description` | string | ✅ | - | Warning description |
| `consequences` | array | ❌ | [] | List of consequences |
| `confirmText` | string | ❌ | 'Delete' | Confirm button text |
| `loading` | boolean | ❌ | false | Loading state |
| `variant` | 'danger' \| 'warning' | ❌ | 'danger' | Color scheme |

## Consequences Object

```typescript
{
  text: string,      // Required: Consequence text
  icon?: ReactNode   // Optional: Custom icon
}
```

## Complete Example (Focus Area Deletion)

```jsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal'
import FlagIcon from '@mui/icons-material/FlagRounded'
import TargetIcon from '@mui/icons-material/TrackChangesRounded'

function FocusAreaCard({ focusArea, onDelete }) {
  const { t } = useTranslation()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleDelete = async () => {
    try {
      setDeleteLoading(true)
      await focusAreasService.delete(focusArea.id)
      onDelete?.()
      setShowDeleteModal(false)
    } catch (error) {
      alert(error.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <>
      <Card>
        {/* ... card content ... */}
        <Button onClick={() => setShowDeleteModal(true)}>
          Delete
        </Button>
      </Card>

      <DeleteConfirmationModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title={t('planning.deleteModal.title')}
        description={t('planning.deleteModal.description', { 
          name: focusArea.name 
        })}
        confirmText={t('planning.deleteModal.confirm')}
        loading={deleteLoading}
        consequences={[
          {
            text: t('planning.deleteModal.consequence1', { 
              count: focusArea.goalCount 
            }),
            icon: <TargetIcon fontSize="small" />
          },
          {
            text: t('planning.deleteModal.consequence2', { 
              count: focusArea.priorityCount 
            }),
            icon: <FlagIcon fontSize="small" />
          }
        ]}
      />
    </>
  )
}
```

## Best Practices

1. **Always use i18n** - No hardcoded text
2. **Show consequences** - Help users understand impact
3. **Use custom icons** - Make it visually clear
4. **Handle loading** - Show progress during deletion
5. **Handle errors** - Display error messages
6. **Clean state** - Reset modal state after action
7. **Confirm destructive** - Use 'danger' variant for permanent actions
8. **Dynamic content** - Show specific item details (names, counts)

## Common Patterns

### Delete with Count
```jsx
consequences={[
  { text: `All ${count} items will be deleted` }
]}
```

### Conditional Consequences
```jsx
consequences={[
  { text: "Primary consequence" },
  item.isPublic && { text: "Will be unpublished" }
].filter(Boolean)}
```

### Multiple Items
```jsx
const items = [item1, item2, item3]
consequences={items.map(item => ({
  text: `Delete ${item.name}`,
  icon: <DeleteIcon fontSize="small" />
}))}
```
