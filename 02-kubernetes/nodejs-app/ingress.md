# Ingress Setup Guide for Minikube

## Overview
This guide covers setting up NGINX Ingress Controller on Minikube in the default namespace to expose services publicly using NodePort or LoadBalancer.

## Prerequisites
- Minikube installed
- kubectl configured
- EC2 security group open on the NodePort (default 32237 for HTTP)

## Steps

### 1. Install NGINX Ingress Controller

Install in the default namespace:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/cloud/deploy.yaml
```

Wait for the controller to be ready:

```bash
kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=120s
```

### 2. Create Ingress Manifest

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nodejs-api-ingress
  labels:
    app: nodejs-api
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: karosiblog.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: nodejs-api-nodeport
                port:
                  number: 3000
```

### 3. Apply the Ingress

```bash
kubectl apply -f ingress.yaml
```

### 4. Expose Ingress Using NodePort (Recommended for Minikube)

Patch the ingress controller service to use NodePort:

```bash
kubectl patch svc ingress-nginx-controller -n ingress-nginx -p '{"spec":{"type":"NodePort"}}'
```

Or use LoadBalancer (requires MetalLB):

```bash
kubectl patch svc ingress-nginx-controller -n ingress-nginx -p '{"spec":{"type":"LoadBalancer"}}'
```

### 5. Get the NodePort

```bash
kubectl get svc ingress-nginx-controller -n ingress-nginx
```

Example output:
```
NAME                       TYPE       CLUSTER-IP     PORT(S)                      AGE
ingress-nginx-controller  NodePort   10.104.197.230 80:32237/TCP,443:32119/TCP  49s
```

### 6. Access from Outside EC2

From your local machine, access via:

```bash
curl -H "Host: karosiblog.com" http://<EC2-PUBLIC-IP>:32237/health
```

Or add the host to /etc/hosts:

```bash
echo "52.14.105.214 karosiblog.com" | sudo tee -a /etc/hosts
curl http://karosiblog.com:32237/health
```

## Alternative: Use minikube service

For quick access, use:

```bash
minikube service ingress-nginx-controller -n ingress-nginx
```

This opens a tunnel to access the service.

## Troubleshooting

### Check ingress controller logs
```bash
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller
```

### Check ingress status
```bash
kubectl describe ingress nodejs-api-ingress
```

### Verify NodePort
```bash
kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.spec.ports[0].nodePort}'
```

### Test locally
```bash
curl -H "Host: karosiblog.com" http://localhost:32237/health
```
