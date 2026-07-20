FROM minidocks/texlive:2023-medium

RUN tlmgr install \
      preprint \
      titlesec \
      marvosym \
      enumitem \
      fancyhdr \
      babel-english \
      hyphen-english \
      tabularx

## installing NodeJS

## we will be doing this later for live rendering of the  .tex

RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./

EXPOSE 3000
CMD ["node", "server.js"]