import React, { useRef } from 'react';

const UploadZone = ({ onFileSelected }) => {
    const inputRef = useRef(null);

    const handleClick = () => {
        inputRef.current?.click();
    };

    const handleChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            onFileSelected(file);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('video/')) {
            onFileSelected(file);
        }
    };

    return (
        <div
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{
                width: '100%',
                maxWidth: '600px',
                height: '200px',
                border: '1px dashed rgba(30, 30, 30, 0.2)',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                marginTop: '2rem'
            }}
            className="upload-zone"
        >
            <input
                type="file"
                accept="video/*"
                ref={inputRef}
                style={{ display: 'none' }}
                onChange={handleChange}
            />

            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, marginBottom: '1rem' }}>
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                <line x1="7" y1="2" x2="7" y2="22"></line>
                <line x1="17" y1="2" x2="17" y2="22"></line>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <line x1="2" y1="7" x2="7" y2="7"></line>
                <line x1="2" y1="17" x2="7" y2="17"></line>
                <line x1="17" y1="17" x2="22" y2="17"></line>
                <line x1="17" y1="7" x2="22" y2="7"></line>
            </svg>

            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', opacity: 0.8 }}>
                Select a film
            </p>
            <p style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: '0.5rem' }}>
                or drag and drop video file
            </p>
        </div>
    );
};

export default UploadZone;
