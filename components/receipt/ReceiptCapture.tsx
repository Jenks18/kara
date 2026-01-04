'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, X, Image as ImageIcon, Receipt, ChevronRight, Zap, Pen } from 'lucide-react'
import ConfirmExpenses from './ConfirmExpenses'
import ExpenseReportView from './ExpenseReportView'
import { createExpenseReport } from '@/lib/api/expense-reports'

interface ReceiptCaptureProps {
  onCapture: (imageData: string) => void
  onCancel: () => void
}

export default function ReceiptCapture({ onCapture, onCancel }: ReceiptCaptureProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'scan'>('scan')
  const [cameraActive, setCameraActive] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [continuousMode, setContinuousMode] = useState(false)
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false)
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false)
  const [pendingStream, setPendingStream] = useState<MediaStream | null>(null)
  const [showConfirmExpenses, setShowConfirmExpenses] = useState(false)
  const [showExpenseReport, setShowExpenseReport] = useState(false)
  const [submittedImages, setSubmittedImages] = useState<string[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Debug state changes
  useEffect(() => {
    console.log('Camera state:', { cameraActive, preview, imagesCount: selectedImages.length, continuousMode })
  }, [cameraActive, preview, selectedImages.length, continuousMode])

  // Show permission prompt when switching to scan tab (only if never granted)
  useEffect(() => {
    if (activeTab === 'scan' && !cameraActive && !preview && selectedImages.length === 0 && !cameraPermissionGranted) {
      setShowPermissionPrompt(true)
    } else if (activeTab === 'scan' && cameraPermissionGranted && !cameraActive && !preview) {
      // Auto-start camera if permission was granted before
      startCamera()
    }
  }, [activeTab, cameraActive, preview, selectedImages.length, cameraPermissionGranted])

  // Start camera
  const startCamera = async () => {
    try {
      console.log('Requesting camera access...')
      setShowPermissionPrompt(false)
      
      // Try with rear camera first, fallback to any camera
      let stream: MediaStream | null = null
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
      } catch (e) {
        console.log('Rear camera not available, using default camera')
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        })
      }
      
      console.log('Camera stream obtained:', stream)
      setCameraPermissionGranted(true)
      
      // Set camera active FIRST to render the video element
      setCameraActive(true)
      console.log('setCameraActive(true) called - video element should render now')
      
      // Store stream temporarily
      setPendingStream(stream)
      
    } catch (error) {
      console.error('Camera access error:', error)
      setShowPermissionPrompt(true)
      setCameraPermissionGranted(false)
      alert('Camera access denied. Please enable camera permissions in your browser settings.')
    }
  }
  
  // Attach stream to video element after it renders
  useEffect(() => {
    if (cameraActive && pendingStream && videoRef.current) {
      console.log('Attaching stream to video element')
      videoRef.current.srcObject = pendingStream
      streamRef.current = pendingStream
      setPendingStream(null)
      
      // Play video
      videoRef.current.play()
        .then(() => console.log('Video playing successfully'))
        .catch(e => console.log('Video play error:', e))
    }
  }, [cameraActive, pendingStream])

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (pendingStream) {
      pendingStream.getTracks().forEach(track => track.stop())
      setPendingStream(null)
    }
    setCameraActive(false)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0)
    const imageData = canvas.toDataURL('image/jpeg', 0.9)

    if (continuousMode) {
      setSelectedImages(prev => [...prev, imageData])
    } else {
      setPreview(imageData)
      stopCamera()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onloadend = () => {
      const imageData = reader.result as string
      setPreview(imageData)
      stopCamera()
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleProcessMultiple = () => {
    if (selectedImages.length > 0) {
      stopCamera()
      setShowConfirmExpenses(true)
    }
  }

  const handleConfirm = () => {
    if (preview) {
      onCapture(preview)
    }
  }

  const handleCancel = () => {
    stopCamera()
    onCancel()
  }

  const startContinuousMode = () => {
    console.log('Starting continuous mode')
    setContinuousMode(true)
    setSelectedImages([])
    // Don't stop camera if already active
    if (!cameraActive) {
      startCamera()
    }
  }

  const exitContinuousMode = () => {
    console.log('Exiting continuous mode')
    setContinuousMode(false)
    // Don't clear images yet - user might want to process them
  }

  // Show expense report view
  if (showExpenseReport) {
    return (
      <ExpenseReportView
        images={submittedImages}
        workspace="Terpmail's Workspace"
        reportId={submittedImages[0]} // Pass a temp ID
        onBack={() => {
          // In production, this would navigate to the inbox/home
          setShowExpenseReport(false)
          onCancel()
        }}
      />
    )
  }

  // Show confirm expenses screen
  if (showConfirmExpenses) {
    return (
      <ConfirmExpenses
        images={selectedImages}
        onConfirm={async (expenses) => {
          console.log('Expenses confirmed:', expenses)
          
          // Get location from first expense (they all have same workspace/description)
          const firstExpense = expenses[0]
          
          // Get user's current position (if permission already granted)
          let latitude: number | undefined
          let longitude: number | undefined
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
            })
            latitude = position.coords.latitude
            longitude = position.coords.longitude
          } catch (error) {
            console.log('Location not available:', error)
          }
          
          // Create report in database
          const result = await createExpenseReport({
            userEmail: 'injenga@terpmail.umd.edu', // TODO: Get from auth
            workspaceName: firstExpense.workspace,
            workspaceAvatar: 'T',
            title: `Expense Report ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}`,
            items: expenses.map(exp => ({
              imageData: exp.imageData,
              description: exp.description,
              category: exp.category,
              reimbursable: exp.reimbursable,
              latitude,
              longitude,
            }))
          })
          
          if (result.success) {
            console.log('Report created successfully:', result.reportId)
            // Store the images and navigate to expense report view
            setSubmittedImages(selectedImages)
            setShowConfirmExpenses(false)
            setShowExpenseReport(true)
          } else {
            console.error('Failed to create report:', result.error)
            alert('Failed to save expense report. Please try again.')
          }
        }}
        onCancel={() => {
          setShowConfirmExpenses(false)
          setSelectedImages([])
          setContinuousMode(false)
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-dark-300 z-50 flex items-center justify-center">
      <div className="w-full max-w-[430px] h-full bg-dark-300 flex flex-col relative">
        {/* Header */}
        <div className="flex flex-col px-4 pt-6 pb-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleCancel}
              className="p-2 -ml-2 active:scale-95 transition-transform"
            >
              <X size={24} className="text-gray-100" />
            </button>
            <h2 className="text-lg font-semibold text-white">Create expense</h2>
            <div className="w-10" />
          </div>

          {/* Manual/Scan Tabs */}
          <div className="flex gap-2 bg-dark-200/50 p-1 rounded-full">
            <button
              onClick={() => {
                setActiveTab('manual')
                stopCamera()
                setShowPermissionPrompt(false)
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-full transition-all duration-200 font-medium ${
                activeTab === 'manual'
                  ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-dark-100/50'
              }`}
            >
              <Pen size={18} />
              Manual
            </button>
            <button
              onClick={() => {
                setActiveTab('scan')
                if (!cameraActive && !preview && selectedImages.length === 0) {
                  setShowPermissionPrompt(true)
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-full transition-all duration-200 font-medium ${
                activeTab === 'scan'
                  ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-dark-100/50'
              }`}
            >
              <Receipt size={18} />
              Scan
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'manual' ? (
            // MANUAL ENTRY FORM
            <div className="w-full h-full overflow-y-auto bg-dark-300 p-6">
              <div className="max-w-md mx-auto space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Merchant</label>
                  <input
                    type="text"
                    placeholder="Enter merchant name"
                    className="w-full bg-dark-200 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Amount (KES)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full bg-dark-200 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Litres</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full bg-dark-200 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Fuel Type</label>
                  <select className="w-full bg-dark-200 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors">
                    <option value="">Select fuel type</option>
                    <option value="PETROL">Petrol</option>
                    <option value="DIESEL">Diesel</option>
                    <option value="SUPER">Super</option>
                    <option value="GAS">Gas/LPG</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Date</label>
                  <input
                    type="date"
                    className="w-full bg-dark-200 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Vehicle Number (optional)</label>
                  <input
                    type="text"
                    placeholder="KBX 123A"
                    className="w-full bg-dark-200 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>

                <button
                  className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 hover:from-emerald-700 hover:via-emerald-600 hover:to-emerald-500 active:scale-[0.98] text-white font-semibold py-4 rounded-full transition-all duration-300 mt-6 shadow-emerald-md hover:shadow-emerald-lg"
                >
                  Create Expense
                </button>
              </div>
            </div>
          ) : (
            // SCAN MODE
            <div className="w-full h-full flex flex-col">
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Camera/Content Area */}
              {cameraActive && !preview ? (
                // LIVE CAMERA VIEW
                <div className="flex-1 relative bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                    onLoadedMetadata={() => console.log('Video metadata loaded')}
                    onPlay={() => console.log('Video started playing')}
                  />
                </div>
              ) : selectedImages.length > 0 && continuousMode ? (
                // Multi-select mode preview
                <div className="flex-1 flex items-center justify-center p-4 bg-dark-300">
                  <div className="relative w-full max-w-md">
                    <img
                      src={selectedImages[selectedImages.length - 1]}
                      alt="Selected receipt"
                      className="w-full h-auto rounded-2xl"
                    />
                    <div className="absolute top-4 right-4 w-12 h-12 bg-dark-200/80 backdrop-blur rounded-full flex items-center justify-center">
                      <Zap size={24} className="text-primary" />
                    </div>
                  </div>
                </div>
              ) : preview ? (
                // Image Preview (single)
                <div className="flex-1 flex items-center justify-center p-4 bg-dark-300">
                  <img
                    src={preview}
                    alt="Receipt preview"
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                </div>
              ) : (
                // Empty state
                <div className="flex-1 flex items-center justify-center bg-dark-300">
                  <div className="text-center px-8">
                    <Camera size={48} className="mx-auto mb-3 text-gray-600" />
                    <p className="text-sm text-gray-400">Allow camera access to start scanning</p>
                  </div>
                </div>
              )}

              {/* Continuous mode counter overlay */}
              {cameraActive && continuousMode && selectedImages.length > 0 && (
                <div className="absolute top-4 right-4 bg-dark-300/90 backdrop-blur px-4 py-2 rounded-full text-white font-semibold z-10">
                  {selectedImages.length} photo{selectedImages.length > 1 ? 's' : ''}
                </div>
              )}

              {/* Camera Permission Prompt - Inside scan mode */}
              {showPermissionPrompt && !cameraActive && (
                <div className="absolute inset-x-4 bottom-24 bg-dark-200 rounded-2xl p-5 shadow-2xl border border-gray-700 animate-slide-up z-20">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <Camera size={20} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold mb-1 text-sm">Camera Access Required</h3>
                      <p className="text-gray-400 text-xs mb-3">
                        We need camera access to scan receipts.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowPermissionPrompt(false)}
                          className="flex-1 bg-dark-300 hover:bg-dark-100 text-gray-300 font-medium py-2.5 rounded-lg transition-all text-sm border border-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={startCamera}
                          className="flex-1 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 hover:from-emerald-700 hover:via-emerald-600 hover:to-emerald-500 text-white font-semibold py-2.5 rounded-lg transition-all duration-200 text-sm shadow-emerald-md hover:shadow-emerald-lg"
                        >
                          Allow
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Bottom Controls - Only show in Scan mode */}
        {activeTab === 'scan' && (
          <div className="px-6 py-4 bg-dark-300 border-t border-gray-700">
            {preview ? (
              // Preview mode - Retake/Use Photo
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setPreview(null)
                    startCamera()
                  }}
                  className="flex-1 bg-dark-200 hover:bg-dark-100 active:scale-[0.98] text-white font-semibold py-4 rounded-full transition-all border border-gray-600"
                >
                  Retake
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 hover:from-emerald-700 hover:via-emerald-600 hover:to-emerald-500 active:scale-[0.98] text-white font-semibold py-4 rounded-full transition-all duration-300 shadow-emerald-md hover:shadow-emerald-lg"
                >
                  Use Photo
                </button>
              </div>
            ) : cameraActive ? (
              // Camera active - show controls
              <div className="space-y-3">
                {/* Thumbnail strip - only in continuous mode */}
                {continuousMode && (
                  <div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-3">
                      {/* Show captured images */}
                      {selectedImages.map((img, index) => (
                        <div key={index} className="relative flex-shrink-0">
                          <img
                            src={img}
                            alt={`Receipt ${index + 1}`}
                            className="w-16 h-20 object-cover rounded-lg border-2 border-primary"
                          />
                          <button
                            onClick={() => handleRemoveImage(index)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-danger rounded-full flex items-center justify-center shadow-lg"
                          >
                            <X size={14} className="text-white" />
                          </button>
                        </div>
                      ))}
                      
                      {/* Empty placeholder squares (show 5 total slots) */}
                      {Array.from({ length: Math.max(0, 5 - selectedImages.length) }).map((_, index) => (
                        <div
                          key={`empty-${index}`}
                          className="w-16 h-20 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center flex-shrink-0 bg-dark-100/30"
                        >
                          <Camera size={20} className="text-gray-600" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Camera controls - ALWAYS show when camera active */}
                <div className="flex items-center justify-between">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  {/* Gallery button - hide in continuous mode */}
                  {!continuousMode ? (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-14 h-14 rounded-xl bg-dark-200 backdrop-blur hover:bg-dark-100 active:scale-95 transition-all flex items-center justify-center border border-gray-600"
                    >
                      <ImageIcon size={24} className="text-gray-300" />
                    </button>
                  ) : (
                    <div className="w-14" />
                  )}

                  {/* Capture button - ALWAYS visible - Enhanced with gradient and strong borders */}
                  <button
                    onClick={capturePhoto}
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-400 hover:from-emerald-700 hover:via-emerald-600 hover:to-emerald-500 active:from-emerald-800 active:via-emerald-700 active:to-emerald-600 transition-all duration-300 flex items-center justify-center active:scale-90 shadow-emerald-xl ring-[6px] ring-emerald-500/20 hover:ring-emerald-500/30"
                  >
                    <div className="w-[72px] h-[72px] rounded-full border-[6px] border-white shadow-inner" />
                  </button>

                  {/* Right side: Multi-receipt button + optional Chevron */}
                  <div className="flex items-center gap-2">
                    {/* Multi-receipt toggle button - ALWAYS visible */}
                    <button
                      onClick={() => {
                        if (continuousMode) {
                          setContinuousMode(false)
                          setSelectedImages([])
                        } else {
                          startContinuousMode()
                        }
                      }}
                      className={`w-16 h-16 rounded-xl backdrop-blur active:scale-95 transition-all duration-200 flex items-center justify-center border-2 ${
                        continuousMode 
                          ? 'bg-gradient-to-br from-emerald-600 to-emerald-500 text-white border-emerald-400 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/30' 
                          : 'bg-dark-200 hover:bg-dark-100 text-gray-300 border-gray-600 hover:border-emerald-500/50'
                      }`}
                    >
                      <Receipt size={28} strokeWidth={2.5} />
                    </button>
                    
                    {/* Chevron button - show when have photos in continuous mode */}
                    {continuousMode && selectedImages.length > 0 && (
                      <button
                        onClick={handleProcessMultiple}
                        className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-400 hover:from-emerald-700 hover:via-emerald-600 hover:to-emerald-500 active:from-emerald-800 active:via-emerald-700 active:to-emerald-600 transition-all duration-300 flex items-center justify-center active:scale-90 shadow-emerald-xl ring-4 ring-emerald-500/30 hover:ring-emerald-500/40"
                      >
                        <ChevronRight size={36} className="text-white" strokeWidth={4} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Camera not active
              <div className="flex items-center justify-between opacity-50 pointer-events-none">
                <div className="w-14 h-14 rounded-xl bg-dark-100/50 flex items-center justify-center">
                  <ImageIcon size={24} className="text-gray-400" />
                </div>
                <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-4 border-gray-700" />
                </div>
                <div className="w-14 h-14 rounded-xl bg-dark-100/50 flex items-center justify-center">
                  <Receipt size={24} className="text-gray-400" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
