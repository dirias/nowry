import React, { useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { saveBookPage } from '../../api/Books';


const Editor = ({ activePage, content, setContent  }) => {
    const quillRef = useRef();

  const modules = {
    toolbar: [
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        [{ 'header': 1 }, { 'header': 2 }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'font': [] }],
        [{ 'align': [] }],
        ['clean']
      ]
  };

  const handleEditorChange = async (newContent) => {
    if (activePage !== undefined) {
      // Update the content of the active page
      console.log('activePage', activePage)
      const updatedContent = [...content];
      console.log('updatedContent', updatedContent)
      updatedContent[activePage] = newContent;
      console.log('updatedContent[activePage]', updatedContent[activePage])
      await saveBookPage(activePage, newContent);
      setContent(updatedContent);
      // Make sure to pass the correct content format here as well.
       // Assuming this is the right format
    }
  };

  return (
    <div>
      <ReactQuill
        ref={quillRef}
        modules={modules}
        value={content[activePage] || ''} // Provide a default value if content is undefined
        onChange={handleEditorChange}
        placeholder="Start typing here..."
      />
    </div>
  );
};

export default Editor;