import {
  CameraProtocol,
  CameraCapabilities,
  CameraConnectionConfig,
  CameraConnectionResult,
  ICameraAdapter,
  PTZCommand,
  PTZResult,
} from '../../types/universalCamera';
import { logger } from '../../utils/logger';

export abstract class BaseCameraAdapter implements ICameraAdapter {
  abstract readonly protocol: CameraProtocol;
  protected config: CameraConnectionConfig | null = null;
  protected isConnected = false;
  protected streamUri = '';
  protected lastPingAt: Date | null = null;

  abstract getCapabilities(): CameraCapabilities;

  protected maskCredentials(uri: string): string {
    if (!uri) return '';
    try {
      const parsed = new URL(uri);
      if (parsed.username || parsed.password) {
        parsed.username = '***';
        parsed.password = '***';
        return parsed.toString();
      }
      return uri;
    } catch {
      return uri.replace(/\/\/[^:@\s]+:[^@\s]+@/, '//***:***@');
    }
  }

  async connect(config: CameraConnectionConfig): Promise<CameraConnectionResult> {
    this.config = config;
    this.lastPingAt = new Date();
    try {
      const result = await this.onConnect(config);
      this.isConnected = result.connected;
      this.streamUri = result.streamUri;
      logger.info(`[CameraAdapter:${this.protocol}] Connected to ${this.maskCredentials(result.streamUri)}`);
      return result;
    } catch (err: any) {
      this.isConnected = false;
      logger.error(`[CameraAdapter:${this.protocol}] Connection failed: ${err.message}`);
      return {
        connected: false,
        protocol: this.protocol,
        streamUri: config.uri || '',
        effectiveFps: 0,
        capabilities: this.getCapabilities(),
        error: err.message,
      };
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.onDisconnect();
    } finally {
      this.isConnected = false;
      this.streamUri = '';
    }
  }

  async getStreamUri(): Promise<string> {
    return this.streamUri;
  }

  abstract getSnapshot(): Promise<Buffer | null>;

  async sendPtzCommand?(command: PTZCommand): Promise<PTZResult> {
    return {
      success: false,
      action: command.action,
      message: `PTZ not supported on ${this.protocol} adapter`,
    };
  }

  async probeHealth(): Promise<{ isAlive: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const alive = await this.onProbeHealth();
      const latencyMs = Date.now() - start;
      this.lastPingAt = new Date();
      return { isAlive: alive, latencyMs };
    } catch (err: any) {
      return { isAlive: false, latencyMs: Date.now() - start, error: err.message };
    }
  }

  protected abstract onConnect(config: CameraConnectionConfig): Promise<CameraConnectionResult>;
  protected abstract onDisconnect(): Promise<void>;
  protected abstract onProbeHealth(): Promise<boolean>;
}
