import React, { useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

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
        console.log('activePage', activePage)
        const innerHTML = quillInstance.root.innerHTML;
        activePage.content = innerHTML;
        setContent(innerHTML);
        console.log(innerHTML);

    };

    return (
        <div>
            <ReactQuill
                ref={quillRef}
                theme='snow'
                modules={modules}
                value={content}
                onChange={handleEditorChange}
                placeholder="Start typing here..."
            />
        </div>
    );
};

export default Editor;
