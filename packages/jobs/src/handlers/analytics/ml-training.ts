/**
 * ML Training Pipeline Job Handler
 *
 * Background job for attribution model training with 30-minute timeout support.
 * Implements checkpointing for long-running training jobs.
 *
 * CRITICAL: All handlers require tenantId for tenant isolation.
 *
 * @ai-pattern long-running-job
 * @ai-note Configured for 30 minute timeout (1800 seconds)
 */

import { defineJob } from '../../define'
import type { JobResult } from '../../types'
import type { AttributionMLTrainingPayload } from './types'

// ============================================================
// ML TRAINING TYPES
// ============================================================

interface TrainingConfig {
  learningRate: number
  batchSize: number
  epochs: number
  validationSplit: number
  halfLifeOptions: number[] // Days for time-decay optimization
  positionWeightOptions: number[][] // [first, middle, last] weight combinations
}

interface TrainingCheckpoint {
  step: number
  epoch: number
  lossHistory: number[]
  bestModel?: {
    weights: number[]
    loss: number
    epoch: number
  }
  startTime: number
  lastSaveTime: number
}

interface TrainingResult {
  modelVersion: string
  finalLoss: number
  epochs: number
  trainingTimeMs: number
  metrics: {
    accuracy: number
    precision: number
    recall: number
    f1Score: number
  }
  optimizedParams: {
    timeDecayHalfLife: number
    positionWeights: number[]
  }
}

// ============================================================
// TRAINING HELPERS
// ============================================================

const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  learningRate: 0.001,
  batchSize: 32,
  epochs: 100,
  validationSplit: 0.2,
  halfLifeOptions: [1, 3, 7, 14, 30], // Days
  positionWeightOptions: [
    [0.4, 0.2, 0.4], // Standard
    [0.5, 0.1, 0.4], // First-heavy
    [0.4, 0.1, 0.5], // Last-heavy
    [0.3, 0.4, 0.3], // Middle-heavy
  ],
}

/**
 * Generate model version string
 */
function generateModelVersion(): string {
  const timestamp = new Date().toISOString().split('T')[0]!.replace(/-/g, '')
  return `attrb_v${timestamp}_${Math.random().toString(36).substring(2, 8)}`
}

/**
 * Load training data for tenant
 * Would query conversion + touchpoint data from tenant schema
 */
async function loadTrainingData(
  tenantId: string,
  trainingDays: number
): Promise<{
  features: number[][]
  labels: number[]
  sampleCount: number
}> {
  console.log(
    `[ML Training] Loading ${trainingDays} days of training data for tenant ${tenantId}`
  )

  // Implementation would:
  // await withTenant(tenantId, async () => {
  //   const data = await sql`
  //     SELECT
  //       o.id as order_id,
  //       o.total_cents as revenue,
  //       ARRAY_AGG(
  //         JSON_BUILD_OBJECT(
  //           'source', t.source,
  //           'medium', t.medium,
  //           'campaign', t.campaign,
  //           'timestamp', t.timestamp,
  //           'age_hours', EXTRACT(EPOCH FROM (o.created_at - t.timestamp)) / 3600
  //         )
  //         ORDER BY t.timestamp
  //       ) as touchpoints
  //     FROM orders o
  //     JOIN touchpoints t ON t.visitor_id = o.visitor_id
  //     WHERE o.created_at >= NOW() - INTERVAL '${trainingDays} days'
  //       AND o.attribution_status = 'complete'
  //     GROUP BY o.id, o.total_cents
  //   `
  //   return processIntoFeatures(data)
  // })

  // Placeholder return
  return {
    features: [],
    labels: [],
    sampleCount: 0,
  }
}

/**
 * Save checkpoint for long-running training
 */
async function saveCheckpoint(
  _tenantId: string,
  _modelVersion: string,
  checkpoint: TrainingCheckpoint
): Promise<void> {
  console.log(
    `[ML Training] Saving checkpoint at epoch ${checkpoint.epoch}, step ${checkpoint.step}`
  )

  // Implementation would:
  // await withTenant(_tenantId, async () => {
  //   await sql`
  //     INSERT INTO ml_training_checkpoints (model_version, tenant_id, checkpoint_data)
  //     VALUES (${_modelVersion}, ${_tenantId}, ${JSON.stringify(checkpoint)})
  //     ON CONFLICT (model_version, tenant_id) DO UPDATE
  //     SET checkpoint_data = ${JSON.stringify(checkpoint)}, updated_at = NOW()
  //   `
  // })
}

/**
 * Load checkpoint if exists
 */
