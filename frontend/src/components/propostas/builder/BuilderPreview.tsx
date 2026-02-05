"use client";

import type { LandingSection, SectionType } from "../landing-section-types";
import { SECTION_TYPE_LABELS } from "../landing-section-types";
import { LandingSectionRenderer } from "../landing";

type Props = {
  sections: LandingSection[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  onEdit: (index: number) => void;
  onDrop: (type: SectionType, index?: number) => void;
};

export function BuilderPreview({
  sections,
  selectedIndex,
  onSelect,
  onEdit,
  onDrop,
}: Props) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent, index?: number) => {
    e.preventDefault();
    e.stopPropagation();
    const type = e.dataTransfer.getData("application/widget-type") as SectionType | "";
    if (type && Object.keys(SECTION_TYPE_LABELS).includes(type)) {
      onDrop(type as SectionType, index);
    }
  };

  const dropZone = (index?: number) => (
    <div
      key={index ?? "top"}
      className="min-h-[48px] border-2 border-dashed border-slate-500/50 rounded-lg flex items-center justify-center text-slate-500 text-sm hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-colors"
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, index)}
    >
      Solte aqui para adicionar
    </div>
  );

  return (
    <div
      className="flex-1 min-h-0 h-full overflow-y-auto overflow-x-hidden bg-slate-700/30 flex justify-center p-6"
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e)}
    >
      {/* Área da prévia (como página real, fundo branco no centro) */}
      <div className="w-full max-w-4xl min-h-full bg-white shadow-2xl rounded-lg overflow-visible shrink-0">
        {sections.length === 0 ? (
          <div
            className="flex min-h-[400px] flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 text-slate-500"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e)}
          >
            <div className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              <span className="h-2 w-2 rounded-full bg-cyan-500" />
            </div>
            <p className="font-medium">Arraste o widget aqui</p>
            <p className="text-sm">Ou escolha um modelo no topo para começar</p>
          </div>
        ) : (
          <>
            {dropZone(0)}
            {sections.map((section, index) => (
              <div key={section.id} className="relative group">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    onSelect(index);
                    onEdit(index);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && (onSelect(index), onEdit(index))}
                  className={`cursor-pointer outline-none transition-all ${
                    selectedIndex === index
                      ? "ring-2 ring-cyan-500 ring-inset"
                      : "hover:ring-2 hover:ring-cyan-500/50 ring-inset"
                  }`}
                >
                  <LandingSectionRenderer section={section} />
                </div>
                {index < sections.length - 1 && dropZone(index + 1)}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
