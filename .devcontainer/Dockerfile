FROM node:24-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    zsh \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
  && corepack prepare pnpm@11.2.2 --activate

WORKDIR /workspaces/sync-tool-cs

CMD ["sleep", "infinity"]
