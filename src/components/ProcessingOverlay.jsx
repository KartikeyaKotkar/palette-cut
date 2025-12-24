import React from 'react';

const ProcessingOverlay = ({ progress }) => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(246, 243, 238, 0.9)', // Match bg color with opacity
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            backdropFilter: 'blur(2px)'
        }}>
            <div style={{ width: '300px', marginBottom: '1rem' }}>
                <div style={{
                    width: '100%',
                    height: '2px',
                    backgroundColor: 'rgba(30, 30, 30, 0.1)',
                    position: 'relative'
                }}>
                    <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        backgroundColor: '#1E1E1E',
                        width: `${progress}%`,
                        transition: 'width 0.2s ease-out'
                    }} />
                </div>
            </div>
            <span style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '0.9rem',
                fontStyle: 'italic',
                opacity: 0.7
            }}>
                Processing film... {progress}%
            </span>
        </div>
    );
};

export default ProcessingOverlay;
