import { vi } from "vitest"

vi.spyOn(global, `alert`).mockImplementation(() => { /* empty */ })
vi.stubEnv(`VITE_AUTH_API_URL`, `http://localhost:3001`)
vi.stubEnv(`VITE_GATEWAY_API_URL`, `http://localhost:3001`)
