import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { LiveAudioRecorderModule } = NativeModules;

class LiveAudioRecorderService {
  constructor() {
    this.isRecording = false;
    this.eventEmitter = null;
    this.listeners = [];
    
    if (Platform.OS === 'ios' && LiveAudioRecorderModule) {
      this.eventEmitter = new NativeEventEmitter(LiveAudioRecorderModule);
    }
  }

  /**
   * Start live audio recording with real-time chunk processing
   * @param {number} chunkIntervalSeconds - How often to process chunks (default: 3)
   * @param {function} onChunk - Callback when a new audio chunk is ready
   * @returns {Promise<boolean>}
   */
  async startRecording(chunkIntervalSeconds = 3, onChunk) {
    if (Platform.OS !== 'ios' || !LiveAudioRecorderModule) {
      throw new Error('LiveAudioRecorder is only available on iOS');
    }

    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }

    try {
      // Set up event listener for audio chunks
      if (this.eventEmitter && onChunk) {
        const listener = this.eventEmitter.addListener('onAudioChunk', (event) => {
          console.log('📦 Received audio chunk:', event.chunkNumber, event.chunkPath);
          onChunk(event.chunkPath, event.chunkNumber);
        });
        this.listeners.push(listener);
      }

      // Start native recording
      const result = await LiveAudioRecorderModule.startRecording(chunkIntervalSeconds);
      this.isRecording = true;
      console.log('✅ LiveAudioRecorder: Started recording');
      return result;
    } catch (error) {
      console.error('❌ Error starting live recording:', error);
      throw error;
    }
  }

  /**
   * Stop live audio recording
   * @returns {Promise<boolean>}
   */
  async stopRecording() {
    if (Platform.OS !== 'ios' || !LiveAudioRecorderModule) {
      throw new Error('LiveAudioRecorder is only available on iOS');
    }

    if (!this.isRecording) {
      return false;
    }

    try {
      // Remove all listeners
      this.listeners.forEach(listener => listener.remove());
      this.listeners = [];

      // Stop native recording
      const result = await LiveAudioRecorderModule.stopRecording();
      this.isRecording = false;
      console.log('✅ LiveAudioRecorder: Stopped recording');
      return result;
    } catch (error) {
      console.error('❌ Error stopping live recording:', error);
      throw error;
    }
  }

  /**
   * Get the current audio chunk file path
   * @returns {Promise<string>} Path to the current chunk file
   */
  async getCurrentChunk() {
    if (Platform.OS !== 'ios' || !LiveAudioRecorderModule) {
      throw new Error('LiveAudioRecorder is only available on iOS');
    }

    if (!this.isRecording) {
      throw new Error('Not currently recording');
    }

    try {
      const chunkPath = await LiveAudioRecorderModule.getCurrentChunk();
      return chunkPath;
    } catch (error) {
      console.error('❌ Error getting current chunk:', error);
      throw error;
    }
  }

  /**
   * Check if currently recording
   * @returns {boolean}
   */
  getIsRecording() {
    return this.isRecording;
  }
}

export default new LiveAudioRecorderService();
