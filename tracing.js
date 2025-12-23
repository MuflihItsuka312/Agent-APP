// tracing.js - OpenTelemetry instrumentation for Agent-APP
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');

// Configure OTLP exporter with production server and optimized settings
const otlpExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://100.91.45.23:4318/v1/traces',
  headers: {},
  timeoutMillis: 5000, // 5 second timeout
  compression: 'gzip', // Enable compression for better network performance
});

// Batch span processor for better performance
const spanProcessor = new BatchSpanProcessor(otlpExporter, {
  maxQueueSize: 2048,
  maxExportBatchSize: 512,
  scheduledDelayMillis: 5000, // Export every 5 seconds
  exportTimeoutMillis: 30000,
});

// Initialize OpenTelemetry SDK with optimized settings
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'agent-app',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    'deployment.environment': process.env.NODE_ENV || 'production',
    'service.instance.id': `${require('os').hostname()}-${process.pid}`,
  }),
  spanProcessor: spanProcessor,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable noisy instrumentations
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
      '@opentelemetry/instrumentation-dns': {
        enabled: false,
      },
      '@opentelemetry/instrumentation-net': {
        enabled: false,
      },
      // HTTP instrumentation with filtering
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        ignoreIncomingPaths: [
          '/metrics', // Ignore Prometheus metrics endpoint
          '/health',
          '/favicon.ico',
        ],
        requestHook: (span, request) => {
          span.setAttribute('http.client_ip', request.socket?.remoteAddress);
        },
      },
      // Express instrumentation
      '@opentelemetry/instrumentation-express': {
        enabled: true,
        requestHook: (span, requestInfo) => {
          span.updateName(`${requestInfo.request.method} ${requestInfo.route || 'unknown'}`);
        },
      },
    }),
  ],
});

// Start the SDK with error handling
try {
  sdk.start();
  console.log('[OpenTelemetry] ✅ Tracing initialized successfully');
  console.log(`[OpenTelemetry] 📡 Exporting to: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://100.91.45.23:4318/v1/traces'}`);
  console.log(`[OpenTelemetry] 🏷️  Service: ${process.env.OTEL_SERVICE_NAME || 'agent-app'}`);
} catch (error) {
  console.error('[OpenTelemetry] ❌ Failed to initialize tracing:', error.message);
  console.error('[OpenTelemetry] ⚠️  Application will continue without tracing');
}

// Graceful shutdown handlers
const shutdownTracing = async () => {
  console.log('[OpenTelemetry] 🔄 Shutting down tracing...');
  try {
    await sdk.shutdown();
    console.log('[OpenTelemetry] ✅ Tracing shutdown complete');
  } catch (error) {
    console.error('[OpenTelemetry] ❌ Error during shutdown:', error.message);
  }
};

process.on('SIGTERM', async () => {
  await shutdownTracing();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await shutdownTracing();
  process.exit(0);
});

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('[OpenTelemetry] Unhandled rejection at:', promise, 'reason:', reason);
});

module.exports = sdk;
