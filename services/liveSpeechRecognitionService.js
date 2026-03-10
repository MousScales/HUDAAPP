import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { LiveSpeechRecognitionModule } = NativeModules;

class LiveSpeechRecognitionService {
  constructor() {
    console.log('🔧 ===== LiveSpeechRecognitionService Constructor =====');
    console.log('🔧 Platform:', Platform.OS);
    this.isRecognizing = false;
    this.eventEmitter = null;
    this.listeners = [];
    
    if (Platform.OS === 'ios') {
      if (LiveSpeechRecognitionModule) {
        console.log('✅ LiveSpeechRecognitionModule found in NativeModules');
        this.eventEmitter = new NativeEventEmitter(LiveSpeechRecognitionModule);
        console.log('✅ Event emitter created');
        console.log('✅ LiveSpeechRecognitionModule initialized');
      } else {
        console.warn('⚠️ LiveSpeechRecognitionModule not found. Available modules:', Object.keys(NativeModules));
      }
    } else {
      console.log('ℹ️ Not iOS, skipping initialization');
    }
    console.log('🔧 ===== Constructor Complete =====');
  }

  /**
   * Start live speech recognition with real-time transcription
   * @param {function} onTranscription - Callback when transcription updates (text, isFinal)
   * @param {function} onError - Optional error callback
   * @param {Array<string>} contextualStrings - Optional array of Quran text to improve recognition
   * @returns {Promise<boolean>}
   */
  async startRecognition(onTranscription, onError, contextualStrings = null) {
    console.log('🚀 ===== LiveSpeechRecognitionService.startRecognition =====');
    
    if (Platform.OS !== 'ios') {
      console.error('❌ Not iOS platform');
      throw new Error('LiveSpeechRecognition is only available on iOS');
    }
    
    if (!LiveSpeechRecognitionModule) {
      console.error('❌ LiveSpeechRecognitionModule not found. Available modules:', Object.keys(NativeModules));
      throw new Error('LiveSpeechRecognition module not found. Please rebuild the app to link the native module.');
    }
    console.log('✅ LiveSpeechRecognitionModule found');

    // Always check native module state, not just our JavaScript state
    console.log('🔍 Checking if recognition is already running...');
    console.log('🔍 JavaScript state (this.isRecognizing):', this.isRecognizing);
    
    try {
      const nativeIsRecognizing = await LiveSpeechRecognitionModule.isRecognizing();
      console.log('🔍 Native module state (isRecognizing):', nativeIsRecognizing);
      
      if (nativeIsRecognizing || this.isRecognizing) {
        console.warn('⚠️ Recognition already in progress, force stopping...');
        try {
          // Force stop regardless of our state - call native directly
          console.log('🛑 Calling native stopRecognition...');
          await LiveSpeechRecognitionModule.stopRecognition();
          console.log('✅ Native stopRecognition completed');
          
          // Clear our state
          this.isRecognizing = false;
          
          // Clear listeners
          if (this.listeners.length > 0) {
            console.log('🧹 Removing', this.listeners.length, 'listeners...');
            this.listeners.forEach(listener => listener.remove());
            this.listeners = [];
          }
          
          // Wait longer to ensure it's fully stopped
          console.log('⏳ Waiting for recognition to fully stop...');
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Verify it's actually stopped
          const stillRunning = await LiveSpeechRecognitionModule.isRecognizing();
          if (stillRunning) {
            console.warn('⚠️ Recognition still running after stop, trying again...');
            await LiveSpeechRecognitionModule.stopRecognition();
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          console.log('✅ Previous recognition fully stopped');
        } catch (err) {
          console.log('⚠️ Error stopping existing recognition:', err);
          // Try to continue anyway - might work
          this.isRecognizing = false;
        }
      } else {
        console.log('✅ No existing recognition running');
      }
    } catch (err) {
      console.log('⚠️ Could not check native recognition state:', err);
      // If we can't check, try to stop anyway if our state says it's running
      if (this.isRecognizing) {
        console.log('🛑 Our state says running, attempting stop...');
        try {
          await this.stopRecognition();
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (stopErr) {
          console.log('⚠️ Error in fallback stop:', stopErr);
          // Reset state anyway
          this.isRecognizing = false;
        }
      }
    }

    try {
      // Verify event emitter is available
      if (!this.eventEmitter) {
        console.error('❌ Event emitter not initialized! Reinitializing...');
        if (LiveSpeechRecognitionModule) {
          this.eventEmitter = new NativeEventEmitter(LiveSpeechRecognitionModule);
          console.log('✅ Event emitter reinitialized');
        } else {
          throw new Error('Cannot create event emitter - module not available');
        }
      }
      console.log('✅ Event emitter available');
      
      // Clear any existing listeners first
      if (this.listeners.length > 0) {
        console.log('🧹 Removing', this.listeners.length, 'existing listeners...');
        this.listeners.forEach(listener => listener.remove());
        this.listeners = [];
      }
      
      // Set up event listeners for real-time transcription
      console.log('📡 Setting up event listeners...');
      if (onTranscription) {
        console.log('📡 Adding transcription listener...');
        const transcriptionListener = this.eventEmitter.addListener('onTranscription', (event) => {
          console.log('📝 ===== onTranscription EVENT RECEIVED =====');
          console.log('📝 Event object:', JSON.stringify(event));
          console.log('📝 Event.text:', event?.text);
          console.log('📝 Event.text type:', typeof event?.text);
          console.log('📝 Event.text length:', event?.text?.length);
          console.log('📝 Event.isFinal:', event?.isFinal);
          
          // Always call callback, even with empty text (to show we're listening)
          if (event) {
            const text = event.text || '';
            const isFinal = event.isFinal || false;
            console.log('✅ Calling onTranscription callback with text:', `'${text}' (length: ${text.length}), isFinal: ${isFinal}`);
            onTranscription(text, isFinal);
          } else {
            console.warn('⚠️ Transcription event is null/undefined:', event);
            // Still call with empty string to show we received an event
            onTranscription('', false);
          }
        });
        this.listeners.push(transcriptionListener);
        console.log('✅ Transcription listener added, total listeners:', this.listeners.length);
      } else {
        console.warn('⚠️ No onTranscription callback provided');
      }
      
      if (onError) {
        console.log('📡 Adding error listener...');
        const errorListener = this.eventEmitter.addListener('onError', (event) => {
          console.error('❌ ===== onError EVENT RECEIVED =====');
          console.error('❌ Event object:', JSON.stringify(event));
          if (event && event.error) {
            onError(event.error);
          } else {
            onError(event || 'Unknown error');
          }
        });
        this.listeners.push(errorListener);
        console.log('✅ Error listener added, total listeners:', this.listeners.length);
      } else {
        console.warn('⚠️ No onError callback provided');
      }
      
      console.log('📡 All listeners set up. Total:', this.listeners.length);
      console.log('📡 Starting native recognition module...');
      
      // Prepare contextual strings (Quran text) for better recognition
      const contextStrings = contextualStrings || [];
      if (contextStrings.length > 0) {
        console.log(`📝 Providing ${contextStrings.length} contextual strings to improve recognition`);
      }

      // Start native recognition with contextual strings
      const result = await LiveSpeechRecognitionModule.startRecognition(contextStrings);
      this.isRecognizing = true;
      console.log('✅ LiveSpeechRecognition: Native module started, result:', result);
      console.log('✅ ===== LiveSpeechRecognitionService.startRecognition COMPLETE =====');
      return result;
    } catch (error) {
      console.error('❌ Error starting live recognition:', error);
      this.isRecognizing = false;
      throw error;
    }
  }

  /**
   * Stop live speech recognition
   * @returns {Promise<boolean>}
   */
  async stopRecognition() {
    if (Platform.OS !== 'ios' || !LiveSpeechRecognitionModule) {
      throw new Error('LiveSpeechRecognition is only available on iOS');
    }

    if (!this.isRecognizing) {
      return false;
    }

    try {
      // Remove all listeners
      this.listeners.forEach(listener => listener.remove());
      this.listeners = [];

      // Stop native recognition
      const result = await LiveSpeechRecognitionModule.stopRecognition();
      this.isRecognizing = false;
      console.log('✅ LiveSpeechRecognition: Stopped');
      return result;
    } catch (error) {
      console.error('❌ Error stopping live recognition:', error);
      throw error;
    }
  }

  /**
   * Check if currently recognizing
   * @returns {Promise<boolean>}
   */
  async getIsRecognizing() {
    if (Platform.OS !== 'ios' || !LiveSpeechRecognitionModule) {
      return false;
    }
    return await LiveSpeechRecognitionModule.isRecognizing();
  }

  /**
   * Get current recognizing state (synchronous)
   * @returns {boolean}
   */
  getIsRecognizingSync() {
    return this.isRecognizing;
  }
}

export default new LiveSpeechRecognitionService();
