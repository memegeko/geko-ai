import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'geko.ai — A character for every story',description:'Your characters. Your conversations. Your own little universe. A private AI character space powered by your own Ollama.',icons:{icon:'/favicon.svg?v=gecko-chat-2',shortcut:'/favicon.svg?v=gecko-chat-2',apple:'/brand/apple-touch-icon.png'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
