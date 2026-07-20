# CV Builder - LaTeX Compilation Service

A scalable, containerized Node.js microservice designed to compile raw LaTeX source code (`.tex`) into PDF documents (`.pdf`) securely on the fly.

## 🏗️ Architecture

The application is structured using a robust **Model-View-Controller (MVC) / Service-Oriented Architecture** to enforce a clean separation of concerns.

```text
src/
├── config/
│   └── server.config.js       # Environment configuration and PORT settings
├── controller/
│   └── latex.controller.js    # Handles HTTP requests, payload validation, and HTTP responses
├── router/
│   └── latex.router.js        # Maps API routes to their respective controllers
├── service/
│   └── latex.service.js       # Core business logic: file system operations and child processes
└── index.js                   # Application entry point: wires up Express, CORS, and routers
```

### 1. Controllers (`latex.controller.js`)

Acts as the middleman. It intercepts incoming HTTP requests, validates the size and type of the `tex` payload (e.g., ensuring it doesn't exceed 2MB), and offloads the heavy lifting to the Service layer. Once the Service layer finishes, the controller formats the success/failure response back to the client.

### 2. Services (`latex.service.js`)

Handles the actual business logic. It generates a unique `jobID`, creates an isolated temporary directory in the OS, writes the LaTeX string to `doc.tex`, and spawns a secure `latexmk` child process. It then parses the PDF buffer on success or extracts the relevant LaTeX `.log` errors on failure. Finally, it forcefully cleans up the temporary directory to prevent memory leaks.

### 3. Routers (`latex.router.js`)

Provides modular API endpoints (e.g. `/api/compile`) to organize routes without cluttering the main index file.

---

## 🔄 End-to-End Flow

1. **Client Request**: The client sends a `POST /api/compile` request with a JSON body containing the raw `tex` string.
2. **Express Validation**: The Express app parses the body (configured to allow up to `5mb`).
3. **Controller Interception**: `LatexController` intercepts the request. If the `tex` string is missing or exceeds `2,000,000` characters, it immediately rejects the request with a `400` or `413` status.
4. **Service Execution**:
   - `LatexService` creates a temporary directory `/tmp/latex-jobs/<UUID>/`.
   - The `tex` string is saved as `doc.tex`.
   - A Node.js `child_process` spawns `latexmk` with strict security flags (`-interaction=nonstopmode`, `-no-shell-escape`, `-halt-on-error`).
   - A `30,000ms` (30 second) timeout timer begins. If compilation exceeds this, the process is `SIGKILL`'d to prevent infinite loops.
5. **Compilation Result**:
   - **Success**: The service reads `doc.pdf` into a Buffer and returns it. The Controller sends it back to the client with a `Content-Type: application/pdf` header.
   - **Failure**: The service reads `doc.log`, extracts the first 10 human-readable errors using Regex, and returns them. The Controller sends a `422 Unprocessable Entity` JSON response.
6. **Cleanup**: Regardless of success or failure, the `finally` block in the service forcefully deletes the temporary `/tmp/latex-jobs/<UUID>/` directory.

---

## 🐳 Docker Deployment

The application is fully containerized using a lightweight TeX Live image (`minidocks/texlive:2023-medium`), which includes `pdflatex` and `latexmk`.

### Build the Image

```bash
docker build -t cv-builder-service .
```

### Run the Container

```bash
docker run -p 3000:3000 cv-builder-service
```

_(The server will be available at `http://localhost:3000`)_

---

## 🚀 API Reference

### 1. Health Check

**Endpoint**: `GET /api/health`

**Response**: `200 OK`

```json
{
  "ok": true
}
```

### 2. Compile LaTeX

**Endpoint**: `POST /api/compile`
**Headers**: `Content-Type: application/json`

**Body**:

```json
{
  "tex": "\\documentclass{article}\\begin{document}Hello World!\\end{document}"
}
```

**Success Response (200 OK)**:
Returns raw binary `application/pdf` data.

**Error Response (422 Unprocessable Entity)**:

```json
{
  "ok": false,
  "log": "... raw log output ...",
  "errors": [
    {
      "file": "./doc.tex",
      "line": 12,
      "message": "Undefined control sequence."
    }
  ]
}

# 1. Build the image (bundles Node + LaTeX + Your Code)
docker build -t cv-builder-service .

# 2. Run the container (starts the server on port 3000)
docker run -p 3000:3000 cv-builder-service

```
