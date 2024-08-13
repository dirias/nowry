import React, { useState } from 'react';
import { SketchPicker } from 'react-color';

const BookEditor = ({
  initialTitle = '',
  initialAuthor = '',
  initialCreatedAt = new Date(),
  initialUpdatedAt = new Date(),
  initialPages = [],
  initialPageLimit = 50,
  initialTags = [],
  initialSummary = '',
  initialCoverImage = '',
  initialCoverColor = '',
  onSave,
  onCancel,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [author] = useState(initialAuthor);
  const [createdAt] = useState(initialCreatedAt);
  const [updatedAt] = useState(initialUpdatedAt);
  const [pages] = useState(initialPages.length);
  const [pageLimit] = useState(initialPageLimit);
  const [coverImage, setCoverImage] = useState(initialCoverImage);
  const [coverColor, setCoverColor] = useState(initialCoverColor);
  const [summary, setSummary] = useState(initialSummary);
  const [tags, setTags] = useState(initialTags);
  const [displayColorPicker, setDisplayColorPicker] = useState(false);
  const [newTag, setNewTag] = useState('');

  const handleSave = () => {
    const updatedData = {
      title,
      coverImage,
      coverColor,
      summary,
      tags,
    };
    onSave(updatedData);
  };

  const handleAddTag = () => {
    if (newTag.trim() !== '') {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (index) => {
    const updatedTags = tags.filter((_, i) => i !== index);
    setTags(updatedTags);
  };

  return (
    <div className="backdrop">
      <div className="modal-window">
        <div className="modal-header">
          <h3 className="modal-title">Book Details</h3>
          <div className="tags-group display-row">
            <label>Tags</label>
            <div className="tags-input">
              {tags.map((tag, index) => (
                <div className="tag-item" key={index}>
                  {tag}
                  <span
                    className="tag-close"
                    onClick={() => handleRemoveTag(index)}
                  >
                    &times;
                  </span>
                </div>
              ))}
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add a tag and press Enter"
              />
            </div>
          </div>
          <button className="close-button" onClick={onCancel}>
            X
          </button>
        </div>
        <div className="modal-content">
        <div className="form-group">
            
          <div className="title-group">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="cover-image-group">
            <label>Cover Image URL</label>
            <input
              type="text"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
            />
          </div>
          </div>

          
          <div className="form-group">
          <div className="cover-color-group">
            <label>Cover Color</label>
            <div
              className="color-swatch"
              style={{ backgroundColor: coverColor || '#fff' }}
              onClick={() => setDisplayColorPicker(!displayColorPicker)}
            />
            {displayColorPicker && (
              <div className="popover">
                <div
                  className="cover"
                  onClick={() => setDisplayColorPicker(false)}
                />
                <SketchPicker
                  color={coverColor}
                  onChangeComplete={(color) => setCoverColor(color.hex)}
                />
              </div>
            )}
            </div>
          
          <div className="display-column">
          <div className="page-limit-group">
            <label>Page Limit</label>
            <input type="text" value={pageLimit} readOnly />
          </div>

          <div className="pages-group">
            <label>Number of Pages</label>
            <input type="text" value={pages} readOnly />
          </div>
          </div>
          <div className="summary-group">
            <label>Summary</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>
          </div>
          
          <div className="button-group">
          <p><i>Book created at {createdAt.toLocaleDateString()}, last updated done at {updatedAt.toLocaleDateString()}.</i> </p>
            <button className="cancel-button" onClick={onCancel}>
              Cancel
            </button>
            <button className="save-button" onClick={handleSave}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookEditor;
