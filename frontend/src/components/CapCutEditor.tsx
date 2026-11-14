import React, { useState, useEffect, useRef } from 'react'
import {
  Play, Pause, RotateCcw, Volume2, VolumeX, Maximize,
  Scissors, Sparkles, Type, Video, Download, Check, Copy,
  Clock, ArrowLeft, RefreshCw, Eye, EyeOff, CheckCircle2, AlertCircle,
  Sliders, Share2, Layers, Flame, Trash2, Plus, Move, ZoomIn, ZoomOut,
  AlignLeft, AlignCenter, AlignRight, Edit2, Undo, Palette, Music, Mic,
  MicOff, ShieldCheck, Crown, Zap, Radio, Smile, Info, ChevronRight,
  Smartphone, Volume1, Keyboard, X
} from 'lucide-react'
import {
  YouTubeIcon, TikTokIcon, InstagramIcon, FacebookIcon, XTwitterIcon,
  PlatformBadge
} from './SocialIcons'

export interface ClipItem {
  id: number
  video_id: number
  user_id?: number | null
  title: string
  start_time: number
  end_time: number
  aspect_ratio: string
  file_path: string | null
  thumbnail_path: string | null
  status: string
  caption_style: string
  created_at: string
  volume_level?: number
  remove_silence?: boolean
  watermark?: boolean
  watermark_text?: string
  transition?: string
  bg_music?: string
  bg_music_volume?: number
}

interface TranscriptWord {
  word: string
  start: number
  end: number
  abs_start?: number
  abs_end?: number
}

interface TranscriptSegment {
  id: number
  text: string
  start: number
  end: number
  abs_start?: number
  abs_end?: number
  words: TranscriptWord[]
}

interface ClipTranscriptData {
  clip_id: number
  video_id: number
  title: string
  start_time: number
  end_time: number
  duration: number
  aspect_ratio: string
  caption_style: string
  full_text: string
  segments: TranscriptSegment[]
}

export interface EditableSegment extends TranscriptSegment {
  erased?: boolean
}

export interface CustomTextOverlay {
  id: string
  text: string
  start_time: number
  end_time: number
  position_y: number // % from top (0 - 100)
  position_x: 'left' | 'center' | 'right'
  font_size: number // px (e.g. 24 to 90)
  color: 'yellow' | 'white' | 'red' | 'cyan' | 'purple' | 'green'
  burn: boolean
  erased?: boolean
}

interface CapCutEditorProps {
  clip: ClipItem
  onClose: () => void
  onClipUpdated: (updatedClip: ClipItem) => void
}

const parseAspectRatio = (raw: string | undefined | null): '9:16' | '16:9' | '1:1' => {
  if (!raw) return '9:16'
  const str = String(raw).toLowerCase()
  if (str.includes('16:9')) return '16:9'
  if (str.includes('1:1')) return '1:1'
  return '9:16'
}

const VIRAL_STICKERS = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '😱', label: 'Shock' },
  { emoji: '💡', label: 'Insight' },
  { emoji: '👑', label: 'Crown' },
  { emoji: '💯', label: '100%' },
  { emoji: '🎯', label: 'Target' },
  { emoji: '⭐', label: 'Star' },
  { emoji: '🚀', label: 'Rocket' },
  { emoji: '👇', label: 'Look Down' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '💥', label: 'Boom' },
  { emoji: '⚠️', label: 'Warning' },
  { emoji: '👀', label: 'Eyes' },
  { emoji: '🚨', label: 'Alert' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '🙌', label: 'Praise' }
]

