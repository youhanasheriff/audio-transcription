"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, FileAudio, Loader2, Mic, Square, Play, Pause } from "lucide-react"

export default function AudioTranscription() {
  const [mounted, setMounted] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [transcription, setTranscription] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false)
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop())
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [audioStream])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // List of supported audio formats by Groq
      const supportedFormats = [
        "audio/flac",
        "audio/mp3",
        "audio/mpeg",
        "audio/mp4",
        "audio/m4a",
        "audio/ogg",
        "audio/opus",
        "audio/wav",
        "audio/webm",
        "audio/x-flac",
        "audio/x-wav",
      ]

      // Also check file extensions as backup
      const supportedExtensions = ["flac", "mp3", "mp4", "mpeg", "mpga", "m4a", "ogg", "opus", "wav", "webm"]
      const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase()

      const isValidType =
        supportedFormats.includes(selectedFile.type) || (fileExtension && supportedExtensions.includes(fileExtension))

      if (isValidType) {
        setFile(selectedFile)
        setError("")
      } else {
        setError(`Unsupported file format. Please select one of: ${supportedExtensions.join(", ")}`)
        setFile(null)
      }
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setAudioStream(stream)
      
      const recorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }
      
      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' })
        setRecordedAudio(audioBlob)
        
        // Create a File object from the blob
        const audioFile = new File([audioBlob], `recording-${Date.now()}.wav`, {
          type: 'audio/wav'
        })
        setFile(audioFile)
      }
      
      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
      setRecordingTime(0)
      
      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
    } catch (err) {
      setError('Failed to access microphone. Please check permissions.')
    }
  }
  
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
    }
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop())
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    setIsRecording(false)
    setMediaRecorder(null)
    setAudioStream(null)
  }
  
  const playRecording = () => {
    if (recordedAudio && audioRef.current) {
      const audioUrl = URL.createObjectURL(recordedAudio)
      audioRef.current.src = audioUrl
      audioRef.current.play()
      setIsPlaying(true)
      
      audioRef.current.onended = () => {
        setIsPlaying(false)
        URL.revokeObjectURL(audioUrl)
      }
    }
  }
  
  const pauseRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleTranscribe = async () => {
    if (!file) return

    setIsLoading(true)
    setError("")
    setTranscription("")

    try {
      const formData = new FormData()
      formData.append("audio", file)

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to transcribe audio")
      }

      const data = await response.json()
      setTranscription(data.text)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyToClipboard = async () => {
    if (mounted && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(transcription)
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement("textarea")
        textArea.value = transcription
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)
      }
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Audio Transcription</h1>
            <p className="text-gray-600">Upload an audio file and get it transcribed using Groq AI</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileAudio className="w-5 h-5" />
                Upload Audio File
              </CardTitle>
              <CardDescription>Loading...</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse space-y-4">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Audio Transcription</h1>
          <p className="text-gray-600">Upload an audio file and get it transcribed using Groq AI</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileAudio className="w-5 h-5" />
              Audio Input
            </CardTitle>
            <CardDescription>Upload an audio file or record directly from your microphone</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload File</TabsTrigger>
                <TabsTrigger value="record">Record Audio</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="audio-file">Choose Audio File</Label>
                  <Input
                    id="audio-file"
                    type="file"
                    accept=".flac,.mp3,.mp4,.mpeg,.mpga,.m4a,.ogg,.opus,.wav,.webm,audio/*"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="record" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    {!isRecording ? (
                      <Button
                        onClick={startRecording}
                        disabled={isLoading}
                        className="bg-red-500 hover:bg-red-600 text-white"
                        size="lg"
                      >
                        <Mic className="w-5 h-5 mr-2" />
                        Start Recording
                      </Button>
                    ) : (
                      <div className="flex flex-col items-center space-y-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-lg font-mono">{formatTime(recordingTime)}</span>
                          </div>
                        </div>
                        <Button
                          onClick={stopRecording}
                          className="bg-gray-500 hover:bg-gray-600 text-white"
                          size="lg"
                        >
                          <Square className="w-5 h-5 mr-2" />
                          Stop Recording
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {recordedAudio && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-green-800">
                          <FileAudio className="w-4 h-4" />
                          <span className="font-medium">Recording completed</span>
                        </div>
                        <Button
                          onClick={isPlaying ? pauseRecording : playRecording}
                          variant="outline"
                          size="sm"
                        >
                          {isPlaying ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <audio ref={audioRef} className="hidden" />
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            
            {file && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <FileAudio className="w-4 h-4" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-blue-600">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <Button onClick={handleTranscribe} disabled={!file || isLoading} className="w-full mt-4">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Transcribing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Transcribe Audio
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {transcription && (
          <Card>
            <CardHeader>
              <CardTitle>Transcription Result</CardTitle>
              <CardDescription>{"Here's the transcribed text from your audio file"}</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={transcription}
                readOnly
                className="min-h-[200px] resize-none"
                placeholder="Transcribed text will appear here..."
              />
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={handleCopyToClipboard}>
                  Copy to Clipboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
