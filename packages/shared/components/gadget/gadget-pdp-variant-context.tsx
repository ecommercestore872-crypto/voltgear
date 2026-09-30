"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type PdpGalleryVariantImage = {
  src: string;
  thumb: string;
  alt: string;
};

type Ctx = {
  variantImage: PdpGalleryVariantImage | null;
  setVariantImage: (image: PdpGalleryVariantImage | null) => void;
};

const GadgetPdpVariantContext = createContext<Ctx | null>(null);

export function GadgetPdpVariantProvider({ children }: { children: ReactNode }) {
  const [variantImage, setVariantImage] =
    useState<PdpGalleryVariantImage | null>(null);
  const value = useMemo(
    () => ({ variantImage, setVariantImage }),
    [variantImage],
  );
  return (
    <GadgetPdpVariantContext.Provider value={value}>
      {children}
    </GadgetPdpVariantContext.Provider>
  );
}

export function useGadgetPdpVariantImage() {
  const ctx = useContext(GadgetPdpVariantContext);
  if (!ctx) {
    throw new Error("useGadgetPdpVariantImage requires GadgetPdpVariantProvider");
  }
  return ctx;
}

export function useOptionalGadgetPdpVariantImage() {
  return useContext(GadgetPdpVariantContext);
}
