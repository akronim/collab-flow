import { vi } from "vitest"

vi.spyOn(global, `alert`).mockImplementation(() => { /* empty */ })
vi.stubEnv(`VITE_BACKEND_URL`, `http://localhost:3001`)