async function loadCheckpoint(
  _tenantId: string,
  modelVersion: string
): Promise<TrainingCheckpoint | null> {
  console.log(
    `[ML Training] Checking for existing checkpoint for ${modelVersion}`
  )

  // Implementation would:
  // await withTenant(_tenantId, async () => {
  //   const result = await sql`
  //     SELECT checkpoint_data
  //     FROM ml_training_checkpoints
  //     WHERE model_version = ${modelVersion} AND tenant_id = ${_tenantId}
  //   `
  //   return result.rows[0]?.checkpoint_data || null
  // })

  return null
}

/**
 * Train a single epoch
 */
async function trainEpoch(
  _features: number[][],
  _labels: number[],
  _config: TrainingConfig,
  currentWeights: number[]
): Promise<{
  loss: number
  weights: number[]
}> {
  // Implementation would run gradient descent/optimization using _features, _labels, _config
  // This is a placeholder for actual ML training logic
  const newLoss = Math.random() * 0.5 // Simulated decreasing loss
  const newWeights = currentWeights.map((w) => w * (1 + (Math.random() - 0.5) * 0.1))

  return {
    loss: newLoss,
    weights: newWeights,
  }
}

/**
 * Validate model against held-out data
 */
async function validateModel(
  _features: number[][],
  _labels: number[],
  _weights: number[]
): Promise<{
  accuracy: number
  precision: number
  recall: number
  f1Score: number
}> {
  // Implementation would evaluate model on validation set using _features, _labels, _weights
  return {
    accuracy: 0.85,
    precision: 0.82,
    recall: 0.88,
    f1Score: 0.85,
  }
}

/**
 * Save final trained model
 */
async function saveTrainedModel(
  _tenantId: string,
  modelVersion: string,
  result: TrainingResult
): Promise<void> {
  console.log(
    `[ML Training] Saving trained model ${modelVersion} with loss ${result.finalLoss}`
  )

  // Implementation would:
  // await withTenant(tenantId, async () => {
  //   await sql`
  //     INSERT INTO ml_trained_models (
  //       model_version, tenant_id, model_type, metrics, params, is_active
  //     )
  //     VALUES (
  //       ${modelVersion}, ${tenantId}, 'attribution',
  //       ${JSON.stringify(result.metrics)},
  //       ${JSON.stringify(result.optimizedParams)},
  //       false
  //     )
  //   `
  //
  //   // Mark as active if it's the best model
  //   await sql`
  //     UPDATE ml_trained_models
  //     SET is_active = (model_version = ${modelVersion})
  //     WHERE tenant_id = ${tenantId} AND model_type = 'attribution'
  //   `
  // })
}

// ============================================================
// JOB HANDLER
// ============================================================

/**
 * ML Training Pipeline - runs at 4 AM daily
 *
 * Trains attribution models using historical conversion data.
 * Supports 30-minute timeout with checkpointing for resumption.
 *
 * Training optimizes:
 * - Time-decay half-life parameter
 * - Position-based weights
 * - Source/medium effectiveness scores
 */
