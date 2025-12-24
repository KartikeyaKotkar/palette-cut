import React, { useMemo } from 'react';
import { rgbToCss } from '../utils/videoProcessor';

const ColorRibbon = ({ colors }) => {
    // Memoize the mapping to avoid recalculations if props don't change
    const barcode = useMemo(() => {
        if (!colors || colors.length === 0) return null;
        return colors.map((color, index) => (
            <div
                key={index}
                style={{
                    flex: 1,
                    backgroundColor: rgbToCss(color),
                    height: '100%',
                    // Use a tiny negative margin to prevent subpixel rendering gaps
                    marginLeft: '-0.5px',
                    marginRight: '-0.5px',
                    position: 'relative',
                    zIndex: 1
                }}
            />
        ));
    }, [colors]);

    if (!colors || colors.length === 0) return null;

    return (
        <div
            className="color-ribbon"
            style={{
                width: '100%',
                height: '120px',
                display: 'flex',
                alignItems: 'stretch',
                overflow: 'hidden',
                borderRadius: '2px', // Very subtle radius
                boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)',
                marginTop: '2rem',
                marginBottom: '2rem',
                // Creating a seamless container
                backgroundColor: '#000'
            }}
        >
            {barcode}
        </div>
    );
};

export default ColorRibbon;
