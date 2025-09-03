"use client";

import { useEffect, useCallback } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ParkingImage {
  id: number;
  url: string;
  titulo: string | null;
  descripcion: string | null;
  principal: boolean;
  orden: number;
}

interface ImageGalleryModalProps {
  images: ParkingImage[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onImageChange: (index: number) => void;
  parkingName: string;
}

export function ImageGalleryModal({
  images,
  currentIndex,
  isOpen,
  onClose,
  onImageChange,
  parkingName
}: ImageGalleryModalProps) {
  
  const nextImage = useCallback(() => {
    if (images.length === 0) return;
    const nextIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
    onImageChange(nextIndex);
  }, [currentIndex, images.length, onImageChange]);

  const prevImage = useCallback(() => {
    if (images.length === 0) return;
    const prevIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    onImageChange(prevIndex);
  }, [currentIndex, images.length, onImageChange]);

  // Manejo de teclado
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (event.key) {
        case "ArrowLeft":
          prevImage();
          break;
        case "ArrowRight":
          nextImage();
          break;
        case "Escape":
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, nextImage, prevImage, onClose]);

  if (images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{parkingName}</h3>
              <p className="text-sm text-gray-600">
                {currentImage.titulo || `Imagen ${currentIndex + 1} de ${images.length}`}
              </p>
            </div>
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative flex-1 bg-black">
          {/* Imagen principal */}
          <div className="relative w-full h-full flex items-center justify-center">
            <Image
              src={currentImage.url}
              alt={currentImage.titulo || parkingName}
              fill
              className="object-contain"
              priority
            />
            
            {/* Controles de navegación */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all z-10"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all z-10"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Contador */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
              {currentIndex + 1} / {images.length}
            </div>
          </div>

          {/* Descripción de la imagen */}
          {currentImage.descripcion && (
            <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white p-3 rounded-lg">
              <p className="text-sm">{currentImage.descripcion}</p>
            </div>
          )}
        </div>

        {/* Miniaturas */}
        {images.length > 1 && (
          <div className="px-6 py-4 border-t bg-gray-50">
            <div className="flex gap-2 overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => onImageChange(index)}
                  className={`relative flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all ${
                    index === currentIndex ? "border-blue-500" : "border-gray-200"
                  }`}
                >
                  <Image
                    src={image.url}
                    alt={image.titulo || `Miniatura ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