export const attributionMLTrainingJob = defineJob<AttributionMLTrainingPayload>({
  name: 'analytics/attribution-ml-training',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, trainingDays, modelVersion, checkpoint: providedCheckpoint } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    const days = trainingDays || 90
    const version = modelVersion || generateModelVersion()
    const config = DEFAULT_TRAINING_CONFIG
    const startTime = Date.now()

    // Timeout warning threshold (25 minutes into 30 minute window)
    const timeoutWarningMs = 25 * 60 * 1000
    // Checkpoint save interval (every 5 minutes)
    const checkpointIntervalMs = 5 * 60 * 1000

    console.log(
      `[ML Training] Starting training for tenant ${tenantId}, model ${version}`
    )
    console.log(
      `[ML Training] Training config: ${days} days, ${config.epochs} epochs`
    )

    // Step 1: Load or create checkpoint
    const loadedCheckpoint = await loadCheckpoint(tenantId, version)

    let checkpoint: TrainingCheckpoint
    if (providedCheckpoint) {
      // Resume from provided checkpoint, update timing
      checkpoint = {
        step: providedCheckpoint.step,
        epoch: providedCheckpoint.epoch,
        lossHistory: providedCheckpoint.lossHistory,
        startTime,
        lastSaveTime: startTime,
      }
    } else if (loadedCheckpoint) {
      // Resume from saved checkpoint
      checkpoint = loadedCheckpoint
    } else {
      // Start fresh
      checkpoint = {
        step: 0,
        epoch: 0,
        lossHistory: [],
        startTime,
        lastSaveTime: startTime,
      }
    }

    // Step 2: Load training data
    const { features, labels, sampleCount } = await loadTrainingData(
      tenantId,
      days
    )

    if (sampleCount < 100) {
      console.log(
        `[ML Training] Insufficient training data: ${sampleCount} samples`
      )
      return {
        success: false,
        error: {
          message: `Insufficient training data: ${sampleCount} samples (minimum 100)`,
          retryable: false,
        },
      }
    }

    console.log(
      `[ML Training] Loaded ${sampleCount} training samples`
    )

    // Step 3: Split data for validation
    const splitIndex = Math.floor(sampleCount * (1 - config.validationSplit))
    const trainFeatures = features.slice(0, splitIndex)
    const trainLabels = labels.slice(0, splitIndex)
    const validFeatures = features.slice(splitIndex)
    const validLabels = labels.slice(splitIndex)

    // Step 4: Initialize weights
    let weights = checkpoint.bestModel?.weights || new Array(10).fill(0.1)

    // Step 5: Training loop with checkpointing
    for (let epoch = checkpoint.epoch; epoch < config.epochs; epoch++) {
      const elapsed = Date.now() - startTime

      // Check for timeout approaching
      if (elapsed > timeoutWarningMs) {
        console.log(
          `[ML Training] Approaching timeout, saving checkpoint at epoch ${epoch}`
        )
        checkpoint.epoch = epoch
        await saveCheckpoint(tenantId, version, checkpoint)

        return {
          success: true,
          data: {
            tenantId,
            modelVersion: version,
            status: 'checkpointed',
            checkpoint: {
              epoch,
              step: checkpoint.step,
              lossHistory: checkpoint.lossHistory,
            },
            message: 'Training checkpointed due to timeout, will resume on next run',
          },
        }
      }

      // Train epoch
      const { loss, weights: newWeights } = await trainEpoch(
        trainFeatures,
        trainLabels,
        config,
        weights
      )

      weights = newWeights
      checkpoint.lossHistory.push(loss)
      checkpoint.step++

      // Track best model
      if (!checkpoint.bestModel || loss < checkpoint.bestModel.loss) {
        checkpoint.bestModel = {
          weights: [...weights],
          loss,
          epoch,
        }
      }

      // Periodic checkpoint save
      if (Date.now() - checkpoint.lastSaveTime > checkpointIntervalMs) {
        checkpoint.epoch = epoch
        checkpoint.lastSaveTime = Date.now()
        await saveCheckpoint(tenantId, version, checkpoint)
        console.log(
          `[ML Training] Checkpoint saved at epoch ${epoch}, loss: ${loss.toFixed(4)}`
        )
      }

      // Log progress every 10 epochs
      if (epoch % 10 === 0) {
        console.log(
          `[ML Training] Epoch ${epoch}/${config.epochs}, loss: ${loss.toFixed(4)}`
        )
      }
    }

    // Step 6: Final validation
    console.log(`[ML Training] Training complete, running final validation`)
    const metrics = await validateModel(validFeatures, validLabels, weights)

    // Step 7: Save trained model
    const trainingTimeMs = Date.now() - startTime
    const result: TrainingResult = {
      modelVersion: version,
      finalLoss: checkpoint.bestModel?.loss || checkpoint.lossHistory.slice(-1)[0] || 0,
      epochs: config.epochs,
      trainingTimeMs,
      metrics,
      optimizedParams: {
        timeDecayHalfLife: 7, // Would be optimized during training
        positionWeights: [0.4, 0.2, 0.4], // Would be optimized during training
      },
    }

    await saveTrainedModel(tenantId, version, result)

    console.log(
      `[ML Training] Model ${version} saved, accuracy: ${metrics.accuracy.toFixed(4)}`
    )

    return {
      success: true,
      data: {
        tenantId,
        modelVersion: version,
        status: 'complete',
        trainingTimeMs,
        sampleCount,
        epochs: config.epochs,
        finalLoss: result.finalLoss,
        metrics,
        optimizedParams: result.optimizedParams,
      },
    }
  },
  // Configure for 30-minute timeout
  options: {
    timeout: 30 * 60 * 1000, // 30 minutes in ms
  },
  retry: {
    maxAttempts: 2, // Limited retries for long-running job
    backoff: 'fixed',
    initialDelay: 60000, // 1 minute delay before retry
  },
})

/**
 * All ML training jobs for export
 */
export const mlTrainingJobs = [attributionMLTrainingJob]
