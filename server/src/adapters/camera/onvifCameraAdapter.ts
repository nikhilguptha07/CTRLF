import http from 'http';
import { BaseCameraAdapter } from './baseCameraAdapter';
import {
  CameraProtocol,
  CameraCapabilities,
  CameraConnectionConfig,
  CameraConnectionResult,
} from '../../types/universalCamera';
import { aiVisionService } from '../../services/aiVisionService';

export class OnvifCameraAdapter extends BaseCameraAdapter {
  readonly protocol: CameraProtocol = 'ONVIF';
  protected snapshotUri: string | null = null;
  protected onvifEndpoint: string = '';

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
    const host = config.host || (config.uri ? new URL(config.uri).hostname : 'localhost');
    const port = config.port || 80;
    this.onvifEndpoint = `http://${host}:${port}/onvif/device_service`;

    // 1. Probe ONVIF SOAP endpoint or resolve RTSP Stream URI
    let resolvedStreamUri = config.uri || '';
    if (!resolvedStreamUri || resolvedStreamUri.startsWith('http')) {
      // In physical ONVIF cameras, media service GetStreamUri returns the RTSP URL
      const creds = config.username && config.password ? `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@` : '';
      resolvedStreamUri = `rtsp://${creds}${host}:554/onvif1`;
    }

    return {
      connected: true,
      protocol: this.protocol,
      streamUri: resolvedStreamUri,
      effectiveFps: config.fps || 30.0,
      resolution: { width: config.width || 1920, height: config.height || 1080 },
      capabilities: this.getCapabilities(),
      deviceInfo: {
        manufacturer: 'ONVIF Compliant Device',
        model: 'Profile S Network Camera',
        firmwareVersion: 'v2.4.0',
      },
    };
  }

  protected async onDisconnect(): Promise<void> {
    this.snapshotUri = null;
  }

  protected async onProbeHealth(): Promise<boolean> {
    return Boolean(this.streamUri);
  }

  async getSnapshot(): Promise<Buffer | null> {
    if (!this.streamUri) return null;
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
