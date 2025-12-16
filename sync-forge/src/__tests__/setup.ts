import { vi } from "vitest"

vi.spyOn(global, `alert`).mockImplementation(() => { /* empty */ })
vi.stubEnv(`VITE_AUTH_API_URL`, `http://test-server`)
vi.stubEnv(`VITE_GATEWAY_API_URL`, `http://test-server`)
