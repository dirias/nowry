# Content-First Pagination Architecture

## Proposal: Separation of Content and Presentation

### Core Principle:
**Content is stored WITHOUT pagination. Pagination is calculated at render time.**

```
Database (MongoDB)
    ↓
[Pure Content - No Pages]
    ↓
Client (Lexical Editor)
    ↓
[Render with Pagination]
```

## Database Schema Change

### Current (Problematic):
```javascript
{
  _id: "book123",
  title: "My Book",
  content: `
    <div class="editor-page">
      <p>Content on page 1</p>
      <img src="..."/>
    </div>
    <div class="editor-page">
      <p>Content on page 2</p>
    </div>
  `
}
```

### Proposed (Clean):
```javascript
{
  _id: "book123",
  title: "My Book",
  
  // Store as Lexical's native JSON format (NO PageNodes)
  content: {
    root: {
      children: [
        {
          type: "paragraph",
          children: [{ type: "text", text: "Content on page 1" }]
        },
        {
          type: "image",
          src: "...",
          width: 600,
          height: 400
        },
        {
          type: "paragraph",
          children: [{ type: "text", text: "Content on page 2" }]
        }
      ]
    }
  },
  
  // Optional: Cache pagination metadata for performance
  pagination_cache: {
    page_size: "a4",
    page_count: 2,
    last_calculated: "2026-01-14T10:30:00Z",
    breaks: [
      { after_node: "paragraph-1", reason: "overflow" },
      { before_node: "paragraph-2", reason: "heading" }
    ]
  }
}
```

## Benefits:

✅ **Clean Storage** - No presentational markup in database
✅ **Flexible Pagination** - Change algorithm without data migration
✅ **Portable Content** - Content works across different page sizes
✅ **Version Control** - Easier to diff and merge changes
✅ **Performance** - Can cache pagination results
✅ **Export Ready** - Clean content for PDF, DOCX, etc. export

## Implementation Changes

### 1. Content Serialization (Save)

```javascript
// OLD - Saves PageNodes
const html = $generateHtmlFromNodes(editor)
// Result: <div class="editor-page">...</div><div class="editor-page">...</div>

// NEW - Save pure content (skip PageNodes)
const json = editor.getEditorState().toJSON()
const filteredJson = {
  root: {
    children: json.root.children.filter(node => node.type !== 'page')
  }
}
// Result: Pure content without pagination
```

### 2. Content Deserialization (Load)

```javascript
// OLD - Load with PageNodes
editor.setEditorState(editor.parseEditorState(htmlString))
// Problem: PageNodes from old pagination

// NEW - Load pure content, pagination happens automatically
const editorState = editor.parseEditorState(jsonString)
editor.setEditorState(editorState)
// PrecisePaginationPlugin automatically wraps in PageNodes
```

### 3. Updated Plugin Approach

```javascript
// PageNode becomes PRESENTATION-ONLY
// Never saved to database
// Always generated fresh on load

export default function PrecisePaginationPlugin() {
  // On editor load:
  // 1. Extract pure content (no PageNodes)
  // 2. Calculate optimal breaks
  // 3. Wrap in PageNodes for display
  // 4. Cache results for performance
}
```

## Migration Strategy

### Phase 1: Backward Compatible
```javascript
// Support both formats during migration
const loadContent = (book) => {
  if (book.content.root) {
    // New format: Pure JSON
    return editor.parseEditorState(JSON.stringify(book.content))
  } else {
    // Old format: HTML with PageNodes
    return parseHTMLContent(book.content)
  }
}

const saveContent = (editorState) => {
  // Always save new format
  const json = editorState.toJSON()
  return {
    root: {
      children: json.root.children.flatMap(node => 
        node.type === 'page' ? node.children : [node]
      )
    }
  }
}
```

