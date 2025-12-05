"use client";

import React from "react";
import { createPortal } from "react-dom";

type Coords = { top: number; left: number };

type Props = {
  id: string;
  coords: Coords | null;
  width?: number;
  className?: string;
  children?: React.ReactNode;
};

export default function ParticipantMenuPortal({
  id,
  coords,
  width = 176,
  className = "",
  children,
}: Props) {
  if (!coords) return null;

  return createPortal(
    <div
      id={`participants-portal-menu-${id}`}
      style={{ position: "fixed", top: coords.top, left: coords.left, width }}
      className={`z-[9999] rounded-md bg-slate-900 border border-slate-700 shadow-lg py-1 pointer-events-auto ${className}`}
      role="menu"
    >
      {children}
    </div>,
    document.body
  );
}
