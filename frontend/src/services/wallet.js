import { isConnected, getPublicKey, signTransaction } from '@stellar/freighter-api';

export async function connectWallet() {
    const connected = await isConnected();
    if (!connected) {
        throw new Error('Freighter wallet not found. Please install the Freighter extension.');
    }
    const publicKey = await getPublicKey();
    return publicKey;
}

export async function signTx(xdr) {
    const signed = await signTransaction(xdr, { network: 'TESTNET' });
    return signed;
}