export function CapCutEditor({ clip, onClose, onClipUpdated }: CapCutEditorProps) {
  // Player state
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [duration, setDuration] = useState<number>(clip.end_time - clip.start_time)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [playbackRate, setPlaybackRate] = useState<number>(1)
  const [isLooping, setIsLooping] = useState<boolean>(true)
  const [videoCacheBuster, setVideoCacheBuster] = useState<number>(Date.now())

  // Editor configuration state
  const [trimStart, setTrimStart] = useState<number>(clip.start_time)
  const [trimEnd, setTrimEnd] = useState<number>(clip.end_time)
  const [clipTitle, setClipTitle] = useState<string>(clip.title)
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>(() => parseAspectRatio(clip.aspect_ratio))
  const [captionStyle, setCaptionStyle] = useState<string>(clip.caption_style || 'word_red')
  const [framingMode, setFramingMode] = useState<'smart_face' | 'blur' | 'crop'>('smart_face')
  const [resolution, setResolution] = useState<'4k' | '1080p' | '720p' | '480p'>('1080p')
  const [burnCaptions, setBurnCaptions] = useState<boolean>(true)

  // 5 Master Editor Sidebar Tabs:
  // 1. transcript (Captions)
  // 2. overlays (Text & Stickers)
  // 3. audio (Audio & Voice)
  // 4. styling (Framing & Style)
  // 5. export (Export & Social)
  const [editorTab, setEditorTab] = useState<'transcript' | 'overlays' | 'audio' | 'styling' | 'export'>('transcript')

  // Text position & scale state
  const [textPositionY, setTextPositionY] = useState<number>(42) // 42% from top (center-chest for vertical reels)
  const [fontSizeScale, setFontSizeScale] = useState<number>(1.0)
  const [showOverlayPreview, setShowOverlayPreview] = useState<boolean>(true)

  // Transcript & Segment Editing state
  const [transcriptData, setTranscriptData] = useState<ClipTranscriptData | null>(null)
  const [segments, setSegments] = useState<EditableSegment[]>([])
  const [editingSegmentId, setEditingSegmentId] = useState<number | null>(null)
  const [editingSegmentText, setEditingSegmentText] = useState<string>('')
  const [isLoadingTranscript, setIsLoadingTranscript] = useState<boolean>(true)
  const [isEditingText, setIsEditingText] = useState<boolean>(false)
  const [editedFullText, setEditedFullText] = useState<string>('')

  // Custom Text Overlays (Headlines, hooks, stickers)
  const [customOverlays, setCustomOverlays] = useState<CustomTextOverlay[]>([])
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null)

  // Audio, Voiceover & Transitions State
  const [volumeLevel, setVolumeLevel] = useState<number>(clip.volume_level ? Math.round(clip.volume_level * 100) : 100)
  const [vocalBoost, setVocalBoost] = useState<boolean>(true)
  const [removeSilence, setRemoveSilence] = useState<boolean>(clip.remove_silence || false)
  const [bgMusic, setBgMusic] = useState<string>(clip.bg_music || 'none')
  const [bgMusicVolume, setBgMusicVolume] = useState<number>(clip.bg_music_volume ? Math.round(clip.bg_music_volume * 100) : 25)
  const [transition, setTransition] = useState<string>(clip.transition || 'none')
  const [watermark, setWatermark] = useState<boolean>(clip.watermark ?? true)
  const [watermarkText, setWatermarkText] = useState<string>(clip.watermark_text || 'Prune Master AI')

  // AI Voiceover (TTS) & Mic Voiceover State
  const [ttsScript, setTtsScript] = useState<string>('')
  const [isSpeakingTts, setIsSpeakingTts] = useState<boolean>(false)
  const [isRecordingMic, setIsRecordingMic] = useState<boolean>(false)
  const [recordedMicUrl, setRecordedMicUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const micAudioChunksRef = useRef<Blob[]>([])

  // Render job state
  const [isRendering, setIsRendering] = useState<boolean>(false)
  const [renderProgress, setRenderProgress] = useState<number>(0)
  const [renderMessage, setRenderMessage] = useState<string>('')
  const [renderError, setRenderError] = useState<string | null>(null)
  const [renderSuccess, setRenderSuccess] = useState<boolean>(false)

  // Social metadata state
  const [metadata, setMetadata] = useState<any | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'x'>('youtube')
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false)
  const [shortcutToast, setShortcutToast] = useState<string | null>(null)

  // Format seconds to MM:SS.cc
  const formatTimecode = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    const ms = Math.floor((sec % 1) * 10)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`
  }

  // Load Transcript & Metadata
  useEffect(() => {
    let isMounted = true
    const fetchTranscript = async () => {
      setIsLoadingTranscript(true)
      try {
        const res = await fetch(`/api/clips/${clip.id}/transcript`)
        if (res.ok) {
          const data: ClipTranscriptData = await res.json()
          if (isMounted) {
            setTranscriptData(data)
            setEditedFullText(data.full_text)
            if (data.segments && data.segments.length > 0) {
              setSegments(data.segments.map(s => ({
                ...s,
                erased: false
              })))
            } else {
              setSegments([])
            }
          }
        }
      } catch (err) {
        console.error('Failed to load clip transcript:', err)
      } finally {
        if (isMounted) setIsLoadingTranscript(false)
      }
    }

    const fetchMetadata = async () => {
      try {
        const res = await fetch(`/api/clips/${clip.id}/metadata`)
        if (res.ok) {
          const data = await res.json()
          if (isMounted) setMetadata(data)
        }
      } catch (err) {
        console.error('Failed to load clip metadata:', err)
      }
    }

    fetchTranscript()
    fetchMetadata()

    // Sync editor controls with active clip
    setTrimStart(clip.start_time)
    setTrimEnd(clip.end_time)
    setClipTitle(clip.title)
    setAspectRatio(parseAspectRatio(clip.aspect_ratio))
    setCaptionStyle(clip.caption_style || 'word_red')
    setVolumeLevel(clip.volume_level ? Math.round(clip.volume_level * 100) : 100)
    setRemoveSilence(clip.remove_silence || false)
    setBgMusic(clip.bg_music || 'none')
    setBgMusicVolume(clip.bg_music_volume ? Math.round(clip.bg_music_volume * 100) : 25)
    setTransition(clip.transition || 'none')
    setWatermark(clip.watermark ?? true)
    setWatermarkText(clip.watermark_text || 'Prune Master AI')
    setRenderError(null)
    setRenderSuccess(false)
    setVideoCacheBuster(Date.now())

    return () => { isMounted = false }
  }, [clip.id])

  // Video time update listener
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  // Play / Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  // Seek video
  const seekTo = (sec: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, sec))
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  // Step backward / forward
  const stepTime = (delta: number) => {
    seekTo(currentTime + delta)
  }

  // Speed change
  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed)
    if (videoRef.current) {
      videoRef.current.playbackRate = speed
    }
  }

  // Copy to clipboard helper
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2500)
  }

  // Web Audio SFX Player (Zero external assets required, 100% reliable)
  const playSoundEffect = (type: 'whoosh' | 'bell' | 'pop' | 'camera') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      const now = ctx.currentTime

      if (type === 'whoosh') {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(160, now)
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.12)
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.28)
        gain.gain.setValueAtTime(0.01, now)
        gain.gain.linearRampToValueAtTime(0.35, now + 0.12)
        gain.gain.linearRampToValueAtTime(0.01, now + 0.28)
        osc.start(now)
        osc.stop(now + 0.28)
      } else if (type === 'bell') {
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(987.77, now)
        gain.gain.setValueAtTime(0.25, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7)
        osc.start(now)
        osc.stop(now + 0.7)
      } else if (type === 'pop') {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(580, now)
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.07)
        gain.gain.setValueAtTime(0.4, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07)
        osc.start(now)
        osc.stop(now + 0.07)
      } else if (type === 'camera') {
        osc.type = 'square'
        osc.frequency.setValueAtTime(1100, now)
        gain.gain.setValueAtTime(0.25, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05)
        osc.start(now)
        osc.stop(now + 0.05)
      }
    } catch (err) {
      console.warn('AudioContext SFX notice:', err)
    }
  }

  // AI Voiceover (TTS) browser preview
  const handlePreviewTts = () => {
    const textToRead = ttsScript.trim() || editedFullText.slice(0, 160) || clipTitle
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.')
      return
    }
    if (isSpeakingTts) {
      window.speechSynthesis.cancel()
      setIsSpeakingTts(false)
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(textToRead)
    utterance.rate = 1.05
    utterance.pitch = 1.0
    utterance.onend = () => setIsSpeakingTts(false)
    utterance.onerror = () => setIsSpeakingTts(false)
    setIsSpeakingTts(true)
    window.speechSynthesis.speak(utterance)
  }

  // Microphone Voiceover Recording
  const handleToggleMicRecord = async () => {
    if (isRecordingMic) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      setIsRecordingMic(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        micAudioChunksRef.current = []
        const recorder = new MediaRecorder(stream)
        mediaRecorderRef.current = recorder

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) micAudioChunksRef.current.push(e.data)
        }

        recorder.onstop = () => {
          const audioBlob = new Blob(micAudioChunksRef.current, { type: 'audio/webm' })
          const url = URL.createObjectURL(audioBlob)
          setRecordedMicUrl(url)
          stream.getTracks().forEach(track => track.stop())
        }

        recorder.start()
        setIsRecordingMic(true)
      } catch (err) {
        console.error('Microphone error:', err)
        alert('Could not access microphone. Please allow microphone permissions in your browser.')
      }
    }
  }

  // Native Direct Social Share Sheet
  const handleDirectShare = async () => {
    const shareUrl = window.location.origin + `/api/clips/${clip.id}/download`
    const title = metadata?.platforms?.[selectedPlatform]?.title || clipTitle || 'Watch this viral short!'
    const text = metadata?.platforms?.[selectedPlatform]?.description || `Check out this 9:16 short mined with Prune Master AI: ${clipTitle}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text,
          url: shareUrl
        })
      } catch (err) {
        if ((err as any).name !== 'AbortError') {
          copyToClipboard(shareUrl, 'direct_share_link')
        }
      }
    } else {
      copyToClipboard(shareUrl, 'direct_share_link')
    }
  }

  // Segment Handlers
  const handleToggleEraseSegment = (id: number) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, erased: !s.erased } : s))
  }

  const handleToggleEraseAllSegments = () => {
    const allErased = segments.length > 0 && segments.every(s => s.erased)
    setSegments(prev => prev.map(s => ({ ...s, erased: !allErased })))
  }

  const handleStartEditSegment = (seg: EditableSegment) => {
    setEditingSegmentId(seg.id)
    setEditingSegmentText(seg.text)
  }

  const handleSaveSegmentEdit = (id: number) => {
    setSegments(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, text: editingSegmentText }
      }
      return s
    }))
    setEditingSegmentId(null)
  }

  const handleCancelSegmentEdit = () => {
    setEditingSegmentId(null)
  }

  // Custom Text & Sticker Overlay Handlers
  const handleAddCustomOverlay = (presetText: string = 'VIRAL HOOK 🔥', initialPosY: number = 25, fontSize: number = 42) => {
    const newId = `txt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    const newOverlay: CustomTextOverlay = {
      id: newId,
      text: presetText,
      start_time: 0,
      end_time: Math.round(duration || 60),
      position_y: initialPosY,
      position_x: 'center',
      font_size: fontSize,
      color: 'yellow',
      burn: true,
      erased: false
    }
    setCustomOverlays(prev => [...prev, newOverlay])
    setSelectedOverlayId(newId)
    setEditorTab('overlays')
  }

  const handleAddSticker = (stickerEmoji: string) => {
    handleAddCustomOverlay(stickerEmoji, 50, 56)
  }

  const handleUpdateOverlay = (id: string, updates: Partial<CustomTextOverlay>) => {
    setCustomOverlays(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o))
  }

  const handleDeleteOverlay = (id: string) => {
    setCustomOverlays(prev => prev.filter(o => o.id !== id))
    if (selectedOverlayId === id) setSelectedOverlayId(null)
  }

  const handleToggleEraseOverlay = (id: string) => {
    setCustomOverlays(prev => prev.map(o => o.id === id ? { ...o, erased: !o.erased } : o))
  }

  // Trigger Re-Render with User's Edits
  const handleTriggerReRender = async () => {
    if (trimEnd <= trimStart) {
      setRenderError('End time must be greater than start time')
      return
    }

    setIsRendering(true)
    setRenderProgress(10)
    setRenderMessage('Master Editor Studio: Initializing render engine...')
    setRenderError(null)
    setRenderSuccess(false)

    try {
      const cleanRatio = parseAspectRatio(aspectRatio)
      const queryParams = new URLSearchParams({
        framing_mode: framingMode,
        burn_captions: burnCaptions.toString(),
        caption_style: captionStyle,
        resolution: resolution,
        aspect_ratio: cleanRatio,
        start_time: Math.max(0, trimStart).toFixed(2),
        end_time: Math.max(0.1, trimEnd).toFixed(2),
        title: clipTitle.trim(),
        text_position: `${textPositionY}%`,
        font_size_scale: fontSizeScale.toString(),
        volume_level: (volumeLevel / 100).toString(),
        vocal_boost: vocalBoost.toString(),
        remove_silence: removeSilence.toString(),
        watermark: watermark.toString(),
        watermark_text: watermarkText.trim(),
        transition: transition,
        bg_music: bgMusic,
        bg_music_volume: (bgMusicVolume / 100).toString()
      })

      const renderPayload = {
        framing_mode: framingMode,
        burn_captions: burnCaptions,
        caption_style: captionStyle,
        resolution: resolution,
        aspect_ratio: cleanRatio,
        start_time: Math.max(0, trimStart),
        end_time: Math.max(0.1, trimEnd),
        title: clipTitle.trim(),
        text_position: `${textPositionY}%`,
        font_size_scale: fontSizeScale,
        volume_level: volumeLevel / 100,
        vocal_boost: vocalBoost,
        remove_silence: removeSilence,
        watermark: watermark,
        watermark_text: watermarkText.trim(),
        transition: transition,
        bg_music: bgMusic,
        bg_music_volume: bgMusicVolume / 100,
        overlays: customOverlays.filter(o => !o.erased),
        edited_segments: segments
      }

      const res = await fetch(`/api/clips/${clip.id}/render?${queryParams.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(renderPayload)
      })

      if (!res.ok) {
        let errorMsg = 'Render initiation failed'
        try {
          const err = await res.json()
          if (res.status === 402) {
            errorMsg = 'Trial Limit Reached: 10 free renders used. Upgrade to Prune Master Pro for unlimited 4K renders.'
          } else if (typeof err.detail === 'string') {
            errorMsg = err.detail
          } else if (Array.isArray(err.detail)) {
            errorMsg = err.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
          } else if (err.message) {
            errorMsg = err.message
          }
        } catch {}
        throw new Error(errorMsg)
      }

      const job = await res.json()

      // Poll job progress
      const pollInterval = setInterval(async () => {
        try {
          const jRes = await fetch(`/api/jobs/${job.id}`)
          if (jRes.ok) {
            const jData = await jRes.json()
            setRenderProgress(jData.progress || 20)
            setRenderMessage(jData.message || 'Processing clip with Master Editor options...')

            if (jData.status === 'completed') {
              clearInterval(pollInterval)
              setIsRendering(false)
              setRenderSuccess(true)
              setRenderProgress(100)
              setRenderMessage('Master Editor: Short rendered and ready in gallery!')

              // Fetch updated clip
              const cRes = await fetch(`/api/clips/${clip.id}`)
              if (cRes.ok) {
                const updated: ClipItem = await cRes.json()
                setVideoCacheBuster(Date.now())
                onClipUpdated(updated)
                if (videoRef.current) {
                  videoRef.current.load()
                }
              }
            } else if (jData.status === 'failed') {
              clearInterval(pollInterval)
              setIsRendering(false)
              setRenderError(jData.message || 'Rendering failed')
            }
          }
        } catch (pollErr) {
          console.error('Job polling error:', pollErr)
        }
      }, 1500)
    } catch (err: any) {
      setIsRendering(false)
      setRenderError(err.message || 'Failed to submit render job')
    }
  }

  // Active word detection for karaoke transcript highlight
  const isWordActive = (wordStart: number, wordEnd: number) => {
    return currentTime >= wordStart && currentTime <= wordEnd
  }

  const isSegmentActive = (segStart: number, segEnd: number) => {
    return currentTime >= segStart && currentTime <= segEnd
  }

  // Shortcut Notification Helper
  const showToast = (msg: string) => {
    setShortcutToast(msg)
    setTimeout(() => {
      setShortcutToast(prev => prev === msg ? null : prev)
    }, 2000)
  }

  // Keyboard Shortcuts Listener for Master Video Editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable)

      // Always allow Escape to close shortcuts modal or cleanly go back once
      if (e.key === 'Escape') {
        e.preventDefault()
        if (showShortcutsModal) {
          setShowShortcutsModal(false)
        } else {
          onClose()
        }
        return
      }

      // Quick Re-Render: Ctrl+S, Cmd+S, or Ctrl+Enter
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.key === 'Enter')) {
        e.preventDefault()
        handleTriggerReRender()
        showToast('⚡ Quick Re-Render Triggered!')
        return
      }

      // If user is actively typing inside an input field or textarea, do NOT hijack typing
      if (isInputFocused) {
        return
      }

      // Help Modal: ? or Shift+/
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setShowShortcutsModal(prev => !prev)
        return
      }

      // Play / Pause: Space or K
      if (e.code === 'Space' || e.key === ' ' || e.key === 'k' || e.key === 'K') {
        e.preventDefault()
        togglePlay()
        showToast(isPlaying ? '⏸️ Paused' : '▶️ Playing')
        return
      }

      // Cut / Split at Playhead: C or S
      if (e.key === 'c' || e.key === 'C' || e.key === 's' || e.key === 'S') {
        e.preventDefault()
        playSoundEffect('pop')
        const absTime = clip.start_time + currentTime
        if (absTime < trimEnd - 0.5) {
          setTrimStart(absTime)
          showToast(`✂️ Cut: In-Point Set to ${formatTimecode(absTime)}`)
        } else {
          showToast(`✂️ Playhead at ${formatTimecode(absTime)}`)
        }
        return
      }

      // Set In-point: [ or I
      if (e.key === '[' || e.key === 'i' || e.key === 'I') {
        e.preventDefault()
        playSoundEffect('pop')
        const newStart = Math.min(clip.start_time + currentTime, trimEnd - 0.5)
        setTrimStart(newStart)
        showToast(`🎬 In-Point Set: ${formatTimecode(newStart)}`)
        return
      }

      // Set Out-point: ] or O
      if (e.key === ']' || e.key === 'o' || e.key === 'O') {
        e.preventDefault()
        playSoundEffect('pop')
        const newEnd = Math.max(clip.start_time + currentTime, trimStart + 0.5)
        setTrimEnd(newEnd)
        showToast(`🎬 Out-Point Set: ${formatTimecode(newEnd)}`)
        return
      }

      // Left / Right Arrow or J / L for scrubbing
      if (e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
        e.preventDefault()
        const step = e.shiftKey ? 5 : 1
        seekTo(Math.max(0, currentTime - step))
        return
      }
      if (e.key === 'ArrowRight' || e.key === 'l' || e.key === 'L') {
        e.preventDefault()
        const step = e.shiftKey ? 5 : 1
        seekTo(Math.min(duration, currentTime + step))
        return
      }

      // Mute / Unmute: M
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        setIsMuted(prev => {
          showToast(!prev ? '🔇 Muted' : '🔊 Unmuted')
          return !prev
        })
        return
      }

      // Quick Add Text Overlay: T
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        playSoundEffect('pop')
        handleAddCustomOverlay('🔥 VIRAL HOOK', 50, 42)
        setEditorTab('overlays')
        showToast('📝 Text Overlay Added!')
        return
      }

      // Delete / Erase: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        if (selectedOverlayId) {
          handleDeleteOverlay(selectedOverlayId)
          showToast('🗑️ Overlay Deleted')
        } else {
          const activeSeg = segments.find(s => isSegmentActive(s.start, s.end))
          if (activeSeg) {
            handleToggleEraseSegment(activeSeg.id)
            showToast(activeSeg.erased ? '✨ Restored Subtitle' : '🚫 Subtitle Erased')
          }
        }
        return
      }

      // Switch Tabs: 1 to 5
      if (e.key === '1') { setEditorTab('transcript'); showToast('Tab: Captions'); return }
      if (e.key === '2') { setEditorTab('overlays'); showToast('Tab: Text & Stickers'); return }
      if (e.key === '3') { setEditorTab('audio'); showToast('Tab: Audio & Voice'); return }
      if (e.key === '4') { setEditorTab('styling'); showToast('Tab: Framing & Styling'); return }
      if (e.key === '5') { setEditorTab('export'); showToast('Tab: Export & Social'); return }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    isPlaying,
    currentTime,
    duration,
    trimStart,
    trimEnd,
    clip,
    selectedOverlayId,
    segments,
    showShortcutsModal,
    onClose
  ])

  // Trim duration calculation
  const currentTrimDuration = Math.max(0.1, trimEnd - trimStart)

  return (
    <div className="fixed inset-0 z-50 bg-[#090a10]/95 backdrop-blur-2xl flex flex-col text-white overflow-hidden animate-in fade-in duration-200">
      {/* TOP MASTER EDITOR STUDIO HEADER */}
      <header className="h-16 px-4 sm:px-6 border-b border-[#202230] bg-[#0d0e17] flex items-center justify-between shrink-0 gap-3">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all text-xs font-semibold cursor-pointer border border-zinc-700/60 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
              <Scissors className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={clipTitle}
                  onChange={(e) => setClipTitle(e.target.value)}
                  className="bg-transparent text-sm font-bold text-white focus:bg-[#151624] px-1.5 py-0.5 rounded border border-transparent focus:border-purple-500/60 focus:outline-none max-w-[200px] sm:max-w-md truncate"
                  title="Click to edit clip title"
                />
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60 shrink-0 hidden sm:inline-block">
                  Master Editor
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 pl-1.5 truncate">
                Trim: <span className="font-mono text-purple-300">{formatTimecode(trimStart)}</span> &rarr; <span className="font-mono text-purple-300">{formatTimecode(trimEnd)}</span> ({currentTrimDuration.toFixed(1)}s)
              </p>
            </div>
          </div>
        </div>

        {/* Quick Platform Shortcuts & Primary Re-Render CTA */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Platform Quick Badges */}
          <div className="hidden xl:flex items-center gap-1 bg-[#141522] p-1 rounded-xl border border-[#27293d]">
            <button
              onClick={() => { setAspectRatio('9:16'); setSelectedPlatform('tiktok'); setEditorTab('export') }}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-cyan-400 transition-colors"
              title="Optimize for TikTok"
            >
              <TikTokIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setAspectRatio('9:16'); setSelectedPlatform('instagram'); setEditorTab('export') }}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-pink-400 transition-colors"
              title="Optimize for Instagram Reels"
            >
              <InstagramIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setAspectRatio('9:16'); setSelectedPlatform('youtube'); setEditorTab('export') }}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-red-500 transition-colors"
              title="Optimize for YouTube Shorts"
            >
              <YouTubeIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setAspectRatio('9:16'); setSelectedPlatform('facebook'); setEditorTab('export') }}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-blue-400 transition-colors"
              title="Optimize for Facebook Reels"
            >
              <FacebookIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setAspectRatio('16:9'); setSelectedPlatform('x'); setEditorTab('export') }}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-200 transition-colors"
              title="Optimize for X"
            >
              <XTwitterIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Keyboard Shortcuts Trigger Button */}
          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141522] hover:bg-[#1f2136] border border-[#27293d] text-zinc-300 hover:text-white transition-all text-xs font-semibold cursor-pointer shrink-0"
            title="View Keyboard Shortcuts (or press ?)"
          >
            <Keyboard className="h-4 w-4 text-purple-400" />
            <span className="hidden sm:inline">Shortcuts</span>
            <span className="text-[10px] px-1 rounded bg-zinc-800 text-zinc-400 font-mono">?</span>
          </button>

          {/* Primary Re-Render / Export Button */}
          <button
            onClick={handleTriggerReRender}
            disabled={isRendering}
            className="flex items-center gap-2 px-3.5 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30 transition-all cursor-pointer transform hover:scale-[1.02] disabled:opacity-50"
          >
            {isRendering ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Rendering {renderProgress}%...</span>
                <span className="sm:hidden">{renderProgress}%</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span className="hidden sm:inline">⚡ Re-Render with Edits</span>
                <span className="sm:hidden">⚡ Render</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* RENDER PROGRESS TOAST */}
      {isRendering && (
        <div className="bg-gradient-to-r from-purple-950/90 via-indigo-950/90 to-purple-950/90 border-b border-purple-500/40 px-4 sm:px-6 py-2 flex items-center justify-between text-xs animate-pulse">
          <div className="flex items-center gap-2 text-purple-200 truncate">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-purple-400 shrink-0" />
            <span className="truncate">{renderMessage}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-28 sm:w-48 bg-zinc-800 rounded-full h-2 overflow-hidden border border-purple-500/30">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300"
                style={{ width: `${renderProgress}%` }}
              />
            </div>
            <span className="font-mono text-purple-300 font-bold">{renderProgress}%</span>
          </div>
        </div>
      )}

      {renderSuccess && (
        <div className="bg-emerald-950/90 border-b border-emerald-500/40 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{renderMessage} Your audio, watermark, captions & edits are burned into the MP4.</span>
          </div>
          <button
            onClick={() => setRenderSuccess(false)}
            className="text-emerald-400 hover:text-white font-bold ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {renderError && (
        <div className="bg-rose-950/90 border-b border-rose-500/40 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>Render Notice: {renderError}</span>
          </div>
          <button
            onClick={() => setRenderError(null)}
            className="text-rose-400 hover:text-white font-bold ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* MAIN WORKSPACE: 2-COLUMN (LEFT PLAYER + TIMELINE, RIGHT 5-TAB STUDIO) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* ===================================================================== */}
        {/* LEFT COLUMN: VIDEO PLAYER + TIMELINE SCRUBBER (RESPONSIVE STICKY)     */}
        {/* ===================================================================== */}
        <div className="w-full lg:flex-1 flex flex-col bg-[#0b0c14] border-r border-[#1e202e] overflow-hidden max-h-[45vh] lg:max-h-full">
          {/* Top Video Canvas */}
          <div className="flex-1 relative flex items-center justify-center p-3 sm:p-4 bg-radial from-[#12131f] to-[#07080d] overflow-hidden">
            {/* Aspect Ratio Container */}
            <div
              className={`relative overflow-hidden rounded-2xl bg-black border-2 border-purple-500/30 shadow-2xl transition-all duration-300 flex items-center justify-center ${
                aspectRatio === '9:16'
                  ? 'h-full max-h-[520px] aspect-[9/16]'
                  : aspectRatio === '1:1'
                  ? 'h-full max-h-[440px] aspect-square'
                  : 'w-full max-w-[740px] aspect-[16/9]'
              }`}
            >
              {clip.file_path ? (
                <video
                  ref={videoRef}
                  src={`${clip.file_path}?t=${videoCacheBuster}`}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onClick={togglePlay}
                  loop={isLooping}
                  className="w-full h-full object-cover cursor-pointer"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-500 space-y-2">
                  <Video className="h-10 w-10 text-purple-500/50 animate-pulse" />
                  <p className="text-xs">Clip is pending render. Click Re-Render above to generate video.</p>
                </div>
              )}

              {/* Overlay Play/Pause Big Center Indicator when paused */}
              {!isPlaying && clip.file_path && (
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 m-auto h-14 w-14 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all transform hover:scale-110 shadow-2xl cursor-pointer"
                >
                  <Play className="h-6 w-6 text-purple-400 translate-x-0.5" />
                </button>
              )}

              {/* Floating Keyboard Shortcut Notification Toast */}
              {shortcutToast && (
                <div className="absolute top-4 inset-x-0 mx-auto w-max max-w-[90%] px-3.5 py-1.5 rounded-full bg-black/85 backdrop-blur-md border border-purple-500/60 text-white text-xs font-bold shadow-2xl flex items-center gap-2 pointer-events-none z-40 animate-in fade-in zoom-in-95 duration-150">
                  <Sparkles className="h-3.5 w-3.5 text-yellow-300 animate-spin" />
                  <span>{shortcutToast}</span>
                </div>
              )}

              {/* LIVE WATERMARK PREVIEW */}
              {watermark && (
                <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-mono text-zinc-300 border border-zinc-700/60 pointer-events-none z-30 flex items-center gap-1">
                  <span className="text-purple-400 font-bold">✨</span>
                  <span>{watermarkText || 'Prune Master AI'}</span>
                </div>
              )}

              {/* LIVE SUBTITLE CAPTION PREVIEW */}
              {showOverlayPreview && burnCaptions && (() => {
                const activeSeg = segments.find(
                  s => !s.erased && currentTime >= s.start && currentTime <= s.end
                )
                if (!activeSeg) return null

                const isWordPop = captionStyle.startsWith('word_') || captionStyle === 'default'

                // Find active word with smooth continuity so captions never jump back and forth
                let currentWordText = ''
                if (isWordPop && activeSeg.words && activeSeg.words.length > 0) {
                  const match = activeSeg.words.find(w => currentTime >= w.start && currentTime <= w.end)
                    || activeSeg.words.filter(w => w.start <= currentTime).slice(-1)[0]
                    || activeSeg.words[0]
                  currentWordText = match?.word || ''
                }

                const textColor = captionStyle === 'word_red'
                  ? '#ef4444'
                  : (captionStyle === 'word_yellow' || captionStyle === 'phrase_yellow')
                  ? '#facc15'
                  : '#ffffff'

                return (
                  <div
                    className="absolute pointer-events-none text-center px-4 select-none z-30 flex items-center justify-center min-h-[64px]"
                    style={{
                      top: `${textPositionY}%`,
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '92%'
                    }}
                  >
                    {isWordPop && currentWordText ? (
                      <span
                        className="inline-block font-black tracking-wide uppercase drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]"
                        style={{
                          fontSize: `${Math.round(28 * fontSizeScale)}px`,
                          color: textColor,
                          textShadow: '0 0 12px rgba(0,0,0,0.95), 0 2px 4px #000, 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
                          WebkitTextStroke: captionStyle === 'word_red' ? '1.5px #ffffff' : '1.5px #000000',
                          lineHeight: '1.2'
                        }}
                      >
                        {currentWordText}
                      </span>
                    ) : (
                      <span
                        className="inline-block font-bold tracking-wide leading-snug drop-shadow-[0_3px_8px_rgba(0,0,0,0.9)]"
                        style={{
                          fontSize: `${Math.round(18 * fontSizeScale)}px`,
                          color: textColor,
                          textShadow: '0 0 8px rgba(0,0,0,0.9), 1px 1px 2px #000, -1px -1px 2px #000',
                          background: captionStyle === 'phrase_purple' ? 'rgba(88, 28, 135, 0.75)' : 'rgba(0, 0, 0, 0.55)',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          backdropFilter: 'blur(4px)',
                          lineHeight: '1.3'
                        }}
                      >
                        {activeSeg.text}
                      </span>
                    )}
                  </div>
                )
              })()}

              {/* LIVE CUSTOM TEXT & STICKER OVERLAYS */}
              {showOverlayPreview && customOverlays.map((o) => {
                if (o.erased || currentTime < o.start_time || currentTime > o.end_time) return null

                const isSelected = selectedOverlayId === o.id
                const colorMap: Record<string, string> = {
                  yellow: '#facc15',
                  white: '#ffffff',
                  red: '#ef4444',
                  cyan: '#06b6d4',
                  purple: '#c084fc',
                  green: '#22c55e'
                }
                const colorCode = colorMap[o.color] || '#facc15'
                const leftPos = o.position_x === 'left' ? '18%' : o.position_x === 'right' ? '82%' : '50%'

                return (
                  <div
                    key={o.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedOverlayId(o.id)
                      setEditorTab('overlays')
                    }}
                    className={`absolute cursor-pointer transition-all duration-100 z-30 select-none text-center ${
                      isSelected ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-black/60 rounded px-2' : ''
                    }`}
                    style={{
                      top: `${o.position_y}%`,
                      left: leftPos,
                      transform: 'translate(-50%, -50%)',
                      maxWidth: '85%'
                    }}
                    title="Click to edit, move or resize"
                  >
                    <span
                      className="font-black uppercase tracking-wider drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)] block"
                      style={{
                        fontSize: `${Math.round(o.font_size * 0.45)}px`,
                        color: colorCode,
                        textShadow: '0 0 12px rgba(0,0,0,0.95), 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000'
                      }}
                    >
                      {o.text}
                    </span>
                    {isSelected && (
                      <span className="text-[9px] bg-purple-600 text-white px-1.5 py-0.2 rounded font-sans font-bold shadow">
                        Active ({o.position_y}% Y)
                      </span>
                    )}
                  </div>
                )
              })}

              {/* Canvas Overlay Controls (Top Right: Toggle Placed Text Preview & Quick Add) */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 z-40">
                <button
                  type="button"
                  onClick={() => setShowOverlayPreview(!showOverlayPreview)}
                  className={`p-1.5 rounded-lg text-xs backdrop-blur-md border transition-all cursor-pointer ${
                    showOverlayPreview
                      ? 'bg-purple-950/80 text-purple-200 border-purple-500/50 hover:bg-purple-900/80'
                      : 'bg-black/70 text-zinc-400 border-zinc-700 hover:text-white'
                  }`}
                  title={showOverlayPreview ? 'Hide live text & stickers' : 'Show live text & stickers'}
                >
                  {showOverlayPreview ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleAddCustomOverlay('VIRAL HOOK 🔥', 25)}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-600/90 hover:bg-purple-500 text-white backdrop-blur-md border border-purple-400/40 flex items-center gap-1 transition-all shadow-md cursor-pointer"
                  title="Add custom hook text"
                >
                  <Plus className="h-3 w-3" />
                  <span>Text</span>
                </button>
              </div>

              {/* Aspect Ratio Badge Overlay */}
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono text-purple-300 border border-purple-500/30 pointer-events-none">
                {aspectRatio === '9:16' ? '📱 9:16' : aspectRatio === '1:1' ? '🔳 1:1' : '🖥️ 16:9'}
              </div>

              {/* Live Timecode Overlay */}
              <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono text-zinc-300 border border-zinc-700 pointer-events-none">
                {formatTimecode(currentTime)} / {formatTimecode(duration)}
              </div>
            </div>
          </div>

          {/* Player Transport Bar */}
          <div className="h-11 sm:h-12 px-4 sm:px-6 bg-[#0f101a] border-t border-[#1e202e] flex items-center justify-between shrink-0">
            {/* Play, Step, Loop Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="p-1.5 sm:p-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors cursor-pointer shadow-md"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
              </button>

              <button
                onClick={() => stepTime(-5)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors text-xs"
                title="Rewind 5s"
              >
                -5s
              </button>
              <button
                onClick={() => stepTime(5)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors text-xs"
                title="Forward 5s"
              >
                +5s
              </button>

              <div className="h-4 w-px bg-zinc-800 mx-1 hidden sm:block" />

              {/* Speed Switcher */}
              <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono">
                {[1, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      playbackRate === speed
                        ? 'bg-purple-950 text-purple-300 font-bold border border-purple-700/60'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* Right transport tools: Loop, Mute */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setIsLooping(!isLooping)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                  isLooping ? 'bg-purple-950/60 text-purple-300 border border-purple-800/60' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Loop playback"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="text-[10px] hidden sm:inline">Loop</span>
              </button>

              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = !isMuted
                    setIsMuted(!isMuted)
                  }
                }}
                className={`p-1.5 rounded transition-colors ${
                  isMuted ? 'text-rose-400 bg-rose-950/50' : 'text-zinc-400 hover:text-white'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Interactive Timeline Scrubber & Trim Sliders */}
          <div className="p-3 sm:p-4 bg-[#0d0e17] border-t border-[#1e202e] space-y-2 shrink-0">
            {/* Timeline Progress Bar */}
            <div
              className="relative h-6 bg-[#161726] rounded-lg cursor-pointer border border-[#27293d] overflow-hidden group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                seekTo(ratio * duration)
              }}
            >
              {/* Playhead Progress Fill */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-purple-600/40 to-indigo-600/40 pointer-events-none"
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
              />

              {/* Trim Window Bracket Highlight */}
              {duration > 0 && (
                <div
                  className="absolute top-0 bottom-0 border-y-2 border-purple-400 bg-purple-500/15 pointer-events-none"
                  style={{
                    left: `${(Math.max(0, trimStart - clip.start_time) / duration) * 100}%`,
                    width: `${(currentTrimDuration / duration) * 100}%`
                  }}
                />
              )}

              {/* Scrubber Playhead Needle */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-yellow-400 shadow-md transform -translate-x-1/2 pointer-events-none z-10"
                style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
              >
                <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full -ml-[3px] -mt-0.5 shadow" />
              </div>

              {/* Timecode Text Inside Timeline */}
              <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-mono text-zinc-400 select-none pointer-events-none">
                <span>00:00.0</span>
                <span className="text-yellow-300 font-bold">{formatTimecode(currentTime)}</span>
                <span>{formatTimecode(duration)}</span>
              </div>
            </div>

            {/* Dual Range Trim Inputs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Trim In:</span>
                  <span className="font-mono text-purple-300 font-bold">{formatTimecode(trimStart)}</span>
                </div>
                <input
                  type="range"
                  min={clip.start_time}
                  max={trimEnd - 0.5}
                  step={0.1}
                  value={trimStart}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    setTrimStart(val)
                    seekTo(val - clip.start_time)
                  }}
                  className="w-full accent-purple-500 cursor-pointer h-1.5"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Trim Out:</span>
                  <span className="font-mono text-purple-300 font-bold">{formatTimecode(trimEnd)}</span>
                </div>
                <input
                  type="range"
                  min={trimStart + 0.5}
                  max={clip.end_time}
                  step={0.1}
                  value={trimEnd}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    setTrimEnd(val)
                    seekTo(val - clip.start_time)
                  }}
                  className="w-full accent-purple-500 cursor-pointer h-1.5"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* RIGHT COLUMN: 5-TAB MASTER EDITOR STUDIO (CLEAN, WELL-ARRANGED)       */}
        {/* ===================================================================== */}
        <div className="w-full lg:w-[460px] flex flex-col bg-[#0d0e17] shrink-0 border-t lg:border-t-0 lg:border-l border-[#1e202e] flex-1 lg:flex-initial overflow-hidden">
          {/* Tab Navigation: 5 Distinct Tabs */}
          <div className="h-12 px-2 border-b border-[#202230] bg-[#10121d] flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setEditorTab('transcript')}
              className={`flex-1 min-w-[76px] py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                editorTab === 'transcript'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Type className="h-3.5 w-3.5" />
              <span>Captions</span>
            </button>

            <button
              onClick={() => setEditorTab('overlays')}
              className={`flex-1 min-w-[76px] py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                editorTab === 'overlays'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
              <span>Text & Stickers</span>
            </button>

            <button
              onClick={() => setEditorTab('audio')}
              className={`flex-1 min-w-[76px] py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                editorTab === 'audio'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
              <span>Audio & Voice</span>
            </button>

            <button
              onClick={() => setEditorTab('styling')}
              className={`flex-1 min-w-[76px] py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                editorTab === 'styling'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Framing</span>
            </button>

            <button
              onClick={() => setEditorTab('export')}
              className={`flex-1 min-w-[76px] py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                editorTab === 'export'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Share2 className="h-3.5 w-3.5 text-pink-400" />
              <span>Export</span>
            </button>
          </div>

          {/* ================================================================= */}
          {/* TAB 1: CAPTIONS & TRANSCRIPT (AUTO-CAPTION, SYNCHRONIZED SPEECH, ERASE) */}
          {/* ================================================================= */}
          {editorTab === 'transcript' && (
            <div className="flex-1 flex flex-col p-4 overflow-hidden space-y-3">
              {/* Auto Caption Quick Action Bar */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-black/60 border border-purple-500/30 flex items-center justify-between shrink-0 shadow-lg">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      playSoundEffect('pop')
                      setBurnCaptions(true)
                      if (captionStyle === 'none') setCaptionStyle('word_yellow')
                      if (segments.length > 0 && segments.every(s => s.erased)) {
                        setSegments(prev => prev.map(s => ({ ...s, erased: false })))
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-900/40 cursor-pointer active:scale-95 transition-all"
                    title="Generate and burn kinetic synchronized auto-captions"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-yellow-300 animate-pulse" />
                    <span>⚡ Auto-Generate Captions</span>
                  </button>
                  <div className="text-[11px] text-zinc-300">
                    <span className="text-purple-300 font-semibold">{segments.length} word cues</span> synchronized
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">Burn into Video:</span>
                  <button
                    onClick={() => {
                      playSoundEffect('pop')
                      setBurnCaptions(!burnCaptions)
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      burnCaptions
                        ? 'bg-purple-600/30 border-purple-400 text-purple-200'
                        : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${burnCaptions ? 'bg-emerald-400 animate-ping' : 'bg-zinc-500'}`} />
                    <span>{burnCaptions ? 'Auto-Caption ON' : 'Auto-Caption OFF'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between shrink-0">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Synchronized Spoken Captions</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/50">
                      Interactive
                    </span>
                  </h4>
                  <p className="text-[11px] text-zinc-400">Click word to seek. Click ✏️ to edit or 🚫 to erase subtitle.</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleToggleEraseAllSegments}
                    className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-rose-300 text-[10px] font-semibold border border-zinc-700 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Toggle erasing all subtitles from video"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>{segments.length > 0 && segments.every(s => s.erased) ? 'Restore All' : 'Erase All'}</span>
                  </button>

                  <button
                    onClick={() => setIsEditingText(!isEditingText)}
                    className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-semibold border border-zinc-700 transition-colors cursor-pointer"
                  >
                    {isEditingText ? 'Done' : 'Bulk Edit'}
                  </button>
                </div>
              </div>

              {/* Caption Word-Pop Styling Quick Tray */}
              <div className="p-2.5 rounded-xl bg-[#141522] border border-[#23253b] space-y-2 shrink-0">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-zinc-300">Caption Pop Style:</span>
                  <span className="text-purple-300 font-mono text-[10px]">{captionStyle}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                  {[
                    { id: 'word_red', label: '🔴 1 Word Red', desc: 'Viral Red Glow' },
                    { id: 'word_yellow', label: '🟡 1 Word Yellow', desc: 'Black Border Pop' },
                    { id: 'word_white', label: '⚪ Crisp White', desc: 'Minimal Pop' },
                    { id: 'phrase_purple', label: '💜 3 Words Purple', desc: 'Headline Bar' },
                    { id: 'phrase_yellow', label: '💬 3 Words Yellow', desc: 'Subtitle Banner' },
                    { id: 'clean_white', label: '🤍 Clean Standard', desc: 'Classic' }
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setCaptionStyle(st.id)}
                      className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                        captionStyle === st.id
                          ? 'bg-purple-950/80 border-purple-500 text-white font-bold'
                          : 'bg-[#0d0e17] border-[#1e202f] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span className="block truncate font-semibold">{st.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Inline Bulk Text Editor */}
              {isEditingText && (
                <div className="p-3 rounded-xl bg-[#141522] border border-purple-500/40 space-y-2 shrink-0">
                  <label className="text-[11px] text-purple-300 font-semibold block">
                    Bulk Spoken Transcript Editor:
                  </label>
                  <textarea
                    rows={4}
                    value={editedFullText}
                    onChange={(e) => setEditedFullText(e.target.value)}
                    className="w-full bg-[#0a0a0f] border border-zinc-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-purple-400 font-sans"
                    placeholder="Edit clip text..."
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => setIsEditingText(false)}
                      className="px-3 py-1 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Apply Bulk Text
                    </button>
                  </div>
                </div>
              )}

              {/* Scrollable Synchronized Transcript Stream */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                {isLoadingTranscript ? (
                  <div className="p-8 text-center text-zinc-500 text-xs">
                    <RefreshCw className="h-5 w-5 animate-spin m-auto mb-2 text-purple-400" />
                    <span>Loading synchronized word timestamps...</span>
                  </div>
                ) : segments.length > 0 ? (
                  segments.map((seg) => {
                    const activeSeg = isSegmentActive(seg.start, seg.end)
                    const isInlineEditing = editingSegmentId === seg.id

                    return (
                      <div
                        key={seg.id}
                        className={`p-3 rounded-xl border transition-all ${
                          seg.erased
                            ? 'bg-rose-950/20 border-rose-900/40 opacity-75'
                            : activeSeg
                            ? 'bg-purple-950/40 border-purple-500/70 shadow-lg ring-1 ring-purple-500/30'
                            : 'bg-[#12131f] border-[#222436] hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${activeSeg ? 'text-purple-300' : 'text-zinc-500'}`}>
                              [{formatTimecode(seg.start)} &rarr; {formatTimecode(seg.end)}]
                            </span>
                            {seg.erased ? (
                              <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[9px] font-bold">
                                🚫 Erased from video
                              </span>
                            ) : activeSeg ? (
                              <span className="px-1.5 py-0.2 rounded bg-purple-600 text-white font-sans text-[9px] uppercase font-bold animate-pulse">
                                Active
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-1 font-sans">
                            <button
                              onClick={() => {
                                if (isInlineEditing) handleSaveSegmentEdit(seg.id)
                                else handleStartEditSegment(seg)
                              }}
                              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              title={isInlineEditing ? 'Save text' : 'Edit subtitle line'}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={() => handleToggleEraseSegment(seg.id)}
                              className={`p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer ${
                                seg.erased ? 'text-rose-400 hover:text-rose-200' : 'text-zinc-400 hover:text-rose-400'
                              }`}
                              title={seg.erased ? 'Restore subtitle' : 'Erase subtitle line from video'}
                            >
                              {seg.erased ? <Undo className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>

                        {isInlineEditing ? (
                          <div className="space-y-2 pt-1">
                            <input
                              type="text"
                              value={editingSegmentText}
                              onChange={(e) => setEditingSegmentText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveSegmentEdit(seg.id)
                                if (e.key === 'Escape') handleCancelSegmentEdit()
                              }}
                              autoFocus
                              className="w-full bg-[#0a0a0f] border border-purple-500/60 rounded px-2.5 py-1 text-xs text-white focus:outline-none"
                            />
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={handleCancelSegmentEdit}
                                className="px-2 py-0.5 rounded text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveSegmentEdit(seg.id)}
                                className="px-2.5 py-0.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Save Text
                              </button>
                            </div>
                          </div>
                        ) : seg.erased ? (
                          <p className="line-through text-zinc-500 italic text-xs cursor-pointer" onClick={() => seekTo(seg.start)}>
                            {seg.text}
                          </p>
                        ) : (
                          <div
                            className="flex flex-wrap gap-1 leading-relaxed text-xs cursor-pointer"
                            onClick={() => seekTo(seg.start)}
                          >
                            {seg.words && seg.words.length > 0 ? (
                              seg.words.map((w, wIdx) => {
                                const activeWord = isWordActive(w.start, w.end)
                                return (
                                  <span
                                    key={wIdx}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      seekTo(w.start)
                                    }}
                                    className={`px-1 py-0.5 rounded transition-all ${
                                      activeWord
                                        ? 'bg-yellow-400 text-black font-extrabold shadow-sm scale-110'
                                        : 'text-zinc-200 hover:bg-zinc-800'
                                    }`}
                                  >
                                    {w.word}
                                  </span>
                                )
                              })
                            ) : (
                              <span className="text-zinc-200">{seg.text}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="p-6 rounded-xl bg-[#12131f] border border-[#222436] text-center space-y-2">
                    <p className="text-xs text-zinc-400">Speech transcript:</p>
                    <p className="text-xs text-purple-200 font-medium italic">
                      "{editedFullText || clip.title}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: CUSTOM TEXT OVERLAYS & VIRAL STICKERS                       */}
          {/* ================================================================= */}
          {editorTab === 'overlays' && (
            <div className="flex-1 flex flex-col p-4 overflow-hidden space-y-3">
              {/* Header & Add Button */}
              <div className="space-y-2 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                      <span>Text Overlays & Viral Stickers</span>
                    </h4>
                    <p className="text-[11px] text-zinc-400">Burn custom hooks, callouts & reaction stickers into MP4.</p>
                  </div>

                  <button
                    onClick={() => handleAddCustomOverlay('VIRAL HOOK 🔥', 25)}
                    className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1 shadow-md transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Text</span>
                  </button>
                </div>

                {/* Viral Reaction Stickers Picker */}
                <div className="p-2.5 rounded-xl bg-[#141522] border border-[#23253a] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1">
                      <Smile className="h-3 w-3 text-yellow-400" />
                      <span>Click to Add Sticker</span>
                    </span>
                    <span className="text-[10px] text-zinc-500">Auto-Burned</span>
                  </div>
                  <div className="grid grid-cols-8 gap-1.5">
                    {VIRAL_STICKERS.map((stk) => (
                      <button
                        key={stk.emoji}
                        onClick={() => handleAddSticker(stk.emoji)}
                        className="h-8 rounded-lg bg-[#0e0f17] hover:bg-purple-900/60 border border-[#25273c] hover:border-purple-500 text-base flex items-center justify-center transition-all transform hover:scale-110 cursor-pointer shadow-sm"
                        title={`Add ${stk.label} sticker`}
                      >
                        <span>{stk.emoji}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Hook Presets */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-mono no-scrollbar">
                  <span className="text-zinc-500 shrink-0">Hooks:</span>
                  {[
                    { txt: 'WAIT FOR IT 😱', y: 18 },
                    { txt: 'KEY TAKEAWAY 💡', y: 22 },
                    { txt: 'WATCH TILL END 👀', y: 18 },
                    { txt: 'SUBSCRIBE FOR MORE 👇', y: 82 }
                  ].map((hk) => (
                    <button
                      key={hk.txt}
                      onClick={() => handleAddCustomOverlay(hk.txt, hk.y)}
                      className="px-2 py-0.5 rounded bg-[#171827] hover:bg-purple-950 hover:text-purple-300 text-zinc-300 border border-[#282a40] shrink-0 cursor-pointer"
                    >
                      {hk.txt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Overlays List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {customOverlays.length === 0 ? (
                  <div className="p-8 rounded-xl bg-[#12131f] border border-[#222436] text-center space-y-2">
                    <Type className="h-8 w-8 text-purple-400/60 mx-auto animate-pulse" />
                    <p className="text-xs text-zinc-300 font-semibold">No text or stickers placed yet.</p>
                    <p className="text-[11px] text-zinc-500">
                      Click a sticker above or 'Add Text' to place headlines and reaction emojis anywhere on your video.
                    </p>
                  </div>
                ) : (
                  customOverlays.map((overlay, index) => {
                    const isSelected = selectedOverlayId === overlay.id
                    return (
                      <div
                        key={overlay.id}
                        className={`p-3 rounded-xl border transition-all space-y-2.5 ${
                          overlay.erased
                            ? 'bg-rose-950/20 border-rose-900/40 opacity-75'
                            : isSelected
                            ? 'bg-[#151728] border-purple-500/80 shadow-lg ring-1 ring-purple-500/30'
                            : 'bg-[#12131f] border-[#222436]'
                        }`}
                        onClick={() => setSelectedOverlayId(overlay.id)}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">Item #{index + 1}</span>
                            {overlay.erased ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                                🚫 Erased
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                                {overlay.position_y}% Y
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggleEraseOverlay(overlay.id)
                              }}
                              className={`p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer ${
                                overlay.erased ? 'text-rose-400 hover:text-white' : 'text-zinc-400 hover:text-rose-400'
                              }`}
                              title={overlay.erased ? 'Restore into video' : 'Erase from video'}
                            >
                              {overlay.erased ? <Undo className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteOverlay(overlay.id)
                              }}
                              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Delete overlay"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Editable Content */}
                        <input
                          type="text"
                          value={overlay.text}
                          onChange={(e) => handleUpdateOverlay(overlay.id, { text: e.target.value })}
                          className="w-full bg-[#0a0a0f] border border-zinc-700 focus:border-purple-500 rounded-lg px-2.5 py-1 text-xs text-white font-bold"
                          placeholder="Type overlay text or emoji..."
                        />

                        {/* Move Position (Y) Slider */}
                        <div className="space-y-1 p-2 rounded-lg bg-[#0b0c14] border border-[#1e202f]">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-semibold text-zinc-300 flex items-center gap-1">
                              <Move className="h-3 w-3 text-purple-400" />
                              <span>Move Vertical Position</span>
                            </span>
                            <span className="font-mono text-purple-300 font-bold">{overlay.position_y}%</span>
                          </div>
                          <input
                            type="range"
                            min={5}
                            max={95}
                            step={1}
                            value={overlay.position_y}
                            onChange={(e) => handleUpdateOverlay(overlay.id, { position_y: parseInt(e.target.value) })}
                            className="w-full accent-purple-500 cursor-pointer h-1.5"
                          />
                        </div>

                        {/* Size (Scale) Slider & Color Picker */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-lg bg-[#0b0c14] border border-[#1e202f] space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-zinc-300 font-semibold flex items-center gap-1">
                                <ZoomIn className="h-3 w-3 text-purple-400" />
                                <span>Size</span>
                              </span>
                              <span className="font-mono text-purple-300 font-bold">{overlay.font_size}px</span>
                            </div>
                            <input
                              type="range"
                              min={20}
                              max={90}
                              step={2}
                              value={overlay.font_size}
                              onChange={(e) => handleUpdateOverlay(overlay.id, { font_size: parseInt(e.target.value) })}
                              className="w-full accent-purple-500 cursor-pointer h-1.5"
                            />
                          </div>

                          <div className="p-2 rounded-lg bg-[#0b0c14] border border-[#1e202f] flex flex-col justify-between">
                            <span className="text-[10px] text-zinc-400 font-semibold">Text Color:</span>
                            <div className="flex items-center gap-1 pt-1">
                              {[
                                { id: 'yellow', bg: 'bg-yellow-400' },
                                { id: 'white', bg: 'bg-white' },
                                { id: 'red', bg: 'bg-red-500' },
                                { id: 'cyan', bg: 'bg-cyan-400' },
                                { id: 'purple', bg: 'bg-purple-400' },
                                { id: 'green', bg: 'bg-emerald-400' }
                              ].map((c) => (
                                <button
                                  key={c.id}
                                  onClick={() => handleUpdateOverlay(overlay.id, { color: c.id as any })}
                                  className={`h-3.5 w-3.5 rounded-full ${c.bg} transition-all cursor-pointer ${
                                    overlay.color === c.id ? 'ring-2 ring-purple-400 scale-110' : 'opacity-70 hover:opacity-100'
                                  }`}
                                  title={c.id}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: AUDIO & VOICE (VOLUME, AI SILENCE, VOICEOVER, BGM & SFX)   */}
          {/* ================================================================= */}
          {editorTab === 'audio' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Audio Studio & Voice Enhancement</span>
                </h4>
                <p className="text-[11px] text-zinc-400">Master audio levels, eliminate dead air pauses, and add voiceovers.</p>
              </div>

              {/* Volume Adjustment Slider */}
              <div className="p-3.5 rounded-xl bg-[#12131f] border border-[#222436] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5 text-purple-400" />
                    <span>Clip Volume Adjustment</span>
                  </label>
                  <span className="text-xs font-mono text-purple-300 font-bold">{volumeLevel}%</span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={200}
                  step={5}
                  value={volumeLevel}
                  onChange={(e) => setVolumeLevel(parseInt(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer h-1.5"
                />

                <div className="grid grid-cols-4 gap-1.5 pt-1 text-[10px] font-mono">
                  {[50, 100, 150, 200].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVolumeLevel(v)}
                      className={`py-1 rounded text-center transition-colors cursor-pointer ${
                        volumeLevel === v
                          ? 'bg-purple-950 text-purple-300 border border-purple-700 font-bold'
                          : 'bg-[#0d0e17] text-zinc-400 hover:text-white border border-[#1e202e]'
                      }`}
                    >
                      {v}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Vocal Clarity Normalizer & AI Silence Remover */}
              <div className="grid grid-cols-2 gap-2">
                {/* Vocal Boost (Loudnorm) */}
                <div
                  onClick={() => setVocalBoost(!vocalBoost)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1 ${
                    vocalBoost
                      ? 'bg-purple-950/40 border-purple-500 text-white'
                      : 'bg-[#12131f] border-[#222436] text-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-amber-400" />
                      <span>Vocal Clarity</span>
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${vocalBoost ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                      {vocalBoost ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-tight">
                    Levels vocal dynamics with broadcast Loudnorm.
                  </p>
                </div>

                {/* AI Silence Remover */}
                <div
                  onClick={() => setRemoveSilence(!removeSilence)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1 ${
                    removeSilence
                      ? 'bg-purple-950/40 border-purple-500 text-white'
                      : 'bg-[#12131f] border-[#222436] text-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <Scissors className="h-3.5 w-3.5 text-pink-400" />
                      <span>AI Silence Cut</span>
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${removeSilence ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                      {removeSilence ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-tight">
                    Removes dead air & pauses &gt; 0.5s for fast viral retention.
                  </p>
                </div>
              </div>

              {/* AI Voiceover & Microphone Recording */}
              <div className="p-3.5 rounded-xl bg-[#12131f] border border-[#222436] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Mic className="h-3.5 w-3.5 text-cyan-400" />
                    <span>AI Voiceover & Voice Recording</span>
                  </label>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    Voice Studio
                  </span>
                </div>

                {/* AI Text-to-Speech Preview */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>AI Voiceover Script:</span>
                    <button
                      onClick={handlePreviewTts}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {isSpeakingTts ? '⏹️ Stop Speaking' : '🔊 Listen AI Preview'}
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={ttsScript}
                    onChange={(e) => setTtsScript(e.target.value)}
                    placeholder="Enter short hook script for AI voiceover..."
                    className="w-full bg-[#0a0a0f] border border-zinc-700 focus:border-cyan-500 rounded-lg p-2 text-xs text-white"
                  />
                </div>

                {/* User Voiceover Mic Recorder */}
                <div className="flex items-center justify-between pt-2 border-t border-[#1e202f]">
                  <div>
                    <span className="text-xs font-semibold text-zinc-300 block">Record Your Voice</span>
                    <span className="text-[10px] text-zinc-500">Record custom intro or reaction</span>
                  </div>
                  <button
                    onClick={handleToggleMicRecord}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                      isRecordingMic
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                    }`}
                  >
                    {isRecordingMic ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5 text-rose-400" />}
                    <span>{isRecordingMic ? 'Stop Recording' : 'Record Mic'}</span>
                  </button>
                </div>

                {recordedMicUrl && (
                  <div className="p-2 rounded-lg bg-[#0b0c14] border border-zinc-800 flex items-center justify-between">
                    <span className="text-[11px] text-emerald-400 font-semibold">🎙️ Mic Audio Recorded</span>
                    <audio src={recordedMicUrl} controls className="h-7 w-48" />
                  </div>
                )}
              </div>

              {/* Background Music Selector & Volume */}
              <div className="p-3.5 rounded-xl bg-[#12131f] border border-[#222436] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Music className="h-3.5 w-3.5 text-pink-400" />
                    <span>Background Music (BGM)</span>
                  </label>
                  <span className="text-[10px] font-mono text-zinc-400">Volume: {bgMusicVolume}%</span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                  {[
                    { id: 'none', label: '🔇 None' },
                    { id: 'lofi', label: '☕ Lo-Fi Chill' },
                    { id: 'energetic', label: '⚡ Upbeat Viral' },
                    { id: 'suspense', label: '🎬 Cinematic' },
                    { id: 'phonk', label: '🏎️ Phonk Drift' }
                  ].map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => setBgMusic(bg.id)}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                        bgMusic === bg.id
                          ? 'bg-purple-950/80 border-purple-500 text-white font-bold'
                          : 'bg-[#0d0e17] border-[#1e202f] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span>{bg.label}</span>
                    </button>
                  ))}
                </div>

                {bgMusic !== 'none' && (
                  <div className="space-y-1 pt-1">
                    <input
                      type="range"
                      min={5}
                      max={80}
                      step={5}
                      value={bgMusicVolume}
                      onChange={(e) => setBgMusicVolume(parseInt(e.target.value))}
                      className="w-full accent-pink-500 cursor-pointer h-1.5"
                    />
                  </div>
                )}
              </div>

              {/* Sound Effects (SFX) Trigger Pads */}
              <div className="p-3.5 rounded-xl bg-[#12131f] border border-[#222436] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                    <span>Sound Effects (SFX) Test Pads</span>
                  </label>
                  <span className="text-[10px] text-zinc-500">Instant Preview</span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-xs">
                  {[
                    { id: 'whoosh', label: '💨 Whoosh' },
                    { id: 'bell', label: '🔔 Bell' },
                    { id: 'pop', label: '🫧 Pop' },
                    { id: 'camera', label: '📸 Camera' }
                  ].map((sfx) => (
                    <button
                      key={sfx.id}
                      onClick={() => playSoundEffect(sfx.id as any)}
                      className="p-2 rounded-lg bg-[#0e0f17] hover:bg-purple-900/60 border border-[#222436] hover:border-purple-500 text-zinc-200 hover:text-white transition-all text-center cursor-pointer shadow-sm active:scale-95"
                    >
                      <span className="block text-[11px] font-semibold">{sfx.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 4: FRAMING, ASPECT RATIO, BLUR BG & CUT TRANSITIONS           */}
          {/* ================================================================= */}
          {editorTab === 'styling' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
              {/* Aspect Ratio Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-200 flex items-center justify-between">
                  <span>Aspect Ratio</span>
                  <span className="text-[10px] text-purple-400 font-mono">Multi-Platform</span>
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setAspectRatio('9:16')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      aspectRatio === '9:16'
                        ? 'bg-purple-950/60 border-purple-500 text-white font-bold shadow-md'
                        : 'bg-[#12131f] border-[#222436] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="block text-sm mb-0.5">📱 9:16</span>
                    <span className="text-[9px] text-zinc-400 block">TikTok / Reels / Shorts</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAspectRatio('1:1')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      aspectRatio === '1:1'
                        ? 'bg-purple-950/60 border-purple-500 text-white font-bold shadow-md'
                        : 'bg-[#12131f] border-[#222436] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="block text-sm mb-0.5">🔳 1:1</span>
                    <span className="text-[9px] text-zinc-400 block">Instagram Feed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAspectRatio('16:9')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      aspectRatio === '16:9'
                        ? 'bg-purple-950/60 border-purple-500 text-white font-bold shadow-md'
                        : 'bg-[#12131f] border-[#222436] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="block text-sm mb-0.5">🖥️ 16:9</span>
                    <span className="text-[9px] text-zinc-400 block">YouTube / X</span>
                  </button>
                </div>
              </div>

              {/* Framing & Background Removal / Dynamic Blur */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-200">Framing & Background</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setFramingMode('smart_face')}
                    className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                      framingMode === 'smart_face'
                        ? 'bg-purple-950/60 border-purple-500 text-purple-200 font-bold'
                        : 'bg-[#12131f] border-[#222436] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="block font-semibold">🎯 Face-Track</span>
                    <span className="text-[9px] text-zinc-500">Auto Center</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFramingMode('blur')}
                    className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                      framingMode === 'blur'
                        ? 'bg-purple-950/60 border-purple-500 text-purple-200 font-bold'
                        : 'bg-[#12131f] border-[#222436] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="block font-semibold">🌫️ Blur BG</span>
                    <span className="text-[9px] text-zinc-500">Dynamic Backdrop</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFramingMode('crop')}
                    className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                      framingMode === 'crop'
                        ? 'bg-purple-950/60 border-purple-500 text-purple-200 font-bold'
                        : 'bg-[#12131f] border-[#222436] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="block font-semibold">🔲 Center Crop</span>
                    <span className="text-[9px] text-zinc-500">Full Fill</span>
                  </button>
                </div>
              </div>

              {/* Cut Transitions */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-200 flex items-center justify-between">
                  <span>Video Transition</span>
                  <span className="text-[10px] text-zinc-400">Cinematic</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {[
                    { id: 'none', label: '✂️ Cut' },
                    { id: 'fade_black', label: '⬛ Fade Black' },
                    { id: 'dissolve', label: '🌫️ Dissolve' },
                    { id: 'zoom', label: '🔍 Zoom Flash' }
                  ].map((tr) => (
                    <button
                      key={tr.id}
                      type="button"
                      onClick={() => setTransition(tr.id)}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                        transition === tr.id
                          ? 'bg-purple-950/60 border-purple-500 text-purple-200 font-bold'
                          : 'bg-[#12131f] border-[#222436] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span className="block text-[11px]">{tr.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subtitle Positioning (Move Subtitle) */}
              <div className="space-y-2 p-3 rounded-xl bg-[#12131f] border border-[#222436]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Move className="h-3.5 w-3.5 text-purple-400" />
                    <span>Move Subtitle Position</span>
                  </label>
                  <span className="text-[10px] font-mono text-purple-300 font-bold">{textPositionY}% from top</span>
                </div>

                <input
                  type="range"
                  min={10}
                  max={90}
                  step={1}
                  value={textPositionY}
                  onChange={(e) => setTextPositionY(parseInt(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer h-1.5"
                />

                <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                  {[
                    { label: 'Top (20%)', val: 20 },
                    { label: 'Center (42%)', val: 42 },
                    { label: 'Bottom (80%)', val: 80 }
                  ].map((pos) => (
                    <button
                      key={pos.label}
                      type="button"
                      onClick={() => setTextPositionY(pos.val)}
                      className={`py-1.5 rounded-lg border text-center text-xs transition-colors cursor-pointer ${
                        textPositionY === pos.val
                          ? 'bg-purple-950/60 border-purple-500 text-purple-200 font-bold'
                          : 'bg-[#0d0e17] border-[#1e202f] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subtitle Sizing & Scale (Increase Subtitle) */}
              <div className="space-y-2 p-3 rounded-xl bg-[#12131f] border border-[#222436]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <ZoomIn className="h-3.5 w-3.5 text-purple-400" />
                    <span>Increase Subtitle Size</span>
                  </label>
                  <span className="text-[10px] font-mono text-purple-300 font-bold">{fontSizeScale.toFixed(1)}x Scale</span>
                </div>

                <input
                  type="range"
                  min={0.6}
                  max={2.2}
                  step={0.1}
                  value={fontSizeScale}
                  onChange={(e) => setFontSizeScale(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer h-1.5"
                />

                <div className="grid grid-cols-4 gap-1.5 pt-1 text-xs font-mono">
                  {[0.8, 1.0, 1.3, 1.6].map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => setFontSizeScale(sc)}
                      className={`py-1 rounded text-center text-xs transition-colors cursor-pointer ${
                        Math.abs(fontSizeScale - sc) < 0.05
                          ? 'bg-purple-950/60 border border-purple-500 text-purple-200 font-bold'
                          : 'bg-[#0d0e17] border border-[#1e202f] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {sc}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Subtitle Burn Switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#12131f] border border-[#222436]">
                <div>
                  <span className="text-xs font-bold text-zinc-200 block">Subtitles Burn Switch</span>
                  <span className="text-[10px] text-zinc-500">Toggle captions burned onto exported MP4</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBurnCaptions(!burnCaptions)}
                  className={`text-[10px] px-3 py-1.5 rounded-lg font-mono font-bold transition-all cursor-pointer ${
                    burnCaptions
                      ? 'bg-purple-950 text-purple-300 border border-purple-700'
                      : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                  }`}
                >
                  {burnCaptions ? 'Captions: ON' : 'Clean (No Captions)'}
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 5: EXPORT, 4K RESOLUTION, WATERMARK & SOCIAL SHARING          */}
          {/* ================================================================= */}
          {editorTab === 'export' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Share2 className="h-3.5 w-3.5 text-pink-400" />
                  <span>Export & Multi-Platform Publishing</span>
                </h4>
                <p className="text-[11px] text-zinc-400">4K Ultra HD resolution, custom watermark & direct social sharing.</p>
              </div>

              {/* Resolution Selector (4K Ultra HD, 1080p, 720p, 480p) */}
              <div className="space-y-2 p-3.5 rounded-xl bg-[#12131f] border border-[#222436]">
                <label className="text-xs font-bold text-zinc-200 flex items-center justify-between">
                  <span>Export Resolution</span>
                  <span className="text-[10px] text-purple-400 font-mono">FFmpeg Encoder</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {[
                    { id: '4k', label: '4K Ultra', sub: '2160p' },
                    { id: '1080p', label: '1080p', sub: 'Full HD' },
                    { id: '720p', label: '720p', sub: 'Fast HD' },
                    { id: '480p', label: '480p', sub: 'Light SD' }
                  ].map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => setResolution(res.id as any)}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                        resolution === res.id
                          ? 'bg-purple-950/80 border-purple-500 text-purple-200 font-bold shadow'
                          : 'bg-[#0d0e17] border-[#1e202f] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span className="block text-xs font-bold">{res.label}</span>
                      <span className="text-[9px] text-zinc-500 block">{res.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Watermark Controls */}
              <div className="p-3.5 rounded-xl bg-[#12131f] border border-[#222436] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block">Export Watermark</span>
                    <span className="text-[10px] text-zinc-500">Branding watermark on exported video</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWatermark(!watermark)}
                    className={`text-[10px] font-mono px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                      watermark
                        ? 'bg-purple-950 text-purple-300 border border-purple-700'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}
                  >
                    {watermark ? 'Watermark: ON' : 'Watermark: OFF'}
                  </button>
                </div>

                {watermark && (
                  <div>
                    <label className="text-[10px] text-zinc-400 font-semibold block mb-1">Custom Brand Watermark Text:</label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      placeholder="@YourBrand or Prune Master AI"
                      className="w-full bg-[#0a0a0f] border border-zinc-700 focus:border-purple-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Direct Social Media Share Button (Native Web Share API) */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-950/50 via-[#161726] to-pink-950/50 border border-purple-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-pink-400" />
                    <span>Direct Share to Social Media</span>
                  </span>
                  <span className="text-[10px] text-purple-300 font-mono">Phone & Web</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Open your phone's native sharing sheet directly into TikTok, Instagram, WhatsApp, or Twitter.
                </p>
                <button
                  type="button"
                  onClick={handleDirectShare}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Share2 className="h-4 w-4" />
                  <span>📲 Share Directly to Social Media</span>
                </button>
                {copiedKey === 'direct_share_link' && (
                  <p className="text-[10px] text-emerald-400 text-center font-semibold pt-1">
                    ✓ Shareable MP4 link copied! Paste directly into social apps.
                  </p>
                )}
              </div>

              {/* Platform Selector Buttons */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-zinc-300 block">Ready-to-Post Platform Kits:</span>
                <div className="grid grid-cols-5 gap-1.5 p-1 rounded-xl bg-[#12131f] border border-[#232538]">
                  {[
                    { id: 'youtube', label: 'YouTube', icon: YouTubeIcon, color: 'text-red-500' },
                    { id: 'tiktok', label: 'TikTok', icon: TikTokIcon, color: 'text-cyan-400' },
                    { id: 'instagram', label: 'Reels', icon: InstagramIcon, color: 'text-pink-400' },
                    { id: 'facebook', label: 'FB', icon: FacebookIcon, color: 'text-blue-400' },
                    { id: 'x', label: 'X', icon: XTwitterIcon, color: 'text-zinc-200' }
                  ].map((p) => {
                    const IconComp = p.icon
                    const active = selectedPlatform === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlatform(p.id as any)}
                        className={`py-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          active
                            ? 'bg-purple-950/80 border border-purple-500/70 text-white font-bold shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <IconComp className={`h-4 w-4 ${p.color}`} />
                        <span className="text-[9px]">{p.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Platform Metadata Card */}
              {metadata && metadata.platforms && metadata.platforms[selectedPlatform] && (
                <div className="p-3.5 rounded-xl bg-[#12131f] border border-[#222436] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <PlatformBadge platform={selectedPlatform} />
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {metadata.platforms[selectedPlatform].character_count} chars
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 font-semibold block mb-1">Viral Title / Hook:</label>
                    <div className="p-2 rounded-lg bg-[#0a0a0f] border border-zinc-800 text-xs text-white font-medium flex items-center justify-between gap-2">
                      <span className="truncate">{metadata.platforms[selectedPlatform].title}</span>
                      <button
                        onClick={() => copyToClipboard(metadata.platforms[selectedPlatform].title, 'platform_title')}
                        className="text-purple-400 hover:text-purple-300 shrink-0 text-xs cursor-pointer"
                      >
                        {copiedKey === 'platform_title' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 font-semibold block mb-1">Post Caption & Viral Tags:</label>
                    <div className="relative">
                      <textarea
                        readOnly
                        rows={4}
                        value={metadata.platforms[selectedPlatform].description}
                        className="w-full bg-[#0a0a0f] border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none resize-none font-mono"
                      />
                      <button
                        onClick={() => copyToClipboard(metadata.platforms[selectedPlatform].description, 'platform_desc')}
                        className="absolute top-2 right-2 px-2 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold flex items-center gap-1 shadow cursor-pointer"
                      >
                        {copiedKey === 'platform_desc' ? (
                          <>
                            <Check className="h-3 w-3" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy All</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Download Button */}
                  <a
                    href={`/api/clips/${clip.id}/download`}
                    download
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download MP4 for {metadata.platforms[selectedPlatform].name}</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* KEYBOARD SHORTCUTS CHEAT SHEET MODAL */}
      {showShortcutsModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowShortcutsModal(false)
          }}
        >
          <div className="bg-[#0e0f18] border border-purple-500/40 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300">
                  <Keyboard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Master Editor Keyboard Shortcuts</h3>
                  <p className="text-[11px] text-zinc-400">High-speed keyboard commands for cutting, trimming & playback</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
              {/* Trimming & Cutting */}
              <div className="p-3.5 rounded-2xl bg-[#141522] border border-[#23253b] space-y-2">
                <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Scissors className="h-3.5 w-3.5 text-purple-400" />
                  <span>Cutting & Trimming</span>
                </span>
                <div className="space-y-1.5 text-zinc-300 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span>Cut / Split at Playhead</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-purple-200 font-mono text-[10px] border border-zinc-700">C or S</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Set Trim In-Point</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-purple-200 font-mono text-[10px] border border-zinc-700">[ or I</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Set Trim Out-Point</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-purple-200 font-mono text-[10px] border border-zinc-700">] or O</kbd>
                  </div>
                </div>
              </div>

              {/* Playback & Scrubbing */}
              <div className="p-3.5 rounded-2xl bg-[#141522] border border-[#23253b] space-y-2">
                <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Play className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Playback & Scrubbing</span>
                </span>
                <div className="space-y-1.5 text-zinc-300 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span>Play / Pause</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-cyan-200 font-mono text-[10px] border border-zinc-700">Space / K</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Step 1s Back / Forward</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-cyan-200 font-mono text-[10px] border border-zinc-700">← / →</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Jog Scrub 2s</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-cyan-200 font-mono text-[10px] border border-zinc-700">J / L</kbd>
                  </div>
                </div>
              </div>

              {/* Overlays & Erasing */}
              <div className="p-3.5 rounded-2xl bg-[#141522] border border-[#23253b] space-y-2">
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Type className="h-3.5 w-3.5 text-amber-400" />
                  <span>Text, Subtitles & Audio</span>
                </span>
                <div className="space-y-1.5 text-zinc-300 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span>Quick Add Text Overlay</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-amber-200 font-mono text-[10px] border border-zinc-700">T</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Erase Subtitle / Delete</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-amber-200 font-mono text-[10px] border border-zinc-700">Del / Backspace</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Mute / Unmute Audio</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-amber-200 font-mono text-[10px] border border-zinc-700">M</kbd>
                  </div>
                </div>
              </div>

              {/* Navigation & Export */}
              <div className="p-3.5 rounded-2xl bg-[#141522] border border-[#23253b] space-y-2">
                <span className="text-[11px] font-bold text-pink-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-pink-400" />
                  <span>Tabs & Rendering</span>
                </span>
                <div className="space-y-1.5 text-zinc-300 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span>Switch Tabs 1 - 5</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-pink-200 font-mono text-[10px] border border-zinc-700">1 - 5</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>⚡ Re-Render with Edits</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-pink-200 font-mono text-[10px] border border-zinc-700">Ctrl+Enter / Ctrl+S</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Back / Close (Once)</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-pink-200 font-mono text-[10px] border border-zinc-700">Esc</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Close (Press Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const MasterEditor = CapCutEditor
export default CapCutEditor
