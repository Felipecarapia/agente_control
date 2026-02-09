"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, GripVertical } from "lucide-react";

type TaskBlock = {
  id?: string;
  type: string;
  content_json?: any;
  order_index: number;
};

interface BlockEditorProps {
  blocks: TaskBlock[];
  onChange: (blocks: TaskBlock[]) => void;
}

export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const [showCommand, setShowCommand] = useState(false);

  function addBlock(type: string) {
    const newBlock: TaskBlock = {
      type,
      content_json: { text: "" },
      order_index: blocks.length,
    };
    onChange([...blocks, newBlock]);
    setShowCommand(false);
  }

  function updateBlock(index: number, content: any) {
    const updated = [...blocks];
    updated[index] = { ...updated[index], content_json: content };
    onChange(updated);
  }

  function deleteBlock(index: number) {
    const updated = blocks.filter((_, i) => i !== index);
    onChange(updated);
  }

  function renderBlock(block: TaskBlock, index: number) {
    const content = block.content_json || {};

    switch (block.type) {
      case "PARAGRAPH":
        return (
          <div key={index} className="flex items-start gap-2 group">
            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
            <Textarea
              value={content.text || ""}
              onChange={(e) =>
                updateBlock(index, { ...content, text: e.target.value })
              }
              placeholder="Digite / para comandos"
              className="min-h-[60px] resize-none"
            />
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => deleteBlock(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );

      case "HEADING":
        return (
          <div key={index} className="flex items-start gap-2 group">
            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
            <Input
              value={content.text || ""}
              onChange={(e) =>
                updateBlock(index, { ...content, text: e.target.value })
              }
              placeholder="Título"
              className="text-xl font-bold"
            />
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => deleteBlock(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );

      case "BULLET_LIST":
        return (
          <div key={index} className="flex items-start gap-2 group">
            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
            <div className="flex-1 space-y-1">
              {Array.isArray(content.items) ? (
                content.items.map((item: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-muted-foreground">•</span>
                    <Input
                      value={item}
                      onChange={(e) => {
                        const items = [...content.items];
                        items[i] = e.target.value;
                        updateBlock(index, { ...content, items });
                      }}
                      placeholder="Item da lista"
                    />
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">•</span>
                  <Input
                    placeholder="Item da lista"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        updateBlock(index, {
                          ...content,
                          items: [e.currentTarget.value],
                        });
                      }
                    }}
                  />
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => deleteBlock(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );

      case "CHECKLIST":
        return (
          <div key={index} className="flex items-start gap-2 group">
            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
            <div className="flex-1 space-y-1">
              {Array.isArray(content.items) ? (
                content.items.map((item: { text: string; checked: boolean }, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.checked || false}
                      onChange={(e) => {
                        const items = [...content.items];
                        items[i] = { ...item, checked: e.target.checked };
                        updateBlock(index, { ...content, items });
                      }}
                    />
                    <Input
                      value={item.text}
                      onChange={(e) => {
                        const items = [...content.items];
                        items[i] = { ...item, text: e.target.value };
                        updateBlock(index, { ...content, items });
                      }}
                      placeholder="Item do checklist"
                    />
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2">
                  <input type="checkbox" />
                  <Input
                    placeholder="Item do checklist"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        updateBlock(index, {
                          ...content,
                          items: [{ text: e.currentTarget.value, checked: false }],
                        });
                      }
                    }}
                  />
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => deleteBlock(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );

      case "DIVIDER":
        return (
          <div key={index} className="flex items-center gap-2 group">
            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex-1 border-t" />
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => deleteBlock(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => (
        <div key={index}>{renderBlock(block, index)}</div>
      ))}

      <div className="relative">
        {showCommand ? (
          <div className="border rounded-lg p-2 space-y-1 bg-background shadow-lg">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => addBlock("PARAGRAPH")}
            >
              Parágrafo
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => addBlock("HEADING")}
            >
              Título
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => addBlock("BULLET_LIST")}
            >
              Lista
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => addBlock("CHECKLIST")}
            >
              Checklist
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => addBlock("DIVIDER")}
            >
              Divisor
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowCommand(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar bloco (digite /)
          </Button>
        )}
      </div>
    </div>
  );
}




