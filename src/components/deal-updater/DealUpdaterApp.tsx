"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import exifr from "exifr";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Check,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Trash2,
  X,
  Plus,
} from "lucide-react";
import type { ExtractedDeal, ExistingDeal } from "@/lib/deal-types";
import { createClient } from "@/lib/supabase-browser";

type AppView = "capture" | "processing" | "result" | "success";

// Magic processing messages that rotate during AI analysis
const MAGIC_MESSAGES = [
  "Reading the menu...",
  "Spotting the deals...",
  "Decoding happy hour times...",
  "Checking prices...",
  "Finding the restaurant...",
  "Locating the neighborhood...",
  "Almost there...",
  "Sprinkling unicorn dust...",
];

// Claude API only accepts these media types for images
const SUPPORTED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function normalizeMediaType(type: string): string {
  if (SUPPORTED_MEDIA_TYPES.has(type)) return type;
  // Common aliases and unsupported formats → default to jpeg
  return "image/jpeg";
}

interface DealUpdaterAppProps {
  initialVenueId?: string;
}

export default function DealUpdaterApp({ initialVenueId }: DealUpdaterAppProps) {
  const router = useRouter();

  // Core state
  const [view, setView] = useState<AppView>("capture");
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);

  // AI result state
  const [extractedData, setExtractedData] = useState<ExtractedDeal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Matching state
  const [existingEntries, setExistingEntries] = useState<ExistingDeal[]>([]);
  const [matchedEntry, setMatchedEntry] = useState<ExistingDeal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Location state
  const [photoGps, setPhotoGps] = useState<{ lat: number; lng: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; source: string } | null>(null);

  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Existing venue photos (loaded from DB for edit mode)
  const [venuePhotos, setVenuePhotos] = useState<{ id: string; url: string }[]>([]);
  // Track if new photos were added in result view (for reprocess button)
  const [hasNewPhotos, setHasNewPhotos] = useState(false);

  // Processing animation
  const [magicMsgIdx, setMagicMsgIdx] = useState(0);
  const [processingDots, setProcessingDots] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultPhotoInputRef = useRef<HTMLInputElement>(null);

  // Rotate magic messages during processing
  useEffect(() => {
    if (view !== "processing") return;
    const msgInterval = setInterval(() => {
      setMagicMsgIdx((prev) => (prev + 1) % MAGIC_MESSAGES.length);
    }, 2000);
    const dotInterval = setInterval(() => {
      setProcessingDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => {
      clearInterval(msgInterval);
      clearInterval(dotInterval);
    };
  }, [view]);

  // Load existing entries on mount
  useEffect(() => {
    fetch("/api/venues")
      .then((res) => res.ok ? res.json() : [])
      .then(setExistingEntries)
      .catch(() => {});
  }, []);

  // Pre-populate from initialVenueId when existing entries are loaded
  useEffect(() => {
    if (!initialVenueId || existingEntries.length === 0) return;
    const venue = existingEntries.find((v) => v.id === initialVenueId);
    if (!venue) return;
    setMatchedEntry(venue);
    setExtractedData({
      restaurant_name: venue.restaurant_name,
      deal_description: venue.deal_description,
      deal_highlight: venue.deal_highlight,
      category_emoji: venue.category_emoji,
      days: { ...venue.days },
      confidence: 1,
      google_place: {
        name: venue.restaurant_name,
        neighborhood: venue.neighborhood,
        address: "",
        rating: null,
      },
      matched_venue_id: Number(venue.id),
    });
    setView("result");
  }, [initialVenueId, existingEntries]);

  // Fetch existing venue photos when editing a venue
  useEffect(() => {
    if (!initialVenueId) return;
    const supabase = createClient();
    (async () => {
      const { data: photos } = await supabase
        .from("venue_photos")
        .select("id, storage_path")
        .eq("venue_id", initialVenueId);
      if (photos && photos.length > 0) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        setVenuePhotos(
          photos.map((p: { id: string; storage_path: string }) => ({
            id: p.id,
            url: `${supabaseUrl}/storage/v1/object/public/venue-photos/${p.storage_path}`,
          }))
        );
      }
    })();
  }, [initialVenueId]);

  // Request user geolocation on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: "gps" }),
        () => {} // permission denied — silent fail
      );
    }
  }, []);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  // Handle image selection (camera or gallery)
  const handleImageCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    for (const file of files) {
      setCapturedImages((prev) => [...prev, URL.createObjectURL(file)]);
      setImageFiles((prev) => [...prev, file]);
      // Extract GPS from EXIF if available (JPEG/HEIC/TIFF only)
      try {
        const gps = await exifr.gps(file);
        if (gps?.latitude && gps?.longitude) {
          setPhotoGps({ lat: gps.latitude, lng: gps.longitude });
        }
      } catch {
        // No EXIF GPS — ignore (screenshots, PNGs, etc.)
      }
    }
    event.target.value = "";
  };

  const removeImage = (idx: number) => {
    setCapturedImages((prev) => prev.filter((_, i) => i !== idx));
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Handle adding photos from the result view
  const handleResultPhotoAdd = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    for (const file of files) {
      setCapturedImages((prev) => [...prev, URL.createObjectURL(file)]);
      setImageFiles((prev) => [...prev, file]);
      try {
        const gps = await exifr.gps(file);
        if (gps?.latitude && gps?.longitude) {
          setPhotoGps({ lat: gps.latitude, lng: gps.longitude });
        }
      } catch {
        // No EXIF GPS
      }
    }
    setHasNewPhotos(true);
    event.target.value = "";
  };

  // Reprocess all photos with AI (existing + new)
  const reprocessWithAI = useCallback(async () => {
    if (imageFiles.length === 0) return;
    setView("processing");
    setError(null);
    setMagicMsgIdx(0);

    try {
      const images = [];
      for (const file of imageFiles) {
        const base64 = await fileToBase64(file);
        images.push({ base64, mediaType: normalizeMediaType(file.type) });
      }

      const location = photoGps
        ? { lat: photoGps.lat, lng: photoGps.lng, source: "exif" }
        : userLocation;

      const res = await fetch("/api/extract-deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images,
          textInput: extractedData?.deal_description || "",
          restaurantName: extractedData?.restaurant_name || "",
          venues: existingEntries,
          location,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `API error: ${res.status}`);
      }

      const extracted: ExtractedDeal = await res.json();
      setExtractedData(extracted);

      const match = extracted.matched_venue_id != null
        ? existingEntries.find((v) => v.id === String(extracted.matched_venue_id))
        : matchedEntry;
      setMatchedEntry(match || null);
      setHasNewPhotos(false);
      setView("result");
    } catch (err) {
      console.error("AI reprocess error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setView("result");
    }
  }, [imageFiles, extractedData, existingEntries, photoGps, userLocation, matchedEntry]);

  // THE MAGIC: send photos to AI and let it do everything
  const runMagic = useCallback(async () => {
    if (imageFiles.length === 0 && !pasteText.trim()) return;

    setView("processing");
    setError(null);
    setMagicMsgIdx(0);

    try {
      const images = [];
      for (const file of imageFiles) {
        const base64 = await fileToBase64(file);
        images.push({ base64, mediaType: normalizeMediaType(file.type) });
      }

      // Location priority: EXIF GPS > user geolocation > null
      const location = photoGps
        ? { lat: photoGps.lat, lng: photoGps.lng, source: "exif" }
        : userLocation;

      const res = await fetch("/api/extract-deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images,
          textInput: pasteText,
          restaurantName: "", // AI figures it out
          venues: existingEntries,
          location,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `API error: ${res.status}`);
      }

      const extracted: ExtractedDeal = await res.json();
      setExtractedData(extracted);

      // Match against existing entries using AI-returned id
      const match = extracted.matched_venue_id != null
        ? existingEntries.find((v) => v.id === String(extracted.matched_venue_id))
        : null;
      setMatchedEntry(match || null);

      setView("result");
    } catch (err) {
      console.error("AI extraction error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setView("capture");
    }
  }, [imageFiles, pasteText, existingEntries, photoGps, userLocation]);

  // Submit correction feedback to AI
  const submitCorrection = useCallback(async (feedback: string) => {
    if (!extractedData || !feedback.trim()) return;

    try {
      const res = await fetch("/api/enhance-deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extractedData, feedback }),
      });

      if (res.ok) {
        const updated = await res.json();
        setExtractedData({
          ...updated,
          confidence: Math.min((extractedData.confidence || 0) + 0.1, 0.99),
        });
      }
    } catch {
      // Keep current data on error
    }
  }, [extractedData]);

  // Final submit
  const handleSubmit = async () => {
    if (!extractedData) return;
    setIsSubmitting(true);
    setError(null);
    try {
      // Location priority: EXIF GPS > user geolocation > null
      const location = photoGps
        ? { lat: photoGps.lat, lng: photoGps.lng, source: "exif" }
        : userLocation;

      // Build base64 images array for photo storage
      const imagePayloads = [];
      for (const file of imageFiles) {
        try {
          const base64 = await fileToBase64(file);
          imagePayloads.push({ base64, mediaType: normalizeMediaType(file.type) });
        } catch {
          // Skip files that fail to encode
        }
      }

      const res = await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extractedData,
          matchedVenueId: matchedEntry?.id ?? null,
          location,
          images: imagePayloads.length > 0 ? imagePayloads : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Save failed: ${res.status}`);
      }
      // Redirect to home with venue pre-selected
      const venueId = data.venue?.id ?? matchedEntry?.id;
      router.push(venueId ? `/?venue=${venueId}` : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save deal");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete deal
  const handleDelete = async () => {
    if (!matchedEntry) return;
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/venues?id=${matchedEntry.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Delete failed: ${res.status}`);
      }
      router.push("/?deleted=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete deal");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const resetApp = () => {
    setView("capture");
    setCapturedImages([]);
    setImageFiles([]);
    setPasteText("");
    setShowTextInput(false);
    setExtractedData(null);
    setMatchedEntry(null);
    setIsEditing(false);
    setError(null);
    setPhotoGps(null);
    setHasNewPhotos(false);
    setShowDeleteConfirm(false);
  };

  // Cancel/back: if in update mode navigate home, otherwise reset
  const handleCancel = () => {
    if (initialVenueId) {
      router.push("/");
    } else {
      resetApp();
    }
  };

  // Show cancel button when not in the initial empty capture state
  const showCancelButton =
    view !== "capture" ||
    capturedImages.length > 0 ||
    pasteText.trim().length > 0 ||
    !!initialVenueId;

  // Day toggle in result view
  const toggleDay = (day: string) => {
    setExtractedData((prev) =>
      prev ? { ...prev, days: { ...prev.days, [day]: !prev.days[day as keyof typeof prev.days] } } : prev
    );
  };

  // ============================
  // VIEW: CAPTURE (photo-first)
  // ============================
  if (view === "capture") {
    return (
      <div className="flex-1 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col">
        {showCancelButton && (
          <div className="p-3 pb-0">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 transition-colors min-h-[44px]"
            >
              <ArrowLeft size={18} />
              <span>{initialVenueId ? "Back" : "Cancel"}</span>
            </button>
          </div>
        )}
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-red-700 text-sm w-full max-w-md flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-2"><X size={16} /></button>
            </div>
          )}

          {/* Photo preview strip */}
          {capturedImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 w-full max-w-md">
              {capturedImages.map((img, idx) => (
                <div key={idx} className="relative flex-shrink-0">
                  <img
                    src={img}
                    alt={`Photo ${idx + 1}`}
                    className="w-20 h-20 object-cover rounded-xl border-2 border-purple-300 shadow-md"
                  />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full flex items-center justify-center shadow-md text-xs font-bold"
                  >
                    &#x00d7;
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Main capture area */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-4 max-w-md w-full text-center border-2 border-purple-200">
            {capturedImages.length === 0 ? (
              <>
                <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-r from-pink-200 via-purple-200 to-blue-200 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-3xl">&#x1f4f8;</span>
                </div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-1">
                  Snap the Deal
                </h2>
                <p className="text-gray-500 text-xs mb-3">
                  Photo the happy hour menu — AI does the rest &#x2728;
                </p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-1">
                  {capturedImages.length} photo{capturedImages.length > 1 ? "s" : ""} ready &#x2728;
                </h2>
                <p className="text-gray-500 text-xs mb-3">
                  Add more photos or let the AI work its magic
                </p>
              </>
            )}

            {/* Add Photo button — mobile OS natively offers camera-or-gallery */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-pink-300 rounded-xl hover:bg-pink-50 transition-all group min-h-[44px] mb-3"
            >
              <Camera size={24} className="text-pink-500 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-pink-600">Add Photo</span>
            </button>

            {/* Optional text input toggle */}
            <button
              onClick={() => setShowTextInput(!showTextInput)}
              className="text-xs text-purple-500 hover:text-purple-700 transition-colors flex items-center gap-1 mx-auto mb-2"
            >
              {showTextInput ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showTextInput ? "Hide text input" : "Or paste deal text instead"}
            </button>

            {showTextInput && (
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste or type the deal info here..."
                className="w-full p-2 border-2 border-purple-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all text-sm mb-3"
                rows={2}
              />
            )}

            {/* Hidden file input — no capture attr lets mobile OS offer camera or gallery */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageCapture}
              className="hidden"
            />
          </div>

          {/* GO button — only shows when we have input */}
          {(capturedImages.length > 0 || pasteText.trim()) && (
            <button
              onClick={runMagic}
              className="w-full max-w-md bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white py-3 rounded-xl font-bold text-base hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 transition-all transform hover:scale-105 shadow-xl flex items-center justify-center gap-2 min-h-[44px]"
            >
              <span className="text-2xl">&#x1f984;</span>
              <span>Let the AI Work Its Magic</span>
              <span className="text-2xl">&#x2728;</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ============================
  // VIEW: PROCESSING (AI magic)
  // ============================
  if (view === "processing") {
    return (
      <div className="flex-1 bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Cancel button */}
        <div className="absolute top-3 left-3 z-20">
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 transition-colors min-h-[44px] bg-white/80 backdrop-blur-sm rounded-lg px-3"
          >
            <ArrowLeft size={18} />
            <span>Cancel</span>
          </button>
        </div>
        {/* Floating sparkles */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[10%] left-[15%] text-4xl animate-bounce opacity-30" style={{ animationDuration: "3s" }}>&#x2728;</div>
          <div className="absolute top-[20%] right-[20%] text-3xl animate-bounce opacity-25" style={{ animationDelay: "1s", animationDuration: "4s" }}>&#x1f31f;</div>
          <div className="absolute bottom-[25%] left-[10%] text-3xl animate-bounce opacity-20" style={{ animationDelay: "0.5s", animationDuration: "3.5s" }}>&#x1f984;</div>
          <div className="absolute bottom-[15%] right-[15%] text-4xl animate-bounce opacity-25" style={{ animationDelay: "2s", animationDuration: "4.5s" }}>&#x2728;</div>
          <div className="absolute top-[45%] left-[5%] text-5xl animate-bounce opacity-15" style={{ animationDelay: "1.5s", animationDuration: "5s" }}>&#x1f984;</div>
          <div className="absolute top-[60%] right-[8%] text-2xl animate-bounce opacity-20" style={{ animationDelay: "0.8s", animationDuration: "3.8s" }}>&#x1f31f;</div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-4 max-w-sm w-full text-center border-2 border-purple-300 relative z-10">
          {/* Spinning unicorn */}
          <div className="w-20 h-20 mx-auto mb-3 relative">
            <div
              className="w-20 h-20 rounded-full animate-spin"
              style={{
                animationDuration: "3s",
                background: "conic-gradient(from 0deg, #ec4899, #a855f7, #3b82f6, #10b981, #f59e0b, #ec4899)",
              }}
            />
            <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
              <span className="text-3xl">&#x1f984;</span>
            </div>
          </div>

          {/* Photo being analyzed */}
          {capturedImages[0] && (
            <img
              src={capturedImages[0]}
              alt="Analyzing..."
              className="w-20 h-20 object-cover rounded-xl mx-auto mb-3 border-2 border-purple-300 shadow-md opacity-80"
            />
          )}

          <h2 className="text-xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            AI Magic in Progress{processingDots}
          </h2>
          <p className="text-purple-600 text-sm font-medium mb-4 h-5">
            {MAGIC_MESSAGES[magicMsgIdx]}
          </p>

          <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full animate-pulse" style={{
              width: "100%",
              background: "linear-gradient(90deg, #ec4899, #a855f7, #3b82f6, #ec4899)",
              backgroundSize: "200% 100%",
              animation: "shimmer 2s linear infinite",
            }} />
          </div>
        </div>

        <style jsx>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  // ============================
  // VIEW: RESULT (AI output + human correction)
  // ============================
  if (view === "result" && extractedData) {
    return (
      <div className="flex-1 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col">
        <div className="flex-1 p-3 space-y-3 pb-36">
          {/* Top bar: Back + Delete */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 transition-colors min-h-[44px]"
            >
              <ArrowLeft size={18} />
              <span>{initialVenueId ? "Back" : "Cancel"}</span>
            </button>
            {matchedEntry && !showDeleteConfirm && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 transition-colors min-h-[44px] px-3 py-1.5 rounded-lg hover:bg-red-50"
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            )}
            {matchedEntry && showDeleteConfirm && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-all min-h-[44px] px-3 py-1.5 rounded-lg disabled:opacity-60"
                >
                  {isDeleting ? "..." : "Delete"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors min-h-[44px] px-2 py-1.5"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          {/* Submit error */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-red-700 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-2"><X size={16} /></button>
            </div>
          )}
          {/* Confidence indicator */}
          <div className="flex items-center gap-2 bg-white/80 rounded-xl p-2.5 border border-purple-200">
            <span className="text-lg">&#x1f984;</span>
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-purple-700">AI Confidence</span>
                <span className="font-bold text-purple-700">{Math.round((extractedData.confidence || 0) * 100)}%</span>
              </div>
              <div className="h-2 bg-purple-100 rounded-full">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${(extractedData.confidence || 0) * 100}%`,
                    background: "linear-gradient(to right, #ec4899, #a855f7, #3b82f6)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Match alert */}
          {matchedEntry && (
            <div className="bg-gradient-to-r from-pink-100 to-purple-100 border border-pink-300 rounded-xl p-2.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">&#x1f3af;</span>
                <div className="flex-1">
                  <p className="font-bold text-purple-700 text-sm">Existing match found!</p>
                  <p className="text-purple-600 text-xs">{matchedEntry.restaurant_name} &mdash; {matchedEntry.neighborhood}</p>
                </div>
              </div>
            </div>
          )}

          {/* Photo strip: existing venue photos + captured photos + add button */}
          <div className="flex gap-2 overflow-x-auto items-center">
            {venuePhotos.map((photo) => (
              <img
                key={photo.id}
                src={photo.url}
                alt="Venue photo"
                className="w-20 h-20 object-cover rounded-xl border-2 border-purple-200 flex-shrink-0"
              />
            ))}
            {capturedImages.map((img, idx) => (
              <div key={`new-${idx}`} className="relative flex-shrink-0">
                <img
                  src={img}
                  alt={`Photo ${idx + 1}`}
                  className="w-20 h-20 object-cover rounded-xl border-2 border-pink-300 flex-shrink-0 shadow-md"
                />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full flex items-center justify-center shadow-md text-xs font-bold"
                >
                  &#x00d7;
                </button>
              </div>
            ))}
            <button
              onClick={() => resultPhotoInputRef.current?.click()}
              className="w-20 h-20 flex-shrink-0 border-2 border-dashed border-purple-300 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-purple-50 transition-colors"
            >
              <Plus size={20} className="text-purple-400" />
              <Camera size={14} className="text-purple-400" />
            </button>
            <input
              ref={resultPhotoInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleResultPhotoAdd}
              className="hidden"
            />
          </div>

          {/* Reprocess with AI button (when new photos added) */}
          {hasNewPhotos && imageFiles.length > 0 && (
            <button
              onClick={reprocessWithAI}
              className="w-full bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 text-white py-2.5 rounded-xl font-medium text-sm hover:from-pink-500 hover:via-purple-500 hover:to-blue-500 transition-all shadow-md flex items-center justify-center gap-2 min-h-[44px]"
            >
              <span>&#x1f984;</span>
              <span>Reprocess with AI ({imageFiles.length} new photo{imageFiles.length > 1 ? "s" : ""})</span>
              <span>&#x2728;</span>
            </button>
          )}

          {/* Restaurant Name */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-pink-200">
            <label className="text-[10px] font-semibold text-pink-600 uppercase tracking-wide">Restaurant</label>
            {isEditing ? (
              <input
                type="text"
                value={extractedData.restaurant_name}
                onChange={(e) => setExtractedData({ ...extractedData, restaurant_name: e.target.value })}
                className="w-full mt-1 p-2 border-2 border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-300 text-lg font-semibold"
              />
            ) : (
              <p className="text-lg font-semibold text-gray-900 mt-1">{extractedData.restaurant_name}</p>
            )}
            {extractedData.google_place?.neighborhood && (
              <p className="text-sm text-purple-600 mt-1">&#x1f4cd; {extractedData.google_place.neighborhood}</p>
            )}
          </div>

          {/* Deal Highlight & Category Emoji */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-orange-200">
            <label className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide">Pin Display</label>
            <div className="flex gap-2 mt-1">
              <div className="flex-1">
                <label className="text-[9px] text-gray-500">Price chip</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={extractedData.deal_highlight || ""}
                    onChange={(e) => setExtractedData({ ...extractedData, deal_highlight: e.target.value || null })}
                    placeholder="e.g. $5 margs"
                    className="w-full p-1.5 border border-orange-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200"
                    maxLength={16}
                  />
                ) : (
                  <p className="text-sm font-semibold text-gray-900">{extractedData.deal_highlight || "—"}</p>
                )}
              </div>
              <div className="w-20">
                <label className="text-[9px] text-gray-500">Emoji</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={extractedData.category_emoji || ""}
                    onChange={(e) => setExtractedData({ ...extractedData, category_emoji: e.target.value || null })}
                    placeholder="🍽️"
                    className="w-full p-1.5 border border-orange-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-orange-200"
                    maxLength={4}
                  />
                ) : (
                  <p className="text-2xl text-center">{extractedData.category_emoji || "🍽️"}</p>
                )}
              </div>
            </div>
          </div>

          {/* Deal Description */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-purple-200">
            <label className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide">Happy Hour Deal</label>
            {isEditing ? (
              <textarea
                value={extractedData.deal_description}
                onChange={(e) => setExtractedData({ ...extractedData, deal_description: e.target.value })}
                className="w-full mt-1 p-2 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-300 text-sm"
                rows={3}
              />
            ) : (
              <p className="text-sm text-gray-700 mt-1 leading-relaxed">{extractedData.deal_description}</p>
            )}
          </div>

          {/* Days */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-blue-200">
            <label className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1.5 block">Days Available</label>
            <div className="grid grid-cols-7 gap-1">
              {(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const).map((day) => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all ${
                    extractedData.days[day]
                      ? "bg-gradient-to-b from-pink-500 to-purple-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  }`}
                >
                  {day.slice(0, 3).toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Quick correction */}
          <CorrectionBox onSubmit={submitCorrection} />
        </div>

        {/* Fixed bottom submit */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-purple-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-1.5">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white py-3 rounded-xl font-bold text-base hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
          >
            <Check size={22} />
            <span>{isSubmitting ? "Saving..." : matchedEntry ? "Update This Deal" : "Add New Deal"}</span>
            <span>&#x1f984;</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setIsEditing(!isEditing); }}
              className="py-2 rounded-lg text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-all min-h-[44px]"
            >
              {isEditing ? "Done Editing" : "&#x270f;&#xfe0f; Edit Fields"}
            </button>
            <button
              onClick={resetApp}
              className="py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all flex items-center justify-center gap-1 min-h-[44px]"
            >
              <RotateCcw size={14} />
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================
  // VIEW: SUCCESS
  // ============================
  if (view === "success") {
    return (
      <div className="flex-1 bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Celebration sparkles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl animate-bounce opacity-30"
              style={{
                top: `${10 + Math.random() * 80}%`,
                left: `${5 + Math.random() * 90}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2.5 + Math.random() * 2}s`,
              }}
            >
              {i % 3 === 0 ? "\u2728" : i % 3 === 1 ? "\u{1f984}" : "\u{1f31f}"}
            </div>
          ))}
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 max-w-sm w-full text-center border-2 border-purple-300 relative z-10">
          <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-r from-pink-300 via-purple-300 to-blue-300 rounded-full flex items-center justify-center shadow-lg animate-bounce" style={{ animationDuration: "2s" }}>
            <span className="text-3xl">&#x1f984;</span>
          </div>

          <h2 className="text-xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Magical! &#x2728;
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            {matchedEntry ? "Updated" : "Added"} <strong>{extractedData?.restaurant_name}</strong>
            {extractedData?.google_place?.neighborhood && ` in ${extractedData.google_place.neighborhood}`}!
          </p>

          <div className="bg-gradient-to-r from-pink-50 via-purple-50 to-blue-50 rounded-xl p-3 border border-purple-200">
            <p className="text-xs text-purple-600">Thanks for helping build Atlanta&#x27;s best happy hour guide!</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Quick correction component
function CorrectionBox({ onSubmit }: { onSubmit: (feedback: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    await onSubmit(text);
    setText("");
    setSubmitting(false);
  };

  return (
    <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-3 border border-pink-200">
      <label className="text-[10px] font-semibold text-pink-600 uppercase tracking-wide mb-1.5 block">
        &#x1f984; Something wrong? Tell the AI
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="e.g. It's actually on Peachtree St..."
          className="flex-1 p-2 border border-pink-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-300 min-h-[44px]"
        />
        {text.trim() && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 transition-all min-h-[44px]"
          >
            {submitting ? "..." : "Fix"}
          </button>
        )}
      </div>
    </div>
  );
}
