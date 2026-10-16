import type { NextConfig } from 'next';
const config: NextConfig = { output: 'standalone', serverExternalPackages: ['better-auth', 'nodemailer'] };
export default config;
