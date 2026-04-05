import WalletConnect from './components/WalletConnect.jsx';
import SubscriptionForm from './components/SubscriptionForm.jsx';
import Dashboard from './components/Dashboard.jsx';
import { WalletProvider } from './context/WalletContext.jsx';

export default function App() {
    return (
        <WalletProvider>
            <div className="min-h-screen bg-gray-50">
                <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-indigo-600">ZapSubs</h1>
                    <WalletConnect />
                </header>
                <main className="max-w-2xl mx-auto py-10 px-4 flex flex-col gap-6">
                    <Dashboard />
                    <SubscriptionForm />
                </main>
            </div>
        </WalletProvider>
    );
}