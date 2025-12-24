import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import UploadZone from './components/UploadZone.jsx';
import ColorRibbon from './components/ColorRibbon.jsx';
import FilmInfo from './components/FilmInfo.jsx';
import ProcessingOverlay from './components/ProcessingOverlay.jsx';
import { processVideo } from './utils/videoProcessor.js';

function App() {
  const [file, setFile] = useState(null);
  const [colors, setColors] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const exportRef = useRef(null);

  const handleFileSelected = async (selectedFile) => {
    setFile(selectedFile);
    setIsProcessing(true);
    setProgress(0);
    setColors([]);

    try {
      const result = await processVideo(selectedFile, (p) => {
        setProgress(p);
      });
      setColors(result);
    } catch (err) {
      console.error(err);
      alert("Failed to process video: " + err.message);
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (isProcessing) return; // Prevent reset during processing
    setFile(null);
    setColors([]);
    setProgress(0);
  };

  const handleExport = async () => {
    if (!exportRef.current) return;

    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#F6F3EE', // Force background color
        scale: 2, // High res
        logging: false
      });

      const link = document.createElement('a');
      link.download = `${file.name.replace(/\.[^/.]+$/, "")}_palette.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to export image.");
    }
  };

  return (
    <div className="app-container" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '4rem 2rem',
      position: 'relative'
    }}>
      <header style={{ marginBottom: '3rem', textAlign: 'center', zIndex: 10 }}>
        <h1
          onClick={handleReset}
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 400,
            fontSize: '1.5rem',
            letterSpacing: '-0.02em',
            opacity: 0.8,
            cursor: 'pointer'
          }}
        >
          Palette Cut
        </h1>
      </header>

      <main style={{ width: '100%', maxWidth: '1000px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: file ? 'flex-start' : 'center' }}>

        {!file && !isProcessing && (
          <UploadZone onFileSelected={handleFileSelected} />
        )}

        {isProcessing && (
          <ProcessingOverlay progress={progress} />
        )}

        {file && !isProcessing && colors.length > 0 && (
          <div className="result-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* Exportable Area */}
            <div
              ref={exportRef}
              style={{
                width: '100%',
                padding: '3rem',
                backgroundColor: 'var(--bg-color)', // Match bg for seamless export
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <FilmInfo fileName={file.name} colors={colors} />
              <ColorRibbon colors={colors} />
            </div>

            <div className="actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleReset}
                style={{
                  padding: '0.8rem 1.5rem',
                  border: '1px solid rgba(30,30,30,0.2)',
                  borderRadius: '4px',
                  opacity: 0.7,
                  fontSize: '0.9rem',
                  transition: 'all 0.2s'
                }}
              >
                New File
              </button>
              <button
                onClick={handleExport}
                style={{
                  padding: '0.8rem 1.5rem',
                  backgroundColor: '#1E1E1E',
                  color: '#FFF',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                Export Image
              </button>
            </div>

          </div>
        )}
      </main>

      <footer style={{ marginTop: '4rem', opacity: 0.4, fontSize: '0.8rem', fontFamily: 'var(--font-serif)' }}>
        Processed locally. No data leaves your device.
      </footer>
    </div>
  );
}

export default App;
