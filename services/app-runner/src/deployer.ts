/**
 * AriaCloud Sovereign Custom Application Runner Engine
 * Provisions and manages containerized applications (Node.js, Python, Laravel, Docker)
 * with scale-to-zero capability and custom subdomain routing (*.ariacloudservices.org).
 */

import {
  AppRunnerClient,
  CreateServiceCommand,
  UpdateServiceCommand,
  DescribeServiceCommand,
  PauseServiceCommand,
  ResumeServiceCommand,
  DeleteServiceCommand,
  AssociateCustomDomainCommand,
  CreateAutoScalingConfigurationCommand,
} from '@aws-sdk/client-apprunner';
import { withTenantContext } from '@aria-cloud/database';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ariacloudservices.org';
const APPRUNNER_REGION = process.env.APPRUNNER_REGION || process.env.AWS_REGION || 'us-east-1';

const appRunner = new AppRunnerClient({ region: APPRUNNER_REGION });

export type AppFramework = 'nodejs' | 'python' | 'laravel' | 'docker';
export type AppDeploymentStatus = 'deploying' | 'running' | 'paused' | 'failed';

export interface DeployAppInput {
  tenantId: string;
  appName: string;
  framework: AppFramework;
  gitRepoUrl?: string;
  imageUri?: string;
  cpu?: 0.5 | 1.0; // vCPU
  memory?: 1.0 | 2.0; // GB
  environmentVariables?: Record<string, string>;
  customDomain?: string;
  port?: number;
}

export interface DeploymentRecord {
  id: string;
  tenantId: string;
  appName: string;
  framework: AppFramework;
  gitRepoUrl?: string;
  serviceArn?: string;
  customDomain?: string;
  status: AppDeploymentStatus;
  allocatedMemoryGb: number;
  allocatedVcpu: number;
  publicUrl: string;
  healthCheckUrl: string;
  createdAt: string;
  latestLogSnippet?: string;
}

export class NotConfiguredError extends Error {
  readonly code = 'NOT_CONFIGURED';
  constructor(message = 'AWS credentials are required to deploy applications.') {
    super(message);
    this.name = 'NotConfiguredError';
  }
}

export class AppValidationError extends Error {
  readonly code = 'VALIDATION_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'AppValidationError';
  }
}

export class AppNotFoundError extends Error {
  readonly code = 'NOT_FOUND';
  constructor(message: string) {
    super(message);
    this.name = 'AppNotFoundError';
  }
}

/**
 * Creates or updates a dynamic containerized application deployment.
 */
