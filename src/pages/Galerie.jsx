import React, { useState } from "react";
import { Images, X, ChevronLeft, ChevronRight } from "lucide-react";

const GALLERY_IMAGES = [
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/-kGDe3izcVAGxhL5.png",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/8eHMuvp1JrHFArYb.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/WC9Ehybfb6wLF10a.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/S6bYAq2AikgyAHCL.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/3fIbY99nm1IQmKyq.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/o1hgaYNv1W1aUiW6.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/CV8B4WwWhS0UX8hR.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/gcpf22QX2RT8KAGf.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/Wo3ZJVsQkRkBt4hZ.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/1V-PvmbaF94kCoAu.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/3tbFK9_FcBKwUYmT.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/Hf8hXaLz_1yoJeQy.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/tBG1fpTNxBWlGJ1O.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/6muBCyZ0reo-_j6v.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/JCPauVhOo37d1z3X.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/fHSMwmkdvkPpZzkL.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/w6aNoEt8FJTP-x4D.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/xh-FjlKX97LinPwk.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/JHb7iMyJdjaJaOPI.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/8Db_CVRROp-eG9ba.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/EZRogsyfS0B9uz3A.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/kjrhDXBvHF8IOg-h.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/NUTCxItoXKZixRM9.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/x7jxGFA0sGoskhiY.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/JB6WSpFAHA4AJpnz.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/A_ktVPd1LLBz49ha.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/nxkMCIFmxHkNGm6E.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/xEw6PT7bGCrhnpDr.jpg",
  "https://kkpmvhimcudogimoqixi.supabase.co/storage/v1/object/public/gallery/cmrr7r2or0064tes70vhhp9ws/aoCx0p9pk8M18E9b.jpg",
];

export default function Galerie() {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const openLightbox = (index) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prevImage = () => setLightboxIndex((i) => (i === 0 ? GALLERY_IMAGES.length - 1 : i - 1));
  const nextImage = () => setLightboxIndex((i) => (i === GALLERY_IMAGES.length - 1 ? 0 : i + 1));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-lg">
            <Images className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Galerie</h1>
            <p className="text-sm text-muted-foreground">Photos des activités de COACUM</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{GALLERY_IMAGES.length} photos</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {GALLERY_IMAGES.map((url, index) => (
          <button
            key={index}
            onClick={() => openLightbox(index)}
            className="group relative aspect-square overflow-hidden rounded-xl bg-muted cursor-pointer"
          >
            <img
              src={url}
              alt={`Galerie COACUM ${index + 1}`}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
            className="absolute left-2 sm:left-4 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <img
            src={GALLERY_IMAGES[lightboxIndex]}
            alt={`Galerie COACUM ${lightboxIndex + 1}`}
            className="max-w-[85vw] max-h-[85vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
            className="absolute right-2 sm:right-4 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {lightboxIndex + 1} / {GALLERY_IMAGES.length}
          </span>
        </div>
      )}
    </div>
  );
}