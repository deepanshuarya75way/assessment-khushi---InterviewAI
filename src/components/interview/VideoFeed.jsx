// src/components/interview/VideoFeed.jsx
// FIX 1: startCamera() was being called in a useEffect with [] dep array but the
//         function reference changed on every render (useCallback not memoised in hook).
//         Now calls startCamera via a ref to avoid stale closure.
// FIX 2: onStreamReady callback now receives the actual MediaStream object so the
//         parent (InterviewSessionPage) can stop it on unmount.
// FIX 3: videoRef.srcObject is set in a useEffect that reacts to stream changes,
//         preventing the "video plays but stays black" bug on slow connections.
// FIX 4: Added graceful UI for when MediaDevices API is not available (HTTP context).
import { useEffect, useRef } from 'react'
import { AlertTriangle, VideoOff } from 'lucide-react'
import { useWebcam } from '../../hooks/useWebcam'

export default function VideoFeed({ onStreamReady }) {
  const { videoRef, stream, cameraError, isCamActive, startCamera } = useWebcam()
  const startedRef = useRef(false)

  // Start camera exactly once on mount
  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true
      startCamera()
    }
  }, []) // intentionally empty

  // Attach stream to video element when stream is ready
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream
    }
    if (stream && onStreamReady) {
      onStreamReady(stream)
    }
  }, [stream])

  // Check if MediaDevices is available at all
  const mediaDevicesAvailable = typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia

  return (
    <div className="video-frame relative bg-surface-900">
      {!mediaDevicesAvailable ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <VideoOff size={28} className="text-slate-600" />
          <p className="text-slate-500 text-xs text-center px-4">
            Camera requires a secure (HTTPS) connection.
          </p>
        </div>
      ) : cameraError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <AlertTriangle size={28} className="text-amber-400" />
          <p className="text-slate-400 text-xs text-center px-6">{cameraError}</p>
        </div>
      ) : !isCamActive ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-xs">Starting camera…</p>
        </div>
      ) : null}

      <video
        ref={videoRef}
        autoPlay playsInline muted
        className={`w-full h-full object-cover transition-opacity duration-300 ${isCamActive ? 'opacity-100' : 'opacity-0'}`}
        style={{ transform: 'scaleX(-1)' }}
      />

      {isCamActive && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 recording-pulse" />
          <span className="text-white text-[10px] font-medium">LIVE</span>
        </div>
      )}
    </div>
  )
}
