# Solution: image-pull-backoff

> Do not read this before you submit your root cause.

## Root cause

The deploy uses the image `shopnotes-app:1.4.2`, but this tag was never built or pushed, so it does not exist locally or in any registry.
Docker (and the kubelet in k8s) tries to pull it, gets "pull access denied / repository does not exist", and the app never starts (`ErrImagePull`, then `ImagePullBackOff`).

Proof:

```bash
docker compose up -d
# Error response from daemon: pull access denied for shopnotes-app, repository does not exist or may require 'docker login'
docker images shopnotes-app            # empty: the tag was never built
kubectl -n shopnotes-imagepull describe pod -l app=shopnotes-app | tail -5
# Failed to pull image "shopnotes-app:1.4.2" ... not found / pull access denied
```

## Fix

Docker Compose: build the release image from its source and tell compose how to build it.

```bash
sed -i 's#^    image: shopnotes-app:1.4.2#    build: ./app\n    image: shopnotes-app:1.4.2#' docker-compose.yml
docker compose up -d --build
./check.sh
```

Kubernetes (k3d): build the image and put it into the cluster.

```bash
docker build -t shopnotes-app:1.4.2 ./app
k3d image import shopnotes-app:1.4.2 -c devops-lab
kubectl -n shopnotes-imagepull rollout restart deploy/shopnotes-app
kubectl -n shopnotes-imagepull rollout status deploy/shopnotes-app
./check.sh k8s
```

(In a company the fix is the same idea: run the CI job that builds and pushes `1.4.2`, or point the deploy to a tag that really exists in the registry.)

## How to prevent it

- Deploy only tags that CI built and pushed; the pipeline should pass the exact tag (or digest) from the build step to the deploy step.
- Before deploy, check the tag exists: `docker manifest inspect <image>:<tag>`.
- Do not type image tags by hand; use the git tag or commit SHA automatically.

## Interview questions

**Q1. What does ImagePullBackOff mean?**
A: It means Kubernetes tried to download the container image and failed, and now it waits longer and longer between tries. Common reasons are a wrong image name or tag, a private registry without credentials, or a network problem to the registry.

**Q2. How do you find the exact reason?**
A: I run `kubectl describe pod` and read the Events at the bottom. They show the image name and the error, like "not found" or "unauthorized". Then I check if that tag really exists in the registry.

**Q3. How do you fix "unauthorized" when pulling from a private registry?**
A: I create a docker-registry secret with the registry login. Then I add it to the pod as `imagePullSecrets`, or to the service account. After that I restart the pod.

## Explain it (script)

**English:** "The 1.4.2 deploy failed because the image shopnotes-app:1.4.2 did not exist. The build for this tag was never done, so Docker and Kubernetes could not pull it. I built the image from the 1.4.2 source and loaded it, then redeployed. Now the app runs and /health is 200. To prevent this, the pipeline will pass the built tag to the deploy step automatically."