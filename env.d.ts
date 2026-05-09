/// <reference types="vite/client" />

interface RuntimeAppConfig {
	VITE_API_URL?: string
	VITE_LOG_LEVEL?: string
}

interface Window {
	__APP_CONFIG__?: RuntimeAppConfig
}
