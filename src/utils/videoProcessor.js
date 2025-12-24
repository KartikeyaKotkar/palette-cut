/**
 * Video Processing Utilities
 * Handles loading video, extracting frames, and analyzing colors.
 */

// Configuration
const FRAME_COUNT = 240; // Total frames to sample (creates a nice density)
const SAMPLE_WIDTH = 32; // Small size for faster processing
const SAMPLE_HEIGHT = 32;

/**
 * Calculates Euclidean distance between two colors
 */
function colorDistance(c1, c2) {
    return Math.sqrt(
        Math.pow(c1.r - c2.r, 2) +
        Math.pow(c1.g - c2.g, 2) +
        Math.pow(c1.b - c2.b, 2)
    );
}

/**
 * Analyzes the color palette to find dominant and least used colors.
 * Uses a simple quantization/bucketing approach.
 * @param {Array} colors - Array of {r,g,b} objects
 * @returns {Object} { dominant: {r,g,b}, least: {r,g,b}, average: {r,g,b} }
 */
export function analyzeColors(colors) {
    if (!colors || colors.length === 0) return null;

    // 1. Calculate overall average
    let totalR = 0, totalG = 0, totalB = 0;
    colors.forEach(c => {
        totalR += c.r;
        totalG += c.g;
        totalB += c.b;
    });
    const average = {
        r: Math.round(totalR / colors.length),
        g: Math.round(totalG / colors.length),
        b: Math.round(totalB / colors.length)
    };

    // 2. Quantize and count frequencies
    // We'll bucket similar colors together to find true perceptual dominance
    const clusters = [];
    const THRESHOLD = 30; // Color distance threshold

    colors.forEach(color => {
        let found = false;
        for (let cluster of clusters) {
            if (colorDistance(color, cluster.center) < THRESHOLD) {
                cluster.count++;
                // Update center (moving average)
                cluster.center.r = (cluster.center.r * (cluster.count - 1) + color.r) / cluster.count;
                cluster.center.g = (cluster.center.g * (cluster.count - 1) + color.g) / cluster.count;
                cluster.center.b = (cluster.center.b * (cluster.count - 1) + color.b) / cluster.count;
                found = true;
                break;
            }
        }
        if (!found) {
            clusters.push({ center: { ...color }, count: 1 });
        }
    });

    // Sort clusters by count
    clusters.sort((a, b) => b.count - a.count);

    const dominant = clusters[0].center;
    const least = clusters[clusters.length - 1].center;

    return {
        average,
        dominant: { r: Math.round(dominant.r), g: Math.round(dominant.g), b: Math.round(dominant.b) },
        least: { r: Math.round(least.r), g: Math.round(least.g), b: Math.round(least.b) }
    };
}

/**
 * Calculates the average color of an ImageData object.
 * @param {ImageData} imageData 
 * @returns {Object} {r, g, b}
 */
function getAverageColor(imageData) {
    const data = imageData.data;
    let r = 0, g = 0, b = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
    }

    return {
        r: Math.round(r / pixelCount),
        g: Math.round(g / pixelCount),
        b: Math.round(b / pixelCount)
    };
}

/**
 * Converts RGB object to CSS string
 */
export const rgbToCss = ({ r, g, b }) => `rgb(${r}, ${g}, ${b})`;

/**
 * Converts RGB object to Hex string
 */
export const rgbToHex = ({ r, g, b }) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};

/**
 * Processes a video file to extract a color ribbon.
 * @param {File} videoFile - The video file to process
 * @param {Function} onProgress - Callback (progress: number) => void
 * @returns {Promise<Array>} Array of {r,g,b} color objects
 */
export async function processVideo(videoFile, onProgress) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        video.src = URL.createObjectURL(videoFile);
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = "anonymous";

        // Cleanup URL when done
        const cleanup = () => URL.revokeObjectURL(video.src);

        video.onerror = (e) => {
            cleanup();
            console.error("Video processing error:", video.error);
            const errorCode = video.error ? video.error.code : 'unknown';
            let errorMessage = `Video error code: ${errorCode}`;

            if (errorCode === 3) {
                errorMessage = "Decoding error: The video signal is corrupted or format not supported.";
            } else if (errorCode === 4) {
                errorMessage = "Format not supported: Browser cannot play this video type.";
            }

            reject(new Error(errorMessage));
        };

        video.onloadedmetadata = async () => {
            canvas.width = SAMPLE_WIDTH;
            canvas.height = SAMPLE_HEIGHT;

            const duration = video.duration;
            if (!duration || duration === Infinity) {
                cleanup();
                reject(new Error("Could not determine video duration. Try a different file format."));
                return;
            }

            const colors = [];
            const interval = duration / FRAME_COUNT;
            let currentFrame = 0;

            const processFrame = async () => {
                if (currentFrame >= FRAME_COUNT) {
                    cleanup();
                    resolve(colors);
                    return;
                }

                // Calculate seek time
                const seekTime = Math.min(interval * currentFrame, duration - 0.1);
                video.currentTime = seekTime;
            };

            video.onseeked = () => {
                // Draw frame
                ctx.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);

                // Analyze color
                try {
                    const imageData = ctx.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
                    const avgColor = getAverageColor(imageData);
                    colors.push(avgColor);
                } catch (e) {
                    console.warn("Frame extraction failed", e);
                    colors.push({ r: 0, g: 0, b: 0 }); // Fallback
                }

                currentFrame++;
                onProgress(Math.round((currentFrame / FRAME_COUNT) * 100));

                // Schedule next frame (allow UI to breathe)
                setTimeout(processFrame, 0);
            };

            // Start processing
            processFrame();
        };
    });
}
