import fs from 'fs';
import path from 'path';
import { BaseCameraAdapter } from './baseCameraAdapter';
import {
  CameraProtocol,
  CameraCapabilities,
  CameraConnectionConfig,
  CameraConnectionResult,
} from '../../types/universalCamera';
import { aiVisionService } from '../../services/aiVisionService';
import { resolveVideoPath } from '../../utils/pathResolver';

export class LocalNetworkCameraAdapter extends BaseCameraAdapter {
  readonly protocol: CameraProtocol = 'LOCAL_NETWORK';

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
    const rawUri = config.uri || 'reference/cctv-reference.mp4';
    const resolved = resolveVideoPath(rawUri);

    if (!resolved.exists && !rawUri.startsWith('http://') && !rawUri.startsWith('https://')) {
      throw new Error(`Local network video source not found: ${rawUri}`);
    }

    const streamUri = resolved.path || rawUri;

    return {
      connected: true,
      protocol: this.protocol,
      streamUri,
      effectiveFps: config.fps || 30.0,
      resolution: { width: config.width || 1920, height: config.height || 1080 },
      capabilities: this.getCapabilities(),
      deviceInfo: {
        manufacturer: 'Local Network Video Source',
        model: path.basename(streamUri),
      },
    };
  }

  protected async onDisconnect(): Promise<void> {}

  protected async onProbeHealth(): Promise<boolean> {
    if (this.streamUri.startsWith('http')) return true;
    return fs.existsSync(this.streamUri);
  }

  async getSnapshot(): Promise<Buffer | null> {
    try {
      const result = await aiVisionService.extractVideoFrame({
        videoPath: this.streamUri,
        frameNumber: 1,
        annotate: false,
      });
      return result.buffer;
    } catch {
      return null;
    }
  }
}
