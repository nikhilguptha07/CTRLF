import { CameraProtocol, ICameraAdapter, CameraConnectionConfig } from '../../types/universalCamera';
import { RtspCameraAdapter } from './rtspCameraAdapter';
import { OnvifCameraAdapter } from './onvifCameraAdapter';
import { OnvifPtzCameraAdapter } from './onvifPtzCameraAdapter';
import { UsbWebcamAdapter } from './usbWebcamAdapter';
import { LocalNetworkCameraAdapter } from './localNetworkCameraAdapter';
import { WebRtcCameraAdapter } from './webRtcCameraAdapter';
import { HlsCameraAdapter } from './hlsCameraAdapter';

export class CameraAdapterFactory {
  private static adapterCache = new Map<string, ICameraAdapter>();

  /**
   * Infer protocol from connection parameters if not explicitly provided
   */
  static inferProtocol(config: Partial<CameraConnectionConfig>): CameraProtocol {
    if (config.protocol) return config.protocol;
    if (config.deviceIndex !== undefined || (config.uri && config.uri.startsWith('device://'))) {
      return 'USB_WEBCAM';
    }
    if (config.uri?.startsWith('rtsp://') || config.uri?.startsWith('rtsps://')) {
      return 'RTSP';
    }
    if (config.uri?.includes('.m3u8')) {
      return 'HLS';
    }
    if (config.uri?.startsWith('webrtc://') || config.uri?.includes('/whep')) {
      return 'WEBRTC';
    }
    if (config.port === 80 || config.port === 8080 || config.path?.includes('onvif')) {
      return 'ONVIF';
    }
    return 'LOCAL_NETWORK';
  }

  /**
   * Create an adapter instance for the specified protocol
   */
  static createAdapter(protocol: CameraProtocol): ICameraAdapter {
    switch (protocol) {
      case 'RTSP':
        return new RtspCameraAdapter();
      case 'ONVIF':
        return new OnvifCameraAdapter();
      case 'ONVIF_PTZ':
        return new OnvifPtzCameraAdapter();
      case 'USB_WEBCAM':
        return new UsbWebcamAdapter();
      case 'LOCAL_NETWORK':
        return new LocalNetworkCameraAdapter();
      case 'WEBRTC':
        return new WebRtcCameraAdapter();
      case 'HLS':
        return new HlsCameraAdapter();
      default:
        return new LocalNetworkCameraAdapter();
    }
  }

  /**
   * Retrieve cached adapter or create and cache a new one
   */
  static getOrCreateAdapter(cameraId: string, protocol: CameraProtocol): ICameraAdapter {
    let adapter = this.adapterCache.get(cameraId);
    if (!adapter || adapter.protocol !== protocol) {
      adapter = this.createAdapter(protocol);
      this.adapterCache.set(cameraId, adapter);
    }
    return adapter;
  }

  /**
   * Evict adapter from cache on camera removal or disconnection
   */
  static releaseAdapter(cameraId: string): void {
    const adapter = this.adapterCache.get(cameraId);
    if (adapter) {
      adapter.disconnect().catch(() => {});
      this.adapterCache.delete(cameraId);
    }
  }
}
