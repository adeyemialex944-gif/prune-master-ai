import React, { useState, useEffect, useRef } from 'react'
import {
  Scissors,
  Film,
  Upload,
  Settings as SettingsIcon,
  CheckCircle2,
  XCircle,
  RefreshCw,
  HardDrive,
  Cpu,
  Layers,
  Sparkles,
  Info,
  Trash2,
  Play,
  Clock,
  FileVideo,
  AlertCircle,
  X,
  Volume2,
  FileText,
  Search,
  Check,
  ChevronRight,
  Loader2,
  Sliders,
  Flame,
  Plus,
  Download,
  Video,
  Type,
  Share2,
  Copy,
  CheckCheck,
  Hash,
  Bookmark,
  Zap,
  Globe,
  Radio,
  ArrowRight,
  ArrowLeft,
  Sparkle,
  ShieldCheck,
  Users,
  UserCheck,
  UserX,
  Crown,
  LogOut,
  Key,
  Lock,
  Mail,
  Eye,
  EyeOff,
  User as UserIcon,
  Menu,
  Image as ImageIcon,
  Smartphone,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Power,
  HelpCircle
} from 'lucide-react'

// Dynamically code-split heavy studio components for 3x faster initial page load
const CapCutEditor = React.lazy(() => import('./components/CapCutEditor').then(m => ({ default: m.CapCutEditor })))
const ShowcaseTestimonials = React.lazy(() => import('./components/ShowcaseTestimonials').then(m => ({ default: m.ShowcaseTestimonials })))
import {
  YouTubeIcon,
  TikTokIcon,
  InstagramIcon,
  FacebookIcon,
  XTwitterIcon,
  PlatformBadge
} from './components/SocialIcons'
import {
  saveClipToDevice,
  getClipsFromDevice,
  deleteClipFromDevice,
  getDeviceStorageEstimate,
  clearAllDeviceClips,
  downloadBlobToDisk,
  type LocalDeviceClip
} from './services/deviceStorage'
interface AuthUser {
  id: number
  username: string
  email: string
  full_name: string
  role: 'director' | 'user'
  status: 'approved' | 'pending' | 'rejected'
  created_at: string
  last_login?: string | null
  avatar_url?: string | null
  trial_credits?: number
  trial_credits_used?: number
  is_pro?: boolean
  registration_ip?: string | null
  last_ip?: string | null
  gemini_api_key?: string | null
  gemini_model?: string | null
}
interface TrialStatus {
  is_authenticated?: boolean
  is_logged_in?: boolean
  username: string | null
  role: string
  is_pro: boolean
  is_unlimited?: boolean
  monetization_enabled?: boolean
  client_ip: string
  trial_credits: number
  trial_credits_used: number
  trials_remaining: number
  max_trials: number
  avatar_url?: string | null
  gemini_model?: string | null
}
interface DirectorUserItem {
  id: number
  username: string
  email: string
  full_name: string
  role: string
  status: string
  is_pro?: boolean
  trial_credits?: number
  trial_credits_used?: number
  registration_ip?: string | null
  last_ip?: string | null
  gemini_model?: string | null
  created_at: string | null
  last_login: string | null
  video_count: number
  clip_count: number
  is_director: boolean
}
interface HealthData {
  status: string
  version: string
  ffmpeg_detected: boolean
  data_directory: string
}
interface StatsData {
  videos: number
  clips: number
  jobs: number
  user_videos?: number
  user_clips?: number
}
interface VideoItem {
  id: number
  filename: string
  original_name: string
  duration_seconds: number
  file_size_bytes: number
  width: number
  height: number
  status: string
  audio_path: string | null
  thumbnail_path: string | null
  transcript_path: string | null
  created_at: string
}
interface WordToken {
  word: string
  start: number
  end: number
  probability: number
}
interface Segment {
  id: number
  seek: number
  start: number
  end: number
  text: string
  words: WordToken[]
}
interface TranscriptData {
  language: string
  language_probability: number
  duration: number
  total_segments: number
  segments: Segment[]
}
interface HighlightCandidate {
  id: string
  title: string
  start_time: number
  end_time: number
  duration: number
  score: number
  reason: string
  text: string
  method: string
}
interface ClipItem {
  id: number
  video_id: number
  title: string
  start_time: number
  end_time: number
  aspect_ratio: string
  file_path: string | null
  thumbnail_path: string | null
  status: string
  caption_style: string
  created_at: string
  localBlobUrl?: string
  isDeviceStored?: boolean
  deviceStorageSizeMB?: string
  rawBlob?: Blob
}
interface ActiveJobState {
  jobId: string
  progress: number
  message: string
  status: string
}
interface PlatformPost {
  name: string
  title: string
  description: string
  character_count?: number
}
interface SocialMetadata {
  source: string
  key_quote: string
  title_variations: string[]
  hashtags: string[]
  hashtags_string: string
  platforms: {
    youtube?: PlatformPost
    instagram?: PlatformPost
    tiktok?: PlatformPost
    facebook?: PlatformPost
    x?: PlatformPost
    [key: string]: PlatformPost | undefined
  }
  call_to_action_options: string[]
  clip_id?: number
  video_id?: number
}
function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00'
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
export default function App() {
  const [activeTab, setActiveTab] = useState<'mine' | 'autonomous' | 'editor' | 'clips' | 'showcase' | 'videos' | 'settings' | 'director'>('mine')
  const [editorClip, setEditorClip] = useState<ClipItem | null>(null)
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false)
  const [showForgotPass, setShowForgotPass] = useState<boolean>(false)
  const [showProfileKey, setShowProfileKey] = useState<boolean>(false)
  const [inputMode, setInputMode] = useState<'upload' | 'youtube' | 'library'>('upload')
  const [selectedBatchVideoIds, setSelectedBatchVideoIds] = useState<number[]>([])
  const [batchMiningJobs, setBatchMiningJobs] = useState<{ [key: string]: { videoId: number, videoName: string, jobId: string, progress: number, message: string, status: string } }>({})
  const [isBatchMining, setIsBatchMining] = useState<boolean>(false)
  const [youtubeUrl, setYoutubeUrl] = useState<string>('')
  const [isImportingYoutube, setIsImportingYoutube] = useState<boolean>(false)
  const [youtubeError, setYoutubeError] = useState<string | null>(null)
  const [labMode, setLabMode] = useState<'sermon' | 'podcast'>('sermon')
  const [clipCount, setClipCount] = useState<number>(3)
  const [isCustomClipCount, setIsCustomClipCount] = useState<boolean>(false)
  const [framingMode, setFramingMode] = useState<'smart_face' | 'blur' | 'crop'>('smart_face')
  // Studio Mining Controls (Duration, Resolution, Captions)
  const [durationPreset, setDurationPreset] = useState<'15-30' | '30-60' | '60-90' | '90-120' | '120-150' | '120-180' | 'custom'>('30-60')
  const [minDuration, setMinDuration] = useState<number>(30)
  const [maxDuration, setMaxDuration] = useState<number>(60)
  const [resolution, setResolution] = useState<'1080p' | '720p' | '480p'>('1080p')
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16')
  const [burnCaptions, setBurnCaptions] = useState<boolean>(true)
  const [captionStyle, setCaptionStyle] = useState<string>('word_red')
  const [timelineStrategy, setTimelineStrategy] = useState<'timeline_balanced' | 'top_peaks'>('timeline_balanced')
  // Authentication & Multi-User State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [authToken, setAuthToken] = useState<string>(() => (localStorage.getItem('prune_master_token') || localStorage.getItem('clipmaster_token')) || '')
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false)
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('register')
  const [authLoginInput, setAuthLoginInput] = useState<string>('')
  const [authPasswordInput, setAuthPasswordInput] = useState<string>('')
  const [regFullName, setRegFullName] = useState<string>('')
  const [regUsername, setRegUsername] = useState<string>('')
  const [regEmail, setRegEmail] = useState<string>('')
  const [regPassword, setRegPassword] = useState<string>('')
  const [forgotLoginInput, setForgotLoginInput] = useState<string>('')
  const [forgotFullNameInput, setForgotFullNameInput] = useState<string>('')
  const [forgotNewPasswordInput, setForgotNewPasswordInput] = useState<string>('')
  const [forgotConfirmPasswordInput, setForgotConfirmPasswordInput] = useState<string>('')
  const [authLoading, setAuthLoading] = useState<boolean>(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null)
  // Director Management Console State
  const [directorUsers, setDirectorUsers] = useState<DirectorUserItem[]>([])
  const [pendingUsersCount, setPendingUsersCount] = useState<number>(0)
  const [isLoadingDirectorUsers, setIsLoadingDirectorUsers] = useState<boolean>(false)
  const [directorActionMsg, setDirectorActionMsg] = useState<string | null>(null)
  const [directorScopeAll, setDirectorScopeAll] = useState<boolean>(false)
  const [vipIdentifierInput, setVipIdentifierInput] = useState<string>('')
  const [isGrantingVip, setIsGrantingVip] = useState<boolean>(false)
  // SaaS Monetization, IP Tracking & Profile State
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
  const [monetizationEnabled, setMonetizationEnabled] = useState<boolean>(false)
  const [isTogglingMonetization, setIsTogglingMonetization] = useState<boolean>(false)
  const [isProModalOpen, setIsProModalOpen] = useState<boolean>(false)
  const [currencyMode, setCurrencyMode] = useState<'USD' | 'NGN'>('USD')
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false)
  const [profileFullName, setProfileFullName] = useState<string>('')
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string>('')
  const [profileGeminiKey, setProfileGeminiKey] = useState<string>('')
  const [profileGeminiModel, setProfileGeminiModel] = useState<string>('gemini-2.5-pro')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false)
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false)
  const [profileToast, setProfileToast] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Render Free Tier Wake-Up & Keep-Alive State
  const [isWakingUpServer, setIsWakingUpServer] = useState<boolean>(false)
  const [wakeUpSecondsLeft, setWakeUpSecondsLeft] = useState<number>(30)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false)
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null)
  // Autonomous Prompt-to-Publish Copilot State
  const [autonomousPromptText, setAutonomousPromptText] = useState<string>(
    'Autonomously pick the video, transcribe speech with Whisper, extract 5 viral hooks using Gemini 2.5 Pro, reframe to 9:16 vertical with smart face centering, burn word-by-word kinetic captions in viral yellow pop, remove silence, and export in 4K resolution.'
  )
  const [autonomousTargetVideoId, setAutonomousTargetVideoId] = useState<number | 'auto'>('auto')
  const [isExecutingAutonomous, setIsExecutingAutonomous] = useState<boolean>(false)
  const [autonomousProgress, setAutonomousProgress] = useState<number>(0)
  const [autonomousStep, setAutonomousStep] = useState<number>(1)
  const [autonomousStatusMsg, setAutonomousStatusMsg] = useState<string>('')
  const [autonomousJobId, setAutonomousJobId] = useState<string | null>(null)
  const [selectedPromptTierId, setSelectedPromptTierId] = useState<string>('tier_overall')
  const STANDBY_PROMPT_TIERS = [
    {
      id: 'tier_overall',
      tierName: 'Tier 1 • Standby Overall Workflow',
      badge: '👑 Full Hands-Free Master',
      badgeColor: 'bg-amber-950 text-amber-300 border-amber-500/50',
      title: 'Complete Autonomous End-to-End Pipeline',
      description: 'Ingests video, transcribes with Whisper, mines top 5 hooks with Gemini 2.5 Pro, reframes to 9:16, burns yellow kinetic captions, removes silences, boosts vocals, and exports in 4K.',
      prompt: 'Autonomously pick the video, transcribe speech with Whisper, extract 5 viral hooks using Gemini 2.5 Pro, reframe to 9:16 vertical with smart face centering, burn word-by-word kinetic captions in viral yellow pop, remove silence, and export in 4K resolution.',
      params: {
        clipCount: 5,
        labMode: 'sermon' as const,
        minDuration: 30,
        maxDuration: 60,
        burnCaptions: true,
        captionStyle: 'word_yellow',
        framingMode: 'smart_face' as const,
        aspectRatio: '9:16' as const,
        resolution: '4k' as const
      }
    },
    {
      id: 'tier_raw_cutter',
      tierName: 'Tier 2 • Segmented Workflow',
      badge: '✂️ Fast Raw Cutter (No Edits)',
      badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-500/50',
      title: 'Pure Highlight Cutting (No Captions / Raw Original)',
      description: 'For creators who only want to cut highlights cleanly without editing, captions, or music overlays. High-speed raw extraction.',
      prompt: 'Pick video, detect 3 punchy highlights between 15s and 45s, and export pure clips with original video and audio, without adding captions, music, or filters.',
      params: {
        clipCount: 3,
        labMode: 'podcast' as const,
        minDuration: 15,
        maxDuration: 45,
        burnCaptions: false,
        captionStyle: 'none',
        framingMode: 'smart_face' as const,
        aspectRatio: '9:16' as const,
        resolution: '1080p' as const
      }
    },
    {
      id: 'tier_sermon_climax',
      tierName: 'Tier 3 • Segmented Workflow',
      badge: '🎙️ Sermon & Podcast Climax',
      badgeColor: 'bg-purple-950 text-purple-300 border-purple-500/50',
      title: 'Deep Climax & Power Revelation Producer',
      description: 'Partitions long recordings to find breakthrough emotional peaks, applies viral red glow captions, and boosts vocal clarity.',
      prompt: 'Analyze sermon recording, detect 5 powerful revelation & breakthrough climaxes across the full video timeline, reframe to 9:16 smart face center, burn 1-word red glow captions, and boost speaker vocal clarity.',
      params: {
        clipCount: 5,
        labMode: 'sermon' as const,
        minDuration: 30,
        maxDuration: 75,
        burnCaptions: true,
        captionStyle: 'word_red',
        framingMode: 'smart_face' as const,
        aspectRatio: '9:16' as const,
        resolution: '1080p' as const
      }
    },
    {
      id: 'tier_ambient_broll',
      tierName: 'Tier 4 • Segmented Workflow',
      badge: '🎬 Ambient / Cinematic Reel',
      badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-500/50',
      title: 'Aesthetic Visual Reel Producer',
      description: 'Extracts visual and emotional moments, reframes with blurred wings, removes dead silences, and overlays background music.',
      prompt: 'Extract 3 visual key moments, reframe to 9:16 vertical with blur padding, disable captions, remove dead silences, and overlay soft ambient lo-fi music at 18% volume.',
      params: {
        clipCount: 3,
        labMode: 'podcast' as const,
        minDuration: 20,
        maxDuration: 50,
        burnCaptions: false,
        captionStyle: 'none',
        framingMode: 'blur' as const,
        aspectRatio: '9:16' as const,
        resolution: '1080p' as const
      }
    },
    {
      id: 'tier_tiktok_fyp',
      tierName: 'Tier 5 • Segmented Workflow',
      badge: '⚡ High-Speed TikTok Hook',
      badgeColor: 'bg-rose-950 text-rose-300 border-rose-500/50',
      title: '15-Second High-CTR FYP Harvester',
      description: 'Mines ultra-fast opening hooks under 25 seconds for maximum TikTok algorithm watch-time completion rate.',
      prompt: 'Mine 5 ultra-fast 10-20 second opening hooks optimized for TikTok FYP attention retention, burn bold crisp white kinetic subtitles, and export in 1080p.',
      params: {
        clipCount: 5,
        labMode: 'podcast' as const,
        minDuration: 10,
        maxDuration: 25,
        burnCaptions: true,
        captionStyle: 'word_white',
        framingMode: 'crop' as const,
        aspectRatio: '9:16' as const,
        resolution: '1080p' as const
      }
    }
  ]
  const CREATOR_PRESET_AVATARS = [
    { id: 'director', name: 'Master Director', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=DirectorAlex&backgroundColor=6366f1' },
    { id: 'viral_hook', name: 'Viral Reel Host', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ViralHost&backgroundColor=ec4899' },
    { id: 'tech_creator', name: 'Tech Visionary', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=TechVisionary&backgroundColor=8b5cf6' },
    { id: 'faith_speaker', name: 'Faith & Life Speaker', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=FaithSpeaker&backgroundColor=06b6d4' },
    { id: 'podcast_guru', name: 'Podcast Mastermind', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PodcastPro&backgroundColor=f59e0b' },
    { id: 'gamer_streamer', name: 'Gamer Streamer', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=GameStreamer&backgroundColor=10b981' },
    { id: 'creative_artist', name: 'Creative Producer', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CreativeArtist&backgroundColor=a855f7' },
    { id: 'cyber_minimal', name: 'Cyber Minimalist', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=CyberMinimal&backgroundColor=3b82f6' }
  ]
  const handleDurationPresetChange = (preset: '15-30' | '30-60' | '60-90' | '90-120' | '120-150' | '120-180' | 'custom') => {
    setDurationPreset(preset)
    if (preset === '15-30') {
      setMinDuration(15)
      setMaxDuration(30)
    } else if (preset === '30-60') {
      setMinDuration(30)
      setMaxDuration(60)
    } else if (preset === '60-90') {
      setMinDuration(60)
      setMaxDuration(90)
    } else if (preset === '90-120') {
      setMinDuration(90)
      setMaxDuration(120)
    } else if (preset === '120-150') {
      setMinDuration(120)
      setMaxDuration(150)
    } else if (preset === '120-180') {
      setMinDuration(120)
      setMaxDuration(180)
    }
  }
  const handleAutoSplitByVideo = () => {
    const activeVid = selectedPreviewVideo || uploadedVideoResult || (videos.length > 0 ? videos[0] : null)
    if (activeVid && activeVid.duration_seconds > 0) {
      const targetSeconds = Math.max(15, Math.floor(activeVid.duration_seconds / Math.max(1, clipCount)))
      const minSecs = Math.max(10, Math.floor(targetSeconds * 0.75))
      setMinDuration(minSecs)
      setMaxDuration(targetSeconds)
      setDurationPreset('custom')
    }
  }
  const formatSecsAndMins = (secs: number) => {
    if (secs < 60) return `${secs}s`
    const mins = Math.floor(secs / 60)
    const remainder = Math.round(secs % 60)
    return remainder > 0 ? `${mins}m ${remainder}s` : `${mins}m`
  }
  const [autoMiningVideo, setAutoMiningVideo] = useState<VideoItem | null>(null)
  const [activeMiningJob, setActiveMiningJob] = useState<ActiveJobState | null>(null)
  // Review & Cut Studio State
  const [analyzingVideo, setAnalyzingVideo] = useState<VideoItem | null>(null)
  const [isAnalyzingVideo, setIsAnalyzingVideo] = useState<boolean>(false)
  const [analysisProgress, setAnalysisProgress] = useState<number>(0)
  const [analysisMessage, setAnalysisMessage] = useState<string>('')
  const [discoveredMoments, setDiscoveredMoments] = useState<HighlightCandidate[]>([])
  const [selectedMomentIds, setSelectedMomentIds] = useState<{ [candId: string]: boolean }>({})
  const [isCuttingSelectedMoments, setIsCuttingSelectedMoments] = useState<boolean>(false)
  const [cutSegmentsJob, setCutSegmentsJob] = useState<ActiveJobState | null>(null)
  const [activeMomentPreview, setActiveMomentPreview] = useState<HighlightCandidate | null>(null)
  const studioPreviewVideoRef = useRef<HTMLVideoElement | null>(null)
  const [health, setHealth] = useState<HealthData | null>(null)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState<boolean>(false)
  // Video Library State
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [isLoadingVideos, setIsLoadingVideos] = useState<boolean>(false)
  const [selectedPreviewVideo, setSelectedPreviewVideo] = useState<VideoItem | null>(null)
  // Transcription State
  const [activeJobs, setActiveJobs] = useState<{ [key: string]: ActiveJobState }>({})
  const [selectedModelSize, setSelectedModelSize] = useState<{ [videoId: number]: string }>({})
  const [activeTranscriptVideo, setActiveTranscriptVideo] = useState<VideoItem | null>(null)
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null)
  const [isLoadingTranscript, setIsLoadingTranscript] = useState<boolean>(false)
  const [transcriptSearch, setTranscriptSearch] = useState<string>('')
  // Highlight Detection Studio State
  const [highlightModalVideo, setHighlightModalVideo] = useState<VideoItem | null>(null)
  const [candidates, setCandidates] = useState<HighlightCandidate[]>([])
  const [isLoadingHighlights, setIsLoadingHighlights] = useState<boolean>(false)
  const [activeSnippetPreview, setActiveSnippetPreview] = useState<HighlightCandidate | null>(null)
  const [approvedCandidateIds, setApprovedCandidateIds] = useState<{ [candId: string]: boolean }>({})
  const snippetVideoRef = useRef<HTMLVideoElement | null>(null)
  const modalVideoRef = useRef<HTMLVideoElement | null>(null)
  // Clips Library & Render State
  const [clips, setClips] = useState<ClipItem[]>([])
  const [isLoadingClips, setIsLoadingClips] = useState<boolean>(false)
  const [selectedPreviewClip, setSelectedPreviewClip] = useState<ClipItem | null>(null)
  const [renderOptions, setRenderOptions] = useState<{
    [clipId: number]: {
      framing: 'blur' | 'crop' | 'smart_face' | 'fit'
      captions: boolean
      style: string
      resolution?: '1080p' | '720p' | '480p'
      aspectRatio?: '9:16' | '16:9'
    }
  }>({})
  const [reRenderClipId, setReRenderClipId] = useState<number | null>(null)
  // Device-Local Storage State (Phone/PC storage)
  const [deviceStorageMB, setDeviceStorageMB] = useState<string>('0.0')
  const [deviceStorageQuotaMB, setDeviceStorageQuotaMB] = useState<string>('N/A')
  const [deviceClipsCount, setDeviceClipsCount] = useState<number>(0)
  const [isSavingToDevice, setIsSavingToDevice] = useState<boolean>(false)
  const [deviceStorageNotification, setDeviceStorageNotification] = useState<string | null>(null)
  // Social Media Post Kit State
  const [socialModalClip, setSocialModalClip] = useState<ClipItem | null>(null)
  const [socialMetadata, setSocialMetadata] = useState<SocialMetadata | null>(null)
  const [isLoadingMetadata, setIsLoadingMetadata] = useState<boolean>(false)
  const [activePlatformTab, setActivePlatformTab] = useState<'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'x'>('youtube')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  // Upload State
  const [dragActive, setDragActive] = useState<boolean>(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedVideoResult, setUploadedVideoResult] = useState<VideoItem | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  // Settings State
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return (localStorage.getItem('prune_master_api_key') || localStorage.getItem('clipmaster_api_key')) || ''
  })
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
  const checkHealth = async () => {
    setIsChecking(true)
    try {
      const authHeaders: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
      const [healthRes, statsRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/stats', { headers: authHeaders })
      ])
      if (healthRes.ok && statsRes.ok) {
        const healthJson: HealthData = await healthRes.json()
        const statsJson: StatsData = await statsRes.json()
        setHealth(healthJson)
        setStats(statsJson)
        setIsBackendOnline(true)
      } else {
        setIsBackendOnline(false)
      }
    } catch {
      setIsBackendOnline(false)
    } finally {
      setIsChecking(false)
    }
  }
  const getAuthHeaders = (overrideToken?: string): Record<string, string> => {
    const token = overrideToken || authToken || (localStorage.getItem('prune_master_token') || localStorage.getItem('clipmaster_token')) || ''
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }
  const fetchTrialStatus = async (tokenOverride?: string) => {
    try {
      const token = tokenOverride !== undefined ? tokenOverride : authToken
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch('/api/auth/trial-status', { headers })
      if (res.ok) {
        const data: TrialStatus = await res.json()
        setTrialStatus(data)
        if (data.monetization_enabled !== undefined) {
          setMonetizationEnabled(data.monetization_enabled)
        }
      }
    } catch (err) {
      console.error('Failed to load trial status:', err)
    }
  }
  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingAvatar(true)
    setProfileToast(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/auth/avatar', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      })
      if (res.ok) {
        const data = await res.json()
        setProfileAvatarUrl(data.avatar_url)
        if (currentUser) {
          setCurrentUser({ ...currentUser, avatar_url: data.avatar_url })
        }
        setProfileToast({ type: 'success', text: 'Avatar photo uploaded!' })
      } else {
        const err = await res.json()
        setProfileToast({ type: 'error', text: err.detail || 'Upload failed.' })
      }
    } catch (err) {
      setProfileToast({ type: 'error', text: 'Network error during upload.' })
    } finally {
      setIsUploadingAvatar(false)
    }
  }
  const handleSaveProfile = async () => {
    setIsSavingProfile(true)
    setProfileToast(null)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          full_name: profileFullName.trim() || undefined,
          avatar_url: profileAvatarUrl.trim() || undefined,
          gemini_api_key: profileGeminiKey.trim() || undefined,
          gemini_model: profileGeminiModel || 'gemini-2.5-pro'
        })
      })
      if (res.ok) {
        const updated = await res.json()
        setCurrentUser(updated)
        setProfileToast({ type: 'success', text: 'Profile & AI preferences saved!' })
        setTimeout(() => setIsProfileModalOpen(false), 1200)
      } else {
        const err = await res.json()
        setProfileToast({ type: 'error', text: err.detail || 'Could not save profile.' })
      }
    } catch (err) {
      setProfileToast({ type: 'error', text: 'Failed to update profile.' })
    } finally {
      setIsSavingProfile(false)
    }
  }
  const handleActivatePro = async (plan: string) => {
    try {
      if (currentUser?.role === 'director') {
        alert('You are already the Master Director with unlimited platform access!')
        setIsProModalOpen(false)
        return
      }
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          is_pro: true
        })
      })
      if (res.ok) {
        const updated = await res.json()
        setCurrentUser(updated)
        await fetchTrialStatus()
        alert(`🎉 Congratulations! You have been upgraded to Prune Master Pro (${plan}) with Unlimited 4K renders, custom watermark, and priority AI!`)
        setIsProModalOpen(false)
      } else {
        alert('Could not activate plan at this moment. Please check backend.')
      }
    } catch (err) {
      console.error('Pro activation failed:', err)
    }
  }
  const loadVideos = async (scopeAll?: boolean, overrideToken?: string) => {
    // 1. Frame 0 Instant Cache: Read previously cached videos from localStorage
    try {
      const cached = localStorage.getItem('pm_cached_videos_v1')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVideos(parsed)
          setIsLoadingVideos(false)
        } else {
          setIsLoadingVideos(true)
        }
      } else {
        setIsLoadingVideos(true)
      }
    } catch {
      setIsLoadingVideos(true)
    }

    try {
      const useScope = scopeAll !== undefined ? scopeAll : directorScopeAll
      const scopeParam = useScope ? '?all_users=true' : ''
      const res = await fetch(`/api/videos${scopeParam}`, {
        headers: getAuthHeaders(overrideToken)
      })
      if (res.ok) {
        const data: VideoItem[] = await res.json()
        setVideos(data)
        try {
          // Cache up to 40 videos for instant offline/frame-0 render next visit
          localStorage.setItem('pm_cached_videos_v1', JSON.stringify(data.slice(0, 40)))
        } catch {}
      }
    } catch (err) {
      console.error('Failed to load videos:', err)
    } finally {
      setIsLoadingVideos(false)
    }
  }
  const updateDeviceStorageStats = async () => {
    try {
      const devClips = await getClipsFromDevice()
      setDeviceClipsCount(devClips.length)
      const est = await getDeviceStorageEstimate()
      setDeviceStorageMB(est.usedMB)
      setDeviceStorageQuotaMB(est.quotaMB)
    } catch (e) {
      console.warn('Error reading device stats:', e)
    }
  }

  const loadClips = async (scopeAll?: boolean, overrideToken?: string) => {
    // 1. Instant Frame 0: Read clips from device storage (IndexedDB) and hydrate UI immediately
    let deviceClips: LocalDeviceClip[] = []
    try {
      deviceClips = await getClipsFromDevice()
      if (deviceClips.length > 0) {
        const instantClips: ClipItem[] = deviceClips.map(dc => ({
          id: typeof dc.id === 'number' ? dc.id : Number(dc.id) || 9999,
          video_id: dc.videoId || 0,
          title: dc.title,
          start_time: 0,
          end_time: dc.duration,
          aspect_ratio: dc.aspectRatio || '9:16',
          file_path: dc.blobUrl || '',
          thumbnail_path: dc.thumbnailUrl || null,
          status: dc.status || 'completed',
          caption_style: 'word_red',
          created_at: dc.createdAt,
          localBlobUrl: dc.blobUrl,
          isDeviceStored: !!dc.videoBlob,
          deviceStorageSizeMB: dc.fileSizeBytes ? (dc.fileSizeBytes / (1024 * 1024)).toFixed(1) : undefined,
          rawBlob: dc.videoBlob
        }))
        setClips(instantClips)
        setIsLoadingClips(false)
      }
    } catch (e) {
      console.warn('Error loading device clips:', e)
    }

    if (deviceClips.length === 0) {
      setIsLoadingClips(true)
    }

    try {
      const useScope = scopeAll !== undefined ? scopeAll : directorScopeAll
      const scopeParam = useScope ? '?all_users=true' : ''

      const deviceMap = new Map(deviceClips.map(dc => [String(dc.id), dc]))

      // 2. Read clips from server
      let serverClips: ClipItem[] = []
      try {
        const res = await fetch(`/api/clips${scopeParam}`, {
          headers: getAuthHeaders(overrideToken)
        })
        if (res.ok) {
          serverClips = await res.json()
        }
      } catch (err) {
        console.warn('Server unreachable or pruned, using device storage clips:', err)
      }

      // 3. Merge: server clips get device blobUrl; device clips preserved even if pruned on cloud
      const mergedMap = new Map<string, ClipItem>()

      // Add device clips
      deviceClips.forEach(dc => {
        mergedMap.set(String(dc.id), {
          id: typeof dc.id === 'number' ? dc.id : Number(dc.id) || 9999,
          video_id: dc.videoId || 0,
          title: dc.title,
          start_time: 0,
          end_time: dc.duration,
          aspect_ratio: dc.aspectRatio || '9:16',
          file_path: dc.blobUrl || '',
          thumbnail_path: dc.thumbnailUrl || null,
          status: dc.status || 'completed',
          caption_style: 'word_red',
          created_at: dc.createdAt,
          localBlobUrl: dc.blobUrl,
          isDeviceStored: !!dc.videoBlob,
          deviceStorageSizeMB: dc.fileSizeBytes ? (dc.fileSizeBytes / (1024 * 1024)).toFixed(1) : undefined,
          rawBlob: dc.videoBlob
        })
      })

      // Merge server clips
      serverClips.forEach(sc => {
        const dev = deviceMap.get(String(sc.id))
        mergedMap.set(String(sc.id), {
          ...sc,
          localBlobUrl: dev?.blobUrl,
          isDeviceStored: !!dev?.videoBlob,
          deviceStorageSizeMB: dev?.fileSizeBytes ? (dev.fileSizeBytes / (1024 * 1024)).toFixed(1) : undefined,
          rawBlob: dev?.videoBlob
        })
      })

      const finalClips = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setClips(finalClips)
      updateDeviceStorageStats()
    } catch (err) {
      console.error('Failed to load clips:', err)
    } finally {
      setIsLoadingClips(false)
    }
  }

  const handleSaveSingleClipToDevice = async (clip: ClipItem) => {
    try {
      setDeviceStorageNotification(`Saving "${clip.title}" to device storage...`)
      const res = await fetch(`/api/clips/${clip.id}/download`)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      await saveClipToDevice({
        id: clip.id,
        serverClipId: clip.id,
        videoId: clip.video_id,
        title: clip.title,
        duration: clip.end_time - clip.start_time,
        aspectRatio: clip.aspect_ratio,
        createdAt: clip.created_at,
        status: clip.status,
        fileSizeBytes: blob.size,
      }, blob)
      await loadClips()
      setDeviceStorageNotification(`✅ "${clip.title}" saved on this device!`)
      setTimeout(() => setDeviceStorageNotification(null), 4000)
    } catch (e) {
      console.error('Failed to save clip to device:', e)
      setDeviceStorageNotification('❌ Could not save clip to device.')
      setTimeout(() => setDeviceStorageNotification(null), 4000)
    }
  }

  const handleSaveAllToDevice = async () => {
    setIsSavingToDevice(true)
    let saved = 0
    try {
      for (const clip of clips) {
        if (!clip.isDeviceStored && clip.status === 'completed') {
          setDeviceStorageNotification(`Saving ${clip.title} (${saved + 1}/${clips.length})...`)
          try {
            const res = await fetch(`/api/clips/${clip.id}/download`)
            if (res.ok) {
              const blob = await res.blob()
              await saveClipToDevice({
                id: clip.id,
                serverClipId: clip.id,
                videoId: clip.video_id,
                title: clip.title,
                duration: clip.end_time - clip.start_time,
                aspectRatio: clip.aspect_ratio,
                createdAt: clip.created_at,
                status: clip.status,
                fileSizeBytes: blob.size,
              }, blob)
              saved++
            }
          } catch (err) {
            console.warn('Could not save clip', clip.id, err)
          }
        }
      }
      await loadClips()
      setDeviceStorageNotification(`🎉 All clips saved to this device (${saved} new)!`)
      setTimeout(() => setDeviceStorageNotification(null), 5000)
    } catch (e) {
      console.error(e)
    } finally {
      setIsSavingToDevice(false)
    }
  }

  const handleDownloadAllClips = async () => {
    for (const clip of clips) {
      if (clip.rawBlob) {
        downloadBlobToDisk(clip.rawBlob, `${clip.title}.mp4`)
      } else {
        const link = document.createElement('a')
        link.href = clip.localBlobUrl || `/api/clips/${clip.id}/download`
        link.download = `${clip.title}.mp4`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
      await new Promise(r => setTimeout(r, 400))
    }
  }

  const handleClearDeviceStorage = async () => {
    if (window.confirm('Are you sure you want to clear device storage for this browser? This will free up storage space on your device.')) {
      await clearAllDeviceClips()
      await loadClips()
      setDeviceStorageNotification('Device storage cleared.')
      setTimeout(() => setDeviceStorageNotification(null), 3000)
    }
  }
  const loadDirectorUsers = async (overrideToken?: string) => {
    setIsLoadingDirectorUsers(true)
    try {
      const res = await fetch('/api/director/users', {
        headers: getAuthHeaders(overrideToken)
      })
      if (res.ok) {
        const data = await res.json()
        setDirectorUsers(data.users || [])
        setPendingUsersCount(data.pending_count || 0)
      }
    } catch (err) {
      console.error('Failed to load director users:', err)
    } finally {
      setIsLoadingDirectorUsers(false)
    }
  }
  const approveUser = async (userId: number, username: string) => {
    try {
      const res = await fetch(`/api/director/users/${userId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders()
      })
      if (res.ok) {
        setDirectorActionMsg(`✅ Approved ${username}! They can now log in to their personal workspace.`)
        setTimeout(() => setDirectorActionMsg(null), 4000)
        loadDirectorUsers()
      }
    } catch (err) {
      console.error('Approve failed:', err)
    }
  }
  const rejectUser = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to decline / suspend access for ${username}?`)) return
    try {
      const res = await fetch(`/api/director/users/${userId}/reject`, {
        method: 'POST',
        headers: getAuthHeaders()
      })
      if (res.ok) {
        setDirectorActionMsg(`Access declined / revoked for ${username}.`)
        setTimeout(() => setDirectorActionMsg(null), 4000)
        loadDirectorUsers()
      }
    } catch (err) {
      console.error('Reject failed:', err)
    }
  }
  const deleteUser = async (userId: number, username: string) => {
    if (!confirm(`Permanently remove ${username} from the system?`)) return
    try {
      const res = await fetch(`/api/director/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      if (res.ok) {
        setDirectorActionMsg(`User ${username} removed.`)
        setTimeout(() => setDirectorActionMsg(null), 4000)
        loadDirectorUsers()
      }
    } catch (err) {
      console.error('Delete user failed:', err)
    }
  }
  // VIP Unlimited Access Grant by Director
  const handleGrantVipByIdentifier = async () => {
    if (!vipIdentifierInput.trim()) {
      alert('Please enter an email, username, or client IP address.')
      return
    }
    setIsGrantingVip(true)
    try {
      const res = await fetch('/api/director/grant-by-identifier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ identifier: vipIdentifierInput.trim() })
      })
      if (res.ok) {
        const data = await res.json()
        setDirectorActionMsg(data.message || '👑 Unlimited VIP Access Granted!')
        setVipIdentifierInput('')
        setTimeout(() => setDirectorActionMsg(null), 5000)
        loadDirectorUsers()
        fetchTrialStatus()
      } else {
        const err = await res.json()
        alert(err.detail || 'Could not grant unlimited access.')
      }
    } catch (err) {
      alert('Network error while granting unlimited access.')
    } finally {
      setIsGrantingVip(false)
    }
  }
  const grantUserUnlimitedVip = async (userId: number, username: string) => {
    try {
      const res = await fetch(`/api/director/users/${userId}/grant-unlimited`, {
        method: 'POST',
        headers: getAuthHeaders()
      })
      if (res.ok) {
        const data = await res.json()
        setDirectorActionMsg(data.message || `👑 Granted Unlimited VIP Access to ${username}!`)
        setTimeout(() => setDirectorActionMsg(null), 4000)
        loadDirectorUsers()
        fetchTrialStatus()
      } else {
        const err = await res.json()
        alert(err.detail || 'Could not grant unlimited access.')
      }
    } catch (err) {
      console.error('Grant unlimited failed:', err)
    }
  }
  const revokeUserUnlimitedVip = async (userId: number, username: string) => {
    if (!confirm(`Revoke unlimited VIP access from ${username} and reset to standard tier?`)) return
    try {
      const res = await fetch(`/api/director/users/${userId}/revoke-unlimited`, {
        method: 'POST',
        headers: getAuthHeaders()
      })
      if (res.ok) {
        const data = await res.json()
        setDirectorActionMsg(data.message || `Unlimited access revoked for ${username}.`)
        setTimeout(() => setDirectorActionMsg(null), 4000)
        loadDirectorUsers()
        fetchTrialStatus()
      } else {
        const err = await res.json()
        alert(err.detail || 'Could not revoke unlimited access.')
      }
    } catch (err) {
      console.error('Revoke unlimited failed:', err)
    }
  }
  const handleDirectorResetPassword = async (userId: number, username: string) => {
    const newPass = prompt(`Enter a new temporary password for @${username} (minimum 6 characters):`, 'PruneMaster2026!')
    if (!newPass) return
    if (newPass.trim().length < 6) {
      alert('Password must be at least 6 characters long.')
      return
    }
    try {
      const res = await fetch(`/api/director/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ new_password: newPass.trim() })
      })
      const data = await res.json()
      if (res.ok) {
        setDirectorActionMsg(data.message || `Password for @${username} reset successfully!`)
        setTimeout(() => setDirectorActionMsg(null), 6000)
      } else {
        alert(data.detail || 'Failed to reset password.')
      }
    } catch (err) {
      alert('Network error while resetting password.')
    }
  }
  const handleToggleMonetization = async (targetState: boolean) => {
    setIsTogglingMonetization(true)
    try {
      const res = await fetch('/api/director/toggle-monetization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ enabled: targetState })
      })
      if (res.ok) {
        const data = await res.json()
        setMonetizationEnabled(data.monetization_enabled)
        setDirectorActionMsg(data.message)
        setTimeout(() => setDirectorActionMsg(null), 5000)
        await fetchTrialStatus()
      } else {
        const err = await res.json()
        alert(err.detail || 'Could not update monetization switch')
      }
    } catch (err) {
      console.error('Toggle monetization failed:', err)
      alert('Network error updating monetization switch')
    } finally {
      setIsTogglingMonetization(false)
    }
  }
  const handleLogin = async (e?: React.FormEvent, customLogin?: string, customPass?: string) => {
    if (e) e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)
    setAuthSuccessMsg(null)
    const loginVal = (customLogin || authLoginInput).trim()
    const passVal = customPass || authPasswordInput
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginVal, password: passVal })
      })
      const data = await res.json()
      if (res.ok) {
        localStorage.setItem('prune_master_token', data.token); localStorage.setItem('clipmaster_token', data.token)
        setAuthToken(data.token)
        setCurrentUser(data.user)
        setIsAuthModalOpen(false)
        setAuthSuccessMsg(`Welcome back, ${data.user.full_name}!`)
        setTimeout(() => setAuthSuccessMsg(null), 3500)
        loadVideos()
        loadClips()
        if (data.user.role === 'director') {
          loadDirectorUsers()
        }
        fetchTrialStatus(data.token)
      } else {
        setAuthError(data.detail || 'Sign in failed. Please check your credentials.')
      }
    } catch (err) {
      setAuthError('Connection error. Is the backend server running?')
    } finally {
      setAuthLoading(false)
    }
  }
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)
    setAuthSuccessMsg(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: regFullName.trim(),
          username: regUsername.trim(),
          email: regEmail.trim(),
          password: regPassword
        })
      })
      const data = await res.json()
      if (res.ok) {
        if (data.status === 'approved' && data.token) {
          localStorage.setItem('prune_master_token', data.token); localStorage.setItem('clipmaster_token', data.token)
          setAuthToken(data.token)
          setCurrentUser(data.user)
          setIsAuthModalOpen(false)
          fetchTrialStatus(data.token)
        } else {
          setAuthSuccessMsg(data.message)
          setRegFullName('')
          setRegUsername('')
          setRegEmail('')
          setRegPassword('')
        }
      } else {
        setAuthError(data.detail || 'Registration failed.')
      }
    } catch (err) {
      setAuthError('Connection error. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)
    setAuthSuccessMsg(null)
    if (forgotNewPasswordInput !== forgotConfirmPasswordInput) {
      setAuthError('New passwords do not match. Please re-enter them.')
      setAuthLoading(false)
      return
    }
    if (forgotNewPasswordInput.length < 6) {
      setAuthError('New password must be at least 6 characters long.')
      setAuthLoading(false)
      return
    }
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: forgotLoginInput.trim(),
          full_name: forgotFullNameInput.trim(),
          new_password: forgotNewPasswordInput
        })
      })
      const data = await res.json()
      if (res.ok) {
        if (data.token && data.user) {
          localStorage.setItem('prune_master_token', data.token); localStorage.setItem('clipmaster_token', data.token)
          setAuthToken(data.token)
          setCurrentUser(data.user)
          setIsAuthModalOpen(false)
          setAuthSuccessMsg(data.message || 'Password successfully reset!')
          setTimeout(() => setAuthSuccessMsg(null), 4000)
          loadVideos()
          loadClips()
          if (data.user.role === 'director') {
            loadDirectorUsers()
          }
          fetchTrialStatus(data.token)
        } else {
          setAuthSuccessMsg(data.message || 'Password successfully reset!')
        }
        setForgotLoginInput('')
        setForgotFullNameInput('')
        setForgotNewPasswordInput('')
        setForgotConfirmPasswordInput('')
      } else {
        setAuthError(data.detail || 'Password recovery failed. Please verify your details.')
      }
    } catch (err) {
      setAuthError('Connection error during recovery. Is the backend server running?')
    } finally {
      setAuthLoading(false)
    }
  }
  const handleLogout = () => {
    localStorage.removeItem('prune_master_token'); localStorage.removeItem('clipmaster_token')
    setAuthToken('')
    setCurrentUser(null)
    setVideos([])
    setClips([])
    fetchTrialStatus('')
    setIsAuthModalOpen(true)
  }
  useEffect(() => {
    // 1. Detect if Render container is sleeping on cold-start (unresponsive for >2.8s)
    let isConnected = false
    const wakeUpTimer = setTimeout(() => {
      if (!isConnected) {
        setIsWakingUpServer(true)
      }
    }, 2800)

    const initAuthAndData = async () => {
      // Background health check
      checkHealth().then(() => {
        isConnected = true
        clearTimeout(wakeUpTimer)
        setIsWakingUpServer(false)
      }).catch(() => {})

      // Hydrate cached user from localStorage immediately for 0ms initial render
      const cachedUserStr = localStorage.getItem('prune_master_user')
      if (cachedUserStr) {
        try {
          const cachedUser = JSON.parse(cachedUserStr)
          setCurrentUser(cachedUser)
        } catch (_) {}
      }

      const savedToken = (localStorage.getItem('prune_master_token') || localStorage.getItem('clipmaster_token'))
      if (savedToken) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${savedToken}` }
          })
          if (res.ok) {
            isConnected = true
            clearTimeout(wakeUpTimer)
            setIsWakingUpServer(false)
            const user = await res.json()
            setCurrentUser(user)
            localStorage.setItem('prune_master_user', JSON.stringify(user))
            setAuthToken(savedToken)
            // UNBLOCK UI IMMEDIATELY! User sees the app in milliseconds
            setIsCheckingAuth(false)

            // Non-blocking parallel data fetch
            Promise.allSettled([
              user.role === 'director' ? loadDirectorUsers(savedToken) : Promise.resolve(),
              loadVideos(undefined, savedToken),
              loadClips(undefined, savedToken),
              fetchTrialStatus(savedToken)
            ])
            return
          }
        } catch (e) {
          console.error('Failed to verify token:', e)
        }
      }
      // No valid session: Unblock UI immediately to login/register portal
      localStorage.removeItem('prune_master_token'); localStorage.removeItem('clipmaster_token'); localStorage.removeItem('prune_master_user')
      setAuthToken('')
      setCurrentUser(null)
      setVideos([])
      setClips([])
      setIsCheckingAuth(false)
      fetchTrialStatus('')
    }
    initAuthAndData()
    const interval = setInterval(checkHealth, 15000)
    return () => {
      clearTimeout(wakeUpTimer)
      clearInterval(interval)
    }
  }, [])

  // 24/7 Render Free-Tier Wake-Up Live Polling & Countdown
  useEffect(() => {
    if (!isWakingUpServer) return
    const timer = setInterval(() => {
      setWakeUpSecondsLeft(prev => (prev <= 1 ? 1 : prev - 1))
      // High-speed ping to catch the exact second Render wakes up
      fetch('/api/ping')
        .then(res => {
          if (res.ok) {
            setIsWakingUpServer(false)
            setIsBackendOnline(true)
          }
        })
        .catch(() => {})
    }, 1500)
    return () => clearInterval(timer)
  }, [isWakingUpServer])

  // 24/7 In-Tab Keep-Alive Heartbeat: pings /api/ping every 7 minutes to prevent Render free-tier sleep while tab is open
  useEffect(() => {
    const keepAliveInterval = setInterval(() => {
      fetch('/api/ping').catch(() => {})
    }, 7 * 60 * 1000)
    return () => clearInterval(keepAliveInterval)
  }, [])
  // Global Escape key handler to cancel/close any open video or modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedPreviewVideo(null)
        setSelectedPreviewClip(null)
        setHighlightModalVideo(null)
        setActiveTranscriptVideo(null)
        setSocialModalClip(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  // Poll Active Background Jobs (Transcription & Clip Rendering)
  useEffect(() => {
    const jobKeys = Object.keys(activeJobs)
    if (jobKeys.length === 0) return
    const pollInterval = setInterval(async () => {
      for (const key of jobKeys) {
        const currentJob = activeJobs[key]
        if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'failed') continue
        try {
          const res = await fetch(`/api/jobs/${currentJob.jobId}`)
          if (res.ok) {
            const jobInfo = await res.json()
            setActiveJobs(prev => ({
              ...prev,
              [key]: {
                jobId: jobInfo.id,
                progress: jobInfo.progress,
                message: jobInfo.message,
                status: jobInfo.status
              }
            }))
            if (jobInfo.status === 'completed' || jobInfo.status === 'failed') {
              loadVideos()
              loadClips()
              checkHealth()
            }
          }
        } catch (err) {
          console.error(`Error polling job ${currentJob.jobId}:`, err)
        }
      }
    }, 1200)
    return () => clearInterval(pollInterval)
  }, [activeJobs])
  const triggerTranscription = async (videoId: number) => {
    const model = selectedModelSize[videoId] || 'tiny'
    try {
      const res = await fetch(`/api/videos/${videoId}/transcribe?model_size=${model}`, {
        method: 'POST'
      })
      if (res.ok) {
        const job = await res.json()
        setActiveJobs(prev => ({
          ...prev,
          [`video_${videoId}`]: {
            jobId: job.id,
            progress: job.progress || 5,
            message: job.message || 'Starting...',
            status: job.status || 'running'
          }
        }))
        setVideos(prev =>
          prev.map(v => (v.id === videoId ? { ...v, status: 'transcribing' } : v))
        )
      }
    } catch (err) {
      console.error('Failed to trigger transcription:', err)
    }
  }
  const startBatchMining = async () => {
    if (selectedBatchVideoIds.length === 0) {
      alert('Please select at least 1 video (or 2+ videos) for batch mining.')
      return
    }

    setIsBatchMining(true)
    try {
      const res = await fetch('/api/videos/batch-mine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_ids: selectedBatchVideoIds,
          clip_count: clipCount,
          lab_mode: labMode,
          framing_mode: framingMode,
          min_duration: minDuration,
          max_duration: maxDuration,
          resolution: resolution,
          burn_captions: burnCaptions,
          caption_style: captionStyle,
          aspect_ratio: aspectRatio,
          timeline_strategy: timelineStrategy
        })
      })

      if (res.ok) {
        const data = await res.json()
        const newBatchJobs: { [key: string]: any } = {}
        data.jobs.forEach((j: any) => {
          newBatchJobs[j.job_id] = {
            videoId: j.video_id,
            videoName: j.video_name,
            jobId: j.job_id,
            progress: j.progress,
            message: j.message,
            status: j.status
          }
        })
        setBatchMiningJobs(prev => ({ ...prev, ...newBatchJobs }))

        data.jobs.forEach((j: any) => {
          const pollTimer = setInterval(async () => {
            try {
              const jRes = await fetch(`/api/jobs/${j.job_id}`)
              if (jRes.ok) {
                const jData = await jRes.json()
                setBatchMiningJobs(prev => ({
                  ...prev,
                  [j.job_id]: {
                    ...prev[j.job_id],
                    progress: jData.progress,
                    message: jData.message,
                    status: jData.status
                  }
                }))

                if (jData.status === 'completed' || jData.status === 'failed') {
                  clearInterval(pollTimer)
                  loadClips()
                }
              }
            } catch (err) {
              console.error('Batch job poll error:', err)
            }
          }, 1500)
        })
      }
    } catch (err) {
      console.error('Batch mining failed:', err)
    } finally {
      setIsBatchMining(false)
    }
  }

  const toggleBatchVideo = (id: number) => {
    setSelectedBatchVideoIds(prev =>
      prev.includes(id) ? prev.filter(vId => vId !== id) : [...prev, id]
    )
  }

  const selectAllBatchVideos = () => {
    if (selectedBatchVideoIds.length === videos.length) {
      setSelectedBatchVideoIds([])
    } else {
      setSelectedBatchVideoIds(videos.map(v => v.id))
    }
  }

  // ViralMinner Pipeline: Multi-Clip Miner
  // 1. Analyze Video to Discover Important Segments
  const handleAnalyzeVideo = async (video: VideoItem) => {
    setAnalyzingVideo(video)
    setIsAnalyzingVideo(true)
    setAnalysisProgress(10)
    setAnalysisMessage('Checking audio & speech transcript with Whisper AI...')
    setDiscoveredMoments([])
    setSelectedMomentIds({})
    setActiveMomentPreview(null)

    try {
      const res = await fetch(`/api/videos/${video.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          clip_count: clipCount,
          lab_mode: labMode,
          min_duration: minDuration,
          max_duration: maxDuration,
          timeline_strategy: timelineStrategy
        })
      })

      if (!res.ok) {
        throw new Error(`Analysis request failed with status ${res.status}`)
      }

      const data = await res.json()

      // Synchronous return (video already transcribed)
      if (data.status === 'completed' && Array.isArray(data.highlights)) {
        setDiscoveredMoments(data.highlights)
        const initialSelected: { [id: string]: boolean } = {}
        data.highlights.forEach((h: HighlightCandidate) => {
          initialSelected[h.id] = true
        })
        setSelectedMomentIds(initialSelected)
        if (data.highlights.length > 0) {
          setActiveMomentPreview(data.highlights[0])
        }
        setIsAnalyzingVideo(false)
        setAnalysisProgress(100)
        setAnalysisMessage(`Done! Discovered ${data.highlights.length} important moments.`)
        return
      }

      // Background job polling
      if (data.job_id) {
        const jobId = data.job_id
        const pollInterval = setInterval(async () => {
          try {
            const jRes = await fetch(`/api/jobs/${jobId}`)
            if (jRes.ok) {
              const jData = await jRes.json()
              setAnalysisProgress(jData.progress || 15)
              setAnalysisMessage(jData.message || 'AI analyzing video moments...')

              if (jData.status === 'completed') {
                clearInterval(pollInterval)
                setIsAnalyzingVideo(false)
                setAnalysisProgress(100)
                let hlList: HighlightCandidate[] = []
                if (jData.details) {
                  try {
                    hlList = JSON.parse(jData.details)
                  } catch (e) {
                    console.error('Failed to parse highlights from job details:', e)
                  }
                }
                if (hlList.length === 0) {
                  const hlRes = await fetch(`/api/videos/${video.id}/highlights?clip_count=${clipCount}&lab_mode=${labMode}&min_duration=${minDuration}&max_duration=${maxDuration}&timeline_strategy=${timelineStrategy}`)
                  if (hlRes.ok) {
                    const hlData = await hlRes.json()
                    hlList = hlData.highlights || []
                  }
                }
                setDiscoveredMoments(hlList)
                const initialSelected: { [id: string]: boolean } = {}
                hlList.forEach((h: HighlightCandidate) => {
                  initialSelected[h.id] = true
                })
                setSelectedMomentIds(initialSelected)
                if (hlList.length > 0) {
                  setActiveMomentPreview(hlList[0])
                }
                loadVideos()
              } else if (jData.status === 'failed') {
                clearInterval(pollInterval)
                setIsAnalyzingVideo(false)
                setAnalysisMessage(`Analysis failed: ${jData.message}`)
              }
            }
          } catch (err) {
            console.error('Job polling error:', err)
          }
        }, 1200)
      }
    } catch (err: any) {
      setIsAnalyzingVideo(false)
      setAnalysisMessage(`Error: ${err.message || 'Failed to start video analysis'}`)
    }
  }

  // 2. Toggle Selection of a Segment
  const toggleSelectMoment = (candId: string) => {
    setSelectedMomentIds(prev => ({
      ...prev,
      [candId]: !prev[candId]
    }))
  }

  // 3. Select / Deselect All Segments
  const selectAllMoments = (select: boolean) => {
    const updated: { [id: string]: boolean } = {}
    discoveredMoments.forEach(m => {
      updated[m.id] = select
    })
    setSelectedMomentIds(updated)
  }

  // 4. Fine-tune Segment Start / End Times
  const updateMomentTime = (candId: string, field: 'start_time' | 'end_time', delta: number) => {
    setDiscoveredMoments(prev =>
      prev.map(c => {
        if (c.id !== candId) return c
        let newVal = Math.max(0, c[field] + delta)
        newVal = Math.round(newVal * 10) / 10
        if (field === 'start_time' && newVal >= c.end_time) return c
        if (field === 'end_time' && newVal <= c.start_time) return c
        const updated = {
          ...c,
          [field]: newVal,
          duration: field === 'start_time' ? Math.round((c.end_time - newVal) * 10) / 10 : Math.round((newVal - c.start_time) * 10) / 10
        }
        if (activeMomentPreview?.id === candId) {
          setActiveMomentPreview(updated)
        }
        return updated
      })
    )
  }

  // 5. Play Snippet in Studio Preview
  const playStudioMomentSnippet = (cand: HighlightCandidate) => {
    setActiveMomentPreview(cand)
    if (studioPreviewVideoRef.current) {
      studioPreviewVideoRef.current.currentTime = cand.start_time
      studioPreviewVideoRef.current.play()
    }
  }

  // 6. Cut & Export Selected Segments
  const handleCutSelectedMoments = async () => {
    if (!analyzingVideo) return
    const chosen = discoveredMoments.filter(m => selectedMomentIds[m.id])
    if (chosen.length === 0) {
      alert('Please select at least 1 important segment to cut!')
      return
    }

    setIsCuttingSelectedMoments(true)
    try {
      const res = await fetch(`/api/videos/${analyzingVideo.id}/cut-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          segments: chosen.map(m => ({
            title: m.title,
            start_time: m.start_time,
            end_time: m.end_time,
            score: m.score,
            reason: m.reason,
            text: m.text
          })),
          framing_mode: framingMode,
          burn_captions: burnCaptions,
          caption_style: captionStyle,
          resolution: resolution,
          aspect_ratio: aspectRatio
        })
      })

      if (!res.ok) {
        throw new Error(`Cut request failed with status ${res.status}`)
      }

      const data = await res.json()
      if (data.job_id) {
        const jobId = data.job_id
        setCutSegmentsJob({
          jobId,
          
          status: 'running',
          progress: 5,
          message: `Cutting ${chosen.length} selected shorts...`
        })

        const pollInterval = setInterval(async () => {
          try {
            const jRes = await fetch(`/api/jobs/${jobId}`)
            if (jRes.ok) {
              const jData = await jRes.json()
              setCutSegmentsJob({
                jobId,
                
                status: jData.status,
                progress: jData.progress || 5,
                message: jData.message || 'Cutting clips...'
              })

              if (jData.status === 'completed') {
                clearInterval(pollInterval)
                setIsCuttingSelectedMoments(false)
                loadClips()
                // Auto-save the freshly cut shorts directly into user's phone/laptop storage!
                setTimeout(() => handleSaveAllToDevice(), 1200)
                checkHealth()
                fetchTrialStatus()
              } else if (jData.status === 'failed') {
                clearInterval(pollInterval)
                setIsCuttingSelectedMoments(false)
              }
            }
          } catch (err) {
            console.error('Job polling error:', err)
          }
        }, 1200)
      }
    } catch (err: any) {
      setIsCuttingSelectedMoments(false)
      alert(`Error starting cut: ${err.message}`)
    }
  }

  const handleImportVideoToEditor = (file: File) => {
    const objectUrl = URL.createObjectURL(file)
    const newClip: ClipItem = {
      id: Date.now(),
      video_id: 0,
      title: file.name.replace(/\.[^/.]+$/, ''),
      start_time: 0,
      end_time: 60,
      aspect_ratio: '9:16',
      file_path: objectUrl,
      thumbnail_path: null,
      status: 'completed',
      caption_style: 'word_red',
      created_at: new Date().toISOString(),
      localBlobUrl: objectUrl,
      rawBlob: file,
      isDeviceStored: true
    }
    setEditorClip(newClip)
    setActiveTab('editor')
  }

  const startMiningPipeline = async (videoId: number) => {
    try {
      const vid = videos.find(v => v.id === videoId) || uploadedVideoResult
      if (vid) setAutoMiningVideo(vid)
      const res = await fetch(
        `/api/videos/${videoId}/mine?clip_count=${clipCount}&lab_mode=${labMode}&framing_mode=${framingMode}&min_duration=${minDuration}&max_duration=${maxDuration}&resolution=${resolution}&burn_captions=${burnCaptions}&caption_style=${captionStyle}&aspect_ratio=${aspectRatio}&timeline_strategy=${timelineStrategy}`,
        { method: 'POST' }
      )
      if (res.ok) {
        const job = await res.json()
        const jobState = {
          jobId: job.id,
          progress: job.progress || 5,
          message: job.message || `Starting ${labMode.toUpperCase()} Lab mining...`,
          status: 'running'
        }
        setActiveMiningJob(jobState)
        setActiveJobs(prev => ({ ...prev, [`video_${videoId}`]: jobState }))
        // Poll job until complete
        const pollInterval = setInterval(async () => {
          try {
            const jRes = await fetch(`/api/jobs/${job.id}`)
            if (jRes.ok) {
              const jData = await jRes.json()
              const updatedState = {
                jobId: jData.id,
                progress: jData.progress,
                message: jData.message,
                status: jData.status
              }
              setActiveMiningJob(updatedState)
              setActiveJobs(prev => ({ ...prev, [`video_${videoId}`]: updatedState }))
              if (jData.status === 'completed') {
                clearInterval(pollInterval)
                loadClips()
                loadVideos()
                checkHealth()
                setTimeout(() => {
                  setActiveTab('clips')
                  setActiveMiningJob(null)
                  setAutoMiningVideo(null)
                }, 1800)
              } else if (jData.status === 'failed') {
                clearInterval(pollInterval)
              }
            }
          } catch (e) {
            console.error('Poll error:', e)
          }
        }, 2000)
      }
    } catch (err) {
      console.error('Failed to start mining:', err)
    }
  }
  // Autonomous Natural Language Prompt Parser
  const parsePromptIntent = (promptText: string) => {
    const lower = promptText.toLowerCase()
    // Detect Target Video
    let matchedVidId: number | null = null
    if (autonomousTargetVideoId !== 'auto') {
      matchedVidId = autonomousTargetVideoId
    } else {
      for (const v of videos) {
        if (lower.includes(v.original_name.toLowerCase()) || lower.includes(v.filename.toLowerCase())) {
          matchedVidId = v.id
          break
        }
      }
      if (!matchedVidId && videos.length > 0) {
        matchedVidId = videos[0].id
      }
    }
    // Detect Clip Count
    let count = 4
    const countMatch = lower.match(/(\d+)\s*(clips?|shorts?|highlights?|moments?|parts?)/)
    if (countMatch) {
      count = Math.max(1, Math.min(10, parseInt(countMatch[1])))
    }
    // Detect Subtitle / Captions
    const noCaptions = lower.includes('no caption') || lower.includes('without caption') || lower.includes('disable caption') || lower.includes('no edit') || lower.includes('raw')
    let capStyle = 'word_yellow'
    if (lower.includes('red')) capStyle = 'word_red'
    else if (lower.includes('white')) capStyle = 'word_white'
    else if (lower.includes('purple')) capStyle = 'phrase_purple'
    // Detect Resolution
    let res: '4k' | '1080p' | '720p' = '1080p'
    if (lower.includes('4k') || lower.includes('uhd')) res = '4k'
    else if (lower.includes('720p')) res = '720p'
    // Detect Duration Range
    let minD = 25
    let maxD = 60
    if (lower.includes('10-20') || lower.includes('15s')) { minD = 15; maxD = 30 }
    else if (lower.includes('30-60') || lower.includes('30s')) { minD = 30; maxD = 60 }
    else if (lower.includes('60-90')) { minD = 60; maxD = 90 }
    // Detect Framing & Aspect Ratio
    let framing: 'smart_face' | 'blur' | 'crop' = 'smart_face'
    if (lower.includes('blur')) framing = 'blur'
    else if (lower.includes('crop')) framing = 'crop'
    let aspect: '9:16' | '16:9' = '9:16'
    if (lower.includes('16:9') || lower.includes('widescreen') || lower.includes('landscape')) {
      aspect = '16:9'
    }
    const lab: 'sermon' | 'podcast' = (lower.includes('sermon') || lower.includes('preach') || lower.includes('pastor') || lower.includes('church') ? 'sermon' : 'podcast')
    return {
      targetVidId: matchedVidId,
      clipCount: count,
      burnCaptions: !noCaptions,
      captionStyle: noCaptions ? 'none' : capStyle,
      resolution: res,
      minDuration: minD,
      maxDuration: maxD,
      framingMode: framing,
      aspectRatio: aspect,
      labMode: lab
    }
  }
  // Execute Autonomous Prompt-to-Publish Workflow
  const executeAutonomousWorkflow = async (customConfig?: any) => {
    const config = customConfig || parsePromptIntent(autonomousPromptText)
    const targetId = config.targetVidId || (videos.length > 0 ? videos[0].id : null)
    if (!targetId) {
      alert('No video available to process. Please upload a source video or select one from your library.')
      return
    }
    const targetVid = videos.find(v => v.id === targetId) || videos[0]
    setIsExecutingAutonomous(true)
    setAutonomousProgress(8)
    setAutonomousStep(1)
    setAutonomousStatusMsg(`Ingesting ${targetVid.original_name} from folder & extracting audio...`)
    try {
      const query = new URLSearchParams({
        clip_count: config.clipCount.toString(),
        lab_mode: config.labMode,
        framing_mode: config.framingMode,
        min_duration: config.minDuration.toString(),
        max_duration: config.maxDuration.toString(),
        resolution: config.resolution,
        burn_captions: config.burnCaptions.toString(),
        caption_style: config.captionStyle,
        aspect_ratio: config.aspectRatio,
        timeline_strategy: 'timeline_balanced'
      })
      const res = await fetch(`/api/videos/${targetVid.id}/mine?${query.toString()}`, {
        method: 'POST',
        headers: getAuthHeaders()
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Autonomous mining request failed.')
      }
      const job = await res.json()
      setAutonomousJobId(job.id)
      // Background Polling
      const pollInterval = setInterval(async () => {
        try {
          const jRes = await fetch(`/api/jobs/${job.id}`)
          if (jRes.ok) {
            const jData = await jRes.json()
            setAutonomousProgress(jData.progress || 15)
            setAutonomousStatusMsg(jData.message || 'Executing autonomous pipeline...')
            if (jData.progress < 25) setAutonomousStep(1)
            else if (jData.progress < 55) setAutonomousStep(2)
            else if (jData.progress < 70) setAutonomousStep(3)
            else if (jData.progress < 90) setAutonomousStep(4)
            else setAutonomousStep(5)
            if (jData.status === 'completed') {
              clearInterval(pollInterval)
              setIsExecutingAutonomous(false)
              setAutonomousProgress(100)
              setAutonomousStep(5)
              setAutonomousStatusMsg(`🎉 Success! All ${config.clipCount} shorts autonomously cut, edited, reframed to ${config.aspectRatio}, and exported!`)
              loadClips()
              loadVideos()
              checkHealth()
              fetchTrialStatus()
            } else if (jData.status === 'failed') {
              clearInterval(pollInterval)
              setIsExecutingAutonomous(false)
              setAutonomousStatusMsg(`Error: ${jData.message}`)
            }
          }
        } catch (pollErr) {
          console.error('Autonomous job poll error:', pollErr)
        }
      }, 1500)
    } catch (err: any) {
      setIsExecutingAutonomous(false)
      setAutonomousStatusMsg(`Failed to launch autonomous pipeline: ${err.message}`)
    }
  }
  // Import from YouTube and Auto-Mine
  const importYoutubeAndMine = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!youtubeUrl.trim()) return
    setIsImportingYoutube(true)
    setYoutubeError(null)
    try {
      const res = await fetch('/api/videos/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ url: youtubeUrl.trim() })
      })
      if (res.ok) {
        const video: VideoItem = await res.json()
        setYoutubeUrl('')
        loadVideos()
        checkHealth()
        startMiningPipeline(video.id)
      } else {
        const err = await res.json()
        setYoutubeError(err.detail || 'Failed to download YouTube video.')
      }
    } catch {
      setYoutubeError('Network error connecting to YouTube import.')
    } finally {
      setIsImportingYoutube(false)
    }
  }
  // 1-Click Auto-Cut Pipeline
  const triggerAutoCut = async (videoId: number) => {
    try {
      const res = await fetch(`/api/videos/${videoId}/auto-cut`, { method: 'POST' })
      if (res.ok) {
        const job = await res.json()
        setActiveJobs(prev => ({
          ...prev,
          [`video_${videoId}`]: {
            jobId: job.id,
            progress: job.progress || 5,
            message: job.message || 'Auto-cutting short reel...',
            status: job.status || 'running'
          }
        }))
        setVideos(prev =>
          prev.map(v => (v.id === videoId ? { ...v, status: 'transcribing' } : v))
        )
        // Refresh videos and clips periodically
        setTimeout(loadClips, 4000)
      }
    } catch (err) {
      console.error('Failed to trigger auto cut:', err)
    }
  }
  // Trigger Phase 5 9:16 Vertical Video Render
  const triggerClipRender = async (clipId: number) => {
    const opts = renderOptions[clipId] || { framing: 'blur', captions: true, style: 'default', resolution: '1080p', aspectRatio: '9:16' }
    const rawRatio = opts.aspectRatio || '9:16'
    const cleanRatio = rawRatio.includes('16:9') ? '16:9' : (rawRatio.includes('1:1') ? '1:1' : '9:16')
    try {
      const res = await fetch(
        `/api/clips/${clipId}/render?framing_mode=${opts.framing}&burn_captions=${opts.captions}&caption_style=${opts.style}&resolution=${opts.resolution || '1080p'}&aspect_ratio=${cleanRatio}`,
        { method: 'POST' }
      )
      if (res.ok) {
        const job = await res.json()
        setActiveJobs(prev => ({
          ...prev,
          [`clip_${clipId}`]: {
            jobId: job.id,
            progress: job.progress || 5,
            message: job.message || 'Starting render...',
            status: job.status || 'running'
          }
        }))
        setClips(prev =>
          prev.map(c => (c.id === clipId ? { ...c, status: 'rendering' } : c))
        )
      }
    } catch (err) {
      console.error('Render clip failed:', err)
    }
  }
  // Social Media Post Kit & Viral Captions
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2200)
  }
  const openSocialModal = async (clip: ClipItem) => {
    setSocialModalClip(clip)
    setIsLoadingMetadata(true)
    setSocialMetadata(null)
    setActivePlatformTab('youtube')
    try {
      const apiKey = (localStorage.getItem('prune_master_api_key') || localStorage.getItem('clipmaster_api_key')) || ''
      const url = `/api/clips/${clip.id}/metadata${apiKey ? `?api_key=${encodeURIComponent(apiKey)}` : ''}`
      const res = await fetch(url)
      if (res.ok) {
        const data: SocialMetadata = await res.json()
        setSocialMetadata(data)
      }
    } catch (err) {
      console.error('Failed to load social metadata:', err)
    } finally {
      setIsLoadingMetadata(false)
    }
  }
  // Open Highlight Detection Studio
  const openHighlightStudio = async (video: VideoItem) => {
    setHighlightModalVideo(video)
    setIsLoadingHighlights(true)
    setCandidates([])
    setActiveSnippetPreview(null)
    const key = (localStorage.getItem('prune_master_api_key') || localStorage.getItem('clipmaster_api_key')) || ''
    const headers: Record<string, string> = {}
    if (key) headers['X-Gemini-Key'] = key
    try {
      const res = await fetch(`/api/videos/${video.id}/highlights?target_count=5&lab_mode=${labMode}`, {
        method: 'POST',
        headers
      })
      if (res.ok) {
        const data: HighlightCandidate[] = await res.json()
        setCandidates(data)
        if (data.length > 0) {
          setActiveSnippetPreview(data[0])
        }
      }
    } catch (err) {
      console.error('Failed to detect highlights:', err)
    } finally {
      setIsLoadingHighlights(false)
    }
  }
  // Approve Candidate and Save into SQLite Clips Table
  const approveCandidate = async (candidate: HighlightCandidate) => {
    if (!highlightModalVideo) return
    try {
      const res = await fetch('/api/clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: highlightModalVideo.id,
          title: candidate.title,
          start_time: candidate.start_time,
          end_time: candidate.end_time,
          aspect_ratio: '9:16',
          caption_style: 'default'
        })
      })
      if (res.ok) {
        setApprovedCandidateIds(prev => ({ ...prev, [candidate.id]: true }))
        loadClips()
        checkHealth()
      }
    } catch (err) {
      console.error('Approve clip failed:', err)
    }
  }
  // Fine-tune Candidate Timestamps
  const updateCandidateTime = (candId: string, field: 'start_time' | 'end_time', delta: number) => {
    setCandidates(prev =>
      prev.map(c => {
        if (c.id !== candId) return c
        let newVal = Math.max(0, c[field] + delta)
        newVal = Math.round(newVal * 10) / 10
        if (field === 'start_time' && newVal >= c.end_time) return c
        if (field === 'end_time' && newVal <= c.start_time) return c
        const updated = {
          ...c,
          [field]: newVal,
          duration: field === 'start_time' ? round(c.end_time - newVal) : round(newVal - c.start_time)
        }
        if (activeSnippetPreview?.id === candId) {
          setActiveSnippetPreview(updated)
        }
        return updated
      })
    )
  }
  const round = (val: number) => Math.round(val * 10) / 10
  const playSnippet = (cand: HighlightCandidate) => {
    setActiveSnippetPreview(cand)
    if (snippetVideoRef.current) {
      snippetVideoRef.current.currentTime = cand.start_time
      snippetVideoRef.current.play()
    }
  }
  const openTranscriptViewer = async (video: VideoItem) => {
    setActiveTranscriptVideo(video)
    setIsLoadingTranscript(true)
    setTranscriptData(null)
    setTranscriptSearch('')
    try {
      const res = await fetch(`/api/videos/${video.id}/transcript`)
      if (res.ok) {
        const data: TranscriptData = await res.json()
        setTranscriptData(data)
      }
    } catch (err) {
      console.error('Failed to load transcript:', err)
    } finally {
      setIsLoadingTranscript(false)
    }
  }
  const jumpToTimestamp = (seconds: number) => {
    if (modalVideoRef.current) {
      modalVideoRef.current.currentTime = seconds
      modalVideoRef.current.play()
    }
  }
  // Handle Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0])
    }
  }
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0])
    }
  }
  const handleFileSelection = (file: File) => {
    setUploadError(null)
    setUploadedVideoResult(null)
    const validExtensions = ['.mp4', '.mkv', '.mov', '.webm', '.avi', '.m4v']
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    if (!hasValidExt) {
      setUploadError(`Invalid video file. Supported extensions: ${validExtensions.join(', ')}`)
      return
    }
    setSelectedFile(file)
  }
  const startUpload = () => {
    if (!selectedFile) return
    setIsUploading(true)
    setUploadProgress(0)
    setUploadError(null)
    const formData = new FormData()
    formData.append('file', selectedFile)
    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100)
        setUploadProgress(percent)
      }
    })
    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        setIsUploading(false)
        if (xhr.status === 200) {
          try {
            const data: VideoItem = JSON.parse(xhr.responseText)
            setUploadedVideoResult(data)
            setSelectedFile(null)
            loadVideos()
            checkHealth()
            // Automatically analyze the uploaded video and discover its important segments
            handleAnalyzeVideo(data)
          } catch {
            setUploadError('Failed to parse upload server response.')
          }
        } else {
          if (xhr.status === 524) {
            setUploadError('Upload timed out (Error 524: Cloudflare 100s timeout). Because you are on the same Wi-Fi as the Director, please use the Local Wi-Fi link (http://192.168.0.131:5173) for instant high-speed uploads without timeouts! Or try a smaller clip (<50MB) or YouTube link.')
          } else if (xhr.status === 413) {
            setUploadError('Video file exceeds upload size limits. Use the Local Wi-Fi link or choose a smaller file.')
          } else {
            try {
              const err = JSON.parse(xhr.responseText)
              setUploadError(err.detail || 'Upload failed.')
            } catch {
              setUploadError(`Upload failed with status code ${xhr.status}`)
            }
          }
        }
      }
    }
    xhr.open('POST', '/api/videos/upload')
    if (authToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${authToken}`)
    }
    xhr.send(formData)
  }
  const deleteVideo = async (id: number) => {
    if (!confirm('Are you sure you want to delete this video, extracted audio, and transcript?')) return
    try {
      const res = await fetch(`/api/videos/${id}`, { method: 'DELETE' })
      if (res.ok) {
        if (selectedPreviewVideo?.id === id) setSelectedPreviewVideo(null)
        if (activeTranscriptVideo?.id === id) setActiveTranscriptVideo(null)
        loadVideos()
        loadClips()
        checkHealth()
      }
    } catch (err) {
      console.error('Delete video failed:', err)
    }
  }
  const deleteClip = async (id: number) => {
    if (!confirm('Are you sure you want to delete this clip?')) return
    try {
      const res = await fetch(`/api/clips/${id}`, { method: 'DELETE' })
      if (res.ok) {
        if (selectedPreviewClip?.id === id) setSelectedPreviewClip(null)
        loadClips()
        checkHealth()
      }
    } catch (err) {
      console.error('Delete clip failed:', err)
    }
  }
  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem('prune_master_api_key', geminiApiKey.trim()); localStorage.setItem('clipmaster_api_key', geminiApiKey.trim())
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2500)
  }
  const filteredSegments = transcriptData?.segments.filter(seg =>
    seg.text.toLowerCase().includes(transcriptSearch.toLowerCase())
  ) || []
  // Smart Cold-Start Wake-Up Screen for Render Free Tier
  if (isWakingUpServer) {
    const elapsedPct = Math.min(95, Math.round(((30 - wakeUpSecondsLeft) / 30) * 100))
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090c] text-zinc-300 p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#121320] border border-purple-500/40 shadow-2xl text-center space-y-5 animate-in fade-in duration-300">
          <div className="relative mx-auto w-16 h-16">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-600 flex items-center justify-center text-white shadow-xl shadow-purple-900/50 animate-pulse">
              <Zap className="h-8 w-8 text-yellow-300" />
            </div>
            <Loader2 className="h-8 w-8 animate-spin text-purple-400 absolute -bottom-1 -right-1" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
              <span>Waking Up Studio Engine</span>
              <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-700/60 px-2 py-0.5 rounded-full font-mono font-semibold">
                Render Cloud
              </span>
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              The free-tier cloud container is booting up from sleep mode. This takes ~20–30 seconds on cold start.
            </p>
          </div>

          {/* Progress bar with live countdown */}
          <div className="space-y-2">
            <div className="w-full bg-[#0a0a10] h-2.5 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="bg-gradient-to-r from-purple-500 via-indigo-500 to-amber-400 h-full transition-all duration-1000 ease-linear"
                style={{ width: `${Math.max(8, elapsedPct)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
              <span>Estimated boot: ~{wakeUpSecondsLeft}s</span>
              <span className="text-purple-300 font-bold">{elapsedPct}%</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0d0e17] border border-zinc-800/80 text-[11px] text-zinc-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              Auto-connecting...
            </span>
            <span className="text-zinc-500 text-[10px]">Pinging every 1.5s</span>
          </div>
        </div>
      </div>
    )
  }

  // Full-Screen Portal for Unauthenticated Users (Protects all director videos and features)
  if (isCheckingAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090c] text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl animate-pulse">
              <Scissors className="h-6 w-6" />
            </div>
            <Loader2 className="h-6 w-6 animate-spin text-purple-400 absolute -bottom-1 -right-1" />
          </div>
          <span className="text-xs font-semibold text-zinc-200">Loading Prune Master Studio...</span>
          <span className="text-[10px] text-zinc-500">Fast-connecting to server</span>
        </div>
      </div>
    )
  }
  if (!currentUser) {
    return (
      <div className="min-h-screen w-full bg-[#09090d] text-zinc-200 flex flex-col justify-between">
        {/* Top Navbar */}
        <header className="h-16 border-b border-[#20202a] bg-[#0f0f14]/80 backdrop-blur px-6 sm:px-12 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-base text-white tracking-wide">PRUNE MASTER AI</span>
              <span className="text-[10px] ml-2 font-mono font-medium px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/50">
                Studio Portal
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Studio Server Active</span>
          </div>
        </header>
        {/* Center Portal Card */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-md w-full bg-[#111116] border border-[#2b2b3a] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Card Header */}
            <div className="p-6 border-b border-[#22222a] bg-[#14141a] text-center">
              <div className="h-12 w-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 mx-auto mb-3 shadow-inner">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-white">Prune Master AI Studio Access</h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Sign up to create your own personal reels studio, or sign in to your approved account.
              </p>
            </div>
            {/* Mode Switcher Tabs */}
            <div className="p-4 pb-0">
              <div className="flex items-center p-1 rounded-xl bg-[#0a0a0e] border border-[#23232e]">
                <button
                  onClick={() => {
                    setAuthMode('register')
                    setAuthError(null)
                    setAuthSuccessMsg(null)
                  }}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Sign Up
                </button>
                <button
                  onClick={() => {
                    setAuthMode('login')
                    setAuthError(null)
                    setAuthSuccessMsg(null)
                  }}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthMode('forgot')
                    setAuthError(null)
                    setAuthSuccessMsg(null)
                  }}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    authMode === 'forgot'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Recovery
                </button>
              </div>
            </div>
            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Alert Feedback Messages */}
              {authError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{authError}</div>
                </div>
              )}
              {authSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-200 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-medium">{authSuccessMsg}</div>
                </div>
              )}
              {/* REQUEST ACCESS / REGISTER FORM (DEFAULT FOR NEW VISITORS) */}
              {authMode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-purple-200 text-xs flex items-start gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <strong className="text-purple-100 font-semibold block">Director Approval Required:</strong>
                      Once you submit, your account will be placed in the Director's queue. Director Etherus will grant you access from the master dashboard.
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                      <UserIcon className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Full Name</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      className="w-full bg-[#0c0c10] border border-[#2d2d38] rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                      <UserIcon className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Username</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. johndoe"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="w-full bg-[#0c0c10] border border-[#2d2d38] rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Email Address</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. john@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-[#0c0c10] border border-[#2d2d38] rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Key className="h-3.5 w-3.5 text-zinc-500" />
                        <span>Create Password</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer select-none"
                      >
                        {showRegPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        <span>{showRegPassword ? 'Hide' : 'Reveal'}</span>
                      </button>
                    </label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        placeholder="At least 6 characters"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full bg-[#0c0c10] border border-[#2d2d38] rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors pr-10 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 cursor-pointer"
                        title={showRegPassword ? "Hide password" : "Show password"}
                      >
                        {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg transition-all cursor-pointer mt-2"
                  >
                    {authLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Submitting request...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Submit Access Request</span>
                      </>
                    )}
                  </button>
                </form>
              )}
              {/* SIGN IN FORM */}
              {authMode === 'login' && (
                <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
                  {/* Discreet Director Quick-Fill (Only visible on localhost / Director's machine) */}
                  {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthLoginInput('adeyemialex944@gmail.com')
                        setAuthPasswordInput('Etherus2026!')
                      }}
                      className="w-full py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-purple-500/30 text-purple-300 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Crown className="h-3 w-3 text-amber-300" />
                      <span>Director Quick-Fill (Local Machine Only)</span>
                    </button>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Email or Username</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter your email or username"
                      value={authLoginInput}
                      onChange={(e) => setAuthLoginInput(e.target.value)}
                      className="w-full bg-[#0c0c10] border border-[#2d2d38] rounded-lg px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Key className="h-3.5 w-3.5 text-zinc-500" />
                        <span>Password</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer select-none"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        <span>{showPassword ? 'Hide' : 'Reveal'}</span>
                      </button>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Enter password"
                        value={authPasswordInput}
                        onChange={(e) => setAuthPasswordInput(e.target.value)}
                        className="w-full bg-[#0c0c10] border border-[#2d2d38] rounded-lg px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors pr-10 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot')
                          setAuthError(null)
                          setAuthSuccessMsg(null)
                          if (authLoginInput) setForgotLoginInput(authLoginInput)
                        }}
                        className="text-purple-400 hover:text-purple-300 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                        <span>Forgot password? Recover account</span>
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg transition-all cursor-pointer"
                  >
                    {authLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5" />
                        <span>Sign In to Workspace</span>
                      </>
                    )}
                  </button>
                </form>
              )}
              {/* FORGOTTEN PASSWORD RECOVERY FORM */}
              {authMode === 'forgot' && (
                <form onSubmit={handleForgotPassword} className="space-y-3.5">
                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-purple-200 text-xs flex items-start gap-2.5">
                    <Key className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <strong className="text-purple-100 font-semibold block">Password Recovery Verification:</strong>
                      Enter your registered email or username along with your full name to verify ownership and reset your password.
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Registered Email or Username</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. adeyemi@example.com or username"
                      value={forgotLoginInput}
                      onChange={(e) => setForgotLoginInput(e.target.value)}
                      className="w-full bg-[#0c0c10] border border-[#2d2d38] rounded-lg px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                      <UserIcon className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Full Name (As Registered)</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Adeyemi"
                      value={forgotFullNameInput}
                      onChange={(e) => setForgotFullNameInput(e.target.value)}
                      className="w-full bg-[#0c0c10] border border-[#2d2d38] rounded-lg px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    <span className="text-[10px] text-zinc-500 block mt-0.5">
                      Must match the name you provided when requesting access.
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-zinc-500" />
                        <span>New Password</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowForgotPass(!showForgotPass)}
                        className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer select-none"
                      >
                        {showForgotPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        <span>{showForgotPass ? 'Hide' : 'Reveal'}</span>
                      </button>
                    </label>
                    <div className="relative">
                      <input
                        type={showForgotPass ? 'text' : 'password'}
                        required
                        placeholder="Minimum 6 characters"
                        value={forgotNewPasswordInput}
                        onChange={(e) => setForgotNewPasswordInput(e.target.value)}
                        className="w-full bg-[#0c0c10] border border-[#2d2d38] rounded-lg px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors font-mono pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotPass(!showForgotPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 cursor-pointer"
                        title={showForgotPass ? "Hide password" : "Show password"}
                      >
                        {showForgotPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-zinc-500" />
                        <span>Confirm New Password</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowForgotPass(!showForgotPass)}
                        className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer select-none"
                      >
                        {showForgotPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        <span>{showForgotPass ? 'Hide' : 'Reveal'}</span>
                      </button>
                    </label>
                    <div className="relative">
                      <input
                        type={showForgotPass ? 'text' : 'password'}
                        required
                        placeholder="Re-enter new password"
                        value={forgotConfirmPasswordInput}
                        onChange={(e) => setForgotConfirmPasswordInput(e.target.value)}
                        className="w-full bg-[#0c0c10] border border-[#2d2d38] rounded-lg px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors font-mono pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotPass(!showForgotPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 cursor-pointer"
                        title={showForgotPass ? "Hide password" : "Show password"}
                      >
                        {showForgotPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg transition-all cursor-pointer"
                  >
                    {authLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Verifying & Resetting...</span>
                      </>
                    ) : (
                      <>
                        <Key className="h-3.5 w-3.5" />
                        <span>Reset Password & Enter Studio</span>
                      </>
                    )}
                  </button>
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login')
                        setAuthError(null)
                        setAuthSuccessMsg(null)
                      }}
                      className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Remember your password? Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
        {/* Footer */}
        <footer className="py-4 border-t border-[#1a1a24] text-center text-xs text-zinc-500">
          Prune Master AI • Private AI Video Repurposing Studio • Supervised by Director Etherus
        </footer>
      </div>
    )
  }
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-[#f4f4f5]">
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm md:hidden animate-in fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      {/* Sidebar (Mobile Responsive Drawer) */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 border-r border-[#222228] bg-[#101014] flex flex-col justify-between select-none transition-transform duration-300 md:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
      }`}>
        <div>
          {/* Logo Brand */}
          <div className="p-5 sm:p-6 border-b border-[#222228] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-inner shrink-0">
                <Scissors className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-bold text-base tracking-wide text-white flex items-center gap-1.5">
                  PRUNE MASTER <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60">AI</span>
                </h1>
                <p className="text-[11px] text-zinc-400">Viral Shorts & Master Editor</p>
              </div>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <button
              onClick={() => {
                setActiveTab('mine')
                setIsMobileMenuOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'mine'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181f]'
              }`}
            >
              <Zap className="h-4 w-4 text-purple-400" />
              <span>🚀 Mine Clips Studio</span>
            </button>
            {/* AI Prompt Studio (Autonomous Copilot) */}
            <button
              onClick={() => {
                setActiveTab('autonomous')
                setIsMobileMenuOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'autonomous'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181f]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
                <span>🤖 Auto Prompt Studio</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/50 font-bold font-mono">
                Hands-Free
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab('clips')
                loadClips()
                setIsMobileMenuOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'clips'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181f]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Scissors className="h-4 w-4" />
                <span>Mined Shorts</span>
              </div>
              {stats && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/40 font-mono">
                  {stats.clips}
                </span>
              )}
            </button>
            {/* Master Editor Video Studio Space */}
            <button
              onClick={() => {
                setActiveTab('editor')
                setIsMobileMenuOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'editor'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181f]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sliders className="h-4 w-4 text-purple-400" />
                <span>🎬 Studio Space</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/50 font-bold font-mono">
                Editor
              </span>
            </button>
            {/* Customer Showcase & Testimonials */}
            <button
              onClick={() => {
                setActiveTab('showcase')
                setIsMobileMenuOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'showcase'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181f]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Flame className="h-4 w-4 text-amber-400" />
                <span>🌟 Creator Showcase</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50 font-bold">
                Viral
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab('videos')
                loadVideos()
                setIsMobileMenuOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'videos'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181f]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Film className="h-4 w-4" />
                <span>Source Videos</span>
              </div>
              {stats && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                  {stats.videos}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('settings')
                setIsMobileMenuOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181f]'
              }`}
            >
              <SettingsIcon className="h-4 w-4" />
              <span>Settings & Status</span>
            </button>
            {currentUser?.role === 'director' && (
              <button
                onClick={() => {
                  setActiveTab('director')
                  loadDirectorUsers()
                  setIsMobileMenuOpen(false)
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'director'
                    ? 'bg-purple-600/25 text-purple-200 border border-purple-500/50 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181f]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  <span>Director Console</span>
                </div>
                {pendingUsersCount > 0 ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/50 font-bold animate-pulse">
                    {pendingUsersCount} pending
                  </span>
                ) : (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    <Crown className="h-3 w-3 text-amber-400" />
                  </span>
                )}
              </button>
            )}
          </nav>
        </div>
        {/* User Account / Profile Section */}
        <div className="p-3.5 border-t border-[#222228] bg-[#0c0c11]">
          {currentUser ? (
            <div className="space-y-2">
              <div
                onClick={() => {
                  setProfileAvatarUrl(currentUser.avatar_url || '')
                  setProfileFullName(currentUser.full_name || '')
                  setProfileGeminiKey(currentUser.gemini_api_key || '')
                  setProfileGeminiModel(currentUser.gemini_model || 'gemini-2.5-pro')
                  setIsProfileModalOpen(true)
                }}
                className="flex items-center justify-between p-1 rounded-lg hover:bg-zinc-800/40 cursor-pointer transition-colors"
                title="Click to view & customize profile"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {currentUser.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt={currentUser.username}
                      loading="lazy"
                      decoding="async"
                      className="h-8 w-8 rounded-full object-cover border border-purple-500/60 shadow-md shrink-0"
                    />
                  ) : (
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      currentUser.role === 'director'
                        ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-md shadow-purple-900/40 ring-1 ring-amber-400/50'
                        : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                    }`}>
                      {currentUser.role === 'director' ? (
                        <Crown className="h-4 w-4 text-amber-300" />
                      ) : (
                        currentUser.username[0]?.toUpperCase() || 'U'
                      )}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-zinc-200 truncate">
                        {currentUser.full_name || currentUser.username}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 block truncate font-mono">
                      @{currentUser.username}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleLogout()
                  }}
                  title="Sign Out"
                  className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800/80 rounded-md transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  currentUser.role === 'director'
                    ? 'bg-purple-950/70 text-purple-300 border border-purple-800/60'
                    : currentUser.is_pro
                    ? 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700/60'
                }`}>
                  {currentUser.role === 'director' ? '👑 Master Director' : currentUser.is_pro ? '⭐ Pro Creator' : '👤 Creator'}
                </span>
                <button
                  onClick={() => setIsProModalOpen(true)}
                  className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors cursor-pointer font-medium"
                >
                  {currentUser.role === 'director' || currentUser.is_pro ? 'Plan Active' : 'Upgrade Plan'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setAuthMode('login')
                setIsAuthModalOpen(true)
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>Sign In / Request Access</span>
            </button>
          )}
        </div>
        {/* Footer Server Status */}
        <div className="p-4 border-t border-[#222228] bg-[#0c0c0f]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">System State</span>
            <button
              onClick={() => {
                checkHealth()
                loadVideos()
                loadClips()
                if (currentUser?.role === 'director') loadDirectorUsers()
              }}
              disabled={isChecking}
              title="Refresh connection"
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">FastAPI Server</span>
              {isBackendOnline ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Online
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                  Offline
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">FFmpeg 9:16 Render</span>
              <span className="text-purple-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Ready
              </span>
            </div>
          </div>
        </div>
      </aside>
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-[#0a0a0d]">
        {/* Top Header */}
        <header className="h-16 border-b border-[#222228] bg-[#0f0f13]/80 backdrop-blur px-4 sm:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white shrink-0"
              title="Toggle navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-sm sm:text-base font-semibold text-zinc-100 capitalize truncate">
              {activeTab === 'autonomous' && '🤖 Autonomous Prompt-to-Publish Studio'}
              {activeTab === 'mine' && '🚀 Mine Clips Studio'}
              {activeTab === 'editor' && '🎬 Master Video Editor Studio'}
              {activeTab === 'clips' && 'Mined 9:16 Shorts Gallery'}
              {activeTab === 'showcase' && '🌟 Creator Showcase & Viral Results'}
              {activeTab === 'videos' && 'Source Video Library'}
              {activeTab === 'settings' && 'Settings & Diagnostics'}
              {activeTab === 'director' && '👑 Director Management & Access Control'}
            </h2>
            <div className="hidden xl:flex items-center gap-1.5 ml-2">
              <PlatformBadge platform="youtube" showLabel={false} />
              <PlatformBadge platform="tiktok" showLabel={false} />
              <PlatformBadge platform="instagram" showLabel={false} />
              <PlatformBadge platform="facebook" showLabel={false} />
              <PlatformBadge platform="x" showLabel={false} />
            </div>
            <span className="hidden lg:inline-block text-xs px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
              ViralMinner Studio: Auto-Transcribe & 9:16 Render
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-zinc-400 shrink-0">
            {/* Director Library Scope Filter Toggle */}
            {currentUser?.role === 'director' && (activeTab === 'videos' || activeTab === 'clips') && (
              <div className="hidden sm:flex items-center gap-1 p-1 rounded-lg bg-[#14141d] border border-[#262638]">
                <button
                  onClick={() => {
                    setDirectorScopeAll(false)
                    loadVideos(false)
                    loadClips(false)
                  }}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                    !directorScopeAll
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  My Media
                </button>
                <button
                  onClick={() => {
                    setDirectorScopeAll(true)
                    loadVideos(true)
                    loadClips(true)
                  }}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                    directorScopeAll
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  All Team
                </button>
              </div>
            )}

            {/* Quick Import External Video to Studio Space */}
            <input
              type="file"
              id="global-header-video-import"
              accept="video/mp4,video/quicktime,video/webm,video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleImportVideoToEditor(f)
              }}
            />
            <label
              htmlFor="global-header-video-import"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs cursor-pointer shadow-md transition-all transform hover:scale-[1.02] shrink-0"
              title="Import any video file from your computer or phone directly to edit"
            >
              <Upload className="h-3.5 w-3.5 text-yellow-300" />
              <span className="hidden sm:inline">🎬 Import Outside Video</span>
              <span className="sm:hidden">Import</span>
            </label>

            {/* Quick Share Public Link for Director */}
            {currentUser?.role === 'director' && (
              <button
                onClick={() => copyToClipboard('https://voter-accurate-buffing.ngrok-free.dev', 'header_public_url')}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/70 text-purple-300 border border-purple-800/60 hover:border-purple-600 transition-all text-xs font-medium cursor-pointer shadow-sm"
                title="Copy public link to send to team members"
              >
                {copiedKey === 'header_public_url' ? (
                  <>
                    <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-300 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Globe className="h-3.5 w-3.5 text-purple-400" />
                    <span>Public Link</span>
                  </>
                )}
              </button>
            )}
            {/* Trial Credits / Monetization Pill */}
            <button
              onClick={() => setIsProModalOpen(true)}
              className="flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-[1.02]"
              title="Click to view subscription & trial balance"
            >
              {trialStatus?.monetization_enabled === false ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-950/90 via-teal-950/80 to-purple-950/90 border border-emerald-500/60 text-emerald-300 text-[11px] font-bold shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  <span>100% Free Launch Mode</span>
                  <span className="text-[10px] text-emerald-200/80 font-mono hidden sm:inline">• Unlimited</span>
                </span>
              ) : currentUser?.role === 'director' || currentUser?.is_pro ? (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-950/80 via-purple-950/80 to-amber-950/80 border border-amber-500/60 text-amber-300 text-[11px] font-bold shadow-sm">
                  <Crown className="h-3.5 w-3.5 text-amber-400" />
                  <span>{currentUser?.role === 'director' ? 'Director Unlimited' : 'Pro Unlimited'}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-950/80 border border-purple-700/60 text-purple-300 text-[11px] font-mono shadow-sm">
                  <Sparkles className="h-3 w-3 text-amber-300" />
                  <span className="font-bold">{trialStatus?.trials_remaining ?? 10} / 10 Free</span>
                  <span className="text-[10px] text-purple-200 font-sans hidden sm:inline">(Upgrade)</span>
                </span>
              )}
            </button>
            {/* Profile / Avatar Button in Top Bar */}
            {currentUser ? (
              <button
                onClick={() => {
                  setProfileAvatarUrl(currentUser.avatar_url || '')
                  setProfileFullName(currentUser.full_name || '')
                  setProfileGeminiKey(currentUser.gemini_api_key || '')
                  setProfileGeminiModel(currentUser.gemini_model || 'gemini-2.5-pro')
                  setIsProfileModalOpen(true)
                }}
                className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#13131b] border border-[#272738] hover:border-purple-500/60 cursor-pointer transition-all shadow-sm"
                title="Creator Profile & Settings"
              >
                {currentUser.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.username}
                    loading="lazy"
                    decoding="async"
                    className="h-7 w-7 rounded-full object-cover border border-purple-500/50 shadow-sm shrink-0"
                  />
                ) : (
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    currentUser.role === 'director'
                      ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow ring-1 ring-amber-400/50'
                      : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                  }`}>
                    {currentUser.role === 'director' ? <Crown className="h-3.5 w-3.5 text-amber-300" /> : currentUser.username[0]?.toUpperCase()}
                  </div>
                )}
                <div className="text-left hidden sm:block">
                  <span className="font-semibold text-xs text-zinc-200 block truncate max-w-[85px]">
                    {currentUser.full_name || currentUser.username}
                  </span>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 font-mono hidden md:inline">
                  {stats?.user_clips ?? 0} Mined
                </span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setAuthMode('login')
                  setIsAuthModalOpen(true)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition-colors cursor-pointer shadow-sm"
              >
                <UserIcon className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </button>
            )}
            <div className="hidden lg:flex items-center gap-1.5 text-zinc-500">
              <HardDrive className="h-3.5 w-3.5 text-purple-400" />
              <span>Free & Local</span>
            </div>
          </div>
        </header>
        {/* Tab Content */}
        <div className="p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
          {/* TAB 0: AUTONOMOUS PROMPT-TO-PUBLISH STUDIO (HANDS-FREE COPILOT) */}
          {activeTab === 'autonomous' && (
            <div className="space-y-6">
              {/* Studio Header Banner */}
              <div className="p-6 rounded-2xl border border-amber-500/40 bg-gradient-to-b from-[#181524] via-[#12121c] to-[#0e0e14] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-semibold mb-3">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                      <span>AUTONOMOUS PROMPT-TO-PUBLISH COPILOT</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase font-mono">
                        100% Hands-Free
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white mb-2 flex items-center gap-2 flex-wrap">
                      <span>Prompt It. Walk Away. Watch It Publish.</span>
                    </h3>
                    <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
                      Give the AI a natural prompt and let it autonomously pick files from your folder, transcribe speech with Whisper, discover viral hooks with Gemini 2.5 Pro, reframe to 9:16 vertical, burn kinetic word captions, and export in 4K — without you having to supervise each step.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#0e0f17] border border-[#23253b] space-y-1.5 shrink-0 text-right">
                    <span className="text-[10px] text-zinc-400 block font-mono">AVAILABLE SOURCE VIDEOS</span>
                    <span className="text-2xl font-black text-amber-300 font-mono">{videos.length} Files</span>
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Background Pipeline Ready
                    </span>
                  </div>
                </div>
              </div>
              {/* LIVE AUTONOMOUS BACKGROUND STEPPER MONITOR */}
              {(isExecutingAutonomous || autonomousProgress > 0) && (
                <div className="p-6 rounded-2xl border border-purple-500/50 bg-[#121320] shadow-2xl space-y-5 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-purple-600/30 border border-purple-500/60 flex items-center justify-center text-purple-300 shadow-md">
                        {isExecutingAutonomous ? <RefreshCw className="h-5 w-5 animate-spin text-purple-400" /> : <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>Autonomous Execution Status</span>
                          <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold font-mono ${
                            isExecutingAutonomous ? 'bg-purple-950 text-purple-300 border border-purple-700 animate-pulse' : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          }`}>
                            {isExecutingAutonomous ? 'Running in Background' : 'Completed'}
                          </span>
                        </h4>
                        <p className="text-xs text-purple-200 font-mono mt-0.5">{autonomousStatusMsg}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-white font-mono">{autonomousProgress}%</span>
                      <span className="text-[10px] text-zinc-400 block font-sans">You can switch tabs or focus on other work</span>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-[#0a0a10] h-2.5 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className="bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 h-full transition-all duration-300"
                      style={{ width: `${autonomousProgress}%` }}
                    />
                  </div>
                  {/* 5-Stage Visual Workflow Stepper */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                    {[
                      { step: 1, label: '1. Media Ingestion', desc: 'Pick file & extract audio', icon: HardDrive },
                      { step: 2, label: '2. AI Transcription', desc: 'Fast-Whisper word cues', icon: Type },
                      { step: 3, label: '3. Gemini 2.5 Pro', desc: 'Psychological hook score', icon: Sparkles },
                      { step: 4, label: '4. 9:16 Kinetic Subtitles', desc: 'Auto-frame & burn pop', icon: Scissors },
                      { step: 5, label: '5. 4K Export Ready', desc: 'Final render & post kit', icon: Download }
                    ].map((st) => {
                      const isDone = autonomousStep > st.step || autonomousProgress === 100
                      const isCurrent = autonomousStep === st.step && isExecutingAutonomous
                      const Icon = st.icon
                      return (
                        <div
                          key={st.step}
                          className={`p-3 rounded-xl border transition-all text-center space-y-1 ${
                            isDone
                              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                              : isCurrent
                              ? 'bg-purple-950/60 border-purple-500 text-white shadow-lg ring-1 ring-purple-400/50'
                              : 'bg-[#0d0e17] border-zinc-800/80 text-zinc-500'
                          }`}
                        >
                          <Icon className={`h-4 w-4 mx-auto ${isCurrent ? 'animate-bounce text-purple-400' : isDone ? 'text-emerald-400' : 'text-zinc-600'}`} />
                          <span className="block text-[11px] font-bold leading-tight">{st.label}</span>
                          <span className="block text-[9px] opacity-75 leading-tight">{st.desc}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {/* SECTION: STANDBY PROMPT TIERS (CAPTURE FULL WORKFLOW & SEGMENTED OPTIONS) */}
              <div className="p-6 rounded-2xl border border-[#23253b] bg-[#12131f] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#202235] pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="h-4 w-4 text-purple-400" />
                      <span>Standby Prompt Tiers (Overall & Segmented Workflows)</span>
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Choose an overall hands-free standby prompt or select a segmented workflow tailored to your exact goal.
                    </p>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">Click any card to auto-load & configure</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {STANDBY_PROMPT_TIERS.map((tier) => {
                    const isSelected = selectedPromptTierId === tier.id
                    return (
                      <div
                        key={tier.id}
                        onClick={() => {
                          setSelectedPromptTierId(tier.id)
                          setAutonomousPromptText(tier.prompt)
                        }}
                        className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                          isSelected
                            ? 'bg-[#181930] border-purple-500 shadow-xl ring-1 ring-purple-400/40'
                            : 'bg-[#0d0e17] border-[#202235] hover:border-zinc-700 hover:bg-[#121320]'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className="text-[10px] font-bold text-zinc-400">{tier.tierName}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${tier.badgeColor}`}>
                              {tier.badge}
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-white">{tier.title}</h5>
                          <p className="text-[11px] text-zinc-400 leading-relaxed">{tier.description}</p>
                        </div>
                        <div className="pt-2 border-t border-[#1e202f] flex items-center justify-between text-[10px]">
                          <span className="text-zinc-500 font-mono">
                            {tier.params.clipCount} clips • {tier.params.burnCaptions ? tier.params.captionStyle.replace('_', ' ') : 'Raw No-Edit'}
                          </span>
                          <button
                            type="button"
                            className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                              isSelected ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            {isSelected ? 'Loaded' : 'Load Prompt'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {/* SECTION: INTERACTIVE PROMPT STUDIO ("ROOM FOR USER TO CREATE") */}
              <div className="p-6 rounded-2xl border border-purple-500/40 bg-gradient-to-b from-[#131422] to-[#0e0f17] shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#23253b] pb-3">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-300" />
                      <span>Natural Language Autonomous Prompt Studio</span>
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Type any custom prompt or customize the loaded tier. The AI will parse your intent and execute all steps hands-free.
                    </p>
                  </div>
                  {/* Video Picker */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 whitespace-nowrap">Target Video:</span>
                    <select
                      value={autonomousTargetVideoId}
                      onChange={(e) => setAutonomousTargetVideoId(e.target.value === 'auto' ? 'auto' : parseInt(e.target.value))}
                      className="bg-[#0b0c13] border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 max-w-[220px] truncate"
                    >
                      <option value="auto">⚡ Auto-Detect from Folder / Latest</option>
                      {videos.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.original_name} ({formatSecsAndMins(v.duration_seconds)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Prompt Textarea */}
                <div className="space-y-2">
                  <div className="relative">
                    <textarea
                      rows={4}
                      value={autonomousPromptText}
                      onChange={(e) => setAutonomousPromptText(e.target.value)}
                      placeholder="Type your autonomous instructions... e.g. Pick sample_teaching.mp4, cut 5 clips between 20s and 50s, add yellow pop captions, remove silences, and export in 4K."
                      className="w-full bg-[#090a10] border border-zinc-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-2xl p-4 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none font-sans leading-relaxed transition-all"
                    />
                    <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAutonomousPromptText('Pick video, extract 4 clips of 30-60s, burn yellow kinetic captions, remove dead silences, and export in 4K.')}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono cursor-pointer"
                        title="Reset to recommended prompt"
                      >
                        Reset Prompt
                      </button>
                    </div>
                  </div>
                  {/* Quick Action Chips to Insert into Prompt */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-zinc-400">
                    <span className="font-semibold text-zinc-500">Add to Prompt:</span>
                    {[
                      { label: '+ 5 Clips', text: 'extract 5 viral clips' },
                      { label: '+ 4K UHD Export', text: 'export in 4K resolution' },
                      { label: '+ Yellow Kinetic Pop', text: 'burn yellow kinetic word pop captions' },
                      { label: '+ Red Glow Viral', text: 'burn red glow viral captions' },
                      { label: '+ Raw Cutter (No Captions)', text: 'disable captions and export pure clean clips' },
                      { label: '+ AI Silence Cut', text: 'remove dead silence pauses' },
                      { label: '+ 9:16 Smart Face', text: 'reframe to 9:16 vertical smart face centered' }
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAutonomousPromptText(prev => `${prev.trim()} and ${chip.text}.`)}
                        className="px-2 py-0.5 rounded-lg bg-[#141522] hover:bg-purple-900/40 text-zinc-300 hover:text-purple-300 border border-zinc-800 text-[10px] transition-colors cursor-pointer"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Auto-Parsed Configuration Tray */}
                {(() => {
                  const intent = parsePromptIntent(autonomousPromptText)
                  const targetVid = videos.find(v => v.id === intent.targetVidId) || videos[0]
                  return (
                    <div className="p-4 rounded-xl bg-[#0a0a10] border border-[#202235] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-amber-400 block mb-1">
                          ⚡ AI INTENT PARSED & PRE-CONFIGURED:
                        </span>
                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono">
                            📁 {targetVid ? targetVid.original_name : 'Auto Ingest Latest'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                            ✂️ {intent.clipCount} Clips ({intent.minDuration}s - {intent.maxDuration}s)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                            📝 {intent.burnCaptions ? `Auto-Caption (${intent.captionStyle.replace('_', ' ')})` : '🚫 Clean / No Captions'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                            📱 {intent.aspectRatio} ({intent.framingMode})
                          </span>
                          <span className="px-2 py-0.5 rounded bg-pink-950 text-pink-300 border border-pink-800 font-mono">
                            ✨ {intent.resolution.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      {/* Primary Autonomous Launch CTA */}
                      <button
                        type="button"
                        onClick={() => executeAutonomousWorkflow()}
                        disabled={isExecutingAutonomous}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-purple-600 to-pink-600 hover:from-amber-400 hover:to-pink-500 text-white font-extrabold text-xs shadow-lg shadow-purple-900/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all transform hover:scale-[1.02] active:scale-95 shrink-0"
                      >
                        <Sparkles className="h-4 w-4 text-yellow-300 animate-spin" />
                        <span>{isExecutingAutonomous ? 'Running Autonomous Pipeline...' : '🚀 Launch Autonomous Pipeline'}</span>
                      </button>
                    </div>
                  )
                })()}
              </div>
              {/* QUICK GALLERY OF COMPLETED SHORTS */}
              {clips.length > 0 && (
                <div className="p-6 rounded-2xl border border-[#23253b] bg-[#12131f] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Scissors className="h-4 w-4 text-purple-400" />
                        <span>Recent Mined Shorts Ready for Social Media</span>
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        These clips were generated autonomously and are ready to export or polish in Master Editor.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('clips')}
                      className="text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                    >
                      View All {clips.length} Shorts &rarr;
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {clips.slice(0, 4).map(c => (
                      <div
                        key={c.id}
                        className="group relative rounded-xl overflow-hidden border border-[#23253b] bg-[#0c0c12] hover:border-purple-500/60 transition-all shadow-md flex flex-col justify-between"
                      >
                        <div className="aspect-[9/16] relative bg-zinc-900 overflow-hidden">
                          {c.thumbnail_path ? (
                            <img
                              src={c.thumbnail_path}
                              alt={c.title}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none' }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                              <Video className="h-8 w-8" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/75 text-[10px] font-mono text-purple-300">
                            {((c.end_time - c.start_time) || 0).toFixed(0)}s
                          </div>
                        </div>
                        <div className="p-2.5 space-y-2">
                          <p className="text-xs font-bold text-white truncate">{c.title}</p>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditorClip(c)
                                setActiveTab('editor')
                              }}
                              className="flex-1 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold text-center transition-colors cursor-pointer"
                            >
                              Edit in Studio
                            </button>
                            <a
                              href={`/api/clips/${c.id}/download`}
                              download
                              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                              title="Download MP4"
                            >
                              <Download className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* TAB 1: MINE CLIPS (VIRAL MINER STUDIO) */}
          {activeTab === 'mine' && (
            <div className="space-y-6">
              {/* Studio Header Banner */}
              <div className="p-6 rounded-2xl border border-purple-500/30 bg-gradient-to-b from-[#141420] to-[#0e0e14] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-semibold mb-3">
                    <Zap className="h-3.5 w-3.5 text-purple-400" />
                    <span>AI VIRAL CLIP MINER • 100% LOCAL & FREE</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Turn Long Sermons & Videos into Viral Short Reels in Minutes
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                    Drop your video or paste a YouTube link. Our local AI listens to the speech with Whisper, mines the highest-impact moments, tracks the speaker, and automatically renders captioned 9:16 vertical Shorts.
                  </p>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <div className="px-3 py-1 rounded-lg bg-[#0c0c12] border border-purple-800/60 text-xs text-purple-300 font-mono flex items-center gap-1.5 shadow-sm">
                      <Scissors className="h-3.5 w-3.5 text-purple-400" />
                      <span>Your Mined Shorts: <strong className="text-white font-bold">{stats?.user_clips ?? 0}</strong></span>
                    </div>
                    {currentUser?.role === 'director' && (
                      <div className="px-3 py-1 rounded-lg bg-[#0c0c12] border border-zinc-800 text-xs text-zinc-400 font-mono flex items-center gap-1.5 shadow-sm">
                        <Globe className="h-3.5 w-3.5 text-zinc-500" />
                        <span>Overall Studio Shorts: <strong className="text-purple-300 font-bold">{stats?.clips ?? 0}</strong></span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Input Method Tabs (Single & Multi-Video Batch) */}
                <div className="flex items-center gap-2 mt-6 p-1 rounded-xl bg-[#09090d] border border-[#23232e] max-w-2xl flex-wrap">
                  <button
                    onClick={() => setInputMode('upload')}
                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      inputMode === 'upload'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload File</span>
                  </button>
                  <button
                    onClick={() => setInputMode('youtube')}
                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      inputMode === 'youtube'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>YouTube URL</span>
                  </button>
                  <button
                    onClick={() => setInputMode('library')}
                    className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all relative ${
                      inputMode === 'library'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5 text-purple-300" />
                    <span>⚡ Mine 2+ Videos</span>
                    {videos.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-950 text-purple-300 border border-purple-700 font-mono font-bold ml-1">
                        {videos.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditorClip(null)
                      setActiveTab('editor')
                    }}
                    className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all bg-gradient-to-r from-purple-900/80 to-indigo-900/80 hover:from-purple-800 hover:to-indigo-800 text-purple-200 hover:text-white border border-purple-600/60 hover:border-purple-400 cursor-pointer shadow-md"
                    title="Bring outside videos and edit directly without AI mining"
                  >
                    <Sliders className="h-3.5 w-3.5 text-yellow-300" />
                    <span>🎬 Edit Outside Video</span>
                  </button>
                </div>
                {/* Input Mode 1: File Dropzone */}
                {inputMode === 'upload' && (
                  <div className="mt-5">
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                        dragActive
                          ? 'border-purple-500 bg-purple-950/25'
                          : 'border-[#2d2d3a] bg-[#0c0c11] hover:border-purple-500/50'
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileInputChange}
                        accept="video/mp4,video/mkv,video/quicktime,video/webm,video/x-msvideo"
                        className="hidden"
                      />
                      <div className="mx-auto h-12 w-12 rounded-full bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3 shadow-inner">
                        <Upload className="h-6 w-6" />
                      </div>
                      {!selectedFile ? (
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-100 mb-1">
                            Drag and drop your sermon or video here, or browse
                          </h4>
                          <p className="text-xs text-zinc-500 max-w-md mx-auto mb-2">
                            Supports MP4, MOV, MKV, and WEBM files of any length.
                          </p>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-800/40 text-[11px] text-purple-300 font-medium mb-4">
                            <HardDrive className="h-3 w-3 text-purple-400" />
                            <span>High-Capacity Chunked Streaming: Supports up to 10GB+ videos</span>
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md"
                            >
                              <FileVideo className="h-4 w-4" />
                              Browse Video File
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="p-3.5 rounded-xl bg-[#14141c] border border-[#282836] text-left">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-zinc-200 truncate max-w-[280px]">
                                {selectedFile.name}
                              </span>
                              <button
                                onClick={() => setSelectedFile(null)}
                                disabled={isUploading}
                                className="text-zinc-500 hover:text-zinc-300"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="text-[11px] text-zinc-500 flex items-center gap-3">
                              <span>Size: <strong className="text-zinc-300">{formatBytes(selectedFile.size)}</strong></span>
                              <span>Format: {selectedFile.type || 'video'}</span>
                              {selectedFile.size >= 1024 * 1024 * 1024 && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                                  Large 10GB+ Ready
                                </span>
                              )}
                            </div>
                          </div>
                          {selectedFile.size > 100 * 1024 * 1024 && (
                            <div className="p-2.5 rounded-lg bg-emerald-950/25 border border-emerald-800/40 text-[11px] text-emerald-300/90 flex items-start gap-2 text-left">
                              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                              <div>
                                <strong className="text-emerald-200 font-semibold block">Pro-Tip for Fast Upload ({formatBytes(selectedFile.size)}):</strong>
                                <span>For large files over 100MB or up to 10GB, upload over your <strong>Local Wi-Fi Link</strong> (<code className="text-emerald-300 font-mono">http://192.168.0.131:5173</code>) for instant gigabit transfer with no timeout limits!</span>
                              </div>
                            </div>
                          )}
                          {isUploading && (
                            <div className="space-y-1.5 text-left">
                              <div className="flex items-center justify-between text-xs text-zinc-400">
                                <span className="flex items-center gap-1.5">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
                                  Uploading & initializing local miner...
                                </span>
                                <span className="font-mono text-purple-400 font-bold">{uploadProgress}%</span>
                              </div>
                              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-purple-600 transition-all duration-200"
                                  style={{ width: `${uploadProgress}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {uploadError && (
                        <div className="mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center justify-center gap-2 max-w-md mx-auto">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>{uploadError}</span>
                        </div>
                      )}
                    </div>

                    {/* Quick Pick Existing Video from Library to Analyze */}
                    {videos.length > 0 && !selectedFile && (
                      <div className="mt-4 p-3.5 rounded-xl bg-[#09090e] border border-zinc-800/80 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                            <Film className="h-3.5 w-3.5 text-purple-400" />
                            <span>Or select a previously uploaded video to analyze:</span>
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">{videos.length} videos available</span>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                          {videos.map(v => {
                            const isChosen = analyzingVideo?.id === v.id
                            return (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => {
                                  setAnalyzingVideo(v)
                                  handleAnalyzeVideo(v)
                                }}
                                className={`px-3 py-2 rounded-lg border text-left shrink-0 transition-all flex items-center gap-2 cursor-pointer ${
                                  isChosen
                                    ? 'bg-purple-950/60 border-purple-500 text-white shadow ring-1 ring-purple-500/40'
                                    : 'bg-[#12121a] border-zinc-800 text-zinc-300 hover:border-purple-600/60 hover:text-white'
                                }`}
                              >
                                <Play className="h-3 w-3 text-purple-400 shrink-0" />
                                <div className="max-w-[140px] truncate">
                                  <span className="text-xs font-medium block truncate">{v.original_name}</span>
                                  <span className="text-[10px] text-zinc-500 font-mono block">
                                    {v.duration_seconds > 0 ? formatSecsAndMins(Math.round(v.duration_seconds)) : 'Video'}
                                  </span>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-700/60 font-semibold shrink-0">
                                  🔍 Analyze
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Input Mode 2: YouTube URL Input */}
                {inputMode === 'youtube' && (
                  <form onSubmit={importYoutubeAndMine} className="mt-5 space-y-3">
                    <div className="p-4 rounded-xl bg-[#0c0c11] border border-[#2d2d3a] flex flex-col sm:flex-row items-center gap-3">
                      <div className="relative flex-1 w-full">
                        <Globe className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="url"
                          placeholder="Paste public YouTube URL (e.g. https://www.youtube.com/watch?v=...)"
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                          className="w-full bg-[#13131a] border border-[#2b2b38] rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isImportingYoutube || !youtubeUrl.trim()}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap"
                      >
                        {isImportingYoutube ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Downloading & Mining...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4" />
                            <span>Download & Mine</span>
                          </>
                        )}
                      </button>
                    </div>
                    {youtubeError && (
                      <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{youtubeError}</span>
                      </div>
                    )}
                  </form>
                )}

                {/* Input Mode 3: Batch Mine 2+ Library Videos */}
                {inputMode === 'library' && (
                  <div className="mt-5 space-y-4">
                    <div className="p-4 rounded-xl bg-[#0c0c11] border border-[#2d2d3a] space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <Layers className="h-4 w-4 text-purple-400" />
                            <span>Select 2 or More Videos to Mine Simultaneously</span>
                          </h4>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            Pick all videos you want to cut into shorts in parallel.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={selectAllBatchVideos}
                            className="px-3 py-1 rounded-lg bg-purple-950/70 hover:bg-purple-900 border border-purple-800 text-purple-300 text-xs font-semibold cursor-pointer"
                          >
                            {selectedBatchVideoIds.length === videos.length ? 'Deselect All' : 'Select All'}
                          </button>
                          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300">
                            {selectedBatchVideoIds.length} Selected
                          </span>
                        </div>
                      </div>

                      {videos.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 text-xs">
                          No videos in library yet. Upload video files using the "Upload File" tab first!
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                          {videos.map(v => {
                            const isChecked = selectedBatchVideoIds.includes(v.id)
                            return (
                              <div
                                key={v.id}
                                onClick={() => toggleBatchVideo(v.id)}
                                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                                  isChecked
                                    ? 'bg-purple-950/40 border-purple-500/80 shadow-md ring-1 ring-purple-500/50'
                                    : 'bg-[#12121a] border-zinc-800/80 hover:border-zinc-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="h-4 w-4 accent-purple-600 rounded cursor-pointer"
                                />
                                <div className="h-10 w-12 rounded-lg bg-black/60 overflow-hidden relative shrink-0 border border-zinc-800 flex items-center justify-center">
                                  {v.thumbnail_path ? (
                                    <img
                                      src={v.thumbnail_path}
                                      alt={v.original_name}
                                      loading="lazy"
                                      decoding="async"
                                      className="w-full h-full object-cover"
                                      onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none' }}
                                    />
                                  ) : (
                                    <FileVideo className="h-5 w-5 text-zinc-600" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h5 className="text-xs font-semibold text-zinc-200 truncate" title={v.original_name}>
                                    {v.original_name}
                                  </h5>
                                  <span className="text-[10px] text-zinc-500 font-mono block">
                                    {v.duration_seconds > 0 ? formatSecsAndMins(Math.round(v.duration_seconds)) : 'Video'} • {v.status}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* Viral Miner Lab Configuration Grid */}
                <div className="space-y-4 mt-6 pt-6 border-t border-[#22222e]">
                  {/* Top Settings Row: Lab, Aspect Ratio, Quantity, Framing */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Option 1: Lab Mode */}
                    <div className="p-4 rounded-xl bg-[#0b0b10] border border-[#22222c] space-y-2">
                      <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                        <span>Lab Mode</span>
                        <span className="text-[10px] text-purple-400 font-mono">Specialized Tuning</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setLabMode('sermon')}
                          className={`p-2 rounded-lg border text-left transition-all ${
                            labMode === 'sermon'
                              ? 'bg-purple-950/40 border-purple-500/60 text-purple-300 font-medium'
                              : 'bg-[#121218] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span className="block font-semibold text-xs mb-0.5">⛪ Sermon</span>
                          <span className="text-[9px] text-zinc-500 block leading-tight">Preaching & Scriptures</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setLabMode('podcast')}
                          className={`p-2 rounded-lg border text-left transition-all ${
                            labMode === 'podcast'
                              ? 'bg-purple-950/40 border-purple-500/60 text-purple-300 font-medium'
                              : 'bg-[#121218] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span className="block font-semibold text-xs mb-0.5">🎙️ Podcast</span>
                          <span className="text-[9px] text-zinc-500 block leading-tight">Interviews & Hooks</span>
                        </button>
                      </div>
                    </div>
                    {/* Option 2: Aspect Ratio (9:16 Vertical vs 16:9 Landscape) */}
                    <div className="p-4 rounded-xl bg-[#0b0b10] border border-[#22222c] space-y-2">
                      <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                        <span>Aspect Ratio</span>
                        <span className="text-[10px] text-purple-400 font-mono font-medium">
                          {aspectRatio === '9:16' ? '9:16 Vertical' : '16:9 Landscape'}
                        </span>
                      </label>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setAspectRatio('9:16')}
                          className={`p-2 rounded-lg border text-left transition-all ${
                            aspectRatio === '9:16'
                              ? 'bg-purple-950/40 border-purple-500/60 text-purple-300 font-medium'
                              : 'bg-[#121218] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span className="block font-semibold text-xs mb-0.5">📱 9:16</span>
                          <span className="text-[9px] text-zinc-500 block leading-tight">Reels / Shorts / TikTok</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAspectRatio('16:9')}
                          className={`p-2 rounded-lg border text-left transition-all ${
                            aspectRatio === '16:9'
                              ? 'bg-purple-950/40 border-purple-500/60 text-purple-300 font-medium'
                              : 'bg-[#121218] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span className="block font-semibold text-xs mb-0.5">🖥️ 16:9</span>
                          <span className="text-[9px] text-zinc-500 block leading-tight">YouTube / Widescreen</span>
                        </button>
                      </div>
                    </div>
                    {/* Option 3: Clips to Mine */}
                    <div className="p-4 rounded-xl bg-[#0b0b10] border border-[#22222c] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-zinc-300">
                          Shorts Quantity
                        </label>
                        <span className="text-[10px] text-purple-400 font-mono font-bold">
                          {clipCount} {clipCount === 1 ? 'Short' : 'Shorts'}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-xs">
                        {[1, 3, 5, 10].map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => {
                              setClipCount(cnt)
                              setIsCustomClipCount(false)
                            }}
                            className={`py-2 px-1 rounded-lg border text-center transition-all ${
                              clipCount === cnt && !isCustomClipCount
                                ? 'bg-purple-950/60 border-purple-500/70 text-purple-300 font-bold shadow-sm'
                                : 'bg-[#121218] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <span className="block text-sm">{cnt}</span>
                            <span className="text-[9px] text-zinc-500 block">
                              {cnt === 1 ? 'Quick' : cnt === 3 ? 'Standard' : cnt === 5 ? 'Pack' : 'Mega'}
                            </span>
                          </button>
                        ))}
                      </div>
                      {/* Custom Count Option */}
                      <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setIsCustomClipCount(true)}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 ${
                            isCustomClipCount || ![1, 3, 5, 10].includes(clipCount)
                              ? 'bg-purple-600 text-white border-purple-500 font-semibold shadow-sm'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span>✏️ Custom:</span>
                        </button>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={clipCount}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1
                              setClipCount(Math.max(1, Math.min(50, val)))
                              setIsCustomClipCount(true)
                            }}
                            className="w-16 bg-[#14141d] border border-purple-500/50 rounded-lg px-2 py-1 text-xs text-center font-bold text-purple-200 font-mono focus:outline-none focus:border-purple-400"
                            placeholder="Qty"
                          />
                          <span className="text-[10px] text-zinc-500 font-mono">shorts (1-50)</span>
                        </div>
                      </div>
                    </div>
                    {/* Option 4: Smart Framing */}
                    <div className="p-4 rounded-xl bg-[#0b0b10] border border-[#22222c] space-y-2">
                      <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                        <span>Framing Mode</span>
                        <span className="text-[10px] text-purple-400 font-mono">
                          {aspectRatio === '9:16' ? 'Vertical Crop' : 'Widescreen Fit'}
                        </span>
                      </label>
                      <select
                        value={framingMode}
                        onChange={(e) => setFramingMode(e.target.value as any)}
                        className="w-full bg-[#121218] border border-[#262633] rounded-lg px-2.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
                      >
                        {aspectRatio === '9:16' ? (
                          <>
                            <option value="smart_face">🎯 Auto Face-Track</option>
                            <option value="blur">Blurred Background Overlay</option>
                            <option value="crop">Center Crop</option>
                          </>
                        ) : (
                          <>
                            <option value="blur">Blur BG (For any source ratio)</option>
                            <option value="crop">Center Crop 16:9</option>
                            <option value="smart_face">Fit to 16:9 Frame</option>
                          </>
                        )}
                      </select>
                      <span className="text-[10px] text-zinc-500 block leading-tight">
                        {aspectRatio === '9:16'
                          ? 'Tracks and centers the speaker for mobile feeds.'
                          : 'Renders in 16:9 landscape for YouTube & presentations.'}
                      </span>
                    </div>
                  </div>
                  {/* Bottom Settings Row: Duration (Sec/Min), Resolution, Captions Toggle */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Option 4: Clip Duration (Seconds and Minutes) */}
                    <div className="p-4 rounded-xl bg-[#0b0b10] border border-[#22222c] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-purple-400" />
                            <span>Clip Duration</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleAutoSplitByVideo}
                            className="text-[10px] px-2 py-0.5 rounded bg-purple-950/70 hover:bg-purple-900 text-purple-300 border border-purple-700/60 transition-all font-semibold cursor-pointer flex items-center gap-1"
                            title="Auto-calculate duration based on total video length divided by clip count"
                          >
                            <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                            <span>Auto-Split Video</span>
                          </button>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60 font-mono font-medium">
                          {formatSecsAndMins(minDuration)} - {formatSecsAndMins(maxDuration)}
                        </span>
                      </div>
                      {/* Presets Grid */}
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 text-[10px]">
                        {[
                          { id: '15-30', label: '15-30s' },
                          { id: '30-60', label: '30-60s' },
                          { id: '60-90', label: '1-1.5m' },
                          { id: '90-120', label: '1.5-2m' },
                          { id: '120-150', label: '2-2.5m' },
                          { id: '120-180', label: '2-3m' },
                          { id: 'custom', label: 'Custom' }
                        ].map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleDurationPresetChange(p.id as any)}
                            className={`py-1.5 px-1 rounded-md border text-center transition-all ${
                              durationPreset === p.id
                                ? 'bg-purple-950/60 border-purple-500/80 text-purple-200 font-bold'
                                : 'bg-[#121218] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      {/* Custom Min / Max Inputs */}
                      {durationPreset === 'custom' && (
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/60">
                          <div>
                            <label className="text-[10px] text-zinc-400 block mb-0.5">Min Duration</label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={5}
                                max={maxDuration - 5}
                                step={5}
                                value={minDuration}
                                onChange={(e) => setMinDuration(Math.max(5, parseInt(e.target.value) || 5))}
                                className="w-full bg-[#14141c] border border-zinc-700/80 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                              />
                              <span className="text-[10px] text-zinc-500 font-mono">sec</span>
                            </div>
                            <span className="text-[9px] text-purple-400/80 font-mono block mt-0.5">
                              ({formatSecsAndMins(minDuration)})
                            </span>
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-400 block mb-0.5">Max Duration</label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={minDuration + 5}
                                max={600}
                                step={5}
                                value={maxDuration}
                                onChange={(e) => setMaxDuration(Math.max(minDuration + 5, parseInt(e.target.value) || 60))}
                                className="w-full bg-[#14141c] border border-zinc-700/80 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                              />
                              <span className="text-[10px] text-zinc-500 font-mono">sec</span>
                            </div>
                            <span className="text-[9px] text-purple-400/80 font-mono block mt-0.5">
                              ({formatSecsAndMins(maxDuration)})
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Option 5: Resolution (1080p, 720p, etc.) */}
                    <div className="p-4 rounded-xl bg-[#0b0b10] border border-[#22222c] space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                          <Video className="h-3.5 w-3.5 text-purple-400" />
                          <span>Resolution</span>
                        </label>
                        <span className="text-[10px] text-purple-400 font-mono font-medium">
                          {aspectRatio === '9:16' ? '9:16 Vertical' : '16:9 Landscape'}
                        </span>
                      </div>
                      <select
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value as any)}
                        className="w-full bg-[#121218] border border-[#262633] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
                      >
                        {aspectRatio === '9:16' ? (
                          <>
                            <option value="1080p">1080p (1080×1920 Full HD • Crisp Quality)</option>
                            <option value="720p">720p (720×1280 HD • 2x Faster, Space Saver)</option>
                            <option value="480p">480p (480×854 SD • Ultra Fast & Light)</option>
                          </>
                        ) : (
                          <>
                            <option value="1080p">1080p (1920×1080 Full HD Widescreen)</option>
                            <option value="720p">720p (1280×720 HD Widescreen • Fast)</option>
                            <option value="480p">480p (854×480 SD Widescreen • Light)</option>
                          </>
                        )}
                      </select>
                      <span className="text-[10px] text-zinc-500 block leading-tight">
                        {resolution === '720p'
                          ? '⚡ 720p renders quickly and uses minimal disk space.'
                          : resolution === '1080p'
                          ? '✨ 1080p is recommended for top quality.'
                          : '🚀 480p produces lightweight clips with rapid rendering.'}
                      </span>
                    </div>
                    {/* Option 6: Auto-Captions Toggle (With Captions vs Without Captions) */}
                    <div className="p-4 rounded-xl bg-[#0b0b10] border border-[#22222c] space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                          <Type className="h-3.5 w-3.5 text-purple-400" />
                          <span>Auto-Captions & Kinetic Subtitles</span>
                        </label>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                          burnCaptions
                            ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>
                          {burnCaptions ? '⚡ Auto-Caption Active' : 'Off'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setBurnCaptions(true)}
                          className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                            burnCaptions
                              ? 'bg-purple-950/50 border-purple-500/80 text-purple-200 font-bold shadow-sm'
                              : 'bg-[#121218] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span className="block font-semibold mb-0.5 flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-yellow-400" />
                            <span>Auto-Caption ON</span>
                          </span>
                          <span className="text-[10px] text-zinc-400 block leading-tight">Word-by-Word Kinetic Subtitles</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBurnCaptions(false)}
                          className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                            !burnCaptions
                              ? 'bg-purple-950/50 border-purple-500/80 text-purple-200 font-bold shadow-sm'
                              : 'bg-[#121218] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span className="block font-semibold mb-0.5">🚫 Auto-Caption OFF</span>
                          <span className="text-[10px] text-zinc-500 block leading-tight">Clean Original Video</span>
                        </button>
                      </div>
                      {burnCaptions && (
                        <div className="pt-2 border-t border-zinc-800/60 space-y-1">
                          <label className="text-[10px] text-zinc-400 block font-medium">
                            Auto-Caption Pop Style & Color:
                          </label>
                          <select
                            value={captionStyle}
                            onChange={(e) => setCaptionStyle(e.target.value)}
                            className="w-full bg-[#14141c] border border-zinc-700/80 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                          >
                            <option value="word_red">🔴 1 Word at a Time: Red Pop with White Glow (Viral Style)</option>
                            <option value="word_yellow">🟡 1 Word at a Time: Yellow Pop (Black Border)</option>
                            <option value="word_white">⚪ 1 Word at a Time: Crisp White</option>
                            <option value="phrase_yellow">💬 3-4 Words: Yellow Highlight</option>
                            <option value="phrase_purple">💜 3-4 Words: Purple Signature</option>
                            <option value="phrase_white">🤍 3-4 Words: Clean White</option>
                          </select>
                          <span className="text-[9px] text-purple-400 font-mono block">
                            ⚡ Single word renders one word at a time centered on screen with viral pop animation.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Full-Video Key Moments Intelligence (For 1hr - 2hr+ Long Videos) */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-[#11111a] to-indigo-950/30 border border-purple-800/40 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
                        <span>Key Places Intelligence (Full-Video Spanning)</span>
                      </label>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/60 font-mono font-medium self-start sm:self-auto">
                        {timelineStrategy === 'timeline_balanced' ? '🌟 Full Timeline Spanning (Start to Finish)' : '🔥 Top Score Spikes Anywhere'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setTimelineStrategy('timeline_balanced')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          timelineStrategy === 'timeline_balanced'
                            ? 'bg-purple-950/60 border-purple-500/80 text-white shadow-lg ring-1 ring-purple-500/30'
                            : 'bg-[#121218] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-bold text-xs text-purple-300">🌟 Timeline Balanced (Recommended for 1h - 2h+ Videos)</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Divides the entire video into equal narrative sectors (Opening Hook → Core Revelation → Climax Breakthrough → Closing Takeaway). Guarantees your {clipCount} shorts are mined from key places across the full video journey without clustering!
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimelineStrategy('top_peaks')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          timelineStrategy === 'top_peaks'
                            ? 'bg-purple-950/60 border-purple-500/80 text-white shadow-lg ring-1 ring-purple-500/30'
                            : 'bg-[#121218] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-bold text-xs text-purple-300">🔥 Top Climax Peaks Anywhere</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Selects absolute highest virality score segments regardless of where they occur. Best if you only want the most intense moments even if they happen closely together.
                        </p>
                      </button>
                    </div>
                  </div>
                </div>
                {/* Primary Master Action Button */}
                {selectedFile && !isUploading && (
                  <div className="mt-6 pt-4 border-t border-[#22222e] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="text-xs text-zinc-400">
                      Ready to process <strong className="text-white">{selectedFile.name}</strong> ({formatBytes(selectedFile.size)}) &rarr; <span className="text-purple-300 font-semibold">{clipCount} {aspectRatio === '16:9' ? '16:9 Widescreen' : '9:16 Vertical'} clips</span> ({formatSecsAndMins(minDuration)} - {formatSecsAndMins(maxDuration)}, {resolution}, {burnCaptions ? `auto-captions [${captionStyle.replace('_', ' ')}]` : 'clean'})
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={startUpload}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold transition-all shadow-xl flex items-center justify-center gap-2 transform hover:scale-[1.02] cursor-pointer"
                        title="Uploads video, extracts speech, discovers key segments, and lets you review & select which ones to cut!"
                      >
                        <Search className="h-4 w-4 text-purple-200" />
                        <span>🔍 ANALYZE VIDEO & PICK IMPORTANT SEGMENTS</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          startUpload()
                        }}
                        className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-all border border-zinc-700/60 flex items-center gap-1.5 cursor-pointer"
                        title="Fast 1-click auto-mine without previewing segments"
                      >
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                        <span>⚡ 1-Click Auto-Cut</span>
                      </button>
                    </div>
                  </div>
                )}

                {inputMode === 'library' && (
                  <div className="mt-6 p-4 rounded-xl bg-purple-950/30 border border-purple-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-purple-200 text-center sm:text-left">
                      Ready to batch-mine <strong className="text-purple-300">{selectedBatchVideoIds.length} videos</strong> concurrently &rarr; generating <strong className="text-white font-bold">{selectedBatchVideoIds.length * clipCount} shorts</strong> ({formatSecsAndMins(minDuration)} - {formatSecsAndMins(maxDuration)}, {resolution}, {aspectRatio}) with zero scene repetition!
                    </div>
                    <button
                      type="button"
                      disabled={isBatchMining || selectedBatchVideoIds.length === 0}
                      onClick={startBatchMining}
                      className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-bold transition-all shadow-xl flex items-center justify-center gap-2 transform hover:scale-[1.02] cursor-pointer whitespace-nowrap"
                    >
                      {isBatchMining ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Dispatching Batch Jobs...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 text-amber-300" />
                          <span>🚀 MINE {selectedBatchVideoIds.length || 0} VIDEOS CONCURRENTLY</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
              
              {/* STAGE 2A: ACTIVE VIDEO ANALYSIS LIVE SCANNER */}
              {isAnalyzingVideo && (
                <div className="p-6 rounded-2xl border-2 border-purple-500/60 bg-gradient-to-b from-[#151522] to-[#0d0d14] shadow-2xl space-y-4 animate-pulse-slow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-purple-600/20 border border-purple-500/50 flex items-center justify-center text-purple-400">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>AI Running Through Video & Discovering Important Segments...</span>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                            {analysisProgress}% Complete
                          </span>
                        </h4>
                        <p className="text-xs text-purple-300">{analysisMessage}</p>
                      </div>
                    </div>
                    <span className="font-mono text-2xl font-black text-purple-400">{analysisProgress}%</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-400 transition-all duration-300"
                      style={{ width: `${Math.max(5, analysisProgress)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                    <span>1. Speech Transcription & Cadence Analysis (Whisper AI)</span>
                    <span>2. Climax & Viral Hook Discovery (Gemini AI)</span>
                    <span>3. Zero Scene Repetition Guarantee</span>
                  </div>
                </div>
              )}

              {/* STAGE 2B: DISCOVERED IMPORTANT SEGMENTS REVIEW & CUT TRAY */}
              {discoveredMoments.length > 0 && (
                <div className="p-6 rounded-2xl border-2 border-purple-500/50 bg-[#101018] shadow-2xl space-y-5">
                  {/* Tray Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-semibold mb-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                        <span>IMPORTANT SEGMENTS DISCOVERED</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-800 text-white font-mono font-bold ml-1">
                          {discoveredMoments.length} Moments
                        </span>
                      </div>
                      <h4 className="text-lg font-black text-white flex items-center gap-2">
                        <span>Review & Select Moments to Cut</span>
                      </h4>
                      <p className="text-xs text-zinc-400">
                        The AI analyzed <strong className="text-zinc-200">{analyzingVideo?.original_name || 'your video'}</strong>. Preview each snippet below, adjust timestamps if you like, and check the ones you want to cut into viral shorts.
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => selectAllMoments(true)}
                        className="px-3 py-1.5 rounded-lg bg-purple-950/70 hover:bg-purple-900 border border-purple-700/60 text-purple-200 text-xs font-semibold transition-all cursor-pointer"
                      >
                        Select All ({discoveredMoments.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => selectAllMoments(false)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-all cursor-pointer"
                      >
                        Deselect All
                      </button>
                      <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-purple-600/30 text-purple-300 border border-purple-500/40">
                        {discoveredMoments.filter(m => selectedMomentIds[m.id]).length} of {discoveredMoments.length} Selected
                      </span>
                    </div>
                  </div>

                  {/* Main Review Section: Video Preview + Segments Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left: Video Snippet Preview Player (5 Cols) */}
                    <div className="lg:col-span-5 bg-black rounded-xl p-3 border border-zinc-800 flex flex-col justify-between">
                      <div>
                        <div className="aspect-[9/16] max-h-[440px] mx-auto rounded-lg overflow-hidden bg-zinc-950 border-2 border-purple-500/40 shadow-xl flex items-center justify-center relative">
                          {analyzingVideo ? (
                            <video
                              ref={studioPreviewVideoRef}
                              controls
                              src={`/media/uploads/${analyzingVideo.filename}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-zinc-600 text-xs">No video loaded</div>
                          )}
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-mono text-purple-300 border border-purple-500/40">
                            9:16 Mobile Crop Preview
                          </div>
                        </div>
                        {activeMomentPreview && (
                          <div className="mt-3 text-center px-2">
                            <h5 className="text-xs font-bold text-white truncate">{activeMomentPreview.title}</h5>
                            <p className="text-[11px] text-purple-300 font-mono mt-0.5">
                              {formatSecsAndMins(Math.round(activeMomentPreview.start_time))} &rarr; {formatSecsAndMins(Math.round(activeMomentPreview.end_time))} ({activeMomentPreview.duration}s duration)
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 p-2.5 rounded-lg bg-[#14141e] border border-[#272738] text-center">
                        <span className="text-[11px] text-zinc-400 block">
                          Click <strong>"▶️ Play Snippet"</strong> on any moment to preview it here before cutting!
                        </span>
                      </div>
                    </div>

                    {/* Right: Interactive Moment Cards (7 Cols) */}
                    <div className="lg:col-span-7 space-y-3 max-h-[540px] overflow-y-auto pr-1">
                      {discoveredMoments.map((cand, idx) => {
                        const isSelected = !!selectedMomentIds[cand.id]
                        const isPlaying = activeMomentPreview?.id === cand.id
                        return (
                          <div
                            key={cand.id || idx}
                            className={`p-4 rounded-xl border transition-all ${
                              isSelected
                                ? 'bg-gradient-to-r from-purple-950/40 via-[#13131e] to-indigo-950/30 border-purple-500/80 shadow-md ring-1 ring-purple-500/40'
                                : 'bg-[#0d0d13] border-zinc-800/80 hover:border-zinc-700 opacity-70'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectMoment(cand.id)}
                                  className="h-5 w-5 accent-purple-600 rounded cursor-pointer mt-0.5 shrink-0"
                                  title="Check to include in cut batch"
                                />
                                <div className="min-w-0 flex-1">
                                  <input
                                    type="text"
                                    value={cand.title}
                                    onChange={(e) => {
                                      const newT = e.target.value
                                      setDiscoveredMoments(prev =>
                                        prev.map(c => c.id === cand.id ? { ...c, title: newT } : c)
                                      )
                                    }}
                                    className="w-full bg-transparent font-bold text-xs sm:text-sm text-white border-b border-transparent hover:border-zinc-700 focus:border-purple-500 focus:outline-none transition-colors truncate"
                                    title="Click to edit title"
                                  />
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/70 text-amber-300 border border-amber-500/50 font-mono font-bold flex items-center gap-1">
                                      <Flame className="h-3 w-3 text-amber-400" /> {cand.score || 95}% Virality Score
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 font-mono font-medium">
                                      {formatSecsAndMins(Math.round(cand.start_time))} &rarr; {formatSecsAndMins(Math.round(cand.end_time))} ({cand.duration}s)
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => playStudioMomentSnippet(cand)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                                  isPlaying
                                    ? 'bg-purple-600 text-white shadow-md'
                                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                                }`}
                              >
                                <Play className="h-3.5 w-3.5 fill-current" />
                                <span>{isPlaying ? 'Playing' : 'Preview'}</span>
                              </button>
                            </div>

                            {/* Spoken Quote */}
                            {cand.text && (
                              <p className="text-xs text-zinc-300 leading-relaxed bg-[#07070b] p-2.5 rounded-lg border border-zinc-800/80 mb-2 select-text font-sans italic">
                                "{cand.text}"
                              </p>
                            )}

                            {/* Why it was chosen */}
                            {cand.reason && (
                              <div className="text-[11px] text-zinc-400 mb-2.5 flex items-center gap-1.5">
                                <Sparkles className="h-3 w-3 text-purple-400 shrink-0" />
                                <span>{cand.reason}</span>
                              </div>
                            )}

                            {/* Timestamp Fine-Tuning Controls */}
                            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs flex-wrap gap-2">
                              <span className="text-zinc-500 text-[11px] font-medium">Fine-Tune Cut Range:</span>
                              <div className="flex items-center gap-3 font-mono text-[11px]">
                                <div className="flex items-center gap-1">
                                  <span className="text-zinc-400">Start:</span>
                                  <button
                                    type="button"
                                    onClick={() => updateMomentTime(cand.id, 'start_time', -1.0)}
                                    className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold"
                                    title="Nudge back 1s"
                                  >
                                    -1s
                                  </button>
                                  <span className="text-purple-300 font-bold px-1">{cand.start_time}s</span>
                                  <button
                                    type="button"
                                    onClick={() => updateMomentTime(cand.id, 'start_time', 1.0)}
                                    className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold"
                                    title="Nudge forward 1s"
                                  >
                                    +1s
                                  </button>
                                </div>

                                <div className="flex items-center gap-1">
                                  <span className="text-zinc-400">End:</span>
                                  <button
                                    type="button"
                                    onClick={() => updateMomentTime(cand.id, 'end_time', -1.0)}
                                    className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold"
                                    title="Trim back 1s"
                                  >
                                    -1s
                                  </button>
                                  <span className="text-purple-300 font-bold px-1">{cand.end_time}s</span>
                                  <button
                                    type="button"
                                    onClick={() => updateMomentTime(cand.id, 'end_time', 1.0)}
                                    className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold"
                                    title="Extend forward 1s"
                                  >
                                    +1s
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* STAGE 3: CUT IT - Master Action Bar */}
                  <div className="pt-4 border-t border-purple-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-purple-950/60 via-[#151522] to-indigo-950/60 p-4 rounded-xl border">
                    <div className="text-xs text-zinc-300">
                      <div>
                        Selected <strong className="text-white text-sm">{discoveredMoments.filter(m => selectedMomentIds[m.id]).length} Important Moments</strong> to cut into viral shorts.
                      </div>
                      <span className="text-[11px] text-purple-300">
                        Format: {aspectRatio} • {resolution} • {framingMode === 'smart_face' ? '🎯 Auto Face-Track' : framingMode} • {burnCaptions ? `Auto-Captions [${captionStyle.replace('_', ' ')}]` : 'Clean Video'}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isCuttingSelectedMoments || discoveredMoments.filter(m => selectedMomentIds[m.id]).length === 0}
                      onClick={handleCutSelectedMoments}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-bold transition-all shadow-2xl flex items-center justify-center gap-2.5 transform hover:scale-[1.02] cursor-pointer"
                    >
                      {isCuttingSelectedMoments ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                          <span>Cutting Selected Shorts...</span>
                        </>
                      ) : (
                        <>
                          <Scissors className="h-4 w-4 text-amber-300" />
                          <span>✂️ CUT & EXPORT {discoveredMoments.filter(m => selectedMomentIds[m.id]).length} SELECTED SHORTS</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* CUTTING JOB PROGRESS TRAY */}
              {cutSegmentsJob && (
                <div className="p-6 rounded-2xl border-2 border-emerald-500/60 bg-gradient-to-b from-[#121815] to-[#0c100e] shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-600/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                        {cutSegmentsJob.status === 'completed' ? (
                          <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                        ) : (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>
                            {cutSegmentsJob.status === 'completed'
                              ? '🎉 All Selected Shorts Cut & Ready!'
                              : 'Cutting Selected Shorts in Background...'}
                          </span>
                          <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full ${
                            cutSegmentsJob.status === 'completed'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              : 'bg-purple-950 text-purple-300 border border-purple-800'
                          }`}>
                            {cutSegmentsJob.progress}%
                          </span>
                        </h4>
                        <p className="text-xs text-zinc-300">{cutSegmentsJob.message}</p>
                      </div>
                    </div>

                    {cutSegmentsJob.status === 'completed' && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('clips')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>View in Shorts Gallery</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className={`h-full transition-all duration-300 ${
                        cutSegmentsJob.status === 'completed'
                          ? 'bg-emerald-500'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      }`}
                      style={{ width: `${Math.max(5, cutSegmentsJob.progress)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* ACTIVE MULTI-VIDEO BATCH CUTTING QUEUE */}
              {Object.keys(batchMiningJobs).length > 0 && (
                <div className="p-6 rounded-2xl border-2 border-purple-500/50 bg-[#12121c] shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-purple-600/20 border border-purple-500/50 flex items-center justify-center text-purple-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>Multi-Video Cutting Queue</span>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                            {Object.values(batchMiningJobs).filter(j => j.status === 'running').length} Cutting in Parallel
                          </span>
                        </h4>
                        <p className="text-xs text-zinc-400">Multiple videos are being transcribed and cut into viral shorts concurrently.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setBatchMiningJobs({})}
                      className="text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      Clear Queue
                    </button>
                  </div>

                  <div className="space-y-3">
                    {Object.values(batchMiningJobs).map((bj) => {
                      const isDone = bj.status === 'completed' || bj.progress >= 100
                      return (
                        <div key={bj.jobId} className="p-3.5 rounded-xl bg-[#0a0a0f] border border-zinc-800/80 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-zinc-200 truncate flex items-center gap-2">
                              {isDone ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                              ) : (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400 shrink-0" />
                              )}
                              <span className="truncate max-w-xs sm:max-w-md">{bj.videoName || `Video #${bj.videoId}`}</span>
                            </span>
                            <span className={`font-mono text-xs font-bold ${isDone ? 'text-emerald-400' : 'text-purple-400'}`}>
                              {isDone ? '100% Complete' : `${bj.progress}%`}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 truncate">{bj.message}</p>
                          <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isDone
                                  ? 'bg-emerald-500'
                                  : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                              }`}
                              style={{ width: `${Math.max(5, bj.progress)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ACTIVE MINING LIVE PIPELINE DISPLAY */}
              {activeMiningJob && (
                <div className="p-6 rounded-2xl border-2 border-purple-500/50 bg-[#12121c] shadow-2xl space-y-5 animate-pulse-slow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-purple-600/20 border border-purple-500/50 flex items-center justify-center text-purple-400">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>Mining Viral Clips in Progress</span>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                            {activeMiningJob.status}
                          </span>
                        </h4>
                        <p className="text-xs text-purple-300">{activeMiningJob.message}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-2xl font-black text-purple-400">{activeMiningJob.progress}%</span>
                    </div>
                  </div>
                  {/* 4-Stage Visual Workflow */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className={`p-2.5 rounded-lg border ${activeMiningJob.progress >= 10 ? 'bg-purple-950/40 border-purple-500/50 text-purple-200' : 'bg-zinc-900/40 border-zinc-800 text-zinc-500'}`}>
                      <span className="block font-semibold">1. Audio Extract</span>
                      <span className="text-[10px] text-zinc-400">{activeMiningJob.progress >= 10 ? '✓ Complete' : 'Pending...'}</span>
                    </div>
                    <div className={`p-2.5 rounded-lg border ${activeMiningJob.progress >= 15 && activeMiningJob.progress < 60 ? 'bg-purple-950/60 border-purple-400 text-purple-200 font-bold' : activeMiningJob.progress >= 60 ? 'bg-purple-950/40 border-purple-500/50 text-purple-200' : 'bg-zinc-900/40 border-zinc-800 text-zinc-500'}`}>
                      <span className="block font-semibold">2. Whisper AI</span>
                      <span className="text-[10px] text-zinc-400">{activeMiningJob.progress >= 60 ? '✓ Complete' : activeMiningJob.progress >= 15 ? 'Listening...' : 'Queued'}</span>
                    </div>
                    <div className={`p-2.5 rounded-lg border ${activeMiningJob.progress >= 60 && activeMiningJob.progress < 70 ? 'bg-purple-950/60 border-purple-400 text-purple-200 font-bold' : activeMiningJob.progress >= 70 ? 'bg-purple-950/40 border-purple-500/50 text-purple-200' : 'bg-zinc-900/40 border-zinc-800 text-zinc-500'}`}>
                      <span className="block font-semibold">3. Hook Mining</span>
                      <span className="text-[10px] text-zinc-400">{activeMiningJob.progress >= 70 ? '✓ Selected' : activeMiningJob.progress >= 60 ? 'Scoring...' : 'Queued'}</span>
                    </div>
                    <div className={`p-2.5 rounded-lg border ${activeMiningJob.progress >= 70 ? 'bg-purple-950/60 border-purple-400 text-purple-200 font-bold' : 'bg-zinc-900/40 border-zinc-800 text-zinc-500'}`}>
                      <span className="block font-semibold">4. 9:16 Render & Subtitles</span>
                      <span className="text-[10px] text-zinc-400">{activeMiningJob.progress >= 100 ? '✓ Done' : activeMiningJob.progress >= 70 ? 'Burning frames...' : 'Queued'}</span>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                      style={{ width: `${activeMiningJob.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              {/* RECENT MINED SHORTS SHOWCASE */}
              {clips.length > 0 && (
                <div className="p-6 rounded-2xl border border-[#23232c] bg-[#101015] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-400" />
                        <span>Recently Mined Viral Shorts ({clips.length})</span>
                      </h4>
                      <p className="text-xs text-zinc-500">Ready to download and post to YouTube Shorts, Reels, and TikTok.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('clips')}
                      className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
                    >
                      <span>View All in Gallery &rarr;</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {clips.slice(0, 3).map((clip) => (
                      <div
                        key={clip.id}
                        className="p-3 rounded-xl bg-[#0c0c10] border border-[#23232c] hover:border-purple-500/40 transition-colors flex items-center gap-3"
                      >
                        <div className="w-16 h-20 rounded-lg bg-black overflow-hidden relative shrink-0 border border-zinc-800">
                          {clip.thumbnail_path ? (
                            <img
                              src={clip.thumbnail_path}
                              alt={clip.title}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none' }}
                            />
                          ) : (
                            <FileVideo className="h-6 w-6 text-zinc-600 m-auto mt-6" />
                          )}
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <button
                              onClick={() => setSelectedPreviewClip(clip)}
                              className="h-7 w-7 rounded-full bg-purple-600/90 flex items-center justify-center text-white shadow"
                            >
                              <Play className="h-3.5 w-3.5 fill-white ml-0.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <h5 className="text-xs font-semibold text-zinc-200 truncate" title={clip.title}>
                            {clip.title}
                          </h5>
                          <span className="text-[10px] text-zinc-500 block font-mono">
                            {formatDuration(clip.start_time)} &rarr; {formatDuration(clip.end_time)}
                          </span>
                          <div className="flex items-center gap-2 pt-1">
                            {clip.file_path && (
                              <a
                                href={`/api/clips/${clip.id}/download`}
                                download
                                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-purple-600 text-white font-medium hover:bg-purple-500 transition-colors"
                              >
                                <Download className="h-2.5 w-2.5" />
                                <span>Download</span>
                              </a>
                            )}
                            <button
                              onClick={() => openSocialModal(clip)}
                              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                            >
                              <Share2 className="h-2.5 w-2.5" />
                              <span>Social Kit</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* TAB 2: VIDEOS LIBRARY */}
          {activeTab === 'videos' && (
            <div className="space-y-6">
              <div className="p-6 rounded-xl border border-[#23232c] bg-[#121217]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Source Video Library</h3>
                    <p className="text-xs text-zinc-400">Catalog of uploaded sermons, teachings, and podcasts.</p>
                  </div>
                  <button
                    onClick={() => loadVideos()}
                    disabled={isLoadingVideos}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingVideos ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
                {videos.length === 0 ? (
                  <div className="border border-[#22222a] rounded-lg p-12 text-center bg-[#0d0d11]">
                    <Film className="h-10 w-10 mx-auto text-zinc-600 mb-3" />
                    <p className="text-sm text-zinc-300 font-medium">No videos cataloged yet</p>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto mb-4">
                      Upload your first sermon or podcast video to begin extracting clips.
                    </p>
                    <button
                      onClick={() => setActiveTab('mine')}
                      className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors"
                    >
                      Go to Mine Clips Studio
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {videos.map((vid) => {
                      const job = activeJobs[`video_${vid.id}`]
                      const isTranscribing = vid.status === 'transcribing' || (job && job.status === 'running')
                      const isTranscribed = vid.status === 'transcribed'
                      return (
                        <div
                          key={vid.id}
                          className="rounded-xl border border-[#22222a] bg-[#0e0e13] overflow-hidden flex flex-col justify-between hover:border-purple-500/40 transition-colors group"
                        >
                          <div className="relative aspect-video bg-black/60 overflow-hidden flex items-center justify-center">
                            {vid.thumbnail_path ? (
                              <img
                                src={vid.thumbnail_path}
                                alt={vid.original_name}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none' }}
                              />
                            ) : (
                              <FileVideo className="h-10 w-10 text-zinc-600" />
                            )}
                            <button
                              onClick={() => setSelectedPreviewVideo(vid)}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                            >
                              <div className="h-10 w-10 rounded-full bg-purple-600/90 flex items-center justify-center shadow-lg">
                                <Play className="h-5 w-5 fill-white ml-0.5" />
                              </div>
                            </button>
                            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-zinc-300 flex items-center gap-1 border border-zinc-700/60">
                              <Clock className="h-2.5 w-2.5" />
                              <span>{formatDuration(vid.duration_seconds)}</span>
                            </div>
                          </div>
                          <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                            <div>
                              <h4 className="text-xs font-semibold text-zinc-100 truncate mb-1" title={vid.original_name}>
                                {vid.original_name}
                              </h4>
                              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                                <span>{formatBytes(vid.file_size_bytes)}</span>
                                <span>•</span>
                                <span>{vid.width}x{vid.height}</span>
                              </div>
                            </div>
                            <div className="pt-2 border-t border-[#1c1c24] space-y-2.5">
                              {isTranscribing && (
                                <div className="space-y-1.5 p-2 rounded-lg bg-purple-950/20 border border-purple-800/40">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-purple-300 flex items-center gap-1.5 font-medium">
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      {job?.message || 'Transcribing with Whisper...'}
                                    </span>
                                    <span className="font-mono text-purple-400 font-bold">{job?.progress || 10}%</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-purple-500 transition-all duration-300"
                                      style={{ width: `${job?.progress || 10}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                              {isTranscribed && !isTranscribing && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-medium">
                                      <CheckCircle2 className="h-3 w-3" /> Transcribed
                                    </span>
                                    <button
                                      onClick={() => openTranscriptViewer(vid)}
                                      className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                                    >
                                      <FileText className="h-3 w-3" />
                                      <span>Transcript</span>
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setActiveTab('mine')
                                      startMiningPipeline(vid.id)
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md"
                                  >
                                    <Zap className="h-3.5 w-3.5" />
                                    <span>🚀 Mine {clipCount} Viral Shorts</span>
                                  </button>
                                  <button
                                    onClick={() => openHighlightStudio(vid)}
                                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors border border-zinc-700/50"
                                  >
                                    <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                                    <span>Manual Highlight Studio</span>
                                  </button>
                                </div>
                              )}
                              {!isTranscribed && !isTranscribing && (
                                <div className="space-y-2">
                                  <button
                                    onClick={() => triggerAutoCut(vid.id)}
                                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md"
                                  >
                                    <Scissors className="h-4 w-4" />
                                    <span>⚡ 1-Click: Auto-Cut into 9:16 Short</span>
                                  </button>
                                  <div className="flex items-center gap-2 pt-0.5">
                                    <select
                                      value={selectedModelSize[vid.id] || 'tiny'}
                                      onChange={(e) => setSelectedModelSize(prev => ({ ...prev, [vid.id]: e.target.value }))}
                                      className="bg-[#121218] border border-[#262633] rounded px-2 py-1 text-[11px] text-zinc-400 focus:outline-none focus:border-purple-500"
                                    >
                                      <option value="tiny">Tiny (Fastest)</option>
                                      <option value="base">Base</option>
                                      <option value="small">Small</option>
                                    </select>
                                    <button
                                      onClick={() => triggerTranscription(vid.id)}
                                      className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition-colors border border-zinc-700/50"
                                    >
                                      <FileText className="h-3 w-3 text-purple-400" />
                                      <span>Transcribe Only</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#181820]">
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  {new Date(vid.created_at).toLocaleDateString()}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setSelectedPreviewVideo(vid)}
                                    title="Play preview"
                                    className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                                  >
                                    <Play className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => deleteVideo(vid.id)}
                                    title="Delete video"
                                    className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              {/* HIGHLIGHT DETECTION STUDIO MODAL */}
              {highlightModalVideo && (
                <div
                  className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setHighlightModalVideo(null)
                  }}
                >
                  <div className="bg-[#111116] border border-[#2b2b38] rounded-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden shadow-2xl cursor-default">
                    <div className="p-4 border-b border-[#22222a] flex items-center justify-between bg-[#14141a] gap-3">
                      <div className="flex items-center gap-3 truncate">
                        <button
                          onClick={() => setHighlightModalVideo(null)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700/80 hover:border-zinc-500 transition-all shadow group cursor-pointer"
                          title="Back to Videos (Esc)"
                        >
                          <ArrowLeft className="h-4 w-4 text-purple-400 group-hover:-translate-x-0.5 transition-transform" />
                          <span>Back</span>
                        </button>
                        <div className="h-9 w-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 flex-shrink-0">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div className="truncate">
                          <h4 className="text-sm font-semibold text-zinc-200 truncate max-w-md">
                            Highlight Detection: {highlightModalVideo.original_name}
                          </h4>
                          <span className="text-xs text-zinc-500 flex items-center gap-2">
                            <span>Detected {candidates.length} candidates</span>
                            <span>•</span>
                            <span className="text-purple-400">
                              {candidates[0]?.method === 'gemini_ai' ? '✨ Gemini AI' : '⚡ Rule-Based Scoring (Offline)'}
                            </span>
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setHighlightModalVideo(null)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-100 border border-red-800/50 hover:border-red-700 transition-all text-xs font-medium cursor-pointer shadow-sm flex-shrink-0"
                        title="Cancel / Close studio (Esc)"
                      >
                        <X className="h-4 w-4" />
                        <span>Cancel</span>
                      </button>
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-5 overflow-hidden">
                      <div className="md:col-span-2 bg-black flex flex-col justify-between border-r border-[#22222a] p-4">
                        <div>
                          <div className="aspect-[9/16] max-h-[460px] mx-auto rounded-xl overflow-hidden bg-zinc-950 border-2 border-purple-500/30 shadow-xl flex items-center justify-center relative">
                            <video
                              ref={snippetVideoRef}
                              controls
                              src={`/media/uploads/${highlightModalVideo.filename}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-purple-300 border border-purple-500/30">
                              9:16 Crop Preview
                            </div>
                          </div>
                          {activeSnippetPreview && (
                            <div className="mt-3 text-center">
                              <h5 className="text-xs font-semibold text-zinc-200 truncate">{activeSnippetPreview.title}</h5>
                              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                                {formatDuration(activeSnippetPreview.start_time)} &rarr; {formatDuration(activeSnippetPreview.end_time)} ({activeSnippetPreview.duration}s)
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="p-3 rounded-lg bg-[#14141a] border border-[#22222a] text-center">
                          <p className="text-[11px] text-zinc-400">
                            Select a candidate on the right, fine-tune timestamps, then click <strong>Approve Clip</strong>!
                          </p>
                        </div>
                      </div>
                      <div className="md:col-span-3 flex flex-col bg-[#0d0d12] overflow-hidden">
                        <div className="p-3 border-b border-[#202028] bg-[#111116] flex items-center justify-between">
                          <span className="text-xs font-medium text-zinc-300">
                            Candidate Highlights ({candidates.length})
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            Scored by Speech Cadence & Keyword Impact
                          </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                          {isLoadingHighlights && (
                            <div className="flex flex-col items-center justify-center py-24 text-zinc-500 gap-2">
                              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                              <span className="text-xs">Analyzing speech cadence and power quotes...</span>
                            </div>
                          )}
                          {!isLoadingHighlights && candidates.map((cand) => {
                            const isApproved = approvedCandidateIds[cand.id]
                            const isSelected = activeSnippetPreview?.id === cand.id
                            return (
                              <div
                                key={cand.id}
                                className={`p-4 rounded-xl border transition-all ${
                                  isSelected
                                    ? 'border-purple-500 bg-[#161620]'
                                    : 'border-[#22222b] bg-[#121217] hover:border-zinc-700'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex-1">
                                    <input
                                      type="text"
                                      value={cand.title}
                                      onChange={(e) => {
                                        const newTitle = e.target.value
                                        setCandidates(prev =>
                                          prev.map(c => c.id === cand.id ? { ...c, title: newTitle } : c)
                                        )
                                      }}
                                      className="w-full bg-transparent font-semibold text-xs text-white border-b border-transparent hover:border-zinc-700 focus:border-purple-500 focus:outline-none transition-colors"
                                      title="Click to edit title"
                                    />
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 font-mono font-medium flex items-center gap-1">
                                        <Flame className="h-2.5 w-2.5" /> {cand.score}/100 Impact
                                      </span>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                                        {cand.duration}s
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => playSnippet(cand)}
                                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                                  >
                                    <Play className="h-3 w-3 fill-zinc-300" />
                                    <span>Preview</span>
                                  </button>
                                </div>
                                <p className="text-xs text-zinc-300 leading-relaxed bg-[#0a0a0e] p-2.5 rounded-lg border border-[#1e1e26] mb-3 select-text">
                                  "{cand.text}"
                                </p>
                                <div className="text-[11px] text-zinc-500 mb-3 flex items-center gap-1.5">
                                  <Info className="h-3 w-3 text-purple-400 shrink-0" />
                                  <span>{cand.reason}</span>
                                </div>
                                <div className="pt-2 border-t border-[#1e1e26] flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="text-zinc-500 text-[11px]">Trim:</span>
                                    <div className="flex items-center gap-1 font-mono text-[11px]">
                                      <span className="text-zinc-400">Start:</span>
                                      <button
                                        onClick={() => updateCandidateTime(cand.id, 'start_time', -0.5)}
                                        className="px-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                                      >
                                        -
                                      </button>
                                      <span className="text-purple-300 px-1">{cand.start_time}s</span>
                                      <button
                                        onClick={() => updateCandidateTime(cand.id, 'start_time', 0.5)}
                                        className="px-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                                      >
                                        +
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-1 font-mono text-[11px] ml-2">
                                      <span className="text-zinc-400">End:</span>
                                      <button
                                        onClick={() => updateCandidateTime(cand.id, 'end_time', -0.5)}
                                        className="px-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                                      >
                                        -
                                      </button>
                                      <span className="text-purple-300 px-1">{cand.end_time}s</span>
                                      <button
                                        onClick={() => updateCandidateTime(cand.id, 'end_time', 0.5)}
                                        className="px-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => approveCandidate(cand)}
                                    disabled={isApproved}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                                      isApproved
                                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 cursor-default'
                                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm'
                                    }`}
                                  >
                                    {isApproved ? (
                                      <>
                                        <Check className="h-3.5 w-3.5" />
                                        <span>Added to Clips</span>
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Approve Clip</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* TRANSCRIPT VIEWER MODAL */}
              {activeTranscriptVideo && (
                <div
                  className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setActiveTranscriptVideo(null)
                  }}
                >
                  <div className="bg-[#111116] border border-[#2b2b38] rounded-2xl max-w-4xl w-full h-[88vh] flex flex-col overflow-hidden shadow-2xl cursor-default">
                    <div className="p-4 border-b border-[#22222a] flex items-center justify-between bg-[#14141a] gap-3">
                      <div className="flex items-center gap-3 truncate">
                        <button
                          onClick={() => setActiveTranscriptVideo(null)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700/80 hover:border-zinc-500 transition-all shadow group cursor-pointer"
                          title="Back to Videos (Esc)"
                        >
                          <ArrowLeft className="h-4 w-4 text-purple-400 group-hover:-translate-x-0.5 transition-transform" />
                          <span>Back</span>
                        </button>
                        <div className="h-8 w-8 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 flex-shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="truncate">
                          <h4 className="text-sm font-semibold text-zinc-200 truncate max-w-md">
                            {activeTranscriptVideo.original_name}
                          </h4>
                          <span className="text-xs text-zinc-500">
                            Language: <span className="uppercase text-purple-400 font-mono font-medium">{transcriptData?.language || 'EN'}</span> • {transcriptData?.total_segments || 0} segments with word-level timestamps
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTranscriptVideo(null)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-100 border border-red-800/50 hover:border-red-700 transition-all text-xs font-medium cursor-pointer shadow-sm flex-shrink-0"
                        title="Cancel / Close transcript (Esc)"
                      >
                        <X className="h-4 w-4" />
                        <span>Cancel</span>
                      </button>
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-5 overflow-hidden">
                      <div className="md:col-span-2 bg-black flex flex-col justify-center border-r border-[#22222a] p-4">
                        <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/80 border border-zinc-800 shadow">
                          <video
                            ref={modalVideoRef}
                            controls
                            src={`/media/uploads/${activeTranscriptVideo.filename}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-3 text-center">
                          💡 Click any timestamp on the right to jump directly to that part of the video!
                        </p>
                      </div>
                      <div className="md:col-span-3 flex flex-col bg-[#0d0d12] overflow-hidden">
                        <div className="p-3 border-b border-[#202028] bg-[#111116] flex items-center gap-2">
                          <div className="relative flex-1">
                            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                              type="text"
                              placeholder="Search spoken words in transcript..."
                              value={transcriptSearch}
                              onChange={(e) => setTranscriptSearch(e.target.value)}
                              className="w-full bg-[#0a0a0e] border border-[#282833] rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                          {isLoadingTranscript && (
                            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-2">
                              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                              <span className="text-xs">Loading local transcript...</span>
                            </div>
                          )}
                          {!isLoadingTranscript && filteredSegments.map((seg) => (
                            <div
                              key={seg.id}
                              className="p-3 rounded-lg bg-[#14141a] border border-[#23232c] hover:border-purple-500/40 transition-colors group"
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <button
                                  onClick={() => jumpToTimestamp(seg.start)}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/40 text-[11px] font-mono text-purple-300 hover:bg-purple-900/60 transition-colors"
                                >
                                  <Play className="h-2.5 w-2.5 fill-purple-300" />
                                  <span>{formatDuration(seg.start)} &rarr; {formatDuration(seg.end)}</span>
                                </button>
                                <span className="text-[10px] text-zinc-500">{seg.words.length} words</span>
                              </div>
                              <p className="text-xs text-zinc-200 leading-relaxed font-sans select-text">
                                {seg.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* VIDEO PLAYBACK PREVIEW MODAL */}
              {selectedPreviewVideo && (
                <div
                  className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setSelectedPreviewVideo(null)
                  }}
                >
                  <div className="bg-[#121217] border border-[#2a2a36] rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl cursor-default animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-3.5 sm:p-4 border-b border-[#22222a] flex items-center justify-between bg-[#15151c] gap-3">
                      <div className="flex items-center gap-3 truncate">
                        <button
                          onClick={() => setSelectedPreviewVideo(null)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700/80 hover:border-zinc-500 transition-all shadow group cursor-pointer"
                          title="Back to Videos list (Esc)"
                        >
                          <ArrowLeft className="h-4 w-4 text-purple-400 group-hover:-translate-x-0.5 transition-transform" />
                          <span>Back</span>
                        </button>
                        <div className="truncate">
                          <h4 className="text-sm font-semibold text-zinc-100 truncate">{selectedPreviewVideo.original_name}</h4>
                          <span className="text-xs text-zinc-400 flex items-center gap-2">
                            <span>{formatDuration(selectedPreviewVideo.duration_seconds)}</span>
                            <span>•</span>
                            <span>{formatBytes(selectedPreviewVideo.file_size_bytes)}</span>
                            <span className="text-[10px] text-purple-400 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/40">Source Video</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setSelectedPreviewVideo(null)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-100 border border-red-800/50 hover:border-red-700 transition-all text-xs font-medium cursor-pointer shadow-sm"
                          title="Cancel / Close preview (Esc)"
                        >
                          <X className="h-4 w-4" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                    <div className="aspect-video bg-black flex items-center justify-center relative">
                      <video
                        controls
                        autoPlay
                        src={`/media/uploads/${selectedPreviewVideo.filename}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="p-3 border-t border-[#22222a] bg-[#14141a] flex items-center justify-between">
                      <button
                        onClick={() => setSelectedPreviewVideo(null)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="h-3.5 w-3.5 text-zinc-400" />
                        <span>Return to Video Library</span>
                      </button>
                      <span className="text-[11px] text-zinc-500">
                        Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-mono">Esc</kbd> or click outside to close
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* TAB: MASTER VIDEO EDITOR STUDIO */}
          {activeTab === 'editor' && (
            <div className="space-y-6">
              {editorClip ? (
                <React.Suspense fallback={
                  <div className="p-16 rounded-2xl bg-[#11121d] border border-purple-900/40 text-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto" />
                    <p className="text-sm font-semibold text-zinc-200">Launching Master Video Editor Studio...</p>
                    <p className="text-xs text-zinc-500">Preparing multi-track timeline, playhead razor & outro engine</p>
                  </div>
                }>
                  <CapCutEditor
                    clip={editorClip}
                    onClose={() => {
                      setEditorClip(null)
                    }}
                    onClipUpdated={(updated) => {
                      setClips(prev => prev.map(c => c.id === updated.id ? updated : c))
                      setEditorClip(updated)
                    }}
                  />
                </React.Suspense>
              ) : (
                <div className="max-w-3xl mx-auto space-y-6">
                  {/* IMPORT EXTERNAL VIDEO DROPZONE */}
                  <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#141524] to-[#0e0f17] border-2 border-dashed border-purple-500/40 hover:border-purple-400 text-center space-y-4 shadow-2xl transition-all">
                    <input
                      type="file"
                      id="editor-import-file-input"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleImportVideoToEditor(file)
                      }}
                      accept="video/mp4,video/quicktime,video/webm,video/*"
                      className="hidden"
                    />
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-600 flex items-center justify-center text-white mx-auto shadow-xl transform hover:scale-105 transition-transform">
                      <Upload className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Import Any Video to Master Editor</h3>
                      <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                        Drag and drop any external video (.mp4, .mov) from your phone or PC. Edit, cut sections with the moving playhead razor, add animated captions, and export directly — without needing CapCut!
                      </p>
                    </div>
                    <div className="pt-2">
                      <label
                        htmlFor="editor-import-file-input"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg cursor-pointer transform hover:scale-[1.02]"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Choose Video File from PC / Phone</span>
                      </label>
                    </div>
                  </div>

                  {/* OR PICK FROM EXISTING MINED SHORTS */}
                  {clips.length > 0 && (
                    <div className="p-6 rounded-2xl bg-[#12131f] border border-[#232538] space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-zinc-200">Or Open an Existing Mined Short:</h4>
                        <button
                          onClick={() => setActiveTab('clips')}
                          className="text-xs text-purple-400 hover:text-purple-300 font-medium cursor-pointer"
                        >
                          View All ({clips.length}) &rarr;
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {clips.slice(0, 4).map(c => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setEditorClip(c)
                              setActiveTab('editor')
                            }}
                            className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-purple-500/50 text-left transition-all group cursor-pointer"
                          >
                            <div className="aspect-[9/16] max-h-28 bg-black rounded-lg overflow-hidden mb-2 relative flex items-center justify-center">
                              {c.thumbnail_path ? (
                                <img
                                  src={c.thumbnail_path}
                                  alt={c.title}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none' }}
                                />
                              ) : (
                                <FileVideo className="h-6 w-6 text-zinc-600" />
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Scissors className="h-4 w-4 text-white" />
                              </div>
                            </div>
                            <h5 className="text-[11px] font-medium text-zinc-200 truncate">{c.title}</h5>
                            <span className="text-[10px] text-purple-400 font-mono">Edit Short &rarr;</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* TAB: CREATOR SHOWCASE & VIRAL TESTIMONIALS */}
          {activeTab === 'showcase' && (
            <React.Suspense fallback={
              <div className="p-16 rounded-2xl bg-[#11121d] border border-purple-900/40 text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto" />
                <p className="text-sm font-semibold text-zinc-200">Loading Creator Showcase...</p>
              </div>
            }>
              <ShowcaseTestimonials
                clips={clips}
                onOpenEditor={(c) => {
                  setEditorClip(c)
                  setActiveTab('editor')
                }}
                onPreviewClip={(c) => setSelectedPreviewClip(c)}
              />
            </React.Suspense>
          )}
          {/* TAB 3: APPROVED CLIPS (PHASE 5 RENDERING ACTIVE) */}
          {activeTab === 'clips' && (
            <div className="space-y-6">
              <div className="p-6 rounded-xl border border-[#23232c] bg-[#121217]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-semibold text-white">9:16 Vertical Shorts Studio</h3>
                    <p className="text-xs text-zinc-400">
                      Exported clips ready for TikTok, Instagram Reels, and YouTube Shorts with animated subtitles.
                    </p>
                  </div>
                  <button
                    onClick={() => loadClips()}
                    disabled={isLoadingClips}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingClips ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                {/* DEVICE-LOCAL STORAGE BAR */}
                <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-zinc-900/80 to-purple-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">📱 Device-Local Storage</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          100% On Your Device
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {deviceClipsCount} clips saved in this browser ({deviceStorageMB} MB used) • 0 MB cloud space used • Safe from server restarts!
                      </p>
                      {deviceStorageNotification && (
                        <div className="text-xs text-amber-300 mt-1 font-medium animate-pulse">
                          {deviceStorageNotification}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleSaveAllToDevice}
                      disabled={isSavingToDevice || clips.length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition-all cursor-pointer"
                      title="Save all clips into phone/laptop memory"
                    >
                      {isSavingToDevice ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Smartphone className="w-3.5 h-3.5" />
                      )}
                      <span>{isSavingToDevice ? 'Saving...' : 'Save All to Device'}</span>
                    </button>

                    <button
                      onClick={handleDownloadAllClips}
                      disabled={clips.length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition-all cursor-pointer"
                      title="Download all clips to your PC/phone Downloads folder"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download All (.mp4)</span>
                    </button>

                    {deviceClipsCount > 0 && (
                      <button
                        onClick={handleClearDeviceStorage}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 text-xs transition-all cursor-pointer"
                        title="Free up device disk space"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Free Space</span>
                      </button>
                    )}
                  </div>
                </div>
                {clips.length === 0 ? (
                  <div className="border border-[#22222a] rounded-lg p-12 text-center bg-[#0d0d11]">
                    <Scissors className="h-10 w-10 mx-auto text-zinc-600 mb-3" />
                    <p className="text-sm text-zinc-300 font-medium">No clips approved yet</p>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto mb-4">
                      Go to your Video Library, select a transcribed video, and click "Pick Shorts Highlights" to approve your first clip!
                    </p>
                    <button
                      onClick={() => setActiveTab('videos')}
                      className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors"
                    >
                      Go to Video Library
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {clips.map((clip) => {
                      const dur = Math.round((clip.end_time - clip.start_time) * 10) / 10
                      const job = activeJobs[`clip_${clip.id}`]
                      const isRendering = clip.status === 'rendering' || (job && job.status === 'running')
                      const isReady = clip.status === 'ready' && clip.file_path
                      const currentOpts = renderOptions[clip.id] || { framing: 'blur', captions: true, style: 'default' }
                      return (
                        <div
                          key={clip.id}
                          className="rounded-2xl border border-[#23232c] bg-[#0e0e13] overflow-hidden flex flex-col justify-between hover:border-purple-500/40 transition-colors group shadow-lg"
                        >
                          {/* Preview Thumbnail Container (9:16 or 16:9) */}
                          <div className={`relative ${clip.aspect_ratio?.includes('16:9') ? 'aspect-video' : 'aspect-[9/16]'} max-h-[380px] bg-black/90 overflow-hidden flex items-center justify-center`}>
                            {clip.thumbnail_path ? (
                              <img
                                src={clip.thumbnail_path}
                                alt={clip.title}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none' }}
                              />
                            ) : (
                              <FileVideo className="h-12 w-12 text-zinc-600" />
                            )}
                            {/* Aspect Ratio Badge */}
                            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[10px] font-mono text-purple-300 border border-purple-500/40 font-semibold flex items-center gap-1">
                              <Video className="h-2.5 w-2.5" />
                              {clip.aspect_ratio?.includes('16:9') ? '16:9 Widescreen' : '9:16 Shorts'}
                            </div>
                            {/* Duration Badge */}
                            <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[10px] font-mono text-zinc-300 border border-zinc-700/60">
                              {dur}s
                            </div>
                            {/* Play Overlay if Ready */}
                            {isReady && (
                              <button
                                onClick={() => setSelectedPreviewClip(clip)}
                                className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                              >
                                <div className="h-12 w-12 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-xl transform group-hover:scale-110 transition-transform">
                                  <Play className="h-6 w-6 fill-white ml-0.5" />
                                </div>
                              </button>
                            )}
                          </div>
                          {/* Card Content & Action Bar */}
                          <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                            <div>
                              <h4 className="text-xs font-semibold text-zinc-100 truncate mb-1" title={clip.title}>
                                {clip.title}
                              </h4>
                              <div className="text-[11px] text-zinc-500 font-mono">
                                Range: {formatDuration(clip.start_time)} &rarr; {formatDuration(clip.end_time)}
                              </div>
                            </div>
                            {/* STATE 1: RENDERING */}
                            {isRendering && (
                              <div className="space-y-1.5 p-2.5 rounded-xl bg-purple-950/20 border border-purple-800/40">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-purple-300 flex items-center gap-1.5 font-medium truncate">
                                    <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                                    <span className="truncate">{job?.message || 'Rendering 9:16 vertical video...'}</span>
                                  </span>
                                  <span className="font-mono text-purple-400 font-bold ml-1">{job?.progress || 10}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-purple-500 transition-all duration-300"
                                    style={{ width: `${job?.progress || 10}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                            {/* STATE 2: READY (PLAY & DOWNLOAD) */}
                            {isReady && !isRendering && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                    clip.isDeviceStored
                                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/50'
                                      : 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/50'
                                  }`}>
                                    {clip.isDeviceStored ? (
                                      <>
                                        <Smartphone className="h-3 w-3 text-emerald-400" />
                                        <span>On Device {clip.deviceStorageSizeMB ? `(${clip.deviceStorageSizeMB} MB)` : ''}</span>
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                        <span>Ready (Cloud)</span>
                                      </>
                                    )}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {!clip.isDeviceStored && (
                                      <button
                                        onClick={() => handleSaveSingleClipToDevice(clip)}
                                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                                        title="Save to your phone or laptop storage"
                                      >
                                        <Smartphone className="h-3 w-3" />
                                        <span>Save</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => setSelectedPreviewClip(clip)}
                                      className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 cursor-pointer"
                                    >
                                      <Play className="h-3 w-3 fill-purple-400" />
                                      <span>Watch</span>
                                    </button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <a
                                    href={clip.localBlobUrl || `/api/clips/${clip.id}/download`}
                                    download={`${clip.title}.mp4`}
                                    className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors shadow-sm"
                                  >
                                    <Download className="h-3.5 w-3.5 shrink-0" />
                                    <span>MP4 Download</span>
                                  </a>
                                  <button
                                    onClick={() => openSocialModal(clip)}
                                    className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-[#181822] hover:bg-[#20202e] border border-purple-500/40 text-purple-300 text-xs font-medium transition-colors shadow-sm"
                                  >
                                    <Share2 className="h-3.5 w-3.5 shrink-0" />
                                    <span>Social Kit</span>
                                  </button>
                                </div>
                                {/* Direct Master Editor Studio */}
                                <button
                                  onClick={() => setEditorClip(clip)}
                                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-900/70 via-indigo-900/70 to-purple-900/70 hover:from-purple-800 hover:to-indigo-800 text-purple-200 hover:text-white text-xs font-bold border border-purple-500/50 transition-all cursor-pointer shadow-md transform hover:scale-[1.01]"
                                >
                                  <Scissors className="h-3.5 w-3.5 text-purple-400" />
                                  <span>🎬 Edit in Master Editor</span>
                                </button>
                                <button
                                  onClick={() => setReRenderClipId(prev => prev === clip.id ? null : clip.id)}
                                  className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-[#14141c] hover:bg-[#1a1a24] border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 text-[11px] transition-colors"
                                >
                                  <Sliders className="h-3 w-3 text-purple-400" />
                                  <span>{reRenderClipId === clip.id ? 'Close Specs' : 'Re-Render Specs (1080p/720p/Captions)'}</span>
                                </button>
                                {reRenderClipId === clip.id && (
                                  <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                                      <div>
                                        <label className="block text-zinc-500 mb-0.5">Ratio</label>
                                        <select
                                          value={currentOpts.aspectRatio || '9:16'}
                                          onChange={(e) =>
                                            setRenderOptions(prev => ({
                                              ...prev,
                                              [clip.id]: { ...currentOpts, aspectRatio: e.target.value as any }
                                            }))
                                          }
                                          className="w-full bg-[#121218] border border-zinc-800 rounded px-1 py-1 text-zinc-300 text-[10px]"
                                        >
                                          <option value="9:16">📱 9:16 Vertical</option>
                                          <option value="16:9">🖥️ 16:9 Landscape</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="block text-zinc-500 mb-0.5">Framing</label>
                                        <select
                                          value={currentOpts.framing}
                                          onChange={(e) =>
                                            setRenderOptions(prev => ({
                                              ...prev,
                                              [clip.id]: { ...currentOpts, framing: e.target.value as any }
                                            }))
                                          }
                                          className="w-full bg-[#121218] border border-zinc-800 rounded px-1 py-1 text-zinc-300 text-[10px]"
                                        >
                                          <option value="smart_face">🎯 Auto Face</option>
                                          <option value="blur">Blur BG</option>
                                          <option value="crop">Center Crop</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="block text-zinc-500 mb-0.5">Resolution</label>
                                        <select
                                          value={currentOpts.resolution || '1080p'}
                                          onChange={(e) =>
                                            setRenderOptions(prev => ({
                                              ...prev,
                                              [clip.id]: { ...currentOpts, resolution: e.target.value as any }
                                            }))
                                          }
                                          className="w-full bg-[#121218] border border-zinc-800 rounded px-1 py-1 text-zinc-300 text-[10px]"
                                        >
                                          <option value="1080p">1080p</option>
                                          <option value="720p">720p</option>
                                          <option value="480p">480p</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="block text-zinc-500 mb-0.5">Captions</label>
                                        <select
                                          value={currentOpts.captions ? (currentOpts.style || 'word_red') : 'none'}
                                          onChange={(e) => {
                                            const val = e.target.value
                                            setRenderOptions(prev => ({
                                              ...prev,
                                              [clip.id]: {
                                                ...currentOpts,
                                                captions: val !== 'none',
                                                style: val !== 'none' ? val : 'word_red'
                                              }
                                            }))
                                          }}
                                          className="w-full bg-[#121218] border border-zinc-800 rounded px-1 py-1 text-zinc-300 text-[10px]"
                                        >
                                          <option value="word_red">🔴 1-Word Red</option>
                                          <option value="word_yellow">🟡 1-Word Yellow</option>
                                          <option value="word_white">⚪ 1-Word White</option>
                                          <option value="phrase_yellow">💬 Phrase Yellow</option>
                                          <option value="phrase_purple">💜 Phrase Purple</option>
                                          <option value="phrase_white">🤍 Phrase White</option>
                                          <option value="none">🚫 No Captions</option>
                                        </select>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        setReRenderClipId(null)
                                        triggerClipRender(clip.id)
                                      }}
                                      className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                                    >
                                      <Scissors className="h-3 w-3" />
                                      <span>Apply & Re-Render Now</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                            {/* STATE 3: PENDING RENDER CONTROLS */}
                            {!isReady && !isRendering && (
                              <div className="space-y-2.5 pt-1 border-t border-[#1a1a24]">
                                {/* Ratio, Framing, Resolution & Caption Option Selectors */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                                  <div>
                                    <label className="block text-zinc-500 text-[10px] mb-0.5">Ratio</label>
                                    <select
                                      value={currentOpts.aspectRatio || '9:16'}
                                      onChange={(e) =>
                                        setRenderOptions(prev => ({
                                          ...prev,
                                          [clip.id]: { ...currentOpts, aspectRatio: e.target.value as any }
                                        }))
                                      }
                                      className="w-full bg-[#121218] border border-[#262633] rounded px-1.5 py-1 text-zinc-300 focus:outline-none focus:border-purple-500 text-[10px]"
                                    >
                                      <option value="9:16">📱 9:16 Vertical</option>
                                      <option value="16:9">🖥️ 16:9 Landscape</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-zinc-500 text-[10px] mb-0.5">Framing</label>
                                    <select
                                      value={currentOpts.framing}
                                      onChange={(e) =>
                                        setRenderOptions(prev => ({
                                          ...prev,
                                          [clip.id]: { ...currentOpts, framing: e.target.value as any }
                                        }))
                                      }
                                      className="w-full bg-[#121218] border border-[#262633] rounded px-1.5 py-1 text-zinc-300 focus:outline-none focus:border-purple-500 text-[10px]"
                                    >
                                      <option value="smart_face">🎯 Auto Face</option>
                                      <option value="blur">Blur BG</option>
                                      <option value="crop">Center Crop</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-zinc-500 text-[10px] mb-0.5">Resolution</label>
                                    <select
                                      value={currentOpts.resolution || '1080p'}
                                      onChange={(e) =>
                                        setRenderOptions(prev => ({
                                          ...prev,
                                          [clip.id]: { ...currentOpts, resolution: e.target.value as any }
                                        }))
                                      }
                                      className="w-full bg-[#121218] border border-[#262633] rounded px-1.5 py-1 text-zinc-300 focus:outline-none focus:border-purple-500 text-[10px]"
                                    >
                                      <option value="1080p">1080p (FHD)</option>
                                      <option value="720p">720p (HD)</option>
                                      <option value="480p">480p (SD)</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-zinc-500 text-[10px] mb-0.5">Captions</label>
                                    <select
                                      value={currentOpts.captions ? (currentOpts.style || 'word_red') : 'none'}
                                      onChange={(e) => {
                                        const val = e.target.value
                                        setRenderOptions(prev => ({
                                          ...prev,
                                          [clip.id]: {
                                            ...currentOpts,
                                            captions: val !== 'none',
                                            style: val !== 'none' ? val : 'word_red'
                                          }
                                        }))
                                      }}
                                      className="w-full bg-[#121218] border border-[#262633] rounded px-1.5 py-1 text-zinc-300 focus:outline-none focus:border-purple-500 text-[10px]"
                                    >
                                      <option value="word_red">🔴 1-Word Red</option>
                                      <option value="word_yellow">🟡 1-Word Yellow</option>
                                      <option value="word_white">⚪ 1-Word White</option>
                                      <option value="phrase_yellow">💬 Phrase Yellow</option>
                                      <option value="phrase_purple">💜 Phrase Purple</option>
                                      <option value="phrase_white">🤍 Phrase White</option>
                                      <option value="none">🚫 No Captions</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="grid grid-cols-5 gap-1.5">
                                  <button
                                    onClick={() => triggerClipRender(clip.id)}
                                    className="col-span-4 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors shadow-sm"
                                  >
                                    <Scissors className="h-3.5 w-3.5" />
                                    <span>Render 9:16 Short</span>
                                  </button>
                                  <button
                                    onClick={() => openSocialModal(clip)}
                                    title="View Social Media Kit & Captions"
                                    className="col-span-1 flex items-center justify-center p-1.5 rounded-lg bg-[#16161f] hover:bg-[#1e1e2c] border border-purple-500/30 text-purple-300 transition-colors"
                                  >
                                    <Share2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                            {/* Delete Control Footer */}
                            <div className="flex items-center justify-between text-xs pt-2 border-t border-[#181822]">
                              <span className="text-[10px] text-zinc-500 font-mono">
                                ID: #{clip.id}
                              </span>
                              <button
                                onClick={() => deleteClip(clip.id)}
                                title="Delete clip"
                                className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              {/* 9:16 VERTICAL / 16:9 WIDESCREEN CLIP PREVIEW MODAL */}
              {selectedPreviewClip && (
                <div
                  className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setSelectedPreviewClip(null)
                  }}
                >
                  <div className={`bg-[#111116] border border-[#2b2b38] rounded-2xl ${
                    selectedPreviewClip.aspect_ratio?.includes('16:9') ? 'max-w-3xl' : 'max-w-sm'
                  } w-full overflow-hidden shadow-2xl flex flex-col cursor-default animate-in fade-in zoom-in-95 duration-150`}>
                    <div className="p-3 border-b border-[#22222a] flex items-center justify-between bg-[#14141a] gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <button
                          onClick={() => setSelectedPreviewClip(null)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700/80 hover:border-zinc-500 transition-all shadow group cursor-pointer"
                          title="Back to Shorts (Esc)"
                        >
                          <ArrowLeft className="h-3.5 w-3.5 text-purple-400 group-hover:-translate-x-0.5 transition-transform" />
                          <span>Back</span>
                        </button>
                        <div className="truncate">
                          <h4 className="text-xs font-semibold text-zinc-200 truncate">{selectedPreviewClip.title}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-purple-400 font-mono">
                              {selectedPreviewClip.aspect_ratio?.includes('16:9') ? '16:9 Widescreen Landscape' : '9:16 Vertical Reel'}
                            </span>
                            {selectedPreviewClip.isDeviceStored && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-700/40 font-medium">
                                <Smartphone className="h-2.5 w-2.5" /> Playing from Device Storage
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedPreviewClip(null)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-100 border border-red-800/50 hover:border-red-700 transition-all text-xs font-medium cursor-pointer shadow-sm flex-shrink-0"
                        title="Cancel / Close preview (Esc)"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Cancel</span>
                      </button>
                    </div>
                    {/* Frame: 16:9 vs 9:16 */}
                    <div className={`${
                      selectedPreviewClip.aspect_ratio?.includes('16:9') ? 'aspect-video' : 'aspect-[9/16]'
                    } bg-black flex items-center justify-center relative`}>
                      <video
                        controls
                        autoPlay
                        src={selectedPreviewClip.localBlobUrl || selectedPreviewClip.file_path || ''}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="p-3 border-t border-[#22222a] bg-[#14141a] flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => setSelectedPreviewClip(null)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-medium border border-zinc-700 transition-colors cursor-pointer"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                          <span>Back</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditorClip(selectedPreviewClip)
                            setSelectedPreviewClip(null)
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                        >
                          <Scissors className="h-3.5 w-3.5" />
                          <span>🎬 Edit in Master Editor</span>
                        </button>
                        <a
                          href={selectedPreviewClip.localBlobUrl || `/api/clips/${selectedPreviewClip.id}/download`}
                          download={`${selectedPreviewClip.title}.mp4`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors shadow"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download MP4</span>
                        </a>
                      </div>
                      <span className="text-[10px] text-zinc-500 text-center">
                        Press <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">Esc</kbd> or click outside to cancel
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {/* SOCIAL MEDIA POST KIT & HASHTAGS MODAL */}
              {socialModalClip && (
                <div
                  className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setSocialModalClip(null)
                  }}
                >
                  <div className="bg-[#111116] border border-[#2c2c3a] rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl cursor-default">
                    {/* Modal Header */}
                    <div className="p-4 border-b border-[#22222a] flex items-center justify-between bg-[#14141a] gap-3">
                      <div className="flex items-center gap-3 truncate">
                        <button
                          onClick={() => setSocialModalClip(null)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700/80 hover:border-zinc-500 transition-all shadow group cursor-pointer"
                          title="Back to Shorts (Esc)"
                        >
                          <ArrowLeft className="h-4 w-4 text-purple-400 group-hover:-translate-x-0.5 transition-transform" />
                          <span>Back</span>
                        </button>
                        <div className="h-9 w-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 flex-shrink-0">
                          <Share2 className="h-5 w-5" />
                        </div>
                        <div className="truncate">
                          <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                            <span>Social Media Post Kit</span>
                            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/50">
                              {socialMetadata?.source === 'gemini_ai' ? '✨ Gemini AI' : '⚡ Local NLP (Offline)'}
                            </span>
                          </h4>
                          <p className="text-xs text-zinc-400 truncate max-w-md">{socialModalClip.title}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSocialModalClip(null)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-100 border border-red-800/50 hover:border-red-700 transition-all text-xs font-medium cursor-pointer shadow-sm flex-shrink-0"
                        title="Cancel / Close (Esc)"
                      >
                        <X className="h-4 w-4" />
                        <span>Cancel</span>
                      </button>
                    </div>
                    {/* Modal Content */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5">
                      {isLoadingMetadata && (
                        <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400">
                          <Loader2 className="h-7 w-7 animate-spin text-purple-400" />
                          <span className="text-xs">Generating viral captions, titles & hashtags...</span>
                        </div>
                      )}
                      {!isLoadingMetadata && socialMetadata && (
                        <>
                          {/* Platform Selector Tabs: YouTube, TikTok, Instagram, Facebook, X */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1.5 rounded-xl bg-[#0a0a0e] border border-[#22222c]">
                            <button
                              onClick={() => setActivePlatformTab('youtube')}
                              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                activePlatformTab === 'youtube'
                                  ? 'bg-red-950/60 text-red-300 border border-red-800/80 shadow-md'
                                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                              }`}
                            >
                              <YouTubeIcon className="h-3.5 w-3.5 text-red-500" />
                              <span>YouTube</span>
                            </button>
                            <button
                              onClick={() => setActivePlatformTab('tiktok')}
                              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                activePlatformTab === 'tiktok'
                                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/80 shadow-md'
                                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                              }`}
                            >
                              <TikTokIcon className="h-3.5 w-3.5 text-cyan-400" />
                              <span>TikTok</span>
                            </button>
                            <button
                              onClick={() => setActivePlatformTab('instagram')}
                              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                activePlatformTab === 'instagram'
                                  ? 'bg-pink-950/60 text-pink-300 border border-pink-800/80 shadow-md'
                                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                              }`}
                            >
                              <InstagramIcon className="h-3.5 w-3.5 text-pink-400" />
                              <span>Reels</span>
                            </button>
                            <button
                              onClick={() => setActivePlatformTab('facebook')}
                              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                activePlatformTab === 'facebook'
                                  ? 'bg-blue-950/60 text-blue-300 border border-blue-800/80 shadow-md'
                                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                              }`}
                            >
                              <FacebookIcon className="h-3.5 w-3.5 text-blue-400" />
                              <span>Facebook</span>
                            </button>
                            <button
                              onClick={() => setActivePlatformTab('x')}
                              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                activePlatformTab === 'x'
                                  ? 'bg-zinc-800 text-white border border-zinc-600 shadow-md'
                                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                              }`}
                            >
                              <XTwitterIcon className="h-3.5 w-3.5 text-zinc-200" />
                              <span>X (Twitter)</span>
                            </button>
                          </div>
                          {/* Quick Master Copy Button */}
                          {(() => {
                            const cur = socialMetadata.platforms[activePlatformTab] || {
                              name: activePlatformTab.toUpperCase(),
                              title: socialModalClip?.title || '',
                              description: socialMetadata.hashtags_string || ''
                            }
                            const fullPost = `${cur.title}\n\n${cur.description}`
                            const isCopied = copiedKey === `full_${activePlatformTab}`
                            return (
                              <button
                                onClick={() => copyToClipboard(fullPost, `full_${activePlatformTab}`)}
                                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
                              >
                                {isCopied ? (
                                  <>
                                    <CheckCheck className="h-4 w-4" />
                                    <span>Copied Entire Post to Clipboard!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-4 w-4" />
                                    <span>Copy Complete {cur.name} Post (Title + Caption + Tags)</span>
                                  </>
                                )}
                              </button>
                            )
                          })()}
                          {/* Post Title Field */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-zinc-400 font-medium">Post Title</span>
                              <button
                                onClick={() => {
                                  const t = socialMetadata.platforms[activePlatformTab]?.title || socialModalClip.title
                                  copyToClipboard(t, `title_${activePlatformTab}`)
                                }}
                                className="text-purple-400 hover:text-purple-300 text-[11px] flex items-center gap-1 font-medium"
                              >
                                {copiedKey === `title_${activePlatformTab}` ? (
                                  <>
                                    <CheckCheck className="h-3 w-3 text-emerald-400" />
                                    <span className="text-emerald-400">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    <span>Copy Title</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="p-3 rounded-lg bg-[#0d0d12] border border-[#23232c] text-xs font-medium text-zinc-100 select-text">
                              {socialMetadata.platforms[activePlatformTab]?.title || socialModalClip.title}
                            </div>
                          </div>
                          {/* Post Caption / Description Field */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-zinc-400 font-medium">Caption & Description</span>
                              <button
                                onClick={() => {
                                  const d = socialMetadata.platforms[activePlatformTab]?.description || socialMetadata.hashtags_string
                                  copyToClipboard(d, `desc_${activePlatformTab}`)
                                }}
                                className="text-purple-400 hover:text-purple-300 text-[11px] flex items-center gap-1 font-medium"
                              >
                                {copiedKey === `desc_${activePlatformTab}` ? (
                                  <>
                                    <CheckCheck className="h-3 w-3 text-emerald-400" />
                                    <span className="text-emerald-400">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    <span>Copy Caption</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="p-3.5 rounded-lg bg-[#0d0d12] border border-[#23232c] text-xs text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed select-text">
                              {socialMetadata.platforms[activePlatformTab]?.description || socialMetadata.hashtags_string}
                            </div>
                          </div>
                          {/* Hashtag Cloud */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-zinc-400 font-medium flex items-center gap-1">
                                <Hash className="h-3.5 w-3.5 text-purple-400" />
                                <span>Trending Tags ({socialMetadata.hashtags.length})</span>
                              </span>
                              <button
                                onClick={() =>
                                  copyToClipboard(socialMetadata.hashtags_string, 'tags_all')
                                }
                                className="text-purple-400 hover:text-purple-300 text-[11px] flex items-center gap-1 font-medium"
                              >
                                {copiedKey === 'tags_all' ? (
                                  <>
                                    <CheckCheck className="h-3 w-3 text-emerald-400" />
                                    <span className="text-emerald-400">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    <span>Copy All Tags</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-[#0d0d12] border border-[#23232c]">
                              {socialMetadata.hashtags.map((tag, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => copyToClipboard(tag, `tag_${idx}`)}
                                  className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-purple-950/40 text-purple-300 border border-purple-800/40 hover:bg-purple-900/50 hover:text-white transition-colors"
                                >
                                  {copiedKey === `tag_${idx}` ? '✓ Copied' : tag}
                                </button>
                              ))}
                            </div>
                          </div>
                          {/* Alternative Hook Titles */}
                          <div className="space-y-2">
                            <span className="text-xs text-zinc-400 font-medium block">
                              Alternative Hook Title Angles (A/B Testing)
                            </span>
                            <div className="space-y-1.5">
                              {socialMetadata.title_variations.map((titleVar, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#0d0d12] border border-[#23232c] text-xs hover:border-purple-500/30 transition-colors"
                                >
                                  <span className="text-zinc-200 select-text mr-2">{titleVar}</span>
                                  <button
                                    onClick={() => copyToClipboard(titleVar, `title_var_${idx}`)}
                                    className="text-purple-400 hover:text-purple-300 p-1 shrink-0"
                                  >
                                    {copiedKey === `title_var_${idx}` ? (
                                      <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* TAB 4: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* API Key Form */}
              <div className="p-6 rounded-xl border border-[#23232c] bg-[#121217]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white">Optional AI Key (Gemini API)</h3>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/50">
                    Optional
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mb-4">
                  PRUNE MASTER AI runs 100% locally with rule-based highlight picking. If you provide an optional Gemini API key, it will use LLM semantic scoring for even punchier titles and highlight selection.
                </p>
                <form onSubmit={saveSettings} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Gemini API Key
                    </label>
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      className="w-full bg-[#0c0c10] border border-[#2d2d38] rounded-lg px-3.5 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors"
                    >
                      Save Key
                    </button>
                    {saveSuccess && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Saved locally in browser
                      </span>
                    )}
                  </div>
                </form>
              </div>
              {/* Diagnostic Box */}
              <div className="p-6 rounded-xl border border-[#23232c] bg-[#121217]">
                <h3 className="text-sm font-semibold text-white mb-4">Environment Diagnostics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-lg bg-[#0d0d11] border border-[#22222a]">
                    <span className="text-zinc-500 block mb-1">Backend Version</span>
                    <span className="font-mono text-zinc-200">{health?.version ?? 'Checking...'}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#0d0d11] border border-[#22222a]">
                    <span className="text-zinc-500 block mb-1">Local Data Folder</span>
                    <span className="font-mono text-zinc-200 break-all">{health?.data_directory ?? 'Checking...'}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#0d0d11] border border-[#22222a]">
                    <span className="text-zinc-500 block mb-1">Whisper Engine</span>
                    <span className="font-mono text-purple-400">faster-whisper (CTranslate2 int8 CPU)</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#0d0d11] border border-[#22222a]">
                    <span className="text-zinc-500 block mb-1">Render Engine</span>
                    <span className="font-mono text-emerald-400">FFmpeg (9:16 Blur + ASS Subtitles)</span>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-[#262630] bg-[#101015] flex items-start gap-3">
                <Info className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-400 leading-relaxed">
                  <strong className="text-zinc-200 font-semibold block mb-0.5">Zero Data Leak Guarantee:</strong>
                  Your media files remain entirely on this machine inside the project's local <code className="text-purple-300">data/</code> directory. Original videos are strictly read-only and never modified.
                </div>
              </div>
            </div>
          )}
          {/* TAB 5: DIRECTOR CONSOLE & PERMISSIONS */}
          {activeTab === 'director' && currentUser?.role === 'director' && (
            <div className="space-y-6">
              {/* Director Header Card */}
              <div className="p-6 rounded-2xl border border-purple-500/30 bg-gradient-to-b from-[#161224] to-[#0e0e14] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-semibold mb-3">
                      <Crown className="h-3.5 w-3.5 text-amber-400" />
                      <span>DIRECTOR MASTER CONSOLE</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1.5 flex items-center gap-2 flex-wrap">
                      <span>Welcome, Director Etherus</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-semibold">
                        adeyemialex944@gmail.com
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                      You are the studio Director. You hold complete administrative authority over user sign-ups and permissions. New accounts remain locked in the pending queue until you grant them access to their isolated personal workspace.
                    </p>
                  </div>
                  <button
                    onClick={() => loadDirectorUsers()}
                    disabled={isLoadingDirectorUsers}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all cursor-pointer self-start sm:self-auto shrink-0"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingDirectorUsers ? 'animate-spin' : ''}`} />
                    <span>Refresh Users</span>
                  </button>
                </div>
              </div>
              {/* Action Message Alert */}
              {directorActionMsg && (
                <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-200 text-xs flex items-center gap-3 shadow-lg">
                  <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
                  <span className="font-medium">{directorActionMsg}</span>
                </div>
              )}
              {/* Pending Approvals Alert Banner */}
              {pendingUsersCount > 0 && (
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/50 text-amber-200 text-xs flex items-center justify-between gap-4 shadow-lg ring-1 ring-amber-500/30">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 animate-bounce" />
                    <div>
                      <strong className="font-semibold text-amber-100 block">
                        Action Required: {pendingUsersCount} Pending Access {pendingUsersCount === 1 ? 'Request' : 'Requests'}
                      </strong>
                      <span className="text-amber-300/80">
                        New creators are waiting for your approval. Approve them below so they can start uploading videos and mining shorts.
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {/* PLATFORM MONETIZATION & SUBSCRIPTION MASTER SWITCH CARD */}
              <div className={`p-6 rounded-2xl border transition-all duration-300 shadow-xl ${
                monetizationEnabled
                  ? 'border-amber-500/50 bg-gradient-to-r from-[#18120e] via-[#121218] to-[#1a1224]'
                  : 'border-emerald-500/50 bg-gradient-to-r from-[#0c1a14] via-[#0f1422] to-[#131224]'
              }`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${
                        monetizationEnabled
                          ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                          : 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                      }`}>
                        <Power className="h-3.5 w-3.5" />
                        <span>{monetizationEnabled ? 'MONETIZATION ENFORCED ($0 / $2.50 / $5)' : '100% FREE LAUNCH MODE ACTIVE'}</span>
                      </div>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-purple-950/60 border border-purple-700/50 text-purple-300 font-mono">
                        Director Master Switch
                      </span>
                    </div>
                    <h4 className="text-lg font-black text-white flex items-center gap-2">
                      <DollarSign className={`h-5 w-5 ${monetizationEnabled ? 'text-amber-400' : 'text-emerald-400'}`} />
                      <span>Platform Monetization & Paywall Master Switch</span>
                    </h4>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {monetizationEnabled ? (
                        <>
                          The 10-trial limit and subscription paywall are currently <strong className="text-amber-300">STRICTLY ENFORCED</strong>. Unpaid creators and guests will be prompted to upgrade once they reach 10 renders.
                        </>
                      ) : (
                        <>
                          Monetization is currently <strong className="text-emerald-400 font-bold">DISABLED (Free Launch Mode)</strong>. All creators and guests enjoy 100% free, unlimited 4K renders and full Master Editor tools with zero paywalls. This builds trust and community adoption!
                        </>
                      )}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className={`p-3 rounded-xl border text-xs transition-colors ${
                        !monetizationEnabled
                          ? 'border-emerald-500/60 bg-emerald-950/40 text-emerald-200 shadow-md'
                          : 'border-zinc-800 bg-[#0c0d15] text-zinc-400'
                      }`}>
                        <div className="font-bold flex items-center gap-1.5 mb-1">
                          <CheckCircle2 className={`h-3.5 w-3.5 ${!monetizationEnabled ? 'text-emerald-400' : 'text-zinc-600'}`} />
                          <span>Free Launch Mode (Current)</span>
                        </div>
                        <p className="text-[11px] leading-snug">Unlimited exports for all users. Builds rapid trust & virality.</p>
                      </div>
                      <div className={`p-3 rounded-xl border text-xs transition-colors ${
                        monetizationEnabled
                          ? 'border-amber-500/60 bg-amber-950/40 text-amber-200 shadow-md'
                          : 'border-zinc-800 bg-[#0c0d15] text-zinc-400'
                      }`}>
                        <div className="font-bold flex items-center gap-1.5 mb-1">
                          <Crown className={`h-3.5 w-3.5 ${monetizationEnabled ? 'text-amber-400' : 'text-zinc-600'}`} />
                          <span>Monetization Active</span>
                        </div>
                        <p className="text-[11px] leading-snug">10-trial limit + $2.50 / $5 (₦3,750 / ₦7,500) pricing paywall.</p>
                      </div>
                    </div>
                  </div>
                  {/* Master Toggle Button */}
                  <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
                    <button
                      type="button"
                      disabled={isTogglingMonetization}
                      onClick={() => handleToggleMonetization(!monetizationEnabled)}
                      className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-xl transition-all cursor-pointer ${
                        monetizationEnabled
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/40 hover:scale-[1.02]'
                          : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-900/40 hover:scale-[1.02]'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isTogglingMonetization ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Updating Switch...</span>
                        </>
                      ) : monetizationEnabled ? (
                        <>
                          <ToggleLeft className="h-6 w-6" />
                          <span>Switch to 100% Free Mode</span>
                        </>
                      ) : (
                        <>
                          <ToggleRight className="h-6 w-6" />
                          <span>Activate Monetization</span>
                        </>
                      )}
                    </button>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      Current: {monetizationEnabled ? '🟡 Monetized ($5 Max)' : '🟢 Free Launch (Zero Paywalls)'}
                    </span>
                  </div>
                </div>
              </div>
              {/* Director Stats Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Overall Shorts Cut by All Users */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/40 to-[#121217] border border-purple-500/50 shadow-lg flex items-center justify-between">
                  <div>
                    <span className="text-purple-300 text-xs font-semibold block mb-1">Overall Shorts Cut (All Users)</span>
                    <span className="text-3xl font-extrabold text-white">{stats?.clips || 0}</span>
                    <span className="text-[10px] text-purple-300/70 block mt-0.5">Total across all creators & Director</span>
                  </div>
                  <div className="h-11 w-11 rounded-xl bg-purple-600/25 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-md">
                    <Scissors className="h-5 w-5" />
                  </div>
                </div>
                {/* 2. Director's Personal Shorts Mined */}
                <div className="p-4 rounded-xl bg-[#121217] border border-[#23232c] flex items-center justify-between">
                  <div>
                    <span className="text-amber-400 text-xs font-semibold block mb-1">Your Mined Shorts (Director)</span>
                    <span className="text-3xl font-extrabold text-amber-300">
                      {stats?.user_clips ?? (directorUsers.find(u => u.role === 'director')?.clip_count || 0)}
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Mined by @{currentUser?.username || 'Etherus'}</span>
                  </div>
                  <div className="h-11 w-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
                    <Crown className="h-5 w-5" />
                  </div>
                </div>
                {/* 3. Team & Registered Creators */}
                <div className="p-4 rounded-xl bg-[#121217] border border-[#23232c] flex items-center justify-between">
                  <div>
                    <span className="text-zinc-400 text-xs block mb-1">Team & Registered Creators</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white">{directorUsers.length}</span>
                      {pendingUsersCount > 0 && (
                        <span className="text-xs text-amber-400 font-semibold font-mono">({pendingUsersCount} pending)</span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">Total registered accounts</span>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                {/* 4. Total System Videos */}
                <div className="p-4 rounded-xl bg-[#121217] border border-[#23232c] flex items-center justify-between">
                  <div>
                    <span className="text-zinc-400 text-xs block mb-1">Total System Videos</span>
                    <span className="text-2xl font-bold text-zinc-200">{stats?.videos || 0}</span>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">Source files in database</span>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
                    <Film className="h-5 w-5" />
                  </div>
                </div>
              </div>
              {/* SECTION 1: PENDING ACCESS APPROVAL QUEUE */}
              <div className="p-6 rounded-2xl border border-[#23232c] bg-[#121217] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-amber-400" />
                      <span>Pending Access Approval Queue</span>
                      {pendingUsersCount > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                          {pendingUsersCount} awaiting
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      People who have submitted a sign-up request. You decide who gains entry to the studio.
                    </p>
                  </div>
                </div>
                {directorUsers.filter(u => u.status === 'pending').length === 0 ? (
                  <div className="py-8 px-4 rounded-xl bg-[#0d0d12] border border-[#202028] text-center space-y-2">
                    <div className="h-12 w-12 rounded-full bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <h5 className="text-sm font-semibold text-zinc-200">No Pending Requests</h5>
                    <p className="text-xs text-zinc-500 max-w-md mx-auto">
                      All registered creators have been processed. When someone creates an account, their request will appear here for one-click approval.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {directorUsers.filter(u => u.status === 'pending').map(user => (
                      <div
                        key={user.id}
                        className="p-4 rounded-xl bg-[#0e0e13] border border-amber-500/30 hover:border-amber-500/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-md">
                            {user.username[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-white">{user.full_name || user.username}</span>
                              <span className="text-xs text-zinc-400 font-mono">@{user.username}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60 font-medium">
                                ⏳ Pending Approval
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-zinc-500" />
                                <span className="text-zinc-300 select-text">{user.email}</span>
                              </span>
                              <span>•</span>
                              <span>Signed up: {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => approveUser(user.id, user.username)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>Approve Access</span>
                          </button>
                          <button
                            onClick={() => rejectUser(user.id, user.username)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-rose-950/60 text-zinc-300 hover:text-rose-300 border border-zinc-700 hover:border-rose-800/60 text-xs font-medium transition-all cursor-pointer"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            <span>Decline</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* SECTION: DEDICATED VIP ACCESS & UNLIMITED QUOTA CONTROL */}
              <div className="p-6 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/30 via-[#181324] to-[#121217] space-y-4 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <Crown className="h-5 w-5 text-amber-400" />
                      <span>VIP Access & Quota Control Space</span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase tracking-wider">
                        Director Authority
                      </span>
                    </h4>
                    <p className="text-xs text-zinc-300 mt-1 max-w-2xl leading-relaxed">
                      Give people unlimited access directly from your own end without payment. Enter any creator's email, username, or client IP address below to unlock unlimited 4K renders, no watermark, and highest Gemini Pro models.
                    </p>
                  </div>
                </div>
                {/* Quick Grant Input Box */}
                <div className="p-4 rounded-xl bg-[#0d0d14]/90 border border-[#2b253b] flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 w-full">
                    <label className="text-[11px] text-amber-300 font-semibold mb-1 block">
                      Grant Unlimited VIP by Email, Username, or Client IP:
                    </label>
                    <input
                      type="text"
                      value={vipIdentifierInput}
                      onChange={(e) => setVipIdentifierInput(e.target.value)}
                      placeholder="e.g. creator@gmail.com, alex_reels, or 102.89.45.12"
                      className="w-full bg-[#14141f] border border-zinc-700 focus:border-amber-400 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none font-mono"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleGrantVipByIdentifier() }}
                    />
                  </div>
                  <button
                    onClick={handleGrantVipByIdentifier}
                    disabled={isGrantingVip || !vipIdentifierInput.trim()}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold text-xs shadow-lg shadow-amber-900/30 flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                  >
                    <Crown className="h-4 w-4 text-black fill-black" />
                    <span>{isGrantingVip ? 'Granting...' : '👑 Grant Unlimited Access Instantly'}</span>
                  </button>
                </div>
              </div>
              {/* SECTION 2: APPROVED CREATORS & ALL USERS TABLE */}
              <div className="p-6 rounded-2xl border border-[#23232c] bg-[#121217] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-400" />
                      <span>Studio Team & Creator Accounts</span>
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Overview of all registered users, VIP unlimited quota status, IP addresses, and access permissions.
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#23232c] text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3">User</th>
                        <th className="py-3 px-3">Email</th>
                        <th className="py-3 px-3">Role</th>
                        <th className="py-3 px-3">VIP Tier & Quota</th>
                        <th className="py-3 px-3">Client IP</th>
                        <th className="py-3 px-3">Gemini Model</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Shorts Mined</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e1e26]">
                      {directorUsers.map(user => {
                        const isSelfDirector = user.id === currentUser.id
                        const isUnlimitedVip = user.role === 'director' || user.is_pro
                        return (
                          <tr key={user.id} className="hover:bg-[#16161e] transition-colors">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                  user.role === 'director'
                                    ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-sm ring-1 ring-amber-400/50'
                                    : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                                }`}>
                                  {user.role === 'director' ? <Crown className="h-3.5 w-3.5 text-amber-300" /> : user.username[0]?.toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-zinc-100 flex items-center gap-1.5">
                                    <span>{user.full_name || user.username}</span>
                                    {isSelfDirector && (
                                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-800/50">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-zinc-500 text-[11px] font-mono">@{user.username}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono text-zinc-300 select-text">
                              {user.email}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                                user.role === 'director'
                                  ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                                  : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                              }`}>
                                {user.role === 'director' ? '👑 Director' : '👤 Creator'}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              {isUnlimitedVip ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold shadow-sm">
                                  <Crown className="h-3 w-3 text-amber-400" />
                                  <span>UNLIMITED VIP</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-mono">
                                  <span>✨ {user.trial_credits ?? 10} Credits</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono text-zinc-400 text-[11px] select-text">
                              {user.last_ip || user.registration_ip || '127.0.0.1'}
                            </td>
                            <td className="py-3 px-3 font-mono text-purple-300 text-[10px]">
                              {user.gemini_model || 'gemini-2.5-pro'}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                user.status === 'approved'
                                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                                  : user.status === 'pending'
                                  ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50'
                                  : 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                  user.status === 'approved' ? 'bg-emerald-400' : user.status === 'pending' ? 'bg-amber-400 animate-pulse' : 'bg-rose-400'
                                }`}></span>
                                <span className="capitalize">{user.status}</span>
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <div className="px-2 py-0.5 rounded-lg bg-purple-950/70 border border-purple-800/60 flex items-center gap-1 shadow-sm">
                                  <Scissors className="h-3 w-3 text-purple-400" />
                                  <span className="font-mono font-bold text-xs text-purple-200">{user.clip_count ?? 0}</span>
                                </div>
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  ({user.video_count ?? 0} vids)
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right">
                              {isSelfDirector ? (
                                <span className="text-[11px] text-amber-400 font-bold">Director</span>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  {/* VIP Grant / Revoke Button */}
                                  {isUnlimitedVip ? (
                                    <button
                                      onClick={() => revokeUserUnlimitedVip(user.id, user.username)}
                                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-[10px] font-medium transition-colors cursor-pointer"
                                      title="Revoke unlimited VIP access"
                                    >
                                      Revoke VIP
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => grantUserUnlimitedVip(user.id, user.username)}
                                      className="px-2.5 py-1 rounded bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold text-[10px] shadow-sm transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                                      title="Grant unlimited VIP access from your end"
                                    >
                                      <Crown className="h-3 w-3 fill-black text-black" />
                                      <span>Grant Unlimited</span>
                                    </button>
                                  )}
                                  {/* Reset Password Button */}
                                  <button
                                    onClick={() => handleDirectorResetPassword(user.id, user.username)}
                                    className="px-2 py-1 rounded bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 hover:text-purple-200 border border-purple-800/70 text-[10px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                                    title={`Reset password for @${user.username}`}
                                  >
                                    <Key className="h-3 w-3 text-purple-400" />
                                    <span>Reset Pass</span>
                                  </button>
                                  {user.status === 'approved' ? (
                                    <button
                                      onClick={() => rejectUser(user.id, user.username)}
                                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-300 border border-zinc-700 hover:border-rose-800 text-[10px] transition-colors cursor-pointer"
                                      title="Suspend user's access"
                                    >
                                      Suspend
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => approveUser(user.id, user.username)}
                                      className="px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800 text-[10px] transition-colors cursor-pointer"
                                      title="Grant access"
                                    >
                                      Approve
                                    </button>
                                  )}
                                  <button
                                    onClick={() => deleteUser(user.id, user.username)}
                                    className="p-1 rounded bg-zinc-800 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 border border-zinc-700 hover:border-rose-800 transition-colors cursor-pointer"
                                    title="Permanently remove user"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* SECTION 3: INVITE & PUBLIC ACCESS LINK */}
              <div className="p-6 rounded-2xl border border-purple-500/30 bg-gradient-to-b from-[#13131b] to-[#0c0c10] space-y-4 shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Shareable Access Links for Creators & Clients</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-semibold">
                          Live Active
                        </span>
                      </h4>
                      <p className="text-xs text-zinc-400">
                        Send these links to others so they can sign up. <span className="text-rose-400 font-medium">Do not send "localhost"</span> because localhost only works on this computer.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  {/* Option 1: Worldwide Public Link */}
                  <div className="p-4 rounded-xl bg-[#09090d] border border-purple-500/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
                        <Globe className="h-3.5 w-3.5 text-purple-400" />
                        <span>Public Link (Worldwide / Anywhere)</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 font-medium">
                        Phone, Mobile 4G/5G, Remote
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-purple-200 font-mono select-all truncate bg-purple-950/50 px-2.5 py-1.5 rounded-lg border border-purple-800/50 flex-1">
                        https://voter-accurate-buffing.ngrok-free.dev
                      </code>
                      <button
                        onClick={() => copyToClipboard('https://voter-accurate-buffing.ngrok-free.dev', 'public_tunnel_url')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors cursor-pointer shrink-0 shadow-sm"
                      >
                        {copiedKey === 'public_tunnel_url' ? (
                          <>
                            <CheckCheck className="h-3.5 w-3.5 text-emerald-300" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      Works worldwide on cellular data or outside networks. (Note: Cloudflare has a 100s timeout on uploads; for large files, use local Wi-Fi or YouTube URL).
                    </p>
                  </div>
                  {/* Option 2: Local Wi-Fi Network Link */}
                  <div className="p-4 rounded-xl bg-[#09090d] border border-emerald-500/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                        <Radio className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Local Wi-Fi Link (Best & Fastest for Same Network)</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-medium">
                        Instant • No 524 Timeout
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-emerald-200 font-mono select-all truncate bg-emerald-950/50 px-2.5 py-1.5 rounded-lg border border-emerald-800/50 flex-1">
                        http://192.168.0.131:5173
                      </code>
                      <button
                        onClick={() => copyToClipboard('http://192.168.0.131:5173', 'wifi_url')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors cursor-pointer shrink-0 shadow-sm"
                      >
                        {copiedKey === 'wifi_url' ? (
                          <>
                            <CheckCheck className="h-3.5 w-3.5 text-white" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-normal">
                      <strong className="text-emerald-400">Recommended when sharing with anyone in your house or office:</strong> direct local connection, 100x faster, no Cloudflare timeout, and never throws status 524!
                    </p>
                  </div>
                </div>
                {/* Why localhost fails explanation */}
                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200/90 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-amber-100 font-semibold">Why didn't "localhost" work for the other person?</strong>
                    <span className="block text-[11px] text-amber-300/80 mt-0.5">
                      "localhost" means "this computer itself". When another person opens "localhost" on their phone or laptop, their device searches for Prune Master on their own phone, which gives <em>"This site can't be reached"</em>. Send them the <strong>Public Link</strong> or <strong>Wi-Fi Link</strong> above instead!
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-3 rounded-lg bg-[#0e0e14] border border-[#1f1f2a]">
                    <span className="font-semibold text-purple-300 block mb-1">1. Send Link</span>
                    <p className="text-zinc-400 text-[11px] leading-relaxed">
                      Send the Public Link to your editor, team member, or client on WhatsApp, email, or Slack.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#0e0e14] border border-[#1f1f2a]">
                    <span className="font-semibold text-purple-300 block mb-1">2. They Request Access</span>
                    <p className="text-zinc-400 text-[11px] leading-relaxed">
                      They fill out the "Request Access" form. Their account is automatically set to "Pending".
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#0e0e14] border border-[#1f1f2a]">
                    <span className="font-semibold text-purple-300 block mb-1">3. You Approve</span>
                    <p className="text-zinc-400 text-[11px] leading-relaxed">
                      You click "Approve Access" in your Director Console above. They can now log in to their private workspace!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* ========================================================================= */}
          {/* ABOUT PRUNE MASTER AI SECTION (DOWN SIDE / FOOTER) */}
          {/* ========================================================================= */}
          <footer className="mt-16 pt-10 border-t border-[#22222e] pb-12 space-y-6">
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-[#13131a] to-[#0c0c10] border border-[#232332] shadow-2xl space-y-6">
              {/* Header Banner */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#20202c]">
                <div className="flex items-center space-x-3.5">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                    <Scissors className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white tracking-wide flex items-center gap-2">
                      PRUNE MASTER AI
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60 font-mono">
                        v0.1.0 Offline Studio
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Autonomous Local AI Video Repurposing & Shorts Mining Platform
                    </p>
                  </div>
                </div>
                {/* System & Chrome Badges */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-800/50 text-xs font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    100% Offline Active
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/40 text-purple-300 border border-purple-800/50 text-xs font-medium">
                    <Globe className="h-3.5 w-3.5" />
                    Chrome Ready
                  </span>
                  <a
                    href="http://localhost:5173"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium transition-colors shadow-sm"
                  >
                    <span>Open in Chrome</span>
                    <ChevronRight className="h-3 w-3 text-purple-400" />
                  </a>
                </div>
              </div>
              {/* Comprehensive Description */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200 mb-1">
                    About the Application
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-4xl">
                    <strong>Prune Master AI</strong> is a standalone, offline-first video repurposing studio created to automate the process of converting lengthy recordings (church sermons, podcasts, webinars, keynote speeches, seminars, and interviews) into viral, high-retention short reels for <strong>TikTok, Instagram Reels, YouTube Shorts (9:16)</strong> and widescreen presentations <strong>(16:9)</strong>.
                  </p>
                </div>
                {/* 4 Feature Pillars Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                  <div className="p-4 rounded-xl bg-[#0a0a0e] border border-[#20202a] space-y-2">
                    <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold">
                      <Sparkles className="h-4 w-4" />
                      <span>AI Highlight Mining</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      Scans the full transcript, calculates viral pacing and speaker energy scores, and pinpoints top quotes and nuggets without manual timeline scrubbing.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0a0a0e] border border-[#20202a] space-y-2">
                    <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
                      <Type className="h-4 w-4" />
                      <span>Word-by-Word Subtitles</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      Renders dynamic kinetic subtitles one word at a time in bold red with white outline, yellow pop, or crisp white to maximize watch retention.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0a0a0e] border border-[#20202a] space-y-2">
                    <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold">
                      <Layers className="h-4 w-4" />
                      <span>Dual 9:16 & 16:9 Formats</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      Export in 9:16 smartphone vertical (with smart speaker face-tracking and blurred background) or 16:9 widescreen landscape for YouTube.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0a0a0e] border border-[#20202a] space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                      <HardDrive className="h-4 w-4" />
                      <span>100% Offline & Private</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      Powered locally by faster-whisper and hardware-accelerated FFmpeg. Zero subscription fees, zero upload waiting, and 100% data privacy.
                    </p>
                  </div>
                </div>
              </div>
              {/* Desktop Shortcut & Launch Details Footer */}
              <div className="pt-4 border-t border-[#20202c] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-zinc-400">Desktop Shortcut:</span>
                  <code className="text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40 font-mono text-[11px]">
                    Desktop / Prune Master AI.lnk
                  </code>
                  <span>(Double-click on your desktop anytime to launch directly in Chrome)</span>
                </div>
                <div className="text-[11px] text-zinc-500">
                  © Prune Master AI • Local Windows Edition
                </div>
              </div>
            </div>
          </footer>
        </div>
      </main>
      {/* ========================================================================= */}
      {/* RESTREAM CLIPS & VIRAL MINER DESIGNED AUTHENTICATION STUDIO MODAL */}
      {/* ========================================================================= */}
      {isAuthModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget && currentUser) setIsAuthModalOpen(false)
          }}
        >
          <div className="bg-[#0b0c13] border border-purple-500/30 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col md:flex-row relative animate-in fade-in zoom-in-95 duration-200">
            {/* LEFT / TOP HERO PROMO PANEL (RESTREAM CLIPS VALUE SHOWCASE) */}
            <div className="w-full md:w-5/12 bg-gradient-to-br from-purple-950/70 via-[#121322] to-[#0a0b12] p-8 border-b md:border-b-0 md:border-r border-[#202235] flex flex-col justify-between relative overflow-hidden">
              {/* Ambient Glow */}
              <div className="absolute -top-16 -left-16 w-56 h-56 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 space-y-6">
                {/* Brand */}
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-900/40">
                    <Scissors className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white tracking-wide flex items-center gap-1.5">
                      PRUNE MASTER AI
                      <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-900 text-purple-300 border border-purple-700/60 font-mono">
                        PRO
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">Viral Short-Form Video Studio</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl md:text-2xl font-black text-white leading-tight">
                    Turn 2-Hour Videos into Viral Shorts in 60s
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Automate your speech-to-reel pipeline with local Whisper speech recognition, timeline sector intelligence, and Master Editor transcript editing.
                  </p>
                </div>
                {/* Social Media Support Row */}
                <div className="space-y-2">
                  <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block">
                    Export Ready For:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <PlatformBadge platform="youtube" />
                    <PlatformBadge platform="tiktok" />
                    <PlatformBadge platform="instagram" />
                    <PlatformBadge platform="facebook" />
                    <PlatformBadge platform="x" />
                  </div>
                </div>
                {/* Key Pillars */}
                <div className="space-y-2.5 pt-1 text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Timeline Intelligence (Start to Climax)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Kinetic 1-Word Animated Subtitles</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Master Editor Transcript & Timeline Suite</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>100% Free & Unlimited Local Processing</span>
                  </div>
                </div>
              </div>
              {/* Social Proof Footer */}
              <div className="relative z-10 pt-6 mt-6 border-t border-purple-800/30 text-[11px] text-zinc-400 flex items-center justify-between">
                <span>⭐⭐⭐⭐⭐ 4.9/5 Rating</span>
                <span className="text-purple-300 font-mono font-semibold">500+ Creators</span>
              </div>
            </div>
            {/* RIGHT FORM PANEL (RESTREAMS / VIRAL MINER STYLE AUTH) */}
            <div className="w-full md:w-7/12 p-8 flex flex-col justify-between space-y-6 bg-[#0e0f17]">
              {/* Header with Close */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {authMode === 'login'
                      ? 'Sign In to Prune Master'
                      : authMode === 'register'
                      ? 'Create Creator Workspace'
                      : '🔑 Password Recovery Studio'}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {authMode === 'login'
                      ? 'Access your private videos, edits & mined reels.'
                      : authMode === 'register'
                      ? 'Request your personal studio account. Approved by Director.'
                      : 'Verify your registration name and reset your password securely.'}
                  </p>
                </div>
                {currentUser && (
                  <button
                    onClick={() => setIsAuthModalOpen(false)}
                    className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
              {/* Segmented Mode Switcher */}
              <div className="flex items-center p-1 rounded-xl bg-[#07080d] border border-[#212334]">
                <button
                  onClick={() => {
                    setAuthMode('login')
                    setAuthError(null)
                    setAuthSuccessMsg(null)
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  🔑 Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthMode('register')
                    setAuthError(null)
                    setAuthSuccessMsg(null)
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  ✨ Request Access
                </button>
                <button
                  onClick={() => {
                    setAuthMode('forgot')
                    setAuthError(null)
                    setAuthSuccessMsg(null)
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    authMode === 'forgot'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  🛡️ Recovery
                </button>
              </div>
              {/* Alert Feedback Messages */}
              {authError && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-medium">{authError}</div>
                </div>
              )}
              {authSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-200 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-medium">{authSuccessMsg}</div>
                </div>
              )}
              {/* SIGN IN FORM */}
              {authMode === 'login' && (
                <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
                  {/* Discreet Director Quick-Fill (Only on localhost) */}
                  {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthLoginInput('adeyemialex944@gmail.com')
                        setAuthPasswordInput('Etherus2026!')
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-950/30 via-purple-950/40 to-indigo-950/30 hover:from-amber-900/40 hover:to-indigo-900/40 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                    >
                      <Crown className="h-4 w-4 text-amber-300" />
                      <span>👑 Master Director 1-Click Access (Etherus)</span>
                    </button>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-purple-400" />
                      <span>Email or Username</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="adeyemialex944@gmail.com or username"
                      value={authLoginInput}
                      onChange={(e) => setAuthLoginInput(e.target.value)}
                      className="w-full bg-[#12131f] border border-[#27293d] rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Key className="h-3.5 w-3.5 text-purple-400" />
                        <span>Password / Passcode</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        <span>{showPassword ? 'Hide' : 'Show'}</span>
                      </button>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Enter your passcode"
                        value={authPasswordInput}
                        onChange={(e) => setAuthPasswordInput(e.target.value)}
                        className="w-full bg-[#12131f] border border-[#27293d] rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors font-mono pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot')
                          setAuthError(null)
                          setAuthSuccessMsg(null)
                          if (authLoginInput) setForgotLoginInput(authLoginInput)
                        }}
                        className="text-purple-400 hover:text-purple-300 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                        <span>Forgot password? Recover account</span>
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-purple-900/30 transition-all cursor-pointer transform hover:scale-[1.01]"
                  >
                    {authLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        <span>Enter Workspace Studio</span>
                      </>
                    )}
                  </button>
                </form>
              )}
              {/* REQUEST ACCESS / REGISTER FORM */}
              {authMode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-200 text-xs flex items-start gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <strong className="text-purple-100 font-semibold block">Director Approval:</strong>
                      Your personal workspace will be activated as soon as Director Etherus approves your account.
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                        <UserIcon className="h-3.5 w-3.5 text-zinc-500" />
                        <span>Full Name</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Samuel Ade"
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        className="w-full bg-[#12131f] border border-[#27293d] rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                        <UserIcon className="h-3.5 w-3.5 text-zinc-500" />
                        <span>Username</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. samuel_editor"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        className="w-full bg-[#12131f] border border-[#27293d] rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Email Address</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. samuel@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-[#12131f] border border-[#27293d] rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Key className="h-3.5 w-3.5 text-zinc-500" />
                        <span>Create Password</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer select-none"
                      >
                        {showRegPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        <span>{showRegPassword ? 'Hide' : 'Reveal'}</span>
                      </button>
                    </label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        placeholder="At least 6 characters"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full bg-[#12131f] border border-[#27293d] rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors font-mono pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 cursor-pointer"
                        title={showRegPassword ? "Hide password" : "Show password"}
                      >
                        {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg transition-all cursor-pointer mt-2"
                  >
                    {authLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Submitting request...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4" />
                        <span>Submit Workspace Request</span>
                      </>
                    )}
                  </button>
                </form>
              )}
              {/* FORGOTTEN PASSWORD RECOVERY FORM (MODAL) */}
              {authMode === 'forgot' && (
                <form onSubmit={handleForgotPassword} className="space-y-3.5">
                  <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-200 text-xs flex items-start gap-2.5">
                    <Key className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <strong className="text-purple-100 font-semibold block">Password Recovery Verification:</strong>
                      Enter your registered email or username along with your full name to verify account ownership and set a new password.
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-purple-400" />
                      <span>Registered Email or Username</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. adeyemialex944@gmail.com or username"
                      value={forgotLoginInput}
                      onChange={(e) => setForgotLoginInput(e.target.value)}
                      className="w-full bg-[#12131f] border border-[#27293d] rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                      <UserIcon className="h-3.5 w-3.5 text-purple-400" />
                      <span>Full Name (As Registered)</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Adeyemi"
                      value={forgotFullNameInput}
                      onChange={(e) => setForgotFullNameInput(e.target.value)}
                      className="w-full bg-[#12131f] border border-[#27293d] rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    <span className="text-[10px] text-zinc-500 block mt-0.5">
                      Must match the name you provided when registering.
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5 text-purple-400" />
                          <span>New Password</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowForgotPass(!showForgotPass)}
                          className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer select-none"
                        >
                          {showForgotPass ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          <span>{showForgotPass ? 'Hide' : 'Reveal'}</span>
                        </button>
                      </label>
                      <div className="relative">
                        <input
                          type={showForgotPass ? 'text' : 'password'}
                          required
                          placeholder="Min 6 characters"
                          value={forgotNewPasswordInput}
                          onChange={(e) => setForgotNewPasswordInput(e.target.value)}
                          className="w-full bg-[#12131f] border border-[#27293d] rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors font-mono pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowForgotPass(!showForgotPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 cursor-pointer"
                          title={showForgotPass ? "Hide password" : "Show password"}
                        >
                          {showForgotPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5 text-purple-400" />
                          <span>Confirm Password</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowForgotPass(!showForgotPass)}
                          className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer select-none"
                        >
                          {showForgotPass ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          <span>{showForgotPass ? 'Hide' : 'Reveal'}</span>
                        </button>
                      </label>
                      <div className="relative">
                        <input
                          type={showForgotPass ? 'text' : 'password'}
                          required
                          placeholder="Re-enter password"
                          value={forgotConfirmPasswordInput}
                          onChange={(e) => setForgotConfirmPasswordInput(e.target.value)}
                          className="w-full bg-[#12131f] border border-[#27293d] rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors font-mono pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowForgotPass(!showForgotPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 cursor-pointer"
                          title={showForgotPass ? "Hide password" : "Show password"}
                        >
                          {showForgotPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-purple-900/30 transition-all cursor-pointer transform hover:scale-[1.01]"
                  >
                    {authLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Verifying & Resetting...</span>
                      </>
                    ) : (
                      <>
                        <Key className="h-4 w-4" />
                        <span>Reset Password & Enter Studio</span>
                      </>
                    )}
                  </button>
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login')
                        setAuthError(null)
                        setAuthSuccessMsg(null)
                      }}
                      className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Remember your password? Back to Sign In
                    </button>
                  </div>
                </form>
              )}
              {/* Trust Footer */}
              <div className="pt-2 border-t border-[#1e202e] flex items-center justify-between text-[10px] text-zinc-500">
                <span className="flex items-center gap-1">
                  <Lock className="h-3 w-3 text-purple-400" />
                  <span>256-Bit SSL Encrypted</span>
                </span>
                <span>100% Private Offline Processing</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* CREATOR PROFILE & AI SETTINGS MODAL */}
      {isProfileModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsProfileModalOpen(false)
          }}
        >
          <div className="bg-[#0b0c13] border border-purple-500/40 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#202235] bg-[#0e0f19] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Creator Profile & Settings</span>
                    {currentUser?.role === 'director' && (
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                        👑 Director
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-zinc-400">Profile avatar, IP tracking status & Gemini Pro configuration</p>
                </div>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Profile Toast Notification */}
              {profileToast && (
                <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  profileToast.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                }`}>
                  <span>{profileToast.text}</span>
                  <button onClick={() => setProfileToast(null)} className="font-bold ml-2">×</button>
                </div>
              )}
              {/* IMAGE SECTION IN THE PROFILE */}
              <div className="p-4 rounded-2xl bg-[#12131f] border border-[#23253b] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-purple-400" />
                    <span>Profile Photo / Avatar</span>
                  </span>
                  <span className="text-[10px] text-zinc-400">Custom or AI Presets</span>
                </div>
                <div className="flex items-center gap-4">
                  {/* Current Avatar Preview */}
                  <div className="relative group shrink-0">
                    {profileAvatarUrl ? (
                      <img
                        src={profileAvatarUrl}
                        alt="Profile avatar"
                        loading="lazy"
                        decoding="async"
                        className="h-16 w-16 rounded-2xl object-cover border-2 border-purple-500/70 shadow-lg"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        {currentUser?.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={avatarFileInputRef}
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={handleUploadAvatar}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => avatarFileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition-all disabled:opacity-50"
                      >
                        {isUploadingAvatar ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-3.5 w-3.5" />
                            <span>Upload Photo</span>
                          </>
                        )}
                      </button>
                      {profileAvatarUrl && (
                        <button
                          type="button"
                          onClick={() => setProfileAvatarUrl('')}
                          className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      JPG, PNG, WebP up to 10MB. Or select one of 8 AI creator avatars below:
                    </p>
                  </div>
                </div>
                {/* 8 AI Creator Preset Avatars */}
                <div className="pt-2 border-t border-[#1e202f] space-y-2">
                  <span className="text-[11px] font-semibold text-zinc-300 block">AI Creator Preset Avatars:</span>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {CREATOR_PRESET_AVATARS.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setProfileAvatarUrl(av.url)}
                        className={`p-1 rounded-xl border transition-all cursor-pointer transform hover:scale-105 ${
                          profileAvatarUrl === av.url
                            ? 'bg-purple-950 border-purple-400 ring-2 ring-purple-400/50 shadow'
                            : 'bg-[#0d0e17] border-[#222436] hover:border-zinc-500'
                        }`}
                        title={av.name}
                      >
                        <img src={av.url} alt={av.name} loading="lazy" decoding="async" className="h-9 w-9 rounded-lg mx-auto" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {/* Full Name & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-300 font-semibold block mb-1">Display Name:</label>
                  <input
                    type="text"
                    value={profileFullName}
                    onChange={(e) => setProfileFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-[#12131f] border border-[#27293d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-300 font-semibold block mb-1">Username (Fixed):</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.username || ''}
                    className="w-full bg-[#0d0e17] border border-[#1e202f] rounded-xl px-3 py-2 text-xs text-zinc-400 font-mono"
                  />
                </div>
              </div>
              {/* INTEGRATE GEMINI PRO & MODEL SELECTION */}
              <div className="p-4 rounded-2xl bg-[#12131f] border border-[#23253b] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    <span>Gemini AI Flagship Hook Intelligence</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono font-semibold">
                    {profileGeminiModel}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Prune Master AI uses Google's flagship reasoning models to analyze long sermon and podcast transcripts, extract viral hooks, and score retention potential.
                </p>
                {/* Preferred Model Selector */}
                <div>
                  <label className="text-[11px] text-zinc-300 font-semibold block mb-1">
                    Select Preferred Gemini Model:
                  </label>
                  <select
                    value={profileGeminiModel}
                    onChange={(e) => setProfileGeminiModel(e.target.value)}
                    className="w-full bg-[#0a0a0f] border border-zinc-700 focus:border-purple-500 rounded-xl px-2.5 py-1.5 text-xs text-white font-medium"
                  >
                    <option value="gemini-2.5-pro">⚡ Google Gemini 2.5 Pro (Highest Flagship • Deep Reasoning & Hooks)</option>
                    <option value="gemini-1.5-pro">🧠 Google Gemini 1.5 Pro (Flagship Pro • 1M Context & Retention Scoring)</option>
                    <option value="gemini-2.5-flash">🚀 Google Gemini 2.5 Flash (Next-Gen Fast Pro)</option>
                    <option value="gemini-2.0-flash">⚡ Google Gemini 2.0 Flash (Lightning Fast Sub-Second)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 font-semibold block mb-1 flex items-center justify-between">
                    <span>Personal Gemini API Key (Optional):</span>
                    <button
                      type="button"
                      onClick={() => setShowProfileKey(!showProfileKey)}
                      className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer select-none"
                    >
                      {showProfileKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      <span>{showProfileKey ? 'Hide' : 'Reveal'}</span>
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type={showProfileKey ? 'text' : 'password'}
                      value={profileGeminiKey}
                      onChange={(e) => setProfileGeminiKey(e.target.value)}
                      placeholder="AIzaSy... (Leave empty to use high-speed local Whisper + server key)"
                      className="w-full bg-[#0a0a0f] border border-zinc-700 focus:border-purple-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowProfileKey(!showProfileKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 cursor-pointer"
                      title={showProfileKey ? "Hide key" : "Reveal key"}
                    >
                      {showProfileKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
              {/* IP TRACKING & SECURITY DETAILS */}
              <div className="p-4 rounded-2xl bg-[#12131f] border border-[#23253b] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-cyan-400" />
                    <span>IP Tracking & Network Security</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active Proxy
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-[#0a0a0f] border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block font-sans">Detected Client IP:</span>
                    <span className="text-purple-300 font-bold truncate block">{trialStatus?.client_ip || '127.0.0.1 (Local)'}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#0a0a0f] border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block font-sans">Edge Gateway:</span>
                    <span className="text-zinc-300 block truncate">Cloudflare Tunnel (HTTP/2)</span>
                  </div>
                </div>
              </div>
              {/* TRIAL USAGE & SUBSCRIPTION */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-[#141524] to-pink-950/40 border border-purple-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Crown className="h-3.5 w-3.5 text-amber-400" />
                    <span>Monetization & Trial Usage</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-purple-300">
                    {trialStatus?.monetization_enabled === false
                      ? '🎉 Free Launch (Unlimited)'
                      : currentUser?.role === 'director'
                      ? 'Unlimited Director'
                      : currentUser?.is_pro
                      ? 'Pro Active'
                      : `${trialStatus?.trials_remaining ?? 10} / 10 Free`}
                  </span>
                </div>
                {/* Usage Progress Bar */}
                {trialStatus?.monetization_enabled === false ? (
                  <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/40 text-[11px] text-emerald-300 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>Free Launch Active: Subscriptions disabled for all creators. Unlimited 4K renders!</span>
                  </div>
                ) : currentUser?.role !== 'director' && !currentUser?.is_pro && (
                  <div className="space-y-1">
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden border border-purple-500/30">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300"
                        style={{ width: `${Math.min(100, ((trialStatus?.trial_credits_used ?? 0) / 10) * 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                      <span>{trialStatus?.trial_credits_used ?? 0} renders used</span>
                      <span>{trialStatus?.trials_remaining ?? 10} free remaining</span>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileModalOpen(false)
                    setIsProModalOpen(true)
                  }}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-600 via-purple-600 to-pink-600 hover:from-amber-500 hover:to-pink-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  {currentUser?.role === 'director' || currentUser?.is_pro ? 'View Pro Perks' : '✨ Upgrade to Unlimited 4K Pro'}
                </button>
              </div>
              {/* Save Button */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e202f]">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  {isSavingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>Save Profile</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* UPGRADE TO PRO MODAL (10 TRIAL MONETIZATION) */}
      {isProModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsProModalOpen(false)
          }}
        >
          <div className="bg-[#0b0c13] border border-purple-500/40 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-[#202235] bg-gradient-to-r from-purple-950/80 via-[#101222] to-amber-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-700/60 text-[10px] font-bold mb-1">
                  <Crown className="h-3 w-3 text-amber-300" />
                  <span>MONETIZATION & PRO UPGRADE (MAX $5 / ₦7,500)</span>
                </div>
                <h3 className="text-lg font-black text-white">Supercharge Your Shorts with Prune Master Pro</h3>
                <p className="text-xs text-zinc-400">Unlimited 4K renders, remove watermark, highest Gemini 2.5 Pro reasoning & priority FFmpeg queue.</p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {/* Currency Switcher: USD ($) vs NGN (₦) */}
                <div className="flex items-center p-1 rounded-xl bg-[#0a0a12] border border-zinc-800 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setCurrencyMode('USD')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currencyMode === 'USD'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    🇺🇸 USD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrencyMode('NGN')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currencyMode === 'NGN'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    🇳🇬 Naira (₦)
                  </button>
                </div>
                <button
                  onClick={() => setIsProModalOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Trust-Building Free Launch Mode Alert */}
              {trialStatus?.monetization_enabled === false && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-[#0d2618] to-purple-950/80 border border-emerald-500/50 flex items-start gap-3.5 shadow-lg">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Launch Celebration • Subscriptions Disabled</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">100% Free For All Creators</span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Director Etherus has temporarily switched the entire platform to <strong>100% Free Launch Mode</strong>! Enjoy unlimited 4K exports, full Master Editor timeline tools, smart silence removal, AI voiceovers, and zero credit deductions while you test and create.
                    </p>
                  </div>
                </div>
              )}
              {/* 3 Pricing Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Starter Free */}
                <div className="p-4 rounded-2xl bg-[#12131f] border border-[#23253b] flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-zinc-400 block">Free Creator Tier</span>
                    <div className="text-2xl font-black text-white">
                      {currencyMode === 'USD' ? '$0' : '₦0'} <span className="text-xs text-zinc-500 font-normal">/ 10 renders</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">Test local AI transcription, 9:16 vertical render engine & basic editing.</p>
                    <ul className="space-y-1.5 pt-2 text-[11px] text-zinc-300">
                      <li className="flex items-center gap-1.5">✓ 10 Free Trial Renders</li>
                      <li className="flex items-center gap-1.5">✓ 1080p & 720p Export</li>
                      <li className="flex items-center gap-1.5">✓ Interactive Transcript Edit</li>
                      <li className="flex items-center gap-1.5 text-zinc-500">✗ Watermark Included</li>
                      <li className="flex items-center gap-1.5 text-zinc-500">✗ Standard Queue</li>
                    </ul>
                  </div>
                  <div className="p-2 rounded-xl bg-[#0a0a0f] border border-zinc-800 text-center text-[10px] text-purple-300 font-mono">
                    {trialStatus?.trials_remaining ?? 10} of 10 Renders Left
                  </div>
                </div>
                {/* 2. Creator Starter ($2.50 / ₦3,750) */}
                <div className="p-4 rounded-2xl bg-[#12131f] border border-[#23253b] flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-cyan-400 block">Creator Starter</span>
                    <div className="text-2xl font-black text-white">
                      {currencyMode === 'USD' ? '$2.50' : '₦3,750'} <span className="text-xs text-zinc-500 font-normal">/ month</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">Ideal for growing creators mining weekly podcast & sermon shorts.</p>
                    <ul className="space-y-1.5 pt-2 text-[11px] text-zinc-300">
                      <li className="flex items-center gap-1.5">✓ <strong>50 HD 1080p Renders</strong></li>
                      <li className="flex items-center gap-1.5">✓ <strong>Remove Watermark</strong></li>
                      <li className="flex items-center gap-1.5">✓ Auto-Captions & Subtitle Pops</li>
                      <li className="flex items-center gap-1.5">✓ Master Video Editor Full Suite</li>
                      <li className="flex items-center gap-1.5">✓ Fast AI Highlight Hooks</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => handleActivatePro('Creator Starter')}
                    className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer border border-zinc-700"
                  >
                    Select Starter
                  </button>
                </div>
                {/* 3. Creator Pro (Highlighted - Highest Tier: $5 / ₦7,500) */}
                <div className="p-5 rounded-2xl bg-gradient-to-b from-[#181930] to-[#111224] border-2 border-purple-500 shadow-xl relative flex flex-col justify-between space-y-3">
                  <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-pink-500 text-white text-[10px] font-black uppercase tracking-wider shadow">
                    Highest Flagship Tier
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-amber-300 block flex items-center gap-1">
                      <Crown className="h-3.5 w-3.5 text-amber-400" />
                      <span>Creator Pro (Unlimited)</span>
                    </span>
                    <div className="text-2xl font-black text-white">
                      {currencyMode === 'USD' ? '$5.00' : '₦7,500'} <span className="text-xs text-zinc-400 font-normal">/ month</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-snug">Everything unlimited. Highest Google Gemini 2.5 Pro hook intelligence.</p>
                    <ul className="space-y-1.5 pt-2 text-[11px] text-white">
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> <strong>Unlimited 4K UHD & 1080p Renders</strong></li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> <strong>No Watermark</strong> / Custom Brand</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> <strong>Highest Gemini 2.5 Pro Model</strong></li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> <strong>Auto-Captions with Kinetic Subtitles</strong></li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> <strong>AI Silence Cut & Background Music</strong></li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> <strong>Direct Social Media Publishing Sheet</strong></li>
                    </ul>
                  </div>
                  <button
                    onClick={() => handleActivatePro('Creator Pro')}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-purple-600 to-pink-600 hover:from-amber-400 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-900/40 transition-all cursor-pointer transform hover:scale-[1.02] active:scale-95"
                  >
                    Activate Creator Pro ({currencyMode === 'USD' ? '$5/mo' : '₦7,500/mo'})
                  </button>
                </div>
              </div>
              {/* Feature Comparison Highlights */}
              <div className="p-4 rounded-2xl bg-[#10111a] border border-[#1e202e] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5 text-center sm:text-left">
                  <span className="font-bold text-white block">Need high-volume server hardware?</span>
                  <span className="text-zinc-400 text-[11px]">Prune Master runs 100% on your machine or cloud tunnel with zero external API fees.</span>
                </div>
                <button
                  onClick={() => setIsProModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold shrink-0 cursor-pointer"
                >
                  Continue with Current Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Global Master Editor Modal if opened from another tab */}
      {editorClip && activeTab !== 'editor' && (
        <React.Suspense fallback={null}>
          <CapCutEditor
            clip={editorClip}
            onClose={() => setEditorClip(null)}
            onClipUpdated={(updated) => {
              setClips(prev => prev.map(c => c.id === updated.id ? updated : c))
              setEditorClip(updated)
            }}
          />
        </React.Suspense>
      )}
    </div>
  )
}
