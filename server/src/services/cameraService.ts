import { v4 as uuidv4 } from 'uuid';
import { cameraRepository } from '../repositories/cameraRepository';
import { encryptCredential, decryptCredential } from '../utils/encryption';
import { auditService } from './auditService';
import { AppError } from '../middleware/errorHandler';
import { CreateCameraInput, UpdateCameraInput, PTZCommandInput } from '../validators/cameraValidator';
import { Camera, CameraResponse, CameraProtocol, CameraCapabilities, PTZResult } from '../types/camera';
import { CameraAdapterFactory } from '../adapters/camera/cameraAdapterFactory';

export class CameraService {
  private toResponse(camera: Camera): CameraResponse {
    const protocol = camera.protocol || (camera.sourceType as CameraProtocol) || 'RTSP';
    const capabilities = camera.capabilities || CameraAdapterFactory.createAdapter(protocol).getCapabilities();

    return {
      id: camera.id,
      name: camera.name,
      location: camera.location,
      protocol,
      sourceType: camera.sourceType || (protocol as any) || 'RTSP',
      enabled: camera.enabled ?? true,
      priority: camera.priority || 0,
      calibrationId: camera.calibrationId,
      status: camera.status,
      streamStatus: camera.streamStatus,
      capabilities,
      ptzEnabled: camera.ptzEnabled ?? Boolean(capabilities.ptz),
      deviceIndex: camera.deviceIndex ?? null,
      lastConnectedAt: camera.lastConnectedAt,
      createdAt: camera.createdAt,
      updatedAt: camera.updatedAt,
    };
  }

  async createCamera(userId: string, input: CreateCameraInput): Promise<CameraResponse> {
    const id = uuidv4();
    const rawUri = input.streamUrl || input.rtspUrl || input.uri || (input.deviceIndex !== undefined ? `device://${input.deviceIndex}` : '');
    
    // Infer protocol if not explicitly specified
    const protocol = input.protocol || CameraAdapterFactory.inferProtocol({
      protocol: input.protocol,
      uri: rawUri,
      deviceIndex: input.deviceIndex,
      host: input.host,
      port: input.port,
    });

    const adapter = CameraAdapterFactory.getOrCreateAdapter(id, protocol);
    const connResult = await adapter.connect({
      protocol,
      uri: rawUri,
      host: input.host,
      port: input.port,
      deviceIndex: input.deviceIndex,
      username: input.username,
      password: input.password,
    });

    const streamUri = connResult.connected ? connResult.streamUri : rawUri;
    const encryptedStream = streamUri ? encryptCredential(streamUri) : '';
    const capabilities = connResult.capabilities || adapter.getCapabilities();

    const camera = await cameraRepository.create({
      id,
      userId,
      name: input.name,
      location: input.location,
      protocol,
      sourceType: protocol as any,
      sourceUriEncrypted: encryptedStream,
      rtspUrlEncrypted: encryptedStream,
      enabled: true,
      priority: 0,
      status: connResult.connected ? 'ONLINE' : 'ERROR',
      capabilities,
      ptzEnabled: input.ptzEnabled ?? Boolean(capabilities.ptz),
      deviceIndex: input.deviceIndex !== undefined ? input.deviceIndex : null,
      lastConnectedAt: connResult.connected ? new Date() : null,
    });

    await auditService.record({
      userId,
      action: 'CAMERA_REGISTERED',
      resourceType: 'CAMERA',
      resourceId: id,
      status: 'SUCCESS',
      details: { name: input.name, location: input.location, protocol },
    });

    return this.toResponse(camera);
  }

  async getCameras(userId: string): Promise<CameraResponse[]> {
    const cameras = await cameraRepository.findAllByUserId(userId);
    return cameras.map((cam) => this.toResponse(cam));
  }

  async getCameraById(id: string, userId: string): Promise<CameraResponse> {
    const camera = await cameraRepository.findById(id, userId);
    if (!camera) {
      throw new AppError('CAMERA_NOT_FOUND', 'CCTV Camera feed not found', 404);
    }
    return this.toResponse(camera);
  }

  async updateCamera(id: string, userId: string, input: UpdateCameraInput): Promise<CameraResponse> {
    const existing = await cameraRepository.findById(id, userId);
    if (!existing) {
      throw new AppError('CAMERA_NOT_FOUND', 'CCTV Camera feed not found', 404);
    }

    const updates: Parameters<typeof cameraRepository.update>[2] = {};
    if (input.name) updates.name = input.name;
    if (input.location) updates.location = input.location;
    if (input.status) updates.status = input.status;
    const rawUri = input.streamUrl || input.rtspUrl || input.uri;
    if (rawUri) {
      updates.sourceUriEncrypted = encryptCredential(rawUri);
      updates.rtspUrlEncrypted = encryptCredential(rawUri);
    }

    const updated = await cameraRepository.update(id, userId, updates);
    if (!updated) {
      throw new AppError('UPDATE_FAILED', 'Failed to update camera parameters', 500);
    }

    await auditService.record({
      userId,
      action: 'CAMERA_UPDATED',
      resourceType: 'CAMERA',
      resourceId: id,
      status: 'SUCCESS',
    });

    return this.toResponse(updated);
  }

