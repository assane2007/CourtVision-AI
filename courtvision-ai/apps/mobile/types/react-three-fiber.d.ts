import type { ThreeElements } from '@react-three/fiber/native'

declare global {
	namespace React {
		namespace JSX {
			interface IntrinsicElements extends ThreeElements {}
		}
	}
}

export {}
