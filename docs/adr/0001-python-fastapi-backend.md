# Python FastAPI backend over Node.js

The backend is written in Python with FastAPI rather than Node.js/TypeScript. The Gemini Python SDK is Google's most mature and actively maintained client; FastAPI's Pydantic models give us typed, validated API contracts without a separate schema layer. The cost is a split-language stack (TypeScript frontend, Python backend), mitigated by generating an OpenAPI spec from FastAPI and consuming it as the shared contract.

## Considered Options

- **Node.js + TypeScript**: would share the type system with the React frontend and allow shared type packages, but the Gemini Node SDK lags the Python SDK in features and examples.
- **Python + FastAPI** (chosen): first-class Gemini SDK, async-native, Pydantic validation on every request/response boundary.

## Consequences

Frontend and backend cannot share TypeScript types directly. The OpenAPI spec exported by FastAPI (`/openapi.json`) becomes the authoritative contract; frontend types are generated from it.
