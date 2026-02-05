"use client";

import { ChevronUp, ChevronDown, Pencil, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LandingSection, SectionType } from "../landing-section-types";
import { SECTION_TYPE_LABELS, sectionPreview } from "../landing-section-types";

type Props = {
  sections: LandingSection[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  onReorder: (from: number, dir: 1 | -1) => void;
  onRemove: (index: number) => void;
  onDrop: (type: SectionType, index?: number) => void;
  onEdit: (index: number) => void;
};

export function BuilderCanvas({
  sections,
  selectedIndex,
  onSelect,
  onReorder,
  onRemove,
  onDrop,
  onEdit,
}: Props) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent, index?: number) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/widget-type") as SectionType | "";
    if (type && Object.keys(SECTION_TYPE_LABELS).includes(type)) {
      onDrop(type as SectionType, index);
    }
  };

  return (
    <div
      className="flex-1 overflow-y-auto bg-slate-800/30 p-6"
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e)}
    >
      <div className="mx-auto max-w-3xl space-y-2">
        {sections.length === 0 ? (
          <div
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e)}
            className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/50 py-12 text-center"
          >
            <div className="mb-2 flex gap-1">
              <span className="h-2 w-2 rounded-full bg-slate-500" />
              <span className="h-2 w-2 rounded-full bg-slate-500" />
              <span className="h-2 w-2 rounded-full bg-cyan-500" />
            </div>
            <p className="text-slate-400">Arraste o widget aqui</p>
            <p className="mt-1 text-sm text-slate-500">
              Ou escolha um modelo acima para começar
            </p>
          </div>
        ) : (
          sections.map((section, index) => (
            <div
              key={section.id}
              draggable
              onDragOver={(e) => {
                e.stopPropagation();
                handleDragOver(e);
              }}
              onDrop={(e) => {
                e.stopPropagation();
                handleDrop(e, index);
              }}
              onClick={() => onSelect(index)}
              className={`group flex items-center gap-2 rounded-lg border-2 bg-slate-800/80 p-2 transition-colors ${
                selectedIndex === index
                  ? "border-cyan-500 ring-1 ring-cyan-500/30"
                  : "border-transparent hover:border-slate-600"
              }`}
            >
              <div className="flex shrink-0 items-center gap-1 text-slate-500">
                <GripVertical className="h-4 w-4 cursor-grab active:cursor-grabbing" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReorder(index, -1);
                  }}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReorder(index, 1);
                  }}
                  disabled={index === sections.length - 1}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-slate-200">
                  {SECTION_TYPE_LABELS[section.type]}
                </span>
                <span className="ml-2 truncate text-sm text-slate-500">
                  {sectionPreview(section)}
                </span>
              </div>
              <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(index);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(index);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
