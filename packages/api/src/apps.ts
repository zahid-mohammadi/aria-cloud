import {
  deployCustomApp,
  getAppDeploymentStatus,
  listAppDeployments,
  pauseAppService,
  resumeAppService,
  type DeployAppInput,
} from '@aria-cloud/app-runner';
import { ApiError } from './errors';

function mapError(error: unknown): never {
  const code = (error as { code?: string })?.code;
  const status =
    code === 'NOT_FOUND' ? 404
      : code === 'VALIDATION_ERROR' ? 400
        : code === 'NOT_CONFIGURED' ? 503
          : 500;
  throw new ApiError(status, code || 'APP_DEPLOY_ERROR', (error as Error)?.message);
}

export async function deployApp(tenantId: string, input: Omit<DeployAppInput, 'tenantId'>) {
  try {
    return await deployCustomApp({ tenantId, ...input });
  } catch (error) {
    mapError(error);
  }
}

export async function listApps(tenantId: string) {
  try {
    return await listAppDeployments(tenantId);
  } catch (error) {
    mapError(error);
  }
}

export async function getApp(tenantId: string, deploymentId: string) {
  try {
    return await getAppDeploymentStatus(tenantId, deploymentId);
  } catch (error) {
    mapError(error);
  }
}

export async function pauseApp(tenantId: string, deploymentId: string) {
  try {
    return await pauseAppService(tenantId, deploymentId);
  } catch (error) {
    mapError(error);
  }
}

export async function resumeApp(tenantId: string, deploymentId: string) {
  try {
    return await resumeAppService(tenantId, deploymentId);
  } catch (error) {
    mapError(error);
  }
}
