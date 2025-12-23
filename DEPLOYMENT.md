# OpenTelemetry Production Deployment Guide

## 🎯 Current Setup

Your Agent-APP is now configured to use your production OpenTelemetry stack:

- **OpenTelemetry Collector**: `http://100.91.45.23:4318/v1/traces`
- **Jaeger UI**: `http://100.91.45.23:16686` (View traces)
- **Prometheus**: `http://100.91.45.23:9090` (Metrics)
- **Grafana**: `http://100.91.45.23:3002` (Dashboards - admin/admin)
- **Service Name**: `agent-app`

## 🚀 Quick Start

```bash
# Start the application
npm start
```

The app will automatically:
- ✅ Connect to your OpenTelemetry Collector at `100.91.45.23:4318`
- ✅ Export traces with gzip compression
- ✅ Batch spans every 5 seconds (optimized for performance)
- ✅ Expose Prometheus metrics at `http://localhost:4000/metrics`

## 📊 Monitoring

### View Traces in Jaeger
1. Open: `http://100.91.45.23:16686`
2. Select Service: `agent-app`
3. Click "Find Traces"
4. See all HTTP requests, API calls, and performance data

### View Metrics in Grafana
1. Open: `http://100.91.45.23:3002`
2. Login: **admin** / **admin**
3. Add Prometheus data source: `http://100.91.45.23:9090`
4. Import dashboard or create custom queries
5. Agent-APP metrics endpoint: `http://YOUR_SERVER_IP:4000/metrics`

## 🔧 Configuration

### Environment Variables (.env)

```env
# Production OpenTelemetry endpoint
OTEL_EXPORTER_OTLP_ENDPOINT=http://100.91.45.23:4318/v1/traces

# Service identification
OTEL_SERVICE_NAME=agent-app
NODE_ENV=production
```

### Performance Optimizations

The following optimizations are already applied:

1. **Batch Processing**: Spans are batched before export (reduces network calls)
   - Max queue: 2048 spans
   - Batch size: 512 spans
   - Export interval: 5 seconds

2. **Compression**: gzip compression enabled for network efficiency

3. **Filtered Instrumentation**:
   - ❌ File system operations (too noisy)
   - ❌ DNS lookups (too noisy)
   - ❌ Network operations (too noisy)
   - ✅ HTTP requests/responses
   - ✅ Express routes
   - ✅ Axios API calls

4. **Smart Filtering**:
   - Ignores: `/metrics`, `/health`, `/favicon.ico`
   - Normalized paths for cleaner traces

5. **Error Handling**: Graceful degradation if OpenTelemetry server is unreachable

## 📈 What Gets Traced

### Automatic Tracing
- All incoming HTTP requests (method, path, status, duration)
- All outgoing Axios calls to backend API (`192.168.0.100:3000`)
- Express route handlers
- Client IP addresses
- Response status codes
- Error details

### Trace Attributes
Each trace includes:
- `service.name`: agent-app
- `service.version`: 1.0.0
- `deployment.environment`: production
- `service.instance.id`: hostname-pid
- `http.method`: GET/POST/etc
- `http.target`: /shipments/new
- `http.status_code`: 200/404/500
- `http.client_ip`: Client IP address

## 🔍 Viewing Traces

### Example: Track a Shipment Creation

1. Agent submits form at `/shipments/new`
2. Trace shows:
   ```
   POST /shipments/new (200 OK, 245ms)
   ├─ GET /api/couriers (150ms)
   ├─ GET /api/customers (85ms)
   ├─ GET /api/lockers (92ms)
   └─ POST /api/shipments (320ms)
   ```

3. Click on any span to see:
   - Exact timing
   - Request/response headers
   - Error details (if any)
   - Related logs

## 🛠️ Troubleshooting

### Check Connection to OpenTelemetry Server

```bash
# Test if OTLP endpoint is reachable
curl -v http://100.91.45.23:4318/v1/traces

# Check if traces are being sent (look for logs)
npm start
# Should see: [OpenTelemetry] ✅ Tracing initialized successfully
```

### View Application Metrics

```bash
# Check if Prometheus metrics are exposed
curl http://localhost:4000/metrics

# You should see metrics like:
# agent_app_http_request_duration_seconds_bucket
# agent_app_up
# agent_app_nodejs_heap_size_total_bytes
```

### Test Trace Export

```bash
# Make a request
curl http://localhost:4000/shipments

# Check Jaeger UI within 5-10 seconds
# Open in browser: http://100.91.45.23:16686
# Select service: agent-app
```

### Common Issues

**Problem**: Traces not appearing in Jaeger
- Check network connectivity to `100.91.45.23:4318`
- Verify firewall allows outbound connections
- Check app logs for OpenTelemetry errors
- Wait 5-10 seconds (batch export delay)

**Problem**: High memory usage
- Reduce `maxQueueSize` in `tracing.js` (default: 2048)
- Reduce `maxExportBatchSize` (default: 512)
- Increase `scheduledDelayMillis` for less frequent exports

**Problem**: App fails to start
- OpenTelemetry errors are non-blocking
- App will continue without tracing if OTLP endpoint is unreachable
- Check logs for specific error messages

## 🎨 Grafana Dashboard Setup

### Add Prometheus Data Source
1. Open Grafana: `http://100.91.45.23:3002`
2. Login with **admin** / **admin**
3. Go to: Configuration → Data Sources → Add data source
4. Select Prometheus
5. URL: `http://100.91.45.23:9090`
6. Click "Save & Test"

### Import Agent-APP Dashboard
Create panels for:
- Request rate: `rate(agent_app_http_request_duration_seconds_count[5m])`
- Error rate: `rate(agent_app_http_request_duration_seconds_count{status_code=~"5.."}[5m])`
- Latency (p95): `histogram_quantile(0.95, agent_app_http_request_duration_seconds_bucket)`
- Memory usage: `agent_app_nodejs_heap_size_used_bytes`
- CPU usage: `rate(agent_app_process_cpu_seconds_total[5m])`

## 📊 Prometheus Scrape Configuration

Add to your Prometheus `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'agent-app'
    static_configs:
      - targets: ['YOUR_AGENT_APP_IP:4000']
        labels:
          service: 'agent-app'
          environment: 'production'
```

Then reload Prometheus:
```bash
curl -X POST http://YOUR_PROMETHEUS:9090/-/reload
```

## 🔐 Security Recommendations

For production:
1. Add authentication headers to OTLP exporter
2. Use HTTPS instead of HTTP: `https://100.91.45.23:4318/v1/traces`
3. Restrict `/metrics` endpoint access (add authentication middleware)
4. Enable TLS for secure trace transmission

## 📞 Support

If traces aren't appearing:
1. Check app logs: `npm start` (look for OpenTelemetry messages)
2. Verify network: `ping 100.91.45.23`
3. Test endpoint: `curl http://100.91.45.23:4318/v1/traces`
4. Check Jaeger: `http://100.91.45.23:16686`
5. Check Prometheus: `http://100.91.45.23:9090`
6. Check Grafana: `http://100.91.45.23:3002` (admin/admin)

## 🎯 Quick Links

- **Jaeger (Traces)**: http://100.91.45.23:16686
- **Prometheus (Metrics)**: http://100.91.45.23:9090
- **Grafana (Dashboards)**: http://100.91.45.23:3002 (admin/admin)
- **Agent-APP Metrics**: http://localhost:4000/metrics

Your telemetry stack is ready! All traces will automatically appear in Jaeger.
