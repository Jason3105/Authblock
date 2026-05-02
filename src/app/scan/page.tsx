'use client';

import { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { Navbar } from '@/components/landing';
import { UploadCloud, CheckCircle2, AlertCircle, FileText, Loader2, ShieldCheck, GraduationCap, Camera, X } from 'lucide-react';

export default function ScanPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [studentData, setStudentData] = useState<any>(null);
  const [marksheets, setMarksheets] = useState<any[]>([]);
  const [scanLog, setScanLog] = useState<any>(null);
  
  const [scanMode, setScanMode] = useState<'upload' | 'camera'>('upload');
  const [isCameraActive, setIsCameraActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera when unmounting or switching modes
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    setError(null);
    setLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsCameraActive(true);
        setLoading(false);
        scanFrame();
      }
    } catch (err: any) {
      console.error(err);
      setError('Camera access denied or unavailable. Please use the upload option.');
      setLoading(false);
      setScanMode('upload');
    }
  };

  const handleModeSwitch = (mode: 'upload' | 'camera') => {
    if (mode === 'upload') {
      stopCamera();
    } else {
      startCamera();
    }
    setScanMode(mode);
    setError(null);
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          stopCamera();
          handleScannedData(code.data);
          return; // Stop loop
        }
      }
    }
    
    // Keep scanning
    animationRef.current = requestAnimationFrame(scanFrame);
  };

  const processImageUpload = (file: File) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setError('Failed to process image');
          setLoading(false);
          return;
        }
        
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          handleScannedData(code.data);
        } else {
          setError('No QR code found in the image. Please try again with a clearer image.');
          setLoading(false);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleScannedData = async (data: string) => {
    setLoading(true);
    setError(null);
    // Expected format: AUTHBLOCK_SECURE_QR:<uuid>
    if (!data.startsWith('AUTHBLOCK_SECURE_QR:')) {
      setError('Invalid or unrecognized QR Code format. Only Authblock issued QR codes are supported.');
      setLoading(false);
      return;
    }

    const token = data.split(':')[1];
    
    try {
      const response = await fetch('/api/qr/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ qr_token: token })
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Failed to fetch student records');
      }

      setStudentData(resData.user);
      setMarksheets(resData.marksheets);
      setScanLog(resData.logs);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setSuccess(false);
    if (scanMode === 'camera') {
      startCamera();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar isLoggedIn={false} />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12 pt-24">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-3">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
            Scanner Platform
          </h1>
          <p className="text-slate-500 mt-2 max-w-lg mx-auto">
            Upload or scan a student's secure QR code to verify their academic records and credentials.
          </p>
        </div>

        {!success ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 max-w-xl mx-auto">
            
            {/* Mode Toggle */}
            <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
              <button 
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${scanMode === 'upload' ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => handleModeSwitch('upload')}
              >
                <UploadCloud className="w-4 h-4" /> Upload Image
              </button>
              <button 
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${scanMode === 'camera' ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => handleModeSwitch('camera')}
              >
                <Camera className="w-4 h-4" /> Live Camera
              </button>
            </div>

            {scanMode === 'upload' ? (
              <div 
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
                  error ? 'border-red-300 bg-red-50' : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50/50 bg-slate-50'
                }`}
                onClick={() => !loading && fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processImageUpload(e.target.files[0]);
                    }
                  }}
                />
                
                {loading ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                    <p className="text-sm font-bold text-slate-600">Securely Verifying & Logging Scan...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className={`p-4 rounded-full ${error ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-600'}`}>
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-800">Upload QR Code Image</p>
                      <p className="text-sm text-slate-500 mt-1">Tap here to select an image from your device</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center relative">
                {loading && !isCameraActive && (
                  <div className="absolute inset-0 bg-slate-50/80 rounded-2xl flex flex-col justify-center items-center z-10">
                     <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                     <span className="text-sm font-medium text-slate-600">Starting Camera...</span>
                  </div>
                )}
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-sm mx-auto shadow-md">
                   <video 
                     ref={videoRef} 
                     className="w-full h-full object-cover" 
                   ></video>
                   {/* Scanning overlay frame */}
                   <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none flex items-center justify-center">
                     <div className="w-full h-full border-2 border-green-400/80 shadow-[0_0_15px_rgba(74,222,128,0.5)] rounded-lg relative">
                       <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white -mt-1 -ml-1"></div>
                       <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white -mt-1 -mr-1"></div>
                       <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white -mb-1 -ml-1"></div>
                       <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white -mb-1 -mr-1"></div>
                     </div>
                   </div>
                   <canvas ref={canvasRef} className="hidden" />
                </div>
                <p className="text-sm text-slate-500 mt-4">Point your camera at the student's Authblock QR code</p>
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-left">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-emerald-200 shadow-lg p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Verification Successful</h2>
                  <p className="text-emerald-700 font-medium tracking-wide">Identity Verified against Blockchain</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Student Name</p>
                  <p className="text-xl font-bold text-slate-900">{studentData.full_name}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">PRN No.</p>
                  <p className="text-xl font-bold text-slate-900">{studentData.prn_no}</p>
                </div>
              </div>

              <div className="bg-slate-900 text-slate-300 p-5 rounded-2xl text-xs font-mono space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <ShieldCheck className="w-24 h-24" />
                </div>
                <p><span className="text-slate-500">Log Timestamp:</span> {new Date(scanLog.timestamp).toLocaleString()}</p>
                <p><span className="text-slate-500">Scan TxHash:</span> <a href={`https://sepolia.etherscan.io/tx/${scanLog.tx_hash}`} target="_blank" className="text-emerald-400 hover:underline break-all">{scanLog.tx_hash}</a></p>
                <p><span className="text-slate-500">Data Hash Logged:</span> <span className="text-white break-all">{scanLog.hash}</span></p>
                <p className="mt-4 text-emerald-400 font-bold border-t border-slate-800 pt-2">✓ This scanner event has been permanently recorded on the Ethereum Blockchain.</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-8">
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <GraduationCap className="w-6 h-6 text-blue-600" /> Academic Records
              </h3>
              
              {marksheets.length === 0 ? (
                <p className="text-slate-500 text-center py-6">No credentials found for this student.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {marksheets.map((doc: any) => (
                    <div key={doc.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-2xl hover:border-slate-300 transition-colors">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md">
                            {doc.branch}
                          </span>
                          <span className="text-xs font-bold text-slate-500 uppercase">{doc.session_name}</span>
                        </div>
                        <h4 className="text-lg font-bold text-slate-900">{doc.examination}</h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 mt-4 md:mt-0">
                        <div className="text-center bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                          <p className="text-[10px] uppercase font-bold text-slate-400">SGPI</p>
                          <p className="text-lg font-black text-slate-800">{doc.sgpi}</p>
                        </div>
                        <div className="text-center bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                           <p className="text-[10px] uppercase font-bold text-slate-400">Result</p>
                           <p className={`text-sm font-black mt-1 ${doc.remarks.toUpperCase().includes('PASS') || doc.remarks === 'SUCCESSFUL' ? 'text-emerald-600' : 'text-red-500'}`}>{doc.remarks}</p>
                        </div>
                        <a 
                          href={doc.supabase_pdf_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl shadow-sm transition-colors"
                          title="Download Document"
                        >
                          <FileText className="w-5 h-5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="text-center pt-4">
              <button 
                onClick={resetScanner}
                className="text-slate-500 hover:text-slate-800 font-bold underline"
              >
                Scan Another QR Code
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
