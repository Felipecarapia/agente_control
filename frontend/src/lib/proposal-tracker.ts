/**
 * Proposal Tracker - Sistema de tracking completo para propostas
 * 
 * Eventos trackeados:
 * - proposal_open: Abertura da proposta
 * - scroll: Eventos em 25%, 50%, 75%, 100% + scroll reverso
 * - section_view: Quando seção entra no viewport
 * - section_leave: Quando seção sai do viewport (com tempo visível)
 * - click: Cliques em elementos
 * - cta_click: Cliques em CTAs
 * - whatsapp_click: Cliques em botão WhatsApp
 * - faq_open: Abertura de FAQ
 * - faq_close: Fechamento de FAQ
 * - exit_intent: Intenção de saída
 * - inactive: Inatividade detectada
 * - first_interaction: Primeira interação
 * - session_end: Fim da sessão
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ============== Tipos ==============

interface TrackerConfig {
  slug: string;
  inactivityTimeout?: number; // ms, default 30000
  scrollThresholds?: number[]; // default [25, 50, 75, 100]
  batchInterval?: number; // ms para envio em batch, default 5000
  debug?: boolean;
  scrollContainer?: HTMLElement | null; // Container com scroll (se não for window)
}

interface TrackerEvent {
  event_type: string;
  element_id?: string;
  section_id?: string;
  section_type?: string;
  value?: number;
  value_string?: string;
  metadata?: Record<string, unknown>;
  scroll_position?: number;
  viewport_height?: number;
  client_timestamp?: string;
}

interface DeviceInfo {
  device_type: "mobile" | "desktop" | "tablet";
  browser: string;
  os: string;
  screen_width: number;
  screen_height: number;
}

// ============== Utilidades ==============

function generateSessionId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateDeviceId(): string {
  // Fingerprint leve sem PII
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("fingerprint", 0, 0);
  }
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
  ].join("|");
  
  // Hash simples
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;
  
  // Detectar tipo de dispositivo
  let device_type: "mobile" | "desktop" | "tablet" = "desktop";
  if (/Tablet|iPad/i.test(ua)) {
    device_type = "tablet";
  } else if (/Mobile|Android|iPhone/i.test(ua)) {
    device_type = "mobile";
  }
  
  // Detectar browser
  let browser = "unknown";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edge")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Opera")) browser = "Opera";
  
  // Detectar OS
  let os = "unknown";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  
  return {
    device_type,
    browser,
    os,
    screen_width: window.screen.width,
    screen_height: window.screen.height,
  };
}

function getUTMParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
  };
}

// ============== Classe Principal ==============

export class ProposalTracker {
  private slug: string;
  private sessionId: string;
  private deviceId: string;
  private sessionStartTime: number;
  private lastActivityTime: number;
  private isSessionStarted: boolean = false;
  private isSessionCreatedOnServer: boolean = false;
  private hasFirstInteraction: boolean = false;
  
  // Configurações
  private inactivityTimeout: number;
  private scrollThresholds: number[];
  private batchInterval: number;
  private debug: boolean;
  private scrollContainer: HTMLElement | null = null;
  
  // Estado de scroll
  private scrollMilestones: Set<number> = new Set();
  private lastScrollY: number = 0;
  private maxScrollPercent: number = 0;
  
  // Estado de seções
  private sectionObserver: IntersectionObserver | null = null;
  private sectionVisibility: Map<string, { visible: boolean; startTime: number; totalTime: number }> = new Map();
  private sectionsViewedOrder: string[] = [];
  
  // Estado de FAQ
  private openFAQs: Map<string, { question: string; startTime: number }> = new Map();
  
  // Estado de inatividade
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private isInactive: boolean = false;
  
  // Batch de eventos
  private eventQueue: TrackerEvent[] = [];
  private batchTimer: ReturnType<typeof setInterval> | null = null;
  
  // Contadores
  private totalClicks: number = 0;
  private sectionsViewed: number = 0;
  
  constructor(config: TrackerConfig) {
    this.slug = config.slug;
    this.sessionId = this.getOrCreateSessionId();
    this.deviceId = this.getOrCreateDeviceId();
    this.sessionStartTime = Date.now();
    this.lastActivityTime = Date.now();
    
    this.inactivityTimeout = config.inactivityTimeout ?? 30000;
    this.scrollThresholds = config.scrollThresholds ?? [25, 50, 75, 100];
    this.batchInterval = config.batchInterval ?? 5000;
    this.debug = config.debug ?? false;
    this.scrollContainer = config.scrollContainer ?? null;
  }
  
  public setScrollContainer(container: HTMLElement | null): void {
    this.scrollContainer = container;
  }
  
  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log("[ProposalTracker]", ...args);
    }
  }
  
  private getOrCreateSessionId(): string {
    const stored = sessionStorage.getItem(`tracker_session_${this.slug}`);
    if (stored) return stored;
    const id = generateSessionId();
    sessionStorage.setItem(`tracker_session_${this.slug}`, id);
    return id;
  }
  
  private getOrCreateDeviceId(): string {
    const stored = localStorage.getItem("tracker_device_id");
    if (stored) return stored;
    const id = generateDeviceId();
    localStorage.setItem("tracker_device_id", id);
    return id;
  }
  
  // ============== API Calls ==============
  
  private async startSessionAPI(): Promise<boolean> {
    const deviceInfo = getDeviceInfo();
    const utmParams = getUTMParams();
    
    try {
      const response = await fetch(`${API_URL}/api/v1/tracking/proposals/${this.slug}/session/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: this.sessionId,
          device_id: this.deviceId,
          device_type: deviceInfo.device_type,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          screen_width: deviceInfo.screen_width,
          screen_height: deviceInfo.screen_height,
          referrer: document.referrer || null,
          utm_source: utmParams.utm_source || null,
          utm_medium: utmParams.utm_medium || null,
          utm_campaign: utmParams.utm_campaign || null,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      this.isSessionCreatedOnServer = true;
      this.log("Sessão iniciada:", this.sessionId);
      return true;
    } catch (error) {
      console.error("[ProposalTracker] Erro ao iniciar sessão:", error);
      return false;
    }
  }
  
  private async sendEvent(event: TrackerEvent): Promise<void> {
    try {
      await fetch(`${API_URL}/api/v1/tracking/proposals/${this.slug}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: this.sessionId,
          ...event,
          client_timestamp: event.client_timestamp || new Date().toISOString(),
        }),
      });
      this.log("Evento enviado:", event.event_type);
    } catch (error) {
      console.error("[ProposalTracker] Erro ao enviar evento:", error);
    }
  }
  
  private async sendBatchEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    if (!this.isSessionCreatedOnServer) {
      this.log("Sessão não criada no servidor, ignorando batch");
      return;
    }
    
    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    try {
      await fetch(`${API_URL}/api/v1/tracking/proposals/${this.slug}/events/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: this.sessionId,
          events: events.map(e => ({
            ...e,
            client_timestamp: e.client_timestamp || new Date().toISOString(),
          })),
        }),
      });
      this.log("Batch enviado:", events.length, "eventos");
    } catch (error) {
      console.error("[ProposalTracker] Erro ao enviar batch:", error);
      // Re-adiciona eventos na fila em caso de erro
      this.eventQueue.unshift(...events);
    }
  }
  
  private async endSessionAPI(): Promise<void> {
    // Enviar eventos pendentes
    await this.sendBatchEvents();
    
    const duration = (Date.now() - this.sessionStartTime) / 1000;
    
    try {
      await fetch(`${API_URL}/api/v1/tracking/proposals/${this.slug}/session/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: this.sessionId,
          duration_seconds: duration,
          max_scroll_percent: this.maxScrollPercent,
          total_clicks: this.totalClicks,
          sections_viewed: this.sectionsViewed,
        }),
      });
      this.log("Sessão finalizada, duração:", duration, "s");
    } catch (error) {
      console.error("[ProposalTracker] Erro ao finalizar sessão:", error);
    }
  }
  
  // ============== Queue de Eventos ==============
  
  private queueEvent(event: TrackerEvent): void {
    this.eventQueue.push({
      ...event,
      client_timestamp: new Date().toISOString(),
      scroll_position: window.scrollY,
      viewport_height: window.innerHeight,
    });
    
    // Eventos críticos são enviados imediatamente
    if (["cta_click", "whatsapp_click", "exit_intent"].includes(event.event_type)) {
      this.sendBatchEvents();
    }
  }
  
  // ============== Handlers de Eventos ==============
  
  private handleScroll = (): void => {
    this.recordActivity();
    
    // Determinar scroll baseado no container ou window
    let scrollTop: number;
    let scrollHeight: number;
    let clientHeight: number;
    
    if (this.scrollContainer) {
      scrollTop = this.scrollContainer.scrollTop;
      scrollHeight = this.scrollContainer.scrollHeight;
      clientHeight = this.scrollContainer.clientHeight;
    } else {
      scrollTop = window.scrollY;
      scrollHeight = document.documentElement.scrollHeight;
      clientHeight = window.innerHeight;
    }
    
    const maxScroll = scrollHeight - clientHeight;
    const scrollPercent = maxScroll > 0 ? Math.round((scrollTop / maxScroll) * 100) : 0;
    
    // Detectar scroll reverso
    const isScrollingUp = scrollTop < this.lastScrollY;
    if (isScrollingUp && this.lastScrollY - scrollTop > 100) {
      this.queueEvent({
        event_type: "scroll",
        value: scrollPercent,
        metadata: { direction: "up", from: this.lastScrollY, to: scrollTop },
      });
    }
    
    this.lastScrollY = scrollTop;
    
    // Atualizar máximo
    if (scrollPercent > this.maxScrollPercent) {
      this.maxScrollPercent = scrollPercent;
    }
    
    // Registrar milestones
    for (const threshold of this.scrollThresholds) {
      if (scrollPercent >= threshold && !this.scrollMilestones.has(threshold)) {
        this.scrollMilestones.add(threshold);
        this.queueEvent({
          event_type: "scroll",
          value: threshold,
          metadata: { milestone: true, direction: "down" },
        });
        this.log(`Scroll milestone: ${threshold}%`);
      }
    }
  };
  
  private handleClick = (e: MouseEvent): void => {
    this.recordActivity();
    this.totalClicks++;
    
    const target = e.target as HTMLElement;
    const elementId = target.id || target.closest("[id]")?.id || null;
    const sectionEl = target.closest("[data-section-id]") as HTMLElement | null;
    const sectionId = sectionEl?.dataset.sectionId || null;
    const sectionType = sectionEl?.dataset.sectionType || null;
    
    // Detectar tipo de clique
    let eventType = "click";
    
    // CTA
    if (target.closest("[data-cta]") || target.closest("a[href*='#'], button.cta, .cta-button")) {
      eventType = "cta_click";
    }
    
    // WhatsApp
    if (target.closest("a[href*='whatsapp'], a[href*='wa.me'], [data-whatsapp]")) {
      eventType = "whatsapp_click";
    }
    
    // Link externo
    const link = target.closest("a") as HTMLAnchorElement | null;
    const isExternalLink = link && link.hostname !== window.location.hostname;
    
    this.queueEvent({
      event_type: eventType,
      element_id: elementId || undefined,
      section_id: sectionId || undefined,
      section_type: sectionType || undefined,
      metadata: {
        tag: target.tagName.toLowerCase(),
        text: target.textContent?.slice(0, 100),
        href: link?.href,
        is_external: isExternalLink,
      },
    });
  };
  
  private handleMouseLeave = (e: MouseEvent): void => {
    // Exit intent: mouse saiu pela parte superior da viewport
    if (e.clientY <= 0) {
      const currentSection = this.getCurrentVisibleSection();
      this.queueEvent({
        event_type: "exit_intent",
        section_id: currentSection?.id || undefined,
        section_type: currentSection?.type || undefined,
        metadata: {
          time_on_page: (Date.now() - this.sessionStartTime) / 1000,
          scroll_percent: this.maxScrollPercent,
        },
      });
      this.log("Exit intent detectado");
    }
  };
  
  private handleVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") {
      // Página ficou oculta (tab switch ou fechamento)
      this.queueEvent({
        event_type: "tab_hidden",
        metadata: {
          time_on_page: (Date.now() - this.sessionStartTime) / 1000,
          scroll_percent: this.maxScrollPercent,
        },
      });
      this.sendBatchEvents();
    } else {
      // Página voltou a ser visível
      this.queueEvent({ event_type: "tab_visible" });
    }
  };
  
  private handleBeforeUnload = (): void => {
    // Usar sendBeacon para garantir envio mesmo no fechamento
    const duration = (Date.now() - this.sessionStartTime) / 1000;
    
    const data = JSON.stringify({
      session_id: this.sessionId,
      duration_seconds: duration,
      max_scroll_percent: this.maxScrollPercent,
      total_clicks: this.totalClicks,
      sections_viewed: this.sectionsViewed,
    });
    
    // Usar Blob com tipo correto para sendBeacon funcionar com JSON
    const blob = new Blob([data], { type: "application/json" });
    navigator.sendBeacon(
      `${API_URL}/api/v1/tracking/proposals/${this.slug}/session/end`,
      blob
    );
  };
  
  // ============== Seções (Intersection Observer) ==============
  
  private setupSectionObserver(): void {
    this.sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sectionId = (entry.target as HTMLElement).dataset.sectionId;
          const sectionType = (entry.target as HTMLElement).dataset.sectionType;
          
          if (!sectionId) return;
          
          const current = this.sectionVisibility.get(sectionId) || {
            visible: false,
            startTime: 0,
            totalTime: 0,
          };
          
          if (entry.isIntersecting && !current.visible) {
            // Seção entrou no viewport
            this.sectionVisibility.set(sectionId, {
              ...current,
              visible: true,
              startTime: Date.now(),
            });
            
            if (!this.sectionsViewedOrder.includes(sectionId)) {
              this.sectionsViewedOrder.push(sectionId);
              this.sectionsViewed++;
            }
            
            this.queueEvent({
              event_type: "section_view",
              section_id: sectionId,
              section_type: sectionType || undefined,
              metadata: { order: this.sectionsViewedOrder.indexOf(sectionId) + 1 },
            });
            
            this.log("Seção visível:", sectionId);
          } else if (!entry.isIntersecting && current.visible) {
            // Seção saiu do viewport
            const timeVisible = (Date.now() - current.startTime) / 1000;
            
            this.sectionVisibility.set(sectionId, {
              visible: false,
              startTime: 0,
              totalTime: current.totalTime + timeVisible,
            });
            
            this.queueEvent({
              event_type: "section_leave",
              section_id: sectionId,
              section_type: sectionType || undefined,
              value: timeVisible,
              metadata: { total_time: current.totalTime + timeVisible },
            });
            
            this.log("Seção saiu:", sectionId, "tempo:", timeVisible, "s");
          }
        });
      },
      {
        threshold: [0.3], // Considerar visível quando 30% está na viewport
        rootMargin: "0px",
      }
    );
    
    // Observar todas as seções
    document.querySelectorAll("[data-section-id]").forEach((el) => {
      this.sectionObserver?.observe(el);
    });
  }
  
  private getCurrentVisibleSection(): { id: string; type: string | null } | null {
    for (const [id, state] of this.sectionVisibility.entries()) {
      if (state.visible) {
        const el = document.querySelector(`[data-section-id="${id}"]`) as HTMLElement | null;
        return { id, type: el?.dataset.sectionType || null };
      }
    }
    return null;
  }
  
  // ============== FAQ Tracking ==============
  
  public trackFAQOpen(questionId: string, questionText: string): void {
    this.recordActivity();
    
    this.openFAQs.set(questionId, {
      question: questionText,
      startTime: Date.now(),
    });
    
    this.queueEvent({
      event_type: "faq_open",
      element_id: questionId,
      value_string: questionText.slice(0, 200),
      metadata: { open_faqs_count: this.openFAQs.size },
    });
    
    this.log("FAQ aberto:", questionId);
  }
  
  public trackFAQClose(questionId: string): void {
    this.recordActivity();
    
    const faq = this.openFAQs.get(questionId);
    if (faq) {
      const timeOpen = (Date.now() - faq.startTime) / 1000;
      
      this.queueEvent({
        event_type: "faq_close",
        element_id: questionId,
        value: timeOpen,
        value_string: faq.question.slice(0, 200),
      });
      
      this.openFAQs.delete(questionId);
      this.log("FAQ fechado:", questionId, "tempo aberto:", timeOpen, "s");
    }
  }
  
  // ============== Inatividade ==============
  
  private recordActivity(): void {
    this.lastActivityTime = Date.now();
    
    // Primeira interação
    if (!this.hasFirstInteraction) {
      this.hasFirstInteraction = true;
      const timeToFirst = (Date.now() - this.sessionStartTime) / 1000;
      
      this.queueEvent({
        event_type: "first_interaction",
        value: timeToFirst,
      });
      
      this.log("Primeira interação após", timeToFirst, "s");
    }
    
    // Reset timer de inatividade
    if (this.isInactive) {
      this.isInactive = false;
      this.queueEvent({ event_type: "activity_resumed" });
    }
    
    this.resetInactivityTimer();
  }
  
  private resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    
    this.inactivityTimer = setTimeout(() => {
      if (!this.isInactive) {
        this.isInactive = true;
        
        const currentSection = this.getCurrentVisibleSection();
        
        this.queueEvent({
          event_type: "inactive",
          section_id: currentSection?.id || undefined,
          section_type: currentSection?.type || undefined,
          value: this.inactivityTimeout / 1000,
          metadata: {
            last_scroll_percent: this.maxScrollPercent,
            time_on_page: (Date.now() - this.sessionStartTime) / 1000,
          },
        });
        
        this.log("Inatividade detectada após", this.inactivityTimeout / 1000, "s");
      }
    }, this.inactivityTimeout);
  }
  
  // ============== Lifecycle ==============
  
  public async start(): Promise<void> {
    if (this.isSessionStarted) return;
    this.isSessionStarted = true;
    
    // Iniciar sessão no backend
    await this.startSessionAPI();
    
    // Event listeners - scroll no container ou window
    const scrollTarget = this.scrollContainer || window;
    scrollTarget.addEventListener("scroll", this.handleScroll, { passive: true });
    
    document.addEventListener("click", this.handleClick);
    document.addEventListener("mouseleave", this.handleMouseLeave);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("beforeunload", this.handleBeforeUnload);
    
    // Setup seções
    this.setupSectionObserver();
    
    // Timer de batch
    this.batchTimer = setInterval(() => {
      this.sendBatchEvents();
    }, this.batchInterval);
    
    // Timer de inatividade
    this.resetInactivityTimer();
    
    this.log("Tracker iniciado para", this.slug);
  }
  
  public async stop(): Promise<void> {
    if (!this.isSessionStarted) return;
    
    // Remove listeners
    const scrollTarget = this.scrollContainer || window;
    scrollTarget.removeEventListener("scroll", this.handleScroll);
    document.removeEventListener("click", this.handleClick);
    document.removeEventListener("mouseleave", this.handleMouseLeave);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    window.removeEventListener("beforeunload", this.handleBeforeUnload);
    
    // Stop observers
    this.sectionObserver?.disconnect();
    
    // Clear timers
    if (this.batchTimer) clearInterval(this.batchTimer);
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    
    // Finalizar sessão
    await this.endSessionAPI();
    
    this.isSessionStarted = false;
    this.log("Tracker parado");
  }
  
  // ============== Métodos Públicos ==============
  
  public getSessionId(): string {
    return this.sessionId;
  }
  
  public getDeviceId(): string {
    return this.deviceId;
  }
  
  public getStats(): {
    duration: number;
    maxScroll: number;
    clicks: number;
    sectionsViewed: number;
  } {
    return {
      duration: (Date.now() - this.sessionStartTime) / 1000,
      maxScroll: this.maxScrollPercent,
      clicks: this.totalClicks,
      sectionsViewed: this.sectionsViewed,
    };
  }
}

// ============== Hook React ==============

import { useEffect, useRef, type RefObject } from "react";

interface UseProposalTrackerOptions extends Partial<Omit<TrackerConfig, "slug" | "scrollContainer">> {
  scrollContainer?: RefObject<HTMLElement | null>;
}

export function useProposalTracker(slug: string | undefined, options?: UseProposalTrackerOptions) {
  const trackerRef = useRef<ProposalTracker | null>(null);
  
  useEffect(() => {
    if (!slug) return;
    
    const container = options?.scrollContainer?.current ?? null;
    
    const tracker = new ProposalTracker({
      slug,
      debug: process.env.NODE_ENV === "development",
      inactivityTimeout: options?.inactivityTimeout,
      scrollThresholds: options?.scrollThresholds,
      batchInterval: options?.batchInterval,
      scrollContainer: container,
    });
    
    trackerRef.current = tracker;
    tracker.start();
    
    return () => {
      tracker.stop();
    };
  }, [slug, options?.scrollContainer?.current]);
  
  return {
    trackFAQOpen: (questionId: string, questionText: string) => {
      trackerRef.current?.trackFAQOpen(questionId, questionText);
    },
    trackFAQClose: (questionId: string) => {
      trackerRef.current?.trackFAQClose(questionId);
    },
    getStats: () => trackerRef.current?.getStats(),
  };
}
