import React, { useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { saveBookPage } from '../../api/Books';

const Editor = ({ activePage, content, setContent, wordLimit, lineLimit }) => {
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

    const handleEditorChange = async (newContent, _, __, editor) => {
        const quillInstance = quillRef.current.getEditor();
        const innerHTML = quillInstance.root.innerHTML;
            
            // Check word limit and truncate content if necessary
            /*if (wordLimit) {
                const words = updatedContent[activePage].split(/\s+/);
                updatedContent[activePage] = words.slice(0, wordLimit).join(' ');
            }

            // Check line limit and truncate content if necessary
            if (lineLimit) {
                const lines = updatedContent[activePage].split('\n');
                updatedContent[activePage] = lines.slice(0, lineLimit).join('\n');
            }*/

        setContent(innerHTML);
        console.log(innerHTML);

        // Update the editor's content to reflect the changes
        //editor.setText(updatedContent[activePage]);
    };

    return (
        <div>
            <ReactQuill
                ref={quillRef}
                theme='snow'
                modules={modules}
                value={content[activePage] || ''}
                onChange={handleEditorChange}
                placeholder="Start typing here..."
            />
        </div>
    );
};

export default Editor;
