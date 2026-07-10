export interface WhatsAppProvider {
  /** Sends a templated WhatsApp message (Meta/BSP template approval required for live). */
  send(to: string, message: string): Promise<void>;
}
