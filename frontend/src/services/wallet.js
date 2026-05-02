import { requestAccess, getAddress, signTransaction } from '@stellar/freighter-api';

export async function connectWallet() {
    try {
        const accessResult = await requestAccess();
        if (accessResult.error) {
            throw new Error(accessResult.error);
        }
        const { address } = await getAddress();
        if (!address) {
            throw new Error('No address returned.');
        }
        return address;
    } catch (err) {
        throw new Error('Could not connect to Freighter: ' + err.message);
    }
}

export async function signTx(xdr) {
    const { signedTxXdr } = await signTransaction(xdr, { 
        networkPassphrase: 'Test SDF Network ; September 2015' 
    });
    return signedTxXdr;
}
