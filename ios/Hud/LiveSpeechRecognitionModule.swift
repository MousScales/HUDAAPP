import Foundation
import Speech
import AVFoundation
import React

@objc(LiveSpeechRecognitionModule)
class LiveSpeechRecognitionModule: RCTEventEmitter {
    private var audioEngine: AVAudioEngine?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var speechRecognizer: SFSpeechRecognizer?
    private var isRecognizing = false
    
    override func supportedEvents() -> [String]! {
        return ["onTranscription", "onError"]
    }
    
    // Start live speech recognition with optional contextual strings (Quran text for better accuracy)
    @objc
    func startRecognition(_ contextualStrings: [String]?, resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            // If already recognizing, stop it first
            if self.isRecognizing {
                print("⚠️ Recognition already in progress, stopping first...")
                self.stopRecognitionInternal()
                // Wait a bit for cleanup
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    self.startRecognitionInternal(contextualStrings: contextualStrings, resolve: resolve, rejecter: reject)
                }
                return
            }
            
            // Request speech recognition authorization
            SFSpeechRecognizer.requestAuthorization { authStatus in
                DispatchQueue.main.async {
                    switch authStatus {
                    case .authorized:
                        self.startRecognitionInternal(contextualStrings: contextualStrings, resolve: resolve, rejecter: reject)
                    case .denied, .restricted, .notDetermined:
                        reject("PERMISSION_DENIED", "Speech recognition permission not granted", nil)
                    @unknown default:
                        reject("PERMISSION_DENIED", "Speech recognition permission not granted", nil)
                    }
                }
            }
        }
    }
    
    private func startRecognitionInternal(contextualStrings: [String]?, resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        do {
            // Create Arabic speech recognizer
            guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "ar-SA")) else {
                reject("INIT_ERROR", "Arabic speech recognizer not available", nil)
                return
            }
            
            if !recognizer.isAvailable {
                reject("NOT_AVAILABLE", "Speech recognizer is not available", nil)
                return
            }
            
            self.speechRecognizer = recognizer
            
            // Setup audio session
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
            
            // Setup audio engine
            self.audioEngine = AVAudioEngine()
            guard let audioEngine = self.audioEngine else {
                reject("ENGINE_ERROR", "Failed to initialize audio engine", nil)
                return
            }
            
            let inputNode = audioEngine.inputNode
            let recordingFormat = inputNode.outputFormat(forBus: 0)
            
            // Create recognition request
            let recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
            recognitionRequest.shouldReportPartialResults = true // Enable real-time updates
            
            // Add contextual strings (Quran text) to improve recognition accuracy
            // This helps SFSpeechRecognizer better understand Quranic Arabic
            if let contextualStrings = contextualStrings, !contextualStrings.isEmpty {
                recognitionRequest.contextualStrings = contextualStrings
                print("✅ Added \(contextualStrings.count) contextual strings to improve Quran recognition")
                if contextualStrings.count <= 5 {
                    print("📝 Contextual strings:", contextualStrings.joined(separator: ", "))
                }
            } else {
                print("ℹ️ No contextual strings provided - using default recognition")
            }
            
            self.recognitionRequest = recognitionRequest
            
            // Install tap to capture audio
            var bufferCount = 0
            inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { (buffer, time) in
                recognitionRequest.append(buffer)
                // Debug: Log when audio buffers are received (but limit logging to avoid spam)
                bufferCount += 1
                let sampleCount = Int(buffer.frameLength)
                if bufferCount % 100 == 0 { // Log every 100th buffer to avoid spam
                    print("🎤 Audio buffer #\(bufferCount): \(sampleCount) samples")
                }
            }
            print("✅ Audio tap installed, will log every 100th buffer")
            
            // Start recognition task
            print("🎯 Creating recognition task with locale: \(recognizer.locale.identifier)...")
            self.recognitionTask = recognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
                guard let self = self else { 
                    print("⚠️ LiveSpeechRecognitionModule deallocated")
                    return 
                }
                
                print("🔄 Recognition callback triggered - result: \(result != nil ? "exists" : "nil"), error: \(error != nil ? "exists" : "nil")")
                
                if let error = error {
                    let errorMsg = error.localizedDescription
                    let errorCode = (error as NSError).code
                    print("❌ Speech recognition error: \(errorMsg)")
                    print("❌ Error code: \(errorCode)")
                    print("❌ Error domain: \((error as NSError).domain)")
                    self.sendEvent(withName: "onError", body: [
                        "error": errorMsg,
                        "code": errorCode
                    ])
                    
                    // Don't stop on certain recoverable errors
                    if errorCode == 216 || errorCode == 1700 {
                        // These are often recoverable - continue listening
                        print("⚠️ Recoverable error, continuing...")
                    } else {
                        // Stop on other errors
                        print("🛑 Fatal error, stopping recognition")
                        self.isRecognizing = false
                    }
                    return
                }
                
                if let result = result {
                    let transcribedText = result.bestTranscription.formattedString
                    let isFinal = result.isFinal
                    
                    // Always send transcription, even if empty (to show it's working)
                    print("📝 Recognition result received - text: '\(transcribedText)' (length: \(transcribedText.count)), final: \(isFinal)")
                    print("📝 Sending transcription event to JS...")
                    self.sendEvent(withName: "onTranscription", body: [
                        "text": transcribedText,
                        "isFinal": isFinal
                    ])
                    print("✅ Transcription event sent to JS")
                    
                    // If final, we can optionally stop or continue
                    if isFinal {
                        print("✅ Final transcription: \(transcribedText)")
                    } else {
                        print("📝 Partial transcription: \(transcribedText)")
                    }
                } else {
                    print("⚠️ Recognition result is nil (no transcription yet, but callback was called)")
                    // Send empty transcription to show we're listening
                    print("📝 Sending empty transcription event to show we're listening...")
                    self.sendEvent(withName: "onTranscription", body: [
                        "text": "",
                        "isFinal": false
                    ])
                }
            }
            
            print("✅ Recognition task created and configured")
            
            // Verify recognition task state
            if let task = self.recognitionTask {
                print("✅ Recognition task state: \(task.state.rawValue)")
                if task.state == .running {
                    print("✅ Recognition task is already running")
                } else if task.state == .starting {
                    print("⏳ Recognition task is starting...")
                } else {
                    print("⚠️ Recognition task state: \(task.state.rawValue)")
                }
            }
            
            // Start audio engine
            print("🚀 Starting audio engine...")
            try audioEngine.start()
            self.isRecognizing = true
            
            // Verify recognition task is active after starting
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                if let task = self.recognitionTask {
                    print("🔍 Recognition task state (1s after start): \(task.state.rawValue)")
                    if task.state == .canceling || task.state == .completed {
                        print("❌ Recognition task ended unexpectedly! State: \(task.state.rawValue)")
                        self.sendEvent(withName: "onError", body: [
                            "error": "Recognition task ended unexpectedly",
                            "code": -1
                        ])
                    }
                }
            }
            
            print("✅ Live speech recognition started (Arabic)")
            print("✅ Audio engine running, waiting for speech input...")
            print("✅ Recognition task active, listening for Arabic speech...")
            print("✅ Audio session category: \(audioSession.category.rawValue)")
            print("✅ Audio session mode: \(audioSession.mode.rawValue)")
            print("✅ Audio engine isRunning: \(audioEngine.isRunning)")
            print("✅ Input node format: \(recordingFormat)")
            
            // Send initial empty transcription to confirm setup
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                print("📝 Sending initial empty transcription to confirm setup...")
                self.sendEvent(withName: "onTranscription", body: [
                    "text": "",
                    "isFinal": false
                ])
            }
            
            resolve(true)
            
        } catch {
            print("❌ Error starting recognition: \(error)")
            reject("START_ERROR", "Failed to start recognition: \(error.localizedDescription)", error)
        }
    }
    
    // Internal stop method (can be called without promise)
    private func stopRecognitionInternal() {
        guard self.isRecognizing else {
            return
        }
        
        print("🛑 Stopping recognition internally...")
        
        // Stop audio engine
        self.audioEngine?.stop()
        self.audioEngine?.inputNode.removeTap(onBus: 0)
        
        // End recognition request
        self.recognitionRequest?.endAudio()
        self.recognitionRequest = nil
        
        // Cancel recognition task
        self.recognitionTask?.cancel()
        self.recognitionTask = nil
        
        // Deactivate audio session
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        
        self.isRecognizing = false
        print("✅ Live speech recognition stopped internally")
    }
    
    // Stop speech recognition
    @objc
    func stopRecognition(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            self.stopRecognitionInternal()
            resolve(true)
        }
    }
    
    // Check if currently recognizing
    @objc
    func isRecognizing(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(self.isRecognizing)
    }
}
