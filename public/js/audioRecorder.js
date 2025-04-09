// js/audioRecorder.js
import * as UI from './ui.js';
import { SERVER_URL } from './config.js';
import { isServerConnected, getCurrentSessionId } from './serverConnection.js'; // Check connection status

let audioRecorder = null;
let audioChunks = [];
let isRecording = false;
let mediaStream = null; // Store the stream to stop tracks later


// Check for MediaRecorder support
const isMediaRecorderSupported = !!(navigator.mediaDevices && window.MediaRecorder);

if (!isMediaRecorderSupported) {
    console.warn('MediaRecorder API not supported in this browser. Audio recording disabled.');
    // Optionally disable the save button permanently
    // UI.DOMElements.saveBtn().disabled = true;
}

export function startAudioRecording() {
    if (!isMediaRecorderSupported || isRecording) {
        if (isRecording) UI.updateConsole("Recording is already in progress.");
        else UI.updateConsole("Recording not supported by this browser.");
        return;
    }

    // Reset chunks
    audioChunks = [];

    // Get audio stream (request microphone access)
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaStream = stream; // Store the stream
            // Create recorder instance - check for supported mime types if needed
            const options = { mimeType: 'audio/wav' }; // Specify WAV if possible, browser might default
            audioRecorder = new MediaRecorder(stream); // Fallback to browser default
             // try {
             //     audioRecorder = new MediaRecorder(stream, options);
             // } catch (e) {
             //     console.warn("WAV mimeType might not be supported, trying default.", e);
             //     audioRecorder = new MediaRecorder(stream); // Fallback to browser default
             // }

            audioRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunks.push(e.data);
                }
            };

            audioRecorder.onstop = () => {
                isRecording = false;
                 // Stop the tracks to release the microphone/indicator
                 if (mediaStream) {
                     mediaStream.getTracks().forEach(track => track.stop());
                     mediaStream = null; // Clear the stored stream
                 }
                UI.updateConsole('Recording stopped.');
                // Maybe trigger save automatically or enable save button here?
            };

             audioRecorder.onerror = (event) => {
                 console.error('MediaRecorder error:', event.error);
                 UI.updateConsole(`Recording error: ${event.error.name} - ${event.error.message}`);
                 isRecording = false;
                 if (mediaStream) {
                     mediaStream.getTracks().forEach(track => track.stop());
                     mediaStream = null;
                 }
             };

            audioRecorder.start();
            isRecording = true;
            UI.updateConsole('Recording started...');

        })
        .catch(err => {
            console.error('Error getting user media for recording:', err);
            UI.updateConsole(`Error starting recording: ${err.name} - ${err.message}. Microphone permission denied?`);
            isRecording = false; // Ensure state is correct
        });
}

export function stopAudioRecording() {
    if (audioRecorder && isRecording) {
        audioRecorder.stop(); // This will trigger the onstop handler
    } else if (!isMediaRecorderSupported) {
         UI.updateConsole("Recording not supported by this browser.");
    } else {
        UI.updateConsole("Recording is not currently active.");
    }
}

export function saveRecordingLocally() {
     if (!isMediaRecorderSupported) {
         UI.updateConsole("Recording not supported by this browser.");
         return;
     }
      if (isRecording) {
        // Stop recording first before saving
        stopAudioRecording();
        // Need to wait a moment for onstop to finalize the blob
        setTimeout(saveBlob, 100); // Small delay
    } else {
        saveBlob();
    }
}

function saveBlob() {
     if (audioChunks.length === 0) {
        UI.updateConsole('No audio recorded to save.');
        return;
    }

    // Determine mime type - use the recorder's if available, else default
    const mimeType = audioRecorder?.mimeType || 'audio/wav'; // Default to WAV
    const fileExtension = mimeType.includes('wav') ? 'wav' : 'webm'; // Adjust based on common types

    const audioBlob = new Blob(audioChunks, { type: mimeType });
    const url = URL.createObjectURL(audioBlob);
    const filename = `chuck-recording-${Date.now()}.${fileExtension}`;

    // Create download link
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    UI.updateConsole(`Audio saved locally as ${filename}`);

    // Optionally clear chunks after saving?
    // audioChunks = [];

    // --- Optional: Upload to server ---
    if (isServerConnected()) {
         uploadRecordingToServer(audioBlob, filename);
     } else {
         UI.updateConsole("Not connected to server, skipping server upload.");
     }
}


