# nodejs-api Helm Chart

A Helm chart for deploying a Node.js Express API to Kubernetes.

## Overview

This chart creates a complete Kubernetes deployment including:
- **Deployment**: 3 replicas with rolling update strategy
- **Service**: ClusterIP for internal access
- **Health Checks**: Liveness and readiness probes
- **Auto-scaling**: Optional HPA support

## Files Structure

```
chart/
├── Chart.yaml          # Chart metadata
├── values.yaml         # Default configuration
└── templates/
    ├── _helpers.tpl    # Template helper functions
    ├── deployment.yaml # Pod specification
    └── service.yaml    # Service definition
```

## Values.yaml Explained

### Basic Configuration
```yaml
replicaCount: 3  # Number of pod replicas
```

### Image Settings
```yaml
image:
  repository: ghcr.io/karosi12/nodejs-api  # Image registry path
  tag: latest                                 # Image tag
  pullPolicy: IfNotPresent                   # When to pull image
  pullSecret: ghcr-secret                    # Secret for private registry
```
- **pullPolicy**: `IfNotPresent` (default), `Always`, or `Never`
- **pullSecret**: Name of the `docker-registry` secret for GHCR

### Service Configuration
```yaml
service:
  type: ClusterIP      # Service type: ClusterIP, LoadBalancer, NodePort
  port: 80             # Service port
  targetPort: 3000     # Container port
```
- **type**: `ClusterIP` - internal only, `LoadBalancer` - external, `NodePort` - node port

### Resource Limits
```yaml
resources:
  requests:            # Guaranteed resources
    cpu: 100m         # 0.1 CPU cores
    memory: 128Mi     # 128 MiB
  limits:              # Maximum resources
    cpu: 500m         # 0.5 CPU cores
    memory: 512Mi     # 512 MiB
```

### Health Probes
```yaml
livenessProbe:        # Check if container is alive
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10   # Wait before first check
  periodSeconds: 15        # Check every 15 seconds

readinessProbe:       # Check if container can handle traffic
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
```

### Environment Variables
```yaml
env:
  NODE_ENV: production
  PORT: "3000"
```

### Auto-scaling (Optional)
```yaml
autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
```

## Deploy

```bash
# Install the chart
helm install nodejs-api ./chart

# Install with custom values
helm install nodejs-api ./chart --set replicaCount=5

# Dry run to see what would be deployed
helm template nodejs-api ./chart

# Upgrade existing deployment
helm upgrade nodejs-api ./chart

# Rollback
helm rollback nodejs-api 1

# Uninstall
helm uninstall nodejs-api
```

## Using with Custom Values File

```bash
# Create custom values file
cat > my-values.yaml << EOF
replicaCount: 5
image:
  tag: v2.0.0
resources:
  requests:
    cpu: 200m
    memory: 256Mi
autoscaling:
  enabled: true
EOF

# Deploy with custom values
helm install nodejs-api ./chart -f my-values.yaml
```

## Helper Templates (_helpers.tpl)

The chart includes helper functions:

- `chart.fullname`: Generates the full name of resources
- `chart.chartname`: Creates chart name with version
- `chart.labels`: Standard Kubernetes labels
- `chart.selectorLabels`: Selector labels for pods/services