  async deleteCamera(id: string, userId: string): Promise<void> {
    const existing = await cameraRepository.findById(id, userId);
    if (!existing) {
      throw new AppError('CAMERA_NOT_FOUND', 'CCTV Camera feed not found', 404);
    }

    CameraAdapterFactory.releaseAdapter(id);
    await cameraRepository.delete(id, userId);

    await auditService.record({
      userId,
      action: 'CAMERA_DELETED',
      resourceType: 'CAMERA',
      resourceId: id,
      status: 'SUCCESS',
    });
  }

  async testConnection(id: string, userId: string): Promise<{ reachable: boolean; pingMs: number; protocol?: string; error?: string }> {
    const camera = await cameraRepository.findById(id, userId);
    if (!camera) {
      throw new AppError('CAMERA_NOT_FOUND', 'CCTV Camera feed not found', 404);
    }

    const protocol = camera.protocol || (camera.sourceType as CameraProtocol) || 'RTSP';
    const enc = camera.sourceUriEncrypted || camera.rtspUrlEncrypted || '';
    const decryptedUrl = enc ? decryptCredential(enc) : '';

    const adapter = CameraAdapterFactory.getOrCreateAdapter(id, protocol);
    const conn = await adapter.connect({
      protocol,
      uri: decryptedUrl,
      deviceIndex: camera.deviceIndex ?? undefined,
    });

    const probe = await adapter.probeHealth();

    await cameraRepository.update(id, userId, {
      status: probe.isAlive ? 'ONLINE' : 'ERROR',
      lastConnectedAt: probe.isAlive ? new Date() : null,
    });

    return {
      reachable: probe.isAlive,
      pingMs: probe.latencyMs,
      protocol,
      error: probe.error || conn.error,
    };
  }

  async probeRawConnection(config: {
    protocol?: CameraProtocol;
    uri?: string;
    streamUrl?: string;
    rtspUrl?: string;
    host?: string;
    port?: number;
    deviceIndex?: number;
    username?: string;
    password?: string;
  }): Promise<{ reachable: boolean; protocol: CameraProtocol; pingMs: number; capabilities: CameraCapabilities; error?: string }> {
    const rawUri = config.streamUrl || config.rtspUrl || config.uri || '';
    const protocol = config.protocol || CameraAdapterFactory.inferProtocol({
      protocol: config.protocol,
      uri: rawUri,
      deviceIndex: config.deviceIndex,
      host: config.host,
      port: config.port,
    });

    const adapter = CameraAdapterFactory.createAdapter(protocol);
    const start = Date.now();
    const result = await adapter.connect({
      protocol,
      uri: rawUri,
      host: config.host,
      port: config.port,
      deviceIndex: config.deviceIndex,
      username: config.username,
      password: config.password,
    });
    const pingMs = Date.now() - start;

    return {
      reachable: result.connected,
      protocol,
      pingMs,
      capabilities: result.capabilities,
      error: result.error,
    };
  }

  async sendPtzCommand(id: string, userId: string, command: PTZCommandInput): Promise<PTZResult> {
    const camera = await cameraRepository.findById(id, userId);
    if (!camera) {
      throw new AppError('CAMERA_NOT_FOUND', 'CCTV Camera feed not found', 404);
    }

    const protocol = camera.protocol || (camera.sourceType as CameraProtocol) || 'RTSP';
    const adapter = CameraAdapterFactory.getOrCreateAdapter(id, protocol);

    if (!adapter.sendPtzCommand) {
      return {
        success: false,
        action: command.action,
        message: `Camera protocol ${protocol} does not support PTZ commands`,
      };
    }

    const enc = camera.sourceUriEncrypted || camera.rtspUrlEncrypted || '';
    const decryptedUrl = enc ? decryptCredential(enc) : '';

    await adapter.connect({
      protocol,
      uri: decryptedUrl,
      deviceIndex: camera.deviceIndex ?? undefined,
    });

    return adapter.sendPtzCommand(command);
  }

  async getCameraCapabilities(id: string, userId: string): Promise<CameraCapabilities> {
    const camera = await cameraRepository.findById(id, userId);
    if (!camera) {
      throw new AppError('CAMERA_NOT_FOUND', 'CCTV Camera feed not found', 404);
    }

    const protocol = camera.protocol || (camera.sourceType as CameraProtocol) || 'RTSP';
    const adapter = CameraAdapterFactory.getOrCreateAdapter(id, protocol);
    return adapter.getCapabilities();
  }

  async getDecryptedStreamUrl(id: string, userId: string): Promise<string> {
    const camera = await cameraRepository.findById(id, userId);
    if (!camera) {
      throw new AppError('CAMERA_NOT_FOUND', 'Camera not found', 404);
    }
    const enc = camera.sourceUriEncrypted || camera.rtspUrlEncrypted || '';
    return enc ? decryptCredential(enc) : '';
  }
}

export const cameraService = new CameraService();
