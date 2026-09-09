import { OnvifCameraAdapter } from './onvifCameraAdapter';
import {
  CameraProtocol,
  CameraCapabilities,
  CameraConnectionConfig,
  CameraConnectionResult,
  PTZCommand,
  PTZResult,
} from '../../types/universalCamera';
import { logger } from '../../utils/logger';

export class OnvifPtzCameraAdapter extends OnvifCameraAdapter {
  override readonly protocol: CameraProtocol = 'ONVIF_PTZ';
  private currentPan = 0.0;
  private currentTilt = 0.0;
  private currentZoom = 1.0;
  private presets: Map<string, { pan: number; tilt: number; zoom: number; name: string }> = new Map([
    ['1', { pan: 0, tilt: 0, zoom: 1, name: 'Home View' }],
    ['2', { pan: 45, tilt: -10, zoom: 1.5, name: 'Entrance Desk' }],
    ['3', { pan: -60, tilt: 15, zoom: 2.0, name: 'Corridor Sweep' }],
  ]);

  override getCapabilities(): CameraCapabilities {
    return {
      ptz: true,
      pan: true,
      tilt: true,
      zoom: true,
      presets: true,
      snapshot: true,
      twoWayAudio: false,
      webrtc: false,
      hls: false,
    };
  }

  override async sendPtzCommand(command: PTZCommand): Promise<PTZResult> {
    logger.info(`[PTZ:${this.protocol}] Executing action ${command.action}`, { ...command });

    switch (command.action) {
      case 'START': {
        const panDelta = (command.panSpeed || 0) * 15;
        const tiltDelta = (command.tiltSpeed || 0) * 10;
        const zoomDelta = (command.zoomSpeed || 0) * 0.2;

        this.currentPan = Math.max(-180, Math.min(180, this.currentPan + panDelta));
        this.currentTilt = Math.max(-45, Math.min(45, this.currentTilt + tiltDelta));
        this.currentZoom = Math.max(1.0, Math.min(10.0, this.currentZoom + zoomDelta));

        return {
          success: true,
          action: 'START',
          message: `PTZ movement active. Pan: ${this.currentPan.toFixed(1)}°, Tilt: ${this.currentTilt.toFixed(1)}°, Zoom: ${this.currentZoom.toFixed(1)}x`,
          pan: this.currentPan,
          tilt: this.currentTilt,
          zoom: this.currentZoom,
        };
      }

      case 'STOP': {
        return {
          success: true,
          action: 'STOP',
          message: `PTZ movement stopped at Pan: ${this.currentPan.toFixed(1)}°, Tilt: ${this.currentTilt.toFixed(1)}°`,
          pan: this.currentPan,
          tilt: this.currentTilt,
          zoom: this.currentZoom,
        };
      }

      case 'GOTO_PRESET': {
        const presetId = command.presetId || '1';
        const target = this.presets.get(presetId);
        if (target) {
          this.currentPan = target.pan;
          this.currentTilt = target.tilt;
          this.currentZoom = target.zoom;
          return {
            success: true,
            action: 'GOTO_PRESET',
            message: `Moved to preset "${target.name}" (${presetId})`,
            pan: this.currentPan,
            tilt: this.currentTilt,
            zoom: this.currentZoom,
          };
        }
        return {
          success: false,
          action: 'GOTO_PRESET',
          message: `Preset ${presetId} not found`,
        };
      }

      case 'HOME': {
        this.currentPan = 0;
        this.currentTilt = 0;
        this.currentZoom = 1;
        return {
          success: true,
          action: 'HOME',
          message: 'PTZ returned to home position',
          pan: 0,
          tilt: 0,
          zoom: 1,
        };
      }

      default:
        return {
          success: false,
          action: command.action,
          message: `Unsupported PTZ action: ${command.action}`,
        };
    }
  }
}
