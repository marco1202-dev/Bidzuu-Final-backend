export const VIDEO_EXTENSIONS = [
  // Common video formats
  'mp4',
  'avi',
  'mov',
  'wmv',
  'flv',
  'webm',
  'mkv',
  'm4v',
  '3gp',
  'ogv',
  'ts',
  'mts',
  'm2ts',
  'vob',
  'asf',
  'rm',
  'rmvb',
  'divx',
  'xvid',
  'h264',
  'h265',
  'hevc',
  'vp8',
  'vp9',
  'av1',
  'theora',
  'mpeg',
  'mpeg2',
  'mpeg4',
  'quicktime',
  'realmedia',
  'windowsmedia',
] as const

export const VIDEO_MIME_TYPES = {
  // MP4
  MP4: 'video/mp4',
  M4V: 'video/mp4',

  // AVI
  AVI: 'video/x-msvideo',

  // MOV (QuickTime)
  MOV: 'video/quicktime',

  // WMV
  WMV: 'video/x-ms-wmv',

  // FLV
  FLV: 'video/x-flv',

  // WebM
  WEBM: 'video/webm',

  // MKV
  MKV: 'video/x-matroska',

  // 3GP
  '3GP': 'video/3gpp',

  // OGV
  OGV: 'video/ogg',

  // TS
  TS: 'video/mp2t',
  MTS: 'video/mp2t',
  M2TS: 'video/mp2t',

  // VOB
  VOB: 'video/mpeg',

  // ASF
  ASF: 'video/x-ms-asf',

  // RealMedia
  RM: 'application/vnd.rn-realmedia',
  RMVB: 'application/vnd.rn-realmedia-v2',

  // MPEG
  MPEG: 'video/mpeg',
  MPG: 'video/mpeg',
  MPEG2: 'video/mpeg',
  MPEG4: 'video/mp4',

  // H.264/H.265/HEVC
  H264: 'video/h264',
  H265: 'video/h265',
  HEVC: 'video/hevc',

  // VP8/VP9/AV1
  VP8: 'video/vp8',
  VP9: 'video/vp9',
  AV1: 'video/av1',

  // Theora
  THEORA: 'video/theora',

  // QuickTime
  QUICKTIME: 'video/quicktime',

  // RealMedia
  REALMEDIA: 'application/vnd.rn-realmedia',

  // Windows Media
  WINDOWSMEDIA: 'video/x-ms-wmv',
} as const

export const SUPPORTED_VIDEO_MIME_TYPES = Object.values(VIDEO_MIME_TYPES)

// Common video extensions that should be treated as video files
export const COMMON_VIDEO_EXTENSIONS = [
  'mp4',
  'avi',
  'mov',
  'wmv',
  'flv',
  'webm',
  'mkv',
  'm4v',
  '3gp',
  'ogv',
  'ts',
  'mts',
  'm2ts',
  'vob',
  'asf',
  'rm',
  'rmvb',
  'divx',
  'xvid',
  'h264',
  'h265',
  'hevc',
  'vp8',
  'vp9',
  'av1',
  'theora',
  'mpeg',
  'mpeg2',
  'mpeg4',
  'quicktime',
  'realmedia',
  'windowsmedia',
]