async function uploadRecordingToServer(audioBlob, filename) {
     UI.updateConsole(`Uploading recording ${filename} to server...`);
     try {
        const response = await fetch(`}/api/upload`, {
            method: 'POST',
            body: audioBlob, // Send blob directly
            headers: {
                'Content-Type': audioBlob.type, // Send correct mime type
                'X-Filename': filename
            }
        });

        const data = await response.json();

        if (!response.ok) {
             throw new Error(data.error || `Server responded with status: ${response.status}`);
        }
         UI.updateConsole(`Recording uploaded to server: ${data.filename || filename}`);

    } catch (error) {
        console.error('Error uploading recording to server:', error);
        UI.updateConsole(`Error uploading recording: ${error.message}`);
    }
}

// Record audio directly to a sample and upload it to the server
export async function recordAndSaveSample(filename) {
    if (!isMediaRecorderSupported) {
        UI.updateConsole("Recording not supported by this browser.");
        return {
            success: false,
            message: "Recording not supported by this browser."
        };
    }
    
    if (!isServerConnected()) {
        UI.updateConsole("Please connect to the server first to save samples.");
        return {
            success: false,
            message: "Not connected to server"
        };
    }
    
    // Clear previous recording if any
    audioChunks = [];
    
    try {
        // Create a promise that resolves when recording is complete
        const recordingPromise = new Promise((resolve, reject) => {
            // Start recording
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    mediaStream = stream;
                    // Create recorder instance
                    try {
                        audioRecorder = new MediaRecorder(stream, { mimeType: 'audio/wav' });
                    } catch (e) {
                        audioRecorder = new MediaRecorder(stream);
                    }
                    
                    audioRecorder.ondataavailable = (e) => {
                        if (e.data.size > 0) {
                            audioChunks.push(e.data);
                        }
                    };
                    
                    audioRecorder.onstop = () => {
                        isRecording = false;
                        // Stop the tracks to release the microphone
                        if (mediaStream) {
                            mediaStream.getTracks().forEach(track => track.stop());
                            mediaStream = null;
                        }
                        UI.updateConsole('Recording stopped.');
                        
                        // Create blob and resolve the promise
                        const mimeType = audioRecorder?.mimeType || 'audio/wav';
                        const fileExtension = mimeType.includes('wav') ? 'wav' : 'webm';
                        const fullFilename = filename || `sample-${Date.now()}.${fileExtension}`;
                        const audioBlob = new Blob(audioChunks, { type: mimeType });
                        
                        resolve({ blob: audioBlob, filename: fullFilename });
                    };
                    
                    audioRecorder.onerror = (event) => {
                        console.error('MediaRecorder error:', event.error);
                        UI.updateConsole(`Recording error: ${event.error.name}`);
                        isRecording = false;
                        if (mediaStream) {
                            mediaStream.getTracks().forEach(track => track.stop());
                            mediaStream = null;
                        }
                        reject(new Error(event.error.message || 'Unknown recording error'));
                    };
                    
                    audioRecorder.start();
                    isRecording = true;
                    UI.updateConsole('Recording started...');
                })
                .catch(err => {
                    console.error('Error getting user media for recording:', err);
                    UI.updateConsole(`Error starting recording: ${err.name}. Microphone permission denied?`);
                    isRecording = false;
                    reject(err);
                });
        });
        
        // Wait for recording to complete (for now, let's set a fixed duration)
        UI.updateConsole("Recording sample for 5 seconds...");
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds recording
        
        // Stop recording if still active
        if (isRecording) {
            audioRecorder.stop();
        } else {
            return {
                success: false,
                message: "Recording was stopped prematurely"
            };
        }
        
        // Wait for the recording data to be ready
        const { blob, filename: finalFilename } = await recordingPromise;
        
        // Upload the blob to the server
        UI.updateConsole(`Uploading sample ${finalFilename} to server...`);
        try {
            const response = await fetch(`}/api/upload`, {
                method: 'POST',
                body: blob,
                headers: {
                    'Content-Type': blob.type,
                    'X-Filename': finalFilename
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Server responded with status: ${response.status}`);
            }
            
            UI.updateConsole(`Sample uploaded to server: ${data.filename || finalFilename}`);
            return {
                success: true,
                filename: data.filename || finalFilename,
                message: `Sample uploaded as ${data.filename || finalFilename}`
            };
        } catch (error) {
            console.error('Error uploading sample to server:', error);
            UI.updateConsole(`Error uploading sample: ${error.message}`);
            return {
                success: false,
                message: `Error uploading: ${error.message}`
            };
        }
    } catch (error) {
        console.error('Error in recording process:', error);
        UI.updateConsole(`Recording error: ${error.message}`);
        return {
            success: false,
            message: `Recording error: ${error.message}`
        };
    }
}

export function getRecordingState() {
    return { isRecording, isSupported: isMediaRecorderSupported };
}