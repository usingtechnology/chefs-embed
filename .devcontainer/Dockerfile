# Use Debian Bookworm as base image
FROM --platform=$BUILDPLATFORM debian:bookworm-slim

# Set build arguments for multi-arch support
ARG BUILDPLATFORM
ARG TARGETPLATFORM
ARG TARGETARCH

# Install common dependencies and utilities
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    ca-certificates \
    gnupg \
    lsb-release \
    sudo \
    lsof \
    net-tools \
    iproute2 \
    netcat-openbsd \
    tcpdump \
    procps \
    htop \
    jq \
    vim \
    nano \
    less \
    tree \
    strace \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js based on architecture
# NodeSource provides packages for both arm64 (Apple Silicon) and amd64 (Intel)
RUN echo "Building for architecture: $TARGETARCH" && \
    if [ "$TARGETARCH" = "arm64" ] || [ "$TARGETARCH" = "amd64" ]; then \
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
        apt-get install -y nodejs && \
        echo "Node.js installed successfully for $TARGETARCH"; \
    else \
        echo "Unsupported architecture: $TARGETARCH" && exit 1; \
    fi

# Verify Node.js installation
RUN node --version && npm --version

# Set working directory
WORKDIR /workspace

# Create a non-root user for development
RUN useradd -m -s /bin/bash vscode && \
    chown -R vscode:vscode /workspace && \
    echo "vscode ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/vscode

USER vscode

# Set environment variables
ENV NODE_ENV=development
ENV PATH="/home/vscode/.local/bin:${PATH}"

