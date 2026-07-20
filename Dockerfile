FROM minidocks/texlive:2023-medium

RUN tlmgr install \
      latexmk \
      preprint \
      titlesec \
      marvosym \
      enumitem \
      fancyhdr \
      babel-english \
      hyphen-english
## installing NodeJS

## we will be doing this later for live rendering of the  .tex

RUN apk add --no-cache nodejs npm

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src

EXPOSE 3000
ENV PORT=3000

CMD ["node", "src/index.js"]