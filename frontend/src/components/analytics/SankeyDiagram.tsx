"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface SankeyNode {
  id: string;
  name: string;
  value: number;
  color?: string;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  conversion_rate: number;
  color?: string;
}

interface SankeyDiagramProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export function SankeyDiagram({ nodes, links }: SankeyDiagramProps) {
  const maxValue = Math.max(...nodes.map((n) => n.value), 1);
  const maxLinkValue = Math.max(...links.map((l) => l.value), 1);

  // Calcular posições dos nós (horizontal - da esquerda para direita)
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number; width: number; height: number }> = {};
    const nodeHeight = 60;
    const columnWidth = 180; // Espaçamento entre colunas
    const nodeMinWidth = 100;
    const nodeMaxWidth = 150;
    const svgWidth = 1200;
    const startX = 80;
    const centerY = 100; // Centro vertical do SVG
    
    nodes.forEach((node, index) => {
      const x = startX + (index * columnWidth);
      // Calcular largura baseada no valor (mas sempre mostrar mínimo)
      const width = node.value > 0 
        ? Math.max(nodeMinWidth, Math.min(nodeMaxWidth, (node.value / maxValue) * nodeMaxWidth + nodeMinWidth))
        : nodeMinWidth;
      
      positions[node.id] = {
        x,
        y: centerY - nodeHeight / 2,
        width,
        height: nodeHeight,
      };
    });

    return positions;
  }, [nodes, maxValue]);

  // Calcular caminhos dos links (horizontal flow)
  const linkPaths = useMemo(() => {
    return links.map((link) => {
      const source = nodePositions[link.source];
      const target = nodePositions[link.target];
      if (!source || !target) return null;

      const sourceX = source.x + source.width;
      const sourceY = source.y + source.height / 2;
      const targetX = target.x;
      const targetY = target.y + target.height / 2;

      // Criar curva bezier horizontal
      const controlX1 = sourceX + (targetX - sourceX) * 0.5;
      const controlX2 = sourceX + (targetX - sourceX) * 0.5;
      const controlY1 = sourceY;
      const controlY2 = targetY;

      const path = `M ${sourceX} ${sourceY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${targetX} ${targetY}`;

      // Largura do link baseada no valor
      const linkWidth = Math.max(2, Math.min(20, (link.value / maxLinkValue) * 20));

      return {
        path,
        value: link.value,
        color: link.color || "#94A3B8",
        conversion_rate: link.conversion_rate,
        source: link.source,
        target: link.target,
        width: linkWidth,
      };
    }).filter(Boolean);
  }, [links, nodePositions, maxLinkValue]);

  // Encontrar nomes dos nós para a legenda
  const nodeNames = useMemo(() => {
    const names: Record<string, string> = {};
    nodes.forEach((node) => {
      names[node.id] = node.name;
    });
    return names;
  }, [nodes]);

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <svg 
          width="100%" 
          height={250} 
          viewBox={`0 0 ${Math.max(1200, nodes.length * 180 + 160)} 250`}
          className="border rounded-lg bg-muted/20"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Links */}
          <g>
            {linkPaths.map((link, index) => (
              link && (
                <g key={index}>
                  <path
                    d={link.path}
                    stroke={link.color}
                    strokeWidth={link.width}
                    fill="none"
                    opacity={0.7}
                    className="cursor-pointer hover:opacity-100 transition-opacity"
                  >
                    <title>
                      {nodeNames[link.source] || link.source} → {nodeNames[link.target] || link.target}
                      {"\n"}Volume: {link.value}
                      {"\n"}Conversão: {link.conversion_rate.toFixed(1)}%
                    </title>
                  </path>
                </g>
              )
            ))}
          </g>

          {/* Nodes */}
          <g>
            {nodes.map((node) => {
              const pos = nodePositions[node.id];
              if (!pos) return null;

              return (
                <g key={node.id}>
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={pos.width}
                  height={pos.height}
                  fill={node.value > 0 ? (node.color || "#3B82F6") : "#94A3B8"}
                  rx={6}
                  opacity={node.value > 0 ? 1 : 0.5}
                  className="drop-shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                  stroke={node.value === 0 ? "#64748B" : "none"}
                  strokeWidth={node.value === 0 ? 2 : 0}
                  strokeDasharray={node.value === 0 ? "4 4" : "none"}
                >
                  <title>
                    {node.name}
                    {"\n"}Volume: {node.value}
                    {node.value === 0 && "\n(Sem dados no período)"}
                  </title>
                </rect>
                <text
                  x={pos.x + pos.width / 2}
                  y={pos.y + pos.height / 2 - 8}
                  textAnchor="middle"
                  className={`text-xs font-semibold ${node.value > 0 ? "fill-white" : "fill-muted-foreground"}`}
                  dominantBaseline="middle"
                >
                  {node.name}
                </text>
                <text
                  x={pos.x + pos.width / 2}
                  y={pos.y + pos.height / 2 + 10}
                  textAnchor="middle"
                  className={`text-sm ${node.value > 0 ? "fill-white/90 font-bold" : "fill-muted-foreground"}`}
                  dominantBaseline="middle"
                >
                  {node.value > 0 ? node.value : "—"}
                </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Legenda de conversão */}
      {links.length > 0 && (
        <div className="mt-4 p-4 bg-muted/30 rounded-lg">
          <h4 className="text-sm font-semibold mb-3">Taxa de Conversão</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {links.map((link, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-6 h-1.5 rounded"
                  style={{ backgroundColor: link.color || "#94A3B8" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {nodeNames[link.source] || link.source} → {nodeNames[link.target] || link.target}
                  </div>
                  <div className="text-muted-foreground">
                    {link.value} deals • {link.conversion_rate.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Resumo */}
      {nodes.length > 0 && (
        <div className="mt-4 p-4 bg-muted/20 rounded-lg">
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total na primeira etapa:</span>
              <span className="font-semibold">{nodes[0]?.value || 0}</span>
            </div>
            {nodes.length > 1 && nodes[0]?.value > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Total na última etapa:</span>
                  <span className="font-semibold">{nodes[nodes.length - 1]?.value || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Conversão geral:</span>
                  <span className="font-semibold text-primary">
                    {((nodes[nodes.length - 1]?.value || 0) / nodes[0].value * 100).toFixed(1)}%
                  </span>
                </div>
              </>
            )}
            {links.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Transições:</span>
                <span className="font-semibold">{links.length}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