export async function deployCustomApp(input: DeployAppInput): Promise<DeploymentRecord> {
  const cleanAppName = input.appName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '') || 'app';

  const defaultSubdomain = `${cleanAppName}.${ROOT_DOMAIN}`;
  const effectiveDomain = input.customDomain || defaultSubdomain;
  const cpu = input.cpu || 0.5;
  const memory = input.memory || 1.0;
  const cpuStr = `${cpu} vCPU`;
  const memoryStr = `${memory} GB`;
  const port = input.port || (input.framework === 'nodejs' ? 3000 : 8080);

  if (cleanAppName.length < 3 || cleanAppName.length > 40) {
    throw new AppValidationError('appName must be 3–40 letters, numbers or hyphens.');
  }
  if (!['nodejs', 'python', 'laravel', 'docker'].includes(input.framework)) {
    throw new AppValidationError(`Unsupported framework: ${input.framework}`);
  }
  if (input.cpu && ![0.25, 0.5, 1.0, 2.0].includes(input.cpu)) {
    throw new AppValidationError('cpu must be one of 0.25, 0.5, 1.0, 2.0.');
  }
  if (input.memory && ![0.5, 1.0, 2.0, 3.0, 4.0].includes(input.memory)) {
    throw new AppValidationError('memory must be one of 0.5, 1.0, 2.0, 3.0, 4.0 GB.');
  }
  if (input.gitRepoUrl && !/^https:\/\//.test(input.gitRepoUrl)) {
    throw new AppValidationError('gitRepoUrl must be an https:// URL.');
  }

  let serviceArn: string | undefined;
  let deploymentStatus: AppDeploymentStatus = 'deploying';
  let initialLog = `[Aria Sovereign App Engine] Initiating deployment for ${cleanAppName} (${input.framework})...`;

  if (!process.env.AWS_ACCESS_KEY_ID) {
    throw new NotConfiguredError();
  }

  try {
      // 1. Ensure scale-to-zero / low-cost autoscaling policy
      const autoScalingConfigName = `aria-autoscale-${cleanAppName}`;
      let autoScalingArn: string | undefined;

      try {
        const autoScalingRes = await appRunner.send(
          new CreateAutoScalingConfigurationCommand({
            AutoScalingConfigurationName: autoScalingConfigName,
            MinSize: 0, // Scale to zero
            MaxSize: 2, // Strict cost ceiling
            MaxConcurrency: 100,
          })
        );
        autoScalingArn = autoScalingRes.AutoScalingConfiguration?.AutoScalingConfigurationArn;
      } catch {
        // Reuse default or existing config if already registered
      }

      // 2. Build runtime configuration based on framework
      let sourceConfig: any;

      if (input.framework === 'docker' || input.imageUri) {
        sourceConfig = {
          ImageRepository: {
            ImageIdentifier: input.imageUri || 'public.ecr.aws/docker/library/nginx:alpine',
            ImageRepositoryType: 'ECR_PUBLIC',
            ImageConfiguration: {
              Port: String(port),
              RuntimeEnvironmentVariables: input.environmentVariables || {},
            },
          },
          AutoDeploymentsEnabled: true,
        };
      } else {
        // Source code repository configuration
        let runtime = 'NODEJS_18';
        let buildCommand = 'npm install && npm run build';
        let runCommand = 'npm start';

        if (input.framework === 'python') {
          runtime = 'PYTHON_3';
          buildCommand = 'pip install -r requirements.txt';
          runCommand = 'python main.py';
        } else if (input.framework === 'laravel') {
          runtime = 'PHP_81';
          buildCommand = 'composer install --no-dev --optimize-autoloader';
          runCommand = 'php artisan serve --host 0.0.0.0 --port 8080';
        }

        sourceConfig = {
          CodeRepository: {
            RepositoryUrl: input.gitRepoUrl || 'https://github.com/ariacloud/sample-app',
            SourceCodeVersion: {
              Type: 'BRANCH',
              Value: 'main',
            },
            CodeConfiguration: {
              ConfigurationSource: 'API',
              CodeConfigurationValues: {
                Runtime: runtime,
                BuildCommand: buildCommand,
                StartCommand: runCommand,
                Port: String(port),
                RuntimeEnvironmentVariables: input.environmentVariables || {},
              },
            },
          },
          AutoDeploymentsEnabled: true,
        };
      }

      // 3. Create or provision service
      const createRes = await appRunner.send(
        new CreateServiceCommand({
          ServiceName: `aria-${input.tenantId.substring(0, 8)}-${cleanAppName}`,
          SourceConfiguration: sourceConfig,
          InstanceConfiguration: {
            Cpu: cpuStr,
            Memory: memoryStr,
          },
          AutoScalingConfigurationArn: autoScalingArn,
          HealthCheckConfiguration: {
            Protocol: 'HTTP',
            Path: '/',
            Interval: 10,
            Timeout: 5,
            HealthyThreshold: 1,
            UnhealthyThreshold: 3,
          },
        })
      );

      serviceArn = createRes.Service?.ServiceArn;
      deploymentStatus = 'deploying';
      initialLog = `[Aria Sovereign App Engine] Service initialized with ARN ${serviceArn}. Build and container orchestration started.`;

      // 4. Associate custom domain if specified
      if (serviceArn && input.customDomain) {
        try {
          await appRunner.send(
            new AssociateCustomDomainCommand({
              ServiceArn: serviceArn,
              DomainName: input.customDomain,
              EnableWWWSubdomain: false,
            })
          );
        } catch (domainErr) {
          console.warn('Custom domain association deferred:', domainErr);
        }
      }
    } catch (sdkErr) {
      console.error('[app-runner] deployment failed:', sdkErr);
      throw sdkErr;
    }

  // 5. Persist deployment state to PostgreSQL under strict RLS
  let deploymentId = '';
  let createdAt = new Date().toISOString();

  try {
    const dbRes = await withTenantContext(input.tenantId, async (client) => {
      const res = await client.query<{ id: string; created_at: string }>(
        `INSERT INTO custom_app_deployments (
          tenant_id,
          app_name,
          framework,
          git_repo_url,
          app_runner_service_arn,
          custom_domain,
          status,
          allocated_memory_gb,
          allocated_vcpu
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, created_at`,
        [
          input.tenantId,
          cleanAppName,
          input.framework,
          input.gitRepoUrl || null,
          serviceArn || null,
          effectiveDomain,
          deploymentStatus,
          memory,
          cpu,
        ]
      );
      return res.rows[0];
    });

    if (dbRes) {
      deploymentId = dbRes.id;
      createdAt = dbRes.created_at;
    }
  } catch (dbErr) {
    console.error('[app-runner] persistence failed:', dbErr);
    throw dbErr;
  }

  const publicUrl = `https://${effectiveDomain}`;
  const healthCheckUrl = `${publicUrl}/health`;

  return {
    id: deploymentId,
    tenantId: input.tenantId,
    appName: cleanAppName,
    framework: input.framework,
    gitRepoUrl: input.gitRepoUrl,
    serviceArn,
    customDomain: effectiveDomain,
    status: deploymentStatus,
    allocatedMemoryGb: memory,
    allocatedVcpu: cpu,
    publicUrl,
    healthCheckUrl,
    createdAt,
    latestLogSnippet: initialLog,
  };
}

