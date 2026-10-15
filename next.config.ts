import type { NextConfig } from 'next';
import path from 'node:path';
const platform=path.resolve('lib/selfhost/platform.ts');
const nextConfig:NextConfig=process.env.GEKO_RUNTIME==='sites'?{}:{
 output:'standalone', distDir:'.next-selfhost',
 serverExternalPackages:['better-auth','nodemailer'],
 webpack(config,{webpack}) { config.resolve.alias['@geko/platform']=platform; config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^@geko\/platform$/,platform)); return config; },
};
export default nextConfig;
