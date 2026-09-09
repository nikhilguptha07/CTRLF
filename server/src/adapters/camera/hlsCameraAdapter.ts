import { BaseCameraAdapter } from './baseCameraAdapter';
import {
  CameraProtocol,
  CameraCapabilities,
  CameraConnectionConfig,
  CameraConnectionResult,
} from '../../types/universalCamera';

export class HlsCameraAdapter extends BaseCameraAdapter {
  readonly protocol: CameraProtocol = 'HLS';

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
      hls: true,
    };
  }

  protected async onConnect(config: CameraConnectionConfig): Promise<CameraConnectionResult> {
    const playlistUri = config.uri || '';
    if (!playlistUri.includes('.m3u8') && !playlistUri.startsWith('http')) {
      throw new Error(`Invalid HLS playlist URI: ${playlistUri}`);
    }

    return {
      connected: true,
      protocol: this.protocol,
      streamUri: playlistUri,
      effectiveFps: config.fps || 25.0,
      resolution: { width: config.width || 1920, height: config.height || 1080 },
      capabilities: this.getCapabilities(),
      deviceInfo: {
        manufacturer: 'HLS Live Stream Gateway',
        model: 'M3U8 Segment Stream',
      },
    };
  }

  protected async onDisconnect(): Promise<void> {}

  protected async onProbeHealth(): Promise<boolean> {
    return Boolean(this.streamUri);
  }

  async getSnapshot(): Promise<Buffer | null> {
    return null;
  }
}