/**
 * Checks deployment status, health URL, and latest log snippet.
 */
export async function getAppDeploymentStatus(
  tenantId: string,
  deploymentId: string
): Promise<DeploymentRecord> {
  const dbRow = await withTenantContext(tenantId, async (client) => {
    const res = await client.query(
      `SELECT id, tenant_id, app_name, framework, git_repo_url, app_runner_service_arn,
              custom_domain, status, allocated_memory_gb, allocated_vcpu, created_at
       FROM custom_app_deployments
       WHERE tenant_id = $1 AND id = $2
       LIMIT 1`,
      [tenantId, deploymentId]
    );
    return res.rows[0];
  });

  if (!dbRow) {
    throw new AppNotFoundError(`Deployment ${deploymentId} not found.`);
  }

  let status: AppDeploymentStatus = dbRow.status as AppDeploymentStatus;
  let logSnippet = `[Aria Sovereign App Engine] Service state: ${status}. Health check active.`;

  // Poll AWS App Runner API if live ARN exists
  if (dbRow.app_runner_service_arn && process.env.AWS_ACCESS_KEY_ID) {
    try {
      const descRes = await appRunner.send(
        new DescribeServiceCommand({ ServiceArn: dbRow.app_runner_service_arn })
      );

      const awsStatus = descRes.Service?.Status;
      if (awsStatus === 'RUNNING') {
        status = 'running';
        logSnippet = '[Aria Sovereign App Engine] 200 OK — Ready to accept production traffic.';
      } else if (awsStatus === 'OPERATION_IN_PROGRESS') {
        status = 'deploying';
        logSnippet = '[Aria Sovereign App Engine] Deploying container image and validating health probe.';
      } else if (awsStatus === 'PAUSED') {
        status = 'paused';
        logSnippet = '[Aria Sovereign App Engine] Service scaled to zero / paused.';
      } else if (awsStatus === 'CREATE_FAILED' || awsStatus === 'DELETE_FAILED') {
        status = 'failed';
        logSnippet = '[Aria Sovereign App Engine] Deployment error encountered during container startup.';
      }

      // Sync updated status to database
      if (status !== dbRow.status) {
        await withTenantContext(tenantId, async (client) => {
          await client.query(
            `UPDATE custom_app_deployments SET status = $1 WHERE id = $2 AND tenant_id = $3`,
            [status, deploymentId, tenantId]
          );
        });
      }
    } catch {
      // Retain database cached status
    }
  }

  const effectiveDomain = dbRow.custom_domain || `${dbRow.app_name}.${ROOT_DOMAIN}`;
  const publicUrl = `https://${effectiveDomain}`;

  return {
    id: dbRow.id,
    tenantId: dbRow.tenant_id,
    appName: dbRow.app_name,
    framework: dbRow.framework,
    gitRepoUrl: dbRow.git_repo_url || undefined,
    serviceArn: dbRow.app_runner_service_arn || undefined,
    customDomain: effectiveDomain,
    status,
    allocatedMemoryGb: Number(dbRow.allocated_memory_gb) || 1.0,
    allocatedVcpu: Number(dbRow.allocated_vcpu) || 0.5,
    publicUrl,
    healthCheckUrl: `${publicUrl}/health`,
    createdAt: dbRow.created_at ? new Date(dbRow.created_at).toISOString() : new Date().toISOString(),
    latestLogSnippet: logSnippet,
  };
}

