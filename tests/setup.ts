import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/dom'

// Shared async-utility timeout: slow CI machines need more than the 1 s default
// for the first render of a route (module transforms happen inside the test).
configure({ asyncUtilTimeout: 8000 })
