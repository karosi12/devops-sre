# 02 - Kubernetes

Kubernetes fundamentals and certification preparation.

## Topics
- Pods, Deployments, Services
- ConfigMaps and Secrets
- PersistentVolumes (PV) and PersistentVolumeClaims (PVC)
- Ingress controllers
- Helm basics
- Resource management

## Getting Started
```bash
# Apply a manifest
kubectl apply -f deployment.yaml

# Check pod status
kubectl get pods

# View logs
kubectl logs <pod-name>
```

## Exercises
1. Deploy a web application to Kubernetes
2. Set up a ConfigMap for environment variables
3. Create an Ingress for external access
4. Configure PersistentVolume and PersistentVolumeClaim for stateful applications
