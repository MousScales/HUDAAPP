import Foundation
import AVFoundation
import React

@objc(LiveAudioRecorderModule)
class LiveAudioRecorderModule: RCTEventEmitter {
    private var audioEngine: AVAudioEngine?
    private var inputNode: AVAudioInputNode?
    private var audioFile: AVAudioFile?
    private var isRecording = false
    private var chunkInterval: TimeInterval = 3.0 // Default 3 seconds
    private var chunkTimer: Timer?
    private var chunkCounter = 0
    private var tempFileURL: URL?
    
    override func supportedEvents() -> [String]! {
        return ["onAudioChunk"]
    }
    
    // Start recording with real-time chunk processing
    @objc
    func startRecording(_ chunkIntervalSeconds: NSNumber, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            guard !self.isRecording else {
                reject("ALREADY_RECORDING", "Recording is already in progress", nil)
                return
            }
            
            // Request microphone permission
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                guard granted else {
                    reject("PERMISSION_DENIED", "Microphone permission not granted", nil)
                    return
                }
                
                do {
                    // Configure audio session
                    let audioSession = AVAudioSession.sharedInstance()
                    try audioSession.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
                    try audioSession.setActive(true)
                    
                    // Setup audio engine
                    self.audioEngine = AVAudioEngine()
                    guard let audioEngine = self.audioEngine else {
                        reject("INIT_ERROR", "Failed to initialize audio engine", nil)
                        return
                    }
                    
                    self.inputNode = audioEngine.inputNode
                    guard let inputNode = self.inputNode else {
                        reject("INPUT_ERROR", "Failed to get input node", nil)
                        return
                    }
                    
                    // Get audio format
                    let recordingFormat = inputNode.outputFormat(forBus: 0)
                    let sampleRate = recordingFormat.sampleRate
                    
                    // Create temporary file for current chunk
                    let tempDir = FileManager.default.temporaryDirectory
                    self.tempFileURL = tempDir.appendingPathComponent("live_recording_\(UUID().uuidString).m4a")
                    
                    guard let tempFileURL = self.tempFileURL else {
                        reject("FILE_ERROR", "Failed to create temp file", nil)
                        return
                    }
                    
                    // Create audio file
                    let audioFileSettings: [String: Any] = [
                        AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
                        AVSampleRateKey: sampleRate,
                        AVNumberOfChannelsKey: 1,
                        AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
                    ]
                    
                    self.audioFile = try AVAudioFile(forWriting: tempFileURL, settings: audioFileSettings)
                    
                    // Install tap to capture audio
                    let bufferSize: AVAudioFrameCount = 4096
                    inputNode.installTap(onBus: 0, bufferSize: bufferSize, format: recordingFormat) { (buffer, time) in
                        do {
                            try self.audioFile?.write(from: buffer)
                        } catch {
                            print("❌ Error writing audio buffer: \(error)")
                        }
                    }
                    
                    // Start audio engine
                    try audioEngine.start()
                    self.isRecording = true
                    self.chunkInterval = chunkIntervalSeconds.doubleValue
                    self.chunkCounter = 0
                    
                    // Start timer to process chunks
                    self.startChunkTimer()
                    
                    print("✅ LiveAudioRecorder: Recording started with \(self.chunkInterval)s chunks")
                    resolve(true)
                    
                } catch {
                    print("❌ LiveAudioRecorder: Error starting recording: \(error)")
                    reject("START_ERROR", "Failed to start recording: \(error.localizedDescription)", error)
                }
            }
        }
    }
    
    // Stop recording
    @objc
    func stopRecording(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            guard self.isRecording else {
                resolve(false)
                return
            }
            
            self.stopChunkTimer()
            self.inputNode?.removeTap(onBus: 0)
            self.audioEngine?.stop()
            self.audioEngine?.inputNode.removeTap(onBus: 0)
            self.audioFile = nil
            
            do {
                try AVAudioSession.sharedInstance().setActive(false)
            } catch {
                print("⚠️ Error deactivating audio session: \(error)")
            }
            
            self.isRecording = false
            print("✅ LiveAudioRecorder: Recording stopped")
            resolve(true)
        }
    }
    
    // Get current chunk file
    @objc
    func getCurrentChunk(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            guard self.isRecording, let tempFileURL = self.tempFileURL else {
                reject("NOT_RECORDING", "Not currently recording", nil)
                return
            }
            
            // Create a copy of the current chunk
            let chunkURL = FileManager.default.temporaryDirectory.appendingPathComponent("chunk_\(self.chunkCounter)_\(UUID().uuidString).m4a")
            
            do {
                if FileManager.default.fileExists(atPath: tempFileURL.path) {
                    try FileManager.default.copyItem(at: tempFileURL, to: chunkURL)
                    resolve(chunkURL.path)
                } else {
                    reject("NO_CHUNK", "No audio chunk available", nil)
                }
            } catch {
                reject("COPY_ERROR", "Failed to copy chunk: \(error.localizedDescription)", error)
            }
        }
    }
    
    // Process current chunk and start new one
    private func processChunk() {
        guard isRecording, let tempFileURL = self.tempFileURL else {
            return
        }
        
        // Get current chunk
        let chunkURL = FileManager.default.temporaryDirectory.appendingPathComponent("chunk_\(chunkCounter)_\(UUID().uuidString).m4a")
        
        do {
            // Copy current file
            if FileManager.default.fileExists(atPath: tempFileURL.path) {
                try FileManager.default.copyItem(at: tempFileURL, to: chunkURL)
                
                // Send chunk to JavaScript via event
                DispatchQueue.main.async {
                    self.sendEvent(withName: "onAudioChunk", body: [
                        "chunkPath": chunkURL.path,
                        "chunkNumber": self.chunkCounter
                    ])
                }
                
                // Reset for next chunk
                chunkCounter += 1
                
                // Remove old file and create new one
                try? FileManager.default.removeItem(at: tempFileURL)
                
                let audioEngine = self.audioEngine
                let inputNode = self.inputNode
                guard let engine = audioEngine, let node = inputNode else {
                    return
                }
                
                let recordingFormat = node.outputFormat(forBus: 0)
                let sampleRate = recordingFormat.sampleRate
                let audioFileSettings: [String: Any] = [
                    AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
                    AVSampleRateKey: sampleRate,
                    AVNumberOfChannelsKey: 1,
                    AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
                ]
                
                self.audioFile = try AVAudioFile(forWriting: tempFileURL, settings: audioFileSettings)
                
                print("✅ LiveAudioRecorder: Processed chunk \(chunkCounter - 1), starting new chunk")
            }
        } catch {
            print("❌ LiveAudioRecorder: Error processing chunk: \(error)")
        }
    }
    
    private func startChunkTimer() {
        stopChunkTimer()
        chunkTimer = Timer.scheduledTimer(withTimeInterval: chunkInterval, repeats: true) { [weak self] _ in
            self?.processChunk()
        }
    }
    
    private func stopChunkTimer() {
        chunkTimer?.invalidate()
        chunkTimer = nil
    }
}
