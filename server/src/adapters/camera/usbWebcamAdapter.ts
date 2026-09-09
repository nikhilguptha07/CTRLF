import { BaseCameraAdapter } from './baseCameraAdapter';
import {
  CameraProtocol,
  CameraCapabilities,
  CameraConnectionConfig,
  CameraConnectionResult,
} from '../../types/universalCamera';
import { aiVisionService } from '../../services/aiVisionService';

export class UsbWebcamAdapter extends BaseCameraAdapter {
  readonly protocol: CameraProtocol = 'USB_WEBCAM';
  private deviceIndex = 0;

  getCapabilities(): CameraCapabilities {
    return {
      ptz: false,
      pan: false,
      tilt: false,
      zoom: false,
      presets: false,
      snapshot: true,
      twoWayAudio: false,
      webrtc: false,
      hls: false,
    };
  }

  protected async onConnect(config: CameraConnectionConfig): Promise<CameraConnectionResult> {
    this.deviceIndex = config.deviceIndex ?? (config.uri ? Number(config.uri.replace(/\D/g, '')) || 0 : 0);
    const streamUri = `device://${this.deviceIndex}`;

    return {
      connected: true,
      protocol: this.protocol,
      streamUri,
      effectiveFps: config.fps || 30.0,
      resolution: { width: config.width || 1280, height: config.height || 720 },
      capabilities: this.getCapabilities(),
      deviceInfo: {
        manufacturer: 'Universal USB / UVC Video Capture',
        model: `Hardware Device #${this.deviceIndex}`,
      },
    };
  }

  protected async onDisconnect(): Promise<void> {
    // Release USB camera device handle
  }

  protected async onProbeHealth(): Promise<boolean> {
    return true;
  }

  async getSnapshot(): Promise<Buffer | null> {
    try {
      const result = await aiVisionService.extractVideoFrame({
        videoPath: `device://${this.deviceIndex}`,
        frameNumber: 1,
        annotate: false,
      });
      return result.buffer;
    } catch {
      return null;
    }
  }
}
