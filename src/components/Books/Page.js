import React, { useState, useEffect } from 'react';
import Editor from './Editor';
import { saveBookPage } from '../../api/Books';

export default function Book() {

  return (
    <div>
        <div>
            Content
        </div>
        <div>
            Number
        </div>
    </div>
  );
}
