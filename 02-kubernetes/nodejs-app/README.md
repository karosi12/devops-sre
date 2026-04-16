# Node.js Express K8s Deployment

## Files

| File | Description |
|------|-------------|
| `deployment.yaml` | Deployment with 3 replicas, rolling update strategy |
| `service.yaml` | ClusterIP service for internal access |
| `service-lb.yaml` | LoadBalancer for external access |
| `hpa.yaml` | Horizontal Pod Autoscaler (optional) |

## Deploy

```bash
# Create secret for GHCR (replace with your GitHub username and PAT)
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<your-github-username> \
  --docker-password=<your-github-token> \
  --docker-email=<your-email>

# Apply all manifests
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml

# Or apply all at once
kubectl apply -f .

# Check deployment
kubectl get deploy nodejs-api
kubectl get pods -l app=nodejs-api

# View logs
kubectl logs -l app=nodejs-api

# Scale manually
kubectl scale deployment nodejs-api --replicas=5

# Rolling update (after image change)
kubectl set image deployment/nodejs-api nodejs-api=nodejs-api:v2

# Check rollout status
kubectl rollout status deployment/nodejs-api

# Rollback if needed
kubectl rollout undo deployment/nodejs-api
```

## Rolling Update Strategy

- `maxSurge: 1` - One extra pod during updates
- `maxUnavailable: 0` - No pods down during updates
- Health checks ensure zero downtime

## Access

```bash
# Port-forward for local testing
kubectl port-forward svc/nodejs-api 3000:3000

# Get external IP (LoadBalancer)
kubectl get svc nodejs-api-lb
```

## Monitoring

Check resource usage for your pods and nodes:

```bash
# View CPU and memory usage for pods
kubectl top pods -l app=nodejs-api

# View CPU and memory usage for nodes
kubectl top nodes

# Sort pods by CPU usage
kubectl top pods -l app=nodejs-api --sort-by=cpu

# Sort pods by memory usage
kubectl top pods -l app=nodejs-api --sort-by=memory

# View resource requests and limits in deployment
kubectl get deployment nodejs-api -o jsonpath='{.spec.template.spec.containers[].resources}'

# Detailed resource info from describe
kubectl describe deployment nodejs-api
```

Note: `kubectl top` requires Metrics Server to be installed on your cluster.
