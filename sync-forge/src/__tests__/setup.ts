import { vi } from "vitest"

vi.spyOn(global, `alert`).mockImplementation(() => { /* empty */ })