### Phase 2: Batch Migration
```javascript
// Script to migrate existing books
async function migrateBooks() {
  const books = await Book.find({ 'content.root': { $exists: false } })
  
  for (const book of books) {
    // Convert HTML to clean JSON
    const cleanContent = stripPageNodes(book.content)
    book.content = cleanContent
    await book.save()
  }
}
```

## Performance Optimizations

### 1. Pagination Cache
```javascript
// Store pagination results to avoid recalculation
{
  pagination_cache: {
    page_size: "a4",
    page_count: 5,
    breaks: [...]  // Where to break pages
  }
}

// Invalidate cache only when:
// - Content changes
// - Page size changes
// - User explicitly re-paginates
```

### 2. Incremental Pagination
```javascript
// Only re-paginate affected pages when editing
// If user types on page 3, only recalculate pages 3-5
// Pages 1-2 remain cached

const smartPaginate = (editedPageIndex) => {
  // Keep pages before edit point
  const untouchedPages = pages.slice(0, editedPageIndex)
  
  // Re-paginate from edit point onwards
  const affectedContent = getContentFromPage(editedPageIndex)
  const newPages = calculatePages(affectedContent)
  
  return [...untouchedPages, ...newPages]
}
```

### 3. Web Worker Pagination
```javascript
// Move heavy pagination to background thread
const paginationWorker = new Worker('pagination-worker.js')

paginationWorker.postMessage({
  content: editorState.toJSON(),
  pageSize: 'a4',
  pageHeight: 1123
})

paginationWorker.onmessage = (e) => {
  const { breaks } = e.data
  applyPageBreaks(breaks)
}
```

## Additional Enhancements

### 1. Smart Page Breaks (User Control)
```javascript
// Allow users to force page breaks
{
  type: "paragraph",
  pageBreakBefore: true,  // Force new page
  keepWithNext: true      // Stick to next element
}
```

### 2. PDF Export Ready
```javascript
// Clean content makes PDF generation easy
const generatePDF = async (book) => {
  const content = book.content  // Pure content
  const pages = calculatePages(content, 'a4')
  
  const pdf = new PDFDocument()
  for (const page of pages) {
    renderPageToPDF(pdf, page)
    pdf.addPage()
  }
}
```

### 3. Real-time Collaboration Ready
```javascript
// Operational Transforms work better with pure content
// No conflicts from PageNode positions

const applyOperation = (op) => {
  // Edit happens on content
  // Pagination recalculates automatically
  // All clients see correct pagination
}
```

## Code Changes Required

### Files to Modify:

1. **PrecisePaginationPlugin.js** (Already done ✅)
   - Already extracts content from PageNodes
   - Just needs to not save PageNodes

2. **Editor.js** (Small change)
   ```javascript
   // Save handler - filter out PageNodes
   const handleSave = () => {
     editor.update(() => {
       const json = editor.getEditorState().toJSON()
       const cleanJson = filterPageNodes(json)
       onSave(cleanJson)
     })
   }
   ```

3. **Backend (Nowry-API/app/models/Book.py)**
   ```python
   class Book(BaseModel):
       content: Union[str, dict]  # Support both formats
       pagination_cache: Optional[dict] = None
   ```

4. **Load handler - parse JSON or HTML**
   ```javascript
   const loadContent = (book) => {
     if (typeof book.content === 'object') {
       // New format
       return JSON.stringify(book.content)
     } else {
       // Old format
       return book.content
     }
   }
   ```

## Recommendation

**Implement Phases:**

1. **Phase 1 (Now)**: Fix the pagination plugin to work with both formats ✅
2. **Phase 2 (Next)**: Change save format to JSON without PageNodes
3. **Phase 3 (Later)**: Migrate existing books
4. **Phase 4 (Future)**: Add pagination cache for performance

This gives you a **professional, scalable architecture** that:
- ✅ Solves all current pagination issues
- ✅ Makes content portable and clean
- ✅ Enables future features (PDF export, collaboration, etc.)
- ✅ Improves performance
- ✅ Maintains backward compatibility during migration

Would you like me to implement Phase 2 now (change the save format)?
