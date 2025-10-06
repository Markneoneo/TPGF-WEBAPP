import React from 'react';
import './JsonPreview.css';

const JsonPreview = ({ jsonData, onClose }) => {
  if (!jsonData) return null;

  return (
    <div className="json-preview-section">
      <div className="json-preview-header">
        <h3>Generated JSON Preview</h3>
        {onClose && (
          <button 
            className="json-preview-close" 
            onClick={onClose}
            aria-label="Close preview"
          >
            ×
          </button>
        )}
      </div>
      <div className="json-preview-container">
        <pre className="json-preview">
          <code>{JSON.stringify(jsonData, null, 2)}</code>
        </pre>
      </div>
    </div>
  );
};

export default JsonPreview;
