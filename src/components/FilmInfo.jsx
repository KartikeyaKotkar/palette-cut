import React, { useEffect, useState } from 'react';
import { analyzeColors, rgbToCss, rgbToHex } from '../utils/videoProcessor';

const ColorSwatch = ({ label, color }) => {
    if (!color) return null;
    const hex = rgbToHex(color);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 1.5rem' }}>
            <div
                style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: rgbToCss(color),
                    borderRadius: '50%',
                    marginBottom: '0.5rem',
                    border: '1px solid rgba(0,0,0,0.1)'
                }}
            />
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5 }}>{label}</span>
            <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', opacity: 0.8 }}>{hex}</span>
        </div>
    );
};

const FilmInfo = ({ fileName, colors }) => {
    const [stats, setStats] = useState(null);
    const [title, setTitle] = useState('');

    useEffect(() => {
        if (fileName) {
            // Remove extension and capitalize
            const name = fileName.replace(/\.[^/.]+$/, "");
            setTitle(name);
        }
    }, [fileName]);

    useEffect(() => {
        if (colors && colors.length > 0) {
            const result = analyzeColors(colors);
            setStats(result);
        }
    }, [colors]);

    if (!colors) return null;

    return (
        <div className="film-info" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2
                contentEditable
                suppressContentEditableWarning
                className="film-title"
                style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '2.5rem',
                    fontWeight: 600,
                    textAlign: 'center',
                    marginBottom: '2rem',
                    outline: 'none',
                    borderBottom: '1px solid transparent',
                    minWidth: '200px',
                    color: '#1E1E1E'
                }}
                onBlur={(e) => setTitle(e.target.innerText)}
            >
                {title || "Untitled Film"}
            </h2>

            {stats && (
                <div className="stats-container" style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                    <ColorSwatch label="Dominant" color={stats.dominant} />
                    <ColorSwatch label="Average" color={stats.average} />
                    <ColorSwatch label="Least Used" color={stats.least} />
                </div>
            )}
        </div>
    );
};

export default FilmInfo;
