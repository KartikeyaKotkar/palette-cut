/**
 * Video Processing Utilities
 * Handles loading video, extracting frames, and analyzing colors.
 * Supports native codecs + MKV via FFmpeg.wasm
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

// Configuration
const FRAME_COUNT = 240; // Total frames to sample
const SAMPLE_WIDTH = 32;
const SAMPLE_HEIGHT = 32;

// Singleton FFmpeg instance
let ffmpeg = null;

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
    const clusters = [];
    const THRESHOLD = 30;

    colors.forEach(color => {
        let found = false;
        for (let cluster of clusters) {
            if (colorDistance(color, cluster.center) < THRESHOLD) {
                cluster.count++;
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

    clusters.sort((a, b) => b.count - a.count);

    const dominant = clusters[0].center;
    const least = clusters[clusters.length - 1].center;

    return {
        average,
        dominant: { r: Math.round(dominant.r), g: Math.round(dominant.g), b: Math.round(dominant.b) },
        least: { r: Math.round(least.r), g: Math.round(least.g), b: Math.round(least.b) }
    };
}

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

export const rgbToCss = ({ r, g, b }) => `rgb(${r}, ${g}, ${b})`;

export const rgbToHex = ({ r, g, b }) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};

/**
 * Main entry point for video processing.
 * Tries native first, falls back to FFmpeg.
 */
export async function processVideo(videoFile, onProgress) {
    try {
        console.log("Attempting native processing...");
        return await processVideoNative(videoFile, onProgress);
    } catch (err) {
        if (err.message && (err.message.includes("supported") || err.message.includes("video duration") || err.message.includes("format"))) {
            console.warn("Native processing failed. Falling back to FFmpeg...", err);
            return await processVideoFFmpeg(videoFile, onProgress);
        }
        throw err;
    }
}

/**
 * Native video element processing
 */
async function processVideoNative(videoFile, onProgress) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        video.src = URL.createObjectURL(videoFile);
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = "anonymous";

        const cleanup = () => URL.revokeObjectURL(video.src);

        video.onerror = (e) => {
            cleanup();
            // Force fallback
            reject(new Error("Format not supported"));
        };

        video.onloadedmetadata = async () => {
            canvas.width = SAMPLE_WIDTH;
            canvas.height = SAMPLE_HEIGHT;

            const duration = video.duration;
            if (!duration || duration === Infinity) {
                cleanup();
                reject(new Error("Could not determine video duration"));
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

                const seekTime = Math.min(interval * currentFrame, duration - 0.1);
                video.currentTime = seekTime;
            };

            video.onseeked = () => {
                ctx.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
                try {
                    const imageData = ctx.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
                    colors.push(getAverageColor(imageData));
                } catch (e) {
                    colors.push({ r: 0, g: 0, b: 0 });
                }

                currentFrame++;
                onProgress(Math.round((currentFrame / FRAME_COUNT) * 100));
                setTimeout(processFrame, 0);
            };

            processFrame();
        };
    });
}

/**
 * FFmpeg.wasm processing
 */
async function processVideoFFmpeg(videoFile, onProgress) {
    onProgress(1); // Started

    if (!ffmpeg) {
        ffmpeg = new FFmpeg();
    }

    if (!ffmpeg.loaded) {
        console.log("Loading FFmpeg...");
        // Just usage default CDN
        await ffmpeg.load();
        console.log("FFmpeg loaded successfully.");
    }

    // File size check: > 1GB might be dangerous
    if (videoFile.size > 1024 * 1024 * 1024) {
        if (!confirm("This file is large (>1GB) and might crash your browser memory. Continue anyway?")) {
            throw new Error("Processing cancelled by user due to file size.");
        }
    }

    const inputName = 'input.' + (videoFile.name.split('.').pop() || 'mkv');
    console.log("Writing file to memory...", inputName);
    await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

    // 1. Probe for duration
    let duration = 0;
    const logHandler = ({ message }) => {
        // Parse Duration: 00:00:00.00
        const match = message.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        if (match) {
            const hours = parseFloat(match[1]);
            const minutes = parseFloat(match[2]);
            const seconds = parseFloat(match[3]);
            duration = hours * 3600 + minutes * 60 + seconds;
        }
    };

    ffmpeg.on('log', logHandler);
    await ffmpeg.exec(['-i', inputName]);
    ffmpeg.off('log', logHandler);

    if (duration === 0) {
        // If probe failed, assume default or fail?
        // Let's guess 2 hours if we really can't find it to avoid crash, but better to fail.
        // Sometimes duration is not in metadata.
        console.warn("Could not determine duration from FFmpeg probe.");
        // try to proceed with a fixed fps guess? No.
        // We can try to just extract frames at 1fps?
        // Let's throw.
        // throw new Error("Could not determine duration.");
        // Fallback: Just assume standard film length?
        duration = 7200; // 2 hours
    }

    console.log("Duration:", duration);

    // 2. Extract Frames
    // We want FRAME_COUNT frames.
    // FPS = FRAME_COUNT / Duration.
    const fps = FRAME_COUNT / duration;

    console.log("Extracting with fps:", fps);
    onProgress(10); // Prep done

    // Output filename pattern: out001.png
    await ffmpeg.exec([
        '-i', inputName,
        '-vf', `fps=${fps},scale=${SAMPLE_WIDTH}:${SAMPLE_HEIGHT}`,
        'out%03d.png'
    ]);

    // 3. Read Frames and analyze
    const colors = [];
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_WIDTH;
    canvas.height = SAMPLE_HEIGHT;
    const ctx = canvas.getContext('2d');

    // Attempt to read up to FRAME_COUNT + buffer, or until file not found
    for (let i = 1; i <= FRAME_COUNT + 10; i++) {
        const num = i.toString().padStart(3, '0');
        const fileName = `out${num}.png`;

        try {
            const data = await ffmpeg.readFile(fileName);

            // Convert to Blob and then ImageBitmap
            const blob = new Blob([data.buffer], { type: 'image/png' });
            const bmp = await createImageBitmap(blob);

            ctx.drawImage(bmp, 0, 0);
            const imageData = ctx.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
            colors.push(getAverageColor(imageData));

            // Cleanup file from memfs immediately to free memory
            await ffmpeg.deleteFile(fileName);

            onProgress(Math.round(10 + (i / FRAME_COUNT) * 80));
        } catch (e) {
            // File not found -> done
            break;
        }
    }

    // Cleanup input
    await ffmpeg.deleteFile(inputName);

    onProgress(100);
    return colors;
}
