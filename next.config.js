/** @type {import('next').NextConfig} */
const nextConfig = {
	webpack: (config, { dev, isServer }) => {
		if (!isServer) {
			// Don't resolve 'fs', 'net', etc. modules on the client
			config.resolve.fallback = {
				...config.resolve.fallback,
				net: false,
				tls: false,
				fs: false,
				dns: false,
				child_process: false,
				http2: false,
			};
		}
		// Disable webpack cache in development
		if (dev) {
			config.cache = false;
		}
		return config;
	},
};

module.exports = nextConfig;
