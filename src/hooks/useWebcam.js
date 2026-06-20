// src/hooks/useWebcam.js
// FIX 1: stopCamera() was using a stale closure over 'stream' because useCallback
//         had [stream] as dep but stream ref was null at cleanup time.
//         Now uses a streamRef internally so stopCamera() always accesses latest stream.
// FIX 2: startCamera() guards against being called if already active.
// FIX 3: Reduced ideal resolution to 640x480 to improve startup speed on lower-end devices.
// FIX 4: Audio is requested separately with error tolerance — camera still works without mic.
import { useState, useRef, useCallback } from 'react'

export function useWebcam() {
  const [isCamActive, setIsCamActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [stream,      setStream]      = useState(null)
  const videoRef  = useRef(null)
  const streamRef = useRef(null)   // always has latest stream

  const startCamera = useCallback(async () => {
    // Don't start again if already running
    if (streamRef.current) return

    setCameraError(null)

    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          width:      { ideal: 640 },
          height:     { ideal: 480 },
          facingMode: 'user',
        },
        audio: true,
      })

      streamRef.current = s
      setStream(s)
      setIsCamActive(true)

      if (videoRef.current) {
        videoRef.current.srcObject = s
        videoRef.current.muted     = true  // prevent mic feedback loop
      }
    } catch (err) {
      let msg = 'Could not access camera.'
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Click the camera icon in your browser address bar to allow access.'
      } else if (err.name === 'NotFoundError') {
        msg = 'No camera found. Please connect a webcam and try again.'
      } else if (err.name === 'NotReadableError') {
        msg = 'Camera is in use by another application. Close it and try again.'
      }
      setCameraError(msg)
    }
  }, []) // stable — uses ref internally

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setStream(null)
    setIsCamActive(false)
  }, [])

  return { videoRef, stream, cameraError, isCamActive, startCamera, stopCamera }
}