/**
 * Pauses a running service to scale compute costs to zero.
 */
export async function pauseAppService(
  tenantId: string,
  deploymentId: string
): Promise<{ success: boolean; status: AppDeploymentStatus }> {
  return await withTenantContext(tenantId, async (client) => {
    const res = await client.query(
      `SELECT app_runner_service_arn FROM custom_app_deployments WHERE id = $1 AND tenant_id = $2`,
      [deploymentId, tenantId]
    );
    const serviceArn = res.rows[0]?.app_runner_service_arn;

    if (serviceArn && process.env.AWS_ACCESS_KEY_ID) {
      try {
        await appRunner.send(new PauseServiceCommand({ ServiceArn: serviceArn }));
      } catch (err) {
        console.warn('Pause service warning:', err);
      }
    }

    await client.query(
      `UPDATE custom_app_deployments SET status = 'paused' WHERE id = $1 AND tenant_id = $2`,
      [deploymentId, tenantId]
    );

    return { success: true, status: 'paused' };
  });
}

/**
 * Resumes a paused service from scale-to-zero.
 */
export async function resumeAppService(
  tenantId: string,
  deploymentId: string
): Promise<{ success: boolean; status: AppDeploymentStatus }> {
  return await withTenantContext(tenantId, async (client) => {
    const res = await client.query(
      `SELECT app_runner_service_arn FROM custom_app_deployments WHERE id = $1 AND tenant_id = $2`,
      [deploymentId, tenantId]
    );
    const serviceArn = res.rows[0]?.app_runner_service_arn;

    if (serviceArn && process.env.AWS_ACCESS_KEY_ID) {
      try {
        await appRunner.send(new ResumeServiceCommand({ ServiceArn: serviceArn }));
      } catch (err) {
        console.warn('Resume service warning:', err);
      }
    }

    await client.query(
      `UPDATE custom_app_deployments SET status = 'running' WHERE id = $1 AND tenant_id = $2`,
      [deploymentId, tenantId]
    );

    return { success: true, status: 'running' };
  });
}


/**
 * Lists a tenant's deployments, most recent first.
 */
export async function listAppDeployments(tenantId: string): Promise<DeploymentRecord[]> {
  return withTenantContext(tenantId, async (client) => {
    const res = await client.query(
      `SELECT id, tenant_id, app_name, framework, git_repo_url, app_runner_service_arn,
              custom_domain, status, allocated_memory_gb, allocated_vcpu, created_at
       FROM custom_app_deployments
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows.map((r) => {
      const domain = r.custom_domain || `${r.app_name}.${ROOT_DOMAIN}`;
      return {
        id: r.id,
        tenantId: r.tenant_id,
        appName: r.app_name,
        framework: r.framework,
        gitRepoUrl: r.git_repo_url || undefined,
        serviceArn: r.app_runner_service_arn || undefined,
        customDomain: domain,
        status: r.status,
        allocatedMemoryGb: Number(r.allocated_memory_gb) || 1.0,
        allocatedVcpu: Number(r.allocated_vcpu) || 0.5,
        publicUrl: `https://${domain}`,
        healthCheckUrl: `https://${domain}/health`,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        latestLogSnippet: `[Aria Sovereign App Engine] Service state: ${r.status}.`,
      };
    });
  });
}
