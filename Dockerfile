FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production \
    DATA_FILE=/app/data/tournaments.json

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY --chown=node:node src ./src

# O Compose monta o diretorio de dados neste caminho. Sem volume, a aplicacao
# tambem consegue criar e atualizar o arquivo dentro da imagem em execucao.
RUN mkdir -p /app/data && chown node:node /app/data

USER node

CMD ["npm", "start"]
