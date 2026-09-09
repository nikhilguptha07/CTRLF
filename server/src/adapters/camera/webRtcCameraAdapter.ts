import { BaseCameraAdapter } from './baseCameraAdapter';
import {
  CameraProtocol,
  CameraCapabilities,
  CameraConnectionConfig,
  CameraConnectionResult,
} from '../../types/universalCamera';

export class WebRtcCameraAdapter extends BaseCameraAdapter {
  readonly protocol: CameraProtocol = 'WEBRTC';

  getCapabilities(): CameraCapabilities {
    return {
      ptz: false,
      pan: false,
      tilt: false,
      zoom: false,
      presets: false,
      snapshot: true,
      twoWayAudio: true,
      webrtc: true,
      hls: false,
    };
  }

  protected async onConnect(config: CameraConnectionConfig): Promise<CameraConnectionResult> {
    const signalingUri = config.uri || 'webrtc://localhost:8554/live';

    return {
      connected: true,
      protocol: this.protocol,
      streamUri: signalingUri,
      effectiveFps: config.fps || 30.0,
      resolution: { width: config.width || 1280, height: config.height || 720 },
      capabilities: this.getCapabilities(),
      deviceInfo: {
        manufacturer: 'WebRTC Ingest Gateway',
        model: 'Ultra-Low Latency WHEP Endpoint',
      },
    };
  }

  protected async onDisconnect(): Promise<void> {}

  protected async onProbeHealth(): Promise<boolean> {
    return true;
  }

  async getSnapshot(): Promise<Buffer | null> {
    return null;
  }
}
