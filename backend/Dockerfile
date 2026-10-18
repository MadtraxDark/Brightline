FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt ./requirements.txt
# CPU-only PyTorch first, so pip does not pull the much larger CUDA build.
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Fetch the pretrained TorchXRayVision weights at build time so the API starts offline.
ENV HOME=/opt/cache
RUN python -c "import torchxrayvision as xrv; xrv.models.DenseNet(weights='densenet121-res224-nih')" && \
    chmod -R a+rX /opt/cache

COPY backend/app ./app
COPY backend/extract.py backend/brightline_data.py ./
COPY backend/prompts ./prompts

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
